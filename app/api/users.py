import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import (
    create_user,
    get_users,
    get_user,
    get_user_by_email,
    get_user_by_login_id,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_login_id(db, user_in.login_id):
        raise HTTPException(status_code=400, detail="Login ID already registered")
    return create_user(db, user_in)


@router.get("/", response_model=list[UserResponse])
def read_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserResponse)
def read_one(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
