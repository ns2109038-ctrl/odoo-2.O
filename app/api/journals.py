from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.journal import JournalCreate, JournalUpdate, JournalResponse
from app.services.journal_service import (
    create_journal,
    get_journals,
    get_journal,
    update_journal,
    archive_journal,
)

router = APIRouter(prefix="/journals", tags=["Journals"])


@router.post("/", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
def create(journal: JournalCreate, db: Session = Depends(get_db)):
    try:
        return create_journal(db, journal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[JournalResponse])
def read_all(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    journal_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return get_journals(
        db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        journal_type=journal_type,
    )


@router.get("/{journal_id}", response_model=JournalResponse)
def read_one(journal_id: int, db: Session = Depends(get_db)):
    journal = get_journal(db, journal_id)
    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journal with id {journal_id} not found.",
        )
    return journal


@router.put("/{journal_id}", response_model=JournalResponse)
def update(
    journal_id: int,
    journal_data: JournalUpdate,
    db: Session = Depends(get_db),
):
    try:
        journal = update_journal(db, journal_id, journal_data)
        if not journal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journal with id {journal_id} not found.",
            )
        return journal
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{journal_id}", response_model=JournalResponse)
def archive(journal_id: int, db: Session = Depends(get_db)):
    journal = archive_journal(db, journal_id)
    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journal with id {journal_id} not found.",
        )
    return journal
