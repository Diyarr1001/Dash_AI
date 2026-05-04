from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai import ai_service
from app.services.database import db_manager
from typing import List, Dict, Any

router = APIRouter()

import pandas as pd
import numpy as np

class QueryRequest(BaseModel):
    prompt: str
    table_name: str

class ExecuteRequest(BaseModel):
    sql: str

def make_json_safe(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Convert a DataFrame into a JSON-serializable list of dicts."""
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d %H:%M:%S')
        elif df[col].dtype == object:
            df[col] = df[col].apply(lambda x: str(x) if x is not None else None)
    df = df.replace({np.nan: None, np.inf: None, -np.inf: None})
    return df.to_dict(orient="records")

@router.post("/execute")
async def execute_raw_sql(request: ExecuteRequest):
    """Execute raw SQL directly (used for refreshing dashboards)."""
    try:
        df = db_manager.get_df_from_duck(request.sql)
        data = make_json_safe(df)
        return {
            "data": data,
            "columns": df.columns.tolist(),
            "error": None
        }
    except Exception as e:
        return {
            "data": [],
            "columns": [],
            "error": str(e)
        }

@router.post("/")
async def execute_ai_query(request: QueryRequest):
    if not request.table_name:
        raise HTTPException(status_code=400, detail="Table name is required")

    try:
        # 1. Check if table exists
        tables = db_manager.execute_duck_query("SHOW TABLES")
        table_list = [t[0] for t in tables]
        if request.table_name not in table_list:
             raise HTTPException(status_code=404, detail=f"Table {request.table_name} not found")

        # 1. Get Schema
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {request.table_name}")
        schema_str = "\n".join([f"{row[0]} ({row[1]})" for row in schema_info])
        
        # 2. PERFORM DEEP DATA SCAN (Full Table Analysis)
        print(f"🔍 Deep Scanning for Direct AI Chat: {request.table_name}...")
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
            if any(t in col_type for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL"]):
                try:
                    stats_res = db_manager.execute_duck_query(f"SELECT MIN(\"{col_name}\"), MAX(\"{col_name}\"), AVG(\"{col_name}\") FROM {request.table_name}")
                    min_v, max_v, avg_v = stats_res[0]
                    stats_str = f" | Range: [{min_v} to {max_v}] | Avg: {avg_v:.2f}"
                except: pass
            
            top_vals_res = db_manager.execute_duck_query(f"SELECT \"{col_name}\", COUNT(*) as cnt FROM {request.table_name} GROUP BY 1 ORDER BY cnt DESC LIMIT 5")
            top_vals_str = ", ".join([f"'{r[0]}' ({r[1]} rows)" for r in top_vals_res if r[0] is not None])
            detailed_context.append(f"- **{col_name}** ({col_type}): {unique_count} unique values{stats_str}. Top values: {top_vals_str}")
        
        # 3. Generate SQL with Full Context
        sql_query = await ai_service.generate_sql(request.prompt, schema_str, request.table_name, detailed_context)
        
        if not sql_query or len(sql_query.strip()) < 5:
            raise HTTPException(status_code=422, detail="AI failed to generate a valid SQL query. Please try a different prompt.")

        # Clean up SQL
        # 1. Remove markdown code blocks
        sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
        
        # 2. Aggressively strip everything after the first ';' (to remove AI chatter/tables)
        if ";" in sql_query:
            sql_query = sql_query.split(";")[0] + ";"
            
        # 3. REPAIR Hallucinated Table Names (data_uuid.Table -> data_uuid)
        import re
        # Find "data_uuid"."TableName" or "data_uuid".TableName and replace with "data_uuid"
        sql_query = re.sub(r'("data_[a-f0-9_]+")\s*\.\s*("?[A-Za-z0-9_]+"?)', r'\1', sql_query)
        
        # 4. Remove leading/trailing conversational text
        sql_keywords = ["SELECT", "WITH", "UPDATE", "INSERT", "DELETE", "CREATE", "ALTER", "DROP"]
        first_word = sql_query.split()[0].upper() if sql_query.split() else ""
        if first_word not in sql_keywords:
            for keyword in sql_keywords:
                if keyword in sql_query.upper():
                    start_idx = sql_query.upper().find(keyword)
                    sql_query = sql_query[start_idx:]
                    break
        
        # FAIL-SAFE: Fix common AI quoting mistakes for DuckDB
        import re
        sql_query = re.sub(r'strftime\("(%[^"]+)"', r"strftime('\1'", sql_query)
        if "TO_CHAR" in sql_query:
            sql_query = sql_query.replace("TO_CHAR", "strftime")
        
        # 3. Execute Query
        df = db_manager.get_df_from_duck(sql_query)
        
        # UI PREVIEW LIMIT: Only return top 1000 rows to the UI to prevent crash
        display_df = df.head(1000)
        data = make_json_safe(display_df)
        
        # 4. Get Chart Config
        chart_config = await ai_service.get_chart_config(request.prompt, schema_str, data)
        
        return {
            "sql": sql_query,
            "data": data,
            "columns": df.columns.tolist(),
            "chart_config": chart_config
        }
    except Exception as e:
        print(f"❌ Query Endpoint Error: {str(e)}")
        # If it's a DuckDB error, return it with a 400 so the frontend knows it was a SQL issue
        if 'sql_query' in locals():
            raise HTTPException(status_code=400, detail=f"SQL Error: {str(e)} | Query: {sql_query}")
        raise HTTPException(status_code=500, detail=str(e))
