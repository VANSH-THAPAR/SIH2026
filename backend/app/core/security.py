import os
from datetime import datetime, timedelta
from typing import Any, Union
import json
import base64
import hmac
import hashlib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"exp": expire.timestamp(), "sub": str(subject)}
    
    encoded_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    
    signature = hmac.new(
        SECRET_KEY.encode(),
        f"{encoded_header}.{encoded_payload}".encode(),
        hashlib.sha256
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise credentials_exception
            
        header_b64, payload_b64, signature_b64 = parts
        
        expected_signature = hmac.new(
            SECRET_KEY.encode(),
            f"{header_b64}.{payload_b64}".encode(),
            hashlib.sha256
        ).digest()
        encoded_expected = base64.urlsafe_b64encode(expected_signature).decode().rstrip("=")
        
        if not hmac.compare_digest(signature_b64, encoded_expected):
            raise credentials_exception
            
        padding = "=" * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding).decode())
        
        if payload.get("exp", 0) < datetime.utcnow().timestamp():
            raise credentials_exception
            
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_hse_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "hse":
        raise HTTPException(status_code=403, detail="Not enough permissions: HSE role required")
    return current_user

def get_current_reporter_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "reporter":
        raise HTTPException(status_code=403, detail="Not enough permissions: Reporter role required")
    return current_user
