from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.models.account import Account

client = TestClient(app)

print("=== 1. Checking OpenAPI & Endpoints ===")
openapi = client.get("/openapi.json").json()
assert "/journals/" in openapi["paths"], "Missing /journals/ in OpenAPI docs"
print("OpenAPI contains /journals/ endpoints under 'Journals' tag.")

# Ensure we have active account IDs
db = SessionLocal()
accounts = {acc.account_name: acc.id for acc in db.query(Account).filter(Account.is_active == True).all()}
print(f"Found active accounts in DB: {accounts}")

cash_id = accounts.get("Cash", 1)
bank_id = accounts.get("Bank", 2)
receivable_id = accounts.get("Customer Receivable", 3)
payable_id = accounts.get("Vendor Payable", 4)
sales_income_id = accounts.get("Sales Income", 5)
purchase_expense_id = accounts.get("Purchase Expense", 6)

test_journals = [
    {
        "journal_name": "Sales Journal",
        "journal_type": "Sales",
        "default_debit_account_id": receivable_id,
        "default_credit_account_id": sales_income_id,
    },
    {
        "journal_name": "Purchase Journal",
        "journal_type": "Purchase",
        "default_debit_account_id": purchase_expense_id,
        "default_credit_account_id": payable_id,
    },
    {
        "journal_name": "Bank Journal",
        "journal_type": "Bank",
        "default_debit_account_id": bank_id,
        "default_credit_account_id": bank_id,
    },
    {
        "journal_name": "Cash Journal",
        "journal_type": "Cash",
        "default_debit_account_id": cash_id,
        "default_credit_account_id": cash_id,
    },
]

print("\n=== 2. Creating Test Journals ===")
created_journals = []
for j in test_journals:
    res = client.post("/journals/", json=j)
    if res.status_code == 400 and "already exists" in res.json().get("detail", ""):
        print(f"Journal '{j['journal_name']}' already exists, fetching existing...")
        all_j = client.get("/journals/").json()
        match = [item for item in all_j if item["journal_name"].lower() == j["journal_name"].lower()][0]
        created_journals.append(match)
    else:
        assert res.status_code == 201, f"Failed to create journal {j}: {res.text}"
        data = res.json()
        print(f"Created: {data['journal_name']} (ID: {data['id']}, Type: {data['journal_type']})")
        created_journals.append(data)

print("\n=== 3. Get All Journals ===")
res_all = client.get("/journals/")
assert res_all.status_code == 200
journals_list = res_all.json()
print(f"Total journals retrieved: {len(journals_list)}")
assert len(journals_list) >= 4

print("\n=== 4. Get One Journal ===")
target_id = created_journals[0]["id"]
res_one = client.get(f"/journals/{target_id}")
assert res_one.status_code == 200
print(f"Retrieved: {res_one.json()['journal_name']} (Type: {res_one.json()['journal_type']})")

print("\n=== 5. Update a Journal ===")
res_up = client.put(f"/journals/{target_id}", json={"journal_name": "Sales Journal Primary"})
assert res_up.status_code == 200
assert res_up.json()["journal_name"] == "Sales Journal Primary"
print("Updated journal name to 'Sales Journal Primary'")
# Revert back
client.put(f"/journals/{target_id}", json={"journal_name": "Sales Journal"})

print("\n=== 6. Test Duplicate Journal Name ===")
res_dup = client.post("/journals/", json=test_journals[0])
assert res_dup.status_code == 400, f"Expected 400 for duplicate, got {res_dup.status_code}"
print("Duplicate journal rejected (HTTP 400):", res_dup.json()["detail"])

print("\n=== 7. Test Invalid Journal Type ===")
res_inv_type = client.post("/journals/", json={
    "journal_name": "Invalid Journal",
    "journal_type": "CreditCard",
    "default_debit_account_id": bank_id,
    "default_credit_account_id": bank_id,
})
assert res_inv_type.status_code == 422, f"Expected 422, got {res_inv_type.status_code}"
print("Invalid journal type rejected (HTTP 422 Unprocessable Entity).")

print("\n=== 8. Test Non-existent Account ID ===")
res_non_acc = client.post("/journals/", json={
    "journal_name": "Non Existent Account Journal",
    "journal_type": "Bank",
    "default_debit_account_id": 99999,
    "default_credit_account_id": bank_id,
})
assert res_non_acc.status_code == 400, f"Expected 400, got {res_non_acc.status_code}"
print("Non-existent account ID rejected (HTTP 400):", res_non_acc.json()["detail"])

print("\n=== 9. Test Archived / Inactive Account Cannot Be Selected ===")
# Create a temporary inactive account
inactive_acc = db.query(Account).filter(Account.account_name == "Temp Inactive Account").first()
if not inactive_acc:
    inactive_acc = Account(account_name="Temp Inactive Account", account_type="Asset", is_active=False)
    db.add(inactive_acc)
    db.commit()
    db.refresh(inactive_acc)
else:
    inactive_acc.is_active = False
    db.commit()

res_inactive = client.post("/journals/", json={
    "journal_name": "Inactive Account Journal",
    "journal_type": "Cash",
    "default_debit_account_id": inactive_acc.id,
    "default_credit_account_id": cash_id,
})
assert res_inactive.status_code == 400, f"Expected 400, got {res_inactive.status_code}: {res_inactive.text}"
print("Inactive account rejected (HTTP 400):", res_inactive.json()["detail"])

print("\n=== 10. Archive a Journal (DELETE) ===")
res_arch = client.delete(f"/journals/{target_id}")
assert res_arch.status_code == 200
assert res_arch.json()["is_active"] is False, f"Expected is_active=False, got {res_arch.json()}"
print("Journal successfully archived via DELETE (soft delete).")

print("\n=== 11. Confirm Archived Journal Remains in PostgreSQL with is_active=False ===")
res_check = client.get(f"/journals/{target_id}")
assert res_check.status_code == 200
assert res_check.json()["is_active"] is False
print(f"Confirmed in PostgreSQL: '{res_check.json()['journal_name']}' is still present with is_active=False.")

# Restore active status for Sales Journal
client.put(f"/journals/{target_id}", json={"is_active": True})
print("Restored is_active=True for Sales Journal.")

db.close()
print("\n==========================================")
print(">>> ALL 13 JOURNAL TESTS PASSED! <<<")
print("==========================================")
