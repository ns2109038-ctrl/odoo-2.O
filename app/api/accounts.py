from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.account import AccountCreate, AccountUpdate, AccountStatusUpdate, AccountResponse
from app.services.account_service import (
    create_account,
    get_accounts,
    get_account,
    update_account,
    archive_account,
)
from app.core.security import require_authenticated_user, require_accountant

router = APIRouter(prefix="/accounts", tags=["Chart of Accounts"])


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        return create_account(db, account)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[AccountResponse])
def read_all(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    account_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return get_accounts(
        db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        account_type=account_type,
        search=search,
    )


@router.get("/{account_id}", response_model=AccountResponse)
def read_one(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    account = get_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found.",
        )
    return account


@router.put("/{account_id}", response_model=AccountResponse)
def update(
    account_id: int,
    account_data: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        account = update_account(db, account_id, account_data)
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Account with id {account_id} not found.",
            )
        return account
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{account_id}/status", response_model=AccountResponse)
def change_status(
    account_id: int,
    status_data: AccountStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    from app.models.account import Account as AccountModel
    account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found.",
        )
    account.is_active = status_data.is_active
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", response_model=AccountResponse)
def archive(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    account = archive_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found.",
        )
    return account
