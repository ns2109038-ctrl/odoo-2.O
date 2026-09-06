from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.models.journal_entry import JournalEntry, JournalItem
from app.models.journal import Journal
from app.models.account import Account
from app.models.user import User
from app.services.user_service import create_user
from app.schemas.user import UserCreate
import uuid

client = TestClient(app)

print("=== 1. Checking OpenAPI & Endpoints ===")
openapi = client.get("/openapi.json").json()
paths = openapi.get("paths", {})
assert "/journal-entries/" in paths or "/api/journal-entries/" in paths, "Missing /journal-entries/ endpoint"
assert "/journal-entries/{entry_id}" in paths or "/api/journal-entries/{entry_id}" in paths, "Missing /journal-entries/{entry_id} endpoint"
print("Verified endpoints exist: POST /journal-entries/, GET /journal-entries/, GET /journal-entries/{entry_id}")

# ── Auth setup ────────────────────────────────────────────────────────────────
_suffix = uuid.uuid4().hex[:6]
_pw = "JETest123!"
_db = SessionLocal()
_test_user = create_user(
    _db,
    UserCreate(
        name="JE Test Accountant",
        login_id=f"je_{_suffix}",
        email=f"je_{_suffix}@urbanfurniture.com",
        password=_pw,
        confirm_password=_pw,
        role="accountant",
    ),
)
_db.close()

_login_res = client.post("/api/auth/login", json={"login_id": f"je_{_suffix}", "password": _pw})
assert _login_res.status_code == 200, f"Auth login failed: {_login_res.text}"
_token = _login_res.json()["access_token"]
_auth_headers = {"Authorization": f"Bearer {_token}"}
# ─────────────────────────────────────────────────────────────────────────────

db = SessionLocal()

# Ensure accounts exist
cash_account = db.query(Account).filter((Account.name == "Cash") | (Account.account_name == "Cash")).first()
if not cash_account:
    cash_account = Account(code="1000", name="Cash", account_name="Cash", account_type="Asset", is_active=True)
    db.add(cash_account)

bank_account = db.query(Account).filter((Account.name == "Bank") | (Account.account_name == "Bank")).first()
if not bank_account:
    bank_account = Account(code="1010", name="Bank", account_name="Bank", account_type="Asset", is_active=True)
    db.add(bank_account)

receivable_account = db.query(Account).filter((Account.name == "Customer Receivable") | (Account.account_name == "Customer Receivable")).first()
if not receivable_account:
    receivable_account = Account(code="1100", name="Customer Receivable", account_name="Customer Receivable", account_type="Asset", is_active=True)
    db.add(receivable_account)

income_account = db.query(Account).filter((Account.name == "Sales Income") | (Account.account_name == "Sales Income")).first()
if not income_account:
    income_account = Account(code="4000", name="Sales Income", account_name="Sales Income", account_type="Income", is_active=True)
    db.add(income_account)

db.commit()
db.refresh(cash_account)
db.refresh(bank_account)
db.refresh(receivable_account)
db.refresh(income_account)

sales_journal = db.query(Journal).filter(Journal.journal_name == "Sales Journal").first()
if not sales_journal:
    sales_journal = Journal(
        journal_name="Sales Journal",
        journal_type="Sales",
        default_debit_account_id=receivable_account.id,
        default_credit_account_id=income_account.id,
        is_active=True
    )
    db.add(sales_journal)
    db.commit()
    db.refresh(sales_journal)

journal_id = sales_journal.id
receivable_id = receivable_account.id
income_id = income_account.id

initial_entries_count = db.query(JournalEntry).count()
initial_items_count = db.query(JournalItem).count()
print(f"Initial DB counts - Entries: {initial_entries_count}, Items: {initial_items_count}")

print("\n=== 2. Testing Valid Balanced Journal Entry ===")
valid_payload = {
    "journal_id": journal_id,
    "date": "2026-09-05",
    "reference": "INV-001",
    "description": "Office chair sale",
    "items": [
        {
            "account_id": receivable_id,
            "debit": 25000,
            "credit": 0
        },
        {
            "account_id": income_id,
            "debit": 0,
            "credit": 25000
        }
    ]
}

res_valid = client.post("/journal-entries/", json=valid_payload, headers=_auth_headers)
assert res_valid.status_code == 201, f"Expected 201, got {res_valid.status_code}: {res_valid.text}"
entry_data = res_valid.json()
created_entry_id = entry_data["id"]
print(f"Created Journal Entry #{created_entry_id}: {entry_data['description']}")
assert len(entry_data["items"]) == 2
print("Items created:", [(item["account_id"], str(item["debit"]), str(item["credit"])) for item in entry_data["items"]])

print("\n=== 3. Testing Invalid Unbalanced Entry ===")
unbalanced_payload = {
    "journal_id": journal_id,
    "date": "2026-09-05",
    "reference": "INV-002",
    "description": "Unbalanced entry",
    "items": [
        {
            "account_id": receivable_id,
            "debit": 25000,
            "credit": 0
        },
        {
            "account_id": income_id,
            "debit": 0,
            "credit": 20000
        }
    ]
}

res_unbalanced = client.post("/journal-entries/", json=unbalanced_payload, headers=_auth_headers)
assert res_unbalanced.status_code == 400, f"Expected 400, got {res_unbalanced.status_code}: {res_unbalanced.text}"
assert "Journal entry is not balanced. Total debit must equal total credit." in res_unbalanced.json()["detail"]
print("Unbalanced entry rejected with HTTP 400:", res_unbalanced.json()["detail"])

print("\n=== 4. Confirming No Partial Records Left from Failed Entry ===")
db.expire_all()
current_entries_count = db.query(JournalEntry).count()
current_items_count = db.query(JournalItem).count()
assert current_entries_count == initial_entries_count + 1, "Unexpected entries count!"
assert current_items_count == initial_items_count + 2, "Unexpected items count!"
print("Verified atomicity: No orphan or partial records created after failed transaction.")

print("\n=== 5. Testing Invalid / Missing Journal ID ===")
res_bad_journal = client.post("/journal-entries/", json={
    "journal_id": 99999,
    "date": "2026-09-05",
    "items": [
        {"account_id": receivable_id, "debit": 1000, "credit": 0},
        {"account_id": income_id, "debit": 0, "credit": 1000}
    ]
}, headers=_auth_headers)
assert res_bad_journal.status_code == 400
print("Non-existent journal rejected:", res_bad_journal.json()["detail"])

print("\n=== 6. Testing Inactive Journal ===")
# Create a temporary inactive journal
inactive_j = db.query(Journal).filter(Journal.journal_name == "Temp Inactive Journal").first()
if not inactive_j:
    inactive_j = Journal(
        journal_name="Temp Inactive Journal",
        journal_type="Cash",
        default_debit_account_id=cash_account.id,
        default_credit_account_id=cash_account.id,
        is_active=False
    )
    db.add(inactive_j)
    db.commit()
    db.refresh(inactive_j)
else:
    inactive_j.is_active = False
    db.commit()

res_inactive_j = client.post("/journal-entries/", json={
    "journal_id": inactive_j.id,
    "date": "2026-09-05",
    "items": [
        {"account_id": receivable_id, "debit": 1000, "credit": 0},
        {"account_id": income_id, "debit": 0, "credit": 1000}
    ]
}, headers=_auth_headers)
assert res_inactive_j.status_code == 400
print("Inactive journal rejected:", res_inactive_j.json()["detail"])

print("\n=== 7. Testing Invalid / Missing Account ID ===")
res_bad_acc = client.post("/journal-entries/", json={
    "journal_id": journal_id,
    "date": "2026-09-05",
    "items": [
        {"account_id": 99999, "debit": 1000, "credit": 0},
        {"account_id": income_id, "debit": 0, "credit": 1000}
    ]
}, headers=_auth_headers)
assert res_bad_acc.status_code == 400
print("Non-existent account rejected:", res_bad_acc.json()["detail"])

print("\n=== 8. Testing Inactive Account ===")
inactive_acc = db.query(Account).filter(Account.account_name == "Temp Inactive Acc 2").first()
if not inactive_acc:
    inactive_acc = Account(code="TMP999", name="Temp Inactive Acc 2", account_name="Temp Inactive Acc 2", account_type="Asset", is_active=False)
    db.add(inactive_acc)
    db.commit()
    db.refresh(inactive_acc)
else:
    inactive_acc.is_active = False
    db.commit()

res_inactive_acc = client.post("/journal-entries/", json={
    "journal_id": journal_id,
    "date": "2026-09-05",
    "items": [
        {"account_id": inactive_acc.id, "debit": 1000, "credit": 0},
        {"account_id": income_id, "debit": 0, "credit": 1000}
    ]
}, headers=_auth_headers)
assert res_inactive_acc.status_code == 400
print("Inactive account rejected:", res_inactive_acc.json()["detail"])

print("\n=== 9. Testing Negative Debit / Credit ===")
res_neg = client.post("/journal-entries/", json={
    "journal_id": journal_id,
    "date": "2026-09-05",
    "items": [
        {"account_id": receivable_id, "debit": -500, "credit": 0},
        {"account_id": income_id, "debit": 0, "credit": 500}
    ]
}, headers=_auth_headers)
assert res_neg.status_code == 422
print("Negative amount rejected with HTTP 422.")

print("\n=== 10. Testing Both Debit and Credit in One Item ===")
res_both = client.post("/journal-entries/", json={
    "journal_id": journal_id,
    "date": "2026-09-05",
    "items": [
        {"account_id": receivable_id, "debit": 500, "credit": 500},
        {"account_id": income_id, "debit": 0, "credit": 500}
    ]
}, headers=_auth_headers)
assert res_both.status_code == 422
print("Both debit and credit > 0 rejected with HTTP 422.")

print("\n=== 11. Testing Both Debit and Credit Zero in One Item ===")
res_zeros = client.post("/journal-entries/", json={
    "journal_id": journal_id,
    "date": "2026-09-05",
    "items": [
        {"account_id": receivable_id, "debit": 0, "credit": 0},
        {"account_id": income_id, "debit": 0, "credit": 500}
    ]
}, headers=_auth_headers)
assert res_zeros.status_code == 422
print("Both debit and credit == 0 rejected with HTTP 422.")

print("\n=== 12. Testing Only One Journal Item ===")
res_one_item = client.post("/journal-entries/", json={
    "journal_id": journal_id,
    "date": "2026-09-05",
    "items": [
        {"account_id": receivable_id, "debit": 500, "credit": 0}
    ]
}, headers=_auth_headers)
assert res_one_item.status_code == 422
print("Single item rejected (minimum 2 items required) with HTTP 422.")

print("\n=== 13. Testing Multiple Debit and Credit Lines (Compound Entry) ===")
compound_payload = {
    "journal_id": journal_id,
    "date": "2026-09-05",
    "reference": "INV-003",
    "description": "Split payment sale",
    "items": [
        {"account_id": cash_account.id, "debit": 10000, "credit": 0},
        {"account_id": bank_account.id, "debit": 15000, "credit": 0},
        {"account_id": income_id, "debit": 0, "credit": 25000}
    ]
}
res_compound = client.post("/journal-entries/", json=compound_payload, headers=_auth_headers)
assert res_compound.status_code == 201
comp_data = res_compound.json()
assert len(comp_data["items"]) == 3
print(f"Created compound entry #{comp_data['id']} with {len(comp_data['items'])} lines (Debits 10k + 15k = Credit 25k).")

print("\n=== 14. Testing GET All Journal Entries ===")
res_get_all = client.get("/journal-entries/", headers=_auth_headers)
assert res_get_all.status_code == 200
all_entries = res_get_all.json()
print(f"Total entries retrieved: {len(all_entries)}")
assert len(all_entries) >= 2

print("\n=== 15. Testing GET One Journal Entry ===")
res_get_one = client.get(f"/journal-entries/{created_entry_id}", headers=_auth_headers)
assert res_get_one.status_code == 200
one_entry = res_get_one.json()
print(f"Retrieved Entry #{one_entry['id']}: Reference={one_entry['reference']}, Date={one_entry['date']}")
assert "journal" in one_entry and one_entry["journal"]["journal_name"] == "Sales Journal"
assert len(one_entry["items"]) == 2
for itm in one_entry["items"]:
    print(f"  - Account: {itm['account']['account_name']}, Debit: {itm['debit']}, Credit: {itm['credit']}")

# Clean up temp test entries
db.delete(inactive_j)
db.delete(inactive_acc)
db.commit()
db.close()

print("\n==========================================")
print(">>> ALL 15 JOURNAL ENTRY TESTS PASSED! <<<")
print("==========================================")
