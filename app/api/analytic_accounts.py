from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.analytic_account import (
    AnalyticAccountCreate,
    AnalyticAccountUpdate,
    AnalyticAccountStatusUpdate,
    AnalyticAccountResponse,
    AnalyticAccountListResponse,
)
from app.services.analytic_account_service import (
    create_analytic_account,
    get_analytic_account,
    get_analytic_accounts,
    update_analytic_account,
    toggle_analytic_account_status,
    delete_analytic_account,
)
from app.core.security import require_authenticated_user, require_roles

router = APIRouter(tags=["Analytic Accounts"])

# Only accountants and admins may mutate analytic accounts
_require_mutation = require_roles("accountant", "admin")


@router.post(
    "/analytic-accounts",
    response_model=AnalyticAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/analytic-accounts/",
    response_model=AnalyticAccountResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create(
    payload: AnalyticAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_mutation),
):
    try:
        return create_analytic_account(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/analytic-accounts", response_model=AnalyticAccountListResponse)
@router.get(
    "/analytic-accounts/",
    response_model=AnalyticAccountListResponse,
    include_in_schema=False,
)
def list_all(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    accounts, total = get_analytic_accounts(
        db, search=search, is_active=is_active, skip=skip, limit=limit
    )
    return AnalyticAccountListResponse(
        data=accounts,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/analytic-accounts/{account_id}", response_model=AnalyticAccountResponse)
def read_one(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    account = get_analytic_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analytic account with id {account_id} not found.",
        )
    return account


@router.put("/analytic-accounts/{account_id}", response_model=AnalyticAccountResponse)
def update(
    account_id: int,
    payload: AnalyticAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_mutation),
):
    try:
        return update_analytic_account(db, account_id, payload)
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            status.HTTP_404_NOT_FOUND
            if "not found" in detail.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=detail)


@router.patch(
    "/analytic-accounts/{account_id}/status",
    response_model=AnalyticAccountResponse,
)
def change_status(
    account_id: int,
    payload: AnalyticAccountStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_mutation),
):
    try:
        return toggle_analytic_account_status(db, account_id, payload)
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            status.HTTP_404_NOT_FOUND
            if "not found" in detail.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=detail)


@router.delete(
    "/analytic-accounts/{account_id}",
    status_code=status.HTTP_200_OK,
)
def delete(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_mutation),
):
    try:
        delete_analytic_account(db, account_id)
        return {"message": "Analytic account deleted successfully", "id": account_id}
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            status.HTTP_404_NOT_FOUND
            if "not found" in detail.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=detail)
