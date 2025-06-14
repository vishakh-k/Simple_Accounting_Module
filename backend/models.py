
from database import execute_query, get_db_connection

# Account model
def get_accounts():
    return execute_query("SELECT * FROM accounts ORDER BY name", fetchall=True)

def get_account(account_id):
    return execute_query("SELECT * FROM accounts WHERE id = ?", (account_id,), fetchone=True)

def create_account(name, account_type, balance):
    valid_types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
    if account_type not in valid_types:
        raise ValueError(f"Invalid account type. Must be one of {valid_types}")
    return execute_query(
        "INSERT INTO accounts (name, type, balance, previous_balance) VALUES (?, ?, ?, ?)",
        (name, account_type, balance, balance * 0.9),
        commit=True
    )

# Transaction model
def get_transactions():
    return execute_query(
        """
        SELECT t.id, t.date, t.description, t.amount, t.status,
               t.debit_account, da.name AS debit_account_name,
               t.credit_account, ca.name AS credit_account_name
        FROM transactions t
        JOIN accounts da ON t.debit_account = da.id
        JOIN accounts ca ON t.credit_account = ca.id
        ORDER BY t.date DESC
        """,
        fetchall=True
    )

def create_transaction(date, description, debit_account, credit_account, amount, status):
    if debit_account == credit_account:
        raise ValueError("Debit and credit accounts cannot be the same")
    if amount <= 0:
        raise ValueError("Amount must be greater than 0")
    conn = get_db_connection()
    try:
        conn.execute("BEGIN TRANSACTION")
        # Verify accounts exist
        debit_acc = execute_query("SELECT id, type FROM accounts WHERE id = ?", (debit_account,), fetchone=True)
        credit_acc = execute_query("SELECT id, type FROM accounts WHERE id = ?", (credit_account,), fetchone=True)
        if not debit_acc or not credit_acc:
            raise ValueError("Invalid debit or credit account")
        
        # Insert transaction
        last_id = execute_query(
            "INSERT INTO transactions (date, description, debit_account, credit_account, amount, status) VALUES (?, ?, ?, ?, ?, ?)",
            (date, description, debit_account, credit_account, amount, status),
            commit=True
        )
        
        # Update balances based on account types
        debit_amount = amount if debit_acc['type'] in ['Expense', 'Asset'] else -amount
        credit_amount = amount if credit_acc['type'] in ['Revenue', 'Liability', 'Equity'] else -amount
        execute_query(
            "UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (debit_amount, debit_account),
            commit=True
        )
        execute_query(
            "UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (credit_amount, credit_account),
            commit=True
        )
        conn.commit()
        return last_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# Invoice model
def get_invoices():
    return execute_query("SELECT * FROM invoices ORDER BY date DESC", fetchall=True)

def create_invoice(invoice_number, client, date, amount, status):
    if amount <= 0:
        raise ValueError("Amount must be greater than 0")
    return execute_query(
        "INSERT INTO invoices (invoice_number, client, date, amount, status) VALUES (?, ?, ?, ?, ?)",
        (invoice_number, client, date, amount, status),
        commit=True
    )

# Report model
def generate_report(report_type, start_date, end_date):
    valid_types = ['balance_sheet', 'income_statement', 'cash_flow']
    if report_type not in valid_types:
        raise ValueError(f"Invalid report type. Must be one of {valid_types}")
    return execute_query(
        "INSERT INTO reports (report_type, start_date, end_date) VALUES (?, ?, ?)",
        (report_type, start_date, end_date),
        commit=True
    )

# User model
def create_user(username, password, email):
    """Create a new user with the given username, password, and email"""
    try:
        # First check if user already exists
        existing = get_user_by_username(username)
        if existing:
            raise ValueError(f"Username '{username}' already exists")
            
        # Insert new user
        user_id = execute_query(
            """
            INSERT INTO users (username, password_hash, email, is_active)
            VALUES (?, ?, ?, 1)
            """,
            (username, password, email),
            commit=True
        )
        return user_id
    except Exception as e:
        print(f"Error in create_user: {str(e)}")
        raise

def get_user_by_username(username):
    """Get a user by their username"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT id, username, email, password_hash, created_at, is_active
            FROM users 
            WHERE username = ? AND is_active = 1
            """,
            (username,)
        )
        
        result = cursor.fetchone()
        if result is None:
            return None
            
        # Convert the result to a dictionary
        columns = [d[0] for d in cursor.description]
        user_dict = dict(zip(columns, result))
        return user_dict
        
    except Exception as e:
        print(f"Error in get_user_by_username: {str(e)}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
