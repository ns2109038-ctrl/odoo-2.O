"""
Tests for the Purchase Orders module.

Coverage:
  - CRUD: create, read (list + detail), update, status transitions
  - Validation: wrong vendor type, inactive product, zero quantity, bad status
  - RBAC: unauthenticated 401, regular user 403 on mutations
  - Totals: backend computes subtotal / tax / total correctly
  - Pagination / search / vendor filter / status filter
  - Regression: existing sales orders unaffected
"""
import uuid
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.contact import Contact
from app.models.product import Product
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)


# ---- helpers ----------------------------------------------------------------

def _token(login_id: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"login_id": login_id, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---- fixtures ---------------------------------------------------------------

def setup_fixtures(db, suffix: str) -> dict:
    pw = "SecretPO123!"

    admin = create_user(db, UserCreate(
        name="PO Admin", login_id=f"po_admin_{suffix}",
        email=f"po_admin_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="admin",
    ))
    accountant = create_user(db, UserCreate(
        name="PO Accountant", login_id=f"po_acc_{suffix}",
        email=f"po_acc_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="accountant",
    ))
    regular = create_user(db, UserCreate(
        name="PO Regular", login_id=f"po_reg_{suffix}",
        email=f"po_reg_{suffix}@urban.com",
        password=pw, confirm_password=pw, role="user",
    ))

    # Vendor contact
    vendor = Contact(
        name=f"Test Vendor {suffix}", contact_type="vendor", type="vendor",
        email=f"vendor_{suffix}@urban.com", is_active=True,
    )
    db.add(vendor)

    # Supplier contact (also valid as vendor)
    supplier = Contact(
        name=f"Test Supplier {suffix}", contact_type="supplier", type="supplier",
        email=f"supplier_{suffix}@urban.com", is_active=True,
    )
    db.add(supplier)

    # Customer-only contact (NOT valid as vendor)
    customer_only = Contact(
        name=f"Customer Only {suffix}", contact_type="customer", type="customer",
        email=f"custonly_{suffix}@urban.com", is_active=True,
    )
    db.add(customer_only)

    # Active products
    product_a = Product(
        name=f"Raw Material A {suffix}", sku=f"RMA-{suffix}",
        sale_price=Decimal("200.00"), sales_price=Decimal("200.00"),
        purchase_price=Decimal("150.00"), tax_rate=Decimal("18.00"),
        unit="Kg", is_active=True,
    )
    db.add(product_a)

    product_b = Product(
        name=f"Component B {suffix}", sku=f"CMB-{suffix}",
        sale_price=Decimal("500.00"), sales_price=Decimal("500.00"),
        purchase_price=Decimal("400.00"), tax_rate=Decimal("0.00"),
        unit="Pcs", is_active=True,
    )
    db.add(product_b)

    # Inactive product
    product_inactive = Product(
        name=f"Obsolete Part {suffix}", sku=f"OBS-{suffix}",
        sale_price=Decimal("100.00"), sales_price=Decimal("100.00"),
        purchase_price=Decimal("80.00"), tax_rate=Decimal("5.00"),
        unit="Pcs", is_active=False,
    )
    db.add(product_inactive)

    db.commit()
    for obj in [vendor, supplier, customer_only, product_a, product_b,
                product_inactive, admin, accountant, regular]:
        db.refresh(obj)

    return dict(
        pw=pw, admin=admin, accountant=accountant, regular=regular,
        vendor=vendor, supplier=supplier, customer_only=customer_only,
        product_a=product_a, product_b=product_b, product_inactive=product_inactive,
    )


# ---- test runner ------------------------------------------------------------

def run_tests():
    print("=" * 70)
    print(">>> RUNNING PURCHASE ORDERS MODULE TESTS <<<")
    print("=" * 70)

    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    f = setup_fixtures(db, suffix)
    pw = f["pw"]

    admin_tok = _token(f["admin"].login_id, pw)
    acc_tok = _token(f["accountant"].login_id, pw)
    reg_tok = _token(f["regular"].login_id, pw)

    passed = 0
    failed = 0

    def ok(name):
        nonlocal passed
        passed += 1
        print(f"  [PASS] {name}")

    def fail(name, detail=""):
        nonlocal failed
        failed += 1
        print(f"  [FAIL] {name}: {detail}")

    # ---- 1. RBAC: unauthenticated ------------------------------------------
    r = client.get("/api/purchases")
    if r.status_code == 401:
        ok("GET /api/purchases without token -> 401")
    else:
        fail("GET /api/purchases without token -> 401", r.text)

    r = client.post("/api/purchases", json={})
    if r.status_code == 401:
        ok("POST /api/purchases without token -> 401")
    else:
        fail("POST /api/purchases without token -> 401", r.text)

    # ---- 2. RBAC: regular user cannot mutate --------------------------------
    payload = {
        "vendor_id": f["vendor"].id,
        "lines": [{"product_id": f["product_a"].id, "quantity": "10",
                   "unit_price": "150.00", "tax_rate": "18.00"}],
    }
    r = client.post("/api/purchases", json=payload, headers=_auth(reg_tok))
    if r.status_code == 403:
        ok("Regular user POST /api/purchases -> 403")
    else:
        fail("Regular user POST /api/purchases -> 403", f"{r.status_code} {r.text}")

    # ---- 3. Regular user can read -------------------------------------------
    r = client.get("/api/purchases", headers=_auth(reg_tok))
    if r.status_code == 200:
        ok("Regular user GET /api/purchases -> 200")
    else:
        fail("Regular user GET /api/purchases -> 200", r.text)

    # ---- 4. Create purchase order (accountant) ------------------------------
    payload = {
        "vendor_id": f["vendor"].id,
        "order_date": str(date.today()),
        "lines": [
            {"product_id": f["product_a"].id, "quantity": "10",
             "unit_price": "150.00", "tax_rate": "18.00"},
            {"product_id": f["product_b"].id, "quantity": "5",
             "unit_price": "400.00", "tax_rate": "0.00"},
        ],
    }
    r = client.post("/api/purchases", json=payload, headers=_auth(acc_tok))
    if r.status_code == 201:
        order = r.json()
        ok(f"Create purchase order -> 201 (id={order['id']}, no={order['order_number']})")
    else:
        fail("Create purchase order -> 201", r.text)
        db.close()
        print(f"\nTotal: {passed} passed, {failed} failed")
        return

    order_id = order["id"]

    # ---- 5. Verify backend totals -------------------------------------------
    # Line A: 10 * 150 = 1500, tax 18% = 270  -> line_total 1770
    # Line B:  5 * 400 = 2000, tax  0% =   0  -> line_total 2000
    # subtotal=3500, tax=270, total=3770
    exp_sub = Decimal("3500.00")
    exp_tax = Decimal("270.00")
    exp_tot = Decimal("3770.00")

    got_sub = Decimal(order["subtotal"])
    got_tax = Decimal(order["tax"])
    got_tot = Decimal(order["total"])

    if got_sub == exp_sub and got_tax == exp_tax and got_tot == exp_tot:
        ok(f"Backend totals correct: subtotal={got_sub}, tax={got_tax}, total={got_tot}")
    else:
        fail("Backend totals", f"got {got_sub}/{got_tax}/{got_tot}, expected {exp_sub}/{exp_tax}/{exp_tot}")

    # ---- 6. Status defaults to draft ----------------------------------------
    if order["status"] == "draft":
        ok("New order status is 'draft'")
    else:
        fail("New order status is 'draft'", order["status"])

    # ---- 7. Order number format PO-XXXX -------------------------------------
    if order["order_number"].startswith("PO-"):
        ok(f"Order number format correct: {order['order_number']}")
    else:
        fail("Order number format", order["order_number"])

    # ---- 8. GET single order ------------------------------------------------
    r = client.get(f"/api/purchases/{order_id}", headers=_auth(acc_tok))
    if r.status_code == 200 and r.json()["id"] == order_id:
        ok(f"GET /api/purchases/{order_id} -> 200")
    else:
        fail(f"GET /api/purchases/{order_id} -> 200", r.text)

    # ---- 9. GET non-existent ------------------------------------------------
    r = client.get("/api/purchases/999999", headers=_auth(acc_tok))
    if r.status_code == 404:
        ok("GET non-existent -> 404")
    else:
        fail("GET non-existent -> 404", r.text)

    # ---- 10. List with pagination -------------------------------------------
    r = client.get("/api/purchases?skip=0&limit=50", headers=_auth(acc_tok))
    if r.status_code == 200:
        data = r.json()
        if "data" in data and "total" in data:
            ok(f"List paginated -> 200 (total={data['total']})")
        else:
            fail("List paginated: missing data/total", str(data))
    else:
        fail("List paginated -> 200", r.text)

    # ---- 11. Filter by status=draft -----------------------------------------
    r = client.get("/api/purchases?status=draft", headers=_auth(acc_tok))
    if r.status_code == 200:
        data = r.json()
        if all(o["status"] == "draft" for o in data["data"]):
            ok("Filter status=draft -> all results draft")
        else:
            fail("Filter status=draft", "non-draft results returned")
    else:
        fail("Filter status=draft -> 200", r.text)

    # ---- 12. Filter by vendor_id --------------------------------------------
    r = client.get(f"/api/purchases?vendor_id={f['vendor'].id}", headers=_auth(acc_tok))
    if r.status_code == 200:
        data = r.json()
        if all(o["vendor_id"] == f["vendor"].id for o in data["data"]):
            ok(f"Filter vendor_id={f['vendor'].id} -> correct results")
        else:
            fail("Filter vendor_id", "wrong vendors in results")
    else:
        fail("Filter vendor_id -> 200", r.text)

    # ---- 13. Search by order number -----------------------------------------
    order_no = order["order_number"]
    r = client.get(f"/api/purchases?search={order_no}", headers=_auth(acc_tok))
    if r.status_code == 200 and any(o["order_number"] == order_no for o in r.json()["data"]):
        ok(f"Search '{order_no}' -> found")
    else:
        fail(f"Search '{order_no}'", r.text)

    # ---- 14. Update draft order ---------------------------------------------
    update_payload = {
        "lines": [
            {"product_id": f["product_a"].id, "quantity": "20",
             "unit_price": "150.00", "tax_rate": "18.00"},
        ]
    }
    r = client.put(f"/api/purchases/{order_id}", json=update_payload, headers=_auth(acc_tok))
    if r.status_code == 200:
        upd = r.json()
        # 20 * 150 = 3000, tax 18% = 540, total = 3540
        if Decimal(upd["subtotal"]) == Decimal("3000.00") and Decimal(upd["total"]) == Decimal("3540.00"):
            ok("Update draft order -> totals recalculated correctly")
        else:
            fail("Update draft totals", f"sub={upd['subtotal']}, tot={upd['total']}")
    else:
        fail("Update draft order -> 200", r.text)

    # ---- 15. Validation: customer-only contact as vendor --------------------
    r = client.post("/api/purchases", json={
        "vendor_id": f["customer_only"].id,
        "lines": [{"product_id": f["product_a"].id, "quantity": "1",
                   "unit_price": "150.00", "tax_rate": "0"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Customer-only contact as vendor -> 400")
    else:
        fail("Customer-only contact as vendor -> 400", f"{r.status_code} {r.text}")

    # ---- 16. Validation: inactive product -----------------------------------
    r = client.post("/api/purchases", json={
        "vendor_id": f["vendor"].id,
        "lines": [{"product_id": f["product_inactive"].id, "quantity": "1",
                   "unit_price": "80.00", "tax_rate": "0"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Inactive product -> 400")
    else:
        fail("Inactive product -> 400", f"{r.status_code} {r.text}")

    # ---- 17. Validation: quantity = 0 --------------------------------------
    r = client.post("/api/purchases", json={
        "vendor_id": f["vendor"].id,
        "lines": [{"product_id": f["product_a"].id, "quantity": "0",
                   "unit_price": "150.00", "tax_rate": "0"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 422:
        ok("Quantity=0 -> 422")
    else:
        fail("Quantity=0 -> 422", f"{r.status_code} {r.text}")

    # ---- 18. Validation: no lines -------------------------------------------
    r = client.post("/api/purchases", json={
        "vendor_id": f["vendor"].id, "lines": [],
    }, headers=_auth(acc_tok))
    if r.status_code == 422:
        ok("Empty lines -> 422")
    else:
        fail("Empty lines -> 422", f"{r.status_code} {r.text}")

    # ---- 19. Supplier type also accepted as vendor --------------------------
    r = client.post("/api/purchases", json={
        "vendor_id": f["supplier"].id,
        "lines": [{"product_id": f["product_b"].id, "quantity": "3",
                   "unit_price": "400.00", "tax_rate": "0"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 201:
        ok("Supplier contact type accepted as vendor -> 201")
    else:
        fail("Supplier contact type as vendor -> 201", f"{r.status_code} {r.text}")

    # ---- 20. Confirm order --------------------------------------------------
    r = client.post(f"/api/purchases/{order_id}/confirm", headers=_auth(acc_tok))
    if r.status_code == 200 and r.json()["status"] == "confirmed":
        ok(f"Confirm order {order_id} -> status=confirmed")
    else:
        fail(f"Confirm order {order_id}", f"{r.status_code} {r.text}")

    # ---- 21. Cannot edit confirmed order ------------------------------------
    r = client.put(f"/api/purchases/{order_id}", json=update_payload, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Edit confirmed order -> 400")
    else:
        fail("Edit confirmed order -> 400", f"{r.status_code} {r.text}")

    # ---- 22. Cannot re-confirm confirmed order ------------------------------
    r = client.post(f"/api/purchases/{order_id}/confirm", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Re-confirm confirmed order -> 400")
    else:
        fail("Re-confirm confirmed order -> 400", f"{r.status_code} {r.text}")

    # ---- 23. Cancel confirmed order -----------------------------------------
    r = client.post(f"/api/purchases/{order_id}/cancel", headers=_auth(acc_tok))
    if r.status_code == 200 and r.json()["status"] == "cancelled":
        ok(f"Cancel confirmed order -> status=cancelled")
    else:
        fail("Cancel confirmed order", f"{r.status_code} {r.text}")

    # ---- 24. Cannot re-cancel -----------------------------------------------
    r = client.post(f"/api/purchases/{order_id}/cancel", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Re-cancel -> 400")
    else:
        fail("Re-cancel -> 400", f"{r.status_code} {r.text}")

    # ---- 25. Cancel draft order directly ------------------------------------
    r = client.post("/api/purchases", json={
        "vendor_id": f["vendor"].id,
        "lines": [{"product_id": f["product_b"].id, "quantity": "2",
                   "unit_price": "400.00", "tax_rate": "0"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 201:
        draft_id = r.json()["id"]
        r2 = client.post(f"/api/purchases/{draft_id}/cancel", headers=_auth(acc_tok))
        if r2.status_code == 200 and r2.json()["status"] == "cancelled":
            ok(f"Cancel draft order {draft_id} -> cancelled")
        else:
            fail(f"Cancel draft order {draft_id}", f"{r2.status_code} {r2.text}")
    else:
        fail("Create draft order for cancel test", r.text)

    # ---- 26. Invalid status filter -> 400 -----------------------------------
    r = client.get("/api/purchases?status=shipped", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Invalid status filter 'shipped' -> 400")
    else:
        fail("Invalid status filter -> 400", f"{r.status_code} {r.text}")

    # ---- 27. Admin can create -----------------------------------------------
    r = client.post("/api/purchases", json={
        "vendor_id": f["vendor"].id,
        "lines": [{"product_id": f["product_a"].id, "quantity": "5",
                   "unit_price": "150.00", "tax_rate": "18.00"}],
    }, headers=_auth(admin_tok))
    if r.status_code == 201:
        ok("Admin can create purchase order -> 201")
    else:
        fail("Admin create -> 201", r.text)

    # ---- 28. Regression: sales orders unaffected ----------------------------
    r = client.get("/api/sales", headers=_auth(acc_tok))
    if r.status_code == 200:
        ok("Regression: GET /api/sales still works -> 200")
    else:
        fail("Regression: GET /api/sales", r.text)

    # ---- 29. purchase_price used as default when unit_price=0 ---------------
    r = client.post("/api/purchases", json={
        "vendor_id": f["vendor"].id,
        "lines": [{"product_id": f["product_a"].id, "quantity": "4",
                   "unit_price": "0", "tax_rate": "0"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 201:
        auto_price_order = r.json()
        # product_a.purchase_price = 150, qty=4, tax=0 -> subtotal=600
        if Decimal(auto_price_order["subtotal"]) == Decimal("600.00"):
            ok("Default purchase_price used when unit_price=0 -> subtotal=600")
        else:
            fail("Default purchase_price", f"subtotal={auto_price_order['subtotal']}")
    else:
        fail("Create with unit_price=0 (default price test)", r.text)

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
