from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator

VALID_ACCOUNT_TYPES = {"asset", "liability", "equity", "income", "expense"}


def normalize_account_type(v: str) -> str:
    if not v:
        raise ValueError("account_type is required")
    v_clean = v.strip().lower()
    if v_clean == "capital":
        return "equity"
    if v_clean not in VALID_ACCOUNT_TYPES:
        types_str = ", ".join(sorted(VALID_ACCOUNT_TYPES))
        raise ValueError(f"account_type must be one of: {types_str}")
    return v_clean


class AccountBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50, description="Unique account code (e.g. 1000, 1010)")
    name: str = Field(..., min_length=1, max_length=150, description="Account Name")
    account_type: str = Field(..., description="Account Type: asset, liability, equity, income, expense")
    parent_id: Optional[int] = Field(None, description="Parent account ID for hierarchy")
    description: Optional[str] = Field(None, description="Optional account description")
    is_active: bool = Field(default=True, description="Active status")

    @field_validator("account_type", mode="before")
    @classmethod
    def validate_type(cls, v: str) -> str:
        return normalize_account_type(v)

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Account code cannot be empty")
        return v.strip().upper()

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Account name cannot be empty")
        return v.strip()


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    account_type: Optional[str] = None
    parent_id: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("account_type", mode="before")
    @classmethod
    def validate_update_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return normalize_account_type(v)

    @field_validator("code", mode="before")
    @classmethod
    def validate_update_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.strip():
            raise ValueError("Account code cannot be empty")
        return v.strip().upper()

    @field_validator("name", mode="before")
    @classmethod
    def validate_update_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.strip():
            raise ValueError("Account name cannot be empty")
        return v.strip()


class AccountStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Active status flag of the account")


class AccountSummary(BaseModel):
    id: int
    code: str
    name: str
    account_type: str

    model_config = ConfigDict(from_attributes=True)


class AccountResponse(BaseModel):
    id: int
    code: str
    name: str
    account_type: str
    parent_id: Optional[int] = None
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    parent: Optional[AccountSummary] = None

    model_config = ConfigDict(from_attributes=True)
