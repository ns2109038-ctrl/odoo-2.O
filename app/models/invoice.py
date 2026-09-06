from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), unique=True, nullable=False, index=True)
    invoice_type = Column(String(50), nullable=False, index=True)  # customer_invoice, vendor_bill
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    invoice_date = Column(Date, nullable=False, default=date.today, index=True)
    due_date = Column(Date, nullable=True, index=True)
    status = Column(String(20), nullable=False, default="draft", index=True)  # draft, posted, paid, cancelled
    subtotal = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    tax = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    total = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    contact = relationship("Contact", lazy="joined")
    journal_entry = relationship("JournalEntry", foreign_keys=[journal_entry_id], lazy="selectin")
    user = relationship("User", foreign_keys=[created_by])
    lines = relationship(
        "InvoiceLine",
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    description = Column(String(255), nullable=True)
    quantity = Column(Numeric(12, 2), nullable=False, default=Decimal("1.00"))
    unit_price = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    tax_rate = Column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))
    line_total = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product", lazy="joined")
    account = relationship("Account", lazy="joined")
