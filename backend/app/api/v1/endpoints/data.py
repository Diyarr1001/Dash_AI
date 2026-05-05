from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import uuid
import pandas as pd
import numpy as np
from app.services.database import db_manager

from pydantic import BaseModel
from typing import List, Optional

def make_json_safe(df):
    return df.replace({np.nan: None}).to_dict(orient="records")

router = APIRouter()

class PostgresConfig(BaseModel):
    host: str
    port: str
    database: str
    user: str
    password: str
    schema_name: str = "public"
    selected_tables: Optional[List[str]] = None

class MysqlConfig(BaseModel):
    host: str
    port: str
    database: str
    user: str
    password: str

class MssqlConfig(BaseModel):
    server: str
    database: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None
    use_windows_auth: bool = True
    selected_tables: Optional[List[str]] = None

@router.post("/discover-databases")
async def discover_databases(config: MssqlConfig):
    try:
        databases = db_manager.list_mssql_databases(
            server=config.server,
            user=config.user,
            password=config.password,
            use_windows_auth=config.use_windows_auth
        )
        return {"databases": databases}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/discover-tables")
async def discover_tables(config: MssqlConfig):
    print(f"🔍 Discovering tables for DB: {config.database} on {config.server}")
    if not config.database:
        raise HTTPException(status_code=400, detail="Database name is required to list tables.")
    try:
        tables = db_manager.list_mssql_tables(
            server=config.server,
            database=config.database,
            user=config.user,
            password=config.password,
            use_windows_auth=config.use_windows_auth
        )
        return {"tables": tables}
    except Exception as e:
        print(f"❌ Discover Tables Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/discover-postgres-tables")
async def discover_postgres_tables(config: PostgresConfig):
    try:
        tables = db_manager.list_postgres_tables(
            host=config.host,
            port=config.port,
            database=config.database,
            user=config.user,
            password=config.password,
            schema=config.schema_name
        )
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/discover-mysql-tables")
async def discover_mysql_tables(config: MysqlConfig):
    try:
        tables = db_manager.list_mysql_tables(
            host=config.host,
            port=config.port,
            database=config.database,
            user=config.user,
            password=config.password
        )
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class GSheetsConfig(BaseModel):
    url: str

@router.post("/connect-gsheets")
async def connect_gsheets(config: GSheetsConfig):
    try:
        # Generate a deterministic table name based on the URL
        import hashlib
        table_name = f"gsheet_{hashlib.md5(config.url.encode()).hexdigest()[:8]}"
        
        # Load into DuckDB
        table_names = db_manager.load_gsheet_to_duck(config.url, table_name)
        active_table = table_names[0]
        
        # Get schema
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {active_table}")
        columns = [{"name": row[0], "type": str(row[1]), "nullable": row[2]} for row in schema_info]
        
        # Preview data
        preview_df = db_manager.get_df_from_duck(f"SELECT * FROM {active_table} LIMIT 10")
        
        # Get row count
        count_res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {active_table}")
        total_rows = count_res[0][0] if count_res else 0
        
        return {
            "status": "connected",
            "filename": "Google Sheet",
            "table_name": active_table,
            "tables": table_names,
            "columns": columns,
            "preview": make_json_safe(preview_df),
            "total_rows": total_rows,
            "total_db_rows": total_rows
        }
    except Exception as e:
        print(f"❌ GSheets Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/connect-postgres")
async def connect_postgres(config: PostgresConfig):
    # ... existing postgres code ...
    try:
        # Attach the database with table filtering
        alias = db_manager.connect_postgres(
            host=config.host,
            port=config.port,
            database=config.database,
            user=config.user,
            password=config.password,
            schema=config.schema_name,
            selected_tables=config.selected_tables
        )
        
        # Get list of tables from the attached DB
        tables_res = db_manager.execute_duck_query(f"SHOW TABLES FROM {alias}")
        table_names = [row[0] for row in tables_res]
        
        if not table_names:
            return {
                "status": "connected",
                "database": config.database,
                "alias": alias,
                "tables": [],
                "message": "Connected successfully, but no tables were found in the specified schema."
            }
            
        # Get preview of the first table
        first_table = table_names[0]
        full_table_path = f"{alias}.{first_table}"
        
        # Get schema of first table
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {full_table_path}")
        columns = [{"name": row[0], "type": str(row[1]), "nullable": row[2]} for row in schema_info]
        
        # Preview data
        preview_df = db_manager.get_df_from_duck(f"SELECT * FROM {full_table_path} LIMIT 10")
        
        # Get row count
        count_res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {full_table_path}")
        total_rows = count_res[0][0] if count_res else 0
        
        # Get total database row count
        total_db_rows = 0
        for t in table_names:
            try:
                res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {alias}.{t}")
                if res: total_db_rows += res[0][0]
            except: pass
        
        return {
            "status": "connected",
            "database": config.database,
            "alias": alias,
            "tables": table_names,
            "columns": columns,
            "preview": make_json_safe(preview_df),
            "total_rows": total_rows,
            "total_db_rows": total_db_rows
        }
    except Exception as e:
        print(f"❌ Postgres Connect API Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/connect-mysql")
async def connect_mysql(config: MysqlConfig):
    try:
        # Attach the database with table filtering
        alias = db_manager.connect_mysql(
            host=config.host,
            port=config.port,
            database=config.database,
            user=config.user,
            password=config.password,
            selected_tables=config.selected_tables
        )
        
        # Get list of tables from the attached DB
        tables_res = db_manager.execute_duck_query(f"SHOW TABLES FROM {alias}")
        table_names = [row[0] for row in tables_res]
        
        if not table_names:
            return {
                "status": "connected",
                "database": config.database,
                "alias": alias,
                "tables": [],
                "message": "Connected successfully, but no tables were found in the specified database."
            }
            
        # Get preview of the first table
        first_table = table_names[0]
        full_table_path = f"{alias}.{first_table}"
        
        # Get schema of first table
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {full_table_path}")
        columns = [{"name": row[0], "type": str(row[1]), "nullable": row[2]} for row in schema_info]
        
        # Preview data
        preview_df = db_manager.get_df_from_duck(f"SELECT * FROM {full_table_path} LIMIT 10")
        
        # Get row count
        count_res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {full_table_path}")
        total_rows = count_res[0][0] if count_res else 0
        
        # Get total database row count
        total_db_rows = 0
        for t in table_names:
            try:
                res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {alias}.{t}")
                if res: total_db_rows += res[0][0]
            except: pass
        
        return {
            "status": "connected",
            "database": config.database,
            "alias": alias,
            "tables": table_names,
            "columns": columns,
            "preview": make_json_safe(preview_df),
            "total_rows": total_rows,
            "total_db_rows": total_db_rows
        }
    except Exception as e:
        print(f"❌ MySQL Connect API Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/connect-mssql")
async def connect_mssql(config: MssqlConfig):
    try:
        # Attach the database
        alias = db_manager.connect_mssql(
            server=config.server,
            database=config.database,
            user=config.user,
            password=config.password,
            use_windows_auth=config.use_windows_auth,
            selected_tables=config.selected_tables
        )
        
        # Get list of tables from the attached DB
        tables_res = db_manager.execute_duck_query(f"SHOW TABLES FROM {alias}")
        table_names = [row[0] for row in tables_res]
        
        if not table_names:
            return {
                "status": "connected",
                "database": config.database,
                "alias": alias,
                "tables": [],
                "message": "Connected successfully, but no tables were found in the specified database."
            }
            
        # Get preview of the first table
        first_table = table_names[0]
        full_table_path = f"{alias}.{first_table}"
        
        # Get schema of first table
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {full_table_path}")
        columns = [{"name": row[0], "type": str(row[1]), "nullable": row[2]} for row in schema_info]
        
        # Preview data
        preview_df = db_manager.get_df_from_duck(f"SELECT * FROM {full_table_path} LIMIT 10")
        
        # Get row count
        count_res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {full_table_path}")
        total_rows = count_res[0][0] if count_res else 0
        
        # Get total database row count
        total_db_rows = 0
        for t in table_names:
            try:
                res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {alias}.{t}")
                if res: total_db_rows += res[0][0]
            except: pass
        
        return {
            "status": "connected",
            "database": config.database,
            "alias": alias,
            "tables": table_names,
            "columns": columns,
            "preview": make_json_safe(preview_df),
            "total_rows": total_rows,
            "total_db_rows": total_db_rows
        }
    except Exception as e:
        print(f"❌ SQL Server Connect API Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def make_json_safe(df: pd.DataFrame):
    """Convert NaN/Inf values to None for JSON serialization."""
    # Handle empty or non-dataframe input
    if df is None or df.empty:
        return []
    # Replace JSON-incompatible floats
    return df.replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict(orient="records")

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    temp_file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Table name will be based on filename or ID
        table_name = f"data_{file_id.replace('-', '_')}"
        
        # Load into DuckDB (returns list of created table names)
        table_names = db_manager.load_file_to_duck(temp_file_path, table_name)
        
        # Default to first table for preview
        active_table = table_names[0]
        
        # Get schema
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {active_table}")
        columns = [{"name": row[0], "type": str(row[1]), "nullable": row[2]} for row in schema_info]
        
        # Preview data
        preview_df = db_manager.get_df_from_duck(f"SELECT * FROM {active_table} LIMIT 10")
        
        # Get row count of active table
        count_res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {active_table}")
        total_rows = count_res[0][0] if count_res else 0
        
        # Get row count of entire excel file
        total_db_rows = 0
        for t in table_names:
            try:
                res = db_manager.execute_duck_query(f"SELECT COUNT(*) FROM {t}")
                if res: total_db_rows += res[0][0]
            except: pass
        
        return {
            "id": file_id,
            "filename": file.filename,
            "table_name": active_table,
            "tables": table_names,
            "columns": columns,
            "preview": make_json_safe(preview_df),
            "total_rows": total_rows,
            "total_db_rows": total_db_rows
        }
    except Exception as e:
        import traceback
        print(f"❌ Upload Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        # File is kept in uploads dir for persistence
        pass

@router.get("/preview/{table_name}")
async def get_table_preview(table_name: str):
    try:
        # Get schema
        schema_info = db_manager.execute_duck_query(f"DESCRIBE {table_name}")
        columns = [{"name": row[0], "type": str(row[1]), "nullable": row[2]} for row in schema_info]
        
        # Preview data
        preview_df = db_manager.get_df_from_duck(f"SELECT * FROM {table_name} LIMIT 10")
        
        return {
            "table_name": table_name,
            "columns": columns,
            "data": make_json_safe(preview_df)
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Preview Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tables")
async def list_tables():
    try:
        tables = db_manager.execute_duck_query("SHOW TABLES")
        return {"tables": [row[0] for row in tables]}
    except Exception as e:
        return {"tables": [], "error": str(e)}
