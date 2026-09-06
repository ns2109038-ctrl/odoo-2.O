from sqlalchemy import Column, Integer, String
from app.db.database import Base


class ActiveSession(Base):
    __tablename__ = "active_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    login_id = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    login_time = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="Online")
    ip = Column(String(50), nullable=False, default="127.0.0.1")
