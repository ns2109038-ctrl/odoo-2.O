from typing import Optional
from pydantic import BaseModel, ConfigDict


class ContactBase(BaseModel):
    name: str
    type: str  # Customer, Vendor, Both
    email: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    profile_image: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    profile_image: Optional[str] = None


class ContactResponse(ContactBase):
    id: int

    model_config = ConfigDict(from_attributes=True)