from flask import Blueprint, jsonify, request
import datetime
from models import get_invoices, create_invoice
from routes.auth import token_required

invoices_bp = Blueprint('invoices', __name__)

@invoices_bp.route('/invoices', methods=['GET'])
@token_required
def get_invoices_route(current_user):
    try:
        invoices = get_invoices()
        return jsonify([{
            'id': invoice['id'],
            'invoice_number': invoice['invoice_number'],
            'client': invoice['client'],
            'date': invoice['date'],
            'amount': invoice['amount'],
            'status': invoice['status']
        } for invoice in invoices]), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch invoices: {str(e)}"}), 500

@invoices_bp.route('/invoices', methods=['POST'])
@token_required
def create_invoice_route(current_user):
    data = request.json
    required_fields = ['invoice_number', 'client', 'date', 'amount', 'status']
    if not data or any(field not in data for field in required_fields):
        return jsonify({"error": "Missing required fields: invoice_number, client, date, amount, status"}), 400
    
    try:
        # Validate date format
        datetime.datetime.strptime(data['date'], '%Y-%m-%d')
        
        # Validate amount
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
        
        # Validate status
        valid_statuses = ['pending', 'paid', 'overdue']
        if data['status'] not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of {valid_statuses}"}), 400
        
        # Create invoice
        invoice_id = create_invoice(
            invoice_number=data['invoice_number'],
            client=data['client'],
            date=data['date'],
            amount=amount,
            status=data['status']
        )
        return jsonify({"id": invoice_id, "message": "Invoice created successfully"}), 201
    except ValueError as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            return jsonify({"error": "Invoice number already exists"}), 400
        return jsonify({"error": f"Failed to create invoice: {str(e)}"}), 500
