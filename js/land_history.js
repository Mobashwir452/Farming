import { registerComponents } from './components.js';
import { API_URL } from './auth.js';

let currentFarmId = null;

document.addEventListener('DOMContentLoaded', async () => {
    registerComponents();

    const urlParams = new URLSearchParams(window.location.search);
    currentFarmId = urlParams.get('id') || urlParams.get('farm_id');

    if (!currentFarmId) {
        window.location.href = 'khamar.html';
        return;
    }

    await fetchHistoryDetails();
});

async function fetchHistoryDetails() {
    try {
        const token = localStorage.getItem('farmer_jwt');
        if (!token) return window.location.href = 'index.html';

        const response = await fetch(`${API_URL}/api/farms/${currentFarmId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const resData = await response.json();
            const farm = resData.farm;
            const allCrops = resData.crops || [];
            const allTransactions = resData.transactions || [];

            // 1. Update Farm Title
            const titleEl = document.getElementById('summary-land-title');
            if (titleEl && farm) {
                titleEl.textContent = `${farm.name || 'জমি'} - সম্পূর্ণ সারসংক্ষেপ`;
            }

            // 2. Filter Harvested Crops
            const harvestedCrops = allCrops.filter(c => c.status === 'Harvested');

            // 3. Calculate Summary 
            let totalInvestment = 0;
            let totalRevenue = 0;

            harvestedCrops.forEach(crop => {
                const txs = allTransactions.filter(t => t.crop_id === crop.id);
                let cropExpense = 0;
                let cropIncome = 0;

                if (txs.length > 0) {
                    txs.forEach(t => {
                        const amount = parseFloat(t.amount_bdt) || 0;
                        if (t.type === 'expense') cropExpense += amount;
                        if (t.type === 'income') cropIncome += amount;
                    });
                } else {
                    // Fallback to estimated or expected costs
                    cropIncome = parseFloat(crop.expected_revenue_bdt) || 0;
                    try {
                        const resources = JSON.parse(crop.resources_state_json || '[]');
                        resources.forEach(r => cropExpense += parseFloat(r.estimated_cost_bdt) || parseFloat(r.cost) || 0);
                        if (resources.length === 0) cropExpense = parseFloat(crop.expected_cost_bdt) || 0;
                    } catch(e) {
                        cropExpense = parseFloat(crop.expected_cost_bdt) || 0;
                    }
                }

                totalInvestment += cropExpense;
                totalRevenue += cropIncome;
            });

            const netProfit = totalRevenue - totalInvestment;

            // Update Summary DOM
            const cropsEl = document.getElementById('summary-total-crops');
            const investEl = document.getElementById('summary-total-investment');
            const revEl = document.getElementById('summary-total-revenue');
            const profitEl = document.getElementById('summary-net-profit');

            if (cropsEl) cropsEl.textContent = `${harvestedCrops.length} টি`;
            if (investEl) investEl.textContent = `৳ ${totalInvestment.toLocaleString('bn-BD')}`;
            if (revEl) revEl.textContent = `৳ ${totalRevenue.toLocaleString('bn-BD')}`;
            if (profitEl) {
                profitEl.textContent = `${netProfit >= 0 ? '+' : '-'} ৳ ${Math.abs(netProfit).toLocaleString('bn-BD')}`;
                profitEl.style.color = netProfit >= 0 ? '#047857' : '#EF4444';
            }

            // Render Crop History List
            renderHistoryCrops(harvestedCrops, allTransactions);

        }
    } catch (e) {
        console.error("Failed to load history details", e);
    }
}

function renderHistoryCrops(harvestedCrops, allTransactions) {
    const container = document.querySelector('.lh-history-list');
    if (!container) return;

    // Clear existing dummy cards except the header
    const historyHeader = container.querySelector('.lh-history-list-header');
    container.innerHTML = '';
    if (historyHeader) container.appendChild(historyHeader);

    if (harvestedCrops.length === 0) {
        container.insertAdjacentHTML('beforeend', '<div style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 14px;">অতীত ফসলের কোনো রেকর্ড পাওয়া যায়নি।</div>');
        return;
    }

    // Sort by planted_date desc (most recent first)
    harvestedCrops.sort((a, b) => new Date(b.planted_date || 0) - new Date(a.planted_date || 0));

    harvestedCrops.forEach(crop => {
        // Calculate crop finance
        const txs = allTransactions.filter(t => t.crop_id === crop.id);
        let cropExpense = 0;
        let cropIncome = 0;

        if (txs.length > 0) {
            txs.forEach(t => {
                const amount = parseFloat(t.amount_bdt) || 0;
                if (t.type === 'expense') cropExpense += amount;
                if (t.type === 'income') cropIncome += amount;
            });
        } else {
            cropIncome = parseFloat(crop.expected_revenue_bdt) || 0;
            try {
                const resources = JSON.parse(crop.resources_state_json || '[]');
                resources.forEach(r => cropExpense += parseFloat(r.estimated_cost_bdt) || parseFloat(r.cost) || 0);
                if (resources.length === 0) cropExpense = parseFloat(crop.expected_cost_bdt) || 0;
            } catch(e) {
                cropExpense = parseFloat(crop.expected_cost_bdt) || 0;
            }
        }

        const cropProfit = cropIncome - cropExpense;
        const profitColor = cropProfit >= 0 ? '#047857' : '#EF4444';
        const statusClass = cropProfit >= 0 ? 'success' : 'warning';
        const expectedRev = parseFloat(crop.expected_revenue_bdt) || 1;
        const successRate = Math.min(100, Math.round((cropIncome / expectedRev) * 100)) || 0;

        // Date logic
        const pDateStr = crop.planted_date ? new Date(crop.planted_date).toLocaleDateString('bn-BD', { month: 'short', year:'numeric'}) : 'অজ্ঞাত';
        const hDateStr = crop.updated_at ? new Date(crop.updated_at).toLocaleDateString('bn-BD', { month: 'short', year:'numeric'}) : 'অজ্ঞাত';
        
        let daysSpan = '';
        if (crop.planted_date && crop.updated_at) {
             const diff = Math.abs(new Date(crop.updated_at) - new Date(crop.planted_date));
             const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
             daysSpan = `(${days} দিন)`;
        }

        const yieldAmount = crop.expected_yield_kg ? `${crop.expected_yield_kg} কেজি` : 'ডেটা নেই';

        const cardHTML = `
            <div class="lh-crop-card" onclick="window.location.href='land_details.html?id=${currentFarmId}&crop_id=${crop.id}'">
                <div class="lh-crop-header">
                    <div class="lh-crop-title">
                        <h4>${crop.crop_name || 'ফসল'}</h4>
                        <p>${pDateStr} - ${hDateStr} ${daysSpan}</p>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div class="lh-crop-status ${statusClass}">${cropProfit >= 0 ? 'সফল ফলন' : 'ক্ষতিগ্রস্ত'}</div>
                            <div class="lh-chevron">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </div>
                        </div>
                        <div style="font-size: 11px; font-weight: 700; background: ${cropProfit>=0 ? '#ECFDF5':'#FFFBEB'}; color: ${profitColor}; padding: 2px 8px; border-radius: 12px; border: 1px solid ${cropProfit>=0 ? '#D1FAE5':'#FEF3C7'}; margin-right: 24px;">
                            ফলন হার: ${successRate}%
                        </div>
                    </div>
                </div>

                <div class="lh-crop-yield">
                    <span class="lh-yield-label">মোট ফলন (আনুমানিক):</span>
                    <span class="lh-yield-value">${yieldAmount}</span>
                </div>

                <div class="lh-crop-finance">
                    <div class="lh-finance-col">
                        <span class="lh-finance-label">খরচ</span>
                        <span class="lh-finance-val">৳ ${cropExpense.toLocaleString('bn-BD')}</span>
                    </div>
                    <div class="lh-finance-col" style="text-align: right;">
                        <span class="lh-finance-label">আয়</span>
                        <span class="lh-finance-val">৳ ${cropIncome.toLocaleString('bn-BD')}</span>
                    </div>
                    <div class="lh-finance-col" style="text-align: right;">
                        <span class="lh-finance-label">লাভ/ক্ষতি</span>
                        <span class="lh-finance-val profit" style="color: ${profitColor}">${cropProfit >= 0 ? '+' : '-'} ৳ ${Math.abs(cropProfit).toLocaleString('bn-BD')}</span>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}
