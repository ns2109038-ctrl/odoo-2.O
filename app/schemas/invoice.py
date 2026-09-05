from typing import Optional, List, Any
from datetime import date as PyDate, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator


# ── Nested summary models ────────────────────────────────────────────────────

class ContactSummary(BaseModel):
    id: int
    name: str
    contact_type: Optional[str] = None
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProductSummary(BaseModel):
    id: int
    name: str
    sku: str
    unit: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AccountSummary(BaseModel):
    id: int
    code: str
    name: str
    account_type: str

    model_config = ConfigDict(from_attributes=True)


class JournalEntrySummary(BaseModel):
    id: int
    reference: Optional[str] = None
    entry_date: PyDate
    status: str

    model_config = ConfigDict(from_attributes=True)


# ── Invoice Line schemas ─────────────────────────────────────────────────────

class InvoiceLineCreate(BaseModel):
    product_id: Optional[int] = Field(None, ge=1, description="Product ID (optional if custom description)")
    description: Optional[str] = Field(None, max_length=255, description="Line description")
    quantity: Decimal = Field(default=Decimal("1.00"), gt=0, description="Quantity (must be > 0)")
    unit_price: Decimal = Field(default=Decimal("0.00"), ge=0, description="Unit price")
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0, le=100, description="Tax rate (%)")
    account_id: Optional[int] = Field(None, ge=1, description="Optional custom account override")

    @field_validator("quantity", "unit_price", "tax_rate", mode="before")
    @classmethod
    def to_decimal(cls, v: Any) -> Decimal:
        if v is None:
            return Decimal("0.00")
        try:
            return Decimal(str(v))
        except Exception:
            raise ValueError("Must be a valid numeric value")

    @model_validator(mode="after")
    def validate_line(self):
        if self.quantity <= 0:
            raise ValueError("Quantity must be greater than 0")
        if self.unit_price < 0:
            raise ValueError("Unit price must be >= 0")
        if self.tax_rate < 0 or self.tax_rate > 100:
            raise ValueError("Tax rate must be between 0 and 100")
        if not self.product_id and not (self.description and self.description.strip()):
            raise ValueError("Either product_id or description is required for each invoice line")
        return self


class InvoiceLineResponse(BaseModel):
    id: int
    invoice_id: int
    product_id: Optional[int] = None
    description: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    line_total: Decimal
    account_id: Optional[int] = None
    product: Optional[ProductSummary] = None
    account: Optional[AccountSummary] = None

    model_config = ConfigDict(from_attributes=True)


# ── Invoice schemas ──────────────────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    invoice_type: str = Field(..., description="'customer_invoice' or 'vendor_bill'")
    contact_id: int = Field(..., ge=1, description="Customer or Vendor contact ID")
    invoice_number: Optional[str] = Field(None, max_length=100, description="Optional custom invoice number")
    invoice_date: Optional[PyDate] = Field(None, description="Invoice date (defaults to today)")
    due_date: Optional[PyDate] = Field(None, description="Payment due date")
    lines: List[InvoiceLineCreate] = Field(..., min_length=1, description="Invoice lines (at least 1 required)")

    @field_validator("invoice_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        clean = (v or "").strip().lower()
        if clean not in ("customer_invoice", "vendor_bill"):
            raise ValueError("invoice_type must be either 'customer_invoice' or 'vendor_bill'")
        return clean

    @model_validator(mode="after")
    def validate_invoice(self):
        if not self.lines:
            raise ValueError("At least one invoice line is required")
        return self


class InvoiceUpdate(BaseModel):
    contact_id: Optional[int] = Field(None, ge=1)
    invoice_date: Optional[PyDate] = None
    due_date: Optional[PyDate] = None
    lines: Optional[List[InvoiceLineCreate]] = None

    @model_validator(mode="after")
    def validate_update(self):
        if self.lines is not None and len(self.lines) == 0:
            raise ValueError("At least one line is required when updating invoice lines")
        return self


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    invoice_type: str
    contact_id: int
    invoice_date: PyDate
    due_date: Optional[PyDate] = None
    status: str
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    journal_entry_id: Optional[int] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    contact: Optional[ContactSummary] = None
    journal_entry: Optional[JournalEntrySummary] = None
    lines: List[InvoiceLineResponse] = []

    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(BaseModel):
    data: List[InvoiceResponse]
    total: int
    skip: int
    limit: int
