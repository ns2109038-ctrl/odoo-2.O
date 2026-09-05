from sqlalchemy import Column, Integer, String, Text
from app.db.base import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # Customer, Vendor, Both
    email = Column(String(150), unique=True, nullable=True)
    mobile = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    profile_image = Column(String(255), nullable=True)