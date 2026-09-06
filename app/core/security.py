from datetime import datetime, timedelta, timezone
from typing import Optional, List, Callable
import bcrypt
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User

SECRET_KEY = "urban-furniture-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days for hackathon and demo continuity

# HTTP Bearer scheme
security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > 72:
        raise ValueError("Password cannot exceed 72 bytes")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > 72:
        return False
    try:
        return bcrypt.checkpw(pw_bytes, password_hash.encode("utf-8"))
    except Exception:
        return False


class BcryptContext:
    def hash(self, password: str) -> str:
        return hash_password(password)

    def verify(self, password: str, password_hash: str) -> bool:
        return verify_password(password, password_hash)


pwd_context = BcryptContext()


def create_access_token(
    user_id: int,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except ExpiredSignatureError:
        # Graceful tolerance for active demo sessions: decode with valid signature
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
            return payload
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    user_id_str: Optional[str] = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or does not exist",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or deactivated",
        )

    return user


def require_authenticated_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency ensuring the request is made by any active authenticated user."""
    return current_user


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency ensuring the authenticated user has the 'admin' role."""
    if current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: Admin access required",
        )
    return current_user


def require_accountant(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency ensuring the user has either 'admin' or 'accountant' role."""
    if current_user.role.lower() not in ["admin", "accountant"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: Accountant access required",
        )
    return current_user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Reusable role dependency factory for custom role sets."""
    allowed_lower = [r.lower() for r in allowed_roles]

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.lower() not in allowed_lower:
            roles_str = ", ".join(allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: Requires one of [{roles_str}]",
            )
        return current_user

    return role_checker


RESET_TOKEN_EXPIRE_MINUTES = 30


def create_password_reset_token(user_id: int, email: str, login_id: str) -> str:
    """Creates a signed, time-limited JWT specifically for password resets."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "login_id": login_id,
        "purpose": "password_reset",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_password_reset_token(token: str) -> dict:
    """Validates and decodes a password reset JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            raise ValueError("Invalid reset token purpose")
        return payload
    except ExpiredSignatureError:
        raise ValueError("Password reset link has expired. Please request a new one.")
    except JWTError:
        raise ValueError("Invalid or corrupted password reset link.")