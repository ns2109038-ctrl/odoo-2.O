from sqlalchemy import Column, Integer, String, Numeric
from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # Goods, Service, Combo
    sales_price = Column(Numeric(12, 2), nullable=False, default=0.00)
    purchase_price = Column(Numeric(12, 2), nullable=False, default=0.00)
    category = Column(String(100), nullable=True, index=True)
