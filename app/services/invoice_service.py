from typing import Optional, List, Tuple, Dict, Any
from datetime import date as PyDate, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.models.invoice import Invoice, InvoiceLine
from app.models.contact import Contact
from app.models.product import Product
from app.models.account import Account
from app.models.journal import Journal
from app.models.journal_entry import JournalEntry
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceLineCreate
from app.services.journal_entry_service import (
    create_invoice_journal_entry,
    create_bill_journal_entry,
    cancel_journal_entry,
)


def _validate_contact(db: Session, contact_id: int, invoice_type: str) -> Contact:
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise ValueError(f"Contact with id {contact_id} does not exist.")
    if not contact.is_active:
        raise ValueError(f"Contact '{contact.name}' is inactive and cannot be used.")

    ctype = (contact.contact_type or contact.type or "").lower()
    if invoice_type == "customer_invoice":
        if ctype not in ("customer", "both", "client"):
            raise ValueError(
                f"Contact '{contact.name}' (type: {contact.contact_type}) is not a customer."
            )
    elif invoice_type == "vendor_bill":
        if ctype not in ("vendor", "supplier", "both"):
            raise ValueError(
                f"Contact '{contact.name}' (type: {contact.contact_type}) is not a vendor."
            )
    return contact


def _process_lines(
    db: Session,
    lines_data: List[InvoiceLineCreate],
    invoice_type: str,
) -> Tuple[List[Dict[str, Any]], Decimal, Decimal, Decimal]:
    processed = []
    subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")

    for line in lines_data:
        prod = None
        unit_price = line.unit_price
        tax_rate = line.tax_rate
        description = (line.description or "").strip()

        if line.product_id:
            prod = db.query(Product).filter(Product.id == line.product_id).first()
            if not prod:
                raise ValueError(f"Product with id {line.product_id} does not exist.")
            if not prod.is_active:
                raise ValueError(f"Product '{prod.name}' is inactive and cannot be invoiced.")

            if not description:
                description = prod.name

            # Default price if 0
            if unit_price == Decimal("0.00"):
                if invoice_type == "customer_invoice":
                    unit_price = prod.sale_price or prod.sales_price or Decimal("0.00")
                else:
                    unit_price = prod.purchase_price or Decimal("0.00")

            # Default tax rate if 0
            if tax_rate == Decimal("0.00") and prod.tax_rate and prod.tax_rate > Decimal("0.00"):
                tax_rate = prod.tax_rate

        if not description and prod:
            description = prod.name

        # Ensure account if given exists and is active
        if line.account_id:
            acc = db.query(Account).filter(Account.id == line.account_id).first()
            if not acc:
                raise ValueError(f"Account with id {line.account_id} does not exist.")
            if not acc.is_active:
                raise ValueError(f"Account '{acc.name}' is inactive and cannot be used.")

        net = (line.quantity * unit_price).quantize(Decimal("0.01"))
        tax_amt = (net * (tax_rate / Decimal("100.00"))).quantize(Decimal("0.01"))
        line_total = net + tax_amt

        subtotal += net
        total_tax += tax_amt

        processed.append({
            "product_id": line.product_id,
            "description": description or None,
            "quantity": line.quantity,
            "unit_price": unit_price,
            "tax_rate": tax_rate,
            "line_total": line_total,
            "account_id": line.account_id,
        })

    total = subtotal + total_tax
    return processed, subtotal, total_tax, total


def _generate_invoice_number(db: Session, invoice_type: str, custom_number: Optional[str] = None) -> str:
    if custom_number and custom_number.strip():
        num = custom_number.strip()
        existing = db.query(Invoice).filter(Invoice.invoice_number == num).first()
        if existing:
            raise ValueError(f"Invoice number '{num}' is already in use.")
        return num

    prefix = "INV" if invoice_type == "customer_invoice" else "BILL"
    count = db.query(Invoice).filter(Invoice.invoice_type == invoice_type).count()
    candidate = f"{prefix}-{count + 1:04d}"

    while db.query(Invoice).filter(Invoice.invoice_number == candidate).first():
        count += 1
        candidate = f"{prefix}-{count + 1:04d}"

    return candidate


def _resolve_customer_invoice_accounts(db: Session, invoice: Invoice) -> Tuple[Journal, int, int, Optional[int]]:
    # 1. Journal: Sales journal
    journal = db.query(Journal).filter(
        Journal.is_active == True,
        Journal.journal_type.ilike("sales%")
    ).first()
    if not journal:
        journal = db.query(Journal).filter(Journal.is_active == True).first()
    if not journal:
        raise ValueError("No active Journal available for posting customer invoice.")

    # 2. Receivable Account (Debit)
    receivable_account = None
    if journal.default_debit_account and journal.default_debit_account.is_active:
        receivable_account = journal.default_debit_account
    if not receivable_account:
        receivable_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "asset",
            or_(
                Account.name.ilike("%receivable%"),
                Account.name.ilike("%debtor%"),
                Account.code.ilike("10%"),
            )
        ).first()
    if not receivable_account:
        receivable_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "asset"
        ).first()
    if not receivable_account:
        raise ValueError("No active Accounts Receivable (asset) account found.")

    # 3. Income Account (Credit)
    income_account = None
    # Check line-level account or product income account
    for line in invoice.lines:
        if line.account_id:
            acc = db.query(Account).filter(Account.id == line.account_id, Account.is_active == True).first()
            if acc:
                income_account = acc
                break
        if line.product and line.product.income_account_id:
            acc = db.query(Account).filter(Account.id == line.product.income_account_id, Account.is_active == True).first()
            if acc:
                income_account = acc
                break

    if not income_account and journal.default_credit_account and journal.default_credit_account.is_active:
        income_account = journal.default_credit_account

    if not income_account:
        income_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "income",
            or_(
                Account.name.ilike("%sales%"),
                Account.name.ilike("%revenue%"),
                Account.name.ilike("%income%"),
                Account.code.ilike("40%"),
            )
        ).first()
    if not income_account:
        income_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "income"
        ).first()
    if not income_account:
        raise ValueError("No active Sales Revenue (income) account found.")

    # 4. Tax Account (Credit) if tax > 0
    tax_account = None
    if invoice.tax > Decimal("0.00"):
        tax_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "liability",
            or_(
                Account.name.ilike("%tax%"),
                Account.name.ilike("%gst%"),
                Account.name.ilike("%vat%"),
                Account.name.ilike("%payable%"),
            )
        ).first()
        if not tax_account:
            tax_account = db.query(Account).filter(
                Account.is_active == True,
                Account.account_type == "liability"
            ).first()
        if not tax_account:
            # Fallback to any active account matching tax
            tax_account = db.query(Account).filter(
                Account.is_active == True,
                Account.name.ilike("%tax%")
            ).first()
        if not tax_account:
            raise ValueError("No active Tax Payable (liability) account found for tax amount.")

    return journal, receivable_account.id, income_account.id, (tax_account.id if tax_account else None)


def _resolve_vendor_bill_accounts(db: Session, invoice: Invoice) -> Tuple[Journal, int, int, Optional[int]]:
    # 1. Journal: Purchase journal
    journal = db.query(Journal).filter(
        Journal.is_active == True,
        Journal.journal_type.ilike("purchase%")
    ).first()
    if not journal:
        journal = db.query(Journal).filter(Journal.is_active == True).first()
    if not journal:
        raise ValueError("No active Journal available for posting vendor bill.")

    # 2. Payable Account (Credit)
    payable_account = None
    if journal.default_credit_account and journal.default_credit_account.is_active:
        payable_account = journal.default_credit_account
    if not payable_account:
        payable_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "liability",
            or_(
                Account.name.ilike("%payable%"),
                Account.name.ilike("%creditor%"),
                Account.code.ilike("20%"),
            )
        ).first()
    if not payable_account:
        payable_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "liability"
        ).first()
    if not payable_account:
        raise ValueError("No active Accounts Payable (liability) account found.")

    # 3. Expense Account (Debit)
    expense_account = None
    for line in invoice.lines:
        if line.account_id:
            acc = db.query(Account).filter(Account.id == line.account_id, Account.is_active == True).first()
            if acc:
                expense_account = acc
                break
        if line.product and line.product.expense_account_id:
            acc = db.query(Account).filter(Account.id == line.product.expense_account_id, Account.is_active == True).first()
            if acc:
                expense_account = acc
                break

    if not expense_account and journal.default_debit_account and journal.default_debit_account.is_active:
        expense_account = journal.default_debit_account

    if not expense_account:
        expense_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "expense",
            or_(
                Account.name.ilike("%purchase%"),
                Account.name.ilike("%expense%"),
                Account.name.ilike("%cost%"),
                Account.code.ilike("50%"),
            )
        ).first()
    if not expense_account:
        expense_account = db.query(Account).filter(
            Account.is_active == True,
            Account.account_type == "expense"
        ).first()
    if not expense_account:
        raise ValueError("No active Expense/Purchase account found.")

    # 4. Tax Account (Debit) if tax > 0
    tax_account = None
    if invoice.tax > Decimal("0.00"):
        tax_account = db.query(Account).filter(
            Account.is_active == True,
            or_(
                Account.name.ilike("%input%"),
                Account.name.ilike("%tax receivable%"),
                Account.name.ilike("%purchase tax%"),
                Account.name.ilike("%gst%"),
                Account.name.ilike("%tax%"),
            )
        ).first()
        if not tax_account:
            tax_account = db.query(Account).filter(
                Account.is_active == True,
                Account.account_type.in_(["asset", "liability"])
            ).first()
        if not tax_account:
            raise ValueError("No active Tax Input account found for tax amount.")

    return journal, payable_account.id, expense_account.id, (tax_account.id if tax_account else None)


# ── CRUD Services ────────────────────────────────────────────────────────────

def create_invoice(
    db: Session,
    invoice_data: InvoiceCreate,
    user_id: Optional[int] = None,
) -> Invoice:
    # 1. Validate contact
    _validate_contact(db, invoice_data.contact_id, invoice_data.invoice_type)

    # 2. Process lines and calculate totals
    processed_lines, subtotal, tax, total = _process_lines(
        db, invoice_data.lines, invoice_data.invoice_type
    )

    # 3. Generate invoice number
    inv_num = _generate_invoice_number(
        db, invoice_data.invoice_type, invoice_data.invoice_number
    )

    inv_date = invoice_data.invoice_date or PyDate.today()
    due_date = invoice_data.due_date

    try:
        new_invoice = Invoice(
            invoice_number=inv_num,
            invoice_type=invoice_data.invoice_type,
            contact_id=invoice_data.contact_id,
            invoice_date=inv_date,
            due_date=due_date,
            status="draft",
            subtotal=subtotal,
            tax=tax,
            total=total,
            created_by=user_id,
        )
        db.add(new_invoice)
        db.flush()

        for pl in processed_lines:
            line_obj = InvoiceLine(
                invoice_id=new_invoice.id,
                product_id=pl["product_id"],
                description=pl["description"],
                quantity=pl["quantity"],
                unit_price=pl["unit_price"],
                tax_rate=pl["tax_rate"],
                line_total=pl["line_total"],
                account_id=pl["account_id"],
            )
            db.add(line_obj)

        db.commit()
        db.refresh(new_invoice)
        return new_invoice
    except Exception:
        db.rollback()
        raise


def get_invoice(db: Session, invoice_id: int) -> Optional[Invoice]:
    return db.query(Invoice).filter(Invoice.id == invoice_id).first()


def get_invoices(
    db: Session,
    invoice_type: Optional[str] = None,
    status: Optional[str] = None,
    contact_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[Invoice], int]:
    query = db.query(Invoice)

    if invoice_type:
        query = query.filter(Invoice.invoice_type == invoice_type.strip().lower())

    if status:
        query = query.filter(Invoice.status == status.strip().lower())

    if contact_id:
        query = query.filter(Invoice.contact_id == contact_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(term),
                Invoice.contact.has(Contact.name.ilike(term)),
            )
        )

    total = query.count()
    invoices = query.order_by(desc(Invoice.id)).offset(skip).limit(limit).all()
    return invoices, total


def update_invoice(
    db: Session,
    invoice_id: int,
    update_data: InvoiceUpdate,
    user_id: Optional[int] = None,
) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise ValueError(f"Invoice with id {invoice_id} does not exist.")

    if invoice.status != "draft":
        raise ValueError(f"Only draft invoices can be edited. Current status: '{invoice.status}'")

    try:
        if update_data.contact_id is not None:
            _validate_contact(db, update_data.contact_id, invoice.invoice_type)
            invoice.contact_id = update_data.contact_id

        if update_data.invoice_date is not None:
            invoice.invoice_date = update_data.invoice_date

        if update_data.due_date is not None:
            invoice.due_date = update_data.due_date

        if update_data.lines is not None:
            processed_lines, subtotal, tax, total = _process_lines(
                db, update_data.lines, invoice.invoice_type
            )
            # Remove old lines
            db.query(InvoiceLine).filter(InvoiceLine.invoice_id == invoice.id).delete()
            db.flush()

            # Add new lines
            for pl in processed_lines:
                line_obj = InvoiceLine(
                    invoice_id=invoice.id,
                    product_id=pl["product_id"],
                    description=pl["description"],
                    quantity=pl["quantity"],
                    unit_price=pl["unit_price"],
                    tax_rate=pl["tax_rate"],
                    line_total=pl["line_total"],
                    account_id=pl["account_id"],
                )
                db.add(line_obj)

            invoice.subtotal = subtotal
            invoice.tax = tax
            invoice.total = total

        db.commit()
        db.refresh(invoice)
        return invoice
    except Exception:
        db.rollback()
        raise


def post_invoice(
    db: Session,
    invoice_id: int,
    user_id: Optional[int] = None,
) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise ValueError(f"Invoice with id {invoice_id} does not exist.")

    if invoice.status != "draft":
        raise ValueError(f"Only draft invoices can be posted. Current status: '{invoice.status}'")

    if not invoice.lines:
        raise ValueError("Cannot post an invoice without line items.")

    try:
        # Create balanced journal entry via accounting service
        if invoice.invoice_type == "customer_invoice":
            journal, receivable_acc_id, income_acc_id, tax_acc_id = _resolve_customer_invoice_accounts(db, invoice)
            entry = create_invoice_journal_entry(
                db=db,
                journal_id=journal.id,
                invoice_ref=invoice.invoice_number,
                invoice_date=invoice.invoice_date,
                receivable_account_id=receivable_acc_id,
                income_account_id=income_acc_id,
                amount=invoice.total,
                tax_account_id=tax_acc_id,
                tax_amount=invoice.tax,
                description=f"Customer Invoice {invoice.invoice_number}",
                created_by=user_id,
                auto_post=True,
            )
        else:  # vendor_bill
            journal, payable_acc_id, expense_acc_id, tax_acc_id = _resolve_vendor_bill_accounts(db, invoice)
            entry = create_bill_journal_entry(
                db=db,
                journal_id=journal.id,
                bill_ref=invoice.invoice_number,
                bill_date=invoice.invoice_date,
                payable_account_id=payable_acc_id,
                expense_account_id=expense_acc_id,
                amount=invoice.total,
                tax_account_id=tax_acc_id,
                tax_amount=invoice.tax,
                description=f"Vendor Bill {invoice.invoice_number}",
                created_by=user_id,
                auto_post=True,
            )

        invoice.journal_entry_id = entry.id
        invoice.status = "posted"

        db.commit()
        db.refresh(invoice)
        return invoice
    except Exception:
        db.rollback()
        raise


def cancel_invoice(
    db: Session,
    invoice_id: int,
    user_id: Optional[int] = None,
) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise ValueError(f"Invoice with id {invoice_id} does not exist.")

    if invoice.status == "cancelled":
        raise ValueError("Invoice is already cancelled.")

    if invoice.status == "paid":
        raise ValueError("Cannot cancel a paid invoice directly. Cancel payments first.")

    try:
        if invoice.status == "posted" and invoice.journal_entry_id:
            # Reverse the posted accounting journal entry
            cancel_journal_entry(db, invoice.journal_entry_id, user_id=user_id)

        invoice.status = "cancelled"
        db.commit()
        db.refresh(invoice)
        return invoice
    except Exception:
        db.rollback()
        raise
