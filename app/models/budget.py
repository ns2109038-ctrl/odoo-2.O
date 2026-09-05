from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    analytic_account_id = Column(Integer, ForeignKey("analytic_accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="draft", index=True)  # draft, active, closed
    total_amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    analytic_account = relationship("AnalyticAccount", lazy="joined")
    user = relationship("User", foreign_keys=[created_by])
    lines = relationship("BudgetLine", back_populates="budget", cascade="all, delete-orphan", lazy="joined")


class BudgetLine(Base):
    __tablename__ = "budget_lines"

    id = Column(Integer, primary_key=True, index=True)
    budget_id = Column(Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    planned_amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    period = Column(String(50), nullable=True)

    budget = relationship("Budget", back_populates="lines")
    account = relationship("Account", lazy="joined")
