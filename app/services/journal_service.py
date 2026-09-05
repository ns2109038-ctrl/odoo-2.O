from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.journal import Journal
from app.models.account import Account
from app.schemas.journal import JournalCreate, JournalUpdate


def _validate_account(db: Session, account_id: int, account_role: str) -> Account:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise ValueError(f"{account_role.capitalize()} account with id {account_id} does not exist.")
    if not account.is_active:
        raise ValueError(f"{account_role.capitalize()} account '{account.account_name}' is inactive/archived and cannot be selected.")
    return account


def create_journal(db: Session, journal_data: JournalCreate) -> Journal:
    normalized_name = journal_data.journal_name.strip()

    # Check for duplicate journal name (case-insensitive)
    existing = (
        db.query(Journal)
        .filter(func.lower(Journal.journal_name) == func.lower(normalized_name))
        .first()
    )
    if existing:
        raise ValueError(f"Journal with name '{normalized_name}' already exists.")

    # Validate debit and credit accounts
    _validate_account(db, journal_data.default_debit_account_id, "debit")
    _validate_account(db, journal_data.default_credit_account_id, "credit")

    new_journal = Journal(
        journal_name=normalized_name,
        journal_type=journal_data.journal_type,
        default_debit_account_id=journal_data.default_debit_account_id,
        default_credit_account_id=journal_data.default_credit_account_id,
        is_active=journal_data.is_active,
    )
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)
    return new_journal


def get_journals(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    journal_type: Optional[str] = None,
) -> List[Journal]:
    query = db.query(Journal)
    if is_active is not None:
        query = query.filter(Journal.is_active == is_active)
    if journal_type:
        query = query.filter(Journal.journal_type == journal_type)
    return query.order_by(Journal.id.asc()).offset(skip).limit(limit).all()


def get_journal(db: Session, journal_id: int) -> Optional[Journal]:
    return db.query(Journal).filter(Journal.id == journal_id).first()


def update_journal(
    db: Session, journal_id: int, journal_data: JournalUpdate
) -> Optional[Journal]:
    journal = get_journal(db, journal_id)
    if not journal:
        return None

    update_dict = journal_data.model_dump(exclude_unset=True)

    if "journal_name" in update_dict and update_dict["journal_name"]:
        new_name = update_dict["journal_name"].strip()
        duplicate = (
            db.query(Journal)
            .filter(
                func.lower(Journal.journal_name) == func.lower(new_name),
                Journal.id != journal_id,
            )
            .first()
        )
        if duplicate:
            raise ValueError(f"Journal with name '{new_name}' already exists.")
        update_dict["journal_name"] = new_name

    if "default_debit_account_id" in update_dict:
        _validate_account(db, update_dict["default_debit_account_id"], "debit")

    if "default_credit_account_id" in update_dict:
        _validate_account(db, update_dict["default_credit_account_id"], "credit")

    for field, value in update_dict.items():
        setattr(journal, field, value)

    db.commit()
    db.refresh(journal)
    return journal


def archive_journal(db: Session, journal_id: int) -> Optional[Journal]:
    journal = get_journal(db, journal_id)
    if not journal:
        return None

    journal.is_active = False
    db.commit()
    db.refresh(journal)
    return journal
