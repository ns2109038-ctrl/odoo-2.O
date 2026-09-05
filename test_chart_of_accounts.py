import uuid
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.user import User
from app.models.account import Account
from app.models.journal import Journal
from app.models.journal_entry import JournalEntry, JournalItem
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)


def run_tests():
    print("=" * 70)
    print(">>> RUNNING CHART OF ACCOUNTS COMPREHENSIVE TEST SUITE <<<")
    print("=" * 70)

    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    pw = "SecretAcc123!"

    # Create 3 users for RBAC testing: Admin, Accountant, Regular User
    admin_user = create_user(
        db,
        UserCreate(
            name="COA Admin",
            login_id=f"adm_{suffix}",
            email=f"adm_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="admin",
        ),
    )
    accountant_user = create_user(
        db,
        UserCreate(
            name="COA Accountant",
            login_id=f"acc_{suffix}",
            email=f"acc_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="accountant",
        ),
    )
    regular_user = create_user(
        db,
        UserCreate(
            name="COA Regular User",
            login_id=f"usr_{suffix}",
            email=f"usr_{suffix}@urbanfurniture.com",
            password=pw,
            confirm_password=pw,
            role="user",
        ),
    )
    db.close()

    # Login and get tokens
    def get_token(login_id: str) -> str:
        res = client.post("/api/auth/login", json={"login_id": login_id, "password": pw})
        assert res.status_code == 200, f"Login failed for {login_id}: {res.text}"
        return res.json()["access_token"]

    admin_token = get_token(f"adm_{suffix}")
    accountant_token = get_token(f"acc_{suffix}")
    user_token = get_token(f"usr_{suffix}")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    accountant_headers = {"Authorization": f"Bearer {accountant_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Test Authentication & Authorization (RBAC)
    print("\n=== 1. Test Authentication & Authorization ===")
    r_unauth = client.get("/api/accounts")
    assert r_unauth.status_code == 401, f"Expected 401, got {r_unauth.status_code}"
    print("âœ“ Unauthenticated access correctly rejected with 401 Unauthorized.")

    # Regular user can read accounts
    r_usr_read = client.get("/api/accounts", headers=user_headers)
    assert r_usr_read.status_code == 200
    print("âœ“ Authenticated regular user can read accounts.")

    # Regular user cannot create accounts (requires accountant/admin)
    dummy_payload = {
        "code": f"DUMMY_{suffix}",
        "name": "Dummy Account",
        "account_type": "asset",
    }
    r_usr_create = client.post("/api/accounts", json=dummy_payload, headers=user_headers)
    assert r_usr_create.status_code == 403, f"Expected 403, got {r_usr_create.status_code}"
    print("âœ“ Regular user denied account creation with 403 Forbidden.")

    # Accountant can create accounts
    # 2. Test Account Creation with all 5 valid types
    print("\n=== 2. Test Creation of All 5 Valid Account Types ===")
    account_types = ["asset", "liability", "equity", "income", "expense"]
    created_type_accounts = {}

    for idx, acc_type in enumerate(account_types, start=1):
        code = f"{idx}000_{suffix}"
        name = f"Main {acc_type.capitalize()} {suffix}"
        payload = {
            "code": code,
            "name": name,
            "account_type": acc_type,
            "description": f"Top-level {acc_type} account",
            "is_active": True,
        }
        res = client.post("/api/accounts", json=payload, headers=accountant_headers)
        assert res.status_code == 201, f"Failed to create {acc_type} account: {res.text}"
        data = res.json()
        assert data["code"] == code.upper()
        assert data["name"] == name
        assert data["account_type"] == acc_type
        assert data["is_active"] is True
        assert data["parent_id"] is None
        assert "created_at" in data
        assert "updated_at" in data
        created_type_accounts[acc_type] = data
        print(f"âœ“ Created {acc_type.capitalize()} account: {data['code']} - {data['name']} (ID: {data['id']})")

    # 3. Requirement 1: Unique Account Code (case-insensitive)
    print("\n=== 3. Requirement 1: Account Code Must Be Unique ===")
    asset_code = created_type_accounts["asset"]["code"]
    dup_payload = {
        "code": asset_code.lower(),  # test case-insensitive duplicate
        "name": "Duplicate Asset Code",
        "account_type": "asset",
    }
    res_dup = client.post("/api/accounts", json=dup_payload, headers=accountant_headers)
    assert res_dup.status_code == 400, f"Expected 400 for duplicate code, got {res_dup.status_code}"
    assert "already exists" in res_dup.json()["detail"].lower()
    print(f"âœ“ Duplicate code '{asset_code}' rejected with 400 Bad Request.")

    # 4. Requirement 2: Account Name Required & Type Validation
    print("\n=== 4. Requirement 2: Account Name Required & Valid Types ===")
    res_empty_name = client.post(
        "/api/accounts",
        json={"code": f"EMPTY_{suffix}", "name": "   ", "account_type": "asset"},
        headers=accountant_headers,
    )
    assert res_empty_name.status_code == 422, f"Expected 422 for empty name, got {res_empty_name.status_code}"
    print("âœ“ Empty/whitespace name rejected with 422.")

    res_inv_type = client.post(
        "/api/accounts",
        json={"code": f"INV_{suffix}", "name": "Invalid Type Acc", "account_type": "invalid_type"},
        headers=accountant_headers,
    )
    assert res_inv_type.status_code == 422, f"Expected 422 for invalid type, got {res_inv_type.status_code}"
    print("âœ“ Invalid account type rejected with 422.")

    # 5. Requirement 3: Parent Account Must Exist If Provided
    print("\n=== 5. Requirement 3: Parent Account Must Exist ===")
    res_nonexistent_parent = client.post(
        "/api/accounts",
        json={
            "code": f"NOPARENT_{suffix}",
            "name": "Child of Nonexistent",
            "account_type": "asset",
            "parent_id": 9999999,
        },
        headers=accountant_headers,
    )
    assert res_nonexistent_parent.status_code == 400
    assert "does not exist" in res_nonexistent_parent.json()["detail"].lower()
    print("âœ“ Non-existent parent_id correctly rejected with 400 Bad Request.")

    # 6. Requirement 4: Prevent Invalid Parent Relationships
    print("\n=== 6. Requirement 4: Prevent Invalid Parent Relationships ===")
    parent_asset_id = created_type_accounts["asset"]["id"]

    # 6a. Mismatched account type between parent and child
    res_type_mismatch = client.post(
        "/api/accounts",
        json={
            "code": f"MISMATCH_{suffix}",
            "name": "Expense under Asset",
            "account_type": "expense",
            "parent_id": parent_asset_id,
        },
        headers=accountant_headers,
    )
    assert res_type_mismatch.status_code == 400
    assert "does not match" in res_type_mismatch.json()["detail"].lower()
    print("âœ“ Parent/child account type mismatch rejected with 400 Bad Request.")

    # 6b. Self-parenting prevention
    res_self_parent = client.put(
        f"/api/accounts/{parent_asset_id}",
        json={"parent_id": parent_asset_id},
        headers=accountant_headers,
    )
    assert res_self_parent.status_code == 400
    assert "cannot be its own parent" in res_self_parent.json()["detail"].lower()
    print("âœ“ Self-parenting rejected with 400 Bad Request.")

    # 6c. Create hierarchy Level 1 & Level 2
    res_child = client.post(
        "/api/accounts",
        json={
            "code": f"1100_{suffix}",
            "name": "Current Assets",
            "account_type": "asset",
            "parent_id": parent_asset_id,
        },
        headers=accountant_headers,
    )
    assert res_child.status_code == 201
    child_id = res_child.json()["id"]

    res_subchild = client.post(
        "/api/accounts",
        json={
            "code": f"1110_{suffix}",
            "name": "Cash and Cash Equivalents",
            "account_type": "asset",
            "parent_id": child_id,
        },
        headers=accountant_headers,
    )
    assert res_subchild.status_code == 201
    subchild_id = res_subchild.json()["id"]

    # 6d. Circular parent relationship prevention (setting parent_asset's parent to subchild)
    res_cycle = client.put(
        f"/api/accounts/{parent_asset_id}",
        json={"parent_id": subchild_id},
        headers=accountant_headers,
    )
    assert res_cycle.status_code == 400
    assert "circular dependency" in res_cycle.json()["detail"].lower()
    print("âœ“ Circular dependency (cycle detection) rejected with 400 Bad Request.")

    # 7. Requirement 6: Support Hierarchical Accounts & Tree View
    print("\n=== 7. Requirement 6: Hierarchical Accounts & Tree View ===")
    res_tree = client.get("/api/accounts?tree=true&account_type=asset", headers=user_headers)
    assert res_tree.status_code == 200
    tree_data = res_tree.json()
    assert isinstance(tree_data, list)
    root_node = next((n for n in tree_data if n["id"] == parent_asset_id), None)
    assert root_node is not None, "Root node not found in tree view"
    assert root_node["level"] == 0
    assert len(root_node["children"]) >= 1
    child_node = next((c for c in root_node["children"] if c["id"] == child_id), None)
    assert child_node is not None, "Child node not found in root children"
    assert child_node["level"] == 1
    subchild_node = next((sc for sc in child_node["children"] if sc["id"] == subchild_id), None)
    assert subchild_node is not None, "Subchild node not found in child children"
    assert subchild_node["level"] == 2
    print(f"âœ“ Hierarchical tree verified: Root (L0) -> Child (L1) -> Subchild (L2).")

    # 8. Test Search, Account Type Filter, Active Filter, and Pagination
    print("\n=== 8. Test Search, Filters & Pagination ===")
    # Search by code
    res_search_code = client.get(f"/api/accounts?search=1110_{suffix}", headers=user_headers)
    assert res_search_code.status_code == 200
    assert len(res_search_code.json()) == 1
    assert res_search_code.json()[0]["id"] == subchild_id
    print("âœ“ Search by account code successfully returned exact account.")

    # Search by name
    res_search_name = client.get(f"/api/accounts?search=Cash Equivalents", headers=user_headers)
    assert res_search_code.status_code == 200
    assert any(a["id"] == subchild_id for a in res_search_name.json())
    print("âœ“ Search by account name successfully returned matching accounts.")

    # Filter by account_type
    res_filter_type = client.get("/api/accounts?account_type=income", headers=user_headers)
    assert res_filter_type.status_code == 200
    assert all(a["account_type"] == "income" for a in res_filter_type.json())
    print("âœ“ Account type filter correctly isolated income accounts.")

    # Pagination
    res_page_1 = client.get("/api/accounts?skip=0&limit=2", headers=user_headers)
    assert res_page_1.status_code == 200
    assert len(res_page_1.json()) <= 2
    res_page_2 = client.get("/api/accounts?skip=2&limit=2", headers=user_headers)
    assert res_page_2.status_code == 200
    print("âœ“ Pagination (skip and limit) functioning properly.")

    # 9. Test GET /api/accounts/{id} and PUT /api/accounts/{id}
    print("\n=== 9. Test Get One & Update Account ===")
    res_one = client.get(f"/api/accounts/{subchild_id}", headers=user_headers)
    assert res_one.status_code == 200
    data_one = res_one.json()
    assert data_one["id"] == subchild_id
    assert data_one["parent"]["id"] == child_id
    print("âœ“ GET /api/accounts/{id} returns account and parent summary.")

    # Update description and name
    res_update = client.put(
        f"/api/accounts/{subchild_id}",
        json={"name": "Petty Cash & Bank", "description": "Updated petty cash account"},
        headers=accountant_headers,
    )
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Petty Cash & Bank"
    assert res_update.json()["description"] == "Updated petty cash account"
    print("âœ“ PUT /api/accounts/{id} successfully updated account properties.")

    # 10. Test PATCH /api/accounts/{id}/status (toggle is_active)
    print("\n=== 10. Test Status Toggle (PATCH /api/accounts/{id}/status) ===")
    res_deactivate = client.patch(
        f"/api/accounts/{subchild_id}/status",
        json={"is_active": False},
        headers=accountant_headers,
    )
    assert res_deactivate.status_code == 200
    assert res_deactivate.json()["is_active"] is False

    # Filter by is_active=False
    res_inactive = client.get(f"/api/accounts?is_active=false&search=1110_{suffix}", headers=user_headers)
    assert res_inactive.status_code == 200
    assert len(res_inactive.json()) == 1

    # Reactivate
    res_activate = client.patch(
        f"/api/accounts/{subchild_id}/status",
        json={"is_active": True},
        headers=accountant_headers,
    )
    assert res_activate.status_code == 200
    assert res_activate.json()["is_active"] is True
    print("âœ“ Status toggle via PATCH successfully deactivated and reactivated account.")

    # 11. Requirement 5: Prevent Deleting Account Used by Accounting Transactions
    print("\n=== 11. Requirement 5: Prevent Deleting Account Used by Transactions ===")

    # 11a. Prevent deleting account with child accounts
    res_del_parent = client.delete(f"/api/accounts/{parent_asset_id}", headers=accountant_headers)
    assert res_del_parent.status_code == 400
    assert "has child accounts" in res_del_parent.json()["detail"].lower()
    print("âœ“ Deleting account with children rejected with 400 Bad Request.")

    # 11b. Prevent deleting account with accounting transactions (journal_items)
    # Create an isolated leaf account and a journal transaction linked to it
    res_tx_acc = client.post(
        "/api/accounts",
        json={
            "code": f"TX_{suffix}",
            "name": "Transaction Guard Account",
            "account_type": "expense",
        },
        headers=accountant_headers,
    )
    assert res_tx_acc.status_code == 201
    tx_acc_id = res_tx_acc.json()["id"]

    # Insert a journal entry item referencing this account directly in the DB
    db = SessionLocal()
    # Find or create a test journal
    journal = db.query(Journal).first()
    if not journal:
        journal = Journal(
            name="General Journal",
            code=f"GJ_{suffix}",
            type="general",
            is_active=True,
        )
        db.add(journal)
        db.commit()
        db.refresh(journal)

    entry = JournalEntry(
        journal_id=journal.id,
        date=date.today(),
        reference=f"REF-{suffix}",
        description="Test transaction for COA deletion guard",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    item = JournalItem(
        journal_entry_id=entry.id,
        account_id=tx_acc_id,
        debit=Decimal("150.00"),
        credit=Decimal("0.00"),
    )
    db.add(item)
    db.commit()
    db.close()

    # Attempt to delete account with transaction
    res_del_tx = client.delete(f"/api/accounts/{tx_acc_id}", headers=accountant_headers)
    assert res_del_tx.status_code == 400, f"Expected 400, got {res_del_tx.status_code}: {res_del_tx.text}"
    assert "accounting transactions" in res_del_tx.json()["detail"].lower()
    print("âœ“ Deleting account used by accounting transactions blocked with 400 Bad Request.")

    # Cleanup test transaction
    db = SessionLocal()
    db.delete(item)
    db.delete(entry)
    db.commit()
    db.close()

    # 11c. Now that transaction is removed, delete of unused leaf account should succeed!
    res_del_leaf = client.delete(f"/api/accounts/{tx_acc_id}", headers=accountant_headers)
    assert res_del_leaf.status_code == 200
    assert "deleted successfully" in res_del_leaf.json()["message"]
    print("âœ“ Successfully deleted unused leaf account after transaction removal.")

    # Verify account is completely removed from DB
    res_del_check = client.get(f"/api/accounts/{tx_acc_id}", headers=user_headers)
    assert res_del_check.status_code == 404
    print("âœ“ Account correctly removed (returns 404 Not Found).")

    print("\n" + "=" * 70)
    print(">>> ALL CHART OF ACCOUNTS TESTS PASSED SUCCESSFULLY! <<<")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
