from sqlalchemy import Column, Integer, String
from app.db.database import Base


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    login_id = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    timestamp = Column(String(50), nullable=False)
    ip = Column(String(50), nullable=False, default="127.0.0.1")
    status = Column(String(50), nullable=False, default="Success")
    method = Column(String(100), nullable=False, default="Password")
