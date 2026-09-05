from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

AllowedAccountType = Literal["Asset", "Liability", "Expense", "Income", "Capital"]


class AccountBase(BaseModel):
    account_name: str = Field(..., min_length=2, max_length=150, description="Account name (2-150 characters)")
    account_type: AllowedAccountType = Field(..., description="Account type must be Asset, Liability, Expense, Income, or Capital")
    description: Optional[str] = Field(None, description="Optional description of the account")
    is_active: bool = Field(default=True, description="Active status of the account")


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    account_name: Optional[str] = Field(None, min_length=2, max_length=150)
    account_type: Optional[AllowedAccountType] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AccountResponse(BaseModel):
    id: int
    account_name: str
    account_type: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
