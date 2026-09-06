from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.contact import Contact
from app.models.product import Product
from app.models.account import Account
from app.models.sales_order import SalesOrder
from app.models.purchase_order import PurchaseOrder
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.budget import Budget, BudgetLine
from app.models.journal_entry import JournalEntry, JournalEntryLine
from app.services.report_service import _get_account_balances
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    RecentTransactionsResponse,
    RecentInvoiceItem,
    RecentPaymentItem,
    RecentJournalEntryItem,
)


def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    """
    Computes summary metrics for dashboard:
    - total_customers, total_vendors, total_products, total_accounts
    - total_sales, total_purchases
    - outstanding_invoices, outstanding_bills
    - total_income, total_expenses, net_profit, cash_bank_balance (from POSTED journal entries)
    """
    # 1. Entity Counts
    total_customers = db.query(Contact).filter(Contact.contact_type == "customer").count()
    total_vendors = db.query(Contact).filter(Contact.contact_type == "vendor").count()
    total_products = db.query(Product).count()
    total_accounts = db.query(Account).count()

    # 2. Sales & Purchases Totals
    # Customer invoices posted/paid
    inv_sales = db.query(func.coalesce(func.sum(Invoice.total), Decimal("0.00"))).filter(
        Invoice.invoice_type == "customer_invoice",
        Invoice.status.in_(["posted", "paid"]),
    ).scalar() or Decimal("0.00")

    so_sales = db.query(func.coalesce(func.sum(SalesOrder.total), Decimal("0.00"))).filter(
        SalesOrder.status == "confirmed"
    ).scalar() or Decimal("0.00")

    total_sales = Decimal(str(inv_sales)) if Decimal(str(inv_sales)) > Decimal("0.00") else Decimal(str(so_sales))

    # Vendor bills posted/paid
    bill_purchases = db.query(func.coalesce(func.sum(Invoice.total), Decimal("0.00"))).filter(
        Invoice.invoice_type == "vendor_bill",
        Invoice.status.in_(["posted", "paid"]),
    ).scalar() or Decimal("0.00")

    po_purchases = db.query(func.coalesce(func.sum(PurchaseOrder.total), Decimal("0.00"))).filter(
        PurchaseOrder.status == "confirmed"
    ).scalar() or Decimal("0.00")

    total_purchases = Decimal(str(bill_purchases)) if Decimal(str(bill_purchases)) > Decimal("0.00") else Decimal(str(po_purchases))

    # 3. Outstanding Invoices & Bills (posted, not yet paid)
    outstanding_invoices = db.query(func.coalesce(func.sum(Invoice.total), Decimal("0.00"))).filter(
        Invoice.invoice_type == "customer_invoice",
        Invoice.status == "posted",
    ).scalar() or Decimal("0.00")

    outstanding_bills = db.query(func.coalesce(func.sum(Invoice.total), Decimal("0.00"))).filter(
        Invoice.invoice_type == "vendor_bill",
        Invoice.status == "posted",
    ).scalar() or Decimal("0.00")

    # 4. Accounting figures from POSTED journal entries only
    balances = _get_account_balances(db)
    accounts = db.query(Account).all()

    total_income = Decimal("0.00")
    total_expenses = Decimal("0.00")
    cash_bank_balance = Decimal("0.00")

    for acc in accounts:
        sum_debit, sum_credit = balances.get(acc.id, (Decimal("0.00"), Decimal("0.00")))
        acc_type = (acc.account_type or "").lower().strip()

        if acc_type == "income":
            total_income += (sum_credit - sum_debit)
        elif acc_type == "expense":
            total_expenses += (sum_debit - sum_credit)
        elif acc_type == "asset":
            cash_bank_balance += (sum_debit - sum_credit)

    net_profit = total_income - total_expenses

    # 5. Order & Budget Breakdown Metrics (matching wireframe)
    sales_all_count = db.query(SalesOrder).count()
    sales_confirmed_count = db.query(SalesOrder).filter(SalesOrder.status == "confirmed").count()
    sales_draft_count = db.query(SalesOrder).filter(SalesOrder.status == "draft").count()

    purchase_all_count = db.query(PurchaseOrder).count()
    purchase_confirmed_count = db.query(PurchaseOrder).filter(PurchaseOrder.status == "confirmed").count()
    purchase_draft_count = db.query(PurchaseOrder).filter(PurchaseOrder.status == "draft").count()

    budget_total_count = db.query(Budget).count()
    budget_achieved_count = db.query(Budget).filter(Budget.status.in_(["closed", "active"])).count()
    budget_committed_count = db.query(BudgetLine).count()

    return DashboardSummaryResponse(
        total_customers=total_customers,
        total_vendors=total_vendors,
        total_products=total_products,
        total_accounts=total_accounts,
        total_sales=Decimal(str(total_sales)),
        total_purchases=Decimal(str(total_purchases)),
        outstanding_invoices=Decimal(str(outstanding_invoices)),
        outstanding_bills=Decimal(str(outstanding_bills)),
        total_income=total_income,
        total_expenses=total_expenses,
        net_profit=net_profit,
        cash_bank_balance=cash_bank_balance,
        sales_all_count=sales_all_count,
        sales_confirmed_count=sales_confirmed_count,
        sales_draft_count=sales_draft_count,
        purchase_all_count=purchase_all_count,
        purchase_confirmed_count=purchase_confirmed_count,
        purchase_draft_count=purchase_draft_count,
        budget_achieved_count=budget_achieved_count,
        budget_total_count=budget_total_count,
        budget_committed_count=budget_committed_count,
    )


def get_dashboard_recent_transactions(db: Session, limit: int = 10) -> RecentTransactionsResponse:
    """
    Retrieves the most recent invoices, bills, payments, and journal entries.
    """
    # 1. Recent Invoices
    recent_invoices_db = (
        db.query(Invoice)
        .filter(Invoice.invoice_type == "customer_invoice")
        .order_by(Invoice.created_at.desc(), Invoice.id.desc())
        .limit(limit)
        .all()
    )
    invoices = [
        RecentInvoiceItem(
            id=inv.id,
            invoice_number=inv.invoice_number,
            invoice_type=inv.invoice_type,
            contact_id=inv.contact_id,
            contact_name=inv.contact.name if inv.contact else None,
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            status=inv.status,
            total=inv.total,
            created_at=inv.created_at,
        )
        for inv in recent_invoices_db
    ]

    # 2. Recent Bills
    recent_bills_db = (
        db.query(Invoice)
        .filter(Invoice.invoice_type == "vendor_bill")
        .order_by(Invoice.created_at.desc(), Invoice.id.desc())
        .limit(limit)
        .all()
    )
    bills = [
        RecentInvoiceItem(
            id=bill.id,
            invoice_number=bill.invoice_number,
            invoice_type=bill.invoice_type,
            contact_id=bill.contact_id,
            contact_name=bill.contact.name if bill.contact else None,
            invoice_date=bill.invoice_date,
            due_date=bill.due_date,
            status=bill.status,
            total=bill.total,
            created_at=bill.created_at,
        )
        for bill in recent_bills_db
    ]

    # 3. Recent Payments
    recent_payments_db = (
        db.query(Payment)
        .order_by(Payment.created_at.desc(), Payment.id.desc())
        .limit(limit)
        .all()
    )
    payments = [
        RecentPaymentItem(
            id=pay.id,
            payment_number=pay.payment_number,
            payment_type=pay.payment_type,
            contact_id=pay.contact_id,
            contact_name=pay.contact.name if pay.contact else None,
            payment_date=pay.payment_date,
            amount=pay.amount,
            status=pay.status,
            reference=pay.reference,
            created_at=pay.created_at,
        )
        for pay in recent_payments_db
    ]

    # 4. Recent Journal Entries
    recent_jes_db = (
        db.query(JournalEntry)
        .order_by(JournalEntry.created_at.desc(), JournalEntry.id.desc())
        .limit(limit)
        .all()
    )
    journal_entries = []
    for je in recent_jes_db:
        total_d = sum((Decimal(str(l.debit)) for l in je.lines), Decimal("0.00"))
        total_c = sum((Decimal(str(l.credit)) for l in je.lines), Decimal("0.00"))
        journal_entries.append(
            RecentJournalEntryItem(
                id=je.id,
                journal_id=je.journal_id,
                entry_date=je.entry_date,
                reference=je.reference,
                description=je.description,
                status=je.status,
                total_debit=total_d,
                total_credit=total_c,
                created_at=je.created_at,
            )
        )

    return RecentTransactionsResponse(
        invoices=invoices,
        bills=bills,
        payments=payments,
        journal_entries=journal_entries,
    )
