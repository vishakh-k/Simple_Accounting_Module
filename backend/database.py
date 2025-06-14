
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_PATH = os.getenv('DATABASE_PATH', 'accounting.db')

def init_db():
    """Initialize the database with schema"""
    try:
        if not os.path.exists(DATABASE_PATH):
            conn = get_db_connection()
            with open('schema.sql') as f:
                conn.executescript(f.read())
            conn.commit()
            conn.close()
    except Exception as e:
        raise Exception(f"Failed to initialize database: {str(e)}")

def get_db_connection():
    """Get a database connection"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        raise Exception(f"Failed to connect to database: {str(e)}")

def execute_query(query, args=(), fetchone=False, fetchall=False, commit=False):
    """Execute a SQL query with options"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(query, args)
        if commit:
            conn.commit()
            last_id = cur.lastrowid
            cur.close()
            conn.close()
            return last_id
        if fetchone:
            result = cur.fetchone()
            cur.close()
            conn.close()
            return dict(result) if result else None
        if fetchall:
            result = cur.fetchall()
            cur.close()
            conn.close()
            return [dict(row) for row in result]
        cur.close()
        conn.close()
        return None
    except sqlite3.Error as e:
        conn.rollback()
        raise Exception(f"Database query failed: {str(e)}")
    finally:
        if not conn.closed:
            conn.close()