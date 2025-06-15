// Form elements
const transactionForm = document.getElementById('transactionForm');
const debitAccountSelect = document.querySelector('select[name="debit_account"]');
const creditAccountSelect = document.querySelector('select[name="credit_account"]');
const transactionsTable = document.getElementById('transactionsTable');

// State
let accounts = [];
let transactions = [];

// Show notification message
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded shadow-lg text-white z-50 ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Create default accounts if none exist
async function createDefaultAccounts() {
    console.log('createDefaultAccounts called');
    const defaultAccounts = [
        { name: 'Cash', code: '1001', type: 'Asset', balance: 0 },
        { name: 'Bank Account', code: '1002', type: 'Asset', balance: 0 },
        { name: 'Accounts Receivable', code: '1100', type: 'Asset', balance: 0 },
        { name: 'Office Supplies', code: '6001', type: 'Expense', balance: 0 },
        { name: 'Rent Expense', code: '6002', type: 'Expense', balance: 0 },
        { name: 'Service Revenue', code: '4001', type: 'Revenue', balance: 0 },
        { name: 'Sales Revenue', code: '4002', type: 'Revenue', balance: 0 }
    ];

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            showNotification('Please log in first', 'error');
            return false;
        }

        console.log('Checking for existing accounts...');
        const checkResponse = await fetch('/api/accounts', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('Accounts API response status:', checkResponse.status);
        
        if (!checkResponse.ok) {
            const errorText = await checkResponse.text();
            console.error('Failed to fetch accounts:', checkResponse.status, errorText);
            showNotification('Failed to load accounts', 'error');
            return false;
        }
        
        const existingAccounts = await checkResponse.json();
        console.log('Existing accounts:', existingAccounts);
        
        if (existingAccounts.length === 0) {
            console.log('No accounts found, creating default accounts...');
            const results = [];
            
            for (const account of defaultAccounts) {
                try {
                    console.log('Creating account:', account.name);
                    const createResponse = await fetch('/api/accounts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(account)
                    });
                    
                    const result = await createResponse.json();
                    if (!createResponse.ok) {
                        console.error('Failed to create account:', account.name, result);
                        results.push({ success: false, account: account.name, error: result });
                    } else {
                        console.log('Created account:', account.name);
                        results.push({ success: true, account: account.name });
                    }
                } catch (error) {
                    console.error(`Error creating account ${account.name}:`, error);
                    results.push({ success: false, account: account.name, error: error.message });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            if (successCount > 0) {
                showNotification(`Created ${successCount} default accounts successfully!`, 'success');
                return true;
            } else {
                showNotification('Failed to create default accounts', 'error');
                return false;
            }
        } else {
            console.log('Accounts already exist, skipping creation');
            return true;
        }
    } catch (error) {
        console.error('Error in createDefaultAccounts:', error);
        showNotification('Error setting up accounts', 'error');
        return false;
    }
}

// Load accounts from the server
async function loadAccounts() {
    console.log('loadAccounts called');
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            showNotification('Please log in first', 'error');
            return [];
        }

        // First ensure we have default accounts
        const defaultAccountsCreated = await createDefaultAccounts();
        if (!defaultAccountsCreated) {
            console.error('Failed to ensure default accounts exist');
            return [];
        }
        
        // Then load all accounts
        console.log('Loading accounts...');
        const response = await fetch('/api/accounts', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('Load accounts response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to load accounts:', response.status, errorText);
            throw new Error(`Failed to load accounts: ${response.status} ${errorText}`);
        }
        
        accounts = await response.json();
        console.log('Loaded accounts:', accounts);
        
        populateAccountSelects();
        return accounts;
    } catch (error) {
        console.error('Error loading accounts:', error);
        showNotification(error.message || 'Failed to load accounts', 'error');
        return [];
    }
}

// Load transactions from the server
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            transactions = await response.json();
            updateTransactionsTable(transactions);
            return transactions;
        } else {
            throw new Error('Failed to load transactions');
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showNotification('Failed to load transactions', 'error');
        return [];
    }
}

// Update transactions table
function updateTransactionsTable(transactions = []) {
    if (!transactionsTable) return;
    
    const tbody = transactionsTable.querySelector('tbody') || document.createElement('tbody');
    tbody.innerHTML = '';
    
    transactions.slice(0, 10).forEach(transaction => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-3 px-4">${transaction.date || ''}</td>
            <td class="py-3 px-4">${transaction.reference || 'N/A'}</td>
            <td class="py-3 px-4">${transaction.description || 'No description'}</td>
            <td class="py-3 px-4 text-right">${formatCurrency(transaction.amount || 0)}</td>
            <td class="py-3 px-4">${transaction.debit_account_name || 'N/A'}</td>
            <td class="py-3 px-4">${transaction.credit_account_name || 'N/A'}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 text-xs rounded-full ${
                    transaction.status === 'posted' ? 'bg-green-100 text-green-800' : 
                    'bg-yellow-100 text-yellow-800'
                }">
                    ${transaction.status || 'pending'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (!transactionsTable.querySelector('tbody')) {
        transactionsTable.appendChild(tbody);
    }
}

// Populate account selects
function populateAccountSelects() {
    console.log('populateAccountSelects called');
    console.log('Available accounts:', accounts);
    
    if (!debitAccountSelect || !creditAccountSelect) {
        console.error('Account select elements not found');
        return;
    }
    
    // Clear existing options except the first one
    while (debitAccountSelect.options.length > 1) debitAccountSelect.remove(1);
    while (creditAccountSelect.options.length > 1) creditAccountSelect.remove(1);
    
    if (!accounts || accounts.length === 0) {
        console.warn('No accounts available to populate');
        return;
    }
    
    // Add account options
    accounts.forEach(account => {
        if (!account) return;
        
        const optionText = `${account.name} (${account.code})`;
        
        // For Debit (Asset/Expense accounts)
        if (account.type !== 'Revenue') {
            const option = new Option(optionText, account.id);
            console.log('Adding to debit select:', optionText, account.id);
            debitAccountSelect.add(option);
        }
        
        // For Credit (Asset/Revenue accounts)
        if (account.type !== 'Expense') {
            const option = new Option(optionText, account.id);
            console.log('Adding to credit select:', optionText, account.id);
            creditAccountSelect.add(option);
        }
    });
    
    console.log('Debit options count:', debitAccountSelect.options.length);
    console.log('Credit options count:', creditAccountSelect.options.length);
}

// Reset the form to its initial state
function resetTransactionForm() {
    if (transactionForm) {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const dateInput = transactionForm.querySelector('input[name="date"]');
        if (dateInput) dateInput.value = today;
        
        // Reset other fields
        transactionForm.reset();
        
        // Focus on the first input
        const firstInput = transactionForm.querySelector('input, select');
        if (firstInput) firstInput.focus();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(transactionForm);
            const data = Object.fromEntries(formData.entries());
            
            // Basic validation
            if (!data.date || !data.description || !data.amount || !data.debit_account || !data.credit_account) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            if (data.debit_account === data.credit_account) {
                showNotification('Debit and credit accounts must be different', 'error');
                return;
            }
            
            try {
                // Show loading state
                const submitBtn = transactionForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Saving...';
                
                // Prepare transaction data
                const transactionData = {
                    date: data.date,
                    description: data.description,
                    reference: data.reference || '',
                    debit_account: data.debit_account,
                    credit_account: data.credit_account,
                    amount: parseFloat(data.amount),
                    status: 'posted'  // Default status
                };

                console.log('Sending transaction data:', transactionData);

                // Send data to server
                const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(transactionData)
                });
                
                const responseData = await response.json();
                console.log('Server response:', responseData);
                
                if (!response.ok) {
                    throw new Error(responseData.error || 'Failed to save transaction');
                }
                
                if (response.ok) {
                    // Refresh transactions list
                    await loadTransactions();
                    // Reset form
                    resetTransactionForm();
                    // Show success message
                    showNotification('Transaction added successfully!', 'success');
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to save transaction');
                }
            } catch (error) {
                console.error('Error saving transaction:', error);
                showNotification(error.message || 'Failed to save transaction', 'error');
            } finally {
                // Reset button state
                const submitBtn = transactionForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Save Transaction';
                }
            }
        });
    }
}

// Initialize the application
async function init() {
    console.log('init function called');
    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log('Auth token exists:', !!token);
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        console.log('Starting application initialization');
        // Load data
        await Promise.all([
            loadAccounts(),
            loadTransactions()
        ]);
        
        console.log('Setting up event listeners');
        // Set up event listeners
        setupEventListeners();
        
        // Set initial focus
        const firstInput = document.querySelector('input, select');
        if (firstInput) {
            console.log('Setting focus to first input');
            firstInput.focus();
        }
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        showNotification('Failed to initialize application: ' + error.message, 'error');
    }
}

console.log('Script loaded, checking document ready state:', document.readyState);

// Start the application when the DOM is fully loaded
if (document.readyState === 'loading') {
    console.log('Document still loading, adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded event fired');
        init();
    });
} else {
    console.log('Document already loaded, initializing immediately');
    init();
}
