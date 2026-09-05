from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.product_service import (
    create_product,
    get_products,
    get_product,
    update_product,
    delete_product,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create(product: ProductCreate, db: Session = Depends(get_db)):
    return create_product(db, product)


@router.get("/", response_model=list[ProductResponse])
def read_all(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return get_products(db, skip=skip, limit=limit, category=category, product_type=type)


@router.get("/{product_id}", response_model=ProductResponse)
def read_one(product_id: int, db: Session = Depends(get_db)):
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = update_product(db, product_id, product_data)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(product_id: int, db: Session = Depends(get_db)):
    deleted = delete_product(db, product_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    return None
