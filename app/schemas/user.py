from pydantic import BaseModel, EmailStr, Field
from typing import Literal


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)

    login_id: str = Field(min_length=6, max_length=12)

    email: EmailStr

    role: Literal["admin", "accountant", "contact"]

    password: str = Field(min_length=8)

    confirm_password: str


class UserResponse(BaseModel):
    id: int
    name: str
    login_id: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    login_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str