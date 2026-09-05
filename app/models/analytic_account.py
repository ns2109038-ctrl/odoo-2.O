from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class AnalyticAccount(Base):
    __tablename__ = "analytic_accounts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
