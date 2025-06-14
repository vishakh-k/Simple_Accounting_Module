from flask import Blueprint, jsonify, request
import datetime
from models import generate_report
from routes.auth import token_required

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/reports', methods=['POST'])
@token_required
def generate_report_route(current_user):
    data = request.json
    required_fields = ['report_type', 'start_date', 'end_date']
    if not data or any(field not in data for field in required_fields):
        return jsonify({"error": "Missing required fields: report_type, start_date, end_date"}), 400
    
    try:
        # Validate date format
        datetime.datetime.strptime(data['start_date'], '%Y-%m-%d')
        datetime.datetime.strptime(data['end_date'], '%Y-%m-%d')
        
        # Validate report type
        valid_report_types = ['balance_sheet', 'income_statement', 'cash_flow']
        if data['report_type'] not in valid_report_types:
            return jsonify({"error": f"Invalid report type. Must be one of {valid_report_types}"}), 400
        
        report_id = generate_report(
            report_type=data['report_type'],
            start_date=data['start_date'],
            end_date=data['end_date']
        )
        return jsonify({"id": report_id, "message": "Report generated successfully"}), 201
    except ValueError as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to generate report: {str(e)}"}), 500

@reports_bp.route('/reports/generate', methods=['POST'])
def generate_report():
    try:
        data = request.get_json()
        report_type = data.get('type')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not all([report_type, start_date, end_date]):
            return jsonify({'error': 'Missing required parameters'}), 400
            
        if report_type == 'balance_sheet':
            return generate_balance_sheet(start_date, end_date)
        elif report_type == 'income_statement':
            return generate_income_statement(start_date, end_date)
        else:
            return jsonify({'error': 'Invalid report type'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_balance_sheet(start_date, end_date):
    query = """
        SELECT 
            a.type,
            a.name,
            COALESCE(SUM(CASE 
                WHEN a.type IN ('ASSET', 'EXPENSE') 
                THEN te.debit - te.credit
                ELSE te.credit - te.debit
            END), 0) as balance
        FROM accounts a
        LEFT JOIN transaction_entries te ON a.id = te.account_id
        LEFT JOIN transactions t ON te.transaction_id = t.id
        WHERE t.date BETWEEN ? AND ?
        GROUP BY a.id, a.name, a.type
        ORDER BY a.type, a.name
    """
    
    results = execute_query(query, (start_date, end_date), fetchall=True)
    return jsonify(results)
