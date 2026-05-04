from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from app.models.models import Dashboard
from app.services.database import db_manager
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class DashboardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    config: dict
    owner_id: int = 1  # Placeholder for current user

@router.post("/")
async def save_dashboard(dashboard_in: DashboardCreate):
    try:
        with Session(db_manager.pg_engine) as session:
            db_dashboard = Dashboard.model_validate(dashboard_in)
            session.add(db_dashboard)
            session.commit()
            session.refresh(db_dashboard)
            return db_dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def list_dashboards(owner_id: int = 1):
    with Session(db_manager.pg_engine) as session:
        statement = select(Dashboard).where(Dashboard.owner_id == owner_id)
        results = session.exec(statement)
        return results.all()

@router.get("/{dashboard_id}")
async def get_dashboard(dashboard_id: int):
    with Session(db_manager.pg_engine) as session:
        dashboard = session.get(Dashboard, dashboard_id)
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        return dashboard

@router.delete("/{dashboard_id}")
async def delete_dashboard(dashboard_id: int):
    with Session(db_manager.pg_engine) as session:
        dashboard = session.get(Dashboard, dashboard_id)
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        session.delete(dashboard)
        session.commit()
        return {"status": "success"}

@router.put("/{dashboard_id}")
async def update_dashboard(dashboard_id: int, dashboard_in: DashboardCreate):
    try:
        with Session(db_manager.pg_engine) as session:
            db_dashboard = session.get(Dashboard, dashboard_id)
            if not db_dashboard:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            
            # Update fields
            db_dashboard.title = dashboard_in.title
            db_dashboard.description = dashboard_in.description
            db_dashboard.config = dashboard_in.config
            
            session.add(db_dashboard)
            session.commit()
            session.refresh(db_dashboard)
            return db_dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
