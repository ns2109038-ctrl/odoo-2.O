from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
)
from app.services.invoice_service import (
    create_invoice,
    get_invoice,
    get_invoices,
    update_invoice,
    post_invoice,
    cancel_invoice,
)
from app.core.security import require_authenticated_user, require_accountant

router = APIRouter(prefix="/invoices", tags=["Invoices & Bills"])

_VALID_TYPES = ("customer_invoice", "vendor_bill")
_VALID_STATUSES = ("draft", "posted", "paid", "cancelled")


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Create a new draft customer invoice or vendor bill."""
    try:
        return create_invoice(db, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=InvoiceListResponse)
@router.get("/", response_model=InvoiceListResponse, include_in_schema=False)
def read_all(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max records to return"),
    invoice_type: Optional[str] = Query(None, description="Filter by type: customer_invoice, vendor_bill"),
    invoice_status: Optional[str] = Query(None, alias="status", description="Filter by status: draft, posted, paid, cancelled"),
    contact_id: Optional[int] = Query(None, description="Filter by contact ID"),
    search: Optional[str] = Query(None, description="Search by invoice number or contact name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """List invoices & bills with filtering, search, and pagination."""
    if invoice_type and invoice_type.lower() not in _VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid invoice_type. Must be one of: {', '.join(_VALID_TYPES)}",
        )
    if invoice_status and invoice_status.lower() not in _VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(_VALID_STATUSES)}",
        )

    invoices, total = get_invoices(
        db,
        invoice_type=invoice_type,
        status=invoice_status,
        contact_id=contact_id,
        search=search,
        skip=skip,
        limit=limit,
    )
    return InvoiceListResponse(data=invoices, total=total, skip=skip, limit=limit)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def read_one(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """Retrieve a single invoice or bill by ID."""
    invoice = get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with id {invoice_id} not found.",
        )
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Update a draft invoice (contact, dates, lines)."""
    try:
        return update_invoice(db, invoice_id, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{invoice_id}/post", response_model=InvoiceResponse)
def post(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Post a draft invoice and generate balanced double-entry accounting records."""
    try:
        return post_invoice(db, invoice_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    """Cancel an invoice and generate reversal accounting entries if posted."""
    try:
        return cancel_invoice(db, invoice_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
