from typing import Optional, List
from datetime import date as PyDate, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, model_validator


class JournalItemBase(BaseModel):
    account_id: int = Field(..., ge=1, description="Account ID from Chart of Accounts")
    debit: Decimal = Field(default=Decimal("0.00"), ge=0, description="Debit amount (>= 0)")
    credit: Decimal = Field(default=Decimal("0.00"), ge=0, description="Credit amount (>= 0)")


class JournalItemCreate(JournalItemBase):
    @model_validator(mode="after")
    def validate_item_amounts(self):
        if self.debit > 0 and self.credit > 0:
            raise ValueError("A journal item cannot have both debit and credit greater than zero.")
        if self.debit == 0 and self.credit == 0:
            raise ValueError("A journal item cannot have both debit and credit equal to zero.")
        return self


class JournalItemAccountSummary(BaseModel):
    id: int
    account_name: str
    account_type: str

    model_config = ConfigDict(from_attributes=True)


class JournalItemResponse(BaseModel):
    id: int
    journal_entry_id: int
    account_id: int
    debit: Decimal
    credit: Decimal
    account: Optional[JournalItemAccountSummary] = None

    model_config = ConfigDict(from_attributes=True)


class JournalSummary(BaseModel):
    id: int
    journal_name: str
    journal_type: str

    model_config = ConfigDict(from_attributes=True)


class JournalEntryCreate(BaseModel):
    journal_id: int = Field(..., ge=1, description="ID of the journal")
    date: PyDate = Field(..., description="Date of the accounting entry")
    reference: Optional[str] = Field(None, max_length=100, description="Optional external or invoice reference")
    description: Optional[str] = Field(None, description="Optional entry description")
    items: List[JournalItemCreate] = Field(..., min_length=2, description="At least two journal items required")


class JournalEntryResponse(BaseModel):
    id: int
    journal_id: int
    date: PyDate
    reference: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    journal: Optional[JournalSummary] = None
    items: List[JournalItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
