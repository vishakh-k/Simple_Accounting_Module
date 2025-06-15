from flask import Blueprint, jsonify, request
from models import create_user, get_user_by_username
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from functools import wraps

auth_bp = Blueprint('auth', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"error": "Token missing"}), 401
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=["HS256"])
            current_user = get_user_by_username(data['username'])
            if not current_user:
                raise ValueError("User not found")
        except Exception as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401
        return f(current_user, *args, **kwargs)
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    print("Registration data received:", data)  # Debug log
    
    required_fields = ['username', 'password', 'email']
    if not data or any(field not in data for field in required_fields):
        return jsonify({"error": "Missing required fields: username, password, email"}), 400
    
    try:
        print(f"Checking if user exists: {data['username']}")
        if get_user_by_username(data['username']):
            print("Username already exists")  # Debug log
            return jsonify({"error": "Username already exists"}), 400
            
        print("Hashing password")  # Debug log
        hashed_password = generate_password_hash(data['password'])
        print(f"Creating user: {data['username']}")  # Debug log
        user_id = create_user(data['username'], hashed_password, data['email'])
        print(f"User created with ID: {user_id}")  # Debug log
        
        return jsonify({
            "id": user_id, 
            "message": "User registered successfully",
            "username": data['username']
        }), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")  # Debug log
        return jsonify({"error": f"Failed to register user: {str(e)}"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    print("Login attempt with data:", data)  # Debug log
    
    if not data or 'username' not in data or 'password' not in data:
        print("Missing username or password in request")  # Debug log
        return jsonify({"error": "Username and password are required"}), 400
    
    try:
        username = data['username']
        password = data['password']
        print(f"Attempting login for user: {username}")
        
        # Get user from database
        user = get_user_by_username(username)
        if not user:
            print(f"User '{username}' not found in database")  # Debug log
            return jsonify({"error": "Invalid username or password"}), 401
            
        print(f"User found: {user['username']} (ID: {user['id']})")  # Debug log
        
        # Verify password
        if 'password_hash' not in user:
            print("ERROR: No password_hash in user data")  # Debug log
            return jsonify({"error": "Invalid username or password"}), 401
            
        print("Checking password hash...")  # Debug log
        password_matches = check_password_hash(user['password_hash'], password)
        print(f"Password check result: {password_matches}")  # Debug log
        
        if not password_matches:
            print("Password verification failed")  # Debug log
            return jsonify({"error": "Invalid username or password"}), 401
            
        # Generate JWT token
        token = jwt.encode(
            {
                'username': user['username'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            os.getenv('SECRET_KEY', 'your-secret-key-here'),
            algorithm="HS256"
        )
        
        # Prepare user data for response (excluding password_hash)
        user_data = {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'is_active': user.get('is_active', True)
        }
        
        print("Login successful")
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": user_data
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An error occurred during login"}), 500

@auth_bp.route('/protected', methods=['GET'])
@token_required
def protected(current_user):
    return jsonify({"message": f"Hello, {current_user['username']}!", "user": {
        'id': current_user['id'],
        'username': current_user['username'],
        'email': current_user['email']
    }}), 200