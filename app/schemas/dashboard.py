from typing import Optional, List
from datetime import date as PyDate, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class DashboardSummaryResponse(BaseModel):
    total_customers: int = 0
    total_vendors: int = 0
    total_products: int = 0
    total_accounts: int = 0
    total_sales: Decimal = Decimal("0.00")
    total_purchases: Decimal = Decimal("0.00")
    outstanding_invoices: Decimal = Decimal("0.00")
    outstanding_bills: Decimal = Decimal("0.00")
    total_income: Decimal = Decimal("0.00")
    total_expenses: Decimal = Decimal("0.00")
    net_profit: Decimal = Decimal("0.00")
    cash_bank_balance: Decimal = Decimal("0.00")
    sales_all_count: int = 0
    sales_confirmed_count: int = 0
    sales_draft_count: int = 0
    purchase_all_count: int = 0
    purchase_confirmed_count: int = 0
    purchase_draft_count: int = 0
    budget_achieved_count: int = 0
    budget_total_count: int = 0
    budget_committed_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class RecentContactSummary(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class RecentInvoiceItem(BaseModel):
    id: int
    invoice_number: str
    invoice_type: str
    contact_id: int
    contact_name: Optional[str] = None
    invoice_date: PyDate
    due_date: Optional[PyDate] = None
    status: str
    total: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecentPaymentItem(BaseModel):
    id: int
    payment_number: str
    payment_type: str
    contact_id: int
    contact_name: Optional[str] = None
    payment_date: PyDate
    amount: Decimal
    status: str
    reference: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecentJournalEntryItem(BaseModel):
    id: int
    journal_id: int
    entry_date: PyDate
    reference: Optional[str] = None
    description: Optional[str] = None
    status: str
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecentTransactionsResponse(BaseModel):
    invoices: List[RecentInvoiceItem] = []
    bills: List[RecentInvoiceItem] = []
    payments: List[RecentPaymentItem] = []
    journal_entries: List[RecentJournalEntryItem] = []
