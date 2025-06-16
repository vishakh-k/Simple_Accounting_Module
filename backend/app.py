import sqlite3
import os
import sys
from dotenv import load_dotenv
from flask_cors import CORS
from flask import Flask, jsonify, send_from_directory, render_template, g, request
import os
import traceback

# Get the absolute path to the frontend directory
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))

app = Flask(__name__, 
            static_folder=os.path.join(frontend_path, 'static'),
            template_folder=frontend_path)
CORS(app)  # This will enable CORS for all routes

# Load environment variables
load_dotenv()

# Configuration
app.config.update(
    DATABASE=os.getenv('DATABASE_PATH', os.path.join(os.path.dirname(__file__), 'accounting.db')),
    SECRET_KEY=os.getenv('SECRET_KEY', 'dev')
)

def get_db():
    """Get a database connection with request context"""
    if 'db' not in g:
        try:
            g.db = sqlite3.connect(app.config['DATABASE'])
            g.db.row_factory = sqlite3.Row
            # Enable foreign key constraints
            g.db.execute('PRAGMA foreign_keys = ON')
        except sqlite3.Error as e:
            app.logger.error(f"Database connection error: {str(e)}")
            raise Exception(f"Failed to connect to database: {str(e)}")
    return g.db

def close_db(e=None):
    """Close the database connection"""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize the database with schema"""
    try:
        with app.app_context():
            db = get_db()
            schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
            with open(schema_path, 'r', encoding='utf-8') as f:
                db.executescript(f.read())
            db.commit()
            app.logger.info("Database initialized successfully")
    except Exception as e:
        app.logger.error(f"Failed to initialize database: {str(e)}")
        raise Exception(f"Failed to initialize database: {str(e)}")

def execute_query(query, args=(), fetchone=False, fetchall=False, commit=False):
    """Execute a SQL query with options"""
    db = get_db()
    cursor = None
    try:
        cursor = db.cursor()
        cursor.execute(query, args)
        
        if commit:
            db.commit()
            return cursor.lastrowid if 'INSERT' in query.upper() else cursor.rowcount
        
        if fetchone:
            result = cursor.fetchone()
            if result is None:
                return None
            return dict(zip([d[0] for d in cursor.description], result))
        elif fetchall:
            results = cursor.fetchall()
            return [dict(zip([d[0] for d in cursor.description], row)) for row in results]
            
        return None
    except sqlite3.Error as e:
        app.logger.error(f"Database error: {str(e)}")
        if db:
            db.rollback()
        raise Exception(f"Database error: {str(e)}")
    finally:
        if cursor:
            cursor.close()

# Import and register blueprints
from routes import auth_bp, account_bp, report_bp, transaction_bp, invoices_bp

# Register blueprints with URL prefixes
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(account_bp, url_prefix='/api/accounts')
app.register_blueprint(transaction_bp, url_prefix='/api/transactions')
app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
app.register_blueprint(report_bp, url_prefix='/api/reports')

@app.errorhandler(Exception)
def handle_error(error):
    if request.path.startswith('/api/'):
        response = jsonify({
            'success': False,
            'error': getattr(error, 'name', 'Internal Server Error'),
            'message': str(getattr(error, 'description', str(error))),
            'status': getattr(error, 'code', 500)
        })
        response.status_code = getattr(error, 'code', 500)
        return response
    return error

# Serve React Frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(frontend_path, 'static', path)):
        return send_from_directory(os.path.join(frontend_path, 'static'), path)
    elif path != "" and os.path.exists(os.path.join(frontend_path, 'static', path + '.html')):
        return send_from_directory(os.path.join(frontend_path, 'static'), path + '.html')
    elif path == "" or path == "/":
        return send_from_directory(frontend_path, 'static/index.html')
    else:
        return send_from_directory(frontend_path, 'static/index.html')

if __name__ == '__main__':
    # Initialize the database
    init_db()
    # Run the Flask development server
    app.run(debug=True, port=5000)
