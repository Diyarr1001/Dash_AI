import duckdb
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

class DatabaseManager:
    def __init__(self):
        self.duckdb_path = settings.DUCKDB_DATABASE_PATH
        self._duck_conn = None
        
        # PostgreSQL setup
        if settings.DATABASE_URL:
            self.pg_engine = create_engine(settings.DATABASE_URL)
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.pg_engine)
        else:
            self.pg_engine = None
            self.SessionLocal = None
        
    def _get_mssql_conn_str(self, server, database, user=None, password=None, use_windows_auth=True):
        driver = "{ODBC Driver 17 for SQL Server}"
        if use_windows_auth:
            return f"Driver={driver};Server={server};Database={database};Trusted_Connection=yes;TrustServerCertificate=yes;"
        else:
            return f"Driver={driver};Server={server};Database={database};Uid={user};Pwd={password};TrustServerCertificate=yes;"

    @property
    def duck_conn(self):
        if self._duck_conn is None:
            self._duck_conn = duckdb.connect(self.duckdb_path)
        return self._duck_conn

    def execute_duck_query(self, query: str):
        """Execute a query against DuckDB and return the result as a list of dicts."""
        return self.duck_conn.execute(query).fetchall()

    def get_df_from_duck(self, query: str):
        """Execute a query and return a Pandas DataFrame."""
        return self.duck_conn.execute(query).df()

    def load_file_to_duck(self, file_path: str, table_name: str):
        """Load a CSV or Excel file into DuckDB table(s). Returns a list of table names created."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.csv':
            self.duck_conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_csv_auto('{file_path}')")
            return [table_name]
        elif ext in ['.xlsx', '.xls']:
            import pandas as pd
            # sheet_name=None reads all sheets into a dictionary of DataFrames
            dfs = pd.read_excel(file_path, sheet_name=None)
            table_names = []
            import re
            table_names = []
            for sheet_name, df in dfs.items():
                # Robust sanitization for DuckDB table names
                safe_sheet = re.sub(r'[^a-zA-Z0-9_]', '_', sheet_name).lower()
                safe_name = f"{table_name}_{safe_sheet}"
                
                # Ensure name isn't just underscores
                if not safe_sheet or safe_sheet.strip('_') == '':
                    safe_name = f"{table_name}_sheet_{len(table_names)}"
                
                try:
                    self.duck_conn.register('temp_df', df)
                    self.duck_conn.execute(f"CREATE OR REPLACE TABLE \"{safe_name}\" AS SELECT * FROM temp_df")
                    self.duck_conn.unregister('temp_df')
                    table_names.append(safe_name)
                except Exception as e:
                    print(f"⚠️ Failed to load sheet '{sheet_name}': {str(e)}")
            
            if not table_names:
                raise ValueError("No valid sheets could be loaded from the Excel file.")
            return table_names
        elif ext == '.parquet':
            self.duck_conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_parquet('{file_path}')")
            return [table_name]
        else:
            raise ValueError(f"Unsupported file extension: {ext}")

    def load_gsheet_to_duck(self, url, table_name):
        """Load a public Google Sheet into DuckDB using the CSV export URL."""
        try:
            import re
            # Extract spreadsheet ID from URL
            match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", url)
            if not match:
                raise ValueError("Invalid Google Sheets URL. Please make sure it's a valid link.")
            
            sheet_id = match.group(1)
            
            # Check for GID (specific sheet/tab)
            gid_match = re.search(r"gid=([0-9]+)", url)
            gid_suffix = f"&gid={gid_match.group(1)}" if gid_match else ""
            
            # Use the CSV export endpoint
            csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv{gid_suffix}"
            
            # Load into DuckDB
            # Ensure httpfs is loaded for URL access
            self.duck_conn.execute("INSTALL httpfs; LOAD httpfs;")
            
            # read_csv_auto is very powerful for detecting types from Google's CSV export
            self.duck_conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_csv_auto('{csv_url}')")
            return [table_name]
        except Exception as e:
            print(f"❌ Google Sheets Error: {str(e)}")
            raise Exception(f"Failed to load Google Sheet: {str(e)}")

    def connect_postgres(self, host, port, database, user, password, schema='public', selected_tables=None):
        """Attach a PostgreSQL database and create views for selected tables."""
        try:
            self.duck_conn.execute("INSTALL postgres; LOAD postgres;")
            conn_str = f"dbname={database} user={user} password={password} host={host} port={port} sslmode=prefer"
            alias = f"pg_raw_{database.lower().replace('-', '_')}"
            
            # Attach the raw DB
            self.duck_conn.execute(f"ATTACH '{conn_str}' AS {alias} (TYPE POSTGRES, SCHEMA '{schema}', READ_ONLY)")
            
            # Create a local schema for our filtered views
            local_alias = f"pg_{database.lower().replace('-', '_')}"
            self.duck_conn.execute(f"DROP SCHEMA IF EXISTS {local_alias} CASCADE")
            self.duck_conn.execute(f"CREATE SCHEMA {local_alias}")
            
            # If no tables selected, get all tables from the specified schema
            if not selected_tables:
                tables_res = self.duck_conn.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}'").fetchall()
                selected_tables = [row[0] for row in tables_res]
            
            for table in selected_tables:
                base_table = table.split('.')[-1]
                self.duck_conn.execute(f"CREATE VIEW {local_alias}.{base_table} AS SELECT * FROM {alias}.{base_table}")
            
            return local_alias
        except Exception as e:
            print(f"❌ PostgreSQL Attach Error: {str(e)}")
            raise Exception(f"Failed to connect to PostgreSQL: {str(e)}")

    def connect_mysql(self, host, port, database, user, password, selected_tables=None):
        """Attach a MySQL database and create views for selected tables."""
        try:
            self.duck_conn.execute("INSTALL mysql; LOAD mysql;")
            conn_str = f"host={host} port={port} user={user} password={password} database={database}"
            raw_alias = f"mysql_raw_{database.lower().replace('-', '_')}"
            
            self.duck_conn.execute(f"ATTACH '{conn_str}' AS {raw_alias} (TYPE mysql, READ_ONLY)")
            
            # Create a local schema for our views
            local_alias = f"mysql_{database.lower().replace('-', '_')}"
            self.duck_conn.execute(f"DROP SCHEMA IF EXISTS {local_alias} CASCADE")
            self.duck_conn.execute(f"CREATE SCHEMA {local_alias}")
            
            if not selected_tables:
                tables_res = self.duck_conn.execute(f"SHOW TABLES FROM {raw_alias}").fetchall()
                selected_tables = [row[0] for row in tables_res]
                
            for table in selected_tables:
                base_table = table.split('.')[-1]
                self.duck_conn.execute(f"CREATE VIEW {local_alias}.{base_table} AS SELECT * FROM {raw_alias}.{base_table}")
                
            return local_alias
        except Exception as e:
            print(f"❌ MySQL Attach Error: {str(e)}")
            raise Exception(f"Failed to connect to MySQL: {str(e)}")

    def connect_mssql(self, server, database, user=None, password=None, use_windows_auth=True):
        """Attach a SQL Server database by dynamically creating views using DuckDB's odbc_query."""
        try:
            # Install and load the odbc extension
            self.duck_conn.execute("INSTALL odbc; LOAD odbc;")
            
            if use_windows_auth:
                conn_str = f"Driver={driver};Server={server};Database={database};Trusted_Connection=yes;TrustServerCertificate=yes;"
            else:
                conn_str = f"Driver={driver};Server={server};Database={database};Uid={user};Pwd={password};TrustServerCertificate=yes;"
            
            return conn_str
        except Exception as e:
            raise Exception(f"Failed to construct connection string: {str(e)}")

    def list_mssql_databases(self, server, user=None, password=None, use_windows_auth=True):
        """List all databases on a SQL Server instance."""
        try:
            self.duck_conn.execute("INSTALL odbc; LOAD odbc;")
            # Connect to 'master' to list databases
            conn_str = self._get_mssql_conn_str(server, "master", user, password, use_windows_auth)
            # Use escaped single quotes for the inner query
            db_query = "SELECT name FROM sys.databases WHERE database_id > 4".replace("'", "''")
            res = self.duck_conn.execute(f"SELECT * FROM odbc_query('{conn_str}', '{db_query}')").fetchall()
            return [row[0] for row in res]
        except Exception as e:
            print(f"❌ SQL Server List DBs Error: {str(e)}")
            raise Exception(f"Failed to list databases: {str(e)}")

    def list_mssql_tables(self, server, database, user=None, password=None, use_windows_auth=True):
        """List all user tables in a specific database."""
        try:
            self.duck_conn.execute("INSTALL odbc; LOAD odbc;")
            conn_str = self._get_mssql_conn_str(server, database, user, password, use_windows_auth)
            # IMPORTANT: Escape single quotes for SQL Server concatenation in the sub-query
            query = "SELECT s.name + '.' + t.name FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.is_ms_shipped = 0"
            escaped_query = query.replace("'", "''")
            res = self.duck_conn.execute(f"SELECT * FROM odbc_query('{conn_str}', '{escaped_query}')").fetchall()
            return [row[0] for row in res]
        except Exception as e:
            print(f"❌ SQL Server List Tables Error: {str(e)}")
            raise Exception(f"Failed to list tables: {str(e)}")

    def list_postgres_tables(self, host, port, database, user, password, schema='public'):
        """List all user tables in a specific PostgreSQL schema."""
        try:
            self.duck_conn.execute("INSTALL postgres; LOAD postgres;")
            conn_str = f"dbname={database} user={user} password={password} host={host} port={port} sslmode=prefer"
            res = self.duck_conn.execute(f"SELECT table_name FROM postgres_scan('{conn_str}', '{schema}', 'information_schema.tables') WHERE table_schema = '{schema}'").fetchall()
            return [row[0] for row in res]
        except Exception as e:
            raise Exception(f"Failed to list PostgreSQL tables: {str(e)}")

    def list_mysql_tables(self, host, port, database, user, password):
        """List all tables in a specific MySQL database."""
        try:
            self.duck_conn.execute("INSTALL mysql; LOAD mysql;")
            conn_str = f"host={host} port={port} user={user} password={password} database={database}"
            res = self.duck_conn.execute(f"SELECT table_name FROM mysql_scan('{conn_str}', 'information_schema.tables') WHERE table_schema = '{database}'").fetchall()
            return [row[0] for row in res]
        except Exception as e:
            raise Exception(f"Failed to list MySQL tables: {str(e)}")

    def connect_mssql(self, server, database, user=None, password=None, use_windows_auth=True, selected_tables=None):
        """Attach a SQL Server database by dynamically creating views using DuckDB's odbc_query."""
        try:
            # Install and load the odbc extension
            self.duck_conn.execute("INSTALL odbc; LOAD odbc;")
            
            # Construct ODBC connection string
            conn_str = self._get_mssql_conn_str(server, database, user, password, use_windows_auth)
            
            # Fetch all user tables and their columns, excluding unsupported ODBC types
            # Add filtering if selected_tables is provided
            where_clause = "WHERE t.is_ms_shipped = 0"
            if selected_tables:
                table_list = ", ".join([f"'{t.split('.')[-1]}'" for t in selected_tables])
                where_clause += f" AND t.name IN ({table_list})"
            
            cols_query = f"""
            SELECT 
                s.name AS schema_name,
                t.name AS table_name,
                c.name AS column_name,
                ty.name AS data_type
            FROM sys.tables t
            JOIN sys.schemas s ON t.schema_id = s.schema_id
            JOIN sys.columns c ON t.object_id = c.object_id
            JOIN sys.types ty ON c.user_type_id = ty.user_type_id
            {where_clause}
            ORDER BY s.name, t.name, c.column_id
            """
            
            cols_res = self.duck_conn.execute(
                f"SELECT * FROM odbc_query('{conn_str}', '{cols_query.replace(chr(39), chr(39)*2)}')"
            ).fetchall()
            
            # Group columns by table and cast problematic types to strings instead of excluding them
            from collections import defaultdict
            table_cols = defaultdict(list)
            
            for row in cols_res:
                schema = row[0]
                table = row[1]
                col_name = row[2]
                data_type = row[3].lower() if row[3] else ''
                
                safe_col = col_name.replace("]", "]]")
                
                # Safely cast complex or unsupported ODBC types to strings
                if data_type in {'geometry', 'geography', 'hierarchyid'}:
                    table_cols[(schema, table)].append(f"[{safe_col}].ToString() AS [{safe_col}]")
                elif data_type in {'xml', 'sql_variant'}:
                    table_cols[(schema, table)].append(f"CAST([{safe_col}] AS NVARCHAR(MAX)) AS [{safe_col}]")
                elif data_type in {'varbinary', 'binary', 'image', 'timestamp', 'rowversion'}:
                    # Convert binary to hex string (style 1)
                    table_cols[(schema, table)].append(f"CONVERT(NVARCHAR(MAX), [{safe_col}], 1) AS [{safe_col}]")
                else:
                    table_cols[(schema, table)].append(f"[{safe_col}]")

            # Use a deterministic alias and clear any previous views for this DB
            alias = f"mssql_{database.lower().replace('-', '_')}"
            self.duck_conn.execute(f"DROP SCHEMA IF EXISTS {alias} CASCADE")
            self.duck_conn.execute(f"CREATE SCHEMA {alias}")
            
            # Create views for each table
            for (schema, table), cols in table_cols.items():
                if not cols:
                    continue  # Skip tables with no supported columns
                
                table_schema_safe = schema.replace("'", "''")
                table_name_safe = table.replace("'", "''")
                
                full_table_name = f"[{table_schema_safe}].[{table_name_safe}]"
                view_name = f"{table_schema_safe}_{table_name_safe}"
                
                col_selection = ", ".join(cols)
                
                # The view transparently proxies queries to SQL Server via odbc_query
                self.duck_conn.execute(
                    f"CREATE OR REPLACE VIEW {alias}.{view_name} AS SELECT * FROM odbc_query('{conn_str}', 'SELECT {col_selection} FROM {full_table_name}');"
                )
            
            return alias
        except Exception as e:
            print(f"❌ SQL Server Attach Error: {str(e)}")
            raise Exception(f"Failed to attach SQL Server. Ensure '{driver}' is installed. Error: {str(e)}")

db_manager = DatabaseManager()
