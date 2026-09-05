from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import AuthLoginRequest, AuthLoginResponse
from app.schemas.user import UserResponse
from app.services.auth_service import authenticate_user_credentials
from app.core.security import (
    create_access_token,
    get_current_user,
    require_authenticated_user,
)

router = APIRouter(tags=["Authentication"])


@router.post("/login", response_model=AuthLoginResponse)
def login(credentials: AuthLoginRequest, db: Session = Depends(get_db)):
    identifier = credentials.get_login_identifier()
    user, error = authenticate_user_credentials(db, identifier, credentials.password)

    if error == "User account is inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or disabled",
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Login ID/Email or Password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(require_authenticated_user)):
    return current_user
