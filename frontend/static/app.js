const newTransactionBtn = document.getElementById('newTransactionBtn');
const addTransactionBtn = document.getElementById('addTransactionBtn');
const transactionModal = document.getElementById('transactionModal');
const closeModal = document.getElementById('closeModal');
const cancelTransaction = document.getElementById('cancelTransaction');
const transactionForm = document.getElementById('transactionForm');
const debitAccountSelect = document.querySelector('select[name="debit_account"]');
const creditAccountSelect = document.querySelector('select[name="credit_account"]');
const transactionCount = document.getElementById('transactionCount');
const totalTransactions = document.getElementById('totalTransactions');
const statsCards = document.getElementById('statsCards');
const transactionsTable = document.getElementById('transactionsTable');
const accountSummary = document.getElementById('accountSummary');
const newAccountBtn = document.getElementById('newAccountBtn');
const accountModal = document.getElementById('accountModal');
const closeAccountModal = document.getElementById('closeAccountModal');
const cancelAccount = document.getElementById('cancelAccount');
const accountForm = document.getElementById('accountForm');
const accountsTable = document.getElementById('accountsTable');
const newInvoiceBtn = document.getElementById('newInvoiceBtn');
const addInvoiceBtn = document.getElementById('addInvoiceBtn');
const invoiceModal = document.getElementById('invoiceModal');
const closeInvoiceModal = document.getElementById('closeInvoiceModal');
const cancelInvoice = document.getElementById('cancelInvoice');
const invoiceForm = document.getElementById('invoiceForm');
const invoicesTable = document.getElementById('invoicesTable');
const generateReportBtn = document.getElementById('generateReportBtn');
const addReportBtn = document.getElementById('addReportBtn');
const reportModal = document.getElementById('reportModal');
const closeReportModal = document.getElementById('closeReportModal');
const cancelReport = document.getElementById('cancelReport');
const reportForm = document.getElementById('reportForm');

// State
let accounts = [];
let transactions = [];
let invoices = [];
let isLoading = false;

// Initialize the application
async function initApp() {
    console.log('Initializing application...');
    showLoading(true);
    try {
        console.log('Loading data...');
        await Promise.all([loadAccounts(), loadTransactions(), loadInvoices()]);
        
        const currentPath = window.location.pathname;
        console.log('Current path:', currentPath);
        
        if (currentPath.includes('index.html') || currentPath === '/') {
            console.log('Updating dashboard...');
            updateStatsCards();
            updateAccountSummary();
            updateTransactionsTable();
        } else if (currentPath.includes('accounts.html')) {
            console.log('Updating accounts page...');
            updateAccountsTable();
        } else if (currentPath.includes('transactions.html')) {
            console.log('Updating transactions page...');
            updateTransactionsTable();
        } else if (currentPath.includes('invoices.html')) {
            console.log('Updating invoices page...');
            updateInvoicesTable();
        }
        
        console.log('Populating account selects...');
        populateAccountSelects();
        
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        // Debug: Log button states
        console.log('Button states:', {
            newAccountBtn: !!newAccountBtn,
            newTransactionBtn: !!newTransactionBtn,
            newInvoiceBtn: !!newInvoiceBtn
        });
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application: ' + error.message);
    } finally {
        showLoading(false);
        console.log('Initialization complete');
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

// Setup event listeners
function setupEventListeners() {
    // Transaction modal
    if (newTransactionBtn) {
        newTransactionBtn.addEventListener('click', () => transactionModal.classList.remove('hidden'));
    }
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', () => transactionModal.classList.remove('hidden'));
    }
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            transactionModal.classList.add('hidden');
            transactionForm.reset();
        });
    }
    if (cancelTransaction) {
        cancelTransaction.addEventListener('click', () => {
            transactionModal.classList.add('hidden');
            transactionForm.reset();
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
                    transactionModal.classList.add('hidden');
                    transactionForm.reset();
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
                name: e.target.name.value,
                type: e.target.type.value,
                balance: parseFloat(e.target.balance.value)
            };
            if (!validateAccountForm(formData)) return;
            showLoading(true);
            try {
                const response = await fetch('http://localhost:5000/api/accounts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (response.ok) {
                    await loadAccounts();
                    updateAccountsTable();
                    updateStatsCards();
                    updateAccountSummary();
                    accountModal.classList.add('hidden');
                    accountForm.reset();
                    showError('Account added successfully!');
                } else {
                    const errorData = await response.json();
                    showError(`Error: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error adding account:', error);
                showError('Failed to add account');
            } finally {
                showLoading(false);
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    initApp().catch(error => {
        console.error('Error in initialization:', error);
        showError('Failed to initialize application: ' + error.message);
    });
});