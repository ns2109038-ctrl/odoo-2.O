from typing import Optional, List, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.account import (
    AccountCreate,
    AccountUpdate,
    AccountStatusUpdate,
    AccountResponse,
    AccountTreeNode,
)
from app.services.account_service import (
    create_account,
    get_accounts,
    get_account_hierarchy_tree,
    get_account,
    update_account,
    update_account_status,
    delete_account,
)
from app.core.security import require_authenticated_user, require_accountant

router = APIRouter(prefix="/accounts", tags=["Chart of Accounts"])


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        return create_account(db, account)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=Union[List[AccountTreeNode], List[AccountResponse]])
@router.get("/", response_model=Union[List[AccountTreeNode], List[AccountResponse]], include_in_schema=False)
def read_all(
    skip: int = Query(0, ge=0, description="Number of accounts to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max number of accounts to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    account_type: Optional[str] = Query(None, description="Filter by account type (asset, liability, equity, income, expense)"),
    parent_id: Optional[int] = Query(None, description="Filter by parent account ID"),
    search: Optional[str] = Query(None, description="Search by code, name, or description"),
    tree: bool = Query(False, description="If true, returns hierarchical tree structure"),
    hierarchy: bool = Query(False, description="Alias for tree parameter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    if tree or hierarchy:
        return get_account_hierarchy_tree(
            db,
            account_type=account_type,
            is_active=is_active,
        )

    return get_accounts(
        db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        account_type=account_type,
        parent_id=parent_id,
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
    account = update_account_status(db, account_id, status_data.is_active)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found.",
        )
    return account


@router.delete("/{account_id}")
def delete(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        deleted = delete_account(db, account_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Account with id {account_id} not found.",
            )
        return {"message": "Account deleted successfully", "id": account_id}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
