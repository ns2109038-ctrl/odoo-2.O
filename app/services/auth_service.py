from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models.user import User
from app.core.security import verify_password


def authenticate_user_credentials(
    db: Session,
    identifier: str,
    password: str,
) -> Tuple[Optional[User], Optional[str]]:
    """
    Looks up a user by login_id or email (case-insensitive) and validates password.
    Returns:
        (user, error_reason)
        - If authentication succeeds: (user, None)
        - If user not found or password incorrect: (None, "Invalid credentials")
        - If user exists but is inactive: (user, "User account is inactive")
    """
    clean_id = identifier.strip().lower()

    user = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.login_id) == clean_id,
                func.lower(User.email) == clean_id,
            )
        )
        .first()
    )

    if not user:
        return None, "Invalid Login ID/Email or Password"

    if not verify_password(password, user.password_hash):
        return None, "Invalid Login ID/Email or Password"

    if not user.is_active:
        return user, "User account is inactive"

    return user, None
