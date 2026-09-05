import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.account import Account
from app.models.analytic_account import AnalyticAccount
from app.models.journal import Journal
from app.models.journal_entry import JournalEntry, JournalEntryLine
from app.models.budget import Budget, BudgetLine
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)


class TestAccountingReports:
    @classmethod
    def setup_class(cls):
        cls.db = SessionLocal()
        cls.suffix = uuid.uuid4().hex[:6]
        cls.password = "SecurePass123!"

        # 1. Setup Users
        cls.admin_user = create_user(
            cls.db,
            UserCreate(
                name="Report Admin",
                login_id=f"adm_rep_{cls.suffix}",
                email=f"adm_rep_{cls.suffix}@urbanfurniture.com",
                password=cls.password,
                confirm_password=cls.password,
                role="admin",
            ),
        )
        cls.regular_user = create_user(
            cls.db,
            UserCreate(
                name="Report User",
                login_id=f"usr_rep_{cls.suffix}",
                email=f"usr_rep_{cls.suffix}@urbanfurniture.com",
                password=cls.password,
                confirm_password=cls.password,
                role="user",
            ),
        )

        # 2. Setup Chart of Accounts
        acc_bank = Account(
            code=f"101_{cls.suffix}".upper(),
            name=f"Bank {cls.suffix}",
            account_name=f"Bank {cls.suffix}",
            account_type="asset",
            is_active=True,
        )
        acc_payable = Account(
            code=f"201_{cls.suffix}".upper(),
            name=f"Accounts Payable {cls.suffix}",
            account_name=f"Accounts Payable {cls.suffix}",
            account_type="liability",
            is_active=True,
        )
        acc_equity = Account(
            code=f"301_{cls.suffix}".upper(),
            name=f"Owner Capital {cls.suffix}",
            account_name=f"Owner Capital {cls.suffix}",
            account_type="equity",
            is_active=True,
        )
        acc_sales = Account(
            code=f"401_{cls.suffix}".upper(),
            name=f"Sales Income {cls.suffix}",
            account_name=f"Sales Income {cls.suffix}",
            account_type="income",
            is_active=True,
        )
        acc_expense = Account(
            code=f"501_{cls.suffix}".upper(),
            name=f"Rent Expense {cls.suffix}",
            account_name=f"Rent Expense {cls.suffix}",
            account_type="expense",
            is_active=True,
        )
        cls.db.add_all([acc_bank, acc_payable, acc_equity, acc_sales, acc_expense])

        # 3. Setup Analytic Account
        analytic_acc = AnalyticAccount(
            code=f"REP_ANA_{cls.suffix}".upper(),
            name=f"Operations Analytic {cls.suffix}",
            description="Analytic for operations",
            is_active=True,
        )
        cls.db.add(analytic_acc)
        cls.db.commit()

        cls.db.refresh(acc_bank)
        cls.db.refresh(acc_payable)
        cls.db.refresh(acc_equity)
        cls.db.refresh(acc_sales)
        cls.db.refresh(acc_expense)
        cls.db.refresh(analytic_acc)

        cls.bank_id = acc_bank.id
        cls.payable_id = acc_payable.id
        cls.equity_id = acc_equity.id
        cls.sales_id = acc_sales.id
        cls.expense_id = acc_expense.id
        cls.analytic_id = analytic_acc.id

        # 4. Setup Journal
        journal = Journal(
            journal_name=f"Report Journal {cls.suffix}",
            journal_type="General",
            default_debit_account_id=cls.bank_id,
            default_credit_account_id=cls.sales_id,
            is_active=True,
        )
        cls.db.add(journal)
        cls.db.commit()
        cls.db.refresh(journal)
        cls.journal_id = journal.id

        # 5. Setup Budget for Expense Account (Planned: 5,000.00)
        cls.today = date.today()
        budget = Budget(
            name=f"Operations Budget {cls.suffix}",
            analytic_account_id=cls.analytic_id,
            start_date=cls.today - timedelta(days=10),
            end_date=cls.today + timedelta(days=20),
            status="active",
            total_amount=Decimal("5000.00"),
        )
        cls.db.add(budget)
        cls.db.flush()

        b_line = BudgetLine(
            budget_id=budget.id,
            account_id=cls.expense_id,
            planned_amount=Decimal("5000.00"),
            period="Monthly",
        )
        cls.db.add(b_line)
        cls.db.commit()
        cls.db.refresh(budget)
        cls.budget_id = budget.id

        # 6. Post known Journal Entries
        # Entry 1: Capital Contribution (50,000)
        e1 = JournalEntry(
            journal_id=cls.journal_id,
            entry_date=cls.today,
            date=cls.today,
            reference=f"CAP-{cls.suffix}",
            status="posted",
        )
        cls.db.add(e1)
        cls.db.flush()
        cls.db.add_all([
            JournalEntryLine(journal_entry_id=e1.id, account_id=cls.bank_id, debit=Decimal("50000.00"), credit=Decimal("0.00")),
            JournalEntryLine(journal_entry_id=e1.id, account_id=cls.equity_id, debit=Decimal("0.00"), credit=Decimal("50000.00")),
        ])

        # Entry 2: Sales Income (10,000)
        e2 = JournalEntry(
            journal_id=cls.journal_id,
            entry_date=cls.today,
            date=cls.today,
            reference=f"SALE-{cls.suffix}",
            status="posted",
        )
        cls.db.add(e2)
        cls.db.flush()
        cls.db.add_all([
            JournalEntryLine(journal_entry_id=e2.id, account_id=cls.bank_id, debit=Decimal("10000.00"), credit=Decimal("0.00")),
            JournalEntryLine(journal_entry_id=e2.id, account_id=cls.sales_id, debit=Decimal("0.00"), credit=Decimal("10000.00")),
        ])

        # Entry 3: Rent Expense paid with Bank (3,000) - linked to analytic account
        e3 = JournalEntry(
            journal_id=cls.journal_id,
            entry_date=cls.today,
            date=cls.today,
            reference=f"RENT-{cls.suffix}",
            status="posted",
        )
        cls.db.add(e3)
        cls.db.flush()
        cls.db.add_all([
            JournalEntryLine(journal_entry_id=e3.id, account_id=cls.expense_id, analytic_account_id=cls.analytic_id, debit=Decimal("3000.00"), credit=Decimal("0.00")),
            JournalEntryLine(journal_entry_id=e3.id, account_id=cls.bank_id, debit=Decimal("0.00"), credit=Decimal("3000.00")),
        ])

        # Entry 4: Vendor invoice on credit (1,000) - linked to analytic account
        e4 = JournalEntry(
            journal_id=cls.journal_id,
            entry_date=cls.today,
            date=cls.today,
            reference=f"BILL-{cls.suffix}",
            status="posted",
        )
        cls.db.add(e4)
        cls.db.flush()
        cls.db.add_all([
            JournalEntryLine(journal_entry_id=e4.id, account_id=cls.expense_id, analytic_account_id=cls.analytic_id, debit=Decimal("1000.00"), credit=Decimal("0.00")),
            JournalEntryLine(journal_entry_id=e4.id, account_id=cls.payable_id, debit=Decimal("0.00"), credit=Decimal("1000.00")),
        ])

        # Entry 5: DRAFT entry (MUST BE IGNORED BY ALL REPORTS)
        e5 = JournalEntry(
            journal_id=cls.journal_id,
            entry_date=cls.today,
            date=cls.today,
            reference=f"DRAFT-{cls.suffix}",
            status="draft",
        )
        cls.db.add(e5)
        cls.db.flush()
        cls.db.add_all([
            JournalEntryLine(journal_entry_id=e5.id, account_id=cls.bank_id, debit=Decimal("99999.00"), credit=Decimal("0.00")),
            JournalEntryLine(journal_entry_id=e5.id, account_id=cls.sales_id, debit=Decimal("0.00"), credit=Decimal("99999.00")),
        ])

        # Entry 6: CANCELLED entry (MUST BE IGNORED BY ALL REPORTS)
        e6 = JournalEntry(
            journal_id=cls.journal_id,
            entry_date=cls.today,
            date=cls.today,
            reference=f"CANCEL-{cls.suffix}",
            status="cancelled",
        )
        cls.db.add(e6)
        cls.db.flush()
        cls.db.add_all([
            JournalEntryLine(journal_entry_id=e6.id, account_id=cls.bank_id, debit=Decimal("88888.00"), credit=Decimal("0.00")),
            JournalEntryLine(journal_entry_id=e6.id, account_id=cls.sales_id, debit=Decimal("0.00"), credit=Decimal("88888.00")),
        ])

        cls.db.commit()
        cls.db.close()

        # Login tokens
        res_admin = client.post("/api/auth/login", json={"login_id": f"adm_rep_{cls.suffix}", "password": cls.password})
        assert res_admin.status_code == 200
        cls.admin_headers = {"Authorization": f"Bearer {res_admin.json()['access_token']}"}

        res_usr = client.post("/api/auth/login", json={"login_id": f"usr_rep_{cls.suffix}", "password": cls.password})
        assert res_usr.status_code == 200
        cls.user_headers = {"Authorization": f"Bearer {res_usr.json()['access_token']}"}

    def test_trial_balance(self):
        res = client.get(
            f"/api/reports/trial-balance?start_date={self.today}&end_date={self.today}",
            headers=self.user_headers,
        )
        assert res.status_code == 200
        data = res.json()

        # Filter items for our suffix
        items_map = {i["account_id"]: i for i in data["items"]}

        # 1. Bank Account (Asset): Debit 60,000, Credit 3,000 -> Balance = 57,000
        bank_item = items_map[self.bank_id]
        assert Decimal(str(bank_item["debit"])) == Decimal("60000.00")
        assert Decimal(str(bank_item["credit"])) == Decimal("3000.00")
        assert Decimal(str(bank_item["balance"])) == Decimal("57000.00")

        # 2. Accounts Payable (Liability): Debit 0, Credit 1,000 -> Balance = 1,000
        payable_item = items_map[self.payable_id]
        assert Decimal(str(payable_item["debit"])) == Decimal("0.00")
        assert Decimal(str(payable_item["credit"])) == Decimal("1000.00")
        assert Decimal(str(payable_item["balance"])) == Decimal("1000.00")

        # 3. Owner Capital (Equity): Debit 0, Credit 50,000 -> Balance = 50,000
        equity_item = items_map[self.equity_id]
        assert Decimal(str(equity_item["debit"])) == Decimal("0.00")
        assert Decimal(str(equity_item["credit"])) == Decimal("50000.00")
        assert Decimal(str(equity_item["balance"])) == Decimal("50000.00")

        # 4. Sales Income (Income): Debit 0, Credit 10,000 -> Balance = 10,000
        sales_item = items_map[self.sales_id]
        assert Decimal(str(sales_item["debit"])) == Decimal("0.00")
        assert Decimal(str(sales_item["credit"])) == Decimal("10000.00")
        assert Decimal(str(sales_item["balance"])) == Decimal("10000.00")

        # 5. Rent Expense (Expense): Debit 4,000, Credit 0 -> Balance = 4,000
        expense_item = items_map[self.expense_id]
        assert Decimal(str(expense_item["debit"])) == Decimal("4000.00")
        assert Decimal(str(expense_item["credit"])) == Decimal("0.00")
        assert Decimal(str(expense_item["balance"])) == Decimal("4000.00")

        # Verify Total Debits == Total Credits across all posted items
        assert Decimal(str(data["total_debit"])) == Decimal(str(data["total_credit"]))

    def test_balance_sheet(self):
        res = client.get(
            f"/api/reports/balance-sheet?start_date={self.today}&end_date={self.today}",
            headers=self.user_headers,
        )
        assert res.status_code == 200
        data = res.json()

        assets_map = {a["account_id"]: a for a in data["assets"]}
        liabilities_map = {l["account_id"]: l for l in data["liabilities"]}
        equity_map = {e["account_id"]: e for e in data["equity"]}

        # Bank asset = 57,000
        assert Decimal(str(assets_map[self.bank_id]["balance"])) == Decimal("57000.00")

        # Accounts payable liability = 1,000
        assert Decimal(str(liabilities_map[self.payable_id]["balance"])) == Decimal("1000.00")

        # Owner capital equity = 50,000
        assert Decimal(str(equity_map[self.equity_id]["balance"])) == Decimal("50000.00")

        # Verify Balance Sheet Fundamental Accounting Equation: Assets = Liabilities + Equity
        assert Decimal(str(data["total_assets"])) == Decimal(str(data["total_liabilities_and_equity"]))
        assert data["is_balanced"] is True

    def test_profit_and_loss(self):
        res = client.get(
            f"/api/reports/profit-loss?start_date={self.today}&end_date={self.today}",
            headers=self.user_headers,
        )
        assert res.status_code == 200
        data = res.json()

        income_map = {i["account_id"]: i for i in data["income"]}
        expense_map = {e["account_id"]: e for e in data["expenses"]}

        # Sales Income = 10,000
        assert Decimal(str(income_map[self.sales_id]["amount"])) == Decimal("10000.00")

        # Rent Expense = 4,000
        assert Decimal(str(expense_map[self.expense_id]["amount"])) == Decimal("4000.00")

        # Verify net profit formula for the report
        assert Decimal(str(data["net_profit"])) == Decimal(str(data["total_income"])) - Decimal(str(data["total_expenses"]))
        assert Decimal(str(data["net_profit_loss"])) == Decimal(str(data["net_profit"]))


    def test_budget_report(self):
        res = client.get(
            f"/api/reports/budget?budget_id={self.budget_id}&start_date={self.today}&end_date={self.today}",
            headers=self.user_headers,
        )
        assert res.status_code == 200
        data = res.json()

        assert data["budget_id"] == self.budget_id
        items_map = {i["account_id"]: i for i in data["items"]}

        # Rent Expense: Planned = 5,000.00, Actual = 4,000.00, Variance = 1,000.00
        expense_rep = items_map[self.expense_id]
        assert Decimal(str(expense_rep["planned"])) == Decimal("5000.00")
        assert Decimal(str(expense_rep["actual"])) == Decimal("4000.00")
        assert Decimal(str(expense_rep["variance"])) == Decimal("1000.00")

        assert Decimal(str(data["total_planned"])) == Decimal("5000.00")
        assert Decimal(str(data["total_actual"])) == Decimal("4000.00")
        assert Decimal(str(data["total_variance"])) == Decimal("1000.00")

    def test_reports_date_filtering(self):
        # Queries for dates with 0 entries (1 year ago)
        past_date = self.today - timedelta(days=365)
        res = client.get(
            f"/api/reports/profit-loss?start_date={past_date}&end_date={past_date}",
            headers=self.user_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert Decimal(str(data["net_profit"])) == Decimal("0.00")

    def test_reports_rbac(self):
        # 1. Unauthenticated trial balance -> 401
        res_unauth1 = client.get("/api/reports/trial-balance")
        assert res_unauth1.status_code == 401

        # 2. Unauthenticated balance sheet -> 401
        res_unauth2 = client.get("/api/reports/balance-sheet")
        assert res_unauth2.status_code == 401

        # 3. Unauthenticated profit-loss -> 401
        res_unauth3 = client.get("/api/reports/profit-loss")
        assert res_unauth3.status_code == 401

        # 4. Unauthenticated budget report -> 401
        res_unauth4 = client.get("/api/reports/budget")
        assert res_unauth4.status_code == 401

        # 5. Authenticated regular user -> 200 on all reports
        assert client.get("/api/reports/trial-balance", headers=self.user_headers).status_code == 200
        assert client.get("/api/reports/balance-sheet", headers=self.user_headers).status_code == 200
        assert client.get("/api/reports/profit-loss", headers=self.user_headers).status_code == 200
        assert client.get("/api/reports/budget", headers=self.user_headers).status_code == 200
