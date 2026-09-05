from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    RecentTransactionsResponse,
)
from app.services.dashboard_service import (
    get_dashboard_summary,
    get_dashboard_recent_transactions,
)
from app.core.security import require_authenticated_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return get_dashboard_summary(db)


@router.get("/recent-transactions", response_model=RecentTransactionsResponse)
def recent_transactions(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return get_dashboard_recent_transactions(db, limit=limit)
