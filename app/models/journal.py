from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Journal(Base):
    __tablename__ = "journals"

    id = Column(Integer, primary_key=True, index=True)
    journal_name = Column(String(100), unique=True, nullable=False, index=True)
    journal_type = Column(String(20), nullable=False, index=True)  # Sales, Purchase, Bank, Cash
    default_debit_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    default_credit_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    default_debit_account = relationship("Account", foreign_keys=[default_debit_account_id])
    default_credit_account = relationship("Account", foreign_keys=[default_credit_account_id])
