from typing import Optional, List, Tuple
from datetime import date as PyDate, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.models.payment import Payment
from app.models.contact import Contact
from app.models.journal import Journal
from app.models.account import Account
from app.schemas.payment import PaymentCreate, PaymentUpdate
from app.services.journal_entry_service import (
    create_payment_journal_entry,
    cancel_journal_entry,
)


def _validate_contact(db: Session, contact_id: int, payment_type: str) -> Contact:
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise ValueError(f"Contact with id {contact_id} does not exist.")
    if not contact.is_active:
        raise ValueError(f"Contact '{contact.name}' is inactive and cannot be used.")

    ctype = (contact.contact_type or contact.type or "").lower()
    if payment_type == "customer_receipt":
        if ctype not in ("customer", "both", "client"):
            raise ValueError(
                f"Contact '{contact.name}' (type: {contact.contact_type}) is not a valid customer for a customer receipt."
            )
    elif payment_type == "vendor_payment":
        if ctype not in ("vendor", "supplier", "both"):
            raise ValueError(
                f"Contact '{contact.name}' (type: {contact.contact_type}) is not a valid vendor for a vendor payment."
            )
    return contact


def _validate_journal(db: Session, journal_id: int) -> Journal:
    journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not journal:
        raise ValueError(f"Journal with id {journal_id} does not exist.")
    if not journal.is_active:
        raise ValueError(f"Journal '{journal.journal_name}' is inactive and cannot be used.")
    return journal


def _generate_payment_number(db: Session, payment_type: str, custom_number: Optional[str] = None) -> str:
    if custom_number and custom_number.strip():
        num = custom_number.strip()
        existing = db.query(Payment).filter(Payment.payment_number == num).first()
        if existing:
            raise ValueError(f"Payment number '{num}' is already in use.")
        return num

    prefix = "RCP" if payment_type == "customer_receipt" else "PAY"
    count = db.query(Payment).filter(Payment.payment_type == payment_type).count()
    candidate = f"{prefix}-{count + 1:04d}"

    while db.query(Payment).filter(Payment.payment_number == candidate).first():
        count += 1
        candidate = f"{prefix}-{count + 1:04d}"

    return candidate


def _resolve_payment_accounts(db: Session, payment: Payment) -> Tuple[int, int]:
    journal = db.query(Journal).filter(Journal.id == payment.journal_id).first()
    if not journal:
        raise ValueError(f"Journal with id {payment.journal_id} does not exist.")

    # 1. Bank / Cash Account
    bank_account = None
    if journal.default_debit_account and journal.default_debit_account.is_active:
        bank_account = journal.default_debit_account
    elif journal.default_credit_account and journal.default_credit_account.is_active:
        bank_account = journal.default_credit_account

    if not bank_account:
        bank_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "asset",
            or_(
                Account.name.ilike("%bank%"),
                Account.name.ilike("%cash%"),
            )
        ).first()

    if not bank_account:
        bank_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "asset"
        ).first()

    if not bank_account:
        raise ValueError("No active Bank/Cash (asset) account found.")

    # 2. Partner Account (AR for Customer, AP for Vendor)
    if payment.payment_type == "customer_receipt":
        partner_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "asset",
            or_(
                Account.name.ilike("%receivable%"),
                Account.name.ilike("%debtor%"),
                Account.code.ilike("11%"),
            )
        ).first()
        if not partner_account:
            partner_account = db.query(Account).filter(
                Account.is_active == True,
                Account.account_type == "asset",
                Account.id != bank_account.id
            ).first() or bank_account
    else:  # vendor_payment
        partner_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "liability",
            or_(
                Account.name.ilike("%payable%"),
                Account.name.ilike("%creditor%"),
                Account.code.ilike("21%"),
            )
        ).first()
        if not partner_account:
            partner_account = db.query(Account).filter(
                Account.is_active == True,
                Account.account_type == "liability"
            ).first()

    if not partner_account:
        target_name = "Accounts Receivable" if payment.payment_type == "customer_receipt" else "Accounts Payable"
        raise ValueError(f"No active {target_name} account found.")

    return bank_account.id, partner_account.id


# ── CRUD Services ────────────────────────────────────────────────────────────

def create_payment(
    db: Session,
    payment_data: PaymentCreate,
    user_id: Optional[int] = None,
) -> Payment:
    # 1. Validate contact
    _validate_contact(db, payment_data.contact_id, payment_data.payment_type)

    # 2. Validate journal
    _validate_journal(db, payment_data.journal_id)

    # 3. Generate payment number
    pay_num = _generate_payment_number(
        db, payment_data.payment_type, payment_data.payment_number
    )

    pay_date = payment_data.payment_date or PyDate.today()
    amount = Decimal(str(payment_data.amount)).quantize(Decimal("0.01"))

    if amount <= Decimal("0.00"):
        raise ValueError("Payment amount must be greater than 0.")

    try:
        new_payment = Payment(
            payment_number=pay_num,
            payment_type=payment_data.payment_type,
            contact_id=payment_data.contact_id,
            journal_id=payment_data.journal_id,
            payment_date=pay_date,
            amount=amount,
            reference=payment_data.reference.strip() if payment_data.reference else None,
            status="draft",
            created_by=user_id,
        )
        db.add(new_payment)
        db.commit()
        db.refresh(new_payment)
        return new_payment
    except Exception:
        db.rollback()
        raise


def get_payment(db: Session, payment_id: int) -> Optional[Payment]:
    return db.query(Payment).filter(Payment.id == payment_id).first()


def get_payments(
    db: Session,
    payment_type: Optional[str] = None,
    status: Optional[str] = None,
    contact_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[Payment], int]:
    query = db.query(Payment)

    if payment_type:
        query = query.filter(Payment.payment_type == payment_type.strip().lower())

    if status:
        query = query.filter(Payment.status == status.strip().lower())

    if contact_id:
        query = query.filter(Payment.contact_id == contact_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Payment.payment_number.ilike(term),
                Payment.reference.ilike(term),
                Payment.contact.has(Contact.name.ilike(term)),
            )
        )

    total = query.count()
    payments = query.order_by(desc(Payment.id)).offset(skip).limit(limit).all()
    return payments, total


def update_payment(
    db: Session,
    payment_id: int,
    update_data: PaymentUpdate,
    user_id: Optional[int] = None,
) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise ValueError(f"Payment with id {payment_id} does not exist.")

    if payment.status != "draft":
        raise ValueError(f"Only draft payments can be modified. Current status: '{payment.status}'")

    try:
        if update_data.contact_id is not None:
            _validate_contact(db, update_data.contact_id, payment.payment_type)
            payment.contact_id = update_data.contact_id

        if update_data.journal_id is not None:
            _validate_journal(db, update_data.journal_id)
            payment.journal_id = update_data.journal_id

        if update_data.amount is not None:
            amt = Decimal(str(update_data.amount)).quantize(Decimal("0.01"))
            if amt <= Decimal("0.00"):
                raise ValueError("Payment amount must be greater than 0.")
            payment.amount = amt

        if update_data.payment_date is not None:
            payment.payment_date = update_data.payment_date

        if update_data.reference is not None:
            payment.reference = update_data.reference.strip() if update_data.reference else None

        db.commit()
        db.refresh(payment)
        return payment
    except Exception:
        db.rollback()
        raise


def post_payment(
    db: Session,
    payment_id: int,
    user_id: Optional[int] = None,
) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise ValueError(f"Payment with id {payment_id} does not exist.")

    if payment.status != "draft":
        raise ValueError(f"Only draft payments can be posted. Current status: '{payment.status}'")

    if payment.amount <= Decimal("0.00"):
        raise ValueError("Cannot post payment with 0 or negative amount.")

    try:
        bank_acc_id, partner_acc_id = _resolve_payment_accounts(db, payment)
        is_cust = (payment.payment_type == "customer_receipt")

        entry = create_payment_journal_entry(
            db=db,
            journal_id=payment.journal_id,
            payment_ref=payment.payment_number,
            payment_date=payment.payment_date,
            bank_account_id=bank_acc_id,
            partner_account_id=partner_acc_id,
            amount=payment.amount,
            is_customer_payment=is_cust,
            description=payment.reference or (f"Receipt {payment.payment_number}" if is_cust else f"Payment {payment.payment_number}"),
            created_by=user_id,
            auto_post=True,
        )

        payment.journal_entry_id = entry.id
        payment.status = "posted"

        db.commit()
        db.refresh(payment)
        return payment
    except Exception:
        db.rollback()
        raise


def cancel_payment(
    db: Session,
    payment_id: int,
    user_id: Optional[int] = None,
) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise ValueError(f"Payment with id {payment_id} does not exist.")

    if payment.status == "cancelled":
        raise ValueError("Payment is already cancelled.")

    try:
        if payment.status == "posted" and payment.journal_entry_id:
            cancel_journal_entry(db, payment.journal_entry_id, user_id=user_id)

        payment.status = "cancelled"
        db.commit()
        db.refresh(payment)
        return payment
    except Exception:
        db.rollback()
        raise
