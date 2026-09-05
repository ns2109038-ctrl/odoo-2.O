from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.services.budget_service import (
    create_budget,
    get_budgets,
    get_budget,
    update_budget,
    activate_budget,
    close_budget,
)
from app.core.security import require_authenticated_user, require_accountant

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    budget: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        return create_budget(db, budget, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[BudgetResponse])
@router.get("/", response_model=List[BudgetResponse], include_in_schema=False)
def read_all(
    skip: int = Query(0, ge=0, description="Number of budgets to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max number of budgets to return"),
    status: Optional[str] = Query(None, description="Filter by status (draft, active, closed)"),
    analytic_account_id: Optional[int] = Query(None, description="Filter by analytic account ID"),
    search: Optional[str] = Query(None, description="Search in budget name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return get_budgets(
        db,
        skip=skip,
        limit=limit,
        status=status,
        analytic_account_id=analytic_account_id,
        search=search,
    )


@router.get("/{budget_id}", response_model=BudgetResponse)
def read_one(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    budget = get_budget(db, budget_id)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget with id {budget_id} not found.",
        )
    return budget


@router.put("/{budget_id}", response_model=BudgetResponse)
def update(
    budget_id: int,
    budget_data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        budget = update_budget(db, budget_id, budget_data, user_id=current_user.id)
        if not budget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Budget with id {budget_id} not found.",
            )
        return budget
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{budget_id}/activate", response_model=BudgetResponse)
def activate(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        return activate_budget(db, budget_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{budget_id}/close", response_model=BudgetResponse)
def close(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        return close_budget(db, budget_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
