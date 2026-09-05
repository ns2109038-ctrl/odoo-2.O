from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    order_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="draft", index=True)  # draft, confirmed, cancelled
    subtotal = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    tax = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    total = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    vendor = relationship("Contact", foreign_keys=[vendor_id], lazy="joined")
    user = relationship("User", foreign_keys=[created_by], lazy="select")
    lines = relationship("PurchaseOrderLine", back_populates="purchase_order", cascade="all, delete-orphan", lazy="joined")


class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    tax_rate = Column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))
    line_total = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))

    purchase_order = relationship("PurchaseOrder", back_populates="lines")
    product = relationship("Product", foreign_keys=[product_id], lazy="joined")
