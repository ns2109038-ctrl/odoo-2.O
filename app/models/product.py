from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True, index=True)
    unit = Column(String(50), nullable=False, default="Unit")
    sale_price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    sales_price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))  # legacy compatibility
    purchase_price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    tax_rate = Column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))
    type = Column(String(50), nullable=True, default="Goods")  # legacy compatibility
    image_url = Column(Text, nullable=True)
    inventory_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    income_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    expense_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    inventory_account = relationship("Account", foreign_keys=[inventory_account_id])
    income_account = relationship("Account", foreign_keys=[income_account_id])
    expense_account = relationship("Account", foreign_keys=[expense_account_id])
