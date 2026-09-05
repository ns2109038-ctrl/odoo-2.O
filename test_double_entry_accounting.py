import uuid
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.account import Account
from app.models.journal import Journal
from app.models.journal_entry import JournalEntry, JournalEntryLine
from app.services.user_service import create_user
from app.schemas.user import UserCreate
from app.services.journal_entry_service import (
    create_invoice_journal_entry,
    create_bill_journal_entry,
    create_payment_journal_entry,
)

client = TestClient(app)


def run_tests():
    print("=" * 70)
    print(">>> RUNNING JOURNAL ENTRIES & DOUBLE-ENTRY ACCOUNTING TESTS <<<")
    print("=" * 70)

    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    pw = "SecretAcc123!"

    # 0. Setup: Create users for RBAC testing
    admin_user = create_user(
        db,
        UserCreate(
            name="DE Admin",
            login_id=f"adm_de_{suffix}",
            email=f"adm_de_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="admin",
        ),
    )
    accountant_user = create_user(
        db,
        UserCreate(
            name="DE Accountant",
            login_id=f"acc_de_{suffix}",
            email=f"acc_de_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="accountant",
        ),
    )
    regular_user = create_user(
        db,
        UserCreate(
            name="DE Regular User",
            login_id=f"usr_de_{suffix}",
            email=f"usr_de_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="user",
        ),
    )

    # 0b. Setup: Find or create active accounts and journals
    # Asset account (e.g. Bank / Cash)
    acc_bank = Account(
        code=f"101_{suffix}".upper(),
        name=f"Bank Account {suffix}",
        account_name=f"Bank Account {suffix}",
        account_type="asset",
        is_active=True,
    )
    # Income account
    acc_sales = Account(
        code=f"401_{suffix}".upper(),
        name=f"Sales Account {suffix}",
        account_name=f"Sales Account {suffix}",
        account_type="income",
        is_active=True,
    )
    # Expense account
    acc_expense = Account(
        code=f"501_{suffix}".upper(),
        name=f"Expense Account {suffix}",
        account_name=f"Expense Account {suffix}",
        account_type="expense",
        is_active=True,
    )
    # Inactive account for testing
    acc_inactive = Account(
        code=f"999_{suffix}".upper(),
        name=f"Inactive Account {suffix}",
        account_name=f"Inactive Account {suffix}",
        account_type="asset",
        is_active=False,
    )
    db.add_all([acc_bank, acc_sales, acc_expense, acc_inactive])
    db.commit()
    db.refresh(acc_bank)
    db.refresh(acc_sales)
    db.refresh(acc_expense)
    db.refresh(acc_inactive)

    bank_id = acc_bank.id
    sales_id = acc_sales.id
    expense_id = acc_expense.id
    inactive_id = acc_inactive.id

    # Active Journal
    test_journal = Journal(
        journal_name=f"General Journal {suffix}",
        journal_type="Bank",
        default_debit_account_id=bank_id,
        default_credit_account_id=sales_id,
        is_active=True,
    )
    db.add(test_journal)
    db.commit()
    db.refresh(test_journal)
    journal_id = test_journal.id
    db.close()

    # Login and get tokens
    def get_token(login_id: str) -> str:
        res = client.post("/api/auth/login", json={"login_id": login_id, "password": pw})
        assert res.status_code == 200, f"Login failed for {login_id}: {res.text}"
        return res.json()["access_token"]

    accountant_token = get_token(f"acc_de_{suffix}")
    user_token = get_token(f"usr_de_{suffix}")

    accountant_headers = {"Authorization": f"Bearer {accountant_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 1. RBAC Tests
    print("\n=== 1. Test RBAC Permissions ===")
    r_unauth = client.get("/api/journal-entries")
    assert r_unauth.status_code == 401, f"Expected 401, got {r_unauth.status_code}"
    print("[OK] Unauthenticated access rejected with 401 Unauthorized.")

    r_usr_get = client.get("/api/journal-entries", headers=user_headers)
    assert r_usr_get.status_code == 200
    print("[OK] Authenticated regular user can read journal entries.")

    r_usr_post = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": bank_id, "debit": 100, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": 100},
            ],
        },
        headers=user_headers,
    )
    assert r_usr_post.status_code == 403, f"Expected 403, got {r_usr_post.status_code}"
    print("[OK] Regular user denied journal entry creation with 403 Forbidden.")

    # 2. Test Insufficient Lines (< 2 lines)
    print("\n=== 2. Test Insufficient Lines (< 2 lines) ===")
    r_single_line = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": bank_id, "debit": 500, "credit": 0},
            ],
        },
        headers=accountant_headers,
    )
    assert r_single_line.status_code == 422, f"Expected 422 for single line, got {r_single_line.status_code}"
    print("[OK] Less than 2 lines rejected with 422 Unprocessable Entity.")

    # 3. Test Debit/Credit Validation
    print("\n=== 3. Test Debit/Credit Validation Rules ===")
    # Both debit and credit > 0
    r_both_gt_zero = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": bank_id, "debit": 500, "credit": 200},
                {"account_id": sales_id, "debit": 0, "credit": 300},
            ],
        },
        headers=accountant_headers,
    )
    assert r_both_gt_zero.status_code == 422, f"Expected 422 for both > 0, got {r_both_gt_zero.status_code}"
    print("[OK] Line with both debit and credit > 0 rejected with 422.")

    # Both debit and credit == 0
    r_both_zero = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": bank_id, "debit": 0, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": 100},
            ],
        },
        headers=accountant_headers,
    )
    assert r_both_zero.status_code == 422, f"Expected 422 for both == 0, got {r_both_zero.status_code}"
    print("[OK] Line with zero debit and credit rejected with 422.")

    # Negative amount
    r_neg = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": bank_id, "debit": -100, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": -100},
            ],
        },
        headers=accountant_headers,
    )
    assert r_neg.status_code == 422
    print("[OK] Line with negative amount rejected with 422.")

    # 4. Test Invalid Account ID
    print("\n=== 4. Test Invalid Account ID ===")
    r_inv_acc = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": 9999999, "debit": 250, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": 250},
            ],
        },
        headers=accountant_headers,
    )
    assert r_inv_acc.status_code == 400
    assert "does not exist" in r_inv_acc.json()["detail"].lower()
    print("[OK] Non-existent account ID rejected with 400 Bad Request.")

    # 5. Test Inactive Account
    print("\n=== 5. Test Inactive Account ===")
    r_inact_acc = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "lines": [
                {"account_id": inactive_id, "debit": 150, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": 150},
            ],
        },
        headers=accountant_headers,
    )
    assert r_inact_acc.status_code == 400
    assert "inactive" in r_inact_acc.json()["detail"].lower()
    print("[OK] Inactive account rejected with 400 Bad Request.")

    # 6. Test Unbalanced Entry Direct Post
    print("\n=== 6. Test Unbalanced Entry Direct Post ===")
    r_unbal_post = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "status": "posted",
            "lines": [
                {"account_id": bank_id, "debit": 1000, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": 800},
            ],
        },
        headers=accountant_headers,
    )
    assert r_unbal_post.status_code == 400
    assert "not balanced" in r_unbal_post.json()["detail"].lower()
    print("[OK] Direct posting of unbalanced entry rejected with 400 Bad Request.")

    # 7. Test Balanced Draft Creation, Update, and Posting
    print("\n=== 7. Test Balanced Draft Creation, Update, and Posting ===")
    # 7a. Create draft entry (unbalanced is allowed in draft mode)
    r_draft = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "reference": f"INV-{suffix}",
            "description": "Initial draft entry",
            "status": "draft",
            "lines": [
                {"account_id": bank_id, "debit": 1000, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": 700},
            ],
        },
        headers=accountant_headers,
    )
    assert r_draft.status_code == 201
    draft_data = r_draft.json()
    entry_id = draft_data["id"]
    assert draft_data["status"] == "draft"
    assert Decimal(str(draft_data["total_debit"])) == Decimal("1000.00")
    assert Decimal(str(draft_data["total_credit"])) == Decimal("700.00")
    print(f"[OK] Created draft journal entry #{entry_id}.")

    # 7b. Try to post unbalanced draft -> Should Fail
    r_post_fail = client.post(f"/api/journal-entries/{entry_id}/post", headers=accountant_headers)
    assert r_post_fail.status_code == 400
    assert "not balanced" in r_post_fail.json()["detail"].lower()
    print("[OK] Posting unbalanced draft entry rejected with 400 Bad Request.")

    # 7c. Update draft entry to balance it (PUT)
    r_update = client.put(
        f"/api/journal-entries/{entry_id}",
        json={
            "description": "Updated balanced entry",
            "lines": [
                {"account_id": bank_id, "debit": 1000, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": 1000},
            ],
        },
        headers=accountant_headers,
    )
    assert r_update.status_code == 200
    up_data = r_update.json()
    assert Decimal(str(up_data["total_debit"])) == Decimal("1000.00")
    assert Decimal(str(up_data["total_credit"])) == Decimal("1000.00")
    print("[OK] Successfully updated draft entry with balanced lines.")

    # 7d. Post balanced entry
    r_post_success = client.post(f"/api/journal-entries/{entry_id}/post", headers=accountant_headers)
    assert r_post_success.status_code == 200
    posted_data = r_post_success.json()
    assert posted_data["status"] == "posted"
    print(f"[OK] Successfully posted balanced journal entry #{entry_id}.")

    # 8. Test Editing Posted Entry (Forbidden)
    print("\n=== 8. Test Editing Posted Entry is Prevented ===")
    r_edit_posted = client.put(
        f"/api/journal-entries/{entry_id}",
        json={"description": "Attempted edit on posted entry"},
        headers=accountant_headers,
    )
    assert r_edit_posted.status_code == 400
    assert "cannot edit" in r_edit_posted.json()["detail"].lower()
    print("[OK] Direct edit on posted entry strictly rejected with 400 Bad Request.")

    # 9. Test Cancellation of Posted Entry (Reversal Logic)
    print("\n=== 9. Test Cancellation of Posted Entry (Reversal Logic) ===")
    r_cancel = client.post(
        f"/api/journal-entries/{entry_id}/cancel?reason=Customer%20Return",
        headers=accountant_headers,
    )
    assert r_cancel.status_code == 200
    cancel_res = r_cancel.json()
    assert cancel_res["entry"]["status"] == "cancelled"
    assert cancel_res["reversal_entry"] is not None
    rev_entry = cancel_res["reversal_entry"]
    assert rev_entry["status"] == "posted"
    assert Decimal(str(rev_entry["total_debit"])) == Decimal("1000.00")
    assert Decimal(str(rev_entry["total_credit"])) == Decimal("1000.00")

    # Verify lines in reversal entry are swapped
    rev_lines = rev_entry["lines"]
    bank_rev_line = next(l for l in rev_lines if l["account_id"] == bank_id)
    sales_rev_line = next(l for l in rev_lines if l["account_id"] == sales_id)
    # Originally Bank had Debit 1000, now Credit 1000
    assert Decimal(str(bank_rev_line["credit"])) == Decimal("1000.00")
    assert Decimal(str(bank_rev_line["debit"])) == Decimal("0.00")
    # Originally Sales had Credit 1000, now Debit 1000
    assert Decimal(str(sales_rev_line["debit"])) == Decimal("1000.00")
    assert Decimal(str(sales_rev_line["credit"])) == Decimal("0.00")
    print(f"[OK] Cancellation generated reversal entry #{rev_entry['id']} with swapped debit/credit.")

    # 10. Test Cancellation of Draft Entry (No Reversal Needed)
    print("\n=== 10. Test Cancellation of Draft Entry ===")
    r_draft2 = client.post(
        "/api/journal-entries",
        json={
            "journal_id": journal_id,
            "entry_date": str(date.today()),
            "status": "draft",
            "lines": [
                {"account_id": bank_id, "debit": 200, "credit": 0},
                {"account_id": sales_id, "debit": 0, "credit": 200},
            ],
        },
        headers=accountant_headers,
    )
    draft2_id = r_draft2.json()["id"]
    r_cancel_draft = client.post(f"/api/journal-entries/{draft2_id}/cancel", headers=accountant_headers)
    assert r_cancel_draft.status_code == 200
    assert r_cancel_draft.json()["entry"]["status"] == "cancelled"
    assert r_cancel_draft.json()["reversal_entry"] is None
    print("[OK] Draft entry cancelled without creating reversal entry.")

    # 11. Test Atomic Rollback on Failure
    print("\n=== 11. Test Atomic Rollback on Failure ===")
    db = SessionLocal()
    count_before = db.query(JournalEntry).count()
    lines_before = db.query(JournalEntryLine).count()
    db.close()

    # Pass an invalid line that fails during validation
    try:
        client.post(
            "/api/journal-entries",
            json={
                "journal_id": journal_id,
                "entry_date": str(date.today()),
                "status": "posted",
                "lines": [
                    {"account_id": bank_id, "debit": 500, "credit": 0},
                    {"account_id": 99999999, "debit": 0, "credit": 500},  # invalid account triggers error
                ],
            },
            headers=accountant_headers,
        )
    except Exception:
        pass

    db = SessionLocal()
    count_after = db.query(JournalEntry).count()
    lines_after = db.query(JournalEntryLine).count()
    db.close()
    assert count_before == count_after, "Failed entry created an orphaned header in DB!"
    assert lines_before == lines_after, "Failed entry created orphaned lines in DB!"
    print("[OK] Database rollback verified: 0 orphaned headers or lines created.")

    # 12. Test Reusable Accounting Service Functions
    print("\n=== 12. Test Reusable Accounting Service Functions ===")
    db = SessionLocal()
    # 12a. Customer Invoice
    inv_entry = create_invoice_journal_entry(
        db,
        journal_id=journal_id,
        invoice_ref=f"INV-REUSE-{suffix}",
        invoice_date=date.today(),
        receivable_account_id=bank_id,
        income_account_id=sales_id,
        amount=Decimal("1500.00"),
    )
    assert inv_entry.status == "posted"
    assert inv_entry.reference == f"INV-REUSE-{suffix}"
    assert len(inv_entry.lines) == 2
    print(f"[OK] Reusable create_invoice_journal_entry created posted entry #{inv_entry.id}.")

    # 12b. Vendor Bill
    bill_entry = create_bill_journal_entry(
        db,
        journal_id=journal_id,
        bill_ref=f"BILL-REUSE-{suffix}",
        bill_date=date.today(),
        payable_account_id=bank_id,
        expense_account_id=expense_id,
        amount=Decimal("800.00"),
    )
    assert bill_entry.status == "posted"
    assert bill_entry.reference == f"BILL-REUSE-{suffix}"
    assert len(bill_entry.lines) == 2
    print(f"[OK] Reusable create_bill_journal_entry created posted entry #{bill_entry.id}.")

    # 12c. Payment
    payment_entry = create_payment_journal_entry(
        db,
        journal_id=journal_id,
        payment_ref=f"PAY-REUSE-{suffix}",
        payment_date=date.today(),
        bank_account_id=bank_id,
        partner_account_id=sales_id,
        amount=Decimal("500.00"),
        is_customer_payment=True,
    )
    assert payment_entry.status == "posted"
    assert len(payment_entry.lines) == 2
    print(f"[OK] Reusable create_payment_journal_entry created posted entry #{payment_entry.id}.")
    db.close()

    print("\n" + "=" * 70)
    print(">>> ALL JOURNAL ENTRIES & DOUBLE-ENTRY TESTS PASSED SUCCESSFULLY! <<<")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
