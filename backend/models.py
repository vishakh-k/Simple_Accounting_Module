
from database import execute_query, get_db_connection

# Account model
def get_accounts():
    """Get all accounts with their current balances"""
    return execute_query(
        """
        SELECT id, code, name, type, balance, description, is_active,
               (SELECT COUNT(*) FROM transactions 
                WHERE debit_account = accounts.id OR credit_account = accounts.id) as transaction_count
        FROM accounts 
        ORDER BY type, code, name
        """,
        fetchall=True
    )

def get_account(account_id):
    """Get a single account by ID with detailed information"""
    account = execute_query(
        """
        SELECT id, code, name, type, balance, description, is_active, created_at,
               (SELECT SUM(amount) FROM transactions 
                WHERE debit_account = accounts.id) as total_debits,
               (SELECT SUM(amount) FROM transactions 
                WHERE credit_account = accounts.id) as total_credits
        FROM accounts 
        WHERE id = ?
        """,
        (account_id,),
        fetchone=True
    )
    if account:
        account['current_balance'] = (account.get('total_debits', 0) or 0) - (account.get('total_credits', 0) or 0)
    return account

def create_account(code, name, account_type, description='', initial_balance=0.0, is_active=True):
    """Create a new account with validation"""
    valid_types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
    if account_type not in valid_types:
        raise ValueError(f"Invalid account type. Must be one of {valid_types}")
    
    # Validate account code format (e.g., 1000, 2000, etc.)
    try:
        code_int = int(code)
        if code_int <= 0 or code_int > 9999:
            raise ValueError("Account code must be between 1 and 9999")
    except ValueError:
        raise ValueError("Account code must be a number")
    
    return execute_query(
        """
        INSERT INTO accounts (code, name, type, description, balance, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (code, name, account_type, description, float(initial_balance), 1 if is_active else 0),
        commit=True
    )

def update_account_balance(account_id, amount, is_debit=True):
    """Update account balance after a transaction"""
    operator = '+' if is_debit else '-'
    execute_query(
        f"UPDATE accounts SET balance = balance {operator} ? WHERE id = ?",
        (amount, account_id),
        commit=True
    )

def get_account_balance(account_id):
    """Get current balance of an account"""
    account = execute_query(
        "SELECT balance FROM accounts WHERE id = ?",
        (account_id,),
        fetchone=True
    )
    return account['balance'] if account else 0.0

# Transaction model
def get_transactions(account_id=None, start_date=None, end_date=None, limit=100, offset=0):
    """
    Get transactions with optional filtering
    
    Args:
        account_id: Filter by account ID (debit or credit)
        start_date: Filter transactions on or after this date (YYYY-MM-DD)
        end_date: Filter transactions on or before this date (YYYY-MM-DD)
        limit: Maximum number of transactions to return
        offset: Number of transactions to skip (for pagination)
    """
    params = []
    where_clauses = ["1=1"]
    
    if account_id:
        where_clauses.append("(debit_account = ? OR credit_account = ?)")
        params.extend([account_id, account_id])
    
    if start_date:
        where_clauses.append("date >= ?")
        params.append(start_date)
    
    if end_date:
        where_clauses.append("date <= ?")
        params.append(end_date)
    
    query = f"""
        SELECT 
            t.id, t.date, t.reference, t.description, t.amount, t.status,
            t.debit_account, da.name AS debit_account_name, da.code AS debit_account_code,
            t.credit_account, ca.name AS credit_account_name, ca.code AS credit_account_code,
            t.created_at, t.updated_at, t.created_by
        FROM transactions t
        JOIN accounts da ON t.debit_account = da.id
        JOIN accounts ca ON t.credit_account = ca.id
        WHERE {' AND '.join(where_clauses)}
        ORDER BY t.date DESC, t.id DESC
        LIMIT ? OFFSET ?
    """
    
    params.extend([limit, offset])
    return execute_query(query, tuple(params), fetchall=True)

def get_transaction(transaction_id):
    """Get a single transaction by ID with full details"""
    return execute_query(
        """
        SELECT 
            t.*,
            da.name AS debit_account_name, da.code AS debit_account_code,
            ca.name AS credit_account_name, ca.code AS credit_account_code,
            u.username AS created_by_username
        FROM transactions t
        JOIN accounts da ON t.debit_account = da.id
        JOIN accounts ca ON t.credit_account = ca.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
        """,
        (transaction_id,),
        fetchone=True
    )

def create_transaction(date, reference, description, debit_account, credit_account, amount, created_by, status='posted'):
    """
    Create a new accounting transaction with validation
    
    Args:
        date: Transaction date (YYYY-MM-DD)
        reference: Transaction reference/number
        description: Description of the transaction
        debit_account: ID of the account to debit
        credit_account: ID of the account to credit
        amount: Transaction amount (must be positive)
        created_by: ID of the user creating the transaction
        status: Transaction status (draft, posted, void)
    """
    # Input validation
    if not all([date, reference, description, debit_account, credit_account, amount, created_by]):
        raise ValueError("All fields are required")
        
    if debit_account == credit_account:
        raise ValueError("Debit and credit accounts cannot be the same")
        
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError("Amount must be greater than 0")
    except (ValueError, TypeError):
        raise ValueError("Invalid amount")
    
    # Verify accounts exist and are active
    debit_acc = execute_query(
        "SELECT id, type, is_active FROM accounts WHERE id = ?", 
        (debit_account,), 
        fetchone=True
    )
    
    credit_acc = execute_query(
        "SELECT id, type, is_active FROM accounts WHERE id = ?", 
        (credit_account,), 
        fetchone=True
    )
    
    if not debit_acc or not credit_acc:
        raise ValueError("Invalid debit or credit account")
        
    if not debit_acc.get('is_active') or not credit_acc.get('is_active'):
        raise ValueError("Cannot use inactive accounts")
    
    # Start transaction
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("BEGIN TRANSACTION")
        
        # Insert the transaction
        transaction_id = execute_query(
            """
            INSERT INTO transactions 
            (date, reference, description, debit_account, credit_account, amount, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (date, reference, description, debit_account, credit_account, amount, status, created_by),
            commit=False
        )
        
        # Update account balances if transaction is posted
        if status == 'posted':
            # Update debit account (increases balance for assets/expenses, decreases for liabilities/equity/revenue)
            cursor.execute(
                """
                UPDATE accounts 
                SET balance = balance + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (amount, debit_account)
            )
            
            # Update credit account (decreases balance for assets/expenses, increases for liabilities/equity/revenue)
            cursor.execute(
                """
                UPDATE accounts 
                SET balance = balance - ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (amount, credit_account)
            )
        
        conn.commit()
        return transaction_id
        
    except Exception as e:
        conn.rollback()
        raise ValueError(f"Failed to create transaction: {str(e)}")
        
    finally:
        cursor.close()
        conn.close()

# Invoice model
def get_invoices(status=None, client_id=None, start_date=None, end_date=None):
    """
    Get invoices with optional filtering
    
    Args:
        status: Filter by status (draft, sent, paid, overdue, cancelled)
        client_id: Filter by client ID
        start_date: Filter invoices on or after this date (YYYY-MM-DD)
        end_date: Filter invoices on or before this date (YYYY-MM-DD)
    """
    params = []
    where_clauses = ["1=1"]
    
    if status:
        where_clauses.append("status = ?")
        params.append(status)
    
    if client_id:
        where_clauses.append("client_id = ?")
        params.append(client_id)
    
    if start_date:
        where_clauses.append("date >= ?")
        params.append(start_date)
    
    if end_date:
        where_clauses.append("date <= ?")
        params.append(end_date)
    
    query = f"""
        SELECT 
            i.*,
            c.name as client_name,
            c.email as client_email,
            (SELECT COALESCE(SUM(p.amount), 0) 
             FROM payments p 
             WHERE p.invoice_id = i.id AND p.status = 'completed') as amount_paid
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE {' AND '.join(where_clauses)}
        ORDER BY i.date DESC, i.invoice_number DESC
    """
    
    return execute_query(query, tuple(params), fetchall=True)

def get_invoice(invoice_id):
    """Get a single invoice with all details"""
    return execute_query(
        """
        SELECT 
            i.*,
            c.name as client_name, 
            c.email as client_email,
            c.phone as client_phone,
            c.address as client_address,
            (SELECT COALESCE(SUM(p.amount), 0) 
             FROM payments p 
             WHERE p.invoice_id = i.id AND p.status = 'completed') as amount_paid,
            u.username as created_by_username
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.id = ?
        """,
        (invoice_id,),
        fetchone=True
    )

def create_invoice(
    invoice_number, client_id, date, due_date, items, 
    tax_rate, discount, notes, status, created_by
):
    """
    Create a new invoice with line items
    
    Args:
        invoice_number: Unique invoice number
        client_id: ID of the client
        date: Invoice date (YYYY-MM-DD)
        due_date: Due date (YYYY-MM-DD)
        items: List of dictionaries with 'description', 'quantity', 'unit_price', 'taxable'
        tax_rate: Tax rate as decimal (e.g., 0.15 for 15%)
        discount: Discount amount
        notes: Optional notes
        status: Invoice status (draft, sent, paid, overdue, cancelled)
        created_by: ID of the user creating the invoice
    """
    # Calculate subtotal, tax, and total
    subtotal = sum(item['quantity'] * item['unit_price'] for item in items)
    taxable_amount = sum(
        item['quantity'] * item['unit_price'] 
        for item in items 
        if item.get('taxable', False)
    )
    tax = taxable_amount * tax_rate
    total = subtotal + tax - discount
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("BEGIN TRANSACTION")
        
        # Create invoice
        invoice_id = execute_query(
            """
            INSERT INTO invoices 
            (invoice_number, client_id, date, due_date, subtotal, 
             tax_rate, tax_amount, discount, total, notes, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                invoice_number, client_id, date, due_date, subtotal,
                tax_rate, tax, discount, total, notes, status, created_by
            ),
            commit=False
        )
        
        # Add invoice items
        for item in items:
            execute_query(
                """
                INSERT INTO invoice_items 
                (invoice_id, description, quantity, unit_price, taxable, amount)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    invoice_id, item['description'], item['quantity'],
                    item['unit_price'], 1 if item.get('taxable', False) else 0,
                    item['quantity'] * item['unit_price']
                ),
                commit=False
            )
        
        # Record initial status change
        execute_query(
            """
            INSERT INTO invoice_history 
            (invoice_id, status, changed_by, notes)
            VALUES (?, ?, ?, ?)
            """,
            (invoice_id, status, created_by, "Invoice created"),
            commit=False
        )
        
        conn.commit()
        return invoice_id
        
    except Exception as e:
        conn.rollback()
        raise ValueError(f"Failed to create invoice: {str(e)}")
        
    finally:
        cursor.close()
        conn.close()

def update_invoice_status(invoice_id, new_status, changed_by, notes=None):
    """Update invoice status and record the change"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("BEGIN TRANSACTION")
        
        # Update invoice status
        execute_query(
            "UPDATE invoices SET status = ? WHERE id = ?",
            (new_status, invoice_id),
            commit=False
        )
        
        # Record status change
        execute_query(
            """
            INSERT INTO invoice_history 
            (invoice_id, status, changed_by, notes)
            VALUES (?, ?, ?, ?)
            """,
            (invoice_id, new_status, changed_by, notes or f"Status changed to {new_status}"),
            commit=False
        )
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        raise ValueError(f"Failed to update invoice status: {str(e)}")
        
    finally:
        cursor.close()
        conn.close()

# Report model
def generate_report(report_type, start_date, end_date, format='json'):
    """
    Generate financial reports
    
    Args:
        report_type: Type of report (balance_sheet, income_statement, cash_flow, trial_balance)
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        format: Output format (json, csv, pdf)
    """
    valid_types = ['balance_sheet', 'income_statement', 'cash_flow', 'trial_balance', 'general_ledger']
    if report_type not in valid_types:
        raise ValueError(f"Invalid report type. Must be one of {valid_types}")
    
    if report_type == 'balance_sheet':
        return generate_balance_sheet(end_date, format)
    elif report_type == 'income_statement':
        return generate_income_statement(start_date, end_date, format)
    elif report_type == 'cash_flow':
        return generate_cash_flow_statement(start_date, end_date, format)
    elif report_type == 'trial_balance':
        return generate_trial_balance(start_date, end_date, format)
    elif report_type == 'general_ledger':
        return generate_general_ledger(start_date, end_date, format)

def generate_balance_sheet(as_of_date, format='json'):
    """Generate a balance sheet as of a specific date"""
    # Get all accounts with their balances
    accounts = execute_query(
        """
        SELECT id, code, name, type, balance
        FROM accounts
        WHERE is_active = 1
        ORDER BY type, code
        """,
        fetchall=True
    )
    
    # Group accounts by type
    report = {
        'as_of_date': as_of_date,
        'assets': [],
        'liabilities': [],
        'equity': [],
        'totals': {
            'assets': 0,
            'liabilities': 0,
            'equity': 0
        }
    }
    
    for account in accounts:
        account_type = account['type'].lower()
        if account_type in ['asset', 'expense']:
            report['assets'].append(account)
            report['totals']['assets'] += account['balance']
        elif account_type in ['liability', 'revenue']:
            report['liabilities'].append(account)
            report['totals']['liabilities'] += account['balance']
        elif account_type == 'equity':
            report['equity'].append(account)
            report['totals']['equity'] += account['balance']
    
    # Calculate total liabilities and equity
    report['totals']['liabilities_equity'] = (
        report['totals']['liabilities'] + report['totals']['equity']
    )
    
    return report if format == 'json' else format_report(report, 'balance_sheet')

def generate_income_statement(start_date, end_date, format='json'):
    """Generate an income statement for a date range"""
    # Get revenue and expense accounts with their activity
    accounts = execute_query(
        """
        SELECT 
            a.id, a.code, a.name, a.type,
            COALESCE(SUM(CASE WHEN t.debit_account = a.id THEN t.amount ELSE 0 END), 0) as debits,
            COALESCE(SUM(CASE WHEN t.credit_account = a.id THEN t.amount ELSE 0 END), 0) as credits
        FROM accounts a
        LEFT JOIN transactions t ON t.date BETWEEN ? AND ?
            AND (t.debit_account = a.id OR t.credit_account = a.id)
        WHERE a.type IN ('Revenue', 'Expense')
        GROUP BY a.id, a.code, a.name, a.type
        ORDER BY a.type, a.code
        """,
        (start_date, end_date),
        fetchall=True
    )
    
    report = {
        'start_date': start_date,
        'end_date': end_date,
        'revenue': [],
        'expenses': [],
        'totals': {
            'revenue': 0,
            'expenses': 0,
            'net_income': 0
        }
    }
    
    for account in accounts:
        if account['type'] == 'Revenue':
            amount = account['credits'] - account['debits']
            account['amount'] = amount
            report['revenue'].append(account)
            report['totals']['revenue'] += amount
        else:  # Expense
            amount = account['debits'] - account['credits']
            account['amount'] = amount
            report['expenses'].append(account)
            report['totals']['expenses'] += amount
    
    report['totals']['net_income'] = (
        report['totals']['revenue'] - report['totals']['expenses']
    )
    
    return report if format == 'json' else format_report(report, 'income_statement')

def generate_cash_flow_statement(start_date, end_date, format='json'):
    """Generate a cash flow statement for a date range"""
    # Get beginning and ending cash balances
    cash_accounts = execute_query(
        """
        SELECT id, code, name, balance
        FROM accounts
        WHERE type = 'Asset' AND name LIKE '%Cash%' AND is_active = 1
        """,
        fetchall=True
    )
    
    if not cash_accounts:
        raise ValueError("No cash accounts found")
    
    # Get cash transactions grouped by category
    cash_flows = {
        'operating': get_cash_flows_by_activity('operating', start_date, end_date),
        'investing': get_cash_flows_by_activity('investing', start_date, end_date),
        'financing': get_cash_flows_by_activity('financing', start_date, end_date)
    }
    
    # Calculate net cash flow
    net_cash_flow = sum(
        sum(flow['amount'] for flow in flows)
        for flows in cash_flows.values()
    )
    
    report = {
        'start_date': start_date,
        'end_date': end_date,
        'beginning_cash': sum(acc['balance'] for acc in cash_accounts) - net_cash_flow,
        'cash_flows': cash_flows,
        'net_cash_flow': net_cash_flow,
        'ending_cash': sum(acc['balance'] for acc in cash_accounts)
    }
    
    return report if format == 'json' else format_report(report, 'cash_flow')

def generate_trial_balance(start_date, end_date, format='json'):
    """Generate a trial balance for a date range"""
    trial_balance = execute_query(
        """
        SELECT 
            a.id, a.code, a.name, a.type,
            COALESCE(SUM(CASE WHEN t.debit_account = a.id THEN t.amount ELSE 0 END), 0) as debits,
            COALESCE(SUM(CASE WHEN t.credit_account = a.id THEN t.amount ELSE 0 END), 0) as credits
        FROM accounts a
        LEFT JOIN transactions t ON t.date BETWEEN ? AND ?
            AND (t.debit_account = a.id OR t.credit_account = a.id)
        WHERE a.is_active = 1
        GROUP BY a.id, a.code, a.name, a.type
        HAVING debits != 0 OR credits != 0
        ORDER BY a.type, a.code
        """,
        (start_date, end_date),
        fetchall=True
    )
    
    # Calculate totals
    total_debits = sum(account['debits'] for account in trial_balance)
    total_credits = sum(account['credits'] for account in trial_balance)
    
    report = {
        'start_date': start_date,
        'end_date': end_date,
        'accounts': trial_balance,
        'totals': {
            'debits': total_debits,
            'credits': total_credits,
            'difference': total_debits - total_credits
        }
    }
    
    return report if format == 'json' else format_report(report, 'trial_balance')

def generate_general_ledger(start_date, end_date, format='json'):
    """Generate a general ledger for a date range"""
    ledger = {}
    
    # Get all accounts
    accounts = execute_query(
        "SELECT id, code, name, type FROM accounts WHERE is_active = 1 ORDER BY code",
        fetchall=True
    )
    
    # Get transactions for each account
    for account in accounts:
        transactions = execute_query(
            """
            SELECT 
                t.id, t.date, t.reference, t.description,
                CASE WHEN t.debit_account = ? THEN t.amount ELSE 0 END as debit,
                CASE WHEN t.credit_account = ? THEN t.amount ELSE 0 END as credit,
                u.username as created_by
            FROM transactions t
            JOIN users u ON t.created_by = u.id
            WHERE (t.debit_account = ? OR t.credit_account = ?)
                AND t.date BETWEEN ? AND ?
            ORDER BY t.date, t.id
            """,
            (account['id'], account['id'], account['id'], account['id'], start_date, end_date),
            fetchall=True
        )
        
        if transactions:
            # Calculate running balance
            balance = 0
            for txn in transactions:
                balance += txn['debit'] - txn['credit']
                txn['balance'] = balance
            
            ledger[account['id']] = {
                'account': account,
                'beginning_balance': 0,  # Would need to calculate from previous periods
                'transactions': transactions,
                'ending_balance': balance
            }
    
    return {
        'start_date': start_date,
        'end_date': end_date,
        'accounts': ledger
    } if format == 'json' else format_report(ledger, 'general_ledger')

def get_cash_flows_by_activity(activity_type, start_date, end_date):
    """Helper function to get cash flows by activity type"""
    # This is a simplified example - in a real app, you'd need to properly classify accounts
    # into operating, investing, and financing activities
    if activity_type == 'operating':
        account_types = ['Revenue', 'Expense']
    elif activity_type == 'investing':
        account_types = ['Asset']  # Simplified
    else:  # financing
        account_types = ['Liability', 'Equity']
    
    placeholders = ','.join('?' * len(account_types))
    
    return execute_query(
        f"""
        SELECT 
            a.id, a.code, a.name, a.type,
            SUM(CASE WHEN t.debit_account = a.id THEN t.amount ELSE -t.amount END) as amount
        FROM accounts a
        JOIN transactions t ON (t.debit_account = a.id OR t.credit_account = a.id)
        WHERE a.type IN ({placeholders})
            AND t.date BETWEEN ? AND ?
        GROUP BY a.id, a.code, a.name, a.type
        HAVING amount != 0
        ORDER BY a.type, a.code
        """,
        (*account_types, start_date, end_date),
        fetchall=True
    )

def format_report(report, report_type):
    """Format report in the requested format (CSV, PDF, etc.)"""
    # This is a placeholder - in a real app, you'd implement proper formatting
    # for different output formats (CSV, PDF, Excel, etc.)
    return str(report)  # Default to string representation

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
