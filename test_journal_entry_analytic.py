import uuid
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.account import Account
from app.models.journal import Journal
from app.models.analytic_account import AnalyticAccount
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)


def test_analytic_account_journal_entry_integration():
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    pw = "SecretAcc123!"

    # 1. Setup users
    accountant_user = create_user(
        db,
        UserCreate(
            name="Analytic Accountant",
            login_id=f"acc_ana_{suffix}",
            email=f"acc_ana_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="accountant",
        ),
    )

    # 2. Setup standard Accounts
    acc_bank = Account(
        code=f"101_{suffix}".upper(),
        name=f"Bank Account {suffix}",
        account_name=f"Bank Account {suffix}",
        account_type="asset",
        is_active=True,
    )
    acc_sales = Account(
        code=f"401_{suffix}".upper(),
        name=f"Sales Account {suffix}",
        account_name=f"Sales Account {suffix}",
        account_type="income",
        is_active=True,
    )
    # 3. Setup Analytic Accounts (1 active, 1 inactive)
    ana_active = AnalyticAccount(
        code=f"PROJ_{suffix}".upper(),
        name=f"Project Alpha {suffix}",
        description="Active Project for consulting",
        is_active=True,
    )
    ana_inactive = AnalyticAccount(
        code=f"CLOSED_{suffix}".upper(),
        name=f"Closed Project {suffix}",
        description="Old closed project",
        is_active=False,
    )

    db.add_all([acc_bank, acc_sales, ana_active, ana_inactive])
    db.commit()

    db.refresh(acc_bank)
    db.refresh(acc_sales)
    db.refresh(ana_active)
    db.refresh(ana_inactive)

    bank_id = acc_bank.id
    sales_id = acc_sales.id
    active_ana_id = ana_active.id
    inactive_ana_id = ana_inactive.id

    # 4. Setup Journal
    journal = Journal(
        journal_name=f"Analytic Test Journal {suffix}",
        journal_type="General",
        default_debit_account_id=bank_id,
        default_credit_account_id=sales_id,
        is_active=True,
    )
    db.add(journal)
    db.commit()
    db.refresh(journal)

    journal_id = journal.id
    db.close()

    # Login
    res = client.post("/api/auth/login", json={"login_id": f"acc_ana_{suffix}", "password": pw})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Case A: Reject non-existent analytic account
    r_nonexistent = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": bank_id, "debit": 500, "credit": 0, "analytic_account_id": 999999},
                {"account_id": sales_id, "debit": 0, "credit": 500},
            ],
        },
        headers=headers,
    )
    assert r_nonexistent.status_code == 400
    assert "does not exist" in r_nonexistent.json()["detail"].lower()
    print("[OK] Non-existent analytic account rejected with 400.")

    # Case B: Reject inactive analytic account
    r_inactive = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": bank_id, "debit": 500, "credit": 0, "analytic_account_id": inactive_ana_id},
                {"account_id": sales_id, "debit": 0, "credit": 500},
            ],
        },
        headers=headers,
    )
    assert r_inactive.status_code == 400
    assert "inactive" in r_inactive.json()["detail"].lower()
    print("[OK] Inactive analytic account rejected with 400.")

    # Case C: Successfully create journal entry with active analytic account
    r_create = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "reference": f"ANA-REF-{suffix}",
            "description": "Analytic Entry Test",
            "status": "posted",
            "lines": [
                {"account_id": bank_id, "debit": 750, "credit": 0, "analytic_account_id": active_ana_id},
                {"account_id": sales_id, "debit": 0, "credit": 750},
            ],
        },
        headers=headers,
    )
    assert r_create.status_code == 201, f"Failed: {r_create.text}"
    created_entry = r_create.json()
    entry_id = created_entry["id"]
    assert created_entry["status"] == "posted"

    # Verify line response structure
    line_with_ana = next(l for l in created_entry["lines"] if l["account_id"] == bank_id)
    assert line_with_ana["analytic_account_id"] == active_ana_id
    assert line_with_ana["analytic_account"] is not None
    assert line_with_ana["analytic_account"]["id"] == active_ana_id
    assert line_with_ana["analytic_account"]["name"] == f"Project Alpha {suffix}"

    line_without_ana = next(l for l in created_entry["lines"] if l["account_id"] == sales_id)
    assert line_without_ana["analytic_account_id"] is None
    assert line_without_ana["analytic_account"] is None
    print(f"[OK] Successfully created and verified journal entry #{entry_id} with analytic account.")

    # Case D: Filter journal entries by analytic_account_id
    r_filter = client.get(f"/api/journal-entries?analytic_account_id={active_ana_id}", headers=headers)
    assert r_filter.status_code == 200
    filtered_items = r_filter.json()
    assert any(e["id"] == entry_id for e in filtered_items)

    r_filter_empty = client.get(f"/api/journal-entries?analytic_account_id={inactive_ana_id}", headers=headers)
    assert r_filter_empty.status_code == 200
    empty_items = r_filter_empty.json()
    assert not any(e["id"] == entry_id for e in empty_items)
    print("[OK] Filtering journal entries by analytic_account_id works accurately.")

    # Case E: Cancel posted entry and verify reversal preserves analytic_account_id
    r_cancel = client.post(f"/api/journal-entries/{entry_id}/cancel", headers=headers)
    assert r_cancel.status_code == 200
    cancel_data = r_cancel.json()
    reversal_entry = cancel_data["reversal_entry"]
    assert reversal_entry is not None
    rev_bank_line = next(l for l in reversal_entry["lines"] if l["account_id"] == bank_id)
    assert rev_bank_line["analytic_account_id"] == active_ana_id
    print(f"[OK] Reversal entry #{reversal_entry['id']} preserved analytic_account_id.")


if __name__ == "__main__":
    test_analytic_account_journal_entry_integration()
    print("\n>>> ALL ANALYTIC JOURNAL INTEGRATION TESTS PASSED! <<<")
