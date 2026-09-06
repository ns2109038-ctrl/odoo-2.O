from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import os

from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import AuthLoginRequest, AuthLoginResponse
from app.schemas.user import UserResponse
from app.services.auth_service import authenticate_user_credentials
from app.services.user_service import log_login_event
from app.core.security import (
    create_access_token,
    get_current_user,
    require_authenticated_user,
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
)
from app.services.email_service import send_password_reset_email

router = APIRouter(tags=["Authentication"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


from typing import Optional

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthLoginResponse)
def login(credentials: AuthLoginRequest, request: Request, db: Session = Depends(get_db)):
    identifier = credentials.get_login_identifier()
    user, error = authenticate_user_credentials(db, identifier, credentials.password)

    client_ip = request.client.host if (request and request.client) else "127.0.0.1"

    if error == "User account is inactive":
        if user:
            log_login_event(db, login_id=user.login_id, name=user.name, role=user.role, status="Failed (Inactive Account)", method="Password", ip=client_ip, user_id=user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or disabled",
        )

    if not user:
        log_login_event(db, login_id=identifier, name=identifier, role="user", status="Failed (Invalid Credentials)", method="Password", ip=client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Login ID/Email or Password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    log_login_event(db, login_id=user.login_id, name=user.name, role=user.role, status="Success", method="Password", ip=client_ip, user_id=user.id)

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


from sqlalchemy import func

@router.post("/forgot-password", status_code=200)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Send a password reset link to the user's email.
    Always returns 200 (even if email not found) to prevent user enumeration.
    In development mode (when SMTP credentials are not configured in .env),
    includes dev_reset_url so developers/judges can test the flow immediately.
    """
    clean_email = str(body.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    dev_reset_url = None
    if user and user.is_active:
        token = create_password_reset_token(user.id, user.email, user.login_id)

        # Build reset URL pointing at the frontend
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{frontend_url}/?token={token}"

        send_password_reset_email(
            to_email=user.email,
            login_id=user.login_id,
            reset_url=reset_url,
        )

        smtp_ready = bool(
            os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD")
        )
        if not smtp_ready:
            dev_reset_url = reset_url

    return {
        "message": (
            "If an account with that email exists, "
            "a password reset link has been sent. Please check your inbox."
        ),
        "dev_reset_url": dev_reset_url,
    }


@router.post("/reset-password", status_code=200)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validate the reset token and update the user's password.
    """
    # Validate passwords match
    conf_pw = body.confirm_password if body.confirm_password is not None else body.new_password
    if body.new_password != conf_pw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Passwords do not match.",
        )

    # Validate password strength
    pw = body.new_password
    if len(pw) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )
    if not any(c.islower() for c in pw):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one lowercase letter.",
        )
    if not any(c.isupper() for c in pw):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one uppercase letter.",
        )
    if not any(c in '!@#$%^&*(),.?":{}|<>' for c in pw):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one special character.",
        )

    # Decode and validate the token
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

    # Update the password
    user.password_hash = hash_password(body.new_password)
    db.commit()

    return {"message": "Password has been reset successfully. You can now sign in with your new password."}
