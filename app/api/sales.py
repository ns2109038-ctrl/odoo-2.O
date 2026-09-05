from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.sales_order import (
    SalesOrderCreate,
    SalesOrderUpdate,
    SalesOrderResponse,
    SalesOrderListResponse,
)
from app.services.sales_order_service import (
    create_sales_order,
    get_sales_order,
    get_sales_orders,
    update_sales_order,
    confirm_sales_order,
    cancel_sales_order,
)
from app.core.security import require_authenticated_user, require_accountant

router = APIRouter(prefix="/sales", tags=["Sales Orders"])


@router.post("", response_model=SalesOrderResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SalesOrderResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    data: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Create a new draft sales order."""
    try:
        return create_sales_order(db, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=SalesOrderListResponse)
@router.get("/", response_model=SalesOrderListResponse, include_in_schema=False)
def read_all(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max records to return"),
    search: Optional[str] = Query(None, description="Search by order number"),
    order_status: Optional[str] = Query(None, alias="status", description="Filter by status: draft, confirmed, cancelled"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """List sales orders with optional search, status, and customer filters."""
    if order_status and order_status.lower() not in ("draft", "confirmed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be one of: draft, confirmed, cancelled",
        )
    orders, total = get_sales_orders(
        db,
        skip=skip,
        limit=limit,
        search=search,
        status=order_status,
        customer_id=customer_id,
    )
    return SalesOrderListResponse(data=orders, total=total, skip=skip, limit=limit)


@router.get("/{order_id}", response_model=SalesOrderResponse)
def read_one(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Retrieve a single sales order by ID."""
    order = get_sales_order(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sales order with id {order_id} not found.",
        )
    return order


@router.put("/{order_id}", response_model=SalesOrderResponse)
def update(
    order_id: int,
    data: SalesOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Update a draft sales order (customer, date, lines)."""
    try:
        return update_sales_order(db, order_id, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{order_id}/confirm", response_model=SalesOrderResponse)
def confirm(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Confirm a draft sales order."""
    try:
        return confirm_sales_order(db, order_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{order_id}/cancel", response_model=SalesOrderResponse)
def cancel(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Cancel a draft or confirmed sales order."""
    try:
        return cancel_sales_order(db, order_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
