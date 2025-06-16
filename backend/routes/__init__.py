# Import blueprints
from .account import accounts_bp as account_bp
from .auth import auth_bp
from .report import reports_bp as report_bp
from .transaction import transactions_bp as transaction_bp
from .invoices import invoices_bp

# Export blueprints
__all__ = ['account_bp', 'auth_bp', 'report_bp', 'transaction_bp', 'invoices_bp']