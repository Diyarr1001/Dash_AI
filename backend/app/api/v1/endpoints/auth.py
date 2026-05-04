from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.models.models import User
from app.services.database import db_manager
from app.services.auth import auth_service
from pydantic import BaseModel, EmailStr
from typing import Any

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

@router.post("/register", response_model=Token)
async def register_user(user_in: UserCreate):
    try:
        with Session(db_manager.pg_engine) as session:
            # Check if user exists
            statement = select(User).where(User.email == user_in.email)
            existing_user = session.exec(statement).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="User with this email already exists")
            
            # Create user
            db_user = User(
                email=user_in.email,
                full_name=user_in.full_name,
                hashed_password=auth_service.get_password_hash(user_in.password),
                is_active=True
            )
            session.add(db_user)
            session.commit()
            session.refresh(db_user)
            
            # Generate token
            access_token = auth_service.create_access_token(db_user.id)
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": db_user
            }
    except Exception as e:
        print(f"❌ Registration Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(db_manager.pg_engine) as session:
        statement = select(User).where(User.email == form_data.username)
        user = session.exec(statement).first()
        
        if not user or not auth_service.verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        
        access_token = auth_service.create_access_token(user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
