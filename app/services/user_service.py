from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import (
    hash_password,
    verify_password
)


def create_user(
    db: Session,
    user_data: UserCreate
):

    # Check password
    if user_data.password != user_data.confirm_password:
        raise ValueError(
            "Passwords do not match"
        )

    # Check Login ID
    existing_login = (
        db.query(User)
        .filter(
            User.login_id == user_data.login_id
        )
        .first()
    )

    if existing_login:
        raise ValueError(
            "Login ID already exists"
        )

    # Check Email
    existing_email = (
        db.query(User)
        .filter(
            User.email == user_data.email
        )
        .first()
    )

    if existing_email:
        raise ValueError(
            "Email already exists"
        )

    # Create user
    new_user = User(
        name=user_data.name,
        login_id=user_data.login_id,
        email=user_data.email,
        password_hash=hash_password(
            user_data.password
        ),
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def authenticate_user(
    db: Session,
    login_id: str,
    password: str
):

    user = (
        db.query(User)
        .filter(
            User.login_id == login_id
        )
        .first()
    )

    if not user:
        return None

    if not user.is_active:
        return None

    if not verify_password(
        password,
        user.password_hash
    ):
        return None

    return user


def get_users(db: Session):

    return (
        db.query(User)
        .order_by(User.id.desc())
        .all()
    )