from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=== 1. Testing Root and OpenAPI Docs ===")
res = client.get("/")
assert res.status_code == 200, res.text
openapi = client.get("/openapi.json").json()
assert "/accounts/" in openapi["paths"], "Missing /accounts/ path in OpenAPI"
assert "Chart of Accounts" in [tag["name"] for tag in openapi.get("tags", [])] or any("Chart of Accounts" in str(route) for route in openapi["paths"].values())
print("OpenAPI docs contain /accounts/ endpoints with 'Chart of Accounts' tag.")

test_accounts = [
    {"account_name": "Cash", "account_type": "Asset", "description": "Cash account"},
    {"account_name": "Bank", "account_type": "Asset", "description": "Main bank account"},
    {"account_name": "Customer Receivable", "account_type": "Asset", "description": "Money receivable from customers"},
    {"account_name": "Vendor Payable", "account_type": "Liability", "description": "Money payable to vendors"},
    {"account_name": "Sales Income", "account_type": "Income", "description": "Furniture sales income"},
    {"account_name": "Purchase Expense", "account_type": "Expense", "description": "Furniture purchase expense"},
    {"account_name": "Owner Capital", "account_type": "Capital", "description": "Owner investment"},
]

print("\n=== 2. Creating Accounts ===")
created_accounts = []
for acc in test_accounts:
    r = client.post("/accounts/", json=acc)
    if r.status_code == 400 and "already exists" in r.json().get("detail", ""):
        print(f"Account already exists in DB: {acc['account_name']}, fetching it...")
        all_accs = client.get("/accounts/").json()
        match = [a for a in all_accs if a["account_name"].lower() == acc["account_name"].lower()][0]
        created_accounts.append(match)
    else:
        assert r.status_code == 201, f"Failed creating {acc}: {r.text}"
        data = r.json()
        print(f"Created: {data['account_name']} (ID: {data['id']}, Type: {data['account_type']})")
        created_accounts.append(data)

print("\n=== 3. Testing Duplicate Account Name ===")
r_dup = client.post("/accounts/", json={"account_name": "Cash", "account_type": "Asset", "description": "Duplicate cash"})
assert r_dup.status_code == 400, f"Expected 400 for duplicate, got {r_dup.status_code}: {r_dup.text}"
print("Duplicate error verified (HTTP 400):", r_dup.json()["detail"])

print("\n=== 4. Testing Invalid Account Type ===")
r_inv = client.post("/accounts/", json={"account_name": "Invalid Account", "account_type": "RandomType"})
assert r_inv.status_code == 422, f"Expected 422 for invalid type, got {r_inv.status_code}: {r_inv.text}"
print("Invalid type rejected with HTTP 422 Unprocessable Entity.")

print("\n=== 5. Testing Account Name Validation (Length < 2) ===")
r_short = client.post("/accounts/", json={"account_name": "A", "account_type": "Asset"})
assert r_short.status_code == 422, f"Expected 422 for short name, got {r_short.status_code}: {r_short.text}"
print("Short name rejected with HTTP 422 Unprocessable Entity.")

print("\n=== 6. Testing Get All Accounts ===")
r_all = client.get("/accounts/")
assert r_all.status_code == 200
accounts_list = r_all.json()
print(f"Total accounts retrieved: {len(accounts_list)}")
assert len(accounts_list) >= 7

print("\n=== 7. Testing Get One Account ===")
target_id = created_accounts[0]["id"]
r_one = client.get(f"/accounts/{target_id}")
assert r_one.status_code == 200
print(f"Retrieved account: {r_one.json()['account_name']} (is_active: {r_one.json()['is_active']})")

print("\n=== 8. Testing Update Account ===")
r_up = client.put(f"/accounts/{target_id}", json={"description": "Updated Cash Account Description"})
assert r_up.status_code == 200
assert r_up.json()["description"] == "Updated Cash Account Description"
print("Updated description successfully:", r_up.json()["description"])

print("\n=== 9. Testing Archive Account (DELETE) ===")
r_arch = client.delete(f"/accounts/{target_id}")
assert r_arch.status_code == 200
assert r_arch.json()["is_active"] is False, f"Expected is_active=False, got {r_arch.json()}"
print("Account archived successfully via DELETE (soft delete).")

print("\n=== 10. Confirm Archived Account Remains in DB with is_active=False ===")
r_check = client.get(f"/accounts/{target_id}")
assert r_check.status_code == 200
assert r_check.json()["is_active"] is False, "Account is not marked is_active=False in DB"
print(f"Confirmed: Account '{r_check.json()['account_name']}' still exists in DB with is_active={r_check.json()['is_active']}")

# Restore active status for Cash
client.put(f"/accounts/{target_id}", json={"is_active": True})
print(f"Restored is_active=True for '{r_check.json()['account_name']}'")

print("\n==========================================")
print(">>> ALL 10 TESTS PASSED SUCCESSFULLY! <<<")
print("==========================================")
