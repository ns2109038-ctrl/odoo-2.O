import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.models.user import User
from app.models.contact import Contact
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print(">>> RUNNING CONTACTS MODULE COMPREHENSIVE TESTS <<<")
    print("=" * 60)

    # 0. Setup: Create test user and get authentication token
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    pw = "SecretContact123!"
    auth_user = create_user(
        db,
        UserCreate(
            name="Contact Manager",
            login_id=f"cm_{suffix}",
            email=f"cm_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="user",
        )
    )
    db.close()

    login_res = client.post("/api/auth/login", json={"login_id": f"cm_{suffix}", "password": pw})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Unauthenticated Access
    print("\n=== 1. Test Authentication Requirement ===")
    r_unauth = client.get("/api/contacts")
    assert r_unauth.status_code == 401, f"Expected 401, got {r_unauth.status_code}"
    print("Unauthenticated access correctly rejected with 401 Unauthorized.")

    # 2. Test Contact Creation: Customer, Vendor, and Other
    print("\n=== 2. Test Contact Creation (Customer, Vendor, Other) ===")
    cust_email = f"cust_{suffix}@woodcraft.com"
    customer_payload = {
        "name": "WoodCraft Furnishings",
        "contact_type": "customer",
        "email": cust_email,
        "phone": "+91 9876543210",
        "address": "123 Industrial Estate",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "country": "India",
        "tax_id": "24ABCDE1234F1Z5",
        "is_active": True,
    }
    r_cust = client.post("/api/contacts", json=customer_payload, headers=auth_headers)
    assert r_cust.status_code == 201, f"Expected 201, got {r_cust.status_code}: {r_cust.text}"
    cust_data = r_cust.json()
    cust_id = cust_data["id"]
    assert cust_data["name"] == "WoodCraft Furnishings"
    assert cust_data["contact_type"] == "customer"
    assert cust_data["email"] == cust_email
    assert cust_data["phone"] == "+91 9876543210"
    assert cust_data["city"] == "Ahmedabad"
    assert cust_data["country"] == "India"
    assert cust_data["tax_id"] == "24ABCDE1234F1Z5"
    assert cust_data["is_active"] is True
    assert "created_at" in cust_data
    assert "updated_at" in cust_data
    print(f"Customer contact #{cust_id} created successfully.")

    # Create Vendor
    vendor_email = f"vend_{suffix}@timberhub.com"
    vendor_payload = {
        "name": "TimberHub Raw Materials",
        "contact_type": "vendor",
        "email": vendor_email,
        "phone": "+91 8765432109",
        "address": "45 Forest Way",
        "city": "Surat",
        "state": "Gujarat",
        "country": "India",
        "tax_id": "24VEND1234F1Z9",
        "is_active": True,
    }
    r_vend = client.post("/api/contacts", json=vendor_payload, headers=auth_headers)
    assert r_vend.status_code == 201
    vend_id = r_vend.json()["id"]
    assert r_vend.json()["contact_type"] == "vendor"
    print(f"Vendor contact #{vend_id} created successfully.")

    # Create Other
    other_email = f"other_{suffix}@logistics.com"
    other_payload = {
        "name": "FastTrack Logistics",
        "contact_type": "other",
        "email": other_email,
        "phone": "+91 7654321098",
        "city": "Vadodara",
        "state": "Gujarat",
    }
    r_other = client.post("/api/contacts", json=other_payload, headers=auth_headers)
    assert r_other.status_code == 201
    other_id = r_other.json()["id"]
    assert r_other.json()["contact_type"] == "other"
    print(f"Other contact #{other_id} created successfully.")

    # 3. Test Validation & Duplicate Checks
    print("\n=== 3. Test Validation & Duplicate Checks ===")
    # 3a. Invalid contact_type
    r_bad_type = client.post("/api/contacts", json={"name": "Bad Type Co", "contact_type": "invalid_type"}, headers=auth_headers)
    assert r_bad_type.status_code == 422, f"Expected 422, got {r_bad_type.status_code}"
    print("Invalid contact_type correctly rejected with 422.")

    # 3b. Duplicate email
    dup_payload = {
        "name": "Duplicate Email Inc",
        "contact_type": "customer",
        "email": cust_email,
    }
    r_dup = client.post("/api/contacts", json=dup_payload, headers=auth_headers)
    assert r_dup.status_code == 400, f"Expected 400, got {r_dup.status_code}"
    assert "already exists" in r_dup.json()["detail"]
    print("Duplicate email correctly rejected with 400 Bad Request.")

    # 4. Test Get Single Contact (GET /api/contacts/{id})
    print("\n=== 4. Test Get Contact by ID ===")
    r_get = client.get(f"/api/contacts/{cust_id}", headers=auth_headers)
    assert r_get.status_code == 200
    assert r_get.json()["id"] == cust_id
    assert r_get.json()["name"] == "WoodCraft Furnishings"

    r_404 = client.get("/api/contacts/999999", headers=auth_headers)
    assert r_404.status_code == 404
    print("Get contact by ID and 404 behavior verified.")

    # 5. Test List Contacts with Pagination & Filters
    print("\n=== 5. Test List Contacts (Pagination & Filters) ===")
    r_list = client.get("/api/contacts?skip=0&limit=10", headers=auth_headers)
    assert r_list.status_code == 200
    items = r_list.json()
    assert isinstance(items, list)
    assert len(items) >= 3
    print(f"Retrieved {len(items)} contacts with pagination.")

    # Filter by contact_type=vendor
    r_vendors = client.get("/api/contacts?contact_type=vendor", headers=auth_headers)
    assert r_vendors.status_code == 200
    vendors = r_vendors.json()
    assert all(v["contact_type"] == "vendor" for v in vendors)
    print(f"Filter by contact_type=vendor verified ({len(vendors)} vendor(s) found).")

    # 6. Test Search Contacts
    print("\n=== 6. Test Search Contacts ===")
    # Search by Name
    r_s_name = client.get("/api/contacts?search=WoodCraft", headers=auth_headers)
    assert r_s_name.status_code == 200
    assert any(c["id"] == cust_id for c in r_s_name.json())
    print("Search by name verified.")

    # Search by Phone
    r_s_phone = client.get("/api/contacts?search=8765432109", headers=auth_headers)
    assert r_s_phone.status_code == 200
    assert any(c["id"] == vend_id for c in r_s_phone.json())
    print("Search by phone verified.")

    # Search by Tax ID
    r_s_tax = client.get("/api/contacts?search=24ABCDE1234F1Z5", headers=auth_headers)
    assert r_s_tax.status_code == 200
    assert any(c["id"] == cust_id for c in r_s_tax.json())
    print("Search by tax_id verified.")

    # 7. Test Update Contact (PUT /api/contacts/{id})
    print("\n=== 7. Test Update Contact (PUT /api/contacts/{id}) ===")
    update_payload = {
        "name": "WoodCraft Global Furnishings",
        "city": "Gandhinagar",
        "phone": "+91 9999988888",
    }
    r_upd = client.put(f"/api/contacts/{cust_id}", json=update_payload, headers=auth_headers)
    assert r_upd.status_code == 200
    updated = r_upd.json()
    assert updated["name"] == "WoodCraft Global Furnishings"
    assert updated["city"] == "Gandhinagar"
    assert updated["phone"] == "+91 9999988888"
    assert updated["email"] == cust_email  # preserved
    print("Contact updated successfully.")

    # 8. Test Activate / Deactivate (PATCH /api/contacts/{id}/status)
    print("\n=== 8. Test Activate/Deactivate (PATCH /api/contacts/{id}/status) ===")
    r_deact = client.patch(f"/api/contacts/{cust_id}/status", json={"is_active": False}, headers=auth_headers)
    assert r_deact.status_code == 200
    assert r_deact.json()["is_active"] is False
    print("Contact deactivated (is_active=False).")

    r_react = client.patch(f"/api/contacts/{cust_id}/status", json={"is_active": True}, headers=auth_headers)
    assert r_react.status_code == 200
    assert r_react.json()["is_active"] is True
    print("Contact reactivated (is_active=True).")

    # 9. Test Delete Contact (DELETE /api/contacts/{id})
    print("\n=== 9. Test Delete Contact (DELETE /api/contacts/{id}) ===")
    r_del = client.delete(f"/api/contacts/{other_id}", headers=auth_headers)
    assert r_del.status_code == 200
    assert r_del.json()["id"] == other_id

    # Verify 404 after deletion
    r_del_check = client.get(f"/api/contacts/{other_id}", headers=auth_headers)
    assert r_del_check.status_code == 404
    print("Contact deleted and verified via 404 Not Found.")

    print("\n" + "=" * 60)
    print(">>> ALL CONTACTS MODULE TESTS PASSED (9/9)! <<<")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
