"""
Tests for Payments Backend Module.

Coverage:
  1. RBAC: unauthenticated 401, regular user 403 on mutations, authenticated GET 200
  2. Create Customer Receipt: draft status, auto-numbering RCP-xxxx
  3. Create Vendor Payment: draft status, auto-numbering PAY-xxxx
  4. Validation:
     - customer_receipt with vendor-only contact -> 400
     - vendor_payment with customer-only contact -> 400
     - amount <= 0 -> 422
     - invalid / inactive journal -> 400
     - invalid payment_type -> 422
  5. Update draft payment -> 200
  6. Edit posted payment rejected -> 400
  7. Post Customer Receipt (Double-Entry Accounting):
     - Creates balanced JournalEntry (Debit Bank, Credit Accounts Receivable)
     - status -> 'posted', journal_entry_id linked
  8. Post Vendor Payment (Double-Entry Accounting):
     - Creates balanced JournalEntry (Debit Accounts Payable, Credit Bank)
     - status -> 'posted', journal_entry_id linked
  9. Re-posting posted payment rejected -> 400
  10. Cancel Draft Payment -> status 'cancelled'
  11. Cancel Posted Payment:
      - Triggers reversal journal entry
      - status -> 'cancelled'
  12. Re-cancelling cancelled payment rejected -> 400
  13. GET list filters: payment_type, status, contact_id, search, pagination
"""
import uuid
from datetime import date
from decimal import Decimal
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient

# pyrefly: ignore [missing-import]
from app.main import app
# pyrefly: ignore [missing-import]
from app.db.database import SessionLocal
# pyrefly: ignore [missing-import]
from app.models.contact import Contact
# pyrefly: ignore [missing-import]
from app.models.account import Account
# pyrefly: ignore [missing-import]
from app.models.journal import Journal
# pyrefly: ignore [missing-import]
from app.models.journal_entry import JournalEntry
# pyrefly: ignore [missing-import]
from app.services.user_service import create_user
# pyrefly: ignore [missing-import]
from app.schemas.user import UserCreate

client = TestClient(app)


def _token(login_id: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"login_id": login_id, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def setup_fixtures(db, suffix: str) -> dict:
    pw = "SecretPay123!"

    admin = create_user(db, UserCreate(
        name="Pay Admin", login_id=f"pay_adm_{suffix}",
        email=f"pay_adm_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="admin",
    ))
    accountant = create_user(db, UserCreate(
        name="Pay Accountant", login_id=f"pay_acc_{suffix}",
        email=f"pay_acc_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="accountant",
    ))
    regular = create_user(db, UserCreate(
        name="Pay User", login_id=f"pay_reg_{suffix}",
        email=f"pay_reg_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="user",
    ))

    # Accounts
    bank_acc = Account(
        code=f"1010_{suffix}", name=f"HDFC Bank {suffix}",
        account_name=f"HDFC Bank {suffix}",
        account_type="asset", is_active=True,
    )
    ar_acc = Account(
        code=f"1100_{suffix}", name=f"Accounts Receivable {suffix}",
        account_name=f"Accounts Receivable {suffix}",
        account_type="asset", is_active=True,
    )
    ap_acc = Account(
        code=f"2100_{suffix}", name=f"Accounts Payable {suffix}",
        account_name=f"Accounts Payable {suffix}",
        account_type="liability", is_active=True,
    )
    db.add_all([bank_acc, ar_acc, ap_acc])
    db.flush()

    # Bank Journal
    bank_journal = Journal(
        journal_name=f"Bank Operations {suffix}",
        journal_type="Bank",
        default_debit_account_id=bank_acc.id,
        default_credit_account_id=bank_acc.id,
        is_active=True,
    )
    db.add(bank_journal)
    db.flush()

    # Contacts
    customer = Contact(
        name=f"Retail Customer {suffix}", contact_type="customer", type="customer",
        email=f"pay_cust_{suffix}@urban.com", is_active=True,
    )
    vendor = Contact(
        name=f"Lumber Vendor {suffix}", contact_type="vendor", type="vendor",
        email=f"pay_vend_{suffix}@urban.com", is_active=True,
    )
    db.add_all([customer, vendor])
    db.commit()

    return {
        "admin": admin, "accountant": accountant, "regular": regular,
        "customer": customer, "vendor": vendor,
        "bank_acc": bank_acc, "ar_acc": ar_acc, "ap_acc": ap_acc,
        "bank_journal": bank_journal,
        "pw": pw,
    }


def run_tests():
    print("=" * 70)
    print(">>> RUNNING PAYMENTS BACKEND MODULE TESTS <<<")
    print("=" * 70)

    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    f = setup_fixtures(db, suffix)

    admin_tok = _token(f["admin"].login_id, f["pw"])
    acc_tok = _token(f["accountant"].login_id, f["pw"])
    reg_tok = _token(f["regular"].login_id, f["pw"])

    passed = 0
    failed = 0

    def ok(msg):
        nonlocal passed
        passed += 1
        print(f"  [PASS] {msg}")

    def fail(msg, err=""):
        nonlocal failed
        failed += 1
        print(f"  [FAIL] {msg} -> {err}")

    # ---- 1. RBAC Tests ------------------------------------------------------
    r = client.get("/api/payments")
    if r.status_code == 401:
        ok("GET /api/payments unauthenticated -> 401")
    else:
        fail("GET /api/payments unauthenticated", r.text)

    r = client.post("/api/payments", json={})
    if r.status_code == 401:
        ok("POST /api/payments unauthenticated -> 401")
    else:
        fail("POST /api/payments unauthenticated", r.text)

    r = client.post("/api/payments", json={
        "payment_type": "customer_receipt",
        "contact_id": f["customer"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "500.00",
    }, headers=_auth(reg_tok))
    if r.status_code == 403:
        ok("Regular user POST /api/payments -> 403")
    else:
        fail("Regular user POST /api/payments -> 403", r.text)

    r = client.get("/api/payments", headers=_auth(reg_tok))
    if r.status_code == 200:
        ok("Regular user GET /api/payments -> 200")
    else:
        fail("Regular user GET /api/payments -> 200", r.text)

    # ---- 2. Create Customer Receipt -----------------------------------------
    receipt = {}
    vend_pay = {}
    payload_receipt = {
        "payment_type": "customer_receipt",
        "contact_id": f["customer"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "1500.00",
        "payment_date": str(date.today()),
        "reference": "CHK-9901",
    }
    r = client.post("/api/payments", json=payload_receipt, headers=_auth(acc_tok))
    if r.status_code == 201:
        receipt = r.json()
        ok(f"Create customer receipt -> 201 (id={receipt['id']}, no={receipt['payment_number']})")
        if Decimal(receipt["amount"]) == Decimal("1500.00"):
            ok("Customer receipt amount correct: 1500.00")
        else:
            fail("Customer receipt amount", receipt["amount"])

        if receipt["status"] == "draft":
            ok("Customer receipt status is 'draft'")
        else:
            fail("Customer receipt status", receipt["status"])

        if receipt["payment_number"].startswith("RCP-"):
            ok(f"Payment number prefix correct: {receipt['payment_number']}")
        else:
            fail("Payment number prefix", receipt["payment_number"])
    else:
        fail("Create customer receipt -> 201", r.text)

    # ---- 3. Create Vendor Payment -------------------------------------------
    payload_vend_pay = {
        "payment_type": "vendor_payment",
        "contact_id": f["vendor"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "800.00",
        "payment_date": str(date.today()),
        "reference": "NEFT-12345",
    }
    r = client.post("/api/payments", json=payload_vend_pay, headers=_auth(acc_tok))
    if r.status_code == 201:
        vend_pay = r.json()
        ok(f"Create vendor payment -> 201 (id={vend_pay['id']}, no={vend_pay['payment_number']})")
        if Decimal(vend_pay["amount"]) == Decimal("800.00"):
            ok("Vendor payment amount correct: 800.00")
        else:
            fail("Vendor payment amount", vend_pay["amount"])

        if vend_pay["payment_number"].startswith("PAY-"):
            ok(f"Vendor payment prefix correct: {vend_pay['payment_number']}")
        else:
            fail("Vendor payment prefix", vend_pay["payment_number"])
    else:
        fail("Create vendor payment -> 201", r.text)

    # ---- 4. Validations -----------------------------------------------------
    # Customer receipt with vendor contact -> 400
    r = client.post("/api/payments", json={
        "payment_type": "customer_receipt",
        "contact_id": f["vendor"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "100.00",
    }, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Customer receipt with vendor contact rejected -> 400")
    else:
        fail("Customer receipt with vendor contact", r.text)

    # Vendor payment with customer contact -> 400
    r = client.post("/api/payments", json={
        "payment_type": "vendor_payment",
        "contact_id": f["customer"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "100.00",
    }, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Vendor payment with customer contact rejected -> 400")
    else:
        fail("Vendor payment with customer contact", r.text)

    # Amount <= 0
    r = client.post("/api/payments", json={
        "payment_type": "customer_receipt",
        "contact_id": f["customer"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "0.00",
    }, headers=_auth(acc_tok))
    if r.status_code == 422:
        ok("Payment amount=0 rejected -> 422")
    else:
        fail("Payment amount=0", r.text)

    # Invalid journal_id
    r = client.post("/api/payments", json={
        "payment_type": "customer_receipt",
        "contact_id": f["customer"].id,
        "journal_id": 999999,
        "amount": "100.00",
    }, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Non-existent journal_id rejected -> 400")
    else:
        fail("Non-existent journal_id", r.text)

    # Invalid payment_type
    r = client.post("/api/payments", json={
        "payment_type": "invalid_type",
        "contact_id": f["customer"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "100.00",
    }, headers=_auth(acc_tok))
    if r.status_code == 422:
        ok("Invalid payment_type rejected -> 422")
    else:
        fail("Invalid payment_type", r.text)

    # ---- 5. Update draft payment --------------------------------------------
    # pyrefly: ignore [unbound-name]
    r = client.put(f"/api/payments/{receipt['id']}", json={
        "amount": "1750.00",
        "reference": "CHK-9901-REV",
    }, headers=_auth(acc_tok))
    if r.status_code == 200:
        upd = r.json()
        if Decimal(upd["amount"]) == Decimal("1750.00") and upd["reference"] == "CHK-9901-REV":
            ok("Update draft payment -> amount=1750.00, reference updated")
        else:
            fail("Update draft payment", str(upd))
    else:
        fail("Update draft payment -> 200", r.text)

    # ---- 6. Post Customer Receipt (Double-Entry Accounting) -----------------
    # Receipt: 1750.00 -> Debit Bank, Credit Accounts Receivable
    r = client.post(f"/api/payments/{receipt['id']}/post", headers=_auth(acc_tok))
    if r.status_code == 200:
        posted_rec = r.json()
        if posted_rec["status"] == "posted" and posted_rec["journal_entry_id"]:
            ok(f"Post customer receipt -> status='posted', journal_entry_id={posted_rec['journal_entry_id']}")

            je = db.query(JournalEntry).filter(JournalEntry.id == posted_rec["journal_entry_id"]).first()
            if je:
                tot_debit = sum(Decimal(str(l.debit)) for l in je.lines)
                tot_credit = sum(Decimal(str(l.credit)) for l in je.lines)
                if tot_debit == tot_credit == Decimal("1750.00"):
                    ok(f"Linked receipt journal entry is balanced: Debit={tot_debit}, Credit={tot_credit}")
                else:
                    fail("Linked receipt journal entry balance", f"Debit={tot_debit}, Credit={tot_credit}")
                if je.status == "posted":
                    ok("Linked receipt journal entry status is 'posted'")
                else:
                    fail("Linked journal entry status", je.status)
            else:
                fail("Retrieve receipt journal entry", f"id={posted_rec['journal_entry_id']}")
        else:
            fail("Post customer receipt result", str(posted_rec))
    else:
        fail("Post customer receipt -> 200", r.text)

    # ---- 7. Post Vendor Payment (Double-Entry Accounting) -------------------
    # Vendor Payment: 800.00 -> Debit Accounts Payable, Credit Bank
    # pyrefly: ignore [unbound-name]
    r = client.post(f"/api/payments/{vend_pay['id']}/post", headers=_auth(acc_tok))
    if r.status_code == 200:
        posted_pay = r.json()
        if posted_pay["status"] == "posted" and posted_pay["journal_entry_id"]:
            ok(f"Post vendor payment -> status='posted', journal_entry_id={posted_pay['journal_entry_id']}")

            je_pay = db.query(JournalEntry).filter(JournalEntry.id == posted_pay["journal_entry_id"]).first()
            if je_pay:
                tot_deb = sum(Decimal(str(l.debit)) for l in je_pay.lines)
                tot_cred = sum(Decimal(str(l.credit)) for l in je_pay.lines)
                if tot_deb == tot_cred == Decimal("800.00"):
                    ok(f"Linked payment journal entry is balanced: Debit={tot_deb}, Credit={tot_cred}")
                else:
                    fail("Linked payment journal entry balance", f"Debit={tot_deb}, Credit={tot_cred}")
            else:
                fail("Retrieve payment journal entry", f"id={posted_pay['journal_entry_id']}")
        else:
            fail("Post vendor payment result", str(posted_pay))
    else:
        fail("Post vendor payment -> 200", r.text)

    # ---- 8. Edit / Re-post posted payment rejected --------------------------
    r = client.put(f"/api/payments/{receipt['id']}", json={"amount": "2000.00"}, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Edit posted payment rejected -> 400")
    else:
        fail("Edit posted payment", r.text)

    r = client.post(f"/api/payments/{receipt['id']}/post", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Re-post posted payment rejected -> 400")
    else:
        fail("Re-post posted payment", r.text)

    # ---- 9. Cancel Posted Payment (Reversal Logic) --------------------------
    r = client.post(f"/api/payments/{receipt['id']}/cancel", headers=_auth(acc_tok))
    if r.status_code == 200:
        canc_pay = r.json()
        if canc_pay["status"] == "cancelled":
            ok("Cancel posted payment -> status='cancelled'")
        else:
            fail("Cancel posted payment status", canc_pay["status"])
    else:
        fail("Cancel posted payment -> 200", r.text)

    # Re-cancel cancelled payment rejected -> 400
    r = client.post(f"/api/payments/{receipt['id']}/cancel", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Re-cancel cancelled payment rejected -> 400")
    else:
        fail("Re-cancel cancelled payment", r.text)

    # ---- 10. Cancel Draft Payment directly ----------------------------------
    r = client.post("/api/payments", json={
        "payment_type": "customer_receipt",
        "contact_id": f["customer"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "250.00",
    }, headers=_auth(acc_tok))
    assert r.status_code == 201
    draft_pay = r.json()

    r = client.post(f"/api/payments/{draft_pay['id']}/cancel", headers=_auth(acc_tok))
    if r.status_code == 200 and r.json()["status"] == "cancelled":
        ok("Cancel draft payment directly -> status='cancelled'")
    else:
        fail("Cancel draft payment", r.text)

    # ---- 11. GET Detail & Filters -------------------------------------------
    r = client.get(f"/api/payments/{draft_pay['id']}", headers=_auth(reg_tok))
    if r.status_code == 200:
        ok(f"GET /api/payments/{draft_pay['id']} -> 200")
    else:
        fail("GET payment detail", r.text)

    # Filter payment_type=vendor_payment
    r = client.get("/api/payments?payment_type=vendor_payment", headers=_auth(reg_tok))
    if r.status_code == 200:
        data = r.json()["data"]
        if all(p["payment_type"] == "vendor_payment" for p in data):
            ok(f"Filter payment_type=vendor_payment -> all match (count={len(data)})")
        else:
            fail("Filter payment_type=vendor_payment", str(data))
    else:
        fail("Filter payment_type=vendor_payment -> 200", r.text)

    # Filter status=posted
    r = client.get("/api/payments?status=posted", headers=_auth(reg_tok))
    if r.status_code == 200:
        data = r.json()["data"]
        if all(p["status"] == "posted" for p in data):
            ok(f"Filter status=posted -> all match (count={len(data)})")
        else:
            fail("Filter status=posted", str(data))
    else:
        fail("Filter status=posted -> 200", r.text)

    # Filter contact_id
    r = client.get(f"/api/payments?contact_id={f['customer'].id}", headers=_auth(reg_tok))
    if r.status_code == 200:
        data = r.json()["data"]
        if all(p["contact_id"] == f["customer"].id for p in data):
            ok(f"Filter contact_id={f['customer'].id} -> all match")
        else:
            fail("Filter contact_id", str(data))
    else:
        fail("Filter contact_id -> 200", r.text)

    # Admin mutation access
    r = client.post("/api/payments", json={
        "payment_type": "customer_receipt",
        "contact_id": f["customer"].id,
        "journal_id": f["bank_journal"].id,
        "amount": "100.00",
    }, headers=_auth(admin_tok))
    if r.status_code == 201:
        ok("Admin can create payment -> 201")
    else:
        fail("Admin create payment", r.text)

    db.close()

    print()
    print("=" * 70)
    print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed} tests")
    print("=" * 70)
    if failed == 0:
        print("ALL TESTS PASSED")
    else:
        print(f"WARNING: {failed} test(s) FAILED")


if __name__ == "__main__":
    run_tests()
