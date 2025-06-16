from functools import wraps
from flask import jsonify
import sqlite3

def handle_api_error(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': 'Validation Error',
                'message': str(e),
                'status': 400
            }), 400
        except sqlite3.Error as e:
            return jsonify({
                'success': False,
                'error': 'Database Error',
                'message': 'An error occurred while accessing the database',
                'details': str(e),
                'status': 500
            }), 500
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Internal Server Error',
                'message': 'An unexpected error occurred',
                'details': str(e),
                'status': 500
            }), 500
    return decorated_function
