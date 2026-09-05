from typing import Optional
from datetime import date as PyDate
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.report import (
    TrialBalanceReport,
    BalanceSheetReport,
    ProfitLossReport,
    BudgetReport,
)
from app.services.report_service import (
    generate_trial_balance,
    generate_balance_sheet,
    generate_profit_loss,
    generate_budget_report,
)
from app.core.security import require_authenticated_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/trial-balance", response_model=TrialBalanceReport)
def get_trial_balance(
    start_date: Optional[PyDate] = Query(None, description="Start date (inclusive)"),
    end_date: Optional[PyDate] = Query(None, description="End date (inclusive)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return generate_trial_balance(db, start_date=start_date, end_date=end_date)


@router.get("/balance-sheet", response_model=BalanceSheetReport)
def get_balance_sheet(
    start_date: Optional[PyDate] = Query(None, description="Start date (optional)"),
    end_date: Optional[PyDate] = Query(None, description="As of date (inclusive)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return generate_balance_sheet(db, start_date=start_date, end_date=end_date)


@router.get("/profit-loss", response_model=ProfitLossReport)
def get_profit_loss(
    start_date: Optional[PyDate] = Query(None, description="Start date (inclusive)"),
    end_date: Optional[PyDate] = Query(None, description="End date (inclusive)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return generate_profit_loss(db, start_date=start_date, end_date=end_date)


@router.get("/budget", response_model=BudgetReport)
def get_budget_report(
    start_date: Optional[PyDate] = Query(None, description="Start date (inclusive)"),
    end_date: Optional[PyDate] = Query(None, description="End date (inclusive)"),
    budget_id: Optional[int] = Query(None, description="Optional specific Budget ID"),
    analytic_account_id: Optional[int] = Query(None, description="Optional Analytic Account ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return generate_budget_report(
        db,
        start_date=start_date,
        end_date=end_date,
        budget_id=budget_id,
        analytic_account_id=analytic_account_id,
    )
