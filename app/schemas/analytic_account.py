from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class AnalyticAccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Analytic account name")
    code: str = Field(..., min_length=1, max_length=50, description="Unique analytic account code")
    description: Optional[str] = Field(None, description="Optional description")
    is_active: bool = Field(True, description="Account active status")

    @field_validator("name", "code")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty or whitespace only.")
        return v.strip()


class AnalyticAccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("name", "code")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError("Field cannot be empty or whitespace only.")
            return v.strip()
        return v


class AnalyticAccountStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Target active status")


class AnalyticAccountResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnalyticAccountListResponse(BaseModel):
    data: List[AnalyticAccountResponse]
    total: int
    skip: int
    limit: int
