from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
from models import get_transactions, create_transaction, get_account, get_db_connection
from utils.error_handlers import handle_api_error

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/transactions', methods=['GET'])
@handle_api_error
def get_transactions_route():
    transactions = get_transactions()
    return jsonify({
        'success': True,
        'data': [{
            'id': t['id'],
            'date': t['date'],
            'description': t['description'],
            'debit_account': t['debit_account'],
            'credit_account': t['credit_account'],
            'amount': float(t['amount']),
            'status': t['status'],
            'debit_account_name': t.get('debit_account_name', ''),
            'credit_account_name': t.get('credit_account_name', '')
        } for t in transactions],
        'count': len(transactions)
    })

@transactions_bp.route('/transactions', methods=['POST'])
@handle_api_error
def create_transaction_route():
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': 'Invalid Request',
            'message': 'No data provided',
            'status': 400
        }), 400
        
    # Check if this is a double-entry transaction
    if 'entries' in data:
        return create_double_entry_transaction(data)
        
    # Handle single transaction format
    required_fields = ['date', 'description', 'debit_account', 'credit_account', 'amount']
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    
    if missing_fields:
        return jsonify({
            'success': False,
            'error': 'Validation Error',
            'message': f'Missing required fields: {', '.join(missing_fields)}',
            'status': 400
        }), 400
        
    try:
        # Set default status to 'posted' if not provided
        status = data.get('status', 'posted')
        
        # Convert date to proper format if needed
        date = data['date']
        if not isinstance(date, str):
            date = date.strftime('%Y-%m-%d')
        else:
            datetime.strptime(date, '%Y-%m-%d')  # Validate date format
            
        amount = float(data['amount'])
        
        # Create the transaction
        transaction_id = create_transaction(
            date=date,
            description=data['description'],
            debit_account=data['debit_account'],
            credit_account=data['credit_account'],
            amount=amount,
            status=status
        )
        return jsonify({
            "id": transaction_id, 
            "message": "Transaction created successfully"
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except Exception as e:
        print(f"Error creating transaction: {str(e)}")  # Debug log
        return jsonify({"error": f"Failed to create transaction: {str(e)}"}), 500

def create_double_entry_transaction(data):
    try:
        if not data.get('entries') or len(data['entries']) < 2:
            return jsonify({'error': 'Transaction must have at least 2 entries'}), 400
            
        # Start transaction
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Insert main transaction
            cursor.execute("""
                INSERT INTO transactions (date, reference, description, status)
                VALUES (?, ?, ?, ?)
            """, (
                data.get('date', datetime.now().strftime('%Y-%m-%d')),
                data.get('reference', ''),
                data.get('description', ''),
                data.get('status', 'posted')
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
        print(f"Error in create_double_entry_transaction: {str(e)}")  # Debug log
        return jsonify({'error': str(e)}), 500

# This route is no longer needed as we've combined the functionality
# into create_transaction_route
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
