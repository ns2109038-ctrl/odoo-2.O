from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.journal_entry import JournalEntryCreate, JournalEntryResponse
from app.services.journal_entry_service import (
    create_journal_entry,
    get_journal_entries,
    get_journal_entry,
)

router = APIRouter(prefix="/journal-entries", tags=["Journal Entries"])


@router.post("/", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
def create(entry: JournalEntryCreate, db: Session = Depends(get_db)):
    try:
        return create_journal_entry(db, entry)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[JournalEntryResponse])
def read_all(
    skip: int = 0,
    limit: int = 100,
    journal_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return get_journal_entries(db, skip=skip, limit=limit, journal_id=journal_id)


@router.get("/{entry_id}", response_model=JournalEntryResponse)
def read_one(entry_id: int, db: Session = Depends(get_db)):
    entry = get_journal_entry(db, entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journal entry with id {entry_id} not found.",
        )
    return entry
