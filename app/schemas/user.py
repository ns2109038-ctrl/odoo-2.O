from typing import Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full Name of User")
    login_id: str = Field(..., min_length=6, max_length=12, description="Unique Login ID")
    email: EmailStr = Field(..., description="User Email Address")
    role: Literal["admin", "accountant", "contact"] = Field(..., description="User Role")
    password: str = Field(..., min_length=8, description="Password (at least 8 characters)")
    confirm_password: str = Field(..., description="Password Confirmation")

    @model_validator(mode="after")
    def validate_passwords(self):
        if len(self.password.encode("utf-8")) > 72:
            raise ValueError("Password cannot exceed 72 bytes")
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserResponse(BaseModel):
    id: int
    name: str
    login_id: str
    email: EmailStr
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    login_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str