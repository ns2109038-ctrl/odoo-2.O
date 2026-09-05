import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.models.user import User
from app.models.product import Product
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print(">>> RUNNING PRODUCTS MODULE COMPREHENSIVE TESTS <<<")
    print("=" * 60)

    # 0. Setup: Create test user and get authentication token
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    pw = "SecretProd123!"
    auth_user = create_user(
        db,
        UserCreate(
            name="Product Manager",
            login_id=f"pm_{suffix}",
            email=f"pm_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="user",
        )
    )
    db.close()

    login_res = client.post("/api/auth/login", json={"login_id": f"pm_{suffix}", "password": pw})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Unauthenticated Access
    print("\n=== 1. Test Authentication Requirement ===")
    r_unauth = client.get("/api/products")
    assert r_unauth.status_code == 401, f"Expected 401, got {r_unauth.status_code}"
    print("Unauthenticated access correctly rejected with 401 Unauthorized.")

    # 2. Test Product Creation
    print("\n=== 2. Test Product Creation (POST /api/products) ===")
    test_sku = f"UF-DESK-{suffix.upper()}"
    product_payload = {
        "name": "Executive Ergonomic Desk",
        "sku": test_sku,
        "description": "Solid oak executive desk with dual motor height adjustment",
        "category": "Desks",
        "unit": "Piece",
        "sale_price": "45000.00",
        "purchase_price": "28000.00",
        "tax_rate": "18.00",
        "is_active": True,
    }
    r = client.post("/api/products", json=product_payload, headers=auth_headers)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    prod_data = r.json()
    prod_id = prod_data["id"]
    assert prod_data["name"] == "Executive Ergonomic Desk"
    assert prod_data["sku"] == test_sku
    assert prod_data["category"] == "Desks"
    assert prod_data["unit"] == "Piece"
    assert Decimal(str(prod_data["sale_price"])) == Decimal("45000.00")
    assert Decimal(str(prod_data["purchase_price"])) == Decimal("28000.00")
    assert Decimal(str(prod_data["tax_rate"])) == Decimal("18.00")
    assert prod_data["is_active"] is True
    assert "created_at" in prod_data
    assert "updated_at" in prod_data
    print(f"Product #{prod_id} created successfully with SKU {test_sku}.")

    # Create a second product (Dining Table) for filtering & search tests
    test_sku_2 = f"UF-TABLE-{suffix.upper()}"
    r2 = client.post("/api/products", json={
        "name": "Nordic Dining Table",
        "sku": test_sku_2,
        "description": "6-seater solid pine wood dining table",
        "category": "Tables",
        "unit": "Unit",
        "sale_price": "32000.00",
        "purchase_price": "19000.00",
        "tax_rate": "12.00",
    }, headers=auth_headers)
    assert r2.status_code == 201
    prod_id_2 = r2.json()["id"]
    print(f"Product #{prod_id_2} created successfully with SKU {test_sku_2}.")

    # 3. Test Validation: Duplicate SKU, Negative Prices, Negative Tax
    print("\n=== 3. Test Validation Rules ===")
    # 3a. Duplicate SKU
    r_dup = client.post("/api/products", json={
        "name": "Another Desk",
        "sku": test_sku,
        "sale_price": "1000.00",
    }, headers=auth_headers)
    assert r_dup.status_code == 400, f"Expected 400, got {r_dup.status_code}"
    assert "already exists" in r_dup.json()["detail"]
    print("Duplicate SKU correctly rejected with 400 Bad Request.")

    # 3b. Negative sale_price
    r_neg_sale = client.post("/api/products", json={
        "name": "Neg Sale",
        "sku": f"NEG-1-{suffix}",
        "sale_price": "-10.00",
    }, headers=auth_headers)
    assert r_neg_sale.status_code == 422, f"Expected 422, got {r_neg_sale.status_code}"
    print("Negative sale_price correctly rejected with 422.")

    # 3c. Negative purchase_price
    r_neg_pur = client.post("/api/products", json={
        "name": "Neg Purchase",
        "sku": f"NEG-2-{suffix}",
        "purchase_price": "-50.00",
    }, headers=auth_headers)
    assert r_neg_pur.status_code == 422, f"Expected 422, got {r_neg_pur.status_code}"
    print("Negative purchase_price correctly rejected with 422.")

    # 3d. Negative tax_rate
    r_neg_tax = client.post("/api/products", json={
        "name": "Neg Tax",
        "sku": f"NEG-3-{suffix}",
        "tax_rate": "-5.00",
    }, headers=auth_headers)
    assert r_neg_tax.status_code == 422, f"Expected 422, got {r_neg_tax.status_code}"
    print("Negative tax_rate correctly rejected with 422.")

    # 4. Test Get Product by ID (GET /api/products/{id})
    print("\n=== 4. Test Get Product by ID ===")
    r_get = client.get(f"/api/products/{prod_id}", headers=auth_headers)
    assert r_get.status_code == 200
    assert r_get.json()["id"] == prod_id
    assert r_get.json()["sku"] == test_sku

    r_404 = client.get("/api/products/999999", headers=auth_headers)
    assert r_404.status_code == 404
    print("Get product by ID and 404 behavior verified.")

    # 5. Test List Products with Pagination & Category Filter
    print("\n=== 5. Test List Products (Pagination & Category Filter) ===")
    r_list = client.get("/api/products?skip=0&limit=10", headers=auth_headers)
    assert r_list.status_code == 200
    items = r_list.json()
    assert isinstance(items, list)
    assert len(items) >= 2
    print(f"Retrieved {len(items)} products with pagination.")

    # Category filter
    r_cat = client.get("/api/products?category=Desks", headers=auth_headers)
    assert r_cat.status_code == 200
    desks = r_cat.json()
    assert all(d["category"] == "Desks" for d in desks)
    print(f"Category filter verified: {len(desks)} desk(s) found.")

    # 6. Test Search Products
    print("\n=== 6. Test Search Products ===")
    # Search by Name
    r_s_name = client.get("/api/products?search=Ergonomic", headers=auth_headers)
    assert r_s_name.status_code == 200
    assert any(p["id"] == prod_id for p in r_s_name.json())
    print("Search by name verified.")

    # Search by SKU
    r_s_sku = client.get(f"/api/products?search={test_sku}", headers=auth_headers)
    assert r_s_sku.status_code == 200
    assert any(p["id"] == prod_id for p in r_s_sku.json())
    print("Search by SKU verified.")

    # 7. Test Update Product (PUT /api/products/{id})
    print("\n=== 7. Test Update Product (PUT /api/products/{id}) ===")
    update_payload = {
        "name": "Executive Motorized Standing Desk Pro",
        "sale_price": "49500.00",
        "tax_rate": "18.00",
    }
    r_upd = client.put(f"/api/products/{prod_id}", json=update_payload, headers=auth_headers)
    assert r_upd.status_code == 200
    updated = r_upd.json()
    assert updated["name"] == "Executive Motorized Standing Desk Pro"
    assert Decimal(str(updated["sale_price"])) == Decimal("49500.00")
    print("Product updated successfully.")

    # 8. Test Activate / Deactivate (PATCH /api/products/{id}/status)
    print("\n=== 8. Test Activate/Deactivate (PATCH /api/products/{id}/status) ===")
    r_deact = client.patch(f"/api/products/{prod_id}/status", json={"is_active": False}, headers=auth_headers)
    assert r_deact.status_code == 200
    assert r_deact.json()["is_active"] is False
    print("Product deactivated (is_active=False).")

    r_react = client.patch(f"/api/products/{prod_id}/status", json={"is_active": True}, headers=auth_headers)
    assert r_react.status_code == 200
    assert r_react.json()["is_active"] is True
    print("Product reactivated (is_active=True).")

    # 9. Test Delete Product (DELETE /api/products/{id})
    print("\n=== 9. Test Delete Product (DELETE /api/products/{id}) ===")
    r_del = client.delete(f"/api/products/{prod_id_2}", headers=auth_headers)
    assert r_del.status_code == 200
    assert r_del.json()["id"] == prod_id_2

    # Verify 404 after deletion
    r_del_check = client.get(f"/api/products/{prod_id_2}", headers=auth_headers)
    assert r_del_check.status_code == 404
    print("Product deleted and verified via 404 Not Found.")

    print("\n" + "=" * 60)
    print(">>> ALL PRODUCTS MODULE TESTS PASSED (9/9)! <<<")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
