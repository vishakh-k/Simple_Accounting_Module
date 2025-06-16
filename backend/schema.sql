-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')) NOT NULL,
    balance REAL DEFAULT 0.00,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    previous_balance REAL DEFAULT 0.00,
    UNIQUE(code, name)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    description TEXT,
    debit_account INTEGER NOT NULL,
    credit_account INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
    FOREIGN KEY (debit_account) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (credit_account) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    client TEXT NOT NULL,
    date DATE NOT NULL,
    amount REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'paid', 'overdue')) NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT CHECK(report_type IN ('balance_sheet', 'income_statement', 'cash_flow')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

