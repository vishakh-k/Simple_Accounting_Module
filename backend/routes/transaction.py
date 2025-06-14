from flask import Blueprint, jsonify, request
from datetime import datetime
from models import get_transactions, create_transaction, get_account, get_db_connection

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/transactions', methods=['GET'])
def get_transactions_route():
    try:
        transactions = get_transactions()
        return jsonify([{
            'id': t['id'],
            'date': t['date'],
            'description': t['description'],
            'debit_account': t['debit_account'],
            'credit_account': t['credit_account'],
            'amount': t['amount'],
            'status': t['status'],
            'debit_account_name': t['debit_account_name'],
            'credit_account_name': t['credit_account_name']
        } for t in transactions]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@transactions_bp.route('/transactions', methods=['POST'])
def create_transaction_route():
    data = request.json
    required_fields = ['date', 'description', 'debit_account', 'credit_account', 'amount', 'status']
    if not data or any(field not in data for field in required_fields):
        return jsonify({"error": "Missing required fields: date, description, debit_account, credit_account, amount, status"}), 400
    try:
        datetime.strptime(data['date'], '%Y-%m-%d')
        amount = float(data['amount'])
        transaction_id = create_transaction(
            date=data['date'],
            description=data['description'],
            debit_account=data['debit_account'],
            credit_account=data['credit_account'],
            amount=amount,
            status=data['status']
        )
        return jsonify({"id": transaction_id, "message": "Transaction created successfully"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create transaction: {str(e)}"}), 500

@transactions_bp.route('/transactions', methods=['POST'])
def create_transaction():
    try:
        data = request.get_json()
        
        if not data.get('entries') or len(data['entries']) < 2:
            return jsonify({'error': 'Transaction must have at least 2 entries'}), 400
            
        # Start transaction
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Insert main transaction
            cursor.execute("""
                INSERT INTO transactions (date, reference, description)
                VALUES (?, ?, ?)
            """, (
                data.get('date', datetime.now().strftime('%Y-%m-%d')),
                data.get('reference', ''),
                data.get('description', '')
            ))
            
            transaction_id = cursor.lastrowid
            
            # Insert entries
            for entry in data['entries']:
                cursor.execute("""
                    INSERT INTO transaction_entries 
                    (transaction_id, account_id, debit, credit)
                    VALUES (?, ?, ?, ?)
                """, (
                    transaction_id,
                    entry['account_id'],
                    entry.get('debit', 0),
                    entry.get('credit', 0)
                ))
                
            conn.commit()
            return jsonify({'id': transaction_id, 'message': 'Transaction created successfully'}), 201
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
