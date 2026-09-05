"""
Tests for the Sales Orders module.

Coverage:
  - CRUD: create, read (list + detail), update, status transitions
  - Validation: bad customer type, inactive product, bad status transitions, zero quantity
  - RBAC: unauthenticated 401, regular user 403 on mutations, accountant allowed
  - Totals: backend computes subtotal / tax / total correctly
  - Pagination / search / filters
"""
import uuid
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.contact import Contact
from app.models.product import Product
from app.models.user import User
from app.services.user_service import create_user
from app.schemas.user import UserCreate
from app.core.security import hash_password

client = TestClient(app)


# â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _token(login_id: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"login_id": login_id, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# â”€â”€â”€ fixtures (created once per run via db session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def setup_fixtures(db, suffix: str):
    pw = "SecretSales123!"

    admin = create_user(db, UserCreate(
        name="Sales Admin",
        login_id=f"sales_admin_{suffix}",
        email=f"sales_admin_{suffix}@urban.com",
        password=pw,
        confirm_password=pw,
        role="admin",
    ))

    accountant = create_user(db, UserCreate(
        name="Sales Accountant",
        login_id=f"sales_acc_{suffix}",
        email=f"sales_acc_{suffix}@urban.com",
        password=pw,
        confirm_password=pw,
        role="accountant",
    ))

    regular = create_user(db, UserCreate(
        name="Sales Regular",
        login_id=f"sales_reg_{suffix}",
        email=f"sales_reg_{suffix}@urban.com",
        password=pw,
        confirm_password=pw,
        role="user",
    ))

    # Customer contact
    customer = Contact(
        name=f"Test Customer {suffix}",
        contact_type="customer",
        type="customer",
        email=f"cust_{suffix}@urban.com",
        is_active=True,
    )
    db.add(customer)

    # Non-customer contact (supplier only)
    supplier = Contact(
        name=f"Test Supplier {suffix}",
        contact_type="supplier",
        type="supplier",
        email=f"supp_{suffix}@urban.com",
        is_active=True,
    )
    db.add(supplier)

    # Active product
    product_a = Product(
        name=f"Chair {suffix}",
        sku=f"CHR-{suffix}",
        sale_price=Decimal("500.00"),
        sales_price=Decimal("500.00"),
        purchase_price=Decimal("300.00"),
        tax_rate=Decimal("18.00"),
        unit="Pcs",
        is_active=True,
    )
    db.add(product_a)

    # Another product (zero tax)
    product_b = Product(
        name=f"Table {suffix}",
        sku=f"TBL-{suffix}",
        sale_price=Decimal("1200.00"),
        sales_price=Decimal("1200.00"),
        purchase_price=Decimal("800.00"),
        tax_rate=Decimal("0.00"),
        unit="Pcs",
        is_active=True,
    )
    db.add(product_b)

    # Inactive product
    product_inactive = Product(
        name=f"OldSofa {suffix}",
        sku=f"SFA-{suffix}",
        sale_price=Decimal("2000.00"),
        sales_price=Decimal("2000.00"),
        purchase_price=Decimal("1500.00"),
        tax_rate=Decimal("18.00"),
        unit="Pcs",
        is_active=False,
    )
    db.add(product_inactive)

    db.commit()
    db.refresh(customer)
    db.refresh(supplier)
    db.refresh(product_a)
    db.refresh(product_b)
    db.refresh(product_inactive)
    db.refresh(admin)
    db.refresh(accountant)
    db.refresh(regular)

    return {
        "pw": pw,
        "admin": admin,
        "accountant": accountant,
        "regular": regular,
        "customer": customer,
        "supplier": supplier,
        "product_a": product_a,
        "product_b": product_b,
        "product_inactive": product_inactive,
    }


# â”€â”€â”€ test runner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def run_tests():
    print("=" * 70)
    print(">>> RUNNING SALES ORDERS MODULE TESTS <<<")
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

    # â”€â”€ 1. RBAC: unauthenticated â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.get("/api/sales")
    if r.status_code == 401:
        ok("GET /api/sales without token â†’ 401")
    else:
        fail("GET /api/sales without token â†’ 401", r.text)

    r = client.post("/api/sales", json={})
    if r.status_code == 401:
        ok("POST /api/sales without token â†’ 401")
    else:
        fail("POST /api/sales without token â†’ 401", r.text)

    # â”€â”€ 2. RBAC: regular user cannot create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    payload = {
        "customer_id": f["customer"].id,
        "order_date": str(date.today()),
        "lines": [{"product_id": f["product_a"].id, "quantity": "2", "unit_price": "500.00", "tax_rate": "18.00"}],
    }
    r = client.post("/api/sales", json=payload, headers=_auth(reg_tok))
    if r.status_code == 403:
        ok("Regular user POST /api/sales â†’ 403")
    else:
        fail("Regular user POST /api/sales â†’ 403", f"{r.status_code} {r.text}")

    # â”€â”€ 3. Regular user can read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.get("/api/sales", headers=_auth(reg_tok))
    if r.status_code == 200:
        ok("Regular user GET /api/sales â†’ 200")
    else:
        fail("Regular user GET /api/sales â†’ 200", r.text)

    # â”€â”€ 4. Create sales order (accountant) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    payload = {
        "customer_id": f["customer"].id,
        "order_date": str(date.today()),
        "lines": [
            {"product_id": f["product_a"].id, "quantity": "2", "unit_price": "500.00", "tax_rate": "18.00"},
            {"product_id": f["product_b"].id, "quantity": "1", "unit_price": "1200.00", "tax_rate": "0.00"},
        ],
    }
    r = client.post("/api/sales", json=payload, headers=_auth(acc_tok))
    if r.status_code == 201:
        order = r.json()
        ok(f"Create sales order â†’ 201 (id={order['id']}, no={order['order_number']})")
    else:
        fail("Create sales order â†’ 201", r.text)
        db.close()
        print(f"\nTotal: {passed} passed, {failed} failed")
        return

    order_id = order["id"]

    # â”€â”€ 5. Verify backend totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Line A: 2 * 500 = 1000, tax 18% = 180 â†’ line_total 1180
    # Line B: 1 * 1200 = 1200, tax 0% = 0 â†’ line_total 1200
    # subtotal = 1000 + 1200 = 2200, tax = 180 + 0 = 180, total = 2380
    expected_subtotal = Decimal("2200.00")
    expected_tax = Decimal("180.00")
    expected_total = Decimal("2380.00")

    subtotal = Decimal(order["subtotal"])
    tax = Decimal(order["tax"])
    total = Decimal(order["total"])

    if subtotal == expected_subtotal and tax == expected_tax and total == expected_total:
        ok(f"Backend totals correct: subtotal={subtotal}, tax={tax}, total={total}")
    else:
        fail("Backend totals", f"got subtotal={subtotal}, tax={tax}, total={total}; expected {expected_subtotal}, {expected_tax}, {expected_total}")

    # Verify status is draft
    if order["status"] == "draft":
        ok("New order status is 'draft'")
    else:
        fail("New order status is 'draft'", order["status"])

    # â”€â”€ 6. GET single order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.get(f"/api/sales/{order_id}", headers=_auth(acc_tok))
    if r.status_code == 200 and r.json()["id"] == order_id:
        ok(f"GET /api/sales/{order_id} â†’ 200")
    else:
        fail(f"GET /api/sales/{order_id} â†’ 200", r.text)

    # â”€â”€ 7. GET non-existent order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.get("/api/sales/999999", headers=_auth(acc_tok))
    if r.status_code == 404:
        ok("GET non-existent order â†’ 404")
    else:
        fail("GET non-existent order â†’ 404", r.text)

    # â”€â”€ 8. List orders with pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.get("/api/sales?skip=0&limit=50", headers=_auth(acc_tok))
    if r.status_code == 200:
        data = r.json()
        if "data" in data and "total" in data:
            ok(f"List orders paginated â†’ 200 (total={data['total']})")
        else:
            fail("List orders paginated: missing data/total", str(data))
    else:
        fail("List orders paginated â†’ 200", r.text)

    # â”€â”€ 9. Filter by status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.get("/api/sales?status=draft", headers=_auth(acc_tok))
    if r.status_code == 200:
        data = r.json()
        all_draft = all(o["status"] == "draft" for o in data["data"])
        if all_draft:
            ok("Filter by status=draft â†’ all results are draft")
        else:
            fail("Filter by status=draft", "some results are not draft")
    else:
        fail("Filter by status=draft â†’ 200", r.text)

    # â”€â”€ 10. Filter by customer_id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.get(f"/api/sales?customer_id={f['customer'].id}", headers=_auth(acc_tok))
    if r.status_code == 200:
        data = r.json()
        all_cust = all(o["customer_id"] == f["customer"].id for o in data["data"])
        if all_cust:
            ok(f"Filter by customer_id={f['customer'].id} â†’ correct results")
        else:
            fail("Filter by customer_id", "wrong customers in results")
    else:
        fail("Filter by customer_id â†’ 200", r.text)

    # â”€â”€ 11. Search by order number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    order_no = order["order_number"]
    r = client.get(f"/api/sales?search={order_no}", headers=_auth(acc_tok))
    if r.status_code == 200 and any(o["order_number"] == order_no for o in r.json()["data"]):
        ok(f"Search by order_number '{order_no}' â†’ found")
    else:
        fail(f"Search by order_number '{order_no}'", r.text)

    # â”€â”€ 12. Update draft order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    update_payload = {
        "lines": [
            {"product_id": f["product_a"].id, "quantity": "3", "unit_price": "500.00", "tax_rate": "18.00"},
        ]
    }
    r = client.put(f"/api/sales/{order_id}", json=update_payload, headers=_auth(acc_tok))
    if r.status_code == 200:
        updated = r.json()
        # Line A: 3 * 500 = 1500, tax 18% = 270, total = 1770
        if Decimal(updated["subtotal"]) == Decimal("1500.00") and Decimal(updated["total"]) == Decimal("1770.00"):
            ok("Update draft order lines â†’ totals recalculated correctly")
        else:
            fail("Update draft order totals", f"subtotal={updated['subtotal']}, total={updated['total']}")
    else:
        fail("Update draft order â†’ 200", r.text)

    # â”€â”€ 13. Validation: supplier contact as customer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bad_payload = {
        "customer_id": f["supplier"].id,
        "lines": [{"product_id": f["product_a"].id, "quantity": "1", "unit_price": "500.00", "tax_rate": "0"}],
    }
    r = client.post("/api/sales", json=bad_payload, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Create with supplier contact â†’ 400")
    else:
        fail("Create with supplier contact â†’ 400", f"{r.status_code} {r.text}")

    # â”€â”€ 14. Validation: inactive product â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bad_payload2 = {
        "customer_id": f["customer"].id,
        "lines": [{"product_id": f["product_inactive"].id, "quantity": "1", "unit_price": "100.00", "tax_rate": "0"}],
    }
    r = client.post("/api/sales", json=bad_payload2, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Create with inactive product â†’ 400")
    else:
        fail("Create with inactive product â†’ 400", f"{r.status_code} {r.text}")

    # â”€â”€ 15. Validation: quantity must be > 0 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bad_payload3 = {
        "customer_id": f["customer"].id,
        "lines": [{"product_id": f["product_a"].id, "quantity": "0", "unit_price": "500.00", "tax_rate": "0"}],
    }
    r = client.post("/api/sales", json=bad_payload3, headers=_auth(acc_tok))
    if r.status_code == 422:
        ok("Create with quantity=0 â†’ 422")
    else:
        fail("Create with quantity=0 â†’ 422", f"{r.status_code} {r.text}")

    # â”€â”€ 16. Confirm order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.post(f"/api/sales/{order_id}/confirm", headers=_auth(acc_tok))
    if r.status_code == 200 and r.json()["status"] == "confirmed":
        ok(f"Confirm order {order_id} â†’ status=confirmed")
    else:
        fail(f"Confirm order {order_id}", f"{r.status_code} {r.text}")

    # â”€â”€ 17. Cannot edit confirmed order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.put(f"/api/sales/{order_id}", json=update_payload, headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Edit confirmed order â†’ 400")
    else:
        fail("Edit confirmed order â†’ 400", f"{r.status_code} {r.text}")

    # â”€â”€ 18. Cannot confirm an already confirmed order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.post(f"/api/sales/{order_id}/confirm", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Re-confirm confirmed order â†’ 400")
    else:
        fail("Re-confirm confirmed order â†’ 400", f"{r.status_code} {r.text}")

    # â”€â”€ 19. Cancel confirmed order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.post(f"/api/sales/{order_id}/cancel", headers=_auth(acc_tok))
    if r.status_code == 200 and r.json()["status"] == "cancelled":
        ok(f"Cancel confirmed order {order_id} â†’ status=cancelled")
    else:
        fail(f"Cancel order {order_id}", f"{r.status_code} {r.text}")

    # â”€â”€ 20. Cannot cancel an already cancelled order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.post(f"/api/sales/{order_id}/cancel", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Re-cancel cancelled order â†’ 400")
    else:
        fail("Re-cancel cancelled order â†’ 400", f"{r.status_code} {r.text}")

    # â”€â”€ 21. Create a second order and cancel from draft â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.post("/api/sales", json={
        "customer_id": f["customer"].id,
        "lines": [{"product_id": f["product_a"].id, "quantity": "1", "unit_price": "500.00", "tax_rate": "0"}],
    }, headers=_auth(acc_tok))
    if r.status_code == 201:
        order2_id = r.json()["id"]
        r2 = client.post(f"/api/sales/{order2_id}/cancel", headers=_auth(acc_tok))
        if r2.status_code == 200 and r2.json()["status"] == "cancelled":
            ok(f"Cancel draft order {order2_id} â†’ status=cancelled")
        else:
            fail(f"Cancel draft order {order2_id}", f"{r2.status_code} {r2.text}")
    else:
        fail("Create 2nd order for cancel test", r.text)

    # â”€â”€ 22. Admin token can also create orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.post("/api/sales", json={
        "customer_id": f["customer"].id,
        "lines": [{"product_id": f["product_b"].id, "quantity": "2", "unit_price": "1200.00", "tax_rate": "0"}],
    }, headers=_auth(admin_tok))
    if r.status_code == 201:
        ok("Admin can create sales order â†’ 201")
    else:
        fail("Admin can create sales order â†’ 201", r.text)

    # â”€â”€ 23. Filter by invalid status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    r = client.get("/api/sales?status=shipped", headers=_auth(acc_tok))
    if r.status_code == 400:
        ok("Filter with invalid status 'shipped' â†’ 400")
    else:
        fail("Filter with invalid status â†’ 400", f"{r.status_code} {r.text}")

    db.close()

    print()
    print("=" * 70)
    print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed} tests")
    print("=" * 70)
    if failed == 0:
        print("ALL TESTS PASSED âœ“")
    else:
        print(f"WARNING: {failed} test(s) FAILED")


if __name__ == "__main__":
    run_tests()

