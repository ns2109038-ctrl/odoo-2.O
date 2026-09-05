from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactStatusUpdate,
    ContactResponse,
)
from app.services.contact_service import (
    create_contact,
    get_contacts,
    get_contact_by_id,
    update_contact,
    update_contact_status,
    delete_contact,
)
from app.core.security import require_authenticated_user

router = APIRouter(tags=["Contacts"])


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create(
    contact: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    try:
        return create_contact(db, contact)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[ContactResponse])
@router.get("/", response_model=List[ContactResponse], include_in_schema=False)
def read_all(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    contact_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return get_contacts(
        db,
        skip=skip,
        limit=limit,
        search=search,
        contact_type=contact_type,
        is_active=is_active,
    )


@router.get("/{contact_id}", response_model=ContactResponse)
def read_one(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found.",
        )
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
def update(
    contact_id: int,
    contact_data: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    try:
        contact = update_contact(db, contact_id, contact_data)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contact with id {contact_id} not found.",
            )
        return contact
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{contact_id}/status", response_model=ContactResponse)
def change_status(
    contact_id: int,
    status_data: ContactStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    contact = update_contact_status(db, contact_id, status_data.is_active)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found.",
        )
    return contact


@router.delete("/{contact_id}")
def delete(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    deleted = delete_contact(db, contact_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found.",
        )
    return {"message": "Contact deleted successfully", "id": contact_id}