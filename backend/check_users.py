from database import get_db_connection

def check_database():
    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if users table exists and its structure
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        users_table = cursor.fetchone()
        
        if not users_table:
            print("ERROR: 'users' table does not exist in the database!")
            return
            
        print("\n=== Database Schema ===")
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("Users table structure:")
        for col in columns:
            print(f"- {col['name']} ({col['type']})")
        
        # Check existing users
        print("\n=== Existing Users ===")
        cursor.execute("SELECT id, username, email, is_active, LENGTH(password_hash) as pwd_length FROM users")
        users = cursor.fetchall()
        
        if not users:
            print("No users found in the database!")
        else:
            print(f"Found {len(users)} users:")
            for user in users:
                print(f"- ID: {user['id']}, Username: {user['username']}, "
                      f"Email: {user['email']}, Active: {user['is_active']}, "
                      f"Password Hash Length: {user['pwd_length']}")
        
        # Check if we can read the password hashes
        print("\n=== Sample Password Hashes ===")
        cursor.execute("SELECT username, substr(password_hash, 1, 20) || '...' as partial_hash FROM users LIMIT 3")
        hashes = cursor.fetchall()
        for h in hashes:
            print(f"{h['username']}: {h['partial_hash']}")
        
    except Exception as e:
        print(f"Error checking database: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("=== Checking Database and Users ===\n")
    check_database()
