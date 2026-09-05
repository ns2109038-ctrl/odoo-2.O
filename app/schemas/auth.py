from typing import Optional
from pydantic import BaseModel, EmailStr, Field, model_validator
from app.schemas.user import UserResponse


class AuthLoginRequest(BaseModel):
    login_id: Optional[str] = Field(None, description="User Login ID")
    email: Optional[EmailStr] = Field(None, description="User Email Address")
    identifier: Optional[str] = Field(None, description="User Login ID or Email Address")
    password: str = Field(..., min_length=1, description="Password")

    @model_validator(mode="after")
    def validate_identifier_provided(self):
        if not self.login_id and not self.email and not self.identifier:
            raise ValueError("Must provide login_id, email, or identifier")
        return self

    def get_login_identifier(self) -> str:
        if self.identifier:
            return self.identifier.strip()
        if self.login_id:
            return self.login_id.strip()
        if self.email:
            return str(self.email).strip()
        return ""


class AuthLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserResponse
