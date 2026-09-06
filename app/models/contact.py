from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    contact_type = Column(String(50), nullable=False, default="customer", index=True)
    type = Column(String(50), nullable=True)  # legacy compatibility
    email = Column(String(150), unique=True, nullable=True, index=True)
    phone = Column(String(50), nullable=True, index=True)
    mobile = Column(String(50), nullable=True)  # legacy compatibility
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True, index=True)
    country = Column(String(100), nullable=True, default="India")
    tax_id = Column(String(50), nullable=True, index=True)
    pincode = Column(String(20), nullable=True)
    profile_image = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)