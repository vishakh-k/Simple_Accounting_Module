import os
import sqlite3

def reset_database():
    db_path = 'accounting.db'
    
    # Backup existing database if it exists
    if os.path.exists(db_path):
        backup_path = 'accounting.db.backup'
        if os.path.exists(backup_path):
            os.remove(backup_path)
        os.rename(db_path, backup_path)
        print(f"Backed up existing database to {backup_path}")
    
    try:
        # Create a new database with the correct schema
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create users table with proper schema
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Create other necessary tables
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT CHECK(type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')) NOT NULL,
            balance REAL DEFAULT 0.00,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            previous_balance REAL DEFAULT 0.00
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            description TEXT,
            debit_account INTEGER NOT NULL,
            credit_account INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
            FOREIGN KEY (debit_account) REFERENCES accounts(id),
            FOREIGN KEY (credit_account) REFERENCES accounts(id)
        )
        ''')
        
        conn.commit()
        conn.close()
        
        print("\n✅ Database has been reset with the correct schema!")
        print("You can now register a new user and the login should work properly.")
        
    except Exception as e:
        print(f"\n❌ Error resetting database: {str(e)}")
        if os.path.exists(backup_path) and not os.path.exists(db_path):
            os.rename(backup_path, db_path)
            print("Restored original database from backup")

if __name__ == "__main__":
    print("=== Database Reset Tool ===\n")
    print("This will reset your database to a clean state.")
    print("A backup of your current database will be created.")
    confirm = input("\nAre you sure you want to continue? (yes/no): ")
    
    if confirm.lower() in ('yes', 'y'):
        reset_database()
    else:
        print("\nDatabase reset cancelled.")
