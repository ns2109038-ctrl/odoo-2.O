from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password


def create_user(db: Session, user_data: UserCreate) -> User:
    login_id_clean = user_data.login_id.strip()
    email_clean = str(user_data.email).strip().lower()

    # 1. Check Login ID uniqueness (case-insensitive)
    existing_login = (
        db.query(User)
        .filter(func.lower(User.login_id) == func.lower(login_id_clean))
        .first()
    )
    if existing_login:
        raise ValueError("Login ID already exists")

    # 2. Check Email uniqueness (case-insensitive)
    existing_email = (
        db.query(User)
        .filter(func.lower(User.email) == email_clean)
        .first()
    )
    if existing_email:
        raise ValueError("Email already exists")

    # 3. Create user with hashed password
    new_user = User(
        name=user_data.name.strip(),
        login_id=login_id_clean,
        email=email_clean,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    role: Optional[str] = None,
) -> List[User]:
    query = db.query(User)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if role:
        query = query.filter(func.lower(User.role) == role.lower())
    return query.order_by(User.id.asc()).offset(skip).limit(limit).all()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def update_user(
    db: Session,
    user_id: int,
    user_data: UserUpdate,
) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    update_dict = user_data.model_dump(exclude_unset=True)

    # Check login_id uniqueness if updated
    if "login_id" in update_dict and update_dict["login_id"]:
        login_id_clean = update_dict["login_id"].strip()
        existing_login = (
            db.query(User)
            .filter(
                func.lower(User.login_id) == func.lower(login_id_clean),
                User.id != user_id,
            )
            .first()
        )
        if existing_login:
            raise ValueError("Login ID already exists")
        user.login_id = login_id_clean

    # Check email uniqueness if updated
    if "email" in update_dict and update_dict["email"]:
        email_clean = str(update_dict["email"]).strip().lower()
        existing_email = (
            db.query(User)
            .filter(
                func.lower(User.email) == email_clean,
                User.id != user_id,
            )
            .first()
        )
        if existing_email:
            raise ValueError("Email already exists")
        user.email = email_clean

    if "name" in update_dict and update_dict["name"] is not None:
        user.name = update_dict["name"].strip()

    if "role" in update_dict and update_dict["role"] is not None:
        user.role = update_dict["role"]

    if "is_active" in update_dict and update_dict["is_active"] is not None:
        user.is_active = update_dict["is_active"]

    if "password" in update_dict and update_dict["password"]:
        user.password_hash = hash_password(update_dict["password"])

    db.commit()
    db.refresh(user)
    return user


def update_user_status(
    db: Session,
    user_id: int,
    is_active: bool,
) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False

    db.delete(user)
    db.commit()
    return True


def authenticate_user(
    db: Session,
    login_id: str,
    password: str,
) -> Optional[User]:
    clean_login = login_id.strip()
    user = (
        db.query(User)
        .filter(func.lower(User.login_id) == func.lower(clean_login))
        .first()
    )

    if not user:
        return None

    if not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user