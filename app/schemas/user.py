import re
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password cannot exceed 72 bytes")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", password) and not re.search(r"[^a-zA-Z0-9\s]", password):
        raise ValueError("Password must contain at least one special character")


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Full Name of User")
    login_id: str = Field(..., min_length=3, max_length=50, description="Unique Login ID")
    email: EmailStr = Field(..., description="User Email Address")
    password: str = Field(..., description="Password (at least 8 characters, uppercase, lowercase, special char)")
    confirm_password: str = Field(..., description="Password Confirmation")
    role: Literal["admin", "accountant", "user", "contact"] = Field(
        default="user",
        description="User Role (admin, accountant, user)"
    )

    @model_validator(mode="after")
    def validate_user_create(self):
        validate_password_strength(self.password)
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    login_id: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "accountant", "user", "contact"]] = None
    password: Optional[str] = None
    confirm_password: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def validate_user_update(self):
        if self.password is not None:
            validate_password_strength(self.password)
            if self.password != self.confirm_password:
                raise ValueError("Passwords do not match")
        return self


class UserStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Active status flag of the user")


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


class PasswordResetRequest(BaseModel):
    identifier: Optional[str] = Field(None, description="User Login ID or Email")
    email: Optional[str] = Field(None, description="User Email")
    login_id: Optional[str] = Field(None, description="User Login ID")

    def get_identifier(self) -> str:
        ident = self.identifier or self.email or self.login_id or ""
        return ident.strip()


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., min_length=1, description="Password reset token")
    new_password: str = Field(..., description="New password")
    confirm_password: Optional[str] = Field(None, description="Confirm new password")

    @model_validator(mode="after")
    def validate_passwords(self):
        validate_password_strength(self.new_password)
        if self.confirm_password is not None and self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginHistoryResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    login_id: str
    name: str
    role: str
    timestamp: str
    ip: str
    status: str
    method: str

    model_config = ConfigDict(from_attributes=True)


class ActiveSessionResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    login_id: str
    name: str
    role: str
    login_time: str
    status: str
    ip: str

    model_config = ConfigDict(from_attributes=True)