import { registerComponents } from './components.js';

let globalTransactions = [];
let farmsData = [];
const API_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure all Modular Web Components are loaded and initialized
    registerComponents();

    // Setup report download action (placeholder)
    const fabBtn = document.querySelector('.fab-report');
    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            // Button bounce animation
            fabBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                fabBtn.style.transform = 'scale(1)';
            }, 150);
        });
    }

    // Set up filter listeners
    document.getElementById('monthFilter').addEventListener('change', applyFilters);
    document.getElementById('farmFilter').addEventListener('change', applyFilters);
    document.getElementById('cropFilter').addEventListener('change', applyFilters);

    await fetchFarmsAndCrops();
    await fetchGlobalTransactions();
});

async function fetchFarmsAndCrops() {
    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/farms`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.farms) {
            farmsData = data.farms;
            
            const farmSelect = document.getElementById('farmFilter');
            const cropSelect = document.getElementById('cropFilter');
            
            farmsData.forEach(farm => {
                const opt = document.createElement('option');
                opt.value = farm.id;
                opt.textContent = farm.name;
                farmSelect.appendChild(opt);
                
                if (farm.crops && farm.crops.length > 0) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = farm.name;
                    farm.crops.forEach(crop => {
                        const cropOpt = document.createElement('option');
                        cropOpt.value = crop.id;
                        cropOpt.textContent = crop.crop_name;
                        optgroup.appendChild(cropOpt);
                    });
                    cropSelect.appendChild(optgroup);
                }
            });
        }
    } catch (e) {
        console.error("Error fetching farms:", e);
    }
}

async function fetchGlobalTransactions() {
    const skeleton = document.getElementById('ledger-skeleton');
    const container = document.getElementById('ledgerContainer');
    
    // Clear items except skeleton and empty state
    Array.from(container.children).forEach(child => {
        if (child.id !== 'ledger-skeleton' && child.id !== 'ledger-empty-state') {
            child.remove();
        }
    });
    
    skeleton.style.display = 'block';
    document.getElementById('ledger-empty-state').style.display = 'none';
    
    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            globalTransactions = data.transactions || [];
            applyFilters();
        }
    } catch (e) {
        console.error("Error fetching transactions:", e);
    } finally {
        skeleton.style.display = 'none';
    }
}

function convertToBanglaNumber(number) {
    const englishToBangla = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return String(number).split('').map(digit => englishToBangla[digit] || digit).join('');
}

function applyFilters() {
    const monthFilter = document.getElementById('monthFilter').value;
    const farmFilter = document.getElementById('farmFilter').value;
    const cropFilter = document.getElementById('cropFilter').value;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filtered = globalTransactions.filter(tx => {
        // Date filter
        const txDate = new Date(tx.transaction_date);
        let passDate = true;
        if (monthFilter === 'this_month') {
            passDate = (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear);
        } else if (monthFilter === 'last_month') {
            let lastMonth = currentMonth - 1;
            let year = currentYear;
            if (lastMonth < 0) { lastMonth = 11; year -= 1; }
            passDate = (txDate.getMonth() === lastMonth && txDate.getFullYear() === year);
        } else if (monthFilter === 'this_year') {
            passDate = (txDate.getFullYear() === currentYear);
        }

        // Farm filter
        let passFarm = true;
        if (farmFilter !== 'all') {
            passFarm = (String(tx.farm_id) === farmFilter);
        }

        // Crop filter
        let passCrop = true;
        if (cropFilter !== 'all') {
            passCrop = (String(tx.crop_id) === cropFilter);
        }

        return passDate && passFarm && passCrop;
    });

    renderSummary(filtered);
    renderLedger(filtered);
}

function renderSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
        if (tx.type === 'income') {
            totalIncome += tx.amount_bdt;
        } else {
            totalExpense += tx.amount_bdt;
        }
    });

    const netBalance = totalIncome - totalExpense;

    document.getElementById('totalIncomeAmount').textContent = `৳ ${convertToBanglaNumber(totalIncome)}`;
    document.getElementById('totalExpenseAmount').textContent = `৳ ${convertToBanglaNumber(totalExpense)}`;
    
    const netBalanceAmountEl = document.getElementById('netBalanceAmount');
    const netBalanceCardEl = document.getElementById('netBalanceCard');
    
    netBalanceAmountEl.textContent = `৳ ${convertToBanglaNumber(netBalance)}`;
    
    if (netBalance < 0) {
        netBalanceCardEl.classList.add('negative');
    } else {
        netBalanceCardEl.classList.remove('negative');
    }
}

function renderLedger(transactions) {
    const container = document.getElementById('ledgerContainer');
    const emptyState = document.getElementById('ledger-empty-state');
    
    // Clear existing groups
    Array.from(container.children).forEach(child => {
        if (child.id !== 'ledger-skeleton' && child.id !== 'ledger-empty-state') {
            child.remove();
        }
    });

    if (transactions.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    // Group by Date
    const grouped = {};
    transactions.forEach(tx => {
        let dateStr = 'অজানা তারিখ';
        try {
            const dateObj = new Date(tx.transaction_date);
            const options = { month: 'long', day: 'numeric', year: 'numeric' };
            dateStr = dateObj.toLocaleDateString('bn-BD', options);
        } catch(e) {}

        if (!grouped[dateStr]) {
            grouped[dateStr] = { transactions: [], net: 0 };
        }
        
        grouped[dateStr].transactions.push(tx);
        grouped[dateStr].net += (tx.type === 'income' ? tx.amount_bdt : -tx.amount_bdt);
    });

    // Create DOM
    Object.keys(grouped).forEach(dateStr => {
        const groupData = grouped[dateStr];
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'ledger-group';

        const netPrefix = groupData.net > 0 ? '+' : (groupData.net < 0 ? '-' : '');
        const netValue = Math.abs(groupData.net);

        groupDiv.innerHTML = `
            <div class="ledger-group-header">
                <span>${dateStr}</span>
                <span>মোট: ${netPrefix}৳ ${convertToBanglaNumber(netValue)}</span>
            </div>
        `;

        groupData.transactions.forEach(tx => {
            const isIncome = tx.type === 'income';
            const itemDiv = document.createElement('div');
            itemDiv.className = 'ledger-item';
            
            // Allow click to edit -> redirect to transactions.html since it has the edit modal
            itemDiv.style.cursor = 'pointer';
            itemDiv.onclick = () => window.location.href = 'transactions.html';

            itemDiv.innerHTML = `
                <div class="ledger-icon ${tx.type}">
                    ${isIncome ? `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                    ` : `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <polyline points="19 12 12 19 5 12"></polyline>
                    </svg>
                    `}
                </div>
                <div class="ledger-info">
                    <h4>${tx.category.includes('ম্যানু') ? (tx.description || tx.category) : tx.category}</h4>
                    <span class="ledger-badge">${tx.crop_name || 'অজানা ফসল'}</span>
                </div>
                <div class="ledger-amount ${tx.type}">
                    ${isIncome ? '+' : '-'} ৳ ${convertToBanglaNumber(tx.amount_bdt)}
                </div>
            `;
            groupDiv.appendChild(itemDiv);
        });

        container.appendChild(groupDiv);
    });
}
