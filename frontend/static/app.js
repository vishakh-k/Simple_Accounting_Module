// Simple test to verify script is loaded
console.log('app.js loaded successfully');

// State
let accounts = [];
let transactions = [];
let isLoading = false;

// DOM Elements
let transactionForm, transactionFormContainer, debitAccountSelect, creditAccountSelect;
let transactionCount, totalTransactions, statsCards, transactionsTable, accountSummary;
let newAccountBtn, accountModal, accountForm, closeAccountModal, cancelAccount;

// Initialize DOM elements
function initElements() {
    // Form elements
    transactionForm = document.getElementById('transactionForm');
    transactionFormContainer = document.getElementById('transactionFormContainer');
    debitAccountSelect = document.querySelector('select[name="debit_account"]');
    creditAccountSelect = document.querySelector('select[name="credit_account"]');
    transactionCount = document.getElementById('transactionCount');
    totalTransactions = document.getElementById('totalTransactions');
    statsCards = document.getElementById('statsCards');
    transactionsTable = document.getElementById('transactionsTable');
    accountSummary = document.getElementById('accountSummary');
    
    // Account modal elements
    newAccountBtn = document.getElementById('newAccountBtn');
    accountModal = document.getElementById('accountModal');
    accountForm = document.getElementById('accountForm');
    closeAccountModal = document.getElementById('closeAccountModal');
    cancelAccount = document.getElementById('cancelAccount');
}

// Show notification message
function showNotification(message, type = 'info', duration = 5000) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'fixed top-4 right-4 p-4 rounded shadow-lg text-white z-50 transition-all duration-300 transform translate-x-full';
        document.body.appendChild(notification);
    }
    
    // Set notification content and style based on type
    notification.innerHTML = `
        <div class="flex items-start">
            <div class="flex-1">
                <p class="font-medium">${type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info'}</p>
                <p class="text-sm">${message}</p>
            </div>
            <button onclick="this.closest('#notification').classList.add('translate-x-full')" 
                    class="ml-4 text-white hover:text-gray-200 focus:outline-none">
                ✕
            </button>
        </div>`;
    
    notification.className = `fixed top-4 right-4 p-4 rounded shadow-lg text-white z-50 transition-all duration-300 ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    } w-80`;
    
    // Show notification
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
    }, 10);
    
    // Hide notification after specified duration
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.remove('translate-x-0');
            notification.classList.add('translate-x-full');
        }, duration);
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Calculate percentage change
function calculatePercentageChange(current, previous) {
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous) * 100).toFixed(1);
}

// Load transactions from the server
async function loadTransactions() {
    try {
        showLoading(true);
        const response = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load transactions');
        }
        
        if (data.success && data.data) {
            transactions = data.data;
            updateTransactionsTable(transactions);
            return transactions;
        } else {
            throw new Error('Invalid response format from server');
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showNotification(error.message || 'Failed to load transactions', 'error');
        return [];
    } finally {
        showLoading(false);
    }
}

// Show/hide loading indicator
function showLoading(show) {
    isLoading = show;
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50';
    loadingDiv.innerHTML = '<div class="bg-white p-4 rounded-lg">Loading...</div>';
    
    if (show) {
        document.body.appendChild(loadingDiv);
    } else {
        const existing = document.getElementById('loading');
        if (existing) existing.remove();
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// Load accounts from backend
async function loadAccounts() {
    try {
        const response = await fetch('http://localhost:5000/api/accounts');
        if (!response.ok) throw new Error('Failed to fetch accounts');
        accounts = await response.json();
    } catch (error) {
        console.error('Error loading accounts:', error);
        showError('Failed to load accounts');
        throw error;
    }
}

// Load transactions from backend
async function loadTransactions() {
    try {
        const response = await fetch('http://localhost:5000/api/transactions');
        if (!response.ok) throw new Error('Failed to fetch transactions');
        transactions = await response.json();
        if (transactionCount && totalTransactions) {
            transactionCount.textContent = Math.min(10, transactions.length);
            totalTransactions.textContent = transactions.length;
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Failed to load transactions');
        throw error;
    }
}

// Load invoices from backend
async function loadInvoices() {
    try {
        const response = await fetch('http://localhost:5000/api/invoices');
        if (!response.ok) throw new Error('Failed to fetch invoices');
        invoices = await response.json();
    } catch (error) {
        console.error('Error loading invoices:', error);
        showError('Failed to load invoices');
        throw error;
    }
}

// Update stats cards
function updateStatsCards() {
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const income = accounts.filter(a => a.type === 'Revenue').reduce((sum, a) => sum + a.balance, 0);
    const expenses = accounts.filter(a => a.type === 'Expense').reduce((sum, a) => sum + a.balance, 0);
    const pending = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    
    const prevTotalBalance = accounts.reduce((sum, account) => sum + (account.previousBalance || account.balance * 0.9), 0);
    const prevIncome = accounts.filter(a => a.type === 'Revenue').reduce((sum, a) => sum + (a.previousBalance || a.balance * 0.9), 0);
    const prevExpenses = accounts.filter(a => a.type === 'Expense').reduce((sum, a) => sum + (a.previousBalance || a.balance * 0.9), 0);
    
    statsCards.innerHTML = `
        <div class="account-card bg-white rounded-xl shadow-md p-6 border-l-4 border-primary transition-all duration-300">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-gray-500">Total Balance</p>
                    <h3 class="text-3xl font-bold mt-2">${formatCurrency(totalBalance)}</h3>
                </div>
                <div class="bg-blue-100 p-3 rounded-full">
                    <i class="fas fa-dollar-sign text-primary text-xl"></i>
                </div>
            </div>
            <p class="text-green-500 mt-4"><i class="fas fa-arrow-${totalBalance >= prevTotalBalance ? 'up' : 'down'} mr-1"></i> ${calculatePercentageChange(totalBalance, prevTotalBalance)}% from last month</p>
        </div>
        <div class="account-card bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 transition-all duration-300">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-gray-500">Income</p>
                    <h3 class="text-3xl font-bold mt-2">${formatCurrency(income)}</h3>
                </div>
                <div class="bg-green-100 p-3 rounded-full">
                    <i class="fas fa-arrow-down text-green-500 text-xl"></i>
                </div>
            </div>
            <p class="text-green-500 mt-4"><i class="fas fa-arrow-${income >= prevIncome ? 'up' : 'down'} mr-1"></i> ${calculatePercentageChange(income, prevIncome)}% from last month</p>
        </div>
        <div class="account-card bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500 transition-all duration-300">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-gray-500">Expenses</p>
                    <h3 class="text-3xl font-bold mt-2">${formatCurrency(expenses)}</h3>
                </div>
                <div class="bg-red-100 p-3 rounded-full">
                    <i class="fas fa-arrow-up text-red-500 text-xl"></i>
                </div>
            </div>
            <p class="text-red-500 mt-4"><i class="fas fa-arrow-${expenses >= prevExpenses ? 'up' : 'down'} mr-1"></i> ${calculatePercentageChange(expenses, prevExpenses)}% from last month</p>
        </div>
        <div class="account-card bg-white rounded-xl shadow-md p-6 border-l-4 border-accent transition-all duration-300">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-gray-500">Pending</p>
                    <h3 class="text-3xl font-bold mt-2">${formatCurrency(pending)}</h3>
                </div>
                <div class="bg-blue-100 p-3 rounded-full">
                    <i class="fas fa-clock text-accent text-xl"></i>
                </div>
            </div>
            <p class="text-gray-500 mt-4"><i class="fas fa-circle text-xs mr-1"></i> ${transactions.filter(t => t.status === 'pending').length} transactions pending</p>
        </div>
    `;
}

// Update account summary
function updateAccountSummary() {
    const assetAccounts = accounts.filter(a => a.type === 'Asset');
    const liabilityAccounts = accounts.filter(a => a.type === 'Liability');
    const maxBalance = Math.max(...accounts.map(a => Math.abs(a.balance)), 1000);
    
    let html = '';
    assetAccounts.forEach(account => {
        const percentage = (Math.abs(account.balance) / maxBalance) * 100;
        html += `
            <div>
                <div class="flex justify-between mb-1">
                    <span>${account.name}</span>
                    <span>${formatCurrency(account.balance)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-green-500 h-2 rounded-full" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
            </div>
        `;
    });
    liabilityAccounts.forEach(account => {
        const percentage = (Math.abs(account.balance) / maxBalance) * 100;
        html += `
            <div>
                <div class="flex justify-between mb-1">
                    <span>${account.name}</span>
                    <span>${formatCurrency(account.balance)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-red-500 h-2 rounded-full" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
            </div>
        `;
    });
    if (accountSummary) accountSummary.innerHTML = html;
}

// Update accounts table
function updateAccountsTable() {
    if (!accountsTable) return;
    let html = '';
    accounts.forEach(account => {
        html += `
            <tr class="account-row border-b hover:bg-blue-50 cursor-pointer">
                <td class="py-4 px-4">${account.name}</td>
                <td class="py-4 px-4">${account.type}</td>
                <td class="py-4 px-4">${formatCurrency(account.balance)}</td>
                <td class="py-4 px-4">${formatDate(account.updated_at || new Date())}</td>
            </tr>
        `;
    });
    accountsTable.innerHTML = html;
}

// Update transactions table
function updateTransactionsTable() {
    if (!transactionsTable) return;
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    let html = '';
    sortedTransactions.forEach(transaction => {
        const isExpense = accounts.find(a => a.id === transaction.debit_account)?.type === 'Expense';
        html += `
            <tr class="transaction-row border-b hover:bg-blue-50 cursor-pointer">
                <td class="py-4 px-4">${formatDate(transaction.date)}</td>
                <td class="py-4 px-4 font-medium">${transaction.description}</td>
                <td class="py-4 px-4">${accounts.find(a => a.id === transaction.debit_account)?.name || 'Unknown'}</td>
                <td class="py-4 px-4">${accounts.find(a => a.id === transaction.credit_account)?.name || 'Unknown'}</td>
                <td class="py-4 px-4 ${isExpense ? 'text-red-500' : 'text-green-500'} font-medium">${isExpense ? '-' : ''}${formatCurrency(transaction.amount)}</td>
                <td class="py-4 px-4">
                    <span class="${transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} py-1 px-3 rounded-full text-sm">${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}</span>
                </td>
            </tr>
        `;
    });
    transactionsTable.innerHTML = html;
}

// Update invoices table
function updateInvoicesTable() {
    if (!invoicesTable) return;
    let html = '';
    invoices.forEach(invoice => {
        const statusColor = invoice.status === 'paid' ? 'bg-green-100 text-green-800' : invoice.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
        html += `
            <tr class="invoice-row border-b hover:bg-blue-50 cursor-pointer">
                <td class="py-4 px-4">${invoice.invoice_number}</td>
                <td class="py-4 px-4">${invoice.client}</td>
                <td class="py-4 px-4">${formatDate(invoice.date)}</td>
                <td class="py-4 px-4">${formatCurrency(invoice.amount)}</td>
                <td class="py-4 px-4">
                    <span class="${statusColor} py-1 px-3 rounded-full text-sm">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                </td>
            </tr>
        `;
    });
    invoicesTable.innerHTML = html;
}

// Populate account selects
function populateAccountSelects() {
    if (debitAccountSelect && creditAccountSelect) {
        debitAccountSelect.innerHTML = '<option value="">Select Account</option>';
        creditAccountSelect.innerHTML = '<option value="">Select Account</option>';
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.name} (${account.type})`;
            debitAccountSelect.appendChild(option.cloneNode(true));
            creditAccountSelect.appendChild(option);
        });
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Calculate percentage change
function calculatePercentageChange(current, previous) {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
}

// Validate transaction form
function validateTransactionForm(formData) {
    if (formData.debit_account === formData.credit_account) {
        showError('Debit and credit accounts cannot be the same');
        return false;
    }
    if (formData.amount <= 0) {
        showError('Amount must be greater than 0');
        return false;
    }
    if (!formData.date || !formData.description || !formData.debit_account || !formData.credit_account) {
        showError('All fields are required');
        return false;
    }
    return true;
}

// Validate account form
function validateAccountForm(formData) {
    if (!formData.name || !formData.type || formData.balance === undefined) {
        showError('All fields are required');
        return false;
    }
    return true;
}

// Validate invoice form
function validateInvoiceForm(formData) {
    if (!formData.invoice_number || !formData.client || !formData.date || !formData.amount || !formData.status) {
        showError('All fields are required');
        return false;
    }
    return true;
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
    console.log('Setting up event listeners...');
    
    // Initialize form with today's date
    if (transactionForm) {
        // Set initial date to today
        const today = new Date().toISOString().split('T')[0];
        const dateInput = transactionForm.querySelector('input[name="date"]');
        if (dateInput) dateInput.value = today;
    }
    
    // New Account Button and Modal
    const newAccountBtn = document.getElementById('newAccountBtn');
    const accountModal = document.getElementById('accountModal');
    const closeAccountModal = document.getElementById('closeAccountModal');
    const cancelAccount = document.getElementById('cancelAccount');
    
    console.log('Account elements:', { newAccountBtn, accountModal, closeAccountModal, cancelAccount });
    
    if (newAccountBtn && accountModal) {
        newAccountBtn.addEventListener('click', () => {
            console.log('New Account button clicked');
            accountModal.classList.remove('hidden');
        });
    }
    
    if (closeAccountModal && accountModal) {
        closeAccountModal.addEventListener('click', () => {
            accountModal.classList.add('hidden');
        });
    }
    
    if (cancelAccount && accountModal) {
        cancelAccount.addEventListener('click', () => {
            accountModal.classList.add('hidden');
        });
    }
    
    // Transaction form submit handler
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(transactionForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // Show loading state
                const submitBtn = transactionForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Saving...';
                
                // Send data to server
                const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(data)
                });
                
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
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }
    if (debitAccountSelect) {
        debitAccountSelect.addEventListener('change', () => {
            const selected = debitAccountSelect.value;
            Array.from(creditAccountSelect.options).forEach(option => {
                option.disabled = option.value === selected && option.value !== "";
            });
        });
    }
    if (creditAccountSelect) {
        creditAccountSelect.addEventListener('change', () => {
            const selected = creditAccountSelect.value;
            Array.from(debitAccountSelect.options).forEach(option => {
                option.disabled = option.value === selected && option.value !== "";
            });
        });
    }
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isLoading) return;
            const formData = {
                date: e.target.date.value,
                description: e.target.description.value,
                debit_account: e.target.debit_account.value,
                credit_account: e.target.credit_account.value,
                amount: parseFloat(e.target.amount.value),
                status: 'pending'
            };
            if (!validateTransactionForm(formData)) return;
            showLoading(true);
            try {
                const response = await fetch('http://localhost:5000/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (response.ok) {
                    await Promise.all([loadAccounts(), loadTransactions()]);
                    updateStatsCards();
                    updateTransactionsTable();
                    updateAccountSummary();
                    hideTransactionModal();
                    if (transactionForm) transactionForm.reset();
                    showError('Transaction added successfully!');
                } else {
                    const errorData = await response.json();
                    showError(`Error: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error adding transaction:', error);
                showError('Failed to add transaction');
            } finally {
                showLoading(false);
            }
        });
    }

    // Account modal
    if (newAccountBtn) {
        newAccountBtn.addEventListener('click', () => accountModal.classList.remove('hidden'));
    }
    if (closeAccountModal) {
        closeAccountModal.addEventListener('click', () => {
            accountModal.classList.add('hidden');
            accountForm.reset();
        });
    }
    if (cancelAccount) {
        cancelAccount.addEventListener('click', () => {
            accountModal.classList.add('hidden');
            accountForm.reset();
        });
    }
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isLoading) return;
            
            const formData = {
                code: e.target.code.value.trim(),
                name: e.target.name.value.trim(),
                type: e.target.type.value,
                description: e.target.description?.value?.trim() || '',
                balance: parseFloat(e.target.balance.value) || 0
            };
            
            console.log('Submitting account data:', formData);
            
            if (!validateAccountForm(formData)) return;
            
            showLoading(true);
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn?.innerHTML || 'Save';
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Saving...';
            }
            
            try {
                const response = await fetch('/api/accounts', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(formData)
                });
                
                console.log('Account creation response status:', response.status);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Account created successfully:', result);
                    
                    // Refresh the accounts list
                    await loadAccounts();
                    
                    // Update UI
                    updateAccountsTable();
                    updateStatsCards();
                    updateAccountSummary();
                    
                    // Close modal and reset form
                    accountModal.classList.add('hidden');
                    accountForm.reset();
                    
                    // Show success message
                    showNotification('Account created successfully!', 'success');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error || `Server responded with status ${response.status}`;
                    console.error('Error creating account:', errorMessage);
                    showNotification(`Failed to create account: ${errorMessage}`, 'error');
                }
            } catch (error) {
                console.error('Error adding account:', error);
                showNotification('Failed to create account. Please try again.', 'error');
            } finally {
                showLoading(false);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }

    // Invoice modal
    if (newInvoiceBtn) {
        newInvoiceBtn.addEventListener('click', () => invoiceModal.classList.remove('hidden'));
    }
    if (addInvoiceBtn) {
        addInvoiceBtn.addEventListener('click', () => invoiceModal.classList.remove('hidden'));
    }
    if (closeInvoiceModal) {
        closeInvoiceModal.addEventListener('click', () => {
            invoiceModal.classList.add('hidden');
            invoiceForm.reset();
        });
    }
    if (cancelInvoice) {
        cancelInvoice.addEventListener('click', () => {
            invoiceModal.classList.add('hidden');
            invoiceForm.reset();
        });
    }
    if (invoiceForm) {
        invoiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isLoading) return;
            const formData = {
                invoice_number: e.target.invoice_number.value,
                client: e.target.client.value,
                date: e.target.date.value,
                amount: parseFloat(e.target.amount.value),
                status: e.target.status.value
            };
            if (!validateInvoiceForm(formData)) return;
            showLoading(true);
            try {
                const response = await fetch('http://localhost:5000/api/invoices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (response.ok) {
                    await loadInvoices();
                    updateInvoicesTable();
                    invoiceModal.classList.add('hidden');
                    invoiceForm.reset();
                    showError('Invoice added successfully!');
                } else {
                    const errorData = await response.json();
                    showError(`Error: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error adding invoice:', error);
                showError('Failed to add invoice');
            } finally {
                showLoading(false);
            }
        });
    }

    // Report modal
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => reportModal.classList.remove('hidden'));
    }
    if (addReportBtn) {
        addReportBtn.addEventListener('click', () => reportModal.classList.remove('hidden'));
    }
    if (closeReportModal) {
        closeReportModal.addEventListener('click', () => {
            reportModal.classList.add('hidden');
            reportForm.reset();
        });
    }
    if (cancelReport) {
        cancelReport.addEventListener('click', () => {
            reportModal.classList.add('hidden');
            reportForm.reset();
        });
    }
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isLoading) return;
            const formData = {
                report_type: e.target.report_type.value,
                start_date: e.target.start_date.value,
                end_date: e.target.end_date.value
            };
            showLoading(true);
            try {
                const response = await fetch('http://localhost:5000/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (response.ok) {
                    reportModal.classList.add('hidden');
                    reportForm.reset();
                    showError('Report generated successfully!');
                    // In a real app, display or download the report
                } else {
                    const errorData = await response.json();
                    showError(`Error: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error generating report:', error);
                showError('Failed to generate report');
            } finally {
                showLoading(false);
            }
        });
    }
}

console.log('app.js loaded');

// Main initialization function
async function init() {
    console.log('Initializing application...');
    showLoading(true);
    
    try {
        // Load initial data
        await Promise.all([
            loadAccounts(),
            loadTransactions()
        ]);
        
        // Update UI
        updateStatsCards();
        updateAccountSummary();
        updateTransactionsTable();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Failed to initialize: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Main initialization function
async function init() {
    console.log('Initializing application...');
    showLoading(true);
    
    try {
        // Initialize DOM elements
        initElements();
        
        // Load initial data
        await Promise.all([
            loadAccounts(),
            loadTransactions()
        ]);
        
        // Set up event listeners
        setupEventListeners();
        
        // Update UI
        updateStatsCards();
        updateAccountSummary();
        updateTransactionsTable();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Failed to initialize: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    
    // Initialize the application
    init().catch(error => {
        console.error('Unhandled error during initialization:', error);
        showNotification('Failed to initialize application', 'error');
    });
});