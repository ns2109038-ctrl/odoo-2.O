from typing import Optional, Literal
from decimal import Decimal
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Product Name")
    type: Literal["Goods", "Service", "Combo"] = Field(..., description="Product Type")
    sales_price: Decimal = Field(default=Decimal("0.00"), ge=0, description="Sales Price")
    purchase_price: Decimal = Field(default=Decimal("0.00"), ge=0, description="Purchase Price")
    category: Optional[str] = Field(None, max_length=100, description="Product Category")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    type: Optional[Literal["Goods", "Service", "Combo"]] = None
    sales_price: Optional[Decimal] = Field(None, ge=0)
    purchase_price: Optional[Decimal] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)


class ProductResponse(ProductBase):
    id: int

    class Config:
        from_attributes = True
