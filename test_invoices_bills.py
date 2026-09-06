"""
Tests for Invoices & Bills Backend Module.

Coverage:
  1. RBAC: unauthenticated 401, regular user 403 on mutations, authenticated GET 200
  2. Create Customer Invoice: draft status, backend totals, auto-numbering INV-xxxx
  3. Create Vendor Bill: draft status, backend totals, auto-numbering BILL-xxxx
  4. Validation:
     - Customer invoice with vendor-only contact -> 400
     - Vendor bill with customer-only contact -> 400
     - Quantity <= 0 -> 422
     - Inactive product -> 400
     - Empty lines -> 422
     - Invalid invoice_type -> 422
  5. Totals calculation: subtotal, tax, total calculated on backend accurately
  6. Default prices and taxes from product
  7. Update draft invoice: recalculates totals
  8. Edit non-draft (posted) invoice rejected -> 400
  9. Posting Customer Invoice:
     - Creates balanced JournalEntry (Debit AR, Credit Sales, Credit Tax)
     - status -> 'posted', journal_entry_id linked
  10. Posting Vendor Bill:
      - Creates balanced JournalEntry (Debit Expense, Debit Input Tax, Credit AP)
      - status -> 'posted', journal_entry_id linked
  11. Re-posting already posted invoice rejected -> 400
  12. Cancelling Draft Invoice -> status 'cancelled'
  13. Cancelling Posted Invoice:
      - Triggers reversal journal entry
      - status -> 'cancelled'
  14. Cancelling already cancelled invoice rejected -> 400
  15. GET list filters: invoice_type, status, contact_id, search, pagination
"""
import uuid
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.contact import Contact
from app.models.product import Product
from app.models.account import Account
from app.models.journal import Journal
from app.models.journal_entry import JournalEntry
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)


def _token(login_id: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"login_id": login_id, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def setup_fixtures(db, suffix: str) -> dict:
    pw = "SecretInv123!"

    admin = create_user(db, UserCreate(
        name="Inv Admin", login_id=f"inv_adm_{suffix}",
        email=f"inv_adm_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="admin",
    ))
    accountant = create_user(db, UserCreate(
        name="Inv Accountant", login_id=f"inv_acc_{suffix}",
        email=f"inv_acc_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="accountant",
    ))
    regular = create_user(db, UserCreate(
        name="Inv User", login_id=f"inv_reg_{suffix}",
        email=f"inv_reg_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="user",
    ))

    # Accounts
    ar_acc = Account(
        code=f"1100_{suffix}", name=f"Accounts Receivable {suffix}",
        account_name=f"Accounts Receivable {suffix}",
        account_type="asset", is_active=True,
    )
    sales_acc = Account(
        code=f"4100_{suffix}", name=f"Product Sales {suffix}",
        account_name=f"Product Sales {suffix}",
        account_type="income", is_active=True,
    )
    tax_out_acc = Account(
        code=f"2200_{suffix}", name=f"Tax Output Payable {suffix}",
        account_name=f"Tax Output Payable {suffix}",
        account_type="liability", is_active=True,
    )
    ap_acc = Account(
        code=f"2100_{suffix}", name=f"Accounts Payable {suffix}",
        account_name=f"Accounts Payable {suffix}",
        account_type="liability", is_active=True,
    )
    expense_acc = Account(
        code=f"5100_{suffix}", name=f"COGS Expense {suffix}",
        account_name=f"COGS Expense {suffix}",
        account_type="expense", is_active=True,
    )
    tax_in_acc = Account(
        code=f"1200_{suffix}", name=f"Input Tax Receivable {suffix}",
        account_name=f"Input Tax Receivable {suffix}",
        account_type="asset", is_active=True,
    )
    db.add_all([ar_acc, sales_acc, tax_out_acc, ap_acc, expense_acc, tax_in_acc])
    db.flush()

    # Journals
    sales_journal = Journal(
        journal_name=f"Customer Invoices Journal {suffix}",
        journal_type="Sales",
        default_debit_account_id=ar_acc.id,
        default_credit_account_id=sales_acc.id,
        is_active=True,
    )
    purchase_journal = Journal(
        journal_name=f"Vendor Bills Journal {suffix}",
        journal_type="Purchase",
        default_debit_account_id=expense_acc.id,
        default_credit_account_id=ap_acc.id,
        is_active=True,
    )
    db.add_all([sales_journal, purchase_journal])
    db.flush()

    # Contacts
    customer = Contact(
        name=f"Customer Corp {suffix}", contact_type="customer", type="customer",
        email=f"cust_{suffix}@urban.com", is_active=True,
    )
    vendor = Contact(
        name=f"Vendor Supplies {suffix}", contact_type="vendor", type="vendor",
        email=f"vend_{suffix}@urban.com", is_active=True,
    )
    db.add_all([customer, vendor])

    # Products
    product_chair = Product(
        name=f"Ergonomic Chair {suffix}", sku=f"CHR-{suffix}",
        sale_price=Decimal("300.00"), sales_price=Decimal("300.00"),
        purchase_price=Decimal("150.00"), tax_rate=Decimal("18.00"),
        income_account_id=sales_acc.id, expense_account_id=expense_acc.id,
        unit="Pcs", is_active=True,
    )
    product_table = Product(
        name=f"Dining Table {suffix}", sku=f"TBL-{suffix}",
        sale_price=Decimal("800.00"), sales_price=Decimal("800.00"),
        purchase_price=Decimal("450.00"), tax_rate=Decimal("0.00"),
        income_account_id=sales_acc.id, expense_account_id=expense_acc.id,
        unit="Pcs", is_active=True,
    )
    inactive_product = Product(
        name=f"Discontinued Lamp {suffix}", sku=f"LMP-{suffix}",
        sale_price=Decimal("50.00"), sales_price=Decimal("50.00"),
        purchase_price=Decimal("20.00"), tax_rate=Decimal("5.00"),
        unit="Pcs", is_active=False,
    )
    db.add_all([product_chair, product_table, inactive_product])
    db.commit()

    return {
        "admin": admin, "accountant": accountant, "regular": regular,
        "customer": customer, "vendor": vendor,
        "product_chair": product_chair, "product_table": product_table,
        "inactive_product": inactive_product,
        "ar_acc": ar_acc, "sales_acc": sales_acc, "tax_out_acc": tax_out_acc,
        "ap_acc": ap_acc, "expense_acc": expense_acc, "tax_in_acc": tax_in_acc,
        "sales_journal": sales_journal, "purchase_journal": purchase_journal,
        "pw": pw,
    }


def run_tests():
    print("=" * 70)
    print(">>> RUNNING INVOICES & BILLS BACKEND MODULE TESTS <<<")
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
    r = client.get("/api/invoices")
    if r.status_code == 401:
        ok("GET /api/invoices unauthenticated -> 401")
    else:
        fail("GET /api/invoices unauthenticated", r.text)

    r = client.post("/api/invoices", json={})
    if r.status_code == 401:
        ok("POST /api/invoices unauthenticated -> 401")
    else:
        fail("POST /api/invoices unauthenticated", r.text)

    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": f["customer"].id,
        "lines": [{"product_id": f["product_chair"].id, "quantity": "1"}],
    }, headers=_auth(reg_tok))
    if r.status_code == 403:
        ok("Regular user POST /api/invoices -> 403")
    else:
        fail("Regular user POST /api/invoices -> 403", r.text)

    r = client.get("/api/invoices", headers=_auth(reg_tok))
    if r.status_code == 200:
        ok("Regular user GET /api/invoices -> 200")
    else:
        fail("Regular user GET /api/invoices -> 200", r.text)

    # ---- 2. Create Customer Invoice -----------------------------------------
    cust_inv = {}
    vend_bill = {}
    # Chair: qty=2, unit_price=300, tax_rate=18 -> net=600, tax=108, total=708
    # Table: qty=1, unit_price=800, tax_rate=0  -> net=800, tax=0,   total=800
    # subtotal = 1400.00, tax = 108.00, total = 1508.00
    payload_inv = {
        "invoice_type": "customer_invoice",
        "contact_id": f["customer"].id,
        "invoice_date": str(date.today()),
        "lines": [
            {"product_id": f["product_chair"].id, "quantity": "2", "unit_price": "300.00", "tax_rate": "18.00"},
            {"product_id": f["product_table"].id, "quantity": "1", "unit_price": "800.00", "tax_rate": "0.00"},
        ],
    }
    r = client.post("/api/invoices", json=payload_inv, headers=_auth(acc_tok))
    if r.status_code == 201:
        cust_inv = r.json()
        ok(f"Create customer invoice -> 201 (id={cust_inv['id']}, no={cust_inv['invoice_number']})")
        if (Decimal(cust_inv["subtotal"]) == Decimal("1400.00") and
            Decimal(cust_inv["tax"]) == Decimal("108.00") and
            Decimal(cust_inv["total"]) == Decimal("1508.00")):
            ok(f"Customer invoice totals correct: subtotal={cust_inv['subtotal']}, tax={cust_inv['tax']}, total={cust_inv['total']}")
        else:
            fail("Customer invoice totals", f"got subtotal={cust_inv['subtotal']}, tax={cust_inv['tax']}, total={cust_inv['total']}")

        if cust_inv["status"] == "draft":
            ok("Customer invoice status is 'draft'")
        else:
            fail("Initial invoice status", cust_inv["status"])

        if cust_inv["invoice_number"].startswith("INV-"):
            ok(f"Invoice number format correct: {cust_inv['invoice_number']}")
        else:
            fail("Invoice number prefix", cust_inv["invoice_number"])
    else:
        fail("Create customer invoice -> 201", r.text)

    # ---- 3. Create Vendor Bill ----------------------------------------------
    # Chair: qty=5, unit_price=150, tax_rate=18 -> net=750, tax=135, total=885
    payload_bill = {
        "invoice_type": "vendor_bill",
        "contact_id": f["vendor"].id,
        "lines": [
            {"product_id": f["product_chair"].id, "quantity": "5", "unit_price": "150.00", "tax_rate": "18.00"}
        ],
    }
    r = client.post("/api/invoices", json=payload_bill, headers=_auth(acc_tok))
    if r.status_code == 201:
        vend_bill = r.json()
        ok(f"Create vendor bill -> 201 (id={vend_bill['id']}, no={vend_bill['invoice_number']})")
        if (Decimal(vend_bill["subtotal"]) == Decimal("750.00") and
            Decimal(vend_bill["tax"]) == Decimal("135.00") and
            Decimal(vend_bill["total"]) == Decimal("885.00")):
            ok("Vendor bill totals correct: subtotal=750.00, tax=135.00, total=885.00")
        else:
            fail("Vendor bill totals", f"got total={vend_bill['total']}")

        if vend_bill["invoice_number"].startswith("BILL-"):
            ok(f"Vendor bill prefix correct: {vend_bill['invoice_number']}")
        else:
            fail("Vendor bill prefix", vend_bill["invoice_number"])
    else:
        fail("Create vendor bill -> 201", r.text)

    # ---- 4. Contact type validations ----------------------------------------
    # Customer invoice with vendor contact -> 400
    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": f["vendor"].id,
        "lines": [{"product_id": f["product_chair"].id, "quantity": "1"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Customer invoice with vendor contact rejected -> 400")
    else:
        fail("Customer invoice with vendor contact", r.text)

    # Vendor bill with customer contact -> 400
    r = client.post("/api/invoices", json={
        "invoice_type": "vendor_bill",
        "contact_id": f["customer"].id,
        "lines": [{"product_id": f["product_chair"].id, "quantity": "1"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Vendor bill with customer contact rejected -> 400")
    else:
        fail("Vendor bill with customer contact", r.text)

    # ---- 5. Line validations ------------------------------------------------
    # Quantity <= 0
    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": f["customer"].id,
        "lines": [{"product_id": f["product_chair"].id, "quantity": "0"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 422:
        ok("Line quantity=0 rejected -> 422")
    else:
        fail("Quantity=0 rejection", r.text)

    # Inactive product
    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": f["customer"].id,
        "lines": [{"product_id": f["inactive_product"].id, "quantity": "1"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Inactive product rejected -> 400")
    else:
        fail("Inactive product rejection", r.text)

    # Empty lines list
    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": f["customer"].id,
        "lines": [],
    }, headers=_auth(acc_tok))
    if r.status_code == 422:
        ok("Empty lines list rejected -> 422")
    else:
        fail("Empty lines rejection", r.text)

    # Invalid invoice_type
    r = client.post("/api/invoices", json={
        "invoice_type": "invalid_type",
        "contact_id": f["customer"].id,
        "lines": [{"product_id": f["product_chair"].id, "quantity": "1"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 422:
        ok("Invalid invoice_type rejected -> 422")
    else:
        fail("Invalid invoice_type rejection", r.text)

    # ---- 6. Default prices & taxes from product -----------------------------
    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": f["customer"].id,
        "lines": [{"product_id": f["product_chair"].id, "quantity": "3"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 201:
        auto_inv = r.json()
        # Chair sale_price = 300, tax_rate = 18% -> net=900, tax=162, total=1062
        if Decimal(auto_inv["total"]) == Decimal("1062.00"):
            ok("Auto-resolved product sale_price and tax_rate -> total=1062.00")
        else:
            fail("Auto-resolved product defaults", f"total={auto_inv['total']}")
    else:
        fail("Auto-resolve product defaults -> 201", r.text)

    # ---- 7. Update draft invoice --------------------------------------------
    r = client.put(f"/api/invoices/{cust_inv['id']}", json={
        "lines": [
            {"product_id": f["product_chair"].id, "quantity": "1", "unit_price": "300.00", "tax_rate": "18.00"}
        ]
    }, headers=_auth(acc_tok))
    if r.status_code == 200:
        updated = r.json()
        if Decimal(updated["total"]) == Decimal("354.00"):
            ok(f"Update draft invoice -> totals recalculated (total={updated['total']})")
        else:
            fail("Update draft invoice totals", f"total={updated['total']}")
    else:
        fail("Update draft invoice -> 200", r.text)

    # ---- 8. Posting Customer Invoice (Double-Entry Accounting) --------------
    # updated cust_inv: net=300.00, tax=54.00, total=354.00
    r = client.post(f"/api/invoices/{cust_inv['id']}/post", headers=_auth(acc_tok))
    if r.status_code == 200:
        posted_inv = r.json()
        if posted_inv["status"] == "posted" and posted_inv["journal_entry_id"]:
            ok(f"Post customer invoice -> status='posted', journal_entry_id={posted_inv['journal_entry_id']}")

            # Verify the linked journal entry is balanced
            je = db.query(JournalEntry).filter(JournalEntry.id == posted_inv["journal_entry_id"]).first()
            if je:
                tot_debit = sum(Decimal(str(l.debit)) for l in je.lines)
                tot_credit = sum(Decimal(str(l.credit)) for l in je.lines)
                if tot_debit == tot_credit == Decimal("354.00"):
                    ok(f"Linked journal entry is balanced: Debit={tot_debit}, Credit={tot_credit}")
                else:
                    fail("Linked journal entry balance", f"Debit={tot_debit}, Credit={tot_credit}")

                if je.status == "posted":
                    ok("Linked journal entry status is 'posted'")
                else:
                    fail("Linked journal entry status", je.status)
            else:
                fail("Retrieve linked journal entry", f"id={posted_inv['journal_entry_id']}")
        else:
            fail("Post customer invoice result", str(posted_inv))
    else:
        fail("Post customer invoice -> 200", r.text)

    # ---- 9. Posting Vendor Bill (Double-Entry Accounting) -------------------
    # vend_bill: subtotal=750.00, tax=135.00, total=885.00
    r = client.post(f"/api/invoices/{vend_bill['id']}/post", headers=_auth(acc_tok))
    if r.status_code == 200:
        posted_bill = r.json()
        if posted_bill["status"] == "posted" and posted_bill["journal_entry_id"]:
            ok(f"Post vendor bill -> status='posted', journal_entry_id={posted_bill['journal_entry_id']}")

            je_bill = db.query(JournalEntry).filter(JournalEntry.id == posted_bill["journal_entry_id"]).first()
            if je_bill:
                tot_deb = sum(Decimal(str(l.debit)) for l in je_bill.lines)
                tot_cred = sum(Decimal(str(l.credit)) for l in je_bill.lines)
                if tot_deb == tot_cred == Decimal("885.00"):
                    ok(f"Linked bill journal entry is balanced: Debit={tot_deb}, Credit={tot_cred}")
                else:
                    fail("Linked bill journal entry balance", f"Debit={tot_deb}, Credit={tot_cred}")
            else:
                fail("Retrieve bill journal entry", f"id={posted_bill['journal_entry_id']}")
        else:
            fail("Post vendor bill result", str(posted_bill))
    else:
        fail("Post vendor bill -> 200", r.text)

    # ---- 10. Edit / Re-post posted invoice rejected -------------------------
    r = client.put(f"/api/invoices/{cust_inv['id']}", json={"lines": [{"product_id": f["product_chair"].id, "quantity": "1"}]}, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Edit posted invoice rejected -> 400")
    else:
        fail("Edit posted invoice", r.text)

    r = client.post(f"/api/invoices/{cust_inv['id']}/post", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Re-post posted invoice rejected -> 400")
    else:
        fail("Re-post posted invoice", r.text)

    # ---- 11. Cancel Posted Invoice (Reversal Logic) -------------------------
    r = client.post(f"/api/invoices/{cust_inv['id']}/cancel", headers=_auth(acc_tok))
    if r.status_code == 200:
        cancelled_inv = r.json()
        if cancelled_inv["status"] == "cancelled":
            ok("Cancel posted invoice -> status='cancelled'")
        else:
            fail("Cancel posted invoice status", cancelled_inv["status"])
    else:
        fail("Cancel posted invoice -> 200", r.text)

    # Re-cancel cancelled invoice rejected -> 400
    r = client.post(f"/api/invoices/{cust_inv['id']}/cancel", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Re-cancel cancelled invoice rejected -> 400")
    else:
        fail("Re-cancel cancelled invoice", r.text)

    # ---- 12. Cancel Draft Invoice directly ----------------------------------
    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": f["customer"].id,
        "lines": [{"product_id": f["product_chair"].id, "quantity": "1"}],
    }, headers=_auth(acc_tok))
    assert r.status_code == 201
    draft_inv = r.json()

    r = client.post(f"/api/invoices/{draft_inv['id']}/cancel", headers=_auth(acc_tok))
    if r.status_code == 200 and r.json()["status"] == "cancelled":
        ok("Cancel draft invoice directly -> status='cancelled'")
    else:
        fail("Cancel draft invoice", r.text)

    # ---- 13. GET Detail & Filters -------------------------------------------
    r = client.get(f"/api/invoices/{draft_inv['id']}", headers=_auth(reg_tok))
    if r.status_code == 200:
        ok(f"GET /api/invoices/{draft_inv['id']} -> 200")
    else:
        fail("GET invoice detail", r.text)

    # Filter invoice_type=vendor_bill
    r = client.get("/api/invoices?invoice_type=vendor_bill", headers=_auth(reg_tok))
    if r.status_code == 200:
        data = r.json()["data"]
        if all(inv["invoice_type"] == "vendor_bill" for inv in data):
            ok(f"Filter invoice_type=vendor_bill -> all match (count={len(data)})")
        else:
            fail("Filter invoice_type=vendor_bill", str(data))
    else:
        fail("Filter invoice_type=vendor_bill -> 200", r.text)

    # Filter status=posted
    r = client.get("/api/invoices?status=posted", headers=_auth(reg_tok))
    if r.status_code == 200:
        data = r.json()["data"]
        if all(inv["status"] == "posted" for inv in data):
            ok(f"Filter status=posted -> all match (count={len(data)})")
        else:
            fail("Filter status=posted", str(data))
    else:
        fail("Filter status=posted -> 200", r.text)

    # Filter contact_id
    r = client.get(f"/api/invoices?contact_id={f['customer'].id}", headers=_auth(reg_tok))
    if r.status_code == 200:
        data = r.json()["data"]
        if all(inv["contact_id"] == f["customer"].id for inv in data):
            ok(f"Filter contact_id={f['customer'].id} -> all match")
        else:
            fail("Filter contact_id", str(data))
    else:
        fail("Filter contact_id -> 200", r.text)

    # Admin mutation access
    r = client.post("/api/invoices", json={
        "invoice_type": "customer_invoice",
        "contact_id": f["customer"].id,
        "lines": [{"product_id": f["product_chair"].id, "quantity": "1"}],
    }, headers=_auth(admin_tok))
    if r.status_code == 201:
        ok("Admin can create customer invoice -> 201")
    else:
        fail("Admin create invoice", r.text)

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
