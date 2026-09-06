from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

AllowedContactType = Literal["customer", "vendor", "other", "Customer", "Vendor", "Other", "Both", "both"]


class ContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Contact full name or company name")
    contact_type: str = Field(default="customer", description="Contact type: customer, vendor, or other")
    email: Optional[EmailStr] = Field(None, description="Contact email address")
    phone: Optional[str] = Field(None, max_length=50, description="Contact phone / mobile number")
    address: Optional[str] = Field(None, description="Billing/Shipping address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State")
    country: Optional[str] = Field(default="India", max_length=100, description="Country")
    pincode: Optional[str] = Field(None, max_length=20, description="PIN / Postal Code")
    profile_image: Optional[str] = Field(None, description="Profile / Avatar image (URL or base64)")
    tax_id: Optional[str] = Field(None, max_length=50, description="Tax ID / GSTIN / VAT number")
    is_active: bool = Field(default=True, description="Active status")

    @field_validator("contact_type", mode="before")
    @classmethod
    def validate_and_normalize_contact_type(cls, v: str) -> str:
        if not v:
            return "customer"
        v_clean = v.strip().lower()
        if v_clean in ["customer", "vendor", "other"]:
            return v_clean
        if v_clean == "both":
            return "customer"  # normalize 'both' to customer
        raise ValueError("contact_type must be 'customer', 'vendor', or 'other'")


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    contact_type: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=20)
    profile_image: Optional[str] = None
    tax_id: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

    @field_validator("contact_type", mode="before")
    @classmethod
    def validate_update_contact_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.strip().lower()
        if v_clean in ["customer", "vendor", "other"]:
            return v_clean
        if v_clean == "both":
            return "customer"
        raise ValueError("contact_type must be 'customer', 'vendor', or 'other'")


class ContactStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Active status of the contact")


class ContactResponse(BaseModel):
    id: int
    name: str
    contact_type: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    profile_image: Optional[str] = None
    tax_id: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)