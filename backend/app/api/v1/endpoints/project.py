from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.database import db_manager
from app.services.ai import ai_service
import asyncio
import re
import json

router = APIRouter()
class ERDiagramRequest(BaseModel):
    tables: List[str]

@router.post("/er-diagram")
async def get_er_diagram(request: ERDiagramRequest):
    print(f"📐 Generating ER Diagram for {len(request.tables)} tables: {request.tables}")
    try:
        import time
        start_time = time.time()
        
        tables = request.tables
        schemas = {}
        for table in tables:
            try:
                # Handle quoted parts for DuckDB schemas (e.g. "alias"."table")
                quoted_table = ".".join([f'"{p}"' for p in table.split('.')])
                schema_info = db_manager.execute_duck_query(f"DESCRIBE {quoted_table}")
                schemas[table] = "\n".join([f"{row[0]} ({row[1]})" for row in schema_info])
            except Exception as e:
                print(f"⚠️ Could not get schema for {table}: {str(e)}")
        
        print(f"⏱️ Schema collection took {time.time() - start_time:.2f}s")

        # 1. Build all NODES locally (No AI needed for nodes)
        nodes = []
        for table_name, schema_str in schemas.items():
            cols = [line.strip() for line in schema_str.split('\n') if line.strip()]
            nodes.append({
                "id": table_name,
                "type": "table",
                "data": {
                    "label": table_name.split('.')[-1],
                    "isFactTable": any(kw in table_name.lower() for kw in ['fact', 'sales', 'orders', 'transactions']),
                    "columns": cols
                }
            })
            
        # 2. Use AI ONLY for Edge Inference (Drastically reduces token usage)
        # Send a compact version of schemas to the AI
        compact_schemas = {}
        for name, schema in schemas.items():
            # Only send first 15 columns to keep context manageable
            lines = schema.split('\n')[:15]
            compact_schemas[name] = "\n".join(lines)
            
        ai_start = time.time()
        # Create a specialized mini-prompt for relationship discovery
        edges = await ai_service.infer_relationships_only(compact_schemas)
        print(f"⏱️ AI Inference (Edges Only) took {time.time() - ai_start:.2f}s")
        
        diagram_data = {"nodes": nodes, "edges": edges}
        
        # 3. Fallback: Heuristic-based edges
        if not diagram_data.get("edges") or len(diagram_data["edges"]) < 2:
            print("🔗 AI returned few edges. Running heuristic relationship scanner...")
            existing_edges = {f"{e['source']}-{e['target']}" for e in diagram_data.get("edges", [])}
            table_names = list(schemas.keys())
            
            for t1 in table_names:
                t1_cols_info = [(c.split(' ')[0], c.split(' ')[0].lower()) for c in schemas[t1].split('\n')]
                for t2 in table_names:
                    if t1 == t2: continue
                    t2_base = t2.split('.')[-1].lower()
                    for col_orig, col_lower in t1_cols_info:
                        if col_lower == f"{t2_base}_id" or col_lower == f"{t2_base}id" or (col_lower == "id" and t1.lower().endswith(t2_base)):
                            if f"{t1}-{t2}" not in existing_edges:
                                if not diagram_data.get("edges"): diagram_data["edges"] = []
                                diagram_data["edges"].append({
                                    "id": f"h-{t1}-{t2}",
                                    "source": t1,
                                    "target": t2,
                                    "sourceHandle": col_orig,
                                    "targetHandle": "target-fallback", # Use the robust fallback handle
                                    "label": "1:*",
                                    "animated": True
                                })
                                existing_edges.add(f"{t1}-{t2}")
        
        print(f"📊 Final Diagram: {len(nodes)} nodes, {len(diagram_data.get('edges', []))} edges")
        return diagram_data
    except Exception as e:
        import traceback
        print(f"💥 ER Diagram Error: {str(e)}")
        print(traceback.format_exc())
        return {"nodes": [], "edges": [], "error": str(e)}
class ProjectRequest(BaseModel):
    prompt: str
    table_name: str

def clean_sql(sql: str) -> str:
    """Clean AI-generated SQL of markdown and extra whitespace."""
    sql = re.sub(r'```sql', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'```', '', sql)
    return sql.strip()

def make_json_safe(df):
    """Convert DF to list of dicts with JSON-safe values."""
    import pandas as pd
    import numpy as np
    if df is None or df.empty:
        return []
    return df.replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict(orient="records")

@router.post("/generate")
async def generate_full_project(request: ProjectRequest):
    print(f"🚀 Starting Deep Scan generation for table: {request.table_name}")
    try:
        # 1. Get Schema Info
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {request.table_name}")
        schema_str = "\n".join([f"{row[0]} ({row[1]})" for row in schema_info])
        
        # 2. PERFORM DEEP DATA SCAN (Analyze entire dataset)
        print(f"🔍 Deep Scanning entire dataset for {request.table_name}...")
        row_count_res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {request.table_name}")
        total_rows = row_count_res[0][0]
        
        detailed_context = [f"### MASTER DATA PROFILE (Total Rows: {total_rows})"]
        for col_row in schema_info:
            col_name = col_row[0]
            col_type = col_row[1].upper()
            
            # Unique Count
            unique_res = db_manager.execute_duck_query(f"SELECT COUNT(DISTINCT \"{col_name}\") FROM {request.table_name}")
            unique_count = unique_res[0][0]
            
            # Stats for numeric columns
            stats_str = ""
            if "INT" in col_type or "FLOAT" in col_type or "DOUBLE" in col_type or "DECIMAL" in col_type:
                try:
                    stats_res = db_manager.execute_duck_query(f"SELECT MIN(\"{col_name}\"), MAX(\"{col_name}\"), AVG(\"{col_name}\") FROM {request.table_name}")
                    min_v, max_v, avg_v = stats_res[0]
                    stats_str = f" | Range: [{min_v} to {max_v}] | Avg: {avg_v:.2f}"
                except:
                    pass
            
            # Top Categories
            top_vals_res = db_manager.execute_duck_query(f"SELECT \"{col_name}\", COUNT(*) as cnt FROM {request.table_name} GROUP BY 1 ORDER BY cnt DESC LIMIT 5")
            top_vals_str = ", ".join([f"'{r[0]}' ({r[1]} rows)" for r in top_vals_res if r[0] is not None])
            
            detailed_context.append(f"- **{col_name}** ({col_type}): {unique_count} unique values{stats_str}. Top values: {top_vals_str}")
        
        data_context_str = "\n".join(detailed_context)
        print(f"📊 Full Profile Generated: {len(detailed_context)} columns analyzed.")
        
        # 3. Generate Project Plan with Master Data Profile
        print("🧠 Calling AI with Master Data Profile...")
        plan = await ai_service.generate_project_plan(f"{request.prompt}\n\n[CRITICAL DATA CONTEXT - ANALYZE FULLY]\n{data_context_str}", schema_str)
        
        if not plan or len(plan) == 0:
            print("⚠️ AI Plan was empty. Generating Smart Fallback Dashboard...")
            # Automatically create a basic but solid dashboard based on the profile
            plan = [
                {"type": "kpi", "title": "Total Records", "question": f"What is the total number of rows in {request.table_name}?", "reasoning": "Foundation metric"},
                {"type": "chart", "title": "Data Distribution", "question": f"Show a high-level distribution of the primary categorical column in {request.table_name}", "reasoning": "Data overview"}
            ]
            # Try to pick the most interesting column for the distribution
            for col in schema_info:
                if "VARCHAR" in col[1].upper() or "TEXT" in col[1].upper():
                    plan[1]["question"] = f"Show the distribution of {col[0]} across the entire dataset."
                    plan[1]["title"] = f"Distribution by {col[0]}"
                    break

        # 4. Process each component
        semaphore = asyncio.Semaphore(2)

        async def process_component(comp):
            async with semaphore:
                comp_q = comp.get('question') or comp.get('title') or comp.get('task') or 'Analysis'
                try:
                    sql_raw = await ai_service.generate_sql(comp_q, schema_str, request.table_name, detailed_context)
                    sql = clean_sql(sql_raw)
                    df = db_manager.get_df_from_duck(sql)
                    data = make_json_safe(df)
                    chart_config = await ai_service.get_chart_config(comp_q, schema_str, data if data else [{"temp": 0}])
                    
                    return {
                        "type": comp.get("type", "chart"),
                        "title": chart_config.get("title", comp_q),
                        "description": chart_config.get("description", ""),
                        "insights": chart_config.get("insights", ""),
                        "sql": sql,
                        "data": data,
                        "chart_config": chart_config
                    }
                except Exception as e:
                    print(f"⚠️ Component '{comp_q}' failed: {str(e)}")
                    return {"type": comp.get("type", "chart"), "title": comp_q, "error": str(e), "data": [], "chart_config": {}}

        results = await asyncio.gather(*[process_component(c) for c in plan])
        return {
            "project_title": f"Analytics for {request.table_name}",
            "components": [r for r in results if r is not None]
        }
    except Exception as e:
        print(f"💥 CRITICAL Error: {str(e)}")
        return {"error": True, "detail": str(e), "components": []}

class UpdateRequest(BaseModel):
    prompt: str
    table_name: str
    current_components: List[Dict[str, Any]]

@router.post("/update")
async def update_project(request: UpdateRequest):
    print(f"🔄 Updating dashboard with Advanced Deep Scan context...")
    try:
        # 1. Get Schema Info
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {request.table_name}")
        schema_str = "\n".join([f"{row[0]} ({row[1]})" for row in schema_info])
        
        # 2. PERFORM DEEP DATA SCAN
        row_count_res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {request.table_name}")
        total_rows = row_count_res[0][0]
        
        detailed_context = [f"### MASTER DATA PROFILE (Total Rows: {total_rows})"]
        for col_row in schema_info:
            col_name = col_row[0]
            col_type = col_row[1].upper()
            
            unique_res = db_manager.execute_duck_query(f"SELECT COUNT(DISTINCT \"{col_name}\") FROM {request.table_name}")
            unique_count = unique_res[0][0]
            
            stats_str = ""
            if "INT" in col_type or "FLOAT" in col_type or "DOUBLE" in col_type or "DECIMAL" in col_type:
                try:
                    stats_res = db_manager.execute_duck_query(f"SELECT MIN(\"{col_name}\"), MAX(\"{col_name}\"), AVG(\"{col_name}\") FROM {request.table_name}")
                    min_v, max_v, avg_v = stats_res[0]
                    stats_str = f" | Range: [{min_v} to {max_v}] | Avg: {avg_v:.2f}"
                except:
                    pass
                    
            top_vals_res = db_manager.execute_duck_query(f"SELECT \"{col_name}\", COUNT(*) as cnt FROM {request.table_name} GROUP BY 1 ORDER BY cnt DESC LIMIT 5")
            top_vals_str = ", ".join([f"'{r[0]}' ({r[1]} rows)" for r in top_vals_res if r[0] is not None])
            detailed_context.append(f"- **{col_name}** ({col_type}): {unique_count} unique values{stats_str}. Top values: {top_vals_str}")
        
        data_context_str = "\n".join(detailed_context)
        
        # 3. Generate Update
        update_context = f"Current Dashboard has: {json.dumps([{'title': c.get('title', ''), 'type': c.get('type', 'chart')} for c in request.current_components])}"
        plan = await ai_service.generate_project_plan(f"{request.prompt}\n\n[EXISTING DASHBOARD]\n{update_context}\n\n[CRITICAL DATA CONTEXT - ANALYZE FULLY]\n{data_context_str}", schema_str)
        
        if not plan:
            return {"error": True, "detail": "AI could not generate updates.", "components": request.current_components}

        # 4. Process new components
        semaphore = asyncio.Semaphore(2)

        async def process_component(comp):
            async with semaphore:
                comp_q = comp.get('question') or comp.get('title') or comp.get('task') or 'New Analysis'
                try:
                    sql_raw = await ai_service.generate_sql(comp_q, schema_str, request.table_name, detailed_context)
                    sql = clean_sql(sql_raw)
                    df = db_manager.get_df_from_duck(sql)
                    data = make_json_safe(df)
                    chart_config = await ai_service.get_chart_config(comp_q, schema_str, data if data else [{"temp": 0}])
                    
                    return {
                        "type": comp.get("type", "chart"),
                        "title": chart_config.get("title", comp_q),
                        "description": chart_config.get("description", ""),
                        "insights": chart_config.get("insights", ""),
                        "sql": sql,
                        "data": data,
                        "chart_config": chart_config
                    }
                except Exception:
                    return None

        new_results = await asyncio.gather(*[process_component(c) for c in plan])
        valid_new_results = [r for r in new_results if r is not None]
        updated_components = request.current_components + valid_new_results

        return {
            "project_title": f"Updated Analysis for {request.table_name}",
            "components": updated_components
        }
    except Exception as e:
        print(f"💥 Update Error: {str(e)}")
        return {"error": True, "detail": str(e), "components": request.current_components}
