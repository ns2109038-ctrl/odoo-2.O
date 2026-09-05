from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    journal_id = Column(Integer, ForeignKey("journals.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    reference = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    journal = relationship("Journal")
    items = relationship("JournalItem", back_populates="journal_entry", cascade="all, delete-orphan", lazy="joined")


class JournalItem(Base):
    __tablename__ = "journal_items"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    debit = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    credit = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))

    journal_entry = relationship("JournalEntry", back_populates="items")
    account = relationship("Account", lazy="joined")
