from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

AllowedJournalType = Literal["Sales", "Purchase", "Bank", "Cash"]


class JournalBase(BaseModel):
    journal_name: str = Field(..., min_length=2, max_length=100, description="Journal Name (2-100 characters)")
    journal_type: AllowedJournalType = Field(..., description="Journal Type must be Sales, Purchase, Bank, or Cash")
    default_debit_account_id: int = Field(..., ge=1, description="Default debit account ID referencing Chart of Accounts")
    default_credit_account_id: int = Field(..., ge=1, description="Default credit account ID referencing Chart of Accounts")
    is_active: bool = Field(default=True, description="Active status of the journal")


class JournalCreate(JournalBase):
    pass


class JournalUpdate(BaseModel):
    journal_name: Optional[str] = Field(None, min_length=2, max_length=100)
    journal_type: Optional[AllowedJournalType] = None
    default_debit_account_id: Optional[int] = Field(None, ge=1)
    default_credit_account_id: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None


class JournalResponse(BaseModel):
    id: int
    journal_name: str
    journal_type: str
    default_debit_account_id: int
    default_credit_account_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
