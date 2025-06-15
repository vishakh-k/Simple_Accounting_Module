import sqlite3
import os

def check_database():
    db_path = 'accounting.db'
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check tables
        print("\n=== Database Tables ===")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        for table in tables:
            print(f"Table: {table['name']}")
        
        # Check users table structure
        print("\n=== Users Table Structure ===")
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("Columns in users table:")
        for col in columns:
            print(f"- {col['name']} ({col['type']})")
        
        # Check user data
        print("\n=== User Data ===")
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        
        if not users:
            print("No users found in the database!")
        else:
            print(f"Found {len(users)} users:")
            for user in users:
                print(f"\nUser ID: {user[0]}")
                print(f"Username: {user[1]}")
                print(f"Email: {user[2] if len(user) > 2 else 'N/A'}")
                print(f"Password: {user[3] if len(user) > 3 else 'N/A'}")
                print(f"Active: {user[4] if len(user) > 4 else 'N/A'}")
                if len(user) > 5:
                    print(f"Password Hash: {user[5]}")
    
    except Exception as e:
        print(f"Error checking database: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("=== Database Check ===\n")
    check_database()
