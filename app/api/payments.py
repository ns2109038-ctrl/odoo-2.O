from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate,
    PaymentUpdate,
    PaymentResponse,
    PaymentListResponse,
)
from app.services.payment_service import (
    create_payment,
    get_payment,
    get_payments,
    update_payment,
    post_payment,
    cancel_payment,
)
from app.core.security import require_authenticated_user, require_accountant

router = APIRouter(prefix="/payments", tags=["Payments"])

_VALID_TYPES = ("customer_receipt", "vendor_payment")
_VALID_STATUSES = ("draft", "posted", "cancelled")


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Create a new draft customer receipt or vendor payment."""
    try:
        return create_payment(db, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=PaymentListResponse)
@router.get("/", response_model=PaymentListResponse, include_in_schema=False)
def read_all(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max records to return"),
    payment_type: Optional[str] = Query(None, description="Filter by type: customer_receipt, vendor_payment"),
    payment_status: Optional[str] = Query(None, alias="status", description="Filter by status: draft, posted, cancelled"),
    contact_id: Optional[int] = Query(None, description="Filter by contact ID"),
    search: Optional[str] = Query(None, description="Search by payment number, reference, or contact name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """List payments with optional filtering, search, and pagination."""
    if payment_type and payment_type.lower() not in _VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payment_type. Must be one of: {', '.join(_VALID_TYPES)}",
        )
    if payment_status and payment_status.lower() not in _VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(_VALID_STATUSES)}",
        )

    payments, total = get_payments(
        db,
        payment_type=payment_type,
        status=payment_status,
        contact_id=contact_id,
        search=search,
        skip=skip,
        limit=limit,
    )
    return PaymentListResponse(data=payments, total=total, skip=skip, limit=limit)


@router.get("/{payment_id}", response_model=PaymentResponse)
def read_one(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Retrieve a single payment by ID."""
    payment = get_payment(db, payment_id)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with id {payment_id} not found.",
        )
    return payment


@router.put("/{payment_id}", response_model=PaymentResponse)
def update(
    payment_id: int,
    data: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Update a draft payment (contact, journal, amount, date, reference)."""
    try:
        return update_payment(db, payment_id, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{payment_id}/post", response_model=PaymentResponse)
def post(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Post a draft payment and generate balanced double-entry accounting records."""
    try:
        return post_payment(db, payment_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{payment_id}/cancel", response_model=PaymentResponse)
def cancel(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Cancel a payment and generate reversal accounting entries if posted."""
    try:
        return cancel_payment(db, payment_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
