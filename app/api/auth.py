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
from app.services.email_service import (
    send_password_reset_email,
    get_smtp_settings,
    update_smtp_env,
    test_smtp_connection,
)

router = APIRouter(tags=["Authentication"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


from typing import Optional

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: Optional[str] = None


class SmtpConfigRequest(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None


class TestSmtpRequest(BaseModel):
    to_email: EmailStr
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/smtp-config")
def get_smtp_config():
    """Get current SMTP configuration status and details (without exposing password)."""
    return get_smtp_settings()


@router.post("/smtp-config")
def save_smtp_config(body: SmtpConfigRequest):
    """Save SMTP relay configuration to environment file."""
    update_smtp_env(
        smtp_host=body.smtp_host,
        smtp_port=body.smtp_port,
        smtp_user=body.smtp_user,
        smtp_password=body.smtp_password,
        smtp_from=body.smtp_from,
    )
    return {
        "success": True,
        "message": "SMTP configuration updated successfully.",
        "settings": get_smtp_settings(),
    }


@router.post("/test-smtp")
def test_smtp(body: TestSmtpRequest):
    """Test SMTP connection by sending a real email."""
    res = test_smtp_connection(
        to_email=str(body.to_email),
        smtp_host=body.smtp_host,
        smtp_port=body.smtp_port,
        smtp_user=body.smtp_user,
        smtp_password=body.smtp_password,
        smtp_from=body.smtp_from,
    )
    return res

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
    Send a password reset link to the user's email or provide secure instant link.
    """
    clean_email = str(body.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    reset_url = None
    delivered_via_smtp = False
    delivery_error = None

    if user and user.is_active:
        token = create_password_reset_token(user.id, user.email, user.login_id)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{frontend_url}/?token={token}"

        dispatch_res = send_password_reset_email(
            to_email=user.email,
            login_id=user.login_id,
            reset_url=reset_url,
        )
        delivered_via_smtp = dispatch_res.get("delivered", False)
        delivery_error = dispatch_res.get("error")

    smtp_settings = get_smtp_settings()
    is_configured = smtp_settings.get("configured", False)

    if delivered_via_smtp:
        msg = f"A password reset link has been dispatched to {clean_email} via SMTP relay. Please check your inbox and spam folder."
    elif is_configured and delivery_error:
        msg = f"SMTP relay attempted to deliver to {clean_email} but failed: {delivery_error}. You can use the instant reset link below or re-test your SMTP configuration."
    elif user and user.is_active:
        msg = "SMTP email server is currently not configured. You can use the direct reset link below to choose a new password immediately, or configure SMTP credentials."
    else:
        msg = "If an account with that email exists, a password reset link has been generated."

    return {
        "message": msg,
        "delivered_via_smtp": delivered_via_smtp,
        "smtp_configured": is_configured,
        "reset_url": reset_url,
        "email": clean_email,
        "has_account": bool(user and user.is_active),
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
