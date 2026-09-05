from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Product Name")
    sku: str = Field(..., min_length=1, max_length=100, description="Unique Stock Keeping Unit (SKU)")
    description: Optional[str] = Field(None, description="Product description")
    category: Optional[str] = Field(None, max_length=100, description="Category (e.g. Chairs, Tables, Sofas)")
    unit: str = Field(default="Unit", max_length=50, description="Unit of measure (e.g. Unit, Piece, Set)")
    sale_price: Decimal = Field(default=Decimal("0.00"), ge=0, description="Sale price (must be >= 0)")
    purchase_price: Decimal = Field(default=Decimal("0.00"), ge=0, description="Purchase price (must be >= 0)")
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0, description="Tax rate percentage (must be >= 0)")
    inventory_account_id: Optional[int] = Field(None, description="Inventory Account ID referencing Chart of Accounts")
    income_account_id: Optional[int] = Field(None, description="Income Account ID referencing Chart of Accounts")
    expense_account_id: Optional[int] = Field(None, description="Expense Account ID referencing Chart of Accounts")
    is_active: bool = Field(default=True, description="Active status")

    @field_validator("sku", mode="before")
    @classmethod
    def clean_sku(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("SKU cannot be empty")
        return v.strip().upper()


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    unit: Optional[str] = Field(None, max_length=50)
    sale_price: Optional[Decimal] = Field(None, ge=0)
    purchase_price: Optional[Decimal] = Field(None, ge=0)
    tax_rate: Optional[Decimal] = Field(None, ge=0)
    inventory_account_id: Optional[int] = None
    income_account_id: Optional[int] = None
    expense_account_id: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("sku", mode="before")
    @classmethod
    def clean_update_sku(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.strip():
            raise ValueError("SKU cannot be empty")
        return v.strip().upper()


class ProductStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Active status of the product")


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str
    sale_price: Decimal
    purchase_price: Decimal
    tax_rate: Decimal
    inventory_account_id: Optional[int] = None
    income_account_id: Optional[int] = None
    expense_account_id: Optional[int] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
