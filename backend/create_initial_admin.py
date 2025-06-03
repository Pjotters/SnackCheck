import json
import os
import uuid
from datetime import datetime, timezone

# Attempt to import password hashing utility and roles from server.py
# This might need adjustment if server.py changes significantly.
try:
    from server import get_password_hash, USER_ROLES
except ImportError:
    print("ERROR: Could not import 'get_password_hash' or 'USER_ROLES' from server.py.")
    print("Ensure server.py contains these and is accessible.")
    # Fallback for get_password_hash if server.py is not available/modified
    # This is a simplified version. For production, use a proper setup.
    try:
        from passlib.context import CryptContext
        pwd_context_fallback = CryptContext(schemes=["bcrypt"], deprecated="auto")
        def get_password_hash(password: str) -> str:
            return pwd_context_fallback.hash(password)
        print("Using fallback password hasher.")
    except ImportError:
        def get_password_hash(password: str) -> str:
            print("CRITICAL ERROR: passlib.context.CryptContext not found. Cannot hash password.")
            print("Please install passlib: pip install passlib[bcrypt]")
            return "UNHASHED_" + password # Not secure, for placeholder only
    # Fallback for USER_ROLES
    USER_ROLES = {
        "ADMIN": "admin",
        "TEACHER": "teacher",
        "STUDENT": "student" # Add other roles as needed
    }
    print(f"Using fallback USER_ROLES: {USER_ROLES}")

# --- CONFIGURATION FOR THE INITIAL ADMIN USER ---
ADMIN_USERNAME = "hallo"
ADMIN_PASSWORD = "12345"  # Choose a strong password!
ADMIN_CLASS_CODE = "admin"
# -------------------------------------------------

USERS_FILE = "users.json"

def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError):
        return []

def save_users(users):
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=2)
    except IOError:
        print(f"Error: Could not write to {USERS_FILE}")

def add_initial_admin():
    print(f"Attempting to add initial admin user to {USERS_FILE}...")
    users = load_users()

    # Check if admin user already exists (by username and class_code)
    # For JSON storage, class_code comparison should be consistent (e.g., case-insensitive or stored consistently)
    # Here, we'll assume class_code is stored as is from config and compared directly.
    admin_exists = any(
        user.get('username') == ADMIN_USERNAME and 
        user.get('class_code') == ADMIN_CLASS_CODE 
        for user in users
    )

    if admin_exists:
        print(f"Admin user '{ADMIN_USERNAME}' with class code '{ADMIN_CLASS_CODE}' already exists in {USERS_FILE}. Skipping creation.")
        return

    hashed_password = get_password_hash(ADMIN_PASSWORD)
    
    admin_user_data = {
        "id": str(uuid.uuid4()),
        "username": ADMIN_USERNAME,
        "password_hash": hashed_password,
        "class_code": ADMIN_CLASS_CODE, # Stored as defined
        "role": USER_ROLES.get("ADMIN", "admin"), # Use .get for safety
        "points": 0,
        "level": 1,
        "badges": [],
        "streak_days": 0,
        "last_entry_date": None, # Store as YYYY-MM-DD string or null
        "created_at": datetime.now(timezone.utc).isoformat() # Store as ISO 8601 string
    }

    users.append(admin_user_data)
    save_users(users)
    print(f"Admin user '{ADMIN_USERNAME}' created successfully in {USERS_FILE}!")
    print(f"Username: {ADMIN_USERNAME}")
    print(f"Password: {ADMIN_PASSWORD} (This is the one you set in the script)")
    print(f"Class Code: {ADMIN_CLASS_CODE}")
    print("You should now be able to log in if the server is adapted to use users.json.")

def main():
    print("Starting script to create initial admin user (using JSON file)...")
    # No need to create tables for JSON
    add_initial_admin()
    print("Script finished.")

if __name__ == "__main__":
    main()
