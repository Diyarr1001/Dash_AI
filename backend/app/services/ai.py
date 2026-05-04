import groq
from google import genai
import json
import re
import asyncio
from app.core.config import settings
from typing import Optional, Dict, Any, List

class AIService:
    def __init__(self):
        self.groq_client = groq.Client(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
        
        if settings.GEMINI_API_KEY:
            self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            self.gemini_client = None

    def _get_provider(self, task_complexity: str = "low") -> str:
        """Route to provider based on task complexity."""
        if task_complexity == "high" and self.gemini_client:
            return "gemini"
        if self.groq_client:
            return "groq"
        if self.gemini_client:
            return "gemini"
        return "ollama"

    async def generate_sql(self, prompt: str, schema: str, table_name: str, data_context: List[str] = None) -> str:
        """Generate SQL query from natural language prompt."""
        provider = self._get_provider(task_complexity="low")
        
        # Use the detailed context strings (column samples/unique values)
        preview_str = "\n".join(data_context) if data_context else "No detailed context available"
        
        system_prompt = f"""
        You are a DuckDB Expert and Data Analyst. Generate a SQL query for the table "{table_name}".
        
        Schema (Column names and types):
        {schema}
        
        Detailed Data Context (Sample values and unique categories for each column):
        {preview_str}
        
        ### 🚨 MANDATORY SQL SYNTAX RULES (ZERO TOLERANCE) 🚨
        1. **SCHEMA ADHERENCE (CRITICAL)**: 
           - ✅ ONLY use columns listed in the [MASTER DATA PROFILE] below.
           - ❌ NEVER guess or invent column names (e.g., NEVER use 'YearlyIncome' if it is not in the profile). 
           - 💡 If the user asks for a column that doesn't exist, suggest the most similar numeric column from the profile instead.
        2. **TABLE NAME**: 
           - ✅ Use ONLY the exact string "{table_name}" as the table name.
           - ❌ NEVER use dots (.) or schema names.
        3. **QUOTING**:
           - ❌ NEVER use Double Quotes ("") for strings or patterns.
           - ✅ ALWAYS use SINGLE QUOTES ('') for strings and strftime patterns.
           - ✅ ALWAYS use DOUBLE QUOTES ("") for EVERY SINGLE column name.
        4. **DUCKDB FUNCTIONS**:
           - ❌ NEVER use TO_CHAR. Use 'strftime("Date", '%B')'.
        5. **DATA PRESERVATION**:
           - ✅ ALWAYS include all original columns using '*'.
        6. **NO ALIAS REFERENCING**:
           - ❌ NEVER use an alias in the same SELECT statement. Use CTEs.
        7. **RESULT FORMAT**:
           - Return ONLY the raw SQL query. No markdown code blocks, no intro, no explanation.
        """
        
        try:
            return await self._call_ai(system_prompt, prompt)
        except Exception as e:
            print(f"❌ SQL Generation Error: {str(e)}")
            return "SELECT 1"

    async def _call_ai(self, system_prompt: str, user_prompt: str, task_complexity: str = "medium") -> str:
        """Centralized AI call logic with multi-tier fallbacks and retries."""
        for attempt in range(3): # Try up to 3 times
            # Tier 1: Gemini
            if self.gemini_client:
                try:
                    model_name = 'gemini-2.0-flash' if task_complexity != "low" else 'gemini-1.5-flash-8b'
                    response = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=f"{system_prompt}\n\nUser: {user_prompt}"
                    )
                    return self._extract_json(response.text)
                except Exception as e:
                    if "429" in str(e):
                        print(f"⏳ Gemini Rate Limited (Attempt {attempt+1}). Waiting...")
                        await asyncio.sleep(5) # Wait 5 seconds
                    else:
                        print(f"⚠️ Gemini Tier failed: {str(e)}")

            # Tier 2: Groq
            if self.groq_client:
                for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
                    try:
                        response = self.groq_client.chat.completions.create(
                            model=model,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            response_format={"type": "json_object"} if "json" in system_prompt.lower() else None
                        )
                        return response.choices[0].message.content
                    except Exception as e:
                        if "429" in str(e):
                            print(f"⏳ Groq {model} Rate Limited. Trying next...")
                            await asyncio.sleep(2)
                            continue
                        print(f"⚠️ Groq {model} failed: {str(e)}")
            
            # If we got here, we failed an attempt. Wait a bit longer before next one.
            await asyncio.sleep(5)
            
        return ""

    async def infer_relationships_only(self, schemas: Dict[str, str]) -> List[Dict[str, Any]]:
        """Compact version for large databases. Only infers edges."""
        schema_context = "\n\n".join([f"T: {name}\nCols: {cols}" for name, cols in schemas.items()])
        
        system_prompt = f"""
        You are a Database Architect. Analyze these schemas and find relationships.
        Return ONLY a JSON array of edges. 
        
        ### 🚨 MANDATORY FORMAT:
        Return ONLY a JSON array. Each element must be an object.
        "source" and "target" MUST be the EXACT keys from the SCHEMAS dictionary below (do not simplify them).
        "sourceHandle" and "targetHandle" must be column names from those tables.
        
        [
          {{ 
            "id": "e-1", 
            "source": "FULL_TABLE_NAME_FROM_KEYS", 
            "target": "FULL_TABLE_NAME_FROM_KEYS", 
            "sourceHandle": "COL_NAME", 
            "targetHandle": "COL_NAME", 
            "label": "1:*" 
          }}
        ]
        
        SCHEMAS (Keys are the IDs you must use):
        {schema_context}
        """
        
        content = await self._call_ai(system_prompt, "Infer Relationships Only", task_complexity="high")
        try:
            data = json.loads(content)
            return data if isinstance(data, list) else data.get("edges", [])
        except:
            return []

    async def generate_er_diagram(self, schemas: Dict[str, str]) -> Dict[str, Any]:
        """Infer ER Diagram relationships (nodes and edges) from multiple table schemas."""
        schema_context = "\n\n".join([f"Table: {name}\nColumns:\n{cols}" for name, cols in schemas.items()])
        
        system_prompt = f"""
        You are a World-Class Database Architect and Data Engineer. 
        Analyze the provided table schemas and infer logical Foreign Key relationships (ER Diagram).
        
        TABLE SCHEMAS:
        {schema_context}
        
        GOAL:
        Generate a comprehensive JSON structure for an ER Diagram using React Flow format.
        
        ### 🧠 INTELLIGENT INFERENCE RULES (CRITICAL):
        1. **Naming Patterns**: 
           - Look for 'id' columns in Table A that are referenced as 'table_a_id' or 'table_aid' in Table B.
           - Look for 'customer_id' -> 'customers.id', 'order_id' -> 'orders.id', etc.
           - Look for abbreviations (e.g., 'emp_id' -> 'employee.id').
        2. **Type Matching**: Relationships MUST connect columns of similar types (e.g., INT to INT).
        3. **Cardinality**: Infer One-to-Many relationships by default.
        4. **Recursive Relationships**: Check for columns like 'parent_id' or 'manager_id' within the same table.
        5. **Semantic Mapping**: If a table is named 'SalesOrderDetail' and another 'SalesOrderHeader', they almost certainly share a key like 'SalesOrderID'.
        
        ### 🚨 MANDATORY ID RULES (CRITICAL):
        1. For each table in the provided schemas, you MUST create a node where "id" is the EXACT table name provided (e.g., if the table name is "mssql_AdventureWorks2019.HumanResources_Employee", the "id" MUST be "mssql_AdventureWorks2019.HumanResources_Employee").
        2. In the "edges" array, "source" and "target" MUST match these IDs exactly.
        3. DO NOT shorten or simplify names. 
        
        ### 🚨 OUTPUT FORMAT (STRICT JSON ONLY):
        {{
          "nodes": [
            {{ 
              "id": "EXACT_TABLE_NAME_FROM_PROVIDED_SCHEMAS", 
              "type": "table", 
              "data": {{ 
                "label": "FRIENDLY_NAME", 
                "isFactTable": true/false,
                "columns": ["col (TYPE)", ...] 
              }} 
            }}
          ],
          "edges": [
            {{ 
              "id": "unique-edge-id", 
              "source": "EXACT_SOURCE_TABLE_NAME", 
              "target": "EXACT_TARGET_TABLE_NAME", 
              "sourceHandle": "SOURCE_COLUMN_NAME",
              "targetHandle": "TARGET_COLUMN_NAME",
              "label": "1:*", 
              "animated": true 
            }}
          ]
        }}
        
        ### 🏗️ ARCHITECTURAL INTELLIGENCE:
        - Identify the **Fact Table** (the central table with many measures and foreign keys) and set `isFactTable: true`. Usually, there is only 1 or 2.
        - Identify ONE-TO-MANY relationships. Usually, the "id" or "Primary Key" table is the TARGET, and the table with the "foreign key" (e.g. customer_id) is the SOURCE.
        """
        
        content = await self._call_ai(system_prompt, "Generate ER Diagram JSON", task_complexity="high")
        try:
            return json.loads(content)
        except Exception as e:
            print(f"❌ ER Diagram Parse Error: {str(e)}")
            return {"nodes": [], "edges": []}

    async def get_chart_config(self, prompt: str, schema: str, data_preview: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Suggest a professional visualization strategy for Apache ECharts."""
        system_prompt = f"""
        You are a Data Visualization Lead. Suggest the most effective chart type for this dataset.
        Schema: {schema}
        Sample Data: {json.dumps(data_preview[:3])}

        STRICT JSON FORMAT REQUIRED:
        {{
          "type": "line" | "bar" | "pie" | "scatter" | "heatmap",
          "title": "Clear Descriptive Title",
          "mappings": {{
            "x": "column_name_for_x_axis",
            "y": "column_name_for_y_axis"
          }},
          "description": "Short insight about what this chart shows"
        }}

        STRATEGY:
        - For Time Trends (Year/Month): Use 'line' with time on xAxisKey.
        - For Categorical: Use 'bar' or 'pie'.
        - For Profit/Margins: Use 'bar' or 'line'.

        Return a JSON object with:
        {{
            "type": "bar" | "line" | "pie" | "scatter" | "heatmap",
            "mappings": {{
                "x": "column_name_for_dimension",
                "y": "column_name_for_value",
                "color": "optional_category_column"
            }},
            "title": "Insight-Driven Title",
            "description": "Professional summary of what this visualization reveals",
            "insights": "Provide a high-impact business insight based on the sample values. What should the CEO know about this?"
        }}
        """
        
        content = await self._call_ai(system_prompt, prompt, task_complexity="medium")
        try:
            return json.loads(content)
        except Exception as e:
            print(f"❌ Chart Config Error: {str(e)}")
            fallback_x = ""
            fallback_y = ""
            if data_preview and len(data_preview) > 0:
                keys = list(data_preview[0].keys())
                fallback_x = keys[0] if len(keys) > 0 else ""
                fallback_y = keys[1] if len(keys) > 1 else fallback_x
                
            return {
                "type": "bar",
                "mappings": {"x": fallback_x, "y": fallback_y},
                "title": "Analysis Result",
                "description": "Automatically generated chart"
            }

    async def generate_project_plan(self, prompt: str, schema: str) -> List[Dict[str, Any]]:
        """Decompose a high-level goal into a sophisticated analytical strategy."""
        system_prompt = f"""
        You are a Senior Data Consultant and Business Intelligence Architect. 
        Your goal is to transform a user's prompt into a world-class analytical dashboard.
        
        SCHEMA CONTEXT:
        {schema}
        
        ANALYTICAL FRAMEWORK:
        1. STRATEGY: Analyze the user's intent. If they ask for 'Retention', don't just count employees; look at tenure, department turnover, and exit reasons.
        2. KPI SELECTION: Choose 3-4 critical 'at-a-glance' metrics (KPIs) that define success for this prompt.
        3. VISUALIZATION DEPTH: Suggest 4-8 diverse charts. DO NOT use only Bar charts. Use:
           - Line Charts for trends over time.
           - Pie/Donut for part-to-whole (e.g., Budget Split).
           - Scatter for correlations (e.g., Experience vs. Performance).
           - Heatmaps for density (e.g., Skills by Department).
        4. DATA REALISM: Use the [MASTER DATA PROFILE] provided in the user prompt to ensure you only suggest columns and categories that actually exist.
        
        STRICT OUTPUT FORMAT (JSON ONLY):
        {{
          "components": [
            {{
              "type": "kpi" | "chart",
              "title": "Professional, Concise Title",
              "question": "The specific data question this answers (e.g., 'What is the correlation between training and output?')",
              "reasoning": "Why this specific metric matters for the user's goal",
              "priority": 1-10
            }}
          ]
        }}
        
        CRITICAL: Address EVERY part of the user's prompt. If they ask for 'Gender and Age', you MUST provide components for both.
        """
        
        content = await self._call_ai(system_prompt, prompt, task_complexity="high")
        
        # Robust JSON Extraction
        try:
            # Look for JSON structure in the content
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                plan = json.loads(json_str)
            else:
                plan = json.loads(content)
                
            if isinstance(plan, dict):
                return plan.get("components", [])
            return plan if isinstance(plan, list) else []
        except Exception as e:
            print(f"❌ Project Plan Parse Error: {str(e)}")
            print(f"📄 Raw Content: {content[:500]}...")
            return []

ai_service = AIService()
