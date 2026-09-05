from sqlalchemy.orm import Session
from app.models.contact import Contact
from app.schemas.contact import ContactCreate


def create_contact(db: Session, contact: ContactCreate):
    new_contact = Contact(**contact.model_dump())
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return new_contact


def get_contacts(db: Session):
    return db.query(Contact).all()


def get_contact(db: Session, contact_id: int):
    return db.query(Contact).filter(Contact.id == contact_id).first()