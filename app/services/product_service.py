from typing import Optional
from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


def create_product(db: Session, product_data: ProductCreate) -> Product:
    new_product = Product(**product_data.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


def get_products(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    product_type: Optional[str] = None,
) -> list[Product]:
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    if product_type:
        query = query.filter(Product.type == product_type)
    return query.order_by(Product.id.desc()).offset(skip).limit(limit).all()


def get_product(db: Session, product_id: int) -> Optional[Product]:
    return db.query(Product).filter(Product.id == product_id).first()


def update_product(
    db: Session, product_id: int, product_data: ProductUpdate
) -> Optional[Product]:
    product = get_product(db, product_id)
    if not product:
        return None

    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> bool:
    product = get_product(db, product_id)
    if not product:
        return False

    db.delete(product)
    db.commit()
    return True
