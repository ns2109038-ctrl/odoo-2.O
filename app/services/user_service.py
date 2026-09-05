import uuid
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()


def get_user(db: Session, user_id: uuid.UUID):
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_user_by_login_id(db: Session, login_id: str):
    return db.query(User).filter(User.login_id == login_id).first()


def create_user(db: Session, user_in: UserCreate):
    db_user = User(
        name=user_in.name,
        login_id=user_in.login_id,
        email=user_in.email,
        password_hash=user_in.password,
        role=user_in.role,
        is_active=user_in.is_active,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
