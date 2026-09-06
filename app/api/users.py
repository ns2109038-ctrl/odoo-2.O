import os
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserStatusUpdate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    LoginHistoryResponse,
    ActiveSessionResponse,
)
from app.services.user_service import (
    create_user,
    get_users,
    get_user_by_id,
    update_user,
    update_user_status,
    delete_user,
    authenticate_user,
    log_login_event,
    get_login_history,
    get_active_sessions,
)
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
)
from app.services.email_service import send_password_reset_email

router = APIRouter(tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        return create_user(db, user_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.login_id, credentials.password)
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"

    if not user:
        log_login_event(db, login_id=credentials.login_id, name=credentials.login_id, role="user", status="Failed (Invalid Credentials)", method="Password", ip=client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Login ID or Password",
        )

    log_login_event(db, login_id=user.login_id, name=user.name, role=user.role, status="Success", method="Password", ip=client_ip, user_id=user.id)
    token = create_access_token(user.id, user.role)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/login-history", response_model=List[LoginHistoryResponse])
@router.get("/me/login-history", response_model=List[LoginHistoryResponse], include_in_schema=False)
def read_login_history(
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return get_login_history(db, limit=limit)


@router.get("/active-sessions", response_model=List[ActiveSessionResponse])
@router.get("/me/active-sessions", response_model=List[ActiveSessionResponse], include_in_schema=False)
def read_active_sessions(
    db: Session = Depends(get_db),
):
    return get_active_sessions(db)






@router.get("", response_model=List[UserResponse])
@router.get("/", response_model=List[UserResponse], include_in_schema=False)
def read_all(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return get_users(db, skip=skip, limit=limit, is_active=is_active, role=role)


@router.get("/{user_id}", response_model=UserResponse)
def read_one(user_id: int, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found.",
        )
    return user


@router.get("/{user_id}/login-history", response_model=List[LoginHistoryResponse])
def read_user_login_history(
    user_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return get_login_history(db, user_id=user_id, limit=limit)


@router.get("/{user_id}/active-sessions", response_model=List[ActiveSessionResponse])
def read_user_active_sessions(
    user_id: int,
    db: Session = Depends(get_db),
):
    return get_active_sessions(db, user_id=user_id)



@router.put("/{user_id}", response_model=UserResponse)
def update(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
):
    try:
        user = update_user(db, user_id, user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with id {user_id} not found.",
            )
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{user_id}/status", response_model=UserResponse)
def change_status(
    user_id: int,
    status_data: UserStatusUpdate,
    db: Session = Depends(get_db),
):
    user = update_user_status(db, user_id, status_data.is_active)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found.",
        )
    return user


@router.delete("/{user_id}")
def delete(user_id: int, db: Session = Depends(get_db)):
    deleted = delete_user(db, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found.",
        )
    return {"message": "User deleted successfully", "id": user_id}


class RequestResetInput(BaseModel):
    identifier: Optional[str] = None
    login_id: Optional[str] = None
    email: Optional[str] = None


class UserResetPasswordInput(BaseModel):
    token: str
    new_password: str
    confirm_password: Optional[str] = None


@router.post("/request-reset")
def request_user_password_reset(body: RequestResetInput, db: Session = Depends(get_db)):
    ident = (body.identifier or body.login_id or body.email or "").strip().lower()
    if not ident:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifier, login_id, or email is required.",
        )

    user = db.query(User).filter(
        (func.lower(User.login_id) == ident) | (func.lower(User.email) == ident)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{ident}' not found.",
        )

    token = create_password_reset_token(user.id, user.email or "", user.login_id)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_url = f"{frontend_url}/?token={token}"

    try:
        if user.email:
            send_password_reset_email(
                to_email=user.email,
                login_id=user.login_id,
                reset_url=reset_url,
            )
    except Exception as exc:
        print(f"[Email Warning] {exc}")

    return {
        "message": "Password reset link generated successfully.",
        "reset_token": token,
        "reset_url": reset_url,
        "email": user.email,
        "login_id": user.login_id,
    }


@router.post("/reset-password")
def reset_user_password(body: UserResetPasswordInput, db: Session = Depends(get_db)):
    conf_pw = body.confirm_password if body.confirm_password is not None else body.new_password
    if body.new_password != conf_pw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Passwords do not match.",
        )

    pw = body.new_password
    if len(pw) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )

    try:
        payload = decode_password_reset_token(body.token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link.",
        )

    user.password_hash = hash_password(body.new_password)
    db.commit()

    return {"message": "Password has been reset successfully. You can now sign in with your new password."}

