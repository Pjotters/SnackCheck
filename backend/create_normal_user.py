import json
import os
import uuid
from datetime import datetime, timezone

# Attempt to import password hashing utility and roles from server.py
# This might need adjustment if server.py changes significantly or these are moved.
try:
    from server import get_password_hash, USER_ROLES
except ImportError:
    print("ERROR: Could not import 'get_password_hash' or 'USER_ROLES' from server.py.")
    print("Ensure server.py contains these and is accessible.")
    # Fallback for get_password_hash if server.py is not available/modified
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
        "STUDENT": "student"
    }
    print(f"Using fallback USER_ROLES: {USER_ROLES}")

USERS_FILE = "users.json"

def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError):
        print(f"Error loading users from {USERS_FILE}")
        return []

def save_users(users):
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=2)
    except IOError:
        print(f"Error: Could not write to {USERS_FILE}")

def add_normal_user(username, password, class_code):
    print(f"Attempting to add normal user to {USERS_FILE}...")
    users = load_users()

    user_exists = any(
        user.get('username') == username and 
        user.get('class_code') == class_code 
        for user in users
    )

    if user_exists:
        print(f"User '{username}' with class code '{class_code}' already exists in {USERS_FILE}. Skipping creation.")
        return False

    hashed_password = get_password_hash(password)
    
    normal_user_data = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": hashed_password,
        "class_code": class_code,
        "role": USER_ROLES.get("STUDENT", "student"), # Default to student role
        "points": 0,
        "level": 1,
        "badges": [],
        "streak_days": 0,
        "last_entry_date": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    users.append(normal_user_data)
    save_users(users)
    print(f"Normal user '{username}' created successfully in {USERS_FILE}!")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Class Code: {class_code}")
    return True

def main():
    print("--- Create Normal User Script (JSON) ---")
    
    # --- CONFIGURATION FOR THE NEW NORMAL USER ---
    # You can modify these values directly, or enhance the script to take input
    NEW_USERNAME = "student1"
    NEW_PASSWORD = "password123"
    NEW_CLASS_CODE = "klasA"
    # ---------------------------------------------
    
    print(f"Attempting to create user: {NEW_USERNAME}, Class: {NEW_CLASS_CODE}")
    success = add_normal_user(NEW_USERNAME, NEW_PASSWORD, NEW_CLASS_CODE)
    if success:
        print(f"User {NEW_USERNAME} should now be able to log in if the server is running and adapted.")
    print("Script finished.")

if __name__ == "__main__":
    main()
