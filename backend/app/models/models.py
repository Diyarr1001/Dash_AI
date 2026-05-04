from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, JSON, Column

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    dashboards: List["Dashboard"] = Relationship(back_populates="owner")

class Dashboard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    config: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    owner_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    owner: User = Relationship(back_populates="dashboards")
    data_sources: List["DataSource"] = Relationship(back_populates="dashboard")

class DataSource(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str # 'file', 'postgres', etc.
    connection_info: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    table_name: str # DuckDB table name
    dashboard_id: Optional[int] = Field(default=None, foreign_key="dashboard.id")
    
    dashboard: Optional[Dashboard] = Relationship(back_populates="data_sources")
