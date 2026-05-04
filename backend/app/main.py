from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.v1.endpoints import data, query, dashboards, project, analytics, auth
from app.models.models import SQLModel
from app.services.database import db_manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Data Analytics Platform",
    version="0.1.0"
)

from sqlmodel import Session, select
from app.models.models import User

# Initialize Database Tables
@app.on_event("startup")
def on_startup():
    if db_manager.pg_engine:
        SQLModel.metadata.create_all(db_manager.pg_engine)
        print("✅ Database tables initialized successfully.")
        
        # Ensure a default user exists for dashboards
        with Session(db_manager.pg_engine) as session:
            statement = select(User).where(User.id == 1)
            user = session.exec(statement).first()
            if not user:
                print("👤 Creating default system user...")
                default_user = User(
                    id=1,
                    email="admin@dashai.local",
                    full_name="System Admin",
                    hashed_password="placeholder_not_used_yet"
                )
                session.add(default_user)
                session.commit()
                print("✅ Default system user created.")

# Register Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(data.router, prefix=f"{settings.API_V1_STR}/data", tags=["data"])
app.include_router(query.router, prefix=f"{settings.API_V1_STR}/query", tags=["query"])
app.include_router(dashboards.router, prefix=f"{settings.API_V1_STR}/dashboards", tags=["dashboards"])
app.include_router(project.router, prefix=f"{settings.API_V1_STR}/project", tags=["project"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Temporarily allow all for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
import logging
from fastapi import Request
from fastapi.responses import JSONResponse

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Error handling middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        # Create response
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "message": str(e)}
        )
        # Manually add CORS headers since we're bypassing the CORSMiddleware by returning early
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "status": "online",
        "version": "0.1.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
