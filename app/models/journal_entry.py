from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship, synonym
from sqlalchemy.sql import func
from app.db.database import Base


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    journal_id = Column(Integer, ForeignKey("journals.id"), nullable=False, index=True)
    reference = Column(String(100), nullable=True, index=True)
    entry_date = Column(Date, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)  # legacy compatibility
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="draft", index=True)  # draft, posted, cancelled
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    journal = relationship("Journal")
    user = relationship("User", foreign_keys=[created_by])
    lines = relationship("JournalEntryLine", back_populates="journal_entry", cascade="all, delete-orphan", lazy="joined")
    items = synonym("lines")

    def __init__(self, **kwargs):
        if "date" in kwargs and "entry_date" not in kwargs:
            kwargs["entry_date"] = kwargs["date"]
        elif "entry_date" in kwargs and "date" not in kwargs:
            kwargs["date"] = kwargs["entry_date"]
        super().__init__(**kwargs)


class JournalEntryLine(Base):
    __tablename__ = "journal_items"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    analytic_account_id = Column(Integer, ForeignKey("analytic_accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    description = Column(Text, nullable=True)
    debit = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    credit = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))

    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", lazy="joined")
    analytic_account = relationship("AnalyticAccount", lazy="joined")


# Backwards compatibility alias
JournalItem = JournalEntryLine

