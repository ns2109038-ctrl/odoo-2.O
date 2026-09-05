from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(100), unique=True, nullable=False, index=True)
    payment_type = Column(String(50), nullable=False, index=True)  # customer_receipt, vendor_payment
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    payment_date = Column(Date, nullable=False, default=date.today, index=True)
    amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    journal_id = Column(Integer, ForeignKey("journals.id"), nullable=False, index=True)
    reference = Column(String(100), nullable=True, index=True)
    status = Column(String(20), nullable=False, default="draft", index=True)  # draft, posted, cancelled
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    contact = relationship("Contact", lazy="joined")
    journal = relationship("Journal", lazy="joined")
    journal_entry = relationship("JournalEntry", foreign_keys=[journal_entry_id], lazy="joined")
    user = relationship("User", foreign_keys=[created_by])
