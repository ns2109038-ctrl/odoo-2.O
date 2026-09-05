from typing import Optional, List, Any
from datetime import date as PyDate, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator


# ── Nested summary models ────────────────────────────────────────────────────

class VendorSummary(BaseModel):
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


# ── Purchase Order Line schemas ───────────────────────────────────────────────

class PurchaseOrderLineCreate(BaseModel):
    product_id: int = Field(..., ge=1, description="Product ID")
    quantity: Decimal = Field(..., gt=0, description="Quantity (must be > 0)")
    unit_price: Decimal = Field(default=Decimal("0.00"), ge=0, description="Unit purchase price")
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0, le=100, description="Tax rate (%)")

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
    def validate_amounts(self):
        if self.quantity <= 0:
            raise ValueError("Quantity must be greater than 0")
        if self.unit_price < 0:
            raise ValueError("Unit price must be >= 0")
        if self.tax_rate < 0 or self.tax_rate > 100:
            raise ValueError("Tax rate must be between 0 and 100")
        return self


class PurchaseOrderLineResponse(BaseModel):
    id: int
    purchase_order_id: int
    product_id: int
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    line_total: Decimal
    product: Optional[ProductSummary] = None

    model_config = ConfigDict(from_attributes=True)


# ── Purchase Order schemas ────────────────────────────────────────────────────

class PurchaseOrderCreate(BaseModel):
    vendor_id: int = Field(..., ge=1, description="Contact ID of the vendor")
    order_date: Optional[PyDate] = Field(None, description="Order date (defaults to today)")
    lines: List[PurchaseOrderLineCreate] = Field(..., min_length=1, description="Order lines (at least 1 required)")

    @model_validator(mode="after")
    def validate_order(self):
        if not self.lines:
            raise ValueError("At least one order line is required")
        return self


class PurchaseOrderUpdate(BaseModel):
    vendor_id: Optional[int] = Field(None, ge=1)
    order_date: Optional[PyDate] = None
    lines: Optional[List[PurchaseOrderLineCreate]] = None

    @model_validator(mode="after")
    def validate_update(self):
        if self.lines is not None and len(self.lines) == 0:
            raise ValueError("At least one order line is required when updating lines")
        return self


class PurchaseOrderResponse(BaseModel):
    id: int
    order_number: str
    vendor_id: int
    order_date: PyDate
    status: str
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    vendor: Optional[VendorSummary] = None
    lines: List[PurchaseOrderLineResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PurchaseOrderListResponse(BaseModel):
    data: List[PurchaseOrderResponse]
    total: int
    skip: int
    limit: int
