"""
Tests for Analytic Accounts Backend Module.

Coverage:
  1.  Create analytic account (accountant)
  2.  Duplicate code rejected (400)
  3.  Validation: blank name, blank code (422)
  4.  List analytic accounts (authenticated)
  5.  Search by name / code
  6.  Filter by is_active
  7.  Pagination (skip / limit)
  8.  Get by ID (200 and 404)
  9.  Update analytic account (PUT)
  10. Update duplicate code rejected
  11. Status toggle via PATCH /{id}/status
  12. Delete analytic account (200)
  13. Delete non-existent (404)
  14. RBAC: unauthenticated -> 401
  15. RBAC: regular user mutations -> 403
  16. RBAC: regular user GET -> 200
"""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.services.user_service import create_user
from app.schemas.user import UserCreate

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _token(login_id: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"login_id": login_id, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_users(suffix: str) -> dict:
    """Create admin, accountant and regular user; return tokens."""
    db = SessionLocal()
    pw = "Secret@123"
    try:
        admin = create_user(db, UserCreate(
            name="AA Admin", login_id=f"aa_adm_{suffix}",
            email=f"aa_adm_{suffix}@urban.com",
            password=pw, confirm_password=pw, role="admin",
        ))
        accountant = create_user(db, UserCreate(
            name="AA Accountant", login_id=f"aa_acc_{suffix}",
            email=f"aa_acc_{suffix}@urban.com",
            password=pw, confirm_password=pw, role="accountant",
        ))
        regular = create_user(db, UserCreate(
            name="AA User", login_id=f"aa_usr_{suffix}",
            email=f"aa_usr_{suffix}@urban.com",
            password=pw, confirm_password=pw, role="user",
        ))
    finally:
        db.close()

    admin_tok = _token(f"aa_adm_{suffix}", pw)
    acc_tok = _token(f"aa_acc_{suffix}", pw)
    usr_tok = _token(f"aa_usr_{suffix}", pw)
    return {"admin": admin_tok, "accountant": acc_tok, "user": usr_tok}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestAnalyticAccounts:
    """Full test suite for /api/analytic-accounts."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.sfx = _uid()
        self.tokens = _create_users(self.sfx)
        self.acc_hdr = _auth(self.tokens["accountant"])
        self.adm_hdr = _auth(self.tokens["admin"])
        self.usr_hdr = _auth(self.tokens["user"])

    # -----------------------------------------------------------------------
    # 1. Create
    # -----------------------------------------------------------------------

    def test_create_analytic_account(self):
        payload = {
            "name": f"Marketing {self.sfx}",
            "code": f"MKT-{self.sfx}",
            "description": "Marketing analytic account",
            "is_active": True,
        }
        r = client.post("/api/analytic-accounts", json=payload, headers=self.acc_hdr)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["code"] == f"MKT-{self.sfx}"
        assert data["name"] == f"Marketing {self.sfx}"
        assert data["is_active"] is True
        assert "id" in data

    # -----------------------------------------------------------------------
    # 2. Duplicate code rejected
    # -----------------------------------------------------------------------

    def test_duplicate_code_rejected(self):
        payload = {"name": f"Dup Acc {self.sfx}", "code": f"DUP-{self.sfx}"}
        r1 = client.post("/api/analytic-accounts", json=payload, headers=self.acc_hdr)
        assert r1.status_code == 201, r1.text

        r2 = client.post("/api/analytic-accounts", json=payload, headers=self.acc_hdr)
        assert r2.status_code == 400
        assert "already exists" in r2.json()["detail"].lower()

    # -----------------------------------------------------------------------
    # 3. Validation: blank name / code
    # -----------------------------------------------------------------------

    def test_blank_name_rejected(self):
        payload = {"name": "   ", "code": f"BLN-{self.sfx}"}
        r = client.post("/api/analytic-accounts", json=payload, headers=self.acc_hdr)
        assert r.status_code == 422

    def test_blank_code_rejected(self):
        payload = {"name": f"Blank Code {self.sfx}", "code": "   "}
        r = client.post("/api/analytic-accounts", json=payload, headers=self.acc_hdr)
        assert r.status_code == 422

    def test_missing_name_rejected(self):
        payload = {"code": f"NON-{self.sfx}"}
        r = client.post("/api/analytic-accounts", json=payload, headers=self.acc_hdr)
        assert r.status_code == 422

    def test_missing_code_rejected(self):
        payload = {"name": f"No Code {self.sfx}"}
        r = client.post("/api/analytic-accounts", json=payload, headers=self.acc_hdr)
        assert r.status_code == 422

    # -----------------------------------------------------------------------
    # 4. List
    # -----------------------------------------------------------------------

    def test_list_analytic_accounts(self):
        # Create two accounts
        for i in range(2):
            client.post(
                "/api/analytic-accounts",
                json={"name": f"List Acc {i} {self.sfx}", "code": f"LST{i}-{self.sfx}"},
                headers=self.acc_hdr,
            )

        r = client.get("/api/analytic-accounts", headers=self.acc_hdr)
        assert r.status_code == 200
        body = r.json()
        assert "data" in body
        assert "total" in body
        assert isinstance(body["data"], list)

    # -----------------------------------------------------------------------
    # 5. Search
    # -----------------------------------------------------------------------

    def test_search_by_name(self):
        unique_name = f"SRCH-NAME-{self.sfx}"
        client.post(
            "/api/analytic-accounts",
            json={"name": unique_name, "code": f"SN-{self.sfx}"},
            headers=self.acc_hdr,
        )

        r = client.get(f"/api/analytic-accounts?search={unique_name}", headers=self.acc_hdr)
        assert r.status_code == 200
        data = r.json()["data"]
        assert any(a["name"] == unique_name for a in data)

    def test_search_by_code(self):
        unique_code = f"SC-{self.sfx}"
        client.post(
            "/api/analytic-accounts",
            json={"name": f"Search Code Acc {self.sfx}", "code": unique_code},
            headers=self.acc_hdr,
        )

        r = client.get(f"/api/analytic-accounts?search={unique_code}", headers=self.acc_hdr)
        assert r.status_code == 200
        data = r.json()["data"]
        assert any(a["code"] == unique_code for a in data)

    # -----------------------------------------------------------------------
    # 6. Filter by is_active
    # -----------------------------------------------------------------------

    def test_filter_active(self):
        active_code = f"ACT-{self.sfx}"
        inactive_code = f"INACT-{self.sfx}"

        client.post(
            "/api/analytic-accounts",
            json={"name": f"Active {self.sfx}", "code": active_code, "is_active": True},
            headers=self.acc_hdr,
        )
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"Inactive {self.sfx}", "code": inactive_code, "is_active": False},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201

        r = client.get("/api/analytic-accounts?is_active=true", headers=self.acc_hdr)
        assert r.status_code == 200
        data = r.json()["data"]
        assert all(a["is_active"] is True for a in data)

        r2 = client.get("/api/analytic-accounts?is_active=false", headers=self.acc_hdr)
        assert r2.status_code == 200
        data2 = r2.json()["data"]
        assert all(a["is_active"] is False for a in data2)

    # -----------------------------------------------------------------------
    # 7. Pagination
    # -----------------------------------------------------------------------

    def test_pagination(self):
        for i in range(3):
            client.post(
                "/api/analytic-accounts",
                json={"name": f"Page {i} {self.sfx}", "code": f"PG{i}-{self.sfx}"},
                headers=self.acc_hdr,
            )

        r = client.get("/api/analytic-accounts?skip=0&limit=2", headers=self.acc_hdr)
        assert r.status_code == 200
        body = r.json()
        assert len(body["data"]) <= 2
        assert body["limit"] == 2
        assert body["skip"] == 0

    # -----------------------------------------------------------------------
    # 8. Get by ID
    # -----------------------------------------------------------------------

    def test_get_by_id(self):
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"Single {self.sfx}", "code": f"SGL-{self.sfx}"},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201
        account_id = r_create.json()["id"]

        r = client.get(f"/api/analytic-accounts/{account_id}", headers=self.acc_hdr)
        assert r.status_code == 200
        assert r.json()["id"] == account_id

    def test_get_nonexistent_returns_404(self):
        r = client.get("/api/analytic-accounts/999999999", headers=self.acc_hdr)
        assert r.status_code == 404

    # -----------------------------------------------------------------------
    # 9. Update (PUT)
    # -----------------------------------------------------------------------

    def test_update_analytic_account(self):
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"Before Update {self.sfx}", "code": f"UPD-{self.sfx}"},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201
        account_id = r_create.json()["id"]

        r = client.put(
            f"/api/analytic-accounts/{account_id}",
            json={"name": f"After Update {self.sfx}", "description": "Updated"},
            headers=self.acc_hdr,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == f"After Update {self.sfx}"
        assert data["description"] == "Updated"

    # -----------------------------------------------------------------------
    # 10. Update with duplicate code rejected
    # -----------------------------------------------------------------------

    def test_update_to_duplicate_code_rejected(self):
        c1 = f"UPC1-{self.sfx}"
        c2 = f"UPC2-{self.sfx}"
        r1 = client.post(
            "/api/analytic-accounts",
            json={"name": f"UPC1 {self.sfx}", "code": c1},
            headers=self.acc_hdr,
        )
        r2 = client.post(
            "/api/analytic-accounts",
            json={"name": f"UPC2 {self.sfx}", "code": c2},
            headers=self.acc_hdr,
        )
        assert r1.status_code == 201
        assert r2.status_code == 201
        id2 = r2.json()["id"]

        r = client.put(
            f"/api/analytic-accounts/{id2}",
            json={"code": c1},  # Try to steal c1's code
            headers=self.acc_hdr,
        )
        assert r.status_code == 400
        assert "already exists" in r.json()["detail"].lower()

    # -----------------------------------------------------------------------
    # 11. Status toggle (PATCH /{id}/status)
    # -----------------------------------------------------------------------

    def test_status_deactivate(self):
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"Toggle {self.sfx}", "code": f"TGL-{self.sfx}", "is_active": True},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201
        account_id = r_create.json()["id"]

        r = client.patch(
            f"/api/analytic-accounts/{account_id}/status",
            json={"is_active": False},
            headers=self.acc_hdr,
        )
        assert r.status_code == 200
        assert r.json()["is_active"] is False

    def test_status_reactivate(self):
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"Reactv {self.sfx}", "code": f"RTV-{self.sfx}", "is_active": False},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201
        account_id = r_create.json()["id"]

        r = client.patch(
            f"/api/analytic-accounts/{account_id}/status",
            json={"is_active": True},
            headers=self.acc_hdr,
        )
        assert r.status_code == 200
        assert r.json()["is_active"] is True

    def test_status_nonexistent_returns_404(self):
        r = client.patch(
            "/api/analytic-accounts/999999999/status",
            json={"is_active": False},
            headers=self.acc_hdr,
        )
        assert r.status_code == 404

    # -----------------------------------------------------------------------
    # 12. Delete
    # -----------------------------------------------------------------------

    def test_delete_analytic_account(self):
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"To Delete {self.sfx}", "code": f"DEL-{self.sfx}"},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201
        account_id = r_create.json()["id"]

        r_del = client.delete(
            f"/api/analytic-accounts/{account_id}", headers=self.acc_hdr
        )
        assert r_del.status_code == 200
        assert r_del.json()["id"] == account_id

        r_get = client.get(f"/api/analytic-accounts/{account_id}", headers=self.acc_hdr)
        assert r_get.status_code == 404

    # -----------------------------------------------------------------------
    # 13. Delete non-existent
    # -----------------------------------------------------------------------

    def test_delete_nonexistent_returns_404(self):
        r = client.delete("/api/analytic-accounts/999999999", headers=self.acc_hdr)
        assert r.status_code == 404

    # -----------------------------------------------------------------------
    # 14. RBAC: unauthenticated -> 401
    # -----------------------------------------------------------------------

    def test_unauthenticated_create_401(self):
        r = client.post(
            "/api/analytic-accounts",
            json={"name": "No Auth", "code": f"NOAUTH-{self.sfx}"},
        )
        assert r.status_code == 401

    def test_unauthenticated_list_401(self):
        r = client.get("/api/analytic-accounts")
        assert r.status_code == 401

    # -----------------------------------------------------------------------
    # 15. RBAC: regular user mutations -> 403
    # -----------------------------------------------------------------------

    def test_regular_user_create_403(self):
        r = client.post(
            "/api/analytic-accounts",
            json={"name": f"Forbidden {self.sfx}", "code": f"FORB-{self.sfx}"},
            headers=self.usr_hdr,
        )
        assert r.status_code == 403

    def test_regular_user_update_403(self):
        # First create via accountant
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"U403 {self.sfx}", "code": f"U403-{self.sfx}"},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201
        account_id = r_create.json()["id"]

        r = client.put(
            f"/api/analytic-accounts/{account_id}",
            json={"name": "Should Fail"},
            headers=self.usr_hdr,
        )
        assert r.status_code == 403

    def test_regular_user_delete_403(self):
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"D403 {self.sfx}", "code": f"D403-{self.sfx}"},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201
        account_id = r_create.json()["id"]

        r = client.delete(
            f"/api/analytic-accounts/{account_id}", headers=self.usr_hdr
        )
        assert r.status_code == 403

    # -----------------------------------------------------------------------
    # 16. RBAC: regular user GET -> 200
    # -----------------------------------------------------------------------

    def test_regular_user_list_200(self):
        r = client.get("/api/analytic-accounts", headers=self.usr_hdr)
        assert r.status_code == 200

    def test_regular_user_get_by_id_200(self):
        r_create = client.post(
            "/api/analytic-accounts",
            json={"name": f"ReadOnly {self.sfx}", "code": f"RO-{self.sfx}"},
            headers=self.acc_hdr,
        )
        assert r_create.status_code == 201
        account_id = r_create.json()["id"]

        r = client.get(f"/api/analytic-accounts/{account_id}", headers=self.usr_hdr)
        assert r.status_code == 200
