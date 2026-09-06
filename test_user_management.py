import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.models.user import User

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print(">>> RUNNING USER MANAGEMENT MODULE TESTS <<<")
    print("=" * 60)

    unique_suffix = uuid.uuid4().hex[:6]
    test_login_id = f"usr_{unique_suffix}"
    test_email = f"user_{unique_suffix}@example.com"

    # 1. Test Successful User Creation (POST /api/users)
    print("\n=== 1. Test Successful User Creation (POST /api/users) ===")
    create_payload = {
        "name": "Sarah Accountant",
        "login_id": test_login_id,
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "role": "accountant",
    }
    r = client.post("/api/users", json=create_payload)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    user_data = r.json()
    user_id = user_data["id"]
    assert user_data["name"] == "Sarah Accountant"
    assert user_data["login_id"] == test_login_id
    assert user_data["email"] == test_email
    assert user_data["role"] == "accountant"
    assert user_data["is_active"] is True
    assert "password" not in user_data
    assert "password_hash" not in user_data
    print(f"Created user id={user_id}, response has NO password_hash: {user_data}")

    # Verify password hash in PostgreSQL
    db = SessionLocal()
    db_user = db.query(User).filter(User.id == user_id).first()
    assert db_user is not None
    assert str(db_user.password_hash).startswith("$2b$")
    assert str(db_user.password_hash) != "SecurePassword123!"
    db.close()
    print("Verified in DB: Password securely hashed using bcrypt.")

    # 2. Test Duplicate login_id
    print("\n=== 2. Test Duplicate login_id ===")
    dup_login_payload = {
        "name": "Another User",
        "login_id": test_login_id,
        "email": f"diff_{unique_suffix}@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "role": "user",
    }
    r = client.post("/api/users", json=dup_login_payload)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    assert "Login ID already exists" in r.json()["detail"]
    print("Duplicate login_id correctly rejected with 400 Bad Request.")

    # 3. Test Duplicate email
    print("\n=== 3. Test Duplicate email ===")
    dup_email_payload = {
        "name": "Another User",
        "login_id": f"diff_{unique_suffix}",
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "role": "user",
    }
    r = client.post("/api/users", json=dup_email_payload)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    assert "Email already exists" in r.json()["detail"]
    print("Duplicate email correctly rejected with 400 Bad Request.")

    # 4. Test Invalid Email
    print("\n=== 4. Test Invalid Email Format ===")
    invalid_email_payload = {
        "name": "Invalid Email User",
        "login_id": f"inv_{unique_suffix}",
        "email": "not-a-valid-email",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "role": "user",
    }
    r = client.post("/api/users", json=invalid_email_payload)
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    print("Invalid email correctly rejected with 422 Unprocessable Entity.")

    # 5. Test Weak Passwords
    print("\n=== 5. Test Weak Passwords ===")
    # 5a. Short password (< 8 chars)
    r = client.post("/api/users", json={
        "name": "Short", "login_id": f"sh_{unique_suffix}", "email": f"sh_{unique_suffix}@ex.com",
        "password": "Pass1!", "confirm_password": "Pass1!", "role": "user"
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    print("Password < 8 chars rejected with 422.")

    # 5b. No uppercase
    r = client.post("/api/users", json={
        "name": "NoUpper", "login_id": f"nu_{unique_suffix}", "email": f"nu_{unique_suffix}@ex.com",
        "password": "password123!", "confirm_password": "password123!", "role": "user"
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    print("Password without uppercase rejected with 422.")

    # 5c. No lowercase
    r = client.post("/api/users", json={
        "name": "NoLower", "login_id": f"nl_{unique_suffix}", "email": f"nl_{unique_suffix}@ex.com",
        "password": "PASSWORD123!", "confirm_password": "PASSWORD123!", "role": "user"
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    print("Password without lowercase rejected with 422.")

    # 5d. No special character
    r = client.post("/api/users", json={
        "name": "NoSpecial", "login_id": f"ns_{unique_suffix}", "email": f"ns_{unique_suffix}@ex.com",
        "password": "Password123", "confirm_password": "Password123", "role": "user"
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    print("Password without special character rejected with 422.")

    # 6. Test Password Mismatch
    print("\n=== 6. Test Password Mismatch ===")
    r = client.post("/api/users", json={
        "name": "Mismatch", "login_id": f"mm_{unique_suffix}", "email": f"mm_{unique_suffix}@ex.com",
        "password": "Password123!", "confirm_password": "DifferentPassword123!", "role": "user"
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    print("Mismatched passwords rejected with 422.")

    # 7. Test Invalid Role
    print("\n=== 7. Test Invalid Role ===")
    r = client.post("/api/users", json={
        "name": "BadRole", "login_id": f"br_{unique_suffix}", "email": f"br_{unique_suffix}@ex.com",
        "password": "Password123!", "confirm_password": "Password123!", "role": "superman"
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    print("Invalid role rejected with 422.")

    # 8. Test Get User by ID (GET /api/users/{id})
    print("\n=== 8. Test Get User by ID (GET /api/users/{id}) ===")
    r = client.get(f"/api/users/{user_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    fetched = r.json()
    assert fetched["id"] == user_id
    assert fetched["login_id"] == test_login_id
    assert "password_hash" not in fetched
    print(f"Retrieved user {user_id} successfully.")

    # 9. Test List Users (GET /api/users)
    print("\n=== 9. Test List Users (GET /api/users) ===")
    r = client.get("/api/users")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    all_users = r.json()
    assert isinstance(all_users, list)
    assert any(u["id"] == user_id for u in all_users)
    print(f"Listed {len(all_users)} users successfully.")

    # 10. Test Update User (PUT /api/users/{id})
    print("\n=== 10. Test Update User (PUT /api/users/{id}) ===")
    update_payload = {
        "name": "Sarah Senior Accountant",
        "role": "admin",
    }
    r = client.put(f"/api/users/{user_id}", json=update_payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    updated = r.json()
    assert updated["name"] == "Sarah Senior Accountant"
    assert updated["role"] == "admin"
    print("User updated successfully.")

    # 11. Test Activate / Deactivate User (PATCH /api/users/{id}/status)
    print("\n=== 11. Test Activate/Deactivate (PATCH /api/users/{id}/status) ===")
    # Deactivate
    r = client.patch(f"/api/users/{user_id}/status", json={"is_active": False})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.json()["is_active"] is False
    print("User deactivated successfully (is_active=False).")

    # Reactivate
    r = client.patch(f"/api/users/{user_id}/status", json={"is_active": True})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.json()["is_active"] is True
    print("User reactivated successfully (is_active=True).")

    # 12. Test Delete User (DELETE /api/users/{id})
    print("\n=== 12. Test Delete User (DELETE /api/users/{id}) ===")
    r = client.delete(f"/api/users/{user_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    print("User deleted successfully.")

    # Confirm deletion (404 on GET)
    r = client.get(f"/api/users/{user_id}")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"
    print("Confirmed 404 Not Found after deletion.")

    print("\n" + "=" * 60)
    print(">>> ALL USER MANAGEMENT MODULE TESTS PASSED (12/12)! <<<")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
