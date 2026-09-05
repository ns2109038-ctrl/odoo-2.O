from typing import Optional, List, Any, Dict
from datetime import date as PyDate
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.journal_entry import (
    JournalEntryCreate,
    JournalEntryUpdate,
    JournalEntryResponse,
)
from app.services.journal_entry_service import (
    create_journal_entry,
    get_journal_entries,
    get_journal_entry,
    update_journal_entry,
    post_journal_entry,
    cancel_journal_entry,
)
from app.core.security import require_authenticated_user, require_accountant

router = APIRouter(prefix="/journal-entries", tags=["Journal Entries"])


@router.post("/", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    entry: JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        return create_journal_entry(db, entry, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[JournalEntryResponse])
@router.get("", response_model=List[JournalEntryResponse], include_in_schema=False)
def read_all(
    skip: int = Query(0, ge=0, description="Number of entries to skip"),
    limit: int = Query(100, ge=1, le=200, description="Max number of entries to return"),
    journal_id: Optional[int] = Query(None, description="Filter by journal ID"),
    status: Optional[str] = Query(None, description="Filter by status (draft, posted, cancelled)"),
    start_date: Optional[PyDate] = Query(None, description="Filter by start date (>=)"),
    end_date: Optional[PyDate] = Query(None, description="Filter by end date (<=)"),
    search: Optional[str] = Query(None, description="Search in reference or description"),
    analytic_account_id: Optional[int] = Query(None, description="Filter by analytic account ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return get_journal_entries(
        db,
        skip=skip,
        limit=limit,
        journal_id=journal_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        search=search,
        analytic_account_id=analytic_account_id,
    )


@router.get("/{entry_id}", response_model=JournalEntryResponse)
def read_one(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    entry = get_journal_entry(db, entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journal entry with id {entry_id} not found.",
        )
    return entry


@router.put("/{entry_id}", response_model=JournalEntryResponse)
def update(
    entry_id: int,
    entry_data: JournalEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        entry = update_journal_entry(db, entry_id, entry_data, user_id=current_user.id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journal entry with id {entry_id} not found.",
            )
        return entry
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{entry_id}/post", response_model=JournalEntryResponse)
def post_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        return post_journal_entry(db, entry_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{entry_id}/cancel")
def cancel_entry(
    entry_id: int,
    reason: Optional[str] = Query(None, description="Optional cancellation reason"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant),
):
    try:
        entry, reversal = cancel_journal_entry(db, entry_id, user_id=current_user.id, reason=reason)
        return {
            "message": "Journal entry cancelled successfully" if not reversal else "Journal entry cancelled and reversal entry posted successfully",
            "entry": JournalEntryResponse.model_validate(entry),
            "reversal_entry": JournalEntryResponse.model_validate(reversal) if reversal else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
