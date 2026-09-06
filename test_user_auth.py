from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.models.user import User

client = TestClient(app)

# Clean up any previous test user with login_id 'admin01' or 'admin@urbanfurniture.com'
db = SessionLocal()
existing_admin = db.query(User).filter((User.login_id == "admin01") | (User.email == "admin@urbanfurniture.com")).first()
if existing_admin:
    db.delete(existing_admin)
    db.commit()
existing_mismatch = db.query(User).filter(User.login_id == "test001").first()
if existing_mismatch:
    db.delete(existing_mismatch)
    db.commit()
db.close()

print("=== 1. Test Registration with Valid Admin User ===")
admin_payload = {
    "name": "Admin User",
    "login_id": "admin01",
    "email": "admin@urbanfurniture.com",
    "password": "Admin123!",
    "confirm_password": "Admin123!",
    "role": "admin"
}
res_reg = client.post("/users/register", json=admin_payload)
assert res_reg.status_code == 201, f"Expected 201, got {res_reg.status_code}: {res_reg.text}"
user_resp = res_reg.json()
print("Registration response:", user_resp)
assert user_resp["login_id"] == "admin01"
assert user_resp["email"] == "admin@urbanfurniture.com"
assert user_resp["role"] == "admin"
assert "password" not in user_resp, "Password must not be returned in API response"
assert "password_hash" not in user_resp, "Password hash must not be returned in API response"

# Verify in DB that password_hash is stored instead of plain text
db = SessionLocal()
db_user = db.query(User).filter(User.login_id == "admin01").first()
assert db_user is not None
assert str(db_user.password_hash) != "Admin123!", "Plain text password found in DB!"
assert str(db_user.password_hash).startswith("$2b$") or str(db_user.password_hash).startswith("$2a$"), "Invalid bcrypt hash in DB!"
print("Verified in PostgreSQL: Plain-text password is NOT stored; bcrypt hash is stored:", db_user.password_hash[:25] + "...")
db.close()

print("\n=== 2. Test Duplicate login_id ===")
dup_login_payload = {
    "name": "Another User",
    "login_id": "admin01",
    "email": "another@urbanfurniture.com",
    "password": "Admin123!",
    "confirm_password": "Admin123!",
    "role": "accountant"
}
res_dup_login = client.post("/users/register", json=dup_login_payload)
assert res_dup_login.status_code == 400, f"Expected 400, got {res_dup_login.status_code}: {res_dup_login.text}"
print("Duplicate login_id rejected with HTTP 400:", res_dup_login.json()["detail"])
assert "Login ID already exists" in res_dup_login.json()["detail"]

print("\n=== 3. Test Duplicate Email ===")
dup_email_payload = {
    "name": "Another User",
    "login_id": "another01",
    "email": "admin@urbanfurniture.com",
    "password": "Admin123!",
    "confirm_password": "Admin123!",
    "role": "accountant"
}
res_dup_email = client.post("/users/register", json=dup_email_payload)
assert res_dup_email.status_code == 400, f"Expected 400, got {res_dup_email.status_code}: {res_dup_email.text}"
print("Duplicate email rejected with HTTP 400:", res_dup_email.json()["detail"])
assert "Email already exists" in res_dup_email.json()["detail"]

print("\n=== 4. Test Mismatched Passwords ===")
mismatched_payload = {
    "name": "Test User",
    "login_id": "test001",
    "email": "test@example.com",
    "password": "Admin123!",
    "confirm_password": "Wrong123!",
    "role": "contact"
}
res_mismatch = client.post("/users/register", json=mismatched_payload)
assert res_mismatch.status_code in [400, 422], f"Expected 400 or 422, got {res_mismatch.status_code}: {res_mismatch.text}"
print(f"Mismatched passwords rejected with HTTP {res_mismatch.status_code}:", res_mismatch.text)

# Confirm test001 was NOT created in DB
db = SessionLocal()
assert db.query(User).filter(User.login_id == "test001").first() is None, "User should NOT be created!"
db.close()
print("Confirmed: User with mismatched passwords was NOT created in database.")

print("\n=== 5. Test Password Longer than 72 UTF-8 Bytes ===")
long_pw = "A" * 73
long_payload = {
    "name": "Long User",
    "login_id": "long001",
    "email": "long@example.com",
    "password": long_pw,
    "confirm_password": long_pw,
    "role": "contact"
}
res_long = client.post("/users/register", json=long_payload)
assert res_long.status_code in [400, 422], f"Expected 400 or 422, got {res_long.status_code}: {res_long.text}"
print(f"Password > 72 bytes rejected with HTTP {res_long.status_code}:", res_long.text)
assert "Password cannot exceed 72 bytes" in str(res_long.json())

# Confirm long001 was NOT created in DB
db = SessionLocal()
assert db.query(User).filter(User.login_id == "long001").first() is None, "User should NOT be created!"
db.close()
print("Confirmed: User with password > 72 bytes was NOT created in database.")

print("\n=== 6. Test Successful Login ===")
login_payload = {
    "login_id": "admin01",
    "password": "Admin123!"
}
res_login = client.post("/users/login", json=login_payload)
assert res_login.status_code == 200, f"Expected 200, got {res_login.status_code}: {res_login.text}"
token_data = res_login.json()
print("Login successful! Token response:", token_data)
assert "access_token" in token_data
assert token_data["token_type"] == "bearer"

print("\n=== 7. Test Wrong Password Login ===")
wrong_login_payload = {
    "login_id": "admin01",
    "password": "WrongPassword!"
}
res_wrong = client.post("/users/login", json=wrong_login_payload)
assert res_wrong.status_code == 401, f"Expected 401, got {res_wrong.status_code}: {res_wrong.text}"
print("Wrong password rejected with HTTP 401:", res_wrong.json()["detail"])
assert res_wrong.json()["detail"] == "Invalid Login ID or Password"

print("\n==========================================")
print(">>> ALL AUTH & PASSWORD TESTS PASSED! <<<")
print("==========================================")
