from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderListResponse,
)
from app.services.purchase_order_service import (
    create_purchase_order,
    get_purchase_order,
    get_purchase_orders,
    update_purchase_order,
    confirm_purchase_order,
    cancel_purchase_order,
)
from app.core.security import require_authenticated_user, require_accountant

router = APIRouter(prefix="/purchases", tags=["Purchase Orders"])

_VALID_STATUSES = ("draft", "confirmed", "cancelled")


@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Create a new draft purchase order."""
    try:
        return create_purchase_order(db, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=PurchaseOrderListResponse)
@router.get("/", response_model=PurchaseOrderListResponse, include_in_schema=False)
def read_all(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max records to return"),
    search: Optional[str] = Query(None, description="Search by order number"),
    order_status: Optional[str] = Query(None, alias="status", description="Filter by status: draft, confirmed, cancelled"),
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """List purchase orders with optional search, status, and vendor filters."""
    if order_status and order_status.lower() not in _VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(_VALID_STATUSES)}",
        )
    orders, total = get_purchase_orders(
        db,
        skip=skip,
        limit=limit,
        search=search,
        status=order_status,
        vendor_id=vendor_id,
    )
    return PurchaseOrderListResponse(data=orders, total=total, skip=skip, limit=limit)


@router.get("/{order_id}", response_model=PurchaseOrderResponse)
def read_one(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Retrieve a single purchase order by ID."""
    order = get_purchase_order(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Purchase order with id {order_id} not found.",
        )
    return order


@router.put("/{order_id}", response_model=PurchaseOrderResponse)
def update(
    order_id: int,
    data: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Update a draft purchase order (vendor, date, lines)."""
    try:
        return update_purchase_order(db, order_id, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{order_id}/confirm", response_model=PurchaseOrderResponse)
def confirm(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Confirm a draft purchase order."""
    try:
        return confirm_purchase_order(db, order_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{order_id}/cancel", response_model=PurchaseOrderResponse)
def cancel(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Cancel a draft or confirmed purchase order."""
    try:
        return cancel_purchase_order(db, order_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
