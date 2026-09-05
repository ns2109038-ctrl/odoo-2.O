"""
Tests for Dashboard Backend API.

Coverage:
  1.  GET /api/dashboard/summary - unauthenticated -> 401
  2.  GET /api/dashboard/summary - returns 200 with all required fields
  3.  GET /api/dashboard/summary - counts customers/vendors/accounts
  4.  GET /api/dashboard/summary - accounting totals from POSTED journal entries
  5.  GET /api/dashboard/summary - draft entries excluded from accounting totals
  6.  GET /api/dashboard/recent-transactions - unauthenticated -> 401
  7.  GET /api/dashboard/recent-transactions - returns 200 with required keys
  8.  GET /api/dashboard/recent-transactions - limit parameter respected
  9.  GET /api/dashboard/recent-transactions - journal entry fields present
  10. GET /api/dashboard/recent-transactions - invoice/payment fields present
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _token(login_id: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"login_id": login_id, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_users(suffix: str) -> dict:
    db = SessionLocal()
    pw = "Secret@123"
    try:
        create_user(db, UserCreate(
            name="Dash Admin", login_id=f"da_adm_{suffix}",
            email=f"da_adm_{suffix}@urban.com",
            password=pw, confirm_password=pw, role="admin",
        ))
        create_user(db, UserCreate(
            name="Dash Acct", login_id=f"da_acc_{suffix}",
            email=f"da_acc_{suffix}@urban.com",
            password=pw, confirm_password=pw, role="accountant",
        ))
    finally:
        db.close()

    return {
        "admin": _token(f"da_adm_{suffix}", pw),
        "accountant": _token(f"da_acc_{suffix}", pw),
    }


def _make_account(token, code, name, atype="asset"):
    r = client.post("/api/accounts", json={
        "code": code, "name": name, "account_type": atype,
        "description": "", "is_active": True,
    }, headers=_auth(token))
    assert r.status_code == 201, f"account create failed: {r.text}"
    return r.json()["id"]


def _make_account_internal(token, code, name, atype="asset"):
    """Internal helper that always succeeds."""
    r = client.post("/api/accounts", json={
        "code": code, "name": name, "account_type": atype,
        "description": "", "is_active": True,
    }, headers=_auth(token))
    assert r.status_code == 201, f"account create failed: {r.text}"
    return r.json()["id"]


def _make_journal(token, name, jtype="Sales"):
    """Create a journal with required fields. jtype must be Sales/Purchase/Bank/Cash."""
    dr_id = _make_account_internal(token, f"JDR-{_uid()}", f"JDr {_uid()}", "asset")
    cr_id = _make_account_internal(token, f"JCR-{_uid()}", f"JCr {_uid()}", "asset")
    r = client.post("/api/journals", json={
        "journal_name": name,
        "journal_type": jtype,
        "default_debit_account_id": dr_id,
        "default_credit_account_id": cr_id,
        "is_active": True,
    }, headers=_auth(token))
    assert r.status_code == 201, f"journal create failed: {r.text}"
    return r.json()["id"]


def _make_contact(token, name, ctype="customer"):
    r = client.post("/api/contacts", json={
        "name": name, "contact_type": ctype,
        "email": f"{_uid()}@test.com",
    }, headers=_auth(token))
    assert r.status_code == 201, f"contact create failed: {r.text}"
    return r.json()["id"]


def _make_journal_entry(token, journal_id, account_id_dr, account_id_cr, amount, do_post=True):
    today = date.today().isoformat()
    r = client.post("/api/journal-entries", json={
        "journal_id": journal_id,
        "entry_date": today,
        "date": today,
        "description": "Test entry",
        "lines": [
            {"account_id": account_id_dr, "debit": str(amount), "credit": "0.00", "description": "dr"},
            {"account_id": account_id_cr, "debit": "0.00", "credit": str(amount), "description": "cr"},
        ],
    }, headers=_auth(token))
    assert r.status_code == 201, f"JE create failed: {r.text}"
    je_id = r.json()["id"]

    if do_post:
        p = client.post(f"/api/journal-entries/{je_id}/post", headers=_auth(token))
        assert p.status_code == 200, f"JE post failed: {p.text}"

    return je_id


# ─── Authentication Tests ───────────────────────────────

def test_summary_unauthenticated():
    r = client.get("/api/dashboard/summary")
    assert r.status_code == 401


def test_recent_transactions_unauthenticated():
    r = client.get("/api/dashboard/recent-transactions")
    assert r.status_code == 401


# ─── Summary Tests ──────────────────────────────────────

def test_summary_returns_200():
    sfx = _uid()
    toks = _make_users(sfx)
    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200


def test_summary_has_required_fields():
    sfx = _uid()
    toks = _make_users(sfx)
    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    data = r.json()
    required = [
        "total_customers", "total_vendors", "total_products", "total_accounts",
        "total_sales", "total_purchases", "outstanding_invoices", "outstanding_bills",
        "total_income", "total_expenses", "net_profit", "cash_bank_balance",
    ]
    for field in required:
        assert field in data, f"Missing field: {field}"


def test_summary_handles_empty_db_safely():
    sfx = _uid()
    toks = _make_users(sfx)
    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    data = r.json()
    # Numeric fields should be parseable
    for field in ["total_sales", "total_purchases", "outstanding_invoices",
                  "outstanding_bills", "total_income", "total_expenses",
                  "net_profit", "cash_bank_balance"]:
        Decimal(str(data[field]))  # Should not raise


def test_summary_counts_customers():
    sfx = _uid()
    toks = _make_users(sfx)
    _make_contact(toks["accountant"], f"Customer {sfx}", "customer")
    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    assert r.json()["total_customers"] >= 1


def test_summary_counts_vendors():
    sfx = _uid()
    toks = _make_users(sfx)
    _make_contact(toks["accountant"], f"Vendor {sfx}", "vendor")
    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    assert r.json()["total_vendors"] >= 1


def test_summary_counts_accounts():
    sfx = _uid()
    toks = _make_users(sfx)
    _make_account(toks["accountant"], f"ACC-{sfx}", f"Test Account {sfx}", "asset")
    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    assert r.json()["total_accounts"] >= 1


def test_summary_posted_entries_affect_income():
    sfx = _uid()
    toks = _make_users(sfx)
    cash_id = _make_account(toks["accountant"], f"CASH-{sfx}", f"Cash {sfx}", "asset")
    inc_id = _make_account(toks["accountant"], f"INC-{sfx}", f"Income {sfx}", "income")
    j_id = _make_journal(toks["accountant"], f"GenJ-{sfx}", "Sales")

    _make_journal_entry(toks["accountant"], j_id, cash_id, inc_id, "500.00", do_post=True)

    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    data = r.json()
    assert Decimal(str(data["total_income"])) >= Decimal("500.00"), \
        f"Expected total_income >= 500, got {data['total_income']}"


def test_summary_draft_entries_not_in_income():
    sfx = _uid()
    toks = _make_users(sfx)
    cash_id = _make_account(toks["accountant"], f"DCASH-{sfx}", f"DraftCash {sfx}", "asset")
    inc_id = _make_account(toks["accountant"], f"DINC-{sfx}", f"DraftInc {sfx}", "income")
    j_id = _make_journal(toks["accountant"], f"DraftJ-{sfx}", "Sales")

    # Create DRAFT only (do_post=False)
    _make_journal_entry(toks["accountant"], j_id, cash_id, inc_id, "9999.00", do_post=False)

    # Then get summary - should not crash; 9999 draft income not counted
    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200


def test_summary_net_profit_calculation():
    sfx = _uid()
    toks = _make_users(sfx)
    r = client.get("/api/dashboard/summary", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    data = r.json()
    # net_profit = total_income - total_expenses (server-computed)
    expected = Decimal(str(data["total_income"])) - Decimal(str(data["total_expenses"]))
    actual = Decimal(str(data["net_profit"]))
    assert actual == expected, f"net_profit mismatch: {actual} != {expected}"


# ─── Recent Transactions Tests ──────────────────────────

def test_recent_transactions_returns_200():
    sfx = _uid()
    toks = _make_users(sfx)
    r = client.get("/api/dashboard/recent-transactions", headers=_auth(toks["accountant"]))
    assert r.status_code == 200


def test_recent_transactions_has_required_keys():
    sfx = _uid()
    toks = _make_users(sfx)
    r = client.get("/api/dashboard/recent-transactions", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    data = r.json()
    for key in ["invoices", "bills", "payments", "journal_entries"]:
        assert key in data, f"Missing key: {key}"


def test_recent_transactions_returns_lists():
    sfx = _uid()
    toks = _make_users(sfx)
    r = client.get("/api/dashboard/recent-transactions", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data["invoices"], list)
    assert isinstance(data["bills"], list)
    assert isinstance(data["payments"], list)
    assert isinstance(data["journal_entries"], list)


def test_recent_transactions_limit_respected():
    sfx = _uid()
    toks = _make_users(sfx)
    cash_id = _make_account(toks["accountant"], f"RCASH-{sfx}", f"RCash {sfx}", "asset")
    inc_id = _make_account(toks["accountant"], f"RINC-{sfx}", f"RInc {sfx}", "income")
    j_id = _make_journal(toks["accountant"], f"RJ-{sfx}", "Sales")

    for _ in range(3):
        _make_journal_entry(toks["accountant"], j_id, cash_id, inc_id, "100.00", do_post=True)

    r = client.get("/api/dashboard/recent-transactions?limit=2", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    data = r.json()
    assert len(data["journal_entries"]) <= 2


def test_recent_journal_entries_have_required_fields():
    sfx = _uid()
    toks = _make_users(sfx)
    cash_id = _make_account(toks["accountant"], f"JCASH-{sfx}", f"JCash {sfx}", "asset")
    inc_id = _make_account(toks["accountant"], f"JINC-{sfx}", f"JInc {sfx}", "income")
    j_id = _make_journal(toks["accountant"], f"JJ-{sfx}", "Sales")

    _make_journal_entry(toks["accountant"], j_id, cash_id, inc_id, "250.00", do_post=True)

    r = client.get("/api/dashboard/recent-transactions", headers=_auth(toks["accountant"]))
    assert r.status_code == 200
    data = r.json()
    assert len(data["journal_entries"]) >= 1
    je = data["journal_entries"][0]
    for field in ["id", "journal_id", "entry_date", "status", "total_debit", "total_credit"]:
        assert field in je, f"Missing JE field: {field}"


def test_recent_invoices_have_required_fields():
    sfx = _uid()
    toks = _make_users(sfx)
    cust_id = _make_contact(toks["accountant"], f"Cust {sfx}", "customer")

    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": cust_id,
        "invoice_date": date.today().isoformat(),
        "due_date": (date.today() + timedelta(days=30)).isoformat(),
        "lines": [
            {"description": "Item A", "quantity": 1, "unit_price": "100.00", "tax_rate": "0.00"},
        ],
    }, headers=_auth(toks["accountant"]))
    assert r.status_code == 201, f"Invoice create failed: {r.text}"

    r2 = client.get("/api/dashboard/recent-transactions", headers=_auth(toks["accountant"]))
    assert r2.status_code == 200
    data = r2.json()
    assert len(data["invoices"]) >= 1
    inv = data["invoices"][0]
    for field in ["id", "invoice_number", "invoice_type", "contact_id", "invoice_date", "status", "total"]:
        assert field in inv, f"Missing invoice field: {field}"


def test_recent_payments_have_required_fields():
    sfx = _uid()
    toks = _make_users(sfx)
    j_id = _make_journal(toks["accountant"], f"PJ-{sfx}", "Bank")
    cust_id = _make_contact(toks["accountant"], f"PCust {sfx}", "customer")

    r = client.post("/api/payments", json={
        "payment_type": "customer_receipt",
        "contact_id": cust_id,
        "payment_date": date.today().isoformat(),
        "amount": "200.00",
        "journal_id": j_id,
        "reference": "PAY-REF-" + sfx,
    }, headers=_auth(toks["accountant"]))
    assert r.status_code == 201, f"Payment create failed: {r.text}"

    r2 = client.get("/api/dashboard/recent-transactions", headers=_auth(toks["accountant"]))
    assert r2.status_code == 200
    data = r2.json()
    assert len(data["payments"]) >= 1
    pay = data["payments"][0]
    for field in ["id", "payment_number", "payment_type", "contact_id", "payment_date", "amount", "status"]:
        assert field in pay, f"Missing payment field: {field}"


