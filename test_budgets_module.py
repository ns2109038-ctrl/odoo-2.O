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
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)


class TestBudgetsModule:
    @classmethod
    def setup_class(cls):
        cls.db = SessionLocal()
        cls.suffix = uuid.uuid4().hex[:6]
        cls.password = "SecurePass123!"

        # Create test users
        cls.admin_user = create_user(
            cls.db,
            UserCreate(
                name="Budget Admin",
                login_id=f"adm_bgt_{cls.suffix}",
                email=f"adm_bgt_{cls.suffix}@urbanfurniture.com",
                password=cls.password,
                confirm_password=cls.password,
                role="admin",
            ),
        )
        cls.accountant_user = create_user(
            cls.db,
            UserCreate(
                name="Budget Accountant",
                login_id=f"acc_bgt_{cls.suffix}",
                email=f"acc_bgt_{cls.suffix}@urbanfurniture.com",
                password=cls.password,
                confirm_password=cls.password,
                role="accountant",
            ),
        )
        cls.regular_user = create_user(
            cls.db,
            UserCreate(
                name="Budget User",
                login_id=f"usr_bgt_{cls.suffix}",
                email=f"usr_bgt_{cls.suffix}@urbanfurniture.com",
                password=cls.password,
                confirm_password=cls.password,
                role="user",
            ),
        )

        # Create active and inactive accounts
        exp_acc = Account(
            code=f"EXP_{cls.suffix}".upper(),
            name=f"Office Expense {cls.suffix}",
            account_name=f"Office Expense {cls.suffix}",
            account_type="expense",
            is_active=True,
        )
        bnk_acc = Account(
            code=f"BNK_{cls.suffix}".upper(),
            name=f"Bank {cls.suffix}",
            account_name=f"Bank {cls.suffix}",
            account_type="asset",
            is_active=True,
        )
        inact_acc = Account(
            code=f"INACT_{cls.suffix}".upper(),
            name=f"Inactive Expense {cls.suffix}",
            account_name=f"Inactive Expense {cls.suffix}",
            account_type="expense",
            is_active=False,
        )
        cls.db.add_all([exp_acc, bnk_acc, inact_acc])

        # Create active and inactive analytic accounts
        act_ana = AnalyticAccount(
            code=f"BGT_ANA_{cls.suffix}".upper(),
            name=f"Marketing Campaign {cls.suffix}",
            description="Active Marketing Campaign",
            is_active=True,
        )
        inact_ana = AnalyticAccount(
            code=f"BGT_INACT_{cls.suffix}".upper(),
            name=f"Closed Campaign {cls.suffix}",
            description="Inactive Campaign",
            is_active=False,
        )
        cls.db.add_all([act_ana, inact_ana])
        cls.db.commit()

        cls.db.refresh(exp_acc)
        cls.db.refresh(bnk_acc)
        cls.db.refresh(inact_acc)
        cls.db.refresh(act_ana)
        cls.db.refresh(inact_ana)

        cls.expense_account_id = exp_acc.id
        cls.bank_account_id = bnk_acc.id
        cls.inactive_account_id = inact_acc.id
        cls.active_analytic_id = act_ana.id
        cls.inactive_analytic_id = inact_ana.id

        # Create journal for actuals testing
        journal = Journal(
            journal_name=f"Budget Test Journal {cls.suffix}",
            journal_type="General",
            default_debit_account_id=cls.expense_account_id,
            default_credit_account_id=cls.bank_account_id,
            is_active=True,
        )
        cls.db.add(journal)
        cls.db.commit()
        cls.db.refresh(journal)
        cls.journal_id = journal.id

        cls.db.close()

        # Login tokens
        res_acc = client.post("/api/auth/login", json={"login_id": f"acc_bgt_{cls.suffix}", "password": cls.password})
        assert res_acc.status_code == 200
        cls.accountant_token = res_acc.json()["access_token"]
        cls.accountant_headers = {"Authorization": f"Bearer {cls.accountant_token}"}

        res_usr = client.post("/api/auth/login", json={"login_id": f"usr_bgt_{cls.suffix}", "password": cls.password})
        assert res_usr.status_code == 200
        cls.user_token = res_usr.json()["access_token"]
        cls.user_headers = {"Authorization": f"Bearer {cls.user_token}"}

    def test_create_budget_success(self):
        payload = {
            "name": f"Annual Budget {self.suffix}",
            "analytic_account_id": self.active_analytic_id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=90)),
            "lines": [
                {
                    "account_id": self.expense_account_id,
                    "planned_amount": 5000.00,
                    "period": "Q1",
                }
            ],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == payload["name"]
        assert data["status"] == "draft"
        assert Decimal(str(data["total_amount"])) == Decimal("5000.00")
        assert len(data["lines"]) == 1
        assert data["lines"][0]["account_id"] == self.expense_account_id
        assert Decimal(str(data["planned"])) == Decimal("5000.00")

    def test_create_budget_date_validation(self):
        # start_date > end_date
        payload = {
            "name": f"Invalid Dates {self.suffix}",
            "start_date": str(date.today() + timedelta(days=30)),
            "end_date": str(date.today()),
            "lines": [],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code in [400, 422]

    def test_create_budget_blank_name_rejected(self):
        payload = {
            "name": "   ",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "lines": [],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code in [400, 422]

    def test_create_budget_negative_planned_amount_rejected(self):
        payload = {
            "name": f"Negative Budget {self.suffix}",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "lines": [
                {
                    "account_id": self.expense_account_id,
                    "planned_amount": -100.00,
                }
            ],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code in [400, 422]

    def test_create_budget_nonexistent_account_rejected(self):
        payload = {
            "name": f"Invalid Account {self.suffix}",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "lines": [
                {
                    "account_id": 999999,
                    "planned_amount": 1000.00,
                }
            ],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code == 400
        assert "does not exist" in res.json()["detail"].lower()

    def test_create_budget_inactive_account_rejected(self):
        payload = {
            "name": f"Inactive Account {self.suffix}",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "lines": [
                {
                    "account_id": self.inactive_account_id,
                    "planned_amount": 1000.00,
                }
            ],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code == 400
        assert "inactive" in res.json()["detail"].lower()

    def test_create_budget_nonexistent_analytic_rejected(self):
        payload = {
            "name": f"Invalid Analytic {self.suffix}",
            "analytic_account_id": 999999,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "lines": [],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code == 400
        assert "does not exist" in res.json()["detail"].lower()

    def test_create_budget_inactive_analytic_rejected(self):
        payload = {
            "name": f"Inactive Analytic {self.suffix}",
            "analytic_account_id": self.inactive_analytic_id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "lines": [],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code == 400
        assert "inactive" in res.json()["detail"].lower()

    def test_status_transitions_activate_and_close(self):
        # 1. Create draft budget
        payload = {
            "name": f"Lifecycle Budget {self.suffix}",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=60)),
            "lines": [{"account_id": self.expense_account_id, "planned_amount": 3000.00}],
        }
        res = client.post("/api/budgets", json=payload, headers=self.accountant_headers)
        assert res.status_code == 201
        b_id = res.json()["id"]
        assert res.json()["status"] == "draft"

        # 2. Update draft budget
        res_up = client.put(
            f"/api/budgets/{b_id}",
            json={"name": f"Lifecycle Budget Updated {self.suffix}", "lines": [{"account_id": self.expense_account_id, "planned_amount": 4500.00}]},
            headers=self.accountant_headers,
        )
        assert res_up.status_code == 200
        assert res_up.json()["name"] == f"Lifecycle Budget Updated {self.suffix}"
        assert Decimal(str(res_up.json()["total_amount"])) == Decimal("4500.00")

        # 3. Activate budget (draft -> active)
        res_act = client.post(f"/api/budgets/{b_id}/activate", headers=self.accountant_headers)
        assert res_act.status_code == 200
        assert res_act.json()["status"] == "active"

        # 4. Attempt to edit active budget (Forbidden)
        res_edit_act = client.put(f"/api/budgets/{b_id}", json={"name": "Will Fail"}, headers=self.accountant_headers)
        assert res_edit_act.status_code == 400
        assert "cannot edit" in res_edit_act.json()["detail"].lower()

        # 5. Attempt to re-activate active budget
        res_react = client.post(f"/api/budgets/{b_id}/activate", headers=self.accountant_headers)
        assert res_react.status_code == 400
        assert "already active" in res_react.json()["detail"].lower()

        # 6. Close budget (active -> closed)
        res_close = client.post(f"/api/budgets/{b_id}/close", headers=self.accountant_headers)
        assert res_close.status_code == 200
        assert res_close.json()["status"] == "closed"

        # 7. Attempt to activate closed budget
        res_act_closed = client.post(f"/api/budgets/{b_id}/activate", headers=self.accountant_headers)
        assert res_act_closed.status_code == 400
        assert "cannot activate a closed" in res_act_closed.json()["detail"].lower()

        # 8. Attempt to close already closed budget
        res_reclose = client.post(f"/api/budgets/{b_id}/close", headers=self.accountant_headers)
        assert res_reclose.status_code == 400
        assert "already closed" in res_reclose.json()["detail"].lower()

    def test_budget_vs_actual_calculation(self):
        # 1. Create a budget with planned amount 10,000 for expense account
        today = date.today()
        b_name = f"Actuals Test Budget {self.suffix}"
        b_payload = {
            "name": b_name,
            "analytic_account_id": self.active_analytic_id,
            "start_date": str(today - timedelta(days=5)),
            "end_date": str(today + timedelta(days=25)),
            "lines": [
                {
                    "account_id": self.expense_account_id,
                    "planned_amount": 10000.00,
                    "period": "Monthly",
                }
            ],
        }
        res_bgt = client.post("/api/budgets", json=b_payload, headers=self.accountant_headers)
        assert res_bgt.status_code == 201
        b_id = res_bgt.json()["id"]

        # 2. Add a DRAFT journal entry for 2,000 -> Should NOT count in actuals
        res_draft_je = client.post(
            "/api/journal-entries",
            json={
                "journal_id": self.journal_id,
                "entry_date": str(today),
                "status": "draft",
                "lines": [
                    {"account_id": self.expense_account_id, "debit": 2000, "credit": 0, "analytic_account_id": self.active_analytic_id},
                    {"account_id": self.bank_account_id, "debit": 0, "credit": 2000},
                ],
            },
            headers=self.accountant_headers,
        )
        assert res_draft_je.status_code == 201

        # Check budget actuals -> should still be 0.00
        res_chk1 = client.get(f"/api/budgets/{b_id}", headers=self.accountant_headers)
        assert res_chk1.status_code == 200
        data1 = res_chk1.json()
        assert Decimal(str(data1["actual"])) == Decimal("0.00")
        assert Decimal(str(data1["variance"])) == Decimal("10000.00")

        # 3. Add a POSTED journal entry for 3,500 matching date, account, and analytic account -> MUST count
        res_posted_je = client.post(
            "/api/journal-entries",
            json={
                "journal_id": self.journal_id,
                "entry_date": str(today),
                "status": "posted",
                "lines": [
                    {"account_id": self.expense_account_id, "debit": 3500, "credit": 0, "analytic_account_id": self.active_analytic_id},
                    {"account_id": self.bank_account_id, "debit": 0, "credit": 3500},
                ],
            },
            headers=self.accountant_headers,
        )
        assert res_posted_je.status_code == 201

        # 4. Check budget actuals -> actual should be 3,500.00, variance should be 6,500.00
        res_chk2 = client.get(f"/api/budgets/{b_id}", headers=self.accountant_headers)
        assert res_chk2.status_code == 200
        data2 = res_chk2.json()
        assert Decimal(str(data2["planned"])) == Decimal("10000.00")
        assert Decimal(str(data2["actual"])) == Decimal("3500.00")
        assert Decimal(str(data2["variance"])) == Decimal("6500.00")

        # Verify line level
        line2 = data2["lines"][0]
        assert Decimal(str(line2["planned"])) == Decimal("10000.00")
        assert Decimal(str(line2["actual"])) == Decimal("3500.00")
        assert Decimal(str(line2["variance"])) == Decimal("6500.00")

    def test_list_filter_search_and_pagination(self):
        # 1. Search by name
        res_search = client.get(f"/api/budgets?search={self.suffix}", headers=self.accountant_headers)
        assert res_search.status_code == 200
        assert len(res_search.json()) >= 1

        # 2. Filter by status
        res_draft = client.get("/api/budgets?status=draft", headers=self.accountant_headers)
        assert res_draft.status_code == 200
        for b in res_draft.json():
            assert b["status"] == "draft"

        # 3. Filter by analytic_account_id
        res_ana = client.get(f"/api/budgets?analytic_account_id={self.active_analytic_id}", headers=self.accountant_headers)
        assert res_ana.status_code == 200
        for b in res_ana.json():
            assert b["analytic_account_id"] == self.active_analytic_id

        # 4. Pagination
        res_page = client.get("/api/budgets?skip=0&limit=2", headers=self.accountant_headers)
        assert res_page.status_code == 200
        assert len(res_page.json()) <= 2

    def test_rbac_permissions(self):
        # 1. Unauthenticated GET -> 401
        res_unauth_get = client.get("/api/budgets")
        assert res_unauth_get.status_code == 401

        # 2. Unauthenticated POST -> 401
        res_unauth_post = client.post("/api/budgets", json={})
        assert res_unauth_post.status_code == 401

        # 3. Regular user GET -> 200
        res_usr_get = client.get("/api/budgets", headers=self.user_headers)
        assert res_usr_get.status_code == 200

        # 4. Regular user POST -> 403
        payload = {
            "name": f"Regular User Budget {self.suffix}",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "lines": [],
        }
        res_usr_post = client.post("/api/budgets", json=payload, headers=self.user_headers)
        assert res_usr_post.status_code == 403

        # 5. Regular user PUT -> 403
        res_usr_put = client.put("/api/budgets/1", json=payload, headers=self.user_headers)
        assert res_usr_put.status_code == 403

        # 6. Regular user activate -> 403
        res_usr_act = client.post("/api/budgets/1/activate", headers=self.user_headers)
        assert res_usr_act.status_code == 403

        # 7. Regular user close -> 403
        res_usr_close = client.post("/api/budgets/1/close", headers=self.user_headers)
        assert res_usr_close.status_code == 403
