from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.contact import ContactCreate, ContactResponse
from app.services.contact_service import (
    create_contact,
    get_contacts,
    get_contact,
)

router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.post("/", response_model=ContactResponse)
def create(contact: ContactCreate, db: Session = Depends(get_db)):
    return create_contact(db, contact)


@router.get("/", response_model=list[ContactResponse])
def read_all(db: Session = Depends(get_db)):
    return get_contacts(db)


@router.get("/{contact_id}", response_model=ContactResponse)
def read_one(contact_id: int, db: Session = Depends(get_db)):
    contact = get_contact(db, contact_id)

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    return contact