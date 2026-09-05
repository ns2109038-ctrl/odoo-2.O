import uuid
from datetime import timedelta
from fastapi import FastAPI, Depends, APIRouter
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.user import User
from app.services.user_service import create_user
from app.schemas.user import UserCreate
from app.core.security import (
    create_access_token,
    require_authenticated_user,
    require_admin,
    require_accountant,
    require_roles,
)

# Create a test router with protected test endpoints to verify RBAC
test_rbac_router = APIRouter(prefix="/api/test-rbac", tags=["Test RBAC"])

@test_rbac_router.get("/user-only")
def user_endpoint(current_user: User = Depends(require_authenticated_user)):
    return {"message": "Access granted: authenticated user", "user": current_user.name, "role": current_user.role}

@test_rbac_router.get("/admin-only")
def admin_endpoint(current_user: User = Depends(require_admin)):
    return {"message": "Access granted: admin", "user": current_user.name, "role": current_user.role}

@test_rbac_router.get("/accountant-only")
def accountant_endpoint(current_user: User = Depends(require_accountant)):
    return {"message": "Access granted: accountant or admin", "user": current_user.name, "role": current_user.role}

@test_rbac_router.get("/custom-roles")
def custom_endpoint(current_user: User = Depends(require_roles("accountant"))):
    return {"message": "Access granted: accountant only", "user": current_user.name, "role": current_user.role}

app.include_router(test_rbac_router)

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print(">>> RUNNING AUTHENTICATION & RBAC MODULE TESTS <<<")
    print("=" * 60)

    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    pw = "SecretAuth123!"

    # Create 3 users for RBAC testing: 1 admin, 1 accountant, 1 standard user, 1 inactive user
    admin_login = f"adm_{suffix}"
    admin_email = f"adm_{suffix}@urbanfurniture.com"
    u_admin = create_user(db, UserCreate(name="Alice Admin", login_id=admin_login, email=admin_email, password=pw, confirm_password=pw, role="admin"))
    admin_user_id = u_admin.id

    acc_login = f"acc_{suffix}"
    acc_email = f"acc_{suffix}@urbanfurniture.com"
    u_acc = create_user(db, UserCreate(name="Bob Accountant", login_id=acc_login, email=acc_email, password=pw, confirm_password=pw, role="accountant"))
    acc_user_id = u_acc.id

    usr_login = f"usr_{suffix}"
    usr_email = f"usr_{suffix}@urbanfurniture.com"
    u_user = create_user(db, UserCreate(name="Charlie User", login_id=usr_login, email=usr_email, password=pw, confirm_password=pw, role="user"))
    usr_user_id = u_user.id

    inact_login = f"ina_{suffix}"
    inact_email = f"ina_{suffix}@urbanfurniture.com"
    u_inact = create_user(db, UserCreate(name="David Inactive", login_id=inact_login, email=inact_email, password=pw, confirm_password=pw, role="user"))
    u_inact.is_active = False
    db.commit()
    inact_user_id = u_inact.id
    db.close()

    # 1. Test Successful Login with login_id
    print("\n=== 1. Test Login with login_id (POST /api/auth/login) ===")
    r = client.post("/api/auth/login", json={"login_id": admin_login, "password": pw})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    auth_data = r.json()
    admin_token = auth_data["access_token"]
    assert auth_data["token_type"] == "bearer"
    assert auth_data["role"] == "admin"
    assert auth_data["user"]["login_id"] == admin_login
    assert "password_hash" not in auth_data["user"]
    print("Login with login_id successful! Returned JWT and user info.")

    # 2. Test Successful Login with email
    print("\n=== 2. Test Login with email (POST /api/auth/login) ===")
    r = client.post("/api/auth/login", json={"email": acc_email, "password": pw})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    acc_token = r.json()["access_token"]
    assert r.json()["role"] == "accountant"
    print("Login with email successful! Returned JWT for accountant.")

    # Also log in standard user
    r = client.post("/api/auth/login", json={"login_id": usr_login, "password": pw})
    assert r.status_code == 200
    usr_token = r.json()["access_token"]

    # 3. Test Wrong Password
    print("\n=== 3. Test Wrong Password ===")
    r = client.post("/api/auth/login", json={"login_id": admin_login, "password": "WrongPassword999!"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    print("Wrong password rejected with 401 Unauthorized.")

    # 4. Test Unknown User
    print("\n=== 4. Test Unknown User ===")
    r = client.post("/api/auth/login", json={"login_id": "nonexistent_usr_999", "password": pw})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    print("Unknown user rejected with 401 Unauthorized.")

    # 5. Test Inactive User Login
    print("\n=== 5. Test Inactive User Login ===")
    r = client.post("/api/auth/login", json={"login_id": inact_login, "password": pw})
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    assert "inactive" in r.json()["detail"].lower()
    print("Inactive user rejected with 403 Forbidden.")

    # 6. Test Current User (GET /api/auth/me) with Valid JWT
    print("\n=== 6. Test GET /api/auth/me with Valid Bearer Token ===")
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    me = r.json()
    assert me["login_id"] == admin_login
    assert me["role"] == "admin"
    assert "password_hash" not in me
    print(f"Current user profile retrieved successfully: {me['name']} ({me['role']})")

    # 7. Test Missing Token
    print("\n=== 7. Test Missing Token on /api/auth/me ===")
    r = client.get("/api/auth/me")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    assert "Missing authentication token" in r.json()["detail"]
    print("Missing token rejected with 401 Unauthorized.")

    # 8. Test Invalid Token
    print("\n=== 8. Test Invalid Token ===")
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    assert "Invalid authentication token" in r.json()["detail"]
    print("Invalid token rejected with 401 Unauthorized.")

    # 9. Test Expired Token
    print("\n=== 9. Test Expired Token ===")
    expired_token = create_access_token(admin_user_id, "admin", expires_delta=timedelta(seconds=-10))
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    assert "expired" in r.json()["detail"].lower()
    print("Expired token rejected with 401 Unauthorized.")

    # 10. Test RBAC: require_authenticated_user()
    print("\n=== 10. Test require_authenticated_user() ===")
    # Unauthenticated -> 401
    assert client.get("/api/test-rbac/user-only").status_code == 401
    # Standard user -> 200
    assert client.get("/api/test-rbac/user-only", headers={"Authorization": f"Bearer {usr_token}"}).status_code == 200
    # Accountant -> 200
    assert client.get("/api/test-rbac/user-only", headers={"Authorization": f"Bearer {acc_token}"}).status_code == 200
    # Admin -> 200
    assert client.get("/api/test-rbac/user-only", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200
    print("require_authenticated_user correctly permits all authenticated active roles.")

    # 11. Test RBAC: require_admin()
    print("\n=== 11. Test require_admin() ===")
    # Admin -> 200
    r_adm = client.get("/api/test-rbac/admin-only", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_adm.status_code == 200, f"Expected 200, got {r_adm.status_code}"
    # Accountant -> 403
    r_acc = client.get("/api/test-rbac/admin-only", headers={"Authorization": f"Bearer {acc_token}"})
    assert r_acc.status_code == 403, f"Expected 403, got {r_acc.status_code}"
    assert "Admin access required" in r_acc.json()["detail"]
    # Standard user -> 403
    r_usr = client.get("/api/test-rbac/admin-only", headers={"Authorization": f"Bearer {usr_token}"})
    assert r_usr.status_code == 403, f"Expected 403, got {r_usr.status_code}"
    print("require_admin correctly permits Admin and denies Accountant/User with 403 Forbidden.")

    # 12. Test RBAC: require_accountant()
    print("\n=== 12. Test require_accountant() ===")
    # Admin -> 200 (Admins have access to accounting)
    assert client.get("/api/test-rbac/accountant-only", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200
    # Accountant -> 200
    assert client.get("/api/test-rbac/accountant-only", headers={"Authorization": f"Bearer {acc_token}"}).status_code == 200
    # Standard user -> 403
    r_usr = client.get("/api/test-rbac/accountant-only", headers={"Authorization": f"Bearer {usr_token}"})
    assert r_usr.status_code == 403, f"Expected 403, got {r_usr.status_code}"
    assert "Accountant access required" in r_usr.json()["detail"]
    print("require_accountant correctly permits Admin/Accountant and denies User with 403 Forbidden.")

    print("\n" + "=" * 60)
    print(">>> ALL AUTHENTICATION & RBAC TESTS PASSED (12/12)! <<<")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
