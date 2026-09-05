from typing import Optional, List, Dict, Any, Tuple
from datetime import date as PyDate, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.journal_entry import JournalEntry, JournalEntryLine
from app.models.journal import Journal
from app.models.account import Account
from app.models.analytic_account import AnalyticAccount
from app.schemas.journal_entry import JournalEntryCreate, JournalEntryUpdate, JournalEntryLineCreate


def _validate_lines(
    db: Session,
    lines: List[JournalEntryLineCreate],
    require_balance: bool = False,
) -> Tuple[Decimal, Decimal]:
    """
    Validates line constraints:
    - At least 2 lines required
    - Amounts >= 0
    - Exclusive debit/credit (never both, never neither)
    - Accounts must exist and be active
    - Analytic accounts (if provided) must exist and be active
    - If require_balance=True, total_debit must equal total_credit
    Returns (total_debit, total_credit).
    """
    if len(lines) < 2:
        raise ValueError("Every Journal Entry must contain at least 2 lines.")

    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    account_cache: Dict[int, Account] = {}
    analytic_cache: Dict[int, AnalyticAccount] = {}

    for index, line in enumerate(lines, start=1):
        # 1. Amounts must be >= 0
        if line.debit < Decimal("0.00") or line.credit < Decimal("0.00"):
            raise ValueError(f"Line #{index}: Debit and credit amounts cannot be negative.")

        # 2. Exclusive debit/credit
        if line.debit > Decimal("0.00") and line.credit > Decimal("0.00"):
            raise ValueError(f"Line #{index}: Each line must have either debit OR credit, never both.")
        if line.debit == Decimal("0.00") and line.credit == Decimal("0.00"):
            raise ValueError(f"Line #{index}: Line amount cannot be zero; specify either debit or credit.")

        # 3. Account must exist and be active
        if line.account_id not in account_cache:
            account = db.query(Account).filter(Account.id == line.account_id).first()
            if not account:
                raise ValueError(f"Line #{index}: Account with id {line.account_id} does not exist.")
            if not account.is_active:
                raise ValueError(f"Line #{index}: Account '{account.name}' is inactive/archived and cannot be used.")
            account_cache[line.account_id] = account

        # 3b. Analytic Account (if provided) must exist and be active
        if line.analytic_account_id is not None:
            if line.analytic_account_id not in analytic_cache:
                analytic_acc = db.query(AnalyticAccount).filter(AnalyticAccount.id == line.analytic_account_id).first()
                if not analytic_acc:
                    raise ValueError(f"Line #{index}: Analytic account with id {line.analytic_account_id} does not exist.")
                if not analytic_acc.is_active:
                    raise ValueError(f"Line #{index}: Analytic account '{analytic_acc.name}' is inactive and cannot accept transactions.")
                analytic_cache[line.analytic_account_id] = analytic_acc

        total_debit += line.debit
        total_credit += line.credit

    # 4. Double-Entry Rule: Debit must equal Credit
    if require_balance and total_debit != total_credit:
        raise ValueError(
            f"Journal entry is not balanced. Total debit must equal total credit. "
            f"(Total debit: {total_debit}, Total credit: {total_credit})"
        )

    return total_debit, total_credit


def create_journal_entry(
    db: Session,
    entry_data: JournalEntryCreate,
    user_id: Optional[int] = None,
) -> JournalEntry:
    # 1. Validate journal exists and is active
    journal = db.query(Journal).filter(Journal.id == entry_data.journal_id).first()
    if not journal:
        raise ValueError(f"Journal with id {entry_data.journal_id} does not exist.")
    if not journal.is_active:
        raise ValueError(f"Journal '{journal.journal_name}' is inactive and cannot accept entries.")

    target_status = (entry_data.status or "draft").lower()
    if target_status not in ["draft", "posted"]:
        raise ValueError("Initial status must be 'draft' or 'posted'.")

    # Balance is always required — even draft entries must be double-entry balanced
    _validate_lines(db, entry_data.lines, require_balance=True)

    # 2. Atomic persistence
    try:
        new_entry = JournalEntry(
            journal_id=entry_data.journal_id,
            entry_date=entry_data.entry_date,
            date=entry_data.entry_date,  # keep in sync
            reference=entry_data.reference.strip() if entry_data.reference else None,
            description=entry_data.description.strip() if entry_data.description else None,
            status=target_status,
            created_by=user_id,
        )
        db.add(new_entry)
        db.flush()

        for line in entry_data.lines:
            entry_line = JournalEntryLine(
                journal_entry_id=new_entry.id,
                account_id=line.account_id,
                analytic_account_id=line.analytic_account_id,
                description=line.description.strip() if line.description else None,
                debit=line.debit,
                credit=line.credit,
            )
            db.add(entry_line)

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
    status: Optional[str] = None,
    start_date: Optional[PyDate] = None,
    end_date: Optional[PyDate] = None,
    search: Optional[str] = None,
    analytic_account_id: Optional[int] = None,
) -> List[JournalEntry]:
    query = db.query(JournalEntry)

    if analytic_account_id is not None:
        query = query.join(JournalEntry.lines).filter(JournalEntryLine.analytic_account_id == analytic_account_id).distinct()
    if journal_id:
        query = query.filter(JournalEntry.journal_id == journal_id)
    if status:
        query = query.filter(JournalEntry.status == status.lower())
    if start_date:
        query = query.filter(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.entry_date <= end_date)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                JournalEntry.reference.ilike(pattern),
                JournalEntry.description.ilike(pattern),
            )
        )

    return query.order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc()).offset(skip).limit(limit).all()


def get_journal_entry(db: Session, entry_id: int) -> Optional[JournalEntry]:
    return db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()


def update_journal_entry(
    db: Session,
    entry_id: int,
    update_data: JournalEntryUpdate,
    user_id: Optional[int] = None,
) -> Optional[JournalEntry]:
    entry = get_journal_entry(db, entry_id)
    if not entry:
        return None

    # Rule: Posted entries cannot be edited directly.
    if entry.status.lower() in ["posted", "cancelled"]:
        raise ValueError(f"Cannot edit a {entry.status} journal entry. Only draft entries can be modified.")

    update_dict = update_data.model_dump(exclude_unset=True)

    # 1. Validate journal if changing
    if "journal_id" in update_dict and update_dict["journal_id"] != entry.journal_id:
        journal = db.query(Journal).filter(Journal.id == update_dict["journal_id"]).first()
        if not journal:
            raise ValueError(f"Journal with id {update_dict['journal_id']} does not exist.")
        if not journal.is_active:
            raise ValueError(f"Journal '{journal.journal_name}' is inactive.")
        entry.journal_id = update_dict["journal_id"]

    # 2. Update scalar fields
    if "entry_date" in update_dict and update_dict["entry_date"]:
        entry.entry_date = update_dict["entry_date"]
        entry.date = update_dict["entry_date"]
    if "reference" in update_dict:
        entry.reference = update_dict["reference"].strip() if update_dict["reference"] else None
    if "description" in update_dict:
        entry.description = update_dict["description"].strip() if update_dict["description"] else None

    # 3. Update lines if provided
    if "lines" in update_dict and update_dict["lines"] is not None:
        lines_data = update_data.lines or []
        _validate_lines(db, lines_data, require_balance=False)

        # Remove existing lines and insert new lines atomically
        try:
            db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id == entry_id).delete()
            for line in lines_data:
                new_line = JournalEntryLine(
                    journal_entry_id=entry_id,
                    account_id=line.account_id,
                    analytic_account_id=line.analytic_account_id,
                    description=line.description.strip() if line.description else None,
                    debit=line.debit,
                    credit=line.credit,
                )
                db.add(new_line)
            db.commit()
            db.refresh(entry)
            return entry
        except Exception:
            db.rollback()
            raise

    db.commit()
    db.refresh(entry)
    return entry


def post_journal_entry(db: Session, entry_id: int, user_id: Optional[int] = None) -> JournalEntry:
    entry = get_journal_entry(db, entry_id)
    if not entry:
        raise ValueError(f"Journal entry with id {entry_id} not found.")

    if entry.status.lower() == "posted":
        raise ValueError(f"Journal entry #{entry_id} is already posted.")
    if entry.status.lower() == "cancelled":
        raise ValueError(f"Cannot post cancelled journal entry #{entry_id}.")

    # 1. Validate journal is active
    if not entry.journal or not entry.journal.is_active:
        raise ValueError(f"Journal '{entry.journal.journal_name if entry.journal else 'Unknown'}' is inactive.")

    # 2. Validate double-entry balance and accounts
    lines_as_schema = [
        JournalEntryLineCreate(
            account_id=l.account_id,
            analytic_account_id=l.analytic_account_id,
            description=l.description,
            debit=l.debit,
            credit=l.credit,
        )
        for l in entry.lines
    ]
    _validate_lines(db, lines_as_schema, require_balance=True)

    entry.status = "posted"
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry


def cancel_journal_entry(
    db: Session,
    entry_id: int,
    user_id: Optional[int] = None,
    reason: Optional[str] = None,
) -> Tuple[JournalEntry, Optional[JournalEntry]]:
    """
    Cancels a journal entry:
    - If draft: marks status as cancelled.
    - If posted: executes cancellation/reversal logic by creating a reversal entry
    - with swapped debits/credits, marking reversal as posted, and marking original as cancelled.
    Returns (original_entry, reversal_entry_or_None).
    """
    entry = get_journal_entry(db, entry_id)
    if not entry:
        raise ValueError(f"Journal entry with id {entry_id} not found.")

    if entry.status.lower() == "cancelled":
        raise ValueError(f"Journal entry #{entry_id} is already cancelled.")

    if entry.status.lower() == "draft":
        entry.status = "cancelled"
        entry.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(entry)
        return entry, None

    # Posted entry cancellation: create reversal entry atomically
    try:
        ref_text = f"REV-{entry.reference}" if entry.reference else f"REV-{entry.id}"
        desc_text = f"Reversal of Journal Entry #{entry.id}"
        if reason:
            desc_text += f": {reason.strip()}"

        reversal_entry = JournalEntry(
            journal_id=entry.journal_id,
            entry_date=PyDate.today(),
            date=PyDate.today(),
            reference=ref_text[:100],
            description=desc_text,
            status="posted",
            created_by=user_id,
        )
        db.add(reversal_entry)
        db.flush()

        for original_line in entry.lines:
            rev_line = JournalEntryLine(
                journal_entry_id=reversal_entry.id,
                account_id=original_line.account_id,
                analytic_account_id=original_line.analytic_account_id,
                description=f"Reversal: {original_line.description or ''}".strip(),
                debit=original_line.credit,   # Swap debit and credit
                credit=original_line.debit,
            )
            db.add(rev_line)

        entry.status = "cancelled"
        entry.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(entry)
        db.refresh(reversal_entry)
        return entry, reversal_entry
    except Exception:
        db.rollback()
        raise


# =====================================================================
# Reusable Accounting Service Functions for Invoices, Bills & Payments
# =====================================================================

def create_invoice_journal_entry(
    db: Session,
    journal_id: int,
    invoice_ref: str,
    invoice_date: PyDate,
    receivable_account_id: int,
    income_account_id: int,
    amount: Decimal,
    tax_account_id: Optional[int] = None,
    tax_amount: Decimal = Decimal("0.00"),
    description: Optional[str] = None,
    created_by: Optional[int] = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Reusable accounting function to generate a Customer Invoice journal entry:
    Debit: Accounts Receivable (Total amount)
    Credit: Sales Income (Net amount)
    Credit: Tax Payable (Tax amount, if any)
    """
    net_amount = amount - tax_amount
    lines = [
        JournalEntryLineCreate(
            account_id=receivable_account_id,
            description=f"Receivable for {invoice_ref}",
            debit=amount,
            credit=Decimal("0.00"),
        ),
        JournalEntryLineCreate(
            account_id=income_account_id,
            description=f"Income for {invoice_ref}",
            debit=Decimal("0.00"),
            credit=net_amount,
        ),
    ]
    if tax_account_id and tax_amount > Decimal("0.00"):
        lines.append(
            JournalEntryLineCreate(
                account_id=tax_account_id,
                description=f"Tax for {invoice_ref}",
                debit=Decimal("0.00"),
                credit=tax_amount,
            )
        )

    entry_data = JournalEntryCreate(
        journal_id=journal_id,
        entry_date=invoice_date,
        reference=invoice_ref,
        description=description or f"Customer Invoice {invoice_ref}",
        status="posted" if auto_post else "draft",
        lines=lines,
    )
    return create_journal_entry(db, entry_data, user_id=created_by)


def create_bill_journal_entry(
    db: Session,
    journal_id: int,
    bill_ref: str,
    bill_date: PyDate,
    payable_account_id: int,
    expense_account_id: int,
    amount: Decimal,
    tax_account_id: Optional[int] = None,
    tax_amount: Decimal = Decimal("0.00"),
    description: Optional[str] = None,
    created_by: Optional[int] = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Reusable accounting function to generate a Vendor Bill journal entry:
    Debit: Expense Account (Net amount)
    Debit: Tax Input (Tax amount, if any)
    Credit: Accounts Payable (Total amount)
    """
    net_amount = amount - tax_amount
    lines = [
        JournalEntryLineCreate(
            account_id=expense_account_id,
            description=f"Expense for {bill_ref}",
            debit=net_amount,
            credit=Decimal("0.00"),
        ),
    ]
    if tax_account_id and tax_amount > Decimal("0.00"):
        lines.append(
            JournalEntryLineCreate(
                account_id=tax_account_id,
                description=f"Tax input for {bill_ref}",
                debit=tax_amount,
                credit=Decimal("0.00"),
            )
        )
    lines.append(
        JournalEntryLineCreate(
            account_id=payable_account_id,
            description=f"Payable for {bill_ref}",
            debit=Decimal("0.00"),
            credit=amount,
        )
    )

    entry_data = JournalEntryCreate(
        journal_id=journal_id,
        entry_date=bill_date,
        reference=bill_ref,
        description=description or f"Vendor Bill {bill_ref}",
        status="posted" if auto_post else "draft",
        lines=lines,
    )
    return create_journal_entry(db, entry_data, user_id=created_by)


def create_payment_journal_entry(
    db: Session,
    journal_id: int,
    payment_ref: str,
    payment_date: PyDate,
    bank_account_id: int,
    partner_account_id: int,
    amount: Decimal,
    is_customer_payment: bool = True,
    description: Optional[str] = None,
    created_by: Optional[int] = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Reusable accounting function for payments:
    Customer payment: Debit Bank, Credit Accounts Receivable
    Vendor payment: Debit Accounts Payable, Credit Bank
    """
    if is_customer_payment:
        # Customer pays us: Bank increases (Debit), Receivable decreases (Credit)
        lines = [
            JournalEntryLineCreate(
                account_id=bank_account_id,
                description=f"Receipt from Customer - {payment_ref}",
                debit=amount,
                credit=Decimal("0.00"),
            ),
            JournalEntryLineCreate(
                account_id=partner_account_id,
                description=f"Receivable cleared - {payment_ref}",
                debit=Decimal("0.00"),
                credit=amount,
            ),
        ]
    else:
        # We pay vendor: Payable decreases (Debit), Bank decreases (Credit)
        lines = [
            JournalEntryLineCreate(
                account_id=partner_account_id,
                description=f"Payable cleared - {payment_ref}",
                debit=amount,
                credit=Decimal("0.00"),
            ),
            JournalEntryLineCreate(
                account_id=bank_account_id,
                description=f"Payment to Vendor - {payment_ref}",
                debit=Decimal("0.00"),
                credit=amount,
            ),
        ]

    entry_data = JournalEntryCreate(
        journal_id=journal_id,
        entry_date=payment_date,
        reference=payment_ref,
        description=description or f"Payment {payment_ref}",
        status="posted" if auto_post else "draft",
        lines=lines,
    )
    return create_journal_entry(db, entry_data, user_id=created_by)
