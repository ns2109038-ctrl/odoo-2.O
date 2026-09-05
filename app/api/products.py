from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductStatusUpdate,
    ProductResponse,
)
from app.services.product_service import (
    create_product,
    get_products,
    get_product_by_id,
    update_product,
    update_product_status,
    delete_product,
)
from app.core.security import require_authenticated_user

router = APIRouter(tags=["Products"])


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    try:
        return create_product(db, product)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[ProductResponse])
@router.get("/", response_model=List[ProductResponse], include_in_schema=False)
def read_all(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return get_products(
        db,
        skip=skip,
        limit=limit,
        search=search,
        category=category,
        is_active=is_active,
    )


@router.get("/{product_id}", response_model=ProductResponse)
def read_one(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    product = get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found.",
        )
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    try:
        product = update_product(db, product_id, product_data)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found.",
            )
        return product
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{product_id}/status", response_model=ProductResponse)
def change_status(
    product_id: int,
    status_data: ProductStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    product = update_product_status(db, product_id, status_data.is_active)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found.",
        )
    return product


@router.delete("/{product_id}")
def delete(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    deleted = delete_product(db, product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found.",
        )
    return {"message": "Product deleted successfully", "id": product_id}
