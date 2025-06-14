from flask import Blueprint, jsonify, request
from models import get_accounts, create_account, get_account
import datetime

accounts_bp = Blueprint('accounts', __name__)

@accounts_bp.route('/accounts', methods=['GET'])
def get_accounts_route():
    try:
        accounts = get_accounts()
        return jsonify(accounts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@accounts_bp.route('/accounts', methods=['POST'])
def create_account_route():
    data = request.json
    required_fields = ['code', 'name', 'type']
    if not data or any(field not in data for field in required_fields):
        return jsonify({"error": "Missing required fields: code, name, type"}), 400
    try:
        account_id = create_account(
            code=data['code'],
            name=data['name'],
            account_type=data['type'],
            description=data.get('description', '')
        )
        return jsonify({"id": account_id, "message": "Account created successfully"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create account: {str(e)}"}), 500
