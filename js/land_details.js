import { registerComponents } from './components.js';
import { API_URL } from './auth.js';

let currentFarmId = null;
let activeCrop = null;

// Expose switchTab globally
window.switchTab = function (tabId, btnEl) {
    document.querySelectorAll('.ld-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.ld-tab-pane').forEach(pane => pane.classList.remove('active'));

    btnEl.classList.add('active');
    document.getElementById(`pane-${tabId}`).classList.add('active');
};

document.addEventListener('DOMContentLoaded', async () => {
    registerComponents();

    setTimeout(() => {
        const bottomNav = document.querySelector('app-bottom-nav');
        if (bottomNav && bottomNav.shadowRoot) {
            bottomNav.shadowRoot.querySelectorAll('.b-n-item').forEach(item => item.classList.remove('active'));
            const khamarNav = bottomNav.shadowRoot.querySelector('.b-n-item[href="khamar.html"]');
            if (khamarNav) khamarNav.classList.add('active');
        }
    }, 100);

    const urlParams = new URLSearchParams(window.location.search);
    currentFarmId = urlParams.get('id') || urlParams.get('farm_id');

    if (!currentFarmId) {
        // Redirect to khamar if no id is passed
        window.location.href = 'khamar.html';
        return;
    }

    setupModals();
    await fetchFarmAndCropDetails();
});

function setupModals() {
    const btnFinance = document.getElementById('btnFinance');
    const btnHarvest = document.getElementById('btnHarvest');
    const addTransactionModal = document.getElementById('addTransactionModal');
    const harvestModal = document.getElementById('harvestModal');
    const lossModal = document.getElementById('lossModal');
    const calendarModalEl = document.getElementById('calendarModal');
    const customStepModal = document.getElementById('customStepModal');
    const weatherModal = document.getElementById('weatherModal');
    const aiGuidelineModal = document.getElementById('aiGuidelineModal');

    if (btnFinance && addTransactionModal) {
        btnFinance.addEventListener('click', () => {
            addTransactionModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (btnHarvest && harvestModal) {
        btnHarvest.addEventListener('click', () => {
            harvestModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    const modals = [addTransactionModal, harvestModal, lossModal, calendarModalEl, customStepModal, weatherModal, aiGuidelineModal];
    modals.forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    });

    // Mock Calendar Rendering
    const calendarDays = document.getElementById('calendarDays');
    if (calendarDays) {
        calendarDays.innerHTML = '';
        for (let i = 1; i <= 31; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'cal-day';
            dayEl.textContent = i;
            if (i < 24) dayEl.classList.add('past');
            else {
                dayEl.addEventListener('click', () => {
                    document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                    dayEl.classList.add('selected');
                });
            }
            if (i === 24) dayEl.classList.add('selected');
            calendarDays.appendChild(dayEl);
        }
    }
}

async function fetchFarmAndCropDetails() {
    const token = localStorage.getItem('farmer_jwt');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/farms/${currentFarmId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await response.json();

        if (resData.success) {
            // Update Farm Header Info
            const pageTitle = document.querySelector('.page-top-header h2');
            const overviewTitle = document.querySelector('.ld-card-header h3');
            const areaValue = document.querySelector('.ld-info-value');

            if (pageTitle) pageTitle.textContent = resData.farm.name;
            if (overviewTitle) overviewTitle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${resData.farm.name}`;
            if (areaValue) areaValue.textContent = `${resData.farm.area_shotangsho} শতাংশ`;
            
            window.currentFarmArea = parseFloat(resData.farm.area_shotangsho) || 1;

            // Connect land history button
            const btnHistory = document.getElementById('btnLandHistory');
            if (btnHistory) {
                btnHistory.onclick = () => window.location.href = `land_history.html?id=${currentFarmId}`;
            }

            // Connect Crop Doctor UI with explicit scope mapping
            const btnDisease = document.getElementById('btnDisease');
            if (btnDisease) {
                btnDisease.onclick = () => window.location.href = `crop_doctor.html?farm_id=${currentFarmId}`;
            }

            // Calculate total farm profit utilizing actual transactions
            let totalFarmProfit = 0;
            if (resData.transactions && resData.transactions.length > 0) {
                resData.transactions.forEach(t => {
                    const amount = parseFloat(t.amount_bdt) || 0;
                    if (t.type === 'income') totalFarmProfit += amount;
                    else if (t.type === 'expense') totalFarmProfit -= amount;
                });
            } else if (resData.crops && resData.crops.length > 0) {
                // Fallback to AI projections if no active transactions are present
                resData.crops.forEach(c => {
                    const rev = parseFloat(c.expected_revenue_bdt) || 0;
                    let dynamicCost = 0;
                    try {
                        const resources = JSON.parse(c.resources_state_json || '[]');
                        resources.forEach(r => dynamicCost += parseFloat(r.estimated_cost_bdt) || parseFloat(r.cost) || 0);
                        if (resources.length === 0) dynamicCost = parseFloat(c.expected_cost_bdt) || 0;
                    } catch(e) {
                        dynamicCost = parseFloat(c.expected_cost_bdt) || 0;
                    }
                    totalFarmProfit += (rev - dynamicCost);
                });
            }
            const farmProfitEl = document.getElementById('current-profit-display');
            if (farmProfitEl) {
                farmProfitEl.textContent = `৳ ${totalFarmProfit}`;
                farmProfitEl.style.color = totalFarmProfit >= 0 ? 'var(--primary-dark)' : '#EF4444';
            }

            // Display Active Crop
            const activeCrops = (resData.crops || []).filter(c => c.status !== 'Harvested');
            if (activeCrops.length > 0) {
                activeCrop = activeCrops[0]; // For simplicity, take the first active one
                window.activeCrop = activeCrop;

                // Set Crop Profile
                const cropNameEl = document.querySelector('.ld-crop-text h4');
                const cropStatusEl = document.querySelector('.ld-crop-text p:nth-child(3) span');
                const plantingAgeEl = document.querySelector('.ld-crop-text p strong');

                if (cropNameEl) cropNameEl.textContent = activeCrop.crop_name;
                if (cropStatusEl) cropStatusEl.innerHTML = `${activeCrop.status} (এআই ম্যাপড)`;
                
                // Dynamically evaluate age
                if (plantingAgeEl) {
                    if(activeCrop.planted_date) {
                        const diffTime = Math.abs(Date.now() - new Date(activeCrop.planted_date));
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        plantingAgeEl.textContent = `${diffDays} দিন`;
                    } else {
                        plantingAgeEl.textContent = 'অজ্ঞাত';
                    }
                }

                // Fill Financial Snapshot
                let currentActiveCost = 0;
                let currentActiveIncome = 0;
                let hasTransactions = false;

                if (resData.transactions) {
                    const activeTxs = resData.transactions.filter(t => t.crop_id === activeCrop.id);
                    if (activeTxs.length > 0) {
                        hasTransactions = true;
                        activeTxs.forEach(t => {
                            const amount = parseFloat(t.amount_bdt) || 0;
                            if (t.type === 'expense') currentActiveCost += amount;
                            else if (t.type === 'income') currentActiveIncome += amount;
                        });
                    }
                }

                if (!hasTransactions) {
                    currentActiveIncome = parseFloat(activeCrop.expected_revenue_bdt) || 0;
                    try {
                        const activeRes = JSON.parse(activeCrop.resources_state_json || '[]');
                        activeRes.forEach(r => currentActiveCost += parseFloat(r.estimated_cost_bdt) || parseFloat(r.cost) || 0);
                        if (activeRes.length === 0) currentActiveCost = parseFloat(activeCrop.expected_cost_bdt) || 0;
                    } catch(e) {
                        currentActiveCost = parseFloat(activeCrop.expected_cost_bdt) || 0;
                    }
                }

                document.getElementById('current-cost-display').textContent = `৳ ${currentActiveCost}`;
                document.getElementById('current-rev-display').textContent = `৳ ${currentActiveIncome}`;

                // Render Tab Parameters
                renderTasksTab(activeCrop.tasks_state_json);
                renderGuidelineModal();
                renderResourcesTab(activeCrop.resources_state_json);
                renderFinanceTab();
                
                // Output Notes List
                renderCropNotes(activeCrop.notes_json);

                // Output Crop Scans specifically linked to this Land
                fetchCropScansForLand();

            } else {
                document.getElementById('render-tasks').innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো ফসল রোপণ করা নেই।</p>';
                document.getElementById('render-resources').innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো রিসোর্স নেই।</p>';
                document.getElementById('render-finance').innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো ফিন্যান্সিয়াল ট্র্যাকিং নেই।</p>';
            }
        }
    } catch (e) {
        console.error("Failed to load land details", e);
    }
}

async function saveCropState() {
    if (!activeCrop) return;
    const token = localStorage.getItem('farmer_jwt');
    try {
        await fetch(`${API_URL}/api/crops/${activeCrop.id}/state`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tasks_state_json: activeCrop.tasks_state_json,
                resources_state_json: activeCrop.resources_state_json,
                notes_json: activeCrop.notes_json
            })
        });
    } catch (e) {
        console.error("Failed to save crop state", e);
    }
}

// Utility to escape HTML locally
function escapeHtml(text) {
    return (text || '').toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function fetchCropScansForLand() {
    const token = localStorage.getItem('farmer_jwt');
    if (!token || !currentFarmId) return;

    try {
        const response = await fetch(`${API_URL}/api/public/crop-scans?farm_id=${currentFarmId}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const scanContainer = document.getElementById('cropScansContainer');
        const listEl = document.getElementById('scansList');

        if (data.success && data.scans && data.scans.length > 0) {
            scanContainer.style.display = 'block';
            listEl.innerHTML = '';
            
            data.scans.forEach(scan => {
                let imgSrc = scan.image_url;
                if (imgSrc && imgSrc.startsWith('crop-scans/')) {
                    imgSrc = `${API_URL}/api/public/images/${imgSrc.split('/')[1]}`;
                } else if (!imgSrc || imgSrc === 'expired_removed') {
                    imgSrc = 'https://placehold.co/100x100?text=Expired';
                }

                const badgeColor = scan.confidence_score > 60 ? 'var(--success)' : 'var(--danger)';
                const scanDate = new Date(scan.created_at).toLocaleDateString('bn-BD');
                
                const card = document.createElement('div');
                card.style.cssText = 'min-width: 140px; width: 140px; border-radius: 12px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid var(--border-color); flex-shrink: 0;';
                card.innerHTML = `
                    <img src="${imgSrc}" style="width: 100%; height: 100px; object-fit: cover;">
                    <div style="padding: 10px;">
                        <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(scan.disease_name_bn || 'ফলাফল নেই')}</h4>
                        <div style="font-size: 11px; color: var(--text-muted); display:flex; justify-content:space-between;">
                            <span>${escapeHtml(scanDate)}</span>
                            <span style="color: ${badgeColor}; font-weight: 600;">${Math.round(scan.confidence_score)}%</span>
                        </div>
                    </div>
                `;
                listEl.appendChild(card);
            });
        } else {
            scanContainer.style.display = 'none';
        }
    } catch(e) { console.error("Could not fetch scans", e); }
}

window.renderCropNotes = function(notesJsonString) {
    const listEl = document.getElementById('notesList');
    const container = document.getElementById('cropNotesContainer');
    if(!listEl || !container) return;
    
    listEl.innerHTML = '';
    
    try {
        const notes = JSON.parse(notesJsonString || '[]');
        if(notes.length === 0) {
            container.style.display = 'none';
        } else {
            container.style.display = 'block';
            notes.forEach((note, index) => {
                const item = document.createElement('div');
                item.style.padding = '10px';
                item.style.background = '#F9FAFB';
                item.style.border = '1px solid var(--border-color)';
                item.style.borderRadius = '8px';
                item.style.marginBottom = '8px';
                
                const timeStr = note.date ? new Date(note.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }) : 'অজ্ঞাত দিন';
                
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">${escapeHtml(timeStr)}</span>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="editCropNote(${index})" style="background: none; border: none; cursor: pointer; color: #3b82f6; padding: 0; display: flex; align-items: center;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button onclick="deleteCropNote(${index})" style="background: none; border: none; cursor: pointer; color: #ef4444; padding: 0; display: flex; align-items: center;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 13px; color: var(--text-main); line-height: 1.4; padding-top: 4px;">${escapeHtml(note.note || note.text)}</div>
                `;
                listEl.appendChild(item);
            });
        }
    } catch(e) { console.error("Could not parse notes", e); }
}

window.editCropNote = function(index) {
    if(!window.activeCrop || !window.activeCrop.notes_json) return;
    try {
        let notes = JSON.parse(window.activeCrop.notes_json);
        const oldText = notes[index].note || notes[index].text;
        const newText = prompt("নোট আপডেট করুন:", oldText);
        if(newText !== null && newText.trim() !== "") {
            notes[index].text = newText.trim();
            delete notes[index].note; // Normalize field mapping
            window.activeCrop.notes_json = JSON.stringify(notes);
            saveCropState();
            window.renderCropNotes(window.activeCrop.notes_json);
        }
    } catch(e) { console.error(e); }
};

window.deleteCropNote = function(index) {
    if(!window.activeCrop || !window.activeCrop.notes_json) return;
    if(!confirm("আপনি কি নিশ্চিতভাবে এই নোটটি মুছে ফেলতে চান?")) return;
    try {
        let notes = JSON.parse(window.activeCrop.notes_json);
        notes.splice(index, 1);
        window.activeCrop.notes_json = JSON.stringify(notes);
        saveCropState();
        window.renderCropNotes(window.activeCrop.notes_json);
    } catch(e) { console.error(e); }
};

window.toggleResourceCheck = async function (id, el) {
    const parent = el.closest('.resource-check-item');
    const isChecked = el.checked;
    
    try {
        let resArr = JSON.parse(activeCrop.resources_state_json || '[]');
        const idx = resArr.findIndex(r => r.id === id);
        if (idx === -1) return;

        const res = resArr[idx];
        
        if (isChecked) {
            // Optimistic UI
            parent.classList.add('bought');
            parent.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.readOnly = true);
            const delBtn = parent.querySelector('button[title="বাতিল করুন"]');
            if(delBtn) delBtn.style.display = 'none';

            let cost = res.estimated_cost_bdt || 0;
            if (cost <= 0) {
                const userCost = prompt(`"${res.name || 'রিসোর্স'}" ক্রয় করতে কত টাকা লেগেছে?`, "0");
                if (userCost === null) {
                    el.checked = false; // Revert
                    parent.classList.remove('bought');
                    parent.querySelectorAll('input.res-name-input, input.res-amount-input, input.res-cost-input').forEach(input => input.readOnly = false);
                    if(delBtn) delBtn.style.display = 'block';
                    return;
                }
                cost = parseFloat(userCost) || 0;
                res.estimated_cost_bdt = cost;
                const costInput = parent.querySelector('.res-cost-input');
                if(costInput) costInput.value = cost;
            } else {
                const confirmRes = confirm(`"${res.name || 'রিসোর্স'}" এর খরচ ৳${cost} হিসেবে ডাটাবেসে সেভ হবে। আপনি কি নিশ্চিত?`);
                if(!confirmRes) {
                    el.checked = false;
                    parent.classList.remove('bought');
                    parent.querySelectorAll('input.res-name-input, input.res-amount-input, input.res-cost-input').forEach(input => input.readOnly = false);
                    if(delBtn) delBtn.style.display = 'block';
                    return;
                }
            }

            res.status = 'bought';

            // Push to Backend Transactions BEFORE saving local state so if it fails, we revert
            const token = localStorage.getItem('farmer_jwt');
            const catMap = { 'seed_or_sapling': 'বীজ/চারা', 'fertilizer': 'সার', 'pesticide': 'বালাইনাশক', 'irrigation': 'সেচ', 'labor_and_other': 'অন্যান্য' };
            const payload = {
                type: 'expense',
                category: catMap[res.category || 'labor_and_other'] || 'অন্যান্য',
                amount_bdt: cost,
                description: `${res.name || 'অজানা রিসোর্স'} ক্রয়`
            };

            const txRes = await fetch(`${API_URL}/api/crops/${activeCrop.id}/transactions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const txData = await txRes.json();
            if (txData.success && txData.transaction) {
                res.transaction_id = txData.transaction.id;
            } else {
                alert("দুঃখিত, ট্রানজ্যাকশন সেভ হয়নি: " + (txData.error || 'Server Error'));
                el.checked = false;
                parent.classList.remove('bought');
                parent.querySelectorAll('input.res-name-input, input.res-amount-input, input.res-cost-input').forEach(input => input.readOnly = false);
                if(delBtn) delBtn.style.display = 'block';
                res.status = 'pending';
                return;
            }
        } else {
            // UN-CHECK (Delete transaction)
            if(!confirm("আপনি কি নিশ্চিত যে এই খরচটি বাতিল করে পুনরায় এডিট করতে চান?")) {
                el.checked = true;
                return;
            }

            parent.classList.remove('bought');
            parent.querySelectorAll('input.res-name-input, input.res-amount-input, input.res-cost-input').forEach(input => input.readOnly = false);
            const delBtn = parent.querySelector('button[title="বাতিল করুন"]');
            if(delBtn) delBtn.style.display = 'block';
            res.status = 'pending';

            if (res.transaction_id) {
                const token = localStorage.getItem('farmer_jwt');
                await fetch(`${API_URL}/api/crops/${activeCrop.id}/transactions/${res.transaction_id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                delete res.transaction_id;
            }
        }

        activeCrop.resources_state_json = JSON.stringify(resArr);
        saveCropState();
        renderFinanceTab(); 
        
        // Re-render to ensure pristine bindings
        renderResourcesTab(activeCrop.resources_state_json);
    } catch (e) {
        console.error(e);
        alert("লোকাল এরর। দয়া করে পেজটি রিফ্রেশ করুন।");
    }
};

window.updateResourceData = function(id, field, value) {
    try {
        let resArr = JSON.parse(activeCrop.resources_state_json || '[]');
        const idx = resArr.findIndex(r => r.id === id);
        if (idx > -1) {
            resArr[idx][field] = field === 'estimated_cost_bdt' ? (parseFloat(value) || 0) : value;
            activeCrop.resources_state_json = JSON.stringify(resArr);
            saveCropState();
        }
    } catch(e) {}
};

window.updateResourceCategory = function(id, value) {
    try {
        let resArr = JSON.parse(activeCrop.resources_state_json || '[]');
        const idx = resArr.findIndex(r => r.id === id);
        if (idx > -1) {
            resArr[idx].category = value;
            activeCrop.resources_state_json = JSON.stringify(resArr);
            saveCropState();
            renderResourcesTab(activeCrop.resources_state_json);
        }
    } catch(e) {}
};

window.deleteLocalResource = function(id) {
    if(!confirm("এই রিসোর্সটি কি মুছে ফেলতে চান?")) return;
    try {
        let resArr = JSON.parse(activeCrop.resources_state_json || '[]');
        resArr = resArr.filter(r => r.id !== id);
        activeCrop.resources_state_json = JSON.stringify(resArr);
        saveCropState();
        renderResourcesTab(activeCrop.resources_state_json);
    } catch(e) {}
};

window.addCustomResourceRow = function() {
    try {
        let resArr = JSON.parse(activeCrop.resources_state_json || '[]');
        resArr.push({
            id: 'res_custom_' + Math.random().toString(36).substr(2, 5),
            category: 'labor_and_other',
            name: '',
            amount: '',
            estimated_cost_bdt: 0,
            status: 'pending'
        });
        activeCrop.resources_state_json = JSON.stringify(resArr);
        saveCropState();
        renderResourcesTab(activeCrop.resources_state_json);
    } catch(e) {}
};

window.markTaskDone = function (taskId, btnEl) {
    const parent = btnEl.closest('.ld-task-item');
    parent.classList.remove('active', 'warning');
    parent.classList.add('completed');

    // Remove action buttons
    const actionsMap = parent.querySelector('.task-item-actions');
    if (actionsMap) actionsMap.remove();

    const dateEl = parent.querySelector('.task-date');
    if (dateEl) {
        dateEl.innerHTML = `${dateEl.textContent.trim().replace('আজকের কাজ', 'সম্পন্ন')} <span style="color: var(--primary);">✓ সম্পন্ন</span>`;
        dateEl.style.color = 'var(--text-muted)';
    }

    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx > -1) {
            tasks[idx].status = 'completed';
            activeCrop.tasks_state_json = JSON.stringify(tasks);
            saveCropState();
        }
    } catch (e) { }
};

window.rescheduleTask = function (taskId) {
    // Basic mock: reschedule to +1 day ahead
    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx > -1) {
            const currentDue = new Date(tasks[idx].due_date);
            currentDue.setDate(currentDue.getDate() + 1);
            tasks[idx].due_date = currentDue.toISOString().split('T')[0];
            activeCrop.tasks_state_json = JSON.stringify(tasks);
            saveCropState();
            renderTasksTab(activeCrop.tasks_state_json);
        }
    } catch (e) { }
};

window.cancelTask = function (taskId) {
    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
        const filtered = tasks.filter(t => t.id !== taskId);
        activeCrop.tasks_state_json = JSON.stringify(filtered);
        saveCropState();
        renderTasksTab(activeCrop.tasks_state_json);
    } catch (e) { }
};

window.addCustomTask = function () {
    const title = document.getElementById('customStepTitle')?.value || '';
    const desc = document.getElementById('customStepDesc')?.value || '';
    if (!title) return alert('কাজের নাম আবশ্যক');

    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
        tasks.push({
            id: crypto.randomUUID(),
            title: title,
            description: desc,
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending'
        });

        // Sort tasks by due date
        tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

        activeCrop.tasks_state_json = JSON.stringify(tasks);
        saveCropState();
        renderTasksTab(activeCrop.tasks_state_json);
        alert('নতুন কাজ যোগ করা হয়েছে');
        document.getElementById('customStepModal').classList.remove('active');
        document.body.style.overflow = '';
    } catch (e) {
        console.error(e);
    }
};

function renderTasksTab(tasksJsonStr) {
    const tlContainer = document.getElementById('render-tasks');

    let tasks = [];
    try {
        tasks = JSON.parse(tasksJsonStr || '[]');
    } catch (e) { }

    if (tasks.length === 0) {
        tlContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো কাজ পাওয়া যায়নি।</p>';
        return;
    }

    // Sort tasks by due date
    tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    // Group tasks by due date
    const groupedTasks = {};
    tasks.forEach(task => {
        const dateStr = task.due_date;
        if (!groupedTasks[dateStr]) groupedTasks[dateStr] = [];
        groupedTasks[dateStr].push(task);
    });

    tlContainer.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];

    // Helper to Bengali Digits
    const toBngDigits = (num) => String(num).split('').map(d => ({ '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' }[d] || d)).join('');

    // Format Bengali Date
    const formatBengaliDate = (dateStr) => {
        if (!dateStr) return '';
        const dateObj = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateObj.setHours(0, 0, 0, 0);

        const diffTime = dateObj - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const bngMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        const dateNum = toBngDigits(dateObj.getDate());

        let prefix = '';
        if (diffDays === 0) prefix = 'আজ, ';
        else if (diffDays === 1) prefix = 'আগামীকাল, ';
        else if (diffDays === -1) prefix = 'গতকাল, ';

        return `${prefix}${dateNum} ${bngMonths[dateObj.getMonth()]}`;
    };

    for (const [dateStr, dateTasks] of Object.entries(groupedTasks)) {
        const headerLabel = formatBengaliDate(dateStr);

        let groupHtml = `
            <div class="date-group" style="margin-bottom: 24px;">
                <h3 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px; padding: 0 16px;">${headerLabel}</h3>
                <div class="tasks-section" style="padding: 0 16px; display: flex; flex-direction: column; gap: 12px;">
        `;

        dateTasks.forEach(task => {
            let itemClass = '';
            let dateLabel = task.due_date;
            let showActions = false;

            if (task.status === 'completed') {
                itemClass = 'completed';
                dateLabel = `<span style="color: var(--primary);">✓ সম্পন্ন</span>`;
            } else if (task.status === 'cancelled') {
                itemClass = 'warning';
                dateLabel = `<span style="color: #EF4444;">✕ বাতিলকৃত</span>`;
            } else {
                showActions = true;
                if (task.due_date === todayStr) {
                    itemClass = 'active';
                    dateLabel = 'আজকের কাজ';
                } else if (task.due_date < todayStr) {
                    itemClass = 'warning';
                    dateLabel = `মিস হয়েছে`;
                } else {
                    itemClass = 'default';
                    dateLabel = 'সামনের কাজ';
                }
            }

            let actionsHtml = '';
            if (showActions) {
                actionsHtml = `
                <div class="task-item-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn-tl-action done" onclick="markTaskDone('${task.id || ''}', this)" style="flex: 1; padding: 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid var(--border-color); background: #F1F5F9; border-radius: 8px; cursor: pointer; color: var(--text-main);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg> সম্পন্ন
                    </button>
                    <button class="btn-tl-action reschedule" onclick="rescheduleTask('${task.id || ''}')" style="flex: 1; padding: 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid var(--border-color); background: #F1F5F9; border-radius: 8px; cursor: pointer; color: var(--text-main);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> সময় পরিবর্তন
                    </button>
                    <button class="btn-tl-action cancel" onclick="cancelTask('${task.id || ''}')" style="flex: 1; padding: 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid var(--border-color); background: #FFF1F2; border-radius: 8px; cursor: pointer; color: #EF4444;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> বাতিল
                    </button>
                </div>`;
            } else {
                actionsHtml = `
                <div class="task-item-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn-tl-action reactivate" onclick="reactivateTask('${task.id || ''}')" style="flex: 1; padding: 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px dashed var(--border-color); background: transparent; border-radius: 8px; cursor: pointer; color: var(--text-main);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="16 1 21 5 16 9"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><polyline points="8 23 3 19 8 15"></polyline></svg> পরিবর্তন করুন
                    </button>
                </div>`;
            }

            groupHtml += `
                <div class="ld-task-item ${itemClass}" style="position: relative; padding-left: 0; display: block; background: #fff; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--text-main);">${task.title}</h4>
                        <span style="font-size: 11px; padding: 4px 8px; border-radius: 8px; background: ${itemClass === 'completed' ? '#ECFDF5' : (itemClass === 'active' ? '#EEF2FF' : (itemClass === 'warning' ? '#FEF2F2' : '#F8FAFC'))}; color: ${itemClass === 'completed' ? '#059669' : (itemClass === 'active' ? '#4F46E5' : (itemClass === 'warning' ? '#DC2626' : '#64748B'))}; font-weight: 600;">${dateLabel}</span>
                    </div>
                    ${task.description ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-muted); line-height: 1.4;">${task.description}</p>` : ''}
                    ${actionsHtml}
                </div>
            `;
        });

        groupHtml += `
                </div>
            </div>
        `;

        tlContainer.innerHTML += groupHtml;
    }
}

function renderResourcesTab(resJsonStr) {
    const resContainer = document.getElementById('render-resources');

    let resources = [];
    try {
        resources = JSON.parse(resJsonStr || '[]');
    } catch (e) { }

    const grouped = {
        'seed_or_sapling': { title: 'বীজ বা চারা', items: [] },
        'fertilizer': { title: 'সার ব্যবস্থাপনা', items: [] },
        'pesticide': { title: 'বালাইনাশক ও ঔষধ', items: [] },
        'irrigation': { title: 'সেচ', items: [] },
        'labor_and_other': { title: 'শ্রমিক ও অন্যান্য', items: [] }
    };

    let needsSave = false;
    resources.forEach((r, idx) => {
        if (!r.id) {
            r.id = 'res_' + idx + '_' + Math.random().toString(36).substr(2, 5);
            needsSave = true;
        }
        const cat = r.category || 'labor_and_other';
        if (grouped[cat]) grouped[cat].items.push(r);
        else grouped['labor_and_other'].items.push(r);
    });

    if (needsSave) {
        activeCrop.resources_state_json = JSON.stringify(resources);
        saveCropState();
    }

    resContainer.innerHTML = '';

    if (resources.length === 0) {
        resContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো রিসোর্স পাওয়া যায়নি।</p>';
    } else {
        for (const [key, group] of Object.entries(grouped)) {
            if (group.items.length > 0) {
                resContainer.innerHTML += `
                <div style="margin-top: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <h4 style="font-size: 14px; font-weight: 700; color: var(--primary-dark); margin: 0; background: var(--primary-light); padding: 4px 10px; border-radius: 12px;">${group.title}</h4>
                    <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
                </div>`;

                group.items.forEach((res) => {
                    const isBought = res.status === 'bought';
                    const cat = res.category || 'labor_and_other';
                    resContainer.innerHTML += `
                        <div class="resource-check-item ${isBought ? 'bought' : ''}" style="margin-bottom: 12px; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; background: ${isBought ? '#F8FAFC' : 'white'};" data-id="${res.id}">
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <input type="checkbox" class="res-checkbox" onchange="toggleResourceCheck('${res.id}', this)" ${isBought ? 'checked' : ''} style="margin-top: 4px; transform: scale(1.2);">
                                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                                    <select class="res-category-select" style="font-size: 11px; padding: 4px; border: 1px solid var(--border-color); border-radius: 4px; background: #f8fafc; color: var(--text-muted); width: fit-content; outline: none; margin-bottom: 2px;" ${isBought ? 'disabled' : ''} onchange="updateResourceCategory('${res.id}', this.value)">
                                        <option value="seed_or_sapling" ${cat === 'seed_or_sapling' ? 'selected' : ''}>বীজ বা চারা</option>
                                        <option value="fertilizer" ${cat === 'fertilizer' ? 'selected' : ''}>সার ব্যবস্থাপনা</option>
                                        <option value="pesticide" ${cat === 'pesticide' ? 'selected' : ''}>বালাইনাশক ও ঔষধ</option>
                                        <option value="irrigation" ${cat === 'irrigation' ? 'selected' : ''}>সেচ</option>
                                        <option value="labor_and_other" ${cat === 'labor_and_other' ? 'selected' : ''}>শ্রমিক ও অন্যান্য</option>
                                    </select>
                                    <h4 class="res-title" style="margin: 0; font-size: 15px; color: var(--text-main); font-weight: 600;">
                                      <input type="text" class="res-name-input" value="${escapeHtml(res.name)}" placeholder="নাম (যেমন: সার)" style="border: none; outline: none; background: transparent; width: 100%; font-weight: inherit; font-size: inherit; color: inherit; padding: 0;" ${isBought ? 'readonly' : ''} onchange="updateResourceData('${res.id}', 'name', this.value)">
                                    </h4>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <div style="flex: 1;">
                                            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px;">পরিমাণ</label>
                                            <input type="text" class="res-amount-input" value="${escapeHtml(res.amount || '')}" placeholder="যেমন: ২ কেজি" style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" ${isBought ? 'readonly' : ''} onchange="updateResourceData('${res.id}', 'amount', this.value)">
                                        </div>
                                        <div style="flex: 1;">
                                            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px;">খরচ (৳)</label>
                                            <input type="number" class="res-cost-input" value="${res.estimated_cost_bdt || 0}" placeholder="টাকা" style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" ${isBought ? 'readonly' : ''} onchange="updateResourceData('${res.id}', 'estimated_cost_bdt', this.value)">
                                        </div>
                                    </div>
                                </div>
                                <button type="button" onclick="deleteLocalResource('${res.id}')" style="background: none; border: none; color: var(--danger); outline: none; cursor: pointer; padding: 4px; display: ${isBought ? 'none' : 'block'};" title="বাতিল করুন">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
        }
    }

    // Bottom add button code removed, as feature migrated to header
}

window.renderFinanceTab = async function() {
    const finContainer = document.getElementById('render-finance');
    finContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">ডাটা লোড হচ্ছে...</p>';
    
    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/crops/${activeCrop.id}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        let txs = [];
        if (data.success) {
            txs = data.transactions || [];
        }

        let totalIncome = 0;
        let totalExpense = 0;

        txs.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount_bdt;
            if (t.type === 'expense') totalExpense += t.amount_bdt;
        });

        // Update top-level snapshot if elements exist
        const costEl = document.getElementById('current-cost-display');
        const revEl = document.getElementById('current-rev-display');
        if (costEl) costEl.textContent = `৳ ${totalExpense}`;
        if (revEl) {
            // Net profit = income - expense
            const netProfit = totalIncome - totalExpense;
            revEl.textContent = `৳ ${netProfit}`;
            revEl.style.color = netProfit >= 0 ? '#10B981' : '#EF4444'; // green if positive, red if negative
            revEl.parentElement.querySelector('.ld-info-label').textContent = 'নেট ব্যালেন্স';
        }

        if (txs.length === 0) {
            finContainer.innerHTML = `
                <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                        <div style="text-align: center; flex: 1; border-right: 1px solid var(--border-color);">
                            <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 4px 0;">মোট আয়</p>
                            <h3 style="font-size: 18px; color: #10B981; margin: 0; font-weight: 700;">৳ ০</h3>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 4px 0;">মোট ব্যয়</p>
                            <h3 style="font-size: 18px; color: #EF4444; margin: 0; font-weight: 700;">৳ ০</h3>
                        </div>
                    </div>
                    <p style="text-align:center; color: var(--text-muted); font-size: 13px; margin: 0;">কোনো ট্রানজ্যাকশন পাওয়া যায়নি।</p>
            `;
            return;
        }

        let listHtml = txs.map(t => {
            const isInc = t.type === 'income';
            const iconColor = isInc ? '#10B981' : '#EF4444';
            const iconBg = isInc ? '#D1FAE5' : '#FEE2E2';
            const sign = isInc ? '+' : '-';
            const dateStr = t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : 'অজানা';
            
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 20px; background: ${iconBg}; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                            ${isInc ? 
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>' : 
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>'}
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-main);">${escapeHtml(t.description || t.category || (isInc ? 'আয়' : 'ব্যয়'))}</h4>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-muted);">${dateStr}</p>
                        </div>
                    </div>
                    <div>
                        <span style="font-weight: 700; font-size: 15px; color: ${iconColor};">${sign}৳${t.amount_bdt}</span>
                    </div>
                </div>
            `;
        }).join('');

        finContainer.innerHTML = `
            <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between;">
                    <div style="text-align: center; flex: 1; border-right: 1px solid var(--border-color);">
                        <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 4px 0;">মোট আয়</p>
                        <h3 style="font-size: 18px; color: #10B981; margin: 0; font-weight: 700;">৳ ${totalIncome}</h3>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 4px 0;">মোট ব্যয়</p>
                        <h3 style="font-size: 18px; color: #EF4444; margin: 0; font-weight: 700;">৳ ${totalExpense}</h3>
                    </div>
                </div>
            </div>
            
            <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
                <h4 style="margin: 0; padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid var(--border-color); font-size: 14px; font-weight: 700; color: var(--text-main);">লেনদেনের তালিকা</h4>
                ${listHtml}
            </div>
        `;
    } catch(e) {
        console.error("Failed to load transactions", e);
        finContainer.innerHTML = '<p style="text-align:center; color: var(--danger); padding: 20px;">ডাটা লোড করতে সমস্যা হয়েছে।</p>';
    }
};

window.saveManualTransaction = async function() {
    const modal = document.getElementById('addTransactionModal');
    const type = modal.querySelector('input[name="tr_type"][value="income"]').checked ? 'income' : 'expense';
    const amountVal = parseFloat(modal.querySelector('input[type="number"]').value) || 0;
    const descVal = modal.querySelector('input[type="text"]').value.trim();

    if(amountVal <= 0) {
        alert("দয়া করে সঠিক টাকার পরিমাণ লিখুন।");
        return;
    }

    const btn = document.getElementById('saveTransaction');
    if(btn) btn.disabled = true;

    try {
        const token = localStorage.getItem('farmer_jwt');
        const payload = {
            type: type,
            category: 'ম্যানুয়াল এন্ট্রি',
            amount_bdt: amountVal,
            description: descVal || (type === 'income' ? 'আয়' : 'ব্যয়')
        };

        const res = await fetch(`${API_URL}/api/crops/${activeCrop.id}/transactions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // clear inputs
            modal.querySelector('input[type="number"]').value = '';
            modal.querySelector('input[type="text"]').value = '';
            
            // Refresh dashboard
            renderFinanceTab();
        } else {
            alert('Error: ' + data.error);
        }
    } catch(e) {
        console.error(e);
        alert("সার্ভার এরর।");
    } finally {
        if(btn) btn.disabled = false;
    }
};

window.switchGuidelineTab = function (paneId, btnEl) {
    const modal = btnEl.closest('.calendar-content');
    modal.querySelectorAll('.ld-tab-btn').forEach(btn => btn.classList.remove('active'));
    modal.querySelectorAll('.guideline-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none';
    });

    btnEl.classList.add('active');
    const targetPane = document.getElementById(paneId);
    if (targetPane) {
        targetPane.classList.add('active');
        targetPane.style.display = 'block';
    }
};

window.renderGuidelineModal = async function () {
    const guidelineContainer = document.getElementById('modal-guideline-content');
    const riskContainer = document.getElementById('modal-risk-content');
    const financeContainer = document.getElementById('modal-finance-content');
    if (!guidelineContainer) return;

    if (!guidelineContainer.innerHTML.includes('লোড হচ্ছে') && guidelineContainer.innerHTML.trim() !== '') {
        guidelineContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">লোড হচ্ছে...</p>';
        if (riskContainer) riskContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">লোড হচ্ছে...</p>';
        if (financeContainer) financeContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">লোড হচ্ছে...</p>';
    }

    const toBngDigits = (num) => String(num).split('').map(d => ({ '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' }[d] || d)).join('');

    // Fetch master cache directly using the public endpoint (requires worker deployment)
    let masterCache = { timeline_json: null, risks_json: null };
    try {
        const token = localStorage.getItem('farmer_jwt');

        let cName = activeCrop.crop_name || '';
        let vName = activeCrop.variety_name || cName;

        // Extract variety if encoded in parenthesis "তরমুজ (পদ্মা)"
        if (!activeCrop.variety_name && cName.includes('(') && cName.includes(')')) {
            const openIdx = cName.indexOf('(');
            const closeIdx = cName.indexOf(')');
            vName = cName.substring(openIdx + 1, closeIdx).trim();
            cName = cName.substring(0, openIdx).trim();
        }

        const cropQuery = encodeURIComponent(cName);
        const varietyQuery = encodeURIComponent(vName);

        const res = await fetch(`${API_URL}/api/public/cache?crop=${cropQuery}&variety=${varietyQuery}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await res.json();
        if (resData.success && resData.cache) {
            masterCache = resData.cache;
        } else {
            console.warn("Cache miss for:", cName, vName);
        }
    } catch (e) {
        console.error("Failed to fetch master cache:", e);
    }

    // 1. Guidelines
    let tasks = [];
    try {
        const sourceJson = masterCache.timeline_json || activeCrop.timeline_json;
        if (sourceJson) {
            const tlJson = JSON.parse(sourceJson);
            if (Array.isArray(tlJson)) {
                tasks = tlJson;
            } else {
                tasks = tlJson.guideline || tlJson.timeline || [];
            }
        }

        // Final fallback if the crop was completely uncached
        if (tasks.length === 0 && activeCrop.tasks_state_json) {
            tasks = JSON.parse(activeCrop.tasks_state_json);
        }
    } catch (e) { }

    if (tasks.length === 0) {
        guidelineContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো নির্দেশিকা পাওয়া যায়নি।</p>';
    } else {
        tasks.sort((a, b) => {
            if (a.day_offset !== undefined && b.day_offset !== undefined) return a.day_offset - b.day_offset;
            const dA = a.due_date ? new Date(a.due_date) : 0;
            const dB = b.due_date ? new Date(b.due_date) : 0;
            return dA - dB;
        });

        const getBgColor = (t) => {
            if (!t) return '#F1F5F9';
            t = t.toLowerCase();
            if (t.includes('বীজ') || t.includes('চারা') || t.includes('জমি') || t.includes('প্রস্তুত')) return '#dcfce7';
            if (t.includes('বপন') || t.includes('রোপণ') || t.includes('সেচ')) return '#dbeafe';
            if (t.includes('সার') || t.includes('পরিচর্যা') || t.includes('আগাছা') || t.includes('খুঁটি')) return '#fef9c3';
            if (t.includes('রোগ') || t.includes('পোকা') || t.includes('বালাই')) return '#fee2e2';
            if (t.includes('সংগ্রহ') || t.includes('হার্ভেস্ট') || t.includes('ফসল')) return '#ffedd5';
            return '#F1F5F9';
        };

        const getTextColor = (t) => {
            if (!t) return 'var(--text-main)';
            t = t.toLowerCase();
            if (t.includes('বীজ') || t.includes('চারা') || t.includes('জমি') || t.includes('প্রস্তুত')) return '#166534';
            if (t.includes('বপন') || t.includes('রোপণ') || t.includes('সেচ')) return '#1e40af';
            if (t.includes('সার') || t.includes('পরিচর্যা') || t.includes('আগাছা') || t.includes('খুঁটি')) return '#854d0e';
            if (t.includes('রোগ') || t.includes('পোকা') || t.includes('বালাই')) return '#991b1b';
            if (t.includes('সংগ্রহ') || t.includes('হার্ভেস্ট') || t.includes('ফসল')) return '#9a3412';
            return 'var(--text-main)';
        };

        let guidelineHtml = `<div style="padding: 8px; display: flex; flex-direction: column; gap: 12px;">`;
        tasks.forEach((task, idx) => {
            const title = task.title || task.task_name || 'ধাপ';
            const desc = task.description || '';
            const bg = getBgColor(title);
            const textCol = getTextColor(title);
            // Admin panel uses idx + 1 directly instead of bangla digits? We will use stepNum just for localization, but logic is same
            const stepNum = toBngDigits(idx + 1);

            guidelineHtml += `
                <div style="background: white; border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start; text-align: left;">
                    <div style="background: ${bg}; color: ${textCol}; font-weight: 700; width: 28px; height: 28px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.05);">${stepNum}</div>
                    <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8px;">
                        <div style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 13px; font-weight: 600; color: var(--text-main);">${title}</div>
                        <div style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 13px; color: var(--text-muted); line-height: 1.5; white-space: pre-wrap;">${desc}</div>
                    </div>
                </div>
            `;
        });
        guidelineHtml += `</div>`;
        guidelineContainer.innerHTML = guidelineHtml;
    }

    // 2. Risks
    if (riskContainer) {
        let risks = [];
        try {
            const risksSource = masterCache.risks_json || activeCrop.risks_json || '[]';
            risks = JSON.parse(risksSource);
        } catch (e) { }

        if (risks.length === 0) {
            riskContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো ঝুঁকি পাওয়া যায়নি।</p>';
        } else {
            let riskHtml = `<div style="padding: 8px; display: flex; flex-direction: column; gap: 12px;">`;
            risks.forEach((risk, idx) => {
                const title = risk.risk_name || risk.message || risk.title || 'ঝুঁকি';
                // Find matching type styles from Admin panel
                // Admin uses: border: 1px solid #FECDD3, select -> bg: #FFF1F2, color: #BE185D
                const isWarning = risk.type === 'warning';
                const isInfo = risk.type === 'info';

                const boxBorder = isWarning ? '#FECDD3' : (isInfo ? '#BFDBFE' : '#FDE68A');
                const badgeBg = isWarning ? '#FFF1F2' : (isInfo ? '#EFF6FF' : '#FEF3C7');
                const badgeColor = isWarning ? '#BE185D' : (isInfo ? '#1D4ED8' : '#B45309');

                let typeLabel = 'Warning';
                if (risk.type === 'warning') typeLabel = 'Warning';
                else if (risk.type === 'info') typeLabel = 'Info';
                else if (risk.type === 'lifespan') typeLabel = 'Lifespan';
                else typeLabel = risk.type || 'সতর্কতা';

                riskHtml += `
                    <div style="background: white; border: 1px solid ${boxBorder}; padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start; text-align: left;">
                        <div style="padding: 8px; border: 1px solid ${boxBorder}; border-radius: 6px; font-size: 13px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 600; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">${typeLabel}</div>
                        <div style="flex-grow: 1; padding: 8px; border: 1px solid ${boxBorder}; border-radius: 6px; font-size: 13px; color: var(--text-main); white-space: pre-wrap; line-height: 1.5;">${title}</div>
                    </div>
                `;
            });
            riskHtml += `</div>`;
            riskContainer.innerHTML = riskHtml;
        }
    }

    // 3. Finance (AI Projected)
    if (financeContainer) {
        let masterCacheReady = masterCache && masterCache.resources_json;
        if (!masterCacheReady) {
            financeContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো হিসাব-নিকাশ পাওয়া যায়নি।</p>';
        } else {
            const bnStr = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
            const area = window.currentFarmArea || 1;
            const yieldPerShotangsho = parseFloat(masterCache.base_yield_kg) || 0;
            const pricePerKg = parseFloat(masterCache.crop_market_price_bdt) || 0;
            
            const totalYield = Math.round(yieldPerShotangsho * area);
            const totalRevenue = Math.round(totalYield * pricePerKg);

            let resources = [];
            try { resources = JSON.parse(masterCache.resources_json || '[]'); } catch(e){}

            const translateUnit = str => {
                if (!str || str === '-') return '-';
                return str.replace(/kg/gi, 'কেজি')
                          .replace(/gm/gi, 'গ্রাম')
                          .replace(/litters|litter/gi, 'লিটার')
                          .replace(/l|L/g, 'লিটার')
                          .replace(/ml/gi, 'মিলি')
                          .replace(/pcs/gi, 'টি')
                          .replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
            };

            const grouped = {
                'seed_or_sapling': { title: 'বীজ বা চারা', icon: '🌱', items: [] },
                'fertilizer': { title: 'সার ব্যবস্থাপনা', icon: '🌿', items: [] },
                'pesticide': { title: 'বালাইনাশক ও ঔষধ', icon: '🛡️', items: [] },
                'irrigation': { title: 'সেচ ব্যবস্থাপনা', icon: '💧', items: [] },
                'labor_and_other': { title: 'শ্রমিক ও অন্যান্য', icon: '👨🏽‍🌾', items: [] }
            };

            let totalExpectedCost = 0;
            resources.forEach(r => {
                const scaledCost = Math.round((parseFloat(r.estimated_cost_bdt) || 0) * area);
                totalExpectedCost += scaledCost;
                
                const cat = r.category || 'labor_and_other';
                let rScaled = {...r, estimated_cost_bdt: scaledCost};
                
                let amtStr = (r.amount || '-').toString();
                let amtNumStr = amtStr.replace(/[^\d\.]/g, '');
                if(amtNumStr && amtNumStr.trim() !== '') {
                   let scaledAmt = (parseFloat(amtNumStr) * area);
                   scaledAmt = scaledAmt % 1 !== 0 ? scaledAmt.toFixed(2) : scaledAmt;
                   rScaled.amountScale = amtStr.replace(amtNumStr, scaledAmt);
                } else {
                   rScaled.amountScale = amtStr;
                }

                if (grouped[cat]) grouped[cat].items.push(rScaled);
                else grouped['labor_and_other'].items.push(rScaled);
            });

            const netProfit = totalRevenue - totalExpectedCost;

            let html = `
                <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 24px; font-family: 'Noto Sans Bengali', sans-serif;">
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: var(--primary-dark); font-weight: 700; display:flex; align-items:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        সম্ভাব্য ফলন ও আয় (AI প্রোজেক্টেড - ${bnStr(area)} শতাংশ)
                    </h3>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                        <span style="color: var(--text-muted); font-size: 14px;">আনুমানিক ফলন:</span>
                        <strong style="color: var(--text-main); font-size: 15px;">${bnStr(totalYield)} কেজি</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                        <span style="color: var(--text-muted); font-size: 14px;">আনুমানিক বাজারদর:</span>
                        <strong style="color: var(--text-main); font-size: 15px;">৳ ${bnStr(pricePerKg)} / কেজি</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                        <span style="color: var(--text-muted); font-size: 14px;">সর্বমোট সম্ভাব্য আয়:</span>
                        <strong style="color: #10B981; font-size: 15px;">${bnStr(totalRevenue)} টাকা</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-muted); font-size: 14px;">নিট বা সম্ভাব্য লাভ:</span>
                        <strong style="color: ${netProfit >= 0 ? '#4F46E5' : '#EF4444'}; font-size: 18px; font-weight: 800;">${bnStr(netProfit)} টাকা</strong>
                    </div>
                </div>

                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: var(--text-main); font-weight: 700; display:flex; align-items:center; gap:8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="2" x2="12" y2="22"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    সম্ভাব্য খরচের তালিকা (AI প্রোজেক্টেড)
                </h3>
            `;

            for (const [key, group] of Object.entries(grouped)) {
                if (group.items.length > 0) {
                    html += `
                    <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); font-family: 'Noto Sans Bengali', sans-serif;">
                        <div style="background: #F8FAFC; padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 16px;">${group.icon}</span>
                            <h4 style="margin: 0; font-size: 14px; color: var(--text-main); font-weight: 700;">${group.title}</h4>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                                    <th style="text-align: left; padding: 10px 16px; font-weight: 600;">উপাদানের নাম</th>
                                    <th style="text-align: right; padding: 10px 16px; font-weight: 600;">পরিমাণ</th>
                                    <th style="text-align: right; padding: 10px 16px; font-weight: 600;">মূল্য (৳)</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    group.items.forEach(r => {
                        const amountBn = translateUnit(r.amountScale);
                        const costBn = bnStr(r.estimated_cost_bdt);
                        html += `
                                <tr style="border-bottom: 1px dashed var(--border-color);">
                                    <td style="padding: 10px 16px; color: var(--text-main);">${r.name}</td>
                                    <td style="text-align: right; padding: 10px 16px; color: var(--text-muted);">${amountBn}</td>
                                    <td style="text-align: right; padding: 10px 16px; color: var(--text-main); font-weight: 500;">${costBn}</td>
                                </tr>
                        `;
                    });
                    
                    html += `
                            </tbody>
                        </table>
                    </div>
                    `;
                }
            }

            html += `
                <div style="background: #FEF2F2; border: 1px solid #FECDD3; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-family: 'Noto Sans Bengali', sans-serif;">
                    <span style="font-size: 14px; font-weight: 700; color: #9F1239;">সর্বমোট সম্ভাব্য খরচ (৳):</span>
                    <strong style="font-size: 18px; color: #BE185D;">${bnStr(totalExpectedCost)}</strong>
                </div>
                <p style="text-align: center; font-size: 12px; color: var(--text-muted); margin-top: 12px;">(এখানে দেখানো খরচ এবং আয় শুধুমাত্র এআই-প্রজেক্টেড। আপনার নিজস্ব আয়-ব্যয় ট্রাক করতে মেইন পেইজের "আয়-ব্যয়" ট্যাবে যান।)</p>
            `;
            financeContainer.innerHTML = html;
        }
    }
};

window.markTaskDone = function (taskId, btnEl) {
    if (!activeCrop || !activeCrop.tasks_state_json) return;
    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json);
        const taskObj = tasks.find(t => t.id === taskId);
        if (taskObj) {
            taskObj.status = 'completed';
            activeCrop.tasks_state_json = JSON.stringify(tasks);
            saveCropState();
            renderTasksTab(activeCrop.tasks_state_json);
        }
    } catch (e) {
        console.error(e);
    }
};

window.cancelTask = function (taskId) {
    if (!confirm('আপনি কি এই কাজটি বাতিল করতে চান?')) return;
    if (!activeCrop || !activeCrop.tasks_state_json) return;
    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json);
        const taskObj = tasks.find(t => t.id === taskId);
        if (taskObj) {
            taskObj.status = 'cancelled';
            activeCrop.tasks_state_json = JSON.stringify(tasks);
            saveCropState();
            renderTasksTab(activeCrop.tasks_state_json);
        }
    } catch (e) { console.error(e); }
};

window.reactivateTask = function (taskId) {
    if (!activeCrop || !activeCrop.tasks_state_json) return;
    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json);
        const taskObj = tasks.find(t => t.id === taskId);
        if (taskObj) {
            taskObj.status = 'pending';
            activeCrop.tasks_state_json = JSON.stringify(tasks);
            saveCropState();
            renderTasksTab(activeCrop.tasks_state_json);
        }
    } catch (e) {
        console.error(e);
    }
};

window.currentRescheduleTaskId = null;

window.rescheduleTask = function (taskId) {
    window.currentRescheduleTaskId = taskId;
    let oldDate = new Date().toISOString().split('T')[0];
    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json);
        const taskObj = tasks.find(t => t.id === taskId);
        if (taskObj && taskObj.due_date) {
            oldDate = taskObj.due_date;
        }
    } catch(e){}
    document.getElementById('selectedPlantingDate').value = oldDate;
    
    renderDatePickerGrid('selectedPlantingDate', oldDate);
    
    const overlay = document.getElementById('datePickerOverlay');
    const content = document.getElementById('datePickerContent');
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        content.style.bottom = '0';
    }, 10);
};

window.closeDatePicker = function (e) {
    if (e && e.target.id !== 'datePickerOverlay' && !e.target.classList.contains('close-sheet')) return;
    const overlay = document.getElementById('datePickerOverlay');
    const content = document.getElementById('datePickerContent');
    overlay.style.opacity = '0';
    content.style.bottom = '-100%';
    setTimeout(() => {
        overlay.style.display = 'none';
        window.currentRescheduleTaskId = null;
    }, 300);
};

window.openDatePickerFor = function(targetId) {
    if (document.activeElement) document.activeElement.blur();
    window.currentRescheduleTaskId = null;
    window.calendarTargetId = targetId;
    const todayStr = new Date().toISOString().split('T')[0];
    const targetEl = document.getElementById(targetId);
    let viewDate = todayStr;
    if (targetEl && targetEl.dataset.value) {
        viewDate = targetEl.dataset.value;
    }
    
    renderDatePickerGrid(targetId, viewDate);
    
    const overlay = document.getElementById('datePickerOverlay');
    const content = document.getElementById('datePickerContent');
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        content.style.bottom = '0';
    }, 10);
};

window.confirmDateSelection = function () {
    const newDate = document.getElementById('selectedPlantingDate').value;
    if (window.currentRescheduleTaskId) {
        try {
            let tasks = JSON.parse(activeCrop.tasks_state_json);
            const taskObj = tasks.find(t => t.id === window.currentRescheduleTaskId);
            if (taskObj) {
                taskObj.due_date = newDate;
                tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
                activeCrop.tasks_state_json = JSON.stringify(tasks);
                saveCropState();
                renderTasksTab(activeCrop.tasks_state_json);
            }
        } catch (e) { console.error(e); }
    } else if (window.calendarTargetId) {
        // Fallback for custom loss inputs if needed
        const targetEl = document.getElementById(window.calendarTargetId);
        if (targetEl) {
            const EN_TO_BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
            const toBngDigits = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
            const dObj = new Date(newDate);
            targetEl.textContent = `${toBngDigits(dObj.getDate())} ${EN_TO_BN_MONTHS[dObj.getMonth()]} ${toBngDigits(dObj.getFullYear())}`;
            targetEl.dataset.value = newDate;
        }
    }
    window.closeDatePicker();
};

window.currentCalendarViewDate = null;
window.currentCalendarInputId = null;

window.renderDatePickerGrid = function(inputId, initialDateStr = null, resetView = true) {
    window.currentCalendarInputId = inputId;
    
    if (resetView) {
        if (initialDateStr) {
            const parsed = new Date(initialDateStr);
            if (!isNaN(parsed)) {
                window.currentCalendarViewDate = parsed;
            } else {
                window.currentCalendarViewDate = new Date();
            }
        } else {
            window.currentCalendarViewDate = new Date();
        }
    } else if (!window.currentCalendarViewDate) {
        window.currentCalendarViewDate = new Date();
    }

    const calendarDays = document.getElementById('calendarDays');
    const monthLabel = document.getElementById('calendarMonthLabel');
    if (!calendarDays || !monthLabel) return;
    calendarDays.innerHTML = '';
    
    const EN_TO_BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const toBngDigits = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
    
    const realToday = new Date();
    let selectedDateStr = document.getElementById(inputId)?.value || initialDateStr;
    
    const currentMonth = window.currentCalendarViewDate.getMonth();
    const currentYear = window.currentCalendarViewDate.getFullYear();
    
    monthLabel.textContent = `${EN_TO_BN_MONTHS[currentMonth]} ${toBngDigits(currentYear)}`;
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        calendarDays.appendChild(emptyDiv);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'cal-day';
        dayEl.textContent = toBngDigits(i);
        
        const thisCellDate = new Date(currentYear, currentMonth, i);
        thisCellDate.setHours(0,0,0,0);
        const realTodayCopy = new Date(realToday);
        realTodayCopy.setHours(0,0,0,0);
        
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(i).padStart(2, '0');
        const cellDateStr = `${currentYear}-${monthStr}-${dayStr}`;
        
        if (thisCellDate < realTodayCopy) {
            dayEl.classList.add('past');
        }
        
        // Allow clicking on any date, past or future
        dayEl.addEventListener('click', () => {
            document.querySelectorAll('#calendarDays .cal-day').forEach(el => el.classList.remove('selected'));
            dayEl.classList.add('selected');
            const targetInput = document.getElementById(inputId);
            if (targetInput) targetInput.value = cellDateStr;
        });
        
        if (selectedDateStr === cellDateStr) {
            dayEl.classList.add('selected');
            const targetInput = document.getElementById(inputId);
            if (targetInput) targetInput.value = cellDateStr;
        }
        
        calendarDays.appendChild(dayEl);
    }
};

window.changeCalendarMonth = function(offset) {
    if (!window.currentCalendarViewDate) return;
    window.currentCalendarViewDate.setMonth(window.currentCalendarViewDate.getMonth() + offset);
    window.renderDatePickerGrid(window.currentCalendarInputId, null, false);
};

window.saveNewCustomTask = function() {
    const title = document.getElementById('customTaskTitle').value.trim();
    const desc = document.getElementById('customTaskDesc').value.trim();
    if(!title) {
        alert('দয়া করে কাজের নামটি লিখুন।');
        return;
    }
    const dateSpan = document.getElementById('customStepDate');
    let taskDateStr = new Date().toISOString().split('T')[0];
    if (dateSpan && dateSpan.dataset.value) {
        taskDateStr = dateSpan.dataset.value;
    }

    const newTask = {
        id: 'cust_' + Date.now(),
        task_name: title,
        title: title,
        description: desc,
        due_date: taskDateStr,
        status: 'pending'
    };
    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
        tasks.push(newTask);
        tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        activeCrop.tasks_state_json = JSON.stringify(tasks);
        saveCropState();
        renderTasksTab(activeCrop.tasks_state_json);
        document.getElementById('customTaskTitle').value = '';
        document.getElementById('customTaskDesc').value = '';
        document.getElementById('customStepModal').classList.remove('active');
        document.body.style.overflow = '';
    } catch(e) {
        console.error(e);
    }
};

window.saveNewResourceFromModal = function() {
    const cat = document.getElementById('newResourceCategory').value;
    const name = document.getElementById('newResourceName').value.trim();
    const amount = document.getElementById('newResourceAmount').value.trim();
    const cost = parseFloat(document.getElementById('newResourceCost').value) || 0;
    
    if(!name) {
        alert("দয়া করে রিসোর্সের নাম লিখুন।");
        return;
    }
    
    try {
        let resources = JSON.parse(activeCrop.resources_state_json || '[]');
        resources.push({
            id: 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            category: cat,
            name: name,
            amount: amount,
            estimated_cost_bdt: cost,
            status: 'pending' // Default new resources are not bought
        });
        
        activeCrop.resources_state_json = JSON.stringify(resources);
        saveCropState();
        renderResourcesTab(activeCrop.resources_state_json);
        
        // Clear & close
        document.getElementById('newResourceName').value = '';
        document.getElementById('newResourceAmount').value = '';
        document.getElementById('newResourceCost').value = '';
        document.getElementById('addResourceModal').classList.remove('active');
        document.body.style.overflow = '';
        
    } catch(e) {
        console.error(e);
        alert('রিসোর্স সেভ করতে সমস্যা হয়েছে।');
    }
};
