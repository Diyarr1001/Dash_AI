from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def create_access_token(self, subject: Union[str, Any], expires_delta: timedelta = None) -> str:
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {"exp": expire, "sub": str(subject)}
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        # Bcrypt has a 72-byte limit
        safe_password = plain_password[:72]
        return pwd_context.verify(safe_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        # Bcrypt has a 72-byte limit
        safe_password = password[:72]
        return pwd_context.hash(safe_password)

auth_service = AuthService()
