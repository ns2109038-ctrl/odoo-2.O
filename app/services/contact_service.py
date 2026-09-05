from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate


def create_contact(db: Session, contact_data: ContactCreate) -> Contact:
    name_clean = contact_data.name.strip()
    email_clean = str(contact_data.email).strip().lower() if contact_data.email else None
    phone_clean = contact_data.phone.strip() if contact_data.phone else None

    # Check duplicate email if email is provided
    if email_clean:
        existing = (
            db.query(Contact)
            .filter(func.lower(Contact.email) == email_clean)
            .first()
        )
        if existing:
            raise ValueError(f"A contact with email '{email_clean}' already exists.")

    new_contact = Contact(
        name=name_clean,
        contact_type=contact_data.contact_type,
        type=contact_data.contact_type.capitalize(),
        email=email_clean,
        phone=phone_clean,
        mobile=phone_clean,
        address=contact_data.address.strip() if contact_data.address else None,
        city=contact_data.city.strip() if contact_data.city else None,
        state=contact_data.state.strip() if contact_data.state else None,
        country=contact_data.country.strip() if contact_data.country else "India",
        tax_id=contact_data.tax_id.strip() if contact_data.tax_id else None,
        is_active=contact_data.is_active,
    )

    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return new_contact


def get_contacts(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    contact_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> List[Contact]:
    query = db.query(Contact)

    if is_active is not None:
        query = query.filter(Contact.is_active == is_active)

    if contact_type:
        type_clean = contact_type.strip().lower()
        query = query.filter(
            or_(
                func.lower(Contact.contact_type) == type_clean,
                func.lower(Contact.type) == type_clean,
            )
        )

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Contact.name).ilike(search_pattern),
                func.lower(Contact.email).ilike(search_pattern),
                Contact.phone.ilike(search_pattern),
                Contact.mobile.ilike(search_pattern),
                Contact.tax_id.ilike(search_pattern),
                func.lower(Contact.city).ilike(search_pattern),
            )
        )

    return query.order_by(Contact.id.desc()).offset(skip).limit(limit).all()


def get_contact_by_id(db: Session, contact_id: int) -> Optional[Contact]:
    return db.query(Contact).filter(Contact.id == contact_id).first()


def update_contact(
    db: Session,
    contact_id: int,
    contact_data: ContactUpdate,
) -> Optional[Contact]:
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        return None

    update_dict = contact_data.model_dump(exclude_unset=True)

    # Check email uniqueness if email is changed
    if "email" in update_dict:
        new_email = str(update_dict["email"]).strip().lower() if update_dict["email"] else None
        if new_email:
            existing = (
                db.query(Contact)
                .filter(
                    func.lower(Contact.email) == new_email,
                    Contact.id != contact_id,
                )
                .first()
            )
            if existing:
                raise ValueError(f"A contact with email '{new_email}' already exists.")
            contact.email = new_email
        else:
            contact.email = None

    if "name" in update_dict and update_dict["name"] is not None:
        contact.name = update_dict["name"].strip()

    if "contact_type" in update_dict and update_dict["contact_type"] is not None:
        contact.contact_type = update_dict["contact_type"]
        contact.type = update_dict["contact_type"].capitalize()

    if "phone" in update_dict:
        phone_val = update_dict["phone"].strip() if update_dict["phone"] else None
        contact.phone = phone_val
        contact.mobile = phone_val

    if "address" in update_dict:
        contact.address = update_dict["address"].strip() if update_dict["address"] else None

    if "city" in update_dict:
        contact.city = update_dict["city"].strip() if update_dict["city"] else None

    if "state" in update_dict:
        contact.state = update_dict["state"].strip() if update_dict["state"] else None

    if "country" in update_dict:
        contact.country = update_dict["country"].strip() if update_dict["country"] else "India"

    if "tax_id" in update_dict:
        contact.tax_id = update_dict["tax_id"].strip() if update_dict["tax_id"] else None

    if "is_active" in update_dict and update_dict["is_active"] is not None:
        contact.is_active = update_dict["is_active"]

    db.commit()
    db.refresh(contact)
    return contact


def update_contact_status(
    db: Session,
    contact_id: int,
    is_active: bool,
) -> Optional[Contact]:
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        return None

    contact.is_active = is_active
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: int) -> bool:
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        return False

    db.delete(contact)
    db.commit()
    return True