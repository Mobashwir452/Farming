import { API_URL } from './auth.js';

let pendingAICropData = null;

window.onload = () => {
    const rawData = sessionStorage.getItem('pendingAICropData');
    if (!rawData) {
        alert("কোনো ডাটা পাওয়া যায়নি। দয়া করে আবার চেষ্টা করুন।");
        window.history.back();
        return;
    }

    pendingAICropData = JSON.parse(rawData);
    document.getElementById('final-crop-name').textContent = pendingAICropData.crop_name;
    
    renderFinanceInfo();
    renderResources();
};

function renderFinanceInfo() {
    if (!pendingAICropData.finance || !pendingAICropData.yield) return;
    
    // Add "কেজি" string if it's just a number. If it already has text like "50 কেজি", the API sometimes outputs just the number format or string. We just safely append " কেজি".
    const yieldStr = typeof pendingAICropData.yield.range === 'number' ? pendingAICropData.yield.range + " কেজি" : pendingAICropData.yield.range + " কেজি";
    
    const yieldEl = document.getElementById('display-yield-range');
    const lifespanEl = document.getElementById('display-lifespan');
    const priceEl = document.getElementById('display-price-per-kg');
    const revenueEl = document.getElementById('display-revenue');
    const profitEl = document.getElementById('display-profit');
    
    if (yieldEl) yieldEl.textContent = yieldStr;
    if (lifespanEl) lifespanEl.textContent = pendingAICropData.yield.lifespan || 'অজানা';
    if (priceEl) priceEl.textContent = "৳ " + (pendingAICropData.finance.price_per_kg || '0');
    if (revenueEl) revenueEl.textContent = pendingAICropData.finance.revenue || '-';
    if (profitEl) {
        let profitStr = pendingAICropData.finance.profit || '-';
        profitEl.textContent = profitStr;
        profitEl.style.color = profitStr.includes('-') ? '#EF4444' : '#4F46E5'; // Red if negative, Blue if positive
    }
}

function renderResources() {
    const tbody = document.getElementById('resource-tbody');
    const resources = pendingAICropData.resources || [];
    
    if (resources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">কোনো রিসোর্স পাওয়া যায়নি</td></tr>';
        return;
    }

    const grouped = {
        'seed_or_sapling': { title: 'বীজ বা চারা', items: [] },
        'fertilizer': { title: 'সার ব্যবস্থাপনা', items: [] },
        'pesticide': { title: 'বালাইনাশক ও ঔষধ', items: [] },
        'labor_and_other': { title: 'শ্রমিক ও অন্যান্য', items: [] }
    };

    let total = 0;
    resources.forEach(r => {
        total += r.estimated_cost_bdt || 0;
        const cat = r.category || 'labor_and_other';
        if (grouped[cat]) {
            grouped[cat].items.push(r);
        } else {
            grouped['labor_and_other'].items.push(r);
        }
    });

    let html = '';
    for (const [key, group] of Object.entries(grouped)) {
        if (group.items.length > 0) {
            html += `
                <tr style="background: #EEF2FF;">
                    <td colspan="3" style="font-weight: 700; color: var(--primary); font-size: 13px; text-align: center;">${group.title}</td>
                </tr>
            `;
            group.items.forEach(r => {
                html += `
                    <tr>
                        <td>${r.name}</td>
                        <td style="text-align: right;">${r.amount || '-'}</td>
                        <td style="text-align: right;">৳ ${r.estimated_cost_bdt || 0}</td>
                    </tr>
                `;
            });
        }
    }
    
    tbody.innerHTML = html;

    // We can also double check fallback with pendingAICropData.finance.cost
    const fallbackStr = String(pendingAICropData.finance?.cost || '0').replace(/[^\d\.]/g, '');
    const fallbackCost = parseFloat(fallbackStr) || 0;

    // Use whichever is greater to be safe
    const finalTotal = total > 0 ? total : fallbackCost;
    
    document.getElementById('total-cost-display').textContent = `৳ ${finalTotal}`;
}


window.closeDatePicker = function (event) {
    if (event && event.target !== document.getElementById('datePickerOverlay') && event.target.tagName !== 'BUTTON') {
        return;
    }
    const overlay = document.getElementById('datePickerOverlay');
    const content = document.getElementById('datePickerContent');
    content.style.bottom = '-100%';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

window.confirmAndSave = function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('selectedPlantingDate').value = today;

    const overlay = document.getElementById('datePickerOverlay');
    const content = document.getElementById('datePickerContent');
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        content.style.bottom = '0';
    }, 10);
}

window.finalizeAndSave = async function () {
    const btn = document.getElementById('btn-finalize-save');
    const originalText = btn.innerHTML;
    const token = localStorage.getItem('farmer_jwt');

    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        সেভ হচ্ছে...
    `;
    let style = document.getElementById('spinStyle');
    if (!style) {
        style = document.createElement('style');
        style.id = 'spinStyle';
        style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    try { 
        // Read custom date
        const dateInput = document.getElementById('selectedPlantingDate').value;
        const plantingDate = dateInput || new Date().toISOString().split('T')[0];
        pendingAICropData.planting_date = plantingDate;

        const response = await fetch(`${API_URL}/api/crops`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pendingAICropData)
        });

        const data = await response.json();
        if (data.success) {
            sessionStorage.removeItem('pendingAICropData');
            sessionStorage.removeItem('pendingCropImage');
            window.location.href = `khamar.html`;
        } else {
            alert(data.error || "সেভ হতে সমস্যা হয়েছে");
            btn.innerHTML = originalText;
        }
    } catch (e) {
        console.error(e);
        alert("নেটওয়ার্কে সমস্যা হয়েছে।");
        btn.innerHTML = originalText;
    }
}
