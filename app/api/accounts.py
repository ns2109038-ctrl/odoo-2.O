from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.services.account_service import (
    create_account,
    get_accounts,
    get_account,
    update_account,
    archive_account,
)

router = APIRouter(prefix="/accounts", tags=["Chart of Accounts"])


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create(account: AccountCreate, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db),
):
    return get_accounts(
        db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        account_type=account_type,
    )


@router.get("/{account_id}", response_model=AccountResponse)
def read_one(account_id: int, db: Session = Depends(get_db)):
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


@router.delete("/{account_id}", response_model=AccountResponse)
def archive(account_id: int, db: Session = Depends(get_db)):
    account = archive_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found.",
        )
    return account
