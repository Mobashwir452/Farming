import { registerComponents } from './components.js';

let globalTransactions = [];
window.currentEditTxId = null;
window.currentEditCropId = null;

const API_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure all Modular Web Components are loaded and initialized
    registerComponents();

    /* --- Tab Filtering --- */
    const tabs = document.querySelectorAll('.transaction-tabs .tab-btn');
    const emptyState = document.getElementById('tr-empty-state');

    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                
                const targetTab = tab.getAttribute('data-tab');
                renderTransactions(targetTab);
            });
        });
    }

    /* --- Modal & API Logic --- */
    const fabBtn = document.querySelector('.fab-btn');
    const addTransactionModal = document.getElementById('addTransactionModal');
    const closeAddModalBtn = document.getElementById('closeAddModal');
    const saveTransactionBtn = document.getElementById('saveTransaction');
    const deleteTransactionBtn = document.getElementById('deleteTransactionBtn');

    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            // Button bounce animation
            fabBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                fabBtn.style.transform = 'scale(1)';
                openAddModal();
            }, 150);
        });
    }

    if (closeAddModalBtn) {
        closeAddModalBtn.addEventListener('click', closeAddModal);
    }

    if (addTransactionModal) {
        addTransactionModal.addEventListener('click', (e) => {
            if (e.target === addTransactionModal) {
                closeAddModal();
            }
        });
    }

    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', saveTransaction);
    }
    
    if (deleteTransactionBtn) {
        deleteTransactionBtn.addEventListener('click', deleteTransaction);
    }

    // Initialize Page
    initDateSelectionModal();
    await fetchCrops();
    await fetchGlobalTransactions();
});

const openAddModal = (tx = null) => {
    const modal = document.getElementById('addTransactionModal');
    const title = document.getElementById('transactionModalTitle');
    const btn = document.getElementById('saveTransaction');
    const deleteBtn = document.getElementById('deleteTransactionBtn');
    
    if (tx) {
        window.currentEditTxId = tx.id;
        window.currentEditCropId = tx.crop_id;
        title.textContent = 'হিসাব পরিবর্তন করুন';
        btn.textContent = 'আপডেট করুন';
        deleteBtn.style.display = 'block';
        
        // Populate fields
        document.querySelector(`input[name="tr_type"][value="${tx.type}"]`).checked = true;
        document.getElementById('tr-category').value = tx.category;
        document.getElementById('tr-amount').value = tx.amount_bdt;
        document.getElementById('tr-date').value = tx.transaction_date.split(' ')[0];
        document.getElementById('tr-crop').value = tx.crop_id;
        document.getElementById('tr-desc').value = tx.description || '';
        
        // Crop cannot be changed easily because the API endpoint requires the original crop_id to update
        // To keep it simple, we disable crop changing during edit.
        document.getElementById('tr-crop').disabled = true;
    } else {
        window.currentEditTxId = null;
        window.currentEditCropId = null;
        title.textContent = 'নতুন হিসাব যোগ করুন';
        btn.textContent = 'যোগ করুন';
        deleteBtn.style.display = 'none';
        
        // Reset fields
        document.querySelector('input[name="tr_type"][value="income"]').checked = true;
        document.getElementById('tr-category').selectedIndex = 0;
        document.getElementById('tr-amount').value = '';
        
        // Set today's date in local time
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('tr-date').value = `${year}-${month}-${day}`;
        
        document.getElementById('tr-crop').value = '';
        document.getElementById('tr-desc').value = '';
        document.getElementById('tr-crop').disabled = false;
    }
    
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

const closeAddModal = () => {
    const modal = document.getElementById('addTransactionModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

async function fetchCrops() {
    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/farms`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.farms) {
            const cropSelect = document.getElementById('tr-crop');
            // Keep first option
            cropSelect.innerHTML = '<option value="">কোনো ফসল সিলেক্ট করুন</option>';
            
            data.farms.forEach(farm => {
                if (farm.crops && farm.crops.length > 0) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = farm.name;
                    farm.crops.forEach(crop => {
                        const opt = document.createElement('option');
                        opt.value = crop.id;
                        opt.textContent = crop.crop_name;
                        optgroup.appendChild(opt);
                    });
                    cropSelect.appendChild(optgroup);
                }
            });
        }
    } catch (e) {
        console.error("Error fetching crops:", e);
    }
}

async function fetchGlobalTransactions() {
    const skeleton = document.getElementById('tr-skeleton');
    const container = document.getElementById('transactionsList');
    
    // Clear items except skeleton and empty state
    Array.from(container.children).forEach(child => {
        if (child.id !== 'tr-skeleton' && child.id !== 'tr-empty-state') {
            child.remove();
        }
    });
    
    skeleton.style.display = 'block';
    
    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            globalTransactions = data.transactions || [];
            const activeTab = document.querySelector('.transaction-tabs .tab-btn.active').getAttribute('data-tab');
            renderTransactions(activeTab);
        }
    } catch (e) {
        console.error("Error fetching transactions:", e);
    } finally {
        skeleton.style.display = 'none';
    }
}

function renderTransactions(filterType) {
    const container = document.getElementById('transactionsList');
    const emptyState = document.getElementById('tr-empty-state');
    
    // Clear existing
    Array.from(container.children).forEach(child => {
        if (child.id !== 'tr-skeleton' && child.id !== 'tr-empty-state') {
            child.remove();
        }
    });
    
    const filtered = globalTransactions.filter(tx => {
        if (filterType === 'all') return true;
        return tx.type === filterType;
    });
    
    if (filtered.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }
    
    filtered.forEach(tx => {
        const isIncome = tx.type === 'income';
        
        // Date formatting
        let dateStr = tx.transaction_date;
        try {
            const dateObj = new Date(tx.transaction_date);
            const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            dateStr = dateObj.toLocaleDateString('bn-BD', options);
        } catch(e) {}

        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.style.cursor = 'pointer';
        
        // Add click listener to edit
        item.addEventListener('click', () => {
            openAddModal(tx);
        });
        
        item.innerHTML = `
            <div class="tr-icon ${tx.type}">
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
            <div class="tr-info">
                <h4>${tx.category && tx.category.includes('ম্যানু') ? (tx.description || tx.category) : tx.category}</h4>
                <p style="font-size: 11px; color: var(--primary); font-weight: 500; margin-bottom: 2px;">${tx.crop_name || 'অজানা ফসল'}</p>
                <p>${dateStr}</p>
            </div>
            <div class="tr-amount ${isIncome ? 'positive' : 'negative'}">
                ${isIncome ? '+' : '-'} ৳ ${convertToBanglaNumber(tx.amount_bdt)}
            </div>
        `;
        
        container.appendChild(item);
    });
}

function convertToBanglaNumber(number) {
    const englishToBangla = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return String(number).split('').map(digit => englishToBangla[digit] || digit).join('');
}

async function saveTransaction() {
    const type = document.querySelector('input[name="tr_type"]:checked').value;
    const category = document.getElementById('tr-category').value;
    const amountVal = parseFloat(document.getElementById('tr-amount').value);
    const dateVal = document.getElementById('tr-date').value;
    const cropId = document.getElementById('tr-crop').value;
    const descVal = document.getElementById('tr-desc').value;
    
    if (!cropId) {
        alert("দয়া করে একটি লিংকড ফসল নির্বাচন করুন।");
        return;
    }
    
    if (!amountVal || amountVal <= 0) {
        alert("দয়া করে সঠিক টাকার পরিমাণ লিখুন।");
        return;
    }
    
    const btn = document.getElementById('saveTransaction');
    const originalText = btn.textContent;
    btn.textContent = 'সংরক্ষণ হচ্ছে...';
    btn.disabled = true;
    
    try {
        const token = localStorage.getItem('farmer_jwt');
        const payload = {
            type: type,
            category: category,
            amount_bdt: amountVal,
            description: descVal || (type === 'income' ? 'আয়' : 'ব্যয়')
        };
        
        if (dateVal) {
            // Append time if missing to create a valid datetime string
            payload.transaction_date = dateVal.includes(':') ? dateVal : `${dateVal} 12:00:00`;
        }

        const isEdit = !!window.currentEditTxId;
        const targetCropId = isEdit ? window.currentEditCropId : cropId;
        const endpoint = isEdit ? 
            `${API_URL}/api/crops/${targetCropId}/transactions/${window.currentEditTxId}` : 
            `${API_URL}/api/crops/${targetCropId}/transactions`;
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(endpoint, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.success) {
            closeAddModal();
            await fetchGlobalTransactions();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("সার্ভার এরর।");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function deleteTransaction() {
    if (!window.currentEditTxId || !window.currentEditCropId) return;
    
    if (!confirm("আপনি কি নিশ্চিত যে এই হিসাবটি মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।")) return;
    
    const btn = document.getElementById('deleteTransactionBtn');
    btn.disabled = true;
    
    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/crops/${window.currentEditCropId}/transactions/${window.currentEditTxId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (data.success) {
            closeAddModal();
            await fetchGlobalTransactions();
        } else {
            alert('Error: ' + data.error);
        }
    } catch(e) {
        console.error(e);
        alert("সার্ভার এরর।");
    } finally {
        btn.disabled = false;
    }
}

// --- Date Selection Modal Logic ---
function initDateSelectionModal() {
    const trDateInput = document.getElementById('tr-date');
    const dateModal = document.getElementById('dateSelectionModal');
    const closeBtn = document.getElementById('closeDateSelection');
    const confirmBtn = document.getElementById('confirmDateSelection');
    
    if (trDateInput && dateModal) {
        trDateInput.addEventListener('click', () => {
            if (dateModal) {
                dateModal.classList.add('active');
                const overlay = document.getElementById('dateSelectionOverlay');
                if(overlay) overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                renderDateSelectionCalendar(trDateInput.value);
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (dateModal) {
                dateModal.classList.remove('active');
                const overlay = document.getElementById('dateSelectionOverlay');
                if(overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const selectedEl = document.querySelector('#dsDays .cal-day.selected');
            if (selectedEl) {
                trDateInput.value = selectedEl.getAttribute('data-date');
            }
            if (dateModal) {
                dateModal.classList.remove('active');
                const overlay = document.getElementById('dateSelectionOverlay');
                if(overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

window.currentTransactionViewDate = null;

window.changeTransactionMonth = function(offset) {
    if (!window.currentTransactionViewDate) return;
    window.currentTransactionViewDate.setMonth(window.currentTransactionViewDate.getMonth() + offset);
    renderDateSelectionCalendar(null, false);
};

function renderDateSelectionCalendar(currentDateStr, resetView = true) {
    const daysContainer = document.getElementById('dsDays');
    if(!daysContainer) return;
    daysContainer.innerHTML = '';
    
    const EN_TO_BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const toBngDigits = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

    if (resetView) {
        if (currentDateStr && !isNaN(new Date(currentDateStr))) {
            window.currentTransactionViewDate = new Date(currentDateStr);
        } else {
            window.currentTransactionViewDate = new Date();
        }
    } else if (!window.currentTransactionViewDate) {
        window.currentTransactionViewDate = new Date();
    }
    
    const year = window.currentTransactionViewDate.getFullYear();
    const month = window.currentTransactionViewDate.getMonth();
    
    const dsMonthEl = document.getElementById('dsMonth');
    if (dsMonthEl) {
        dsMonthEl.textContent = `${EN_TO_BN_MONTHS[month]} ${toBngDigits(year)}`;
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        daysContainer.innerHTML += `<div></div>`; // empty grid cells
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Original input date (not just view date) for highlighting
    let baseDate = null;
    const trDateInputVal = document.getElementById('tr-date')?.value;
    if (trDateInputVal) {
        baseDate = new Date(trDateInputVal);
        baseDate.setHours(0,0,0,0);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        d.setHours(0,0,0,0);
        
        let classes = 'cal-day';
        if (baseDate && d.getTime() === baseDate.getTime()) classes += ' selected';
        
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        
        daysContainer.innerHTML += `<div class="${classes}" data-date="${dateStr}">${toBngDigits(i)}</div>`;
    }
    
    const dayEls = daysContainer.querySelectorAll('.cal-day');
    dayEls.forEach(el => {
        el.addEventListener('click', () => {
            dayEls.forEach(d => d.classList.remove('selected'));
            el.classList.add('selected');
        });
    });
}
