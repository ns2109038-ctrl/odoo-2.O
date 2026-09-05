from typing import Optional, List, Any
from datetime import date as PyDate, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator


# ── Nested summaries ─────────────────────────────────────────────────────────

class ContactSummary(BaseModel):
    id: int
    name: str
    contact_type: Optional[str] = None
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class JournalSummary(BaseModel):
    id: int
    journal_name: str
    journal_type: str

    model_config = ConfigDict(from_attributes=True)


class JournalEntrySummary(BaseModel):
    id: int
    reference: Optional[str] = None
    entry_date: PyDate
    status: str

    model_config = ConfigDict(from_attributes=True)


# ── Payment Schemas ──────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    payment_type: str = Field(..., description="'customer_receipt' or 'vendor_payment'")
    contact_id: int = Field(..., ge=1, description="Contact ID (customer or vendor)")
    journal_id: int = Field(..., ge=1, description="Bank / Cash Journal ID")
    amount: Decimal = Field(..., gt=0, description="Payment amount (must be > 0)")
    payment_number: Optional[str] = Field(None, max_length=100, description="Optional custom payment number")
    payment_date: Optional[PyDate] = Field(None, description="Payment date (defaults to today)")
    reference: Optional[str] = Field(None, max_length=100, description="Reference, check or transaction number")

    @field_validator("payment_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        clean = (v or "").strip().lower()
        if clean not in ("customer_receipt", "vendor_payment"):
            raise ValueError("payment_type must be either 'customer_receipt' or 'vendor_payment'")
        return clean

    @field_validator("amount", mode="before")
    @classmethod
    def to_decimal(cls, v: Any) -> Decimal:
        if v is None:
            return Decimal("0.00")
        try:
            return Decimal(str(v))
        except Exception:
            raise ValueError("Amount must be a valid numeric value")

    @model_validator(mode="after")
    def validate_amount(self):
        if self.amount <= Decimal("0.00"):
            raise ValueError("Amount must be greater than 0")
        return self


class PaymentUpdate(BaseModel):
    contact_id: Optional[int] = Field(None, ge=1)
    journal_id: Optional[int] = Field(None, ge=1)
    amount: Optional[Decimal] = Field(None, gt=0)
    payment_date: Optional[PyDate] = None
    reference: Optional[str] = Field(None, max_length=100)

    @field_validator("amount", mode="before")
    @classmethod
    def to_decimal(cls, v: Any) -> Optional[Decimal]:
        if v is None:
            return None
        try:
            return Decimal(str(v))
        except Exception:
            raise ValueError("Amount must be a valid numeric value")

    @model_validator(mode="after")
    def validate_update(self):
        if self.amount is not None and self.amount <= Decimal("0.00"):
            raise ValueError("Amount must be greater than 0")
        return self


class PaymentResponse(BaseModel):
    id: int
    payment_number: str
    payment_type: str
    contact_id: int
    journal_id: int
    payment_date: PyDate
    amount: Decimal
    reference: Optional[str] = None
    status: str
    journal_entry_id: Optional[int] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    contact: Optional[ContactSummary] = None
    journal: Optional[JournalSummary] = None
    journal_entry: Optional[JournalEntrySummary] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentListResponse(BaseModel):
    data: List[PaymentResponse]
    total: int
    skip: int
    limit: int
