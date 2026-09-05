from typing import Optional, List
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.journal_entry import JournalEntry, JournalItem
from app.models.journal import Journal
from app.models.account import Account
from app.schemas.journal_entry import JournalEntryCreate


def create_journal_entry(db: Session, entry_data: JournalEntryCreate) -> JournalEntry:
    # 1. Validate journal exists and is active
    journal = db.query(Journal).filter(Journal.id == entry_data.journal_id).first()
    if not journal:
        raise ValueError(f"Journal with id {entry_data.journal_id} does not exist.")
    if not journal.is_active:
        raise ValueError(f"Journal '{journal.journal_name}' is inactive/archived and cannot accept entries.")

    # 2. Validate items count
    if len(entry_data.items) < 2:
        raise ValueError("Every Journal Entry must contain at least 2 items.")

    # 3. Calculate total debit & credit and validate accounts
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    # Cache account lookups to avoid redundant queries
    account_cache = {}

    for index, item in enumerate(entry_data.items, start=1):
        if item.debit < 0 or item.credit < 0:
            raise ValueError(f"Item #{index}: Debit and credit amounts cannot be negative.")
        if item.debit > 0 and item.credit > 0:
            raise ValueError(f"Item #{index}: A journal item cannot have both debit and credit greater than zero.")
        if item.debit == 0 and item.credit == 0:
            raise ValueError(f"Item #{index}: A journal item cannot have both debit and credit equal to zero.")

        # Validate account
        if item.account_id not in account_cache:
            account = db.query(Account).filter(Account.id == item.account_id).first()
            if not account:
                raise ValueError(f"Item #{index}: Account with id {item.account_id} does not exist.")
            if not account.is_active:
                raise ValueError(f"Item #{index}: Account '{account.account_name}' is inactive/archived and cannot be used.")
            account_cache[item.account_id] = account

        total_debit += item.debit
        total_credit += item.credit

    # 4. Accounting Rule: Total Debit MUST equal Total Credit
    if total_debit != total_credit:
        raise ValueError("Journal entry is not balanced. Total debit must equal total credit.")

    # 5. Atomic persistence within database transaction
    try:
        new_entry = JournalEntry(
            journal_id=entry_data.journal_id,
            date=entry_data.date,
            reference=entry_data.reference.strip() if entry_data.reference else None,
            description=entry_data.description.strip() if entry_data.description else None,
        )
        db.add(new_entry)
        db.flush()  # Obtain new_entry.id while keeping transaction open

        for item in entry_data.items:
            journal_item = JournalItem(
                journal_entry_id=new_entry.id,
                account_id=item.account_id,
                debit=item.debit,
                credit=item.credit,
            )
            db.add(journal_item)

        db.commit()
        db.refresh(new_entry)
        return new_entry
    except Exception:
        db.rollback()
        raise


def get_journal_entries(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    journal_id: Optional[int] = None,
) -> List[JournalEntry]:
    query = db.query(JournalEntry)
    if journal_id:
        query = query.filter(JournalEntry.journal_id == journal_id)
    return query.order_by(JournalEntry.id.desc()).offset(skip).limit(limit).all()


def get_journal_entry(db: Session, entry_id: int) -> Optional[JournalEntry]:
    return db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
