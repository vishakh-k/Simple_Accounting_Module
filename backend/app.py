import sqlite3
import os
from dotenv import load_dotenv

from flask_cors import CORS
from flask import Flask, jsonify

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes


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
    conn = None
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        # Enable foreign key constraints
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    except sqlite3.Error as e:
        print(f"Database connection error: {str(e)}")
        if conn:
            try:
                conn.close()
            except:
                pass
        raise Exception(f"Failed to connect to database: {str(e)}")
    except Exception as e:
        print(f"Unexpected error in get_db_connection: {str(e)}")
        if conn:
            try:
                conn.close()
            except:
                pass
        raise

def execute_query(query, args=(), fetchone=False, fetchall=False, commit=False):
    """Execute a SQL query with options"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Print the query and args for debugging
        print(f"Executing query: {query}")
        print(f"With args: {args}")
        
        cursor.execute(query, args)
        
        if commit:
            conn.commit()
            last_id = cursor.lastrowid
            cursor.close()
            conn.close()
            return last_id
            
        if fetchone:
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            if result is None:
                return None
            # Convert sqlite3.Row to dict
            return dict(zip([d[0] for d in cursor.description], result))
            
        if fetchall:
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            # Convert sqlite3.Row objects to dicts
            return [dict(zip([d[0] for d in cursor.description], row)) for row in results]
            
        cursor.close()
        conn.close()
        return None
        
    except sqlite3.Error as e:
        print(f"Database error: {str(e)}")
        if conn:
            conn.rollback()
        raise Exception(f"Database query failed: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        # Clean up resources
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Import and register blueprints
from routes.auth import auth_bp
from routes.account import accounts_bp  # Changed from account_bp to accounts_bp
from routes.report import reports_bp  # Changed from report_bp to reports_bp
from routes.transaction import transactions_bp

app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(accounts_bp, url_prefix='/api')
app.register_blueprint(reports_bp, url_prefix='/api')  # Changed from report_bp to reports_bp
app.register_blueprint(transactions_bp, url_prefix='/api')

@app.errorhandler(Exception)
def handle_error(error):
    return jsonify({
        'error': str(error),
        'status': getattr(error, 'code', 500)
    }), getattr(error, 'code', 500)

if __name__ == '__main__':
    # Initialize the database
    init_db()
    # Run the Flask development server
    app.run(debug=True, port=5000)
