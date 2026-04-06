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
            const farmNamePill = document.getElementById('farmNamePill');
            const farmAreaPill = document.getElementById('farmAreaPill');

            if (farmNamePill) farmNamePill.textContent = resData.farm.name;
            if (farmAreaPill) farmAreaPill.textContent = `${resData.farm.area_shotangsho} শতাংশ`;
            window.currentFarmArea = parseFloat(resData.farm.area_shotangsho) || 1;

            // Connect land history button
            const btnHistory = document.getElementById('btnLandHistory');
            if (btnHistory) {
                btnHistory.onclick = () => window.location.href = `land_history.html?id=${currentFarmId}`;
            }

            // Connect Crop Doctor UI with explicit scope mapping
            const btnDisease = document.getElementById('btnDisease');
            if (btnDisease) {
                btnDisease.onclick = () => {
                   if(window.activeCrop && window.activeCrop.id) {
                       window.location.href = `crop_doctor.html?farm_id=${currentFarmId}&crop_id=${window.activeCrop.id}`;
                   } else {
                       window.location.href = `crop_doctor.html?farm_id=${currentFarmId}`;
                   }
                };
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

            // Display Active Crop or Specific History Crop
            const urlParams = new URLSearchParams(window.location.search);
            const targetCropId = urlParams.get('crop_id');
            let targetCrop = null;

            if (targetCropId) {
                targetCrop = (resData.crops || []).find(c => String(c.id) === String(targetCropId));
            }

            if (!targetCrop) {
                const activeCrops = (resData.crops || []).filter(c => c.status !== 'Harvested');
                if (activeCrops.length > 0) {
                    targetCrop = activeCrops[0];
                }
            }

            if (targetCrop) {
                activeCrop = targetCrop;
                window.activeCrop = activeCrop;

                if (activeCrop.status === 'Harvested') {
                    document.body.classList.add('history-mode');
                }

                // Set Crop Profile
                const cropNameEl = document.getElementById('heroCropName');
                const cropStatusEl = document.querySelector('.crop-status-display');
                const plantingAgeContainer = document.querySelector('.crop-age-display');

                if (cropNameEl) {
                    let displayName = activeCrop.crop_name;
                    if (displayName && displayName.includes('(')) {
                         const match = displayName.match(/\(([^()]+)\)/g);
                         if (match && match.length > 0) {
                             let vName = match[match.length - 1].replace(/[()]/g, '').trim();
                             let baseCName = displayName.split('(')[0].trim();
                             if (vName && baseCName) displayName = `${baseCName} (${vName})`;
                         }
                    }
                    cropNameEl.textContent = displayName;
                }
                // Populate Plant/Seed Counts
                const initialCount = parseInt(activeCrop.initial_plant_count) || 0;

                // Dynamically evaluate age and pre-plant state
                let isPrePlant = false;
                
                // If the initial count is exactly 0 or no planted date, we can consider it pre-plant!
                if (initialCount === 0 || !activeCrop.planted_date) {
                    isPrePlant = true;
                }
                
                let diffDaysVal = null;
                let remainingDaysVal = null;
                if (activeCrop.planted_date && !isPrePlant) {
                    const historyMode = document.body.classList.contains('history-mode');
                    const endDate = (historyMode && activeCrop.updated_at) ? new Date(activeCrop.updated_at) : new Date();
                    const diffTime = endDate.getTime() - new Date(activeCrop.planted_date).getTime();
                    if (diffTime < 0) {
                        isPrePlant = true; // Future planting date
                        remainingDaysVal = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
                    } else {
                        diffDaysVal = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    }
                }

                const pillContainer = document.getElementById('statusPillContainer');
                if (pillContainer) {
                    if (!activeCrop.planted_date && !document.body.classList.contains('history-mode')) {
                        // strictly no planted_date -> Pre-Plant state
                        pillContainer.innerHTML = `
                            <div class="status-pill status-pre-plant" onclick="promptPlantCount()">
                                <span>🌱 রোপণ সম্পন্ন করুন (Pre-plant)</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </div>
                        `;
                    } else if (document.body.classList.contains('history-mode')) {
                        pillContainer.innerHTML = `
                            <div class="status-pill status-harvested">
                                <span>✅ রোপণ ও ফসল কর্তন সম্পন্ন</span>
                            </div>
                        `;
                    } else {
                        // If planted_date exists (even if in future), show the date with edit option
                        const EN_TO_BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
                        const toBngDigits = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
                        
                        let derivedPlantingDateStr = activeCrop.planted_date ? (activeCrop.planted_date.includes('T') ? activeCrop.planted_date.split('T')[0] : activeCrop.planted_date) : '';
                        let plantingTaskId = null;
                        
                        try {
                            const tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
                            const pTask = tasks.find(t => parseInt(t.day_offset) === 0 || t.title.includes('রোপণ') || t.title.includes('বপন') || t.title.includes('বীজতলা'));
                            if (pTask && pTask.due_date) {
                                derivedPlantingDateStr = pTask.due_date;
                                plantingTaskId = pTask.id;
                            }
                        } catch(e){}
                        
                        let plantedDateObj = derivedPlantingDateStr ? new Date(derivedPlantingDateStr) : '';
                        let formattedDate = plantedDateObj ? `${toBngDigits(plantedDateObj.getDate())} ${EN_TO_BN_MONTHS[plantedDateObj.getMonth()]}, ${toBngDigits(plantedDateObj.getFullYear())}` : '-';
                        
                        pillContainer.innerHTML = `
                            <div class="status-pill status-planted" onclick="${plantingTaskId ? `rescheduleTask('${plantingTaskId}')` : 'promptPlantCount()'}">
                                <span>🌱 রোপণ: ${formattedDate}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </div>
                        `;
                    }
                }
                if (cropStatusEl) {
                    if (document.body.classList.contains('history-mode')) {
                        cropStatusEl.innerHTML = `সফল অতীত ফসল`;
                        cropStatusEl.style.color = '#047857';
                    } else if (isPrePlant) {
                        let nextTaskTitle = 'চারা রোপণ বাকি';
                        try {
                            let tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
                            tasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
                            if (tasks.length > 0) {
                                tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
                                nextTaskTitle = tasks[0].title || nextTaskTitle;
                            }
                        } catch(e){}
                        
                        cropStatusEl.innerHTML = `পরবর্তী ধাপ: ${nextTaskTitle}`;
                        cropStatusEl.style.color = '#D97706'; // Amber color for pending
                    } else {
                        cropStatusEl.innerHTML = `${activeCrop.status}`;
                    }
                }
                // Populate Plant Count Row
                const plantCountRow = document.getElementById('plantCountRow');
                const plantCountDisplay = document.getElementById('plantCountDisplay');
                if (plantCountRow && plantCountDisplay) {
                    if (isPrePlant || initialCount === 0) {
                        plantCountRow.style.display = 'none';
                    } else {
                        plantCountRow.style.display = 'flex';
                        plantCountDisplay.textContent = `${initialCount.toLocaleString('bn-BD')} টি`;
                    }
                }
                // Update Current Phase Span instead of Hero Farm Area
                const phaseSpan = document.getElementById('currentPhaseSpan');
                if (phaseSpan) {
                    if (isPrePlant) {
                        phaseSpan.textContent = "প্রাক-রোপণ (Pre-plant)";
                    } else {
                        let age = diffDaysVal !== null ? diffDaysVal : 0;
                        if (age < 30) {
                            phaseSpan.textContent = "চারা বৃদ্ধি পর্যায় (Vegetative)";
                        } else if (age < 60) {
                            phaseSpan.textContent = "বিকাশ ও ফুল পর্যায় (Flowering)";
                        } else {
                            phaseSpan.textContent = "পরিপক্বতা বা কর্তন (Harvest)";
                        }
                    }
                }
                // Smart Planting Flow Output
                const plantCountContainer = document.getElementById('plantCountContainer');
                if (plantCountContainer) {
                    if (isPrePlant && !document.body.classList.contains('history-mode')) {
                        plantCountContainer.style.display = 'none';
                    } else {
                        plantCountContainer.style.display = 'block';
                    }
                }

                let lossCount = 0;
                try {
                    const losses = JSON.parse(activeCrop.loss_events_json || '[]');
                    losses.forEach(l => lossCount += (parseInt(l.amount) || 0));
                } catch(e) {}
                
                const currentCount = Math.max(0, initialCount - lossCount);
                
                const currentPlantSpan = document.getElementById('currentPlantSpan');
                const initialPlantSpan = document.getElementById('initialPlantSpan');
                const plantLossSpan = document.getElementById('plantLossSpan');
                
                if (currentPlantSpan) currentPlantSpan.textContent = `${currentCount}`;
                if (initialPlantSpan) initialPlantSpan.textContent = `${initialCount}`;
                if (plantLossSpan) plantLossSpan.textContent = `${lossCount} টি নষ্ট`;

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

                const currentCostEl = document.getElementById('current-cost-display');
                if (currentCostEl) currentCostEl.textContent = `৳ ${currentActiveCost}`;
                const currentRevEl = document.getElementById('current-rev-display');
                if (currentRevEl) currentRevEl.textContent = `৳ ${currentActiveIncome}`;

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
                const cropNameEl = document.querySelector('.ld-crop-text h4');
                const cropStatusEl = document.querySelector('.ld-crop-text p:nth-child(3) span');
                const plantingAgeEl = document.querySelector('.ld-crop-text p strong');
                
                if (cropNameEl) cropNameEl.textContent = "খালি জমি";
                if (cropStatusEl) cropStatusEl.textContent = "বর্তমানে কোনো ফসল নেই";
                if (plantingAgeEl && plantingAgeEl.parentElement) plantingAgeEl.parentElement.innerHTML = "--";

                const cropImg = document.querySelector('.ld-crop-img');
                if (cropImg) cropImg.src = 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=200&h=200'; // plowed field

                const cropActionBtn = document.getElementById('cropActionBtn');
                if (cropActionBtn) cropActionBtn.style.display = 'none';

                const cropProfileText = document.querySelector('.ld-crop-text');
                if (cropProfileText && !document.getElementById('addCropBtnEmpty')) {
                    const addBtn = document.createElement('button');
                    addBtn.id = 'addCropBtnEmpty';
                    addBtn.className = 'btn-primary';
                    addBtn.style.marginTop = '12px';
                    addBtn.style.padding = '8px 16px';
                    addBtn.style.fontSize = '12px';
                    addBtn.style.display = 'inline-flex';
                    addBtn.style.alignItems = 'center';
                    addBtn.style.gap = '6px';
                    addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> নতুন ফসল যুক্ত করুন';
                    addBtn.onclick = () => window.location.href = `add_crop.html?farm_id=${currentFarmId}`;
                    cropProfileText.appendChild(addBtn);
                }

                const currentCostEl = document.getElementById('current-cost-display');
                if (currentCostEl) currentCostEl.textContent = '৳ 0';
                
                const currentRevEl = document.getElementById('current-rev-display');
                if (currentRevEl) currentRevEl.textContent = '৳ 0';

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
        const fetchUrl = activeCrop ? `${API_URL}/api/public/crop-scans?farm_id=${currentFarmId}&crop_id=${activeCrop.id}&limit=10` : `${API_URL}/api/public/crop-scans?farm_id=${currentFarmId}&limit=10`;
        const response = await fetch(fetchUrl, {
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

window.currentTaskFilter = window.currentTaskFilter || 'pending';
window.setTaskFilter = function(filterStr) {
    window.currentTaskFilter = filterStr;
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        if(chip.getAttribute('data-filter') === filterStr) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
    if(typeof activeCrop !== 'undefined' && activeCrop && activeCrop.tasks_state_json) {
        renderTasksTab(activeCrop.tasks_state_json);
    }
};

function renderTasksTab(tasksJsonStr) {
    const tlContainer = document.getElementById('render-tasks');

    let allTasks = [];
    try {
        allTasks = JSON.parse(tasksJsonStr || '[]');
    } catch (e) { }

    if (allTasks.length === 0) {
        tlContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো কাজ পাওয়া যায়নি।</p>';
        return;
    }

    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    let tasks = allTasks.filter(task => {
        const taskDateObj = new Date(task.due_date);
        taskDateObj.setHours(0,0,0,0);
        
        let status = task.status || 'pending';
        if (task.is_completed) status = 'completed';

        if (window.currentTaskFilter === 'all') return true;
        if (window.currentTaskFilter === 'completed') return status === 'completed';
        if (window.currentTaskFilter === 'cancelled') return status === 'cancelled';
        if (window.currentTaskFilter === 'missed') return status === 'pending' && taskDateObj < todayDate;
        if (window.currentTaskFilter === 'pending') return status === 'pending' && taskDateObj >= todayDate;
        return true;
    });

    if (tasks.length === 0) {
        tlContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 40px 20px; font-weight: 500; font-size: 15px;">এই ফিল্টারে কোনো কাজ নেই।</p>';
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

    // Smart Helper to scale quantities in description based on farm area
    const currentArea = window.currentFarmArea || 1;
    const scaleTextQuantities = (text) => {
        if (!text || currentArea === 1) return text;
        const bnToEn = (str) => str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
        const enToBn = (str) => String(str).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
        
        let modifiedText = text;
        let bngArea = enToBn(currentArea);
        
        // Layer 1: Adapt "per decimal" phrases
        modifiedText = modifiedText.replace(/১\s*শতাংশ\s*জমিতে/g, `পুরো জমিতে (${bngArea} শতাংশ)`);
        modifiedText = modifiedText.replace(/১\s*শতাংশে/g, `পুরো জমিতে (${bngArea} শতাংশে)`);
        modifiedText = modifiedText.replace(/এক\s*শতাংশ\s*জমিতে/g, `পুরো জমিতে (${bngArea} শতাংশ)`);
        modifiedText = modifiedText.replace(/এক\s*শতাংশে/g, `পুরো জমিতে (${bngArea} শতাংশে)`);
        modifiedText = modifiedText.replace(/প্রতি\s*শতাংশে/g, `পুরো জমিতে (${bngArea} শতাংশে)`);

        // Layer 2: Scale numbers smartly based on text context
        modifiedText = modifiedText.replace(/([\d০-৯\.\-]+)\s*(কেজি|গ্রাম|লিটার|মিলি|টি|বস্তা|টন)/g, (match, numStr, unit, offset, fullText) => {
            // Find the sentence containing this match (boundaries: ।, ., \n, ;)
            let startIdx = offset;
            while (startIdx > 0 && !['।', '.', '\n', ';'].includes(fullText[startIdx])) startIdx--;
            let endIdx = offset + match.length;
            while (endIdx < fullText.length && !['।', '.', '\n', ';'].includes(fullText[endIdx])) endIdx++;
            
            const sentenceCtx = fullText.substring(startIdx, endIdx);
            
            // Protection 1: Context suggests ratio or per plant/pit inside the SAME sentence
            const protectionWords = ['প্রতি', 'প্রতিটি', 'লিটারে', 'পানিতে', 'গর্তে', 'মাদায়', 'গাছে', 'চারাতে', '/লিটার', '/ লিটার'];
            if (protectionWords.some(w => sentenceCtx.includes(w))) {
                return match; 
            }
            
            // Protection 2: It's an instruction about ploughing/times inside the SAME sentence
            if (unit === 'টি' && (sentenceCtx.includes('চাষ') || sentenceCtx.includes('মই') || sentenceCtx.includes('বার'))) {
                return match;
            }

            // Handle numeric ranges e.g. "১.৫-২ কেজি" or "২-৩"
            if (numStr.includes('-')) {
                 let parts = numStr.split('-');
                 if (parts.length === 2 && parts[0] && parts[1]) {
                     let p1 = parseFloat(bnToEn(parts[0]));
                     let p2 = parseFloat(bnToEn(parts[1]));
                     if(!isNaN(p1) && !isNaN(p2)) {
                         let s1 = Math.round(p1 * currentArea * 100) / 100;
                         let s2 = Math.round(p2 * currentArea * 100) / 100;
                         return enToBn(s1) + "-" + enToBn(s2) + " " + unit;
                     }
                 }
                 return match; 
            }
            
            let enNum = parseFloat(bnToEn(numStr));
            if (isNaN(enNum)) return match;

            let scaledEnNum = enNum * currentArea;
            scaledEnNum = Math.round(scaledEnNum * 100) / 100;
            return enToBn(scaledEnNum) + " " + unit;
        });
        
        return modifiedText;
    };

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
                <h3 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px; padding: 0 12px;">${headerLabel}</h3>
                <div class="tasks-section" style="padding: 0 12px; display: flex; flex-direction: column; gap: 12px;">
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
            } else if (task.is_skipped) {
                itemClass = 'skipped';
                dateLabel = `<span style="color: #D97706;">✕ স্কিপ করা হয়েছে</span>`;
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
            } else if (task.status === 'cancelled') {
                actionsHtml = `
                <div class="task-item-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn-tl-action reactivate" onclick="reactivateTask('${task.id || ''}')" style="flex: 1; padding: 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px dashed var(--border-color); background: transparent; border-radius: 8px; cursor: pointer; color: var(--text-main);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="16 1 21 5 16 9"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><polyline points="8 23 3 19 8 15"></polyline></svg> পরিবর্তন করুন
                    </button>
                    <button class="btn-tl-action delete-perm" onclick="deleteTaskPermanently('${task.id || ''}')" style="flex: 1; padding: 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px dashed #EF4444; background: #FEF2F2; border-radius: 8px; cursor: pointer; color: #EF4444;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> মুছে ফেলুন
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
                <div class="ld-task-item ${itemClass}" style="position: relative; padding-left: 0; display: block; background: ${task.is_skipped ? '#FAFAFA' : '#fff'}; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); ${task.is_skipped ? 'opacity: 0.75;' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--text-main); ${task.is_skipped ? 'text-decoration: line-through;' : ''}">${task.title}</h4>
                        <span style="font-size: 11px; padding: 4px 8px; border-radius: 8px; background: ${itemClass === 'completed' ? '#ECFDF5' : (itemClass === 'active' ? '#EEF2FF' : (itemClass === 'warning' ? '#FEF2F2' : (itemClass === 'skipped' ? '#FFFBEB' : '#F8FAFC')))}; color: ${itemClass === 'completed' ? '#059669' : (itemClass === 'active' ? '#4F46E5' : (itemClass === 'warning' ? '#DC2626' : (itemClass === 'skipped' ? '#D97706' : '#64748B')))}; font-weight: 600;">${dateLabel}</span>
                    </div>
                    ${task.description ? `<p style="margin: 0 0 ${task.is_skipped ? '8px' : '12px'} 0; font-size: 13px; color: var(--text-muted); line-height: 1.4;">${scaleTextQuantities(task.description)}</p>` : ''}
                    ${task.is_skipped ? `<div style="background: #FFF7ED; border: 1px solid #FFEDD5; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #C2410C; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:1px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        <span>আপনি এই কাজটি এড়িয়ে গেছেন, যার ফলে কাঙ্ক্ষিত ফলন কিছুটা কমে যেতে পারে।</span>
                    </div>` : ''}
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

window.currentResourceFilter = window.currentResourceFilter || 'pending';
window.setResourceFilter = function(filterStr) {
    window.currentResourceFilter = filterStr;
    const chips = document.querySelectorAll('#resource-filter-chips .filter-chip');
    chips.forEach(chip => {
        if(chip.getAttribute('data-filter') === filterStr) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
    if(typeof activeCrop !== 'undefined' && activeCrop && activeCrop.resources_state_json) {
        renderResourcesTab(activeCrop.resources_state_json);
    }
};

function renderResourcesTab(resJsonStr) {
    const resContainer = document.getElementById('render-resources');

    let allResources = [];
    try {
        allResources = JSON.parse(resJsonStr || '[]');
    } catch (e) { }

    let needsSave = false;
    allResources.forEach((r, idx) => {
        if (!r.id) {
            r.id = 'res_' + idx + '_' + Math.random().toString(36).substr(2, 5);
            needsSave = true;
        }
    });

    if (needsSave) {
        activeCrop.resources_state_json = JSON.stringify(allResources);
        saveCropState();
    }

    let resources = allResources.filter(r => {
        let isBought = r.status === 'bought';
        if (window.currentResourceFilter === 'all') return true;
        if (window.currentResourceFilter === 'bought') return isBought;
        if (window.currentResourceFilter === 'pending') return !isBought;
        return true;
    });

    resContainer.innerHTML = '';

    if (resources.length === 0) {
        resContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 40px 20px; font-weight: 500; font-size: 15px;">এই ফিল্টারে কোনো উপকরণ নেই।</p>';
        return;
    }

    const grouped = {
        'seed_or_sapling': { title: 'বীজ বা চারা', items: [] },
        'fertilizer': { title: 'সার ব্যবস্থাপনা', items: [] },
        'pesticide': { title: 'বালাইনাশক ও ঔষধ', items: [] },
        'irrigation': { title: 'সেচ', items: [] },
        'labor_and_other': { title: 'শ্রমিক ও অন্যান্য', items: [] }
    };

    resources.forEach(r => {
        const cat = r.category || 'labor_and_other';
        if (grouped[cat]) grouped[cat].items.push(r);
        else grouped['labor_and_other'].items.push(r);
    });

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

    // Bottom add button code removed, as feature migrated to header
}

window.currentFinanceFilter = window.currentFinanceFilter || 'all';
window.setFinanceFilter = function(filterStr) {
    window.currentFinanceFilter = filterStr;
    const chips = document.querySelectorAll('#finance-filter-chips .filter-chip');
    chips.forEach(chip => {
        if(chip.getAttribute('data-filter') === filterStr) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
    renderFinanceTab();
};

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

        let filteredTxs = txs.filter(t => {
            if (window.currentFinanceFilter === 'all') return true;
            if (window.currentFinanceFilter === 'income') return t.type === 'income';
            if (window.currentFinanceFilter === 'expense') return t.type === 'expense';
            return true;
        });

        let listHtml = '';
        if (filteredTxs.length === 0) {
            if (txs.length === 0) {
                listHtml = '<p style="text-align:center; color: var(--text-muted); font-size: 13px; padding: 20px; margin: 0;">কোনো ট্রানজ্যাকশন পাওয়া যায়নি।</p>';
            } else {
                listHtml = '<p style="text-align:center; color: var(--text-muted); font-size: 13px; padding: 20px; margin: 0;">এই ফিল্টারে কোনো ট্রানজ্যাকশন নেই।</p>';
            }
        } else {
            listHtml = filteredTxs.map(t => {
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
        }

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

        // Extract variety safely even if it's nested like "পেঁপে (পেঁপে (টপ লেডি))"
        if (!activeCrop.variety_name && cName.includes('(') && cName.includes(')')) {
            const match = cName.match(/\(([^()]+)\)/g);
            if (match && match.length > 0) {
                vName = match[match.length - 1].replace(/[()]/g, '').trim();
                cName = cName.split('(')[0].trim();
            }
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

window.pendingConfirmCallback = null;

window.showConfirmModal = function(title, text, confirmText, confirmCallback, isDanger = true) {
    document.getElementById('confirmActionTitle').textContent = title;
    document.getElementById('confirmActionText').textContent = text;
    document.getElementById('confirmActionBtn').textContent = confirmText;
    
    const iconContainer = document.getElementById('confirmActionIcon');
    const actionBtn = document.getElementById('confirmActionBtn');
    
    if (isDanger) {
        iconContainer.style.color = '#DC2626';
        iconContainer.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        actionBtn.style.background = '#DC2626';
        actionBtn.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.2)';
    } else {
        iconContainer.style.color = '#10B981';
        iconContainer.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9 12l2 2 4-4"></path></svg>`;
        actionBtn.style.background = 'var(--primary)';
        actionBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
    }

    window.pendingConfirmCallback = confirmCallback;
    
    document.getElementById('confirmActionBtn').onclick = function() {
        if (window.pendingConfirmCallback) window.pendingConfirmCallback();
        window.closeConfirmModal();
    };

    const modal = document.getElementById('confirmActionModal');
    modal.classList.add('active');
    setTimeout(() => { modal.querySelector('.calendar-content').style.transform = 'scale(1)'; }, 10);
    document.body.style.overflow = 'hidden';
};

window.closeConfirmModal = function() {
    const modal = document.getElementById('confirmActionModal');
    modal.classList.remove('active');
    modal.querySelector('.calendar-content').style.transform = 'scale(0.9)';
    document.body.style.overflow = '';
    window.pendingConfirmCallback = null;
};

window.markTaskDone = function (taskId, btnEl) {
    if (!activeCrop || !activeCrop.tasks_state_json) return;
    window.showConfirmModal(
        "কাজ সম্পন্ন",
        "আপনি কি এই কাজটি সফলভাবে শেষ করেছেন?",
        "হ্যাঁ, সম্পন্ন করেছি",
        function() {
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
        },
        false // Not danger
    );
};

window.cancelTask = function (taskId) {
    if (!activeCrop || !activeCrop.tasks_state_json) return;
    window.showConfirmModal(
        "কাজ বাতিল",
        "আপনি কি নিশ্চিত যে এই কাজটি বাতিল করতে চান? বাতিল করলে এটি ক্যালেন্ডারে 'বাতিল' হিসেবে দেখানো হবে।",
        "হ্যাঁ, বাতিল করুন",
        function() {
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
        },
        true // Is danger
    );
};

window.reactivateTask = function (taskId) {
    if (!activeCrop || !activeCrop.tasks_state_json) return;
    window.showConfirmModal(
        "পুনরায় সক্রিয়",
        "আপনি কি বাতিল করা এই কাজটি পুনরায় সক্রিয় করতে চান?",
        "হ্যাঁ, সক্রিয় করুন",
        function() {
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
        },
        false
    );
};

window.deleteTaskPermanently = function (taskId) {
    if (!activeCrop || !activeCrop.tasks_state_json) return;
    window.showConfirmModal(
        "একেবারে মুছে ফেলুন",
        "আপনি কি এই কাজটি একেবারে মুছে ফেলতে চান? এটি আর কখনোই ক্যালেন্ডারে দেখা যাবে না বা ফিরিয়ে আনা যাবে না।",
        "হ্যাঁ, পার্মানেন্ট ডিলিট করুন",
        function() {
            try {
                let tasks = JSON.parse(activeCrop.tasks_state_json);
                const filteredTasks = tasks.filter(t => t.id !== taskId);
                activeCrop.tasks_state_json = JSON.stringify(filteredTasks);
                saveCropState();
                renderTasksTab(activeCrop.tasks_state_json);
            } catch (e) {
                console.error(e);
            }
        },
        true
    );
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
    
    // Auto-select the initial viewDate as the default choice
    const hiddenDateInput = document.getElementById('selectedPlantingDate');
    if (hiddenDateInput) hiddenDateInput.value = viewDate;
    
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
                // Recover biological chain using original offsets
                let bioChain = [...tasks].sort((a, b) => (a.day_offset || 0) - (b.day_offset || 0));
                let bioIdx = bioChain.findIndex(t => t.id === taskObj.id);
                
                let gapViolationReason = null;
                const newD = new Date(newDate);
                newD.setHours(0,0,0,0);
                
                const toBngDigits = (num) => String(num).split('').map(d => ({ '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' }[d] || d)).join('');
                
                // Biological Previous Dependency Check
                if (bioIdx > 0) {
                    let prevTask = bioChain[bioIdx - 1];
                    let minGap = parseInt(taskObj.min_gap_prev) || 0;
                    if (minGap > 0 && prevTask.due_date) {
                        let prevDate = new Date(prevTask.due_date);
                        prevDate.setHours(0,0,0,0);
                        let diffDays = Math.floor((newD - prevDate) / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < minGap) {
                            let reason = taskObj.gap_reason ? taskObj.gap_reason : `আগের কাজ থেকে অন্তত ${toBngDigits(minGap)} দিন অপেক্ষা করতে হবে`;
                            gapViolationReason = `আগের কাজ <b>"${prevTask.title}"</b> এর সাথে অন্তত <b style="color:#DC2626;">${toBngDigits(minGap)} দিনের</b> গ্যাপ থাকতে হবে। <br><br><b>কারণ:</b> ${reason}`;
                        }
                    }
                }
                
                // Biological Next Dependency Check
                if (bioIdx < bioChain.length - 1 && !gapViolationReason) {
                    let nextTask = bioChain[bioIdx + 1];
                    let nextMinGap = parseInt(nextTask.min_gap_prev) || 0;
                    if (nextMinGap > 0 && nextTask.due_date) {
                        let nextDate = new Date(nextTask.due_date);
                        nextDate.setHours(0,0,0,0);
                        let diffDays = Math.floor((nextDate - newD) / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < nextMinGap) {
                            let reason = nextTask.gap_reason ? nextTask.gap_reason : `পরবর্তী কাজের জন্য অন্তত ${toBngDigits(nextMinGap)} দিন অপেক্ষা করতে হবে`;
                            gapViolationReason = `পরবর্তী কাজ <b>"${nextTask.title}"</b> এর সাথে অন্তত <b style="color:#DC2626;">${toBngDigits(nextMinGap)} দিনের</b> গ্যাপ থাকতে হবে। <br><br><b>কারণ:</b> ${reason}`;
                        }
                    }
                }

                if (gapViolationReason) {
                    window.closeDatePicker();
                    window.pendingRescheduleTaskState = {
                        taskId: taskObj.id,
                        newDate: newDate,
                        oldDate: taskObj.due_date,
                        tasks: tasks,
                        bioChain: bioChain
                    };
                    document.getElementById('agronomicWarningText').innerHTML = gapViolationReason;
                    
                    const overlay = document.getElementById('agronomicWarningOverlay');
                    const content = document.getElementById('agronomicWarningSheet');
                    overlay.style.display = 'block';
                    setTimeout(() => {
                        overlay.style.opacity = '1';
                        content.style.bottom = '0';
                    }, 10);
                    return;
                }

                window.showConfirmModal(
                    "তারিখ পরিবর্তন নিশ্চিতকরণ",
                    "আপনি কি নিশ্চিত যে এই নির্দিষ্ট কাজটি এই নতুন তারিখে পরিবর্তন করতে চান?",
                    "হ্যাঁ, পরিবর্তন করুন",
                    function() {
                        taskObj.due_date = newDate;
                        tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
                        activeCrop.tasks_state_json = JSON.stringify(tasks);
                        saveCropState();
                        renderTasksTab(activeCrop.tasks_state_json);
                    },
                    false
                );
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

window.closeAgronomicWarningSheet = function(e) {
    if (e && e.target.id !== 'agronomicWarningOverlay' && !e.target.classList.contains('close-sheet')) return;
    const overlay = document.getElementById('agronomicWarningOverlay');
    const content = document.getElementById('agronomicWarningSheet');
    if (!overlay) return;
    
    overlay.style.opacity = '0';
    content.style.bottom = '-100%';
    setTimeout(() => {
        overlay.style.display = 'none';
        window.pendingRescheduleTaskState = null;
    }, 300);
};

window.executeTaskUpdate = function(mode) {
    if (!window.pendingRescheduleTaskState) return;
    try {
        const { taskId, newDate, oldDate, tasks, bioChain } = window.pendingRescheduleTaskState;
        const taskObj = tasks.find(t => t.id === taskId);
        
        if (!taskObj) return;

        if (mode === 'override') {
            // Just update this task, ignoring warnings
            taskObj.due_date = newDate;
        } else if (mode === 'cascade') {
            // Update this task and shift all subsequent tasks by the same delta
            const oldD = new Date(oldDate);
            const newD = new Date(newDate);
            oldD.setHours(0,0,0,0);
            newD.setHours(0,0,0,0);
            const shiftDays = Math.round((newD - oldD) / (1000 * 60 * 60 * 24));
            
            let bioIdx = bioChain.findIndex(t => t.id === taskId);
            
            for (let i = bioIdx; i < bioChain.length; i++) {
                let currentTask = bioChain[i];
                if (currentTask.due_date && currentTask.status !== 'completed' && currentTask.status !== 'cancelled' && !currentTask.is_skipped) {
                    if (i === bioIdx) {
                        currentTask.due_date = newDate;
                    } else {
                        let curD = new Date(currentTask.due_date);
                        curD.setDate(curD.getDate() + shiftDays);
                        currentTask.due_date = curD.toISOString().split('T')[0];
                    }
                }
            }
        }
        
        tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        activeCrop.tasks_state_json = JSON.stringify(tasks);
        saveCropState();
        renderTasksTab(activeCrop.tasks_state_json);
        showSystemMessageModal("আপডেট সফল হয়েছে!", "আপনার টাইমলাইন রিশিডিউল করা হয়েছে।", true);
    } catch (e) {
        console.error("Task update error:", e);
        showSystemMessageModal("আপডেট ব্যর্থ", "আপডেট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।", false);
    }
    window.closeAgronomicWarningSheet();
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
            const hiddenDateInput = document.getElementById('selectedPlantingDate');
            if (hiddenDateInput) hiddenDateInput.value = cellDateStr;
        });
        
        if (selectedDateStr === cellDateStr) {
            dayEl.classList.add('selected');
            const hiddenDateInput = document.getElementById('selectedPlantingDate');
            if (hiddenDateInput) hiddenDateInput.value = cellDateStr;
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

// --- Farming AI Chatbot (RAG) Integration ---
window.toggleChatbot = function() {
    const w = document.getElementById('cropChatbotContainer');
    const badge = document.getElementById('chatbotToggleBtn');
    
    // Create backdrop overlay lazily
    let backdrop = document.getElementById('chatbotBackdropOverlay');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'chatbotBackdropOverlay';
        backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 9998; opacity: 0; visibility: hidden; transition: all 0.3s ease; backdrop-filter: blur(2px);';
        backdrop.onclick = window.toggleChatbot;
        document.body.appendChild(backdrop);
    }
    
    // Check if bottom sheet is hidden
    if (w.style.transform === 'translateY(100%)' || w.style.transform === '') {
        // Open
        w.style.transform = 'translateY(0)';
        backdrop.style.visibility = 'visible';
        backdrop.style.opacity = '1';
        document.body.style.overflow = 'hidden';
        
        if (badge) badge.style.transform = 'scale(0)';
        
        // Restore History or Add initial greeting
        const msgs = document.getElementById('chatMessages');
        if (msgs && !msgs.hasAttribute('data-history-loaded')) {
            msgs.setAttribute('data-history-loaded', 'true');
            const activeFarmId = new URLSearchParams(window.location.search).get('id') || 'unknown';
            const cName = (typeof activeCrop !== 'undefined' && activeCrop) ? activeCrop.crop_name : 'আপনার ফসল';
            
            // Build the initial dynamic greeting
            let html = `<div style="margin-bottom: 12px; text-align: left;">
                <div style="background: #e2e8f0; color: #1e293b; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; display: inline-block; max-width: 85%; font-size: 14px; line-height: 1.5;">
                    আসসালামু আলাইকুম! আমি আপনার স্মার্ট কৃষি অ্যাসিস্ট্যান্ট। <strong>${cName}</strong> সম্পর্কে কোনো প্রশ্ন থাকলে আমাকে করতে পারেন।
                </div>
            </div>`;

            const cropSuffix = (typeof activeCrop !== 'undefined' && activeCrop && activeCrop.id) ? `_crop_${activeCrop.id}` : '';
            const sessionKey = `agritech_chat_${activeFarmId}${cropSuffix}`;

            const sessionDataStr = localStorage.getItem(sessionKey);
            let sessionData = null;
            if (sessionDataStr) {
                try { sessionData = JSON.parse(sessionDataStr); } catch(e){}
            }

            if (sessionData && sessionData.history && sessionData.history.length > 0) {
                // Restore UI from history
                sessionData.history.forEach(item => {
                    if (item.role === 'user') {
                        html += `<div style="margin-bottom: 12px; text-align: right;">
                            <div style="background: #10b981; color: white; padding: 10px 14px; border-radius: 12px; border-bottom-right-radius: 4px; display: inline-block; max-width: 85%; font-size: 14px; line-height: 1.5; text-align: left;">
                                ${item.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
                            </div>
                        </div>`;
                    } else if (item.role === 'assistant') {
                        const formattedNodes = typeof marked !== 'undefined' ? marked.parse(item.content) : item.content.replace(/\n/g, '<br>');
                        html += `<div style="margin-bottom: 12px; text-align: left;">
                            <div style="background: #e2e8f0; color: #1e293b; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; display: inline-block; max-width: 85%; font-size: 14px; line-height: 1.5; overflow: hidden;">
                                ${formattedNodes}
                            </div>
                        </div>`;
                    }
                });
            }
            
            msgs.innerHTML = html;
            setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 100);
        }
    } else {
        // Close
        w.style.transform = 'translateY(100%)';
        backdrop.style.opacity = '0';
        setTimeout(() => backdrop.style.visibility = 'hidden', 300);
        document.body.style.overflow = '';
        
        if (badge) badge.style.transform = 'scale(1)';
    }
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    
    document.getElementById('sendChatBtn').disabled = true;
    input.disabled = true;
    
    const msgsContainer = document.getElementById('chatMessages');
    
    // Append User Message
    msgsContainer.innerHTML += `<div style="margin-bottom: 12px; text-align: right;">
        <div style="background: #10b981; color: white; padding: 10px 14px; border-radius: 12px; border-bottom-right-radius: 4px; display: inline-block; max-width: 85%; font-size: 14px; line-height: 1.5; text-align: left;">
            ${msg.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </div>
    </div>`;
    
    input.value = '';
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
    
    // Loading indicator
    const loadingId = 'loading-' + Date.now();
    msgsContainer.innerHTML += `<div id="${loadingId}" style="margin-bottom: 12px; text-align: left;">
        <div style="background: #f1f5f9; color: #64748b; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; display: inline-block; max-width: 85%; font-size: 13px; font-style: italic;">
            এআই আপনার উত্তর খুঁজছে...
        </div>
    </div>`;
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
    
    try {
        const cropName = (typeof activeCrop !== 'undefined' && activeCrop) ? activeCrop.crop_name : localStorage.getItem('agritech_active_crop_name');
        const activeFarmId = new URLSearchParams(window.location.search).get('id') || 'unknown';
        const activeCropId = (typeof activeCrop !== 'undefined' && activeCrop) ? activeCrop.id : null;
        const cropSuffix = activeCropId ? `_crop_${activeCropId}` : '';
        const sessionKey = `agritech_chat_${activeFarmId}${cropSuffix}`;
        
        // Load session history
        let sessionData = { sessionId: null, history: [] };
        const storedStr = localStorage.getItem(sessionKey);
        if (storedStr) {
            try { sessionData = JSON.parse(storedStr); } catch(e){}
        }

        const farmerProfileStr = localStorage.getItem('farmer_profile');
        const farmerProfile = farmerProfileStr ? JSON.parse(farmerProfileStr) : {};
        const userId = farmerProfile.id || 'anonymous';
        
        const res = await fetch('https://agritech-backend.mobashwir9.workers.dev/api/public/crop-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('farmer_jwt')}`
            },
            body: JSON.stringify({
                query: msg,
                cropTitle: cropName,
                farmId: activeFarmId !== 'unknown' ? activeFarmId : null,
                cropId: activeCropId,
                sessionId: sessionData.sessionId,
                userId: userId,
                history: sessionData.history
            })
        });
        
        const data = await res.json();
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        
        if (data.success) {
            const formattedNodes = typeof marked !== 'undefined' ? marked.parse(data.answer) : data.answer.replace(/\n/g, '<br>');
            msgsContainer.innerHTML += `<div style="margin-bottom: 12px; text-align: left;">
                <div style="background: #e2e8f0; color: #1e293b; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; display: inline-block; max-width: 85%; font-size: 14px; line-height: 1.5; overflow: hidden;">
                    ${formattedNodes}
                </div>
            </div>`;
            
            // Save updated session to local storage
            sessionData.sessionId = data.sessionId || sessionData.sessionId;
            sessionData.history.push({ role: 'user', content: msg });
            sessionData.history.push({ role: 'assistant', content: data.answer });
            localStorage.setItem(sessionKey, JSON.stringify(sessionData));
            
        } else {
            console.error(data.error);
            if (data && data.error && (data.error.toLowerCase().includes('payment required') || data.error.toLowerCase().includes('limit exceeded'))) {
                if(window.showPaywallModal) {
                    window.toggleChatbot(); // Close chat interface
                    setTimeout(() => window.showPaywallModal('এআই চ্যাট অ্যাসিস্ট্যান্ট'), 350);
                } else alert(data.error);
            } else {
                msgsContainer.innerHTML += `<div style="margin-bottom: 12px; text-align: left;">
                    <div style="background: #fee2e2; color: #b91c1c; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; display: inline-block; max-width: 85%; font-size: 14px; line-height: 1.5;">
                        ${data.error || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি।'}
                    </div>
                </div>`;
            }
        }
    } catch (e) {
        console.error(e);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        msgsContainer.innerHTML += `<div style="margin-bottom: 12px; text-align: left;">
            <div style="background: #fee2e2; color: #b91c1c; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; display: inline-block; max-width: 85%; font-size: 14px; line-height: 1.5;">
                ইন্টারনেট সংযোগ সমস্যা। 
            </div>
        </div>`;
    }
    
    document.getElementById('sendChatBtn').disabled = false;
    input.disabled = false;
    input.focus();
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
};

// ============================================
// Add Plant Tracking & Loss Methods
// ============================================

window.promptPlantCount = function() { // Reused function name so HTML buttons don't break
    if (!activeCrop) return;
    
    // Set default date to existing planting_date or today
    const dateInputSpan = document.getElementById('newPlantingDateLabel');
    const EN_TO_BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const toBngDigits = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const dateStr = activeCrop.planted_date ? (activeCrop.planted_date.includes('T') ? activeCrop.planted_date.split('T')[0] : activeCrop.planted_date) : todayStr;
    const dVal = new Date(dateStr);
    
    dateInputSpan.dataset.value = dateStr;
    dateInputSpan.textContent = `${toBngDigits(dVal.getDate())} ${EN_TO_BN_MONTHS[dVal.getMonth()]} ${toBngDigits(dVal.getFullYear())}`;
    
    // Set default initial count
    const countInput = document.getElementById('newPlantCount');
    countInput.value = activeCrop.initial_plant_count || '';
    
    // Auto-close crop action sheet if open
    const sheet = document.getElementById('cropActionSheet');
    if(sheet && sheet.classList.contains('active')) {
        sheet.classList.remove('active');
    }

    document.getElementById('plantingDateModal').classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.pendingUpdatePayload = null;

// Helpers for the new modals
window.closeConflictSheet = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('taskConflictOverlay').style.display = 'none';
    const sheet = document.getElementById('taskConflictSheet');
    sheet.style.bottom = '-100%';
    setTimeout(() => { window.pendingUpdatePayload = null; }, 300);
};

window.showSystemMessageModal = function(title, text, isSuccess) {
    const modal = document.getElementById('systemMessageModal');
    document.getElementById('systemMessageTitle').textContent = title;
    document.getElementById('systemMessageTitle').style.color = isSuccess ? 'var(--text-main)' : '#DC2626';
    document.getElementById('systemMessageText').textContent = text;
    
    const iconContainer = document.getElementById('systemMessageIcon');
    if (isSuccess) {
        iconContainer.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
        iconContainer.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }
    
    modal.classList.add('active');
    setTimeout(() => { modal.querySelector('.calendar-content').style.transform = 'scale(1)'; }, 10);
    document.body.style.overflow = 'hidden';
};

window.closeSystemMessageModal = function() {
    const modal = document.getElementById('systemMessageModal');
    modal.classList.remove('active');
    modal.querySelector('.calendar-content').style.transform = 'scale(0.9)';
    document.body.style.overflow = '';
};

window.savePlantingDate = function() {
    if (!activeCrop) return;
    const dateInputStr = document.getElementById('newPlantingDateLabel').dataset.value;
    const countInput = document.getElementById('newPlantCount').value;
    const shiftTasks = document.getElementById('shiftTasksCheckbox').checked;

    if (!dateInputStr) return showSystemMessageModal("তারিখ পাওয়া যায়নি", "দয়া করে রোপণের তারিখ প্রদান করুন!", false);
    
    const countInt = parseInt(countInput) || 0;
    
    const updatePayload = { 
        planted_date: dateInputStr,
        initial_plant_count: countInt
    };
    
    let conflictCount = 0;
    let rawSimulatedTasks = [];

    // Professional AI Sync Task Shifting & Simulation
    if (shiftTasks && activeCrop.tasks_state_json) {
        try {
            let tasks = JSON.parse(activeCrop.tasks_state_json);
            let pDate = new Date(dateInputStr);
            let today = new Date();
            today.setHours(0,0,0,0);

            tasks.forEach(task => {
                if(!task.is_completed && task.day_offset !== undefined) {
                    let newDueDate = new Date(pDate);
                    newDueDate.setDate(newDueDate.getDate() + task.day_offset);
                    
                    // Identify past tasks
                    if (newDueDate < today) {
                        conflictCount++;
                        task._is_conflict = true;
                    }
                    
                    const y = newDueDate.getFullYear();
                    const m = String(newDueDate.getMonth() + 1).padStart(2, '0');
                    const dStr = String(newDueDate.getDate()).padStart(2, '0');
                    task.due_date = `${y}-${m}-${dStr}`;
                }
            });
            
            tasks.sort((a, b) => {
                const dateA = a.due_date ? new Date(a.due_date) : 0;
                const dateB = b.due_date ? new Date(b.due_date) : 0;
                return dateA - dateB;
            });
            
            rawSimulatedTasks = tasks;
        } catch(e) {
            console.error("AI Task Re-anchoring error", e);
        }
    }

    if (conflictCount > 0) {
        window.pendingUpdatePayload = { ...updatePayload, _rawTasks: rawSimulatedTasks };
        document.getElementById('conflictCountText').textContent = conflictCount;
        
        const overlay = document.getElementById('taskConflictOverlay');
        const sheet = document.getElementById('taskConflictSheet');
        overlay.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            sheet.style.bottom = '0';
        }, 10);
    } else {
        if (shiftTasks && rawSimulatedTasks.length > 0) {
            updatePayload.tasks_state_json = JSON.stringify(rawSimulatedTasks);
        }
        window.executePlantingDateUpdate(null, updatePayload);
    }
};

window.executePlantingDateUpdate = async function(action = null, payload = null) {
    const basePayload = payload || window.pendingUpdatePayload;
    if (!basePayload) return;

    let finalPayload = { 
        planted_date: basePayload.planted_date, 
        initial_plant_count: basePayload.initial_plant_count 
    };

    // Advanced Agronomic Cascade Logic
    if (basePayload._rawTasks) {
        let tasks = basePayload._rawTasks;
        let today = new Date();
        today.setHours(0,0,0,0);

        if (action === 'cascade') {
            let lastValidDate = null;
            tasks.forEach(task => {
                if (task.is_completed) return;
                
                let thisDate = new Date(task.due_date);
                let gap = parseInt(task.min_gap_prev) || 0;
                
                let minAllowedDate = new Date(today);
                if (lastValidDate) {
                    minAllowedDate = new Date(lastValidDate);
                    minAllowedDate.setDate(minAllowedDate.getDate() + gap);
                }
                
                if (task._is_conflict || thisDate < minAllowedDate) {
                    thisDate = minAllowedDate > today ? minAllowedDate : today;
                    
                    const y = thisDate.getFullYear();
                    const m = String(thisDate.getMonth() + 1).padStart(2, '0');
                    const dStr = String(thisDate.getDate()).padStart(2, '0');
                    task.due_date = `${y}-${m}-${dStr}`;
                }
                lastValidDate = thisDate;
                delete task._is_conflict;
            });
        } else if (action === 'skip') {
            tasks.forEach(task => {
                if (task._is_conflict) {
                    task.is_skipped = true;
                }
                delete task._is_conflict;
            });
        }
        
        finalPayload.tasks_state_json = JSON.stringify(tasks);
    } else if (basePayload.tasks_state_json) {
        finalPayload.tasks_state_json = basePayload.tasks_state_json;
    }
    
    // Close conflict sheet if it was open
    const sheet = document.getElementById('taskConflictSheet');
    if (sheet && sheet.style.bottom === '0px') {
        window.closeConflictSheet();
    }
    
    const token = localStorage.getItem('farmer_jwt');
    const btn = document.querySelector('#plantingDateModal button');
    let oldBtnText = "আপডেট";
    if(btn) {
        oldBtnText = btn.textContent;
        btn.textContent = 'হালনাগাদ হচ্ছে...';
        btn.disabled = true;
    }

    try {
        const res = await fetch(`${API_URL}/api/crops/${activeCrop.id}/state`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload)
        });
        if(!res.ok) throw new Error("API Note: Update Failed on backend.");
        
        // Success
        document.getElementById('plantingDateModal').classList.remove('active');
        document.body.style.overflow = '';
        await fetchFarmAndCropDetails();
        showSystemMessageModal("আপডেট সফল হয়েছে!", "আপনার কাজগুলোর টাইমলাইন রিশিডিউল করা হয়েছে।", true);
    } catch(e) {
        console.warn("API Note:", e.message);
        showSystemMessageModal("আপডেট ব্যর্থ", "আপডেট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।", false);
    } finally {
        if(btn) {
            btn.textContent = oldBtnText;
            btn.disabled = false;
        }
        window.pendingUpdatePayload = null;
    }
};

window.saveLossEvent = async function() {
    if (!activeCrop) return;
    const dateInputStr = document.getElementById('lossStepDate').innerText || document.getElementById('lossStepDate').textContent;
    const amountInput = document.getElementById('lossAmountInput').value;
    const reasonInput = document.getElementById('lossReasonInput').value;

    if (!amountInput || !reasonInput) {
        return alert("ক্ষয়ক্ষতির পরিমাণ এবং কারণ অবশ্যই দিতে হবে!");
    }
    const amountInt = parseInt(amountInput);
    if (isNaN(amountInt) || amountInt <= 0) {
        return alert("সঠিক পরিমাণ দিন!");
    }

    let currentLosses = [];
    try {
        currentLosses = JSON.parse(activeCrop.loss_events_json || '[]');
    } catch(e) {}

    currentLosses.push({
        date: dateInputStr,
        amount: amountInt,
        reason: reasonInput,
        created_at: new Date().toISOString()
    });

    const newLossJson = JSON.stringify(currentLosses);
    activeCrop.loss_events_json = newLossJson;

    const btn = document.querySelector('#lossModal .calendar-footer button');
    const oldText = btn.textContent;
    btn.textContent = 'এন্ট্রি হচ্ছে...';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/crops/${activeCrop.id}/state`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ loss_events_json: newLossJson })
        });
        
        if(!res.ok) throw new Error("API PATCH Error");
        
    } catch(e) {
        console.warn("API Note:", e.message);
    }

    document.getElementById('lossModal').classList.remove('active');
    document.body.style.overflow='';
    
    // Clear fields
    document.getElementById('lossAmountInput').value = '';
    document.getElementById('lossReasonInput').value = '';
    
    await fetchFarmAndCropDetails();
    
    btn.disabled = false;
    btn.textContent = oldText;
};

// ----- HARVEST MODAL & ACTIONS -----
window.handleMarkCropCompleted = function() {
    closeCropActionModals();
    document.getElementById('harvestModal').classList.add('active');
    document.body.style.overflow='hidden';
    
    // Set dynamic plant count
    const plantP = document.getElementById('harvestPlantCount');
    if(activeCrop && plantP) {
        plantP.textContent = (activeCrop.initial_plant_count || 0) + ' টি';
    }
};

window.toggleHarvestInputs = function() {
    const isFailed = document.getElementById('isCropFailedCheck').checked;
    document.getElementById('harvestAmountInput').disabled = isFailed;
    document.getElementById('harvestUnitSelect').disabled = isFailed;
    document.getElementById('harvestPortionInput').disabled = isFailed;
    
    // Automatically force the final flag if it's failed
    if(isFailed) {
        document.getElementById('isFinalHarvestCheck').checked = true;
        document.getElementById('isFinalHarvestCheck').disabled = true;
    } else {
        document.getElementById('isFinalHarvestCheck').disabled = false;
    }
};

window.toggleFailedCheckbox = function() {
    const isFinal = document.getElementById('isFinalHarvestCheck').checked;
    if(!isFinal) {
        document.getElementById('isCropFailedCheck').checked = false;
        toggleHarvestInputs();
    }
};

window.submitHarvestEntry = async function() {
    if(!activeCrop) return;
    
    const isFailed = document.getElementById('isCropFailedCheck').checked;
    const isFinal = document.getElementById('isFinalHarvestCheck').checked;
    
    let yieldKg = 0;
    let note = '';
    
    if(!isFailed) {
        let amount = parseFloat(document.getElementById('harvestAmountInput').value) || 0;
        const unit = document.getElementById('harvestUnitSelect').value;
        if(unit === 'mon') amount = amount * 40;
        if(unit === 'ton') amount = amount * 1000;
        yieldKg = amount;
        
        note = document.getElementById('harvestPortionInput').value.trim();
        if(note) note = `অংশ: ${note}`;
        
        if (yieldKg <= 0 && isFinal===false) {
            alert('দয়াকরে একটি সঠিক পরিমাণ দিন।');
            return;
        }
    } else {
        note = 'ফসল নষ্ট/মারা গেছে';
    }
    
    // Ensure final is true when failed
    const willComplete = isFinal || isFailed;
    const statusText = isFailed ? 'Failed' : (willComplete ? 'Harvested' : 'Healthy');
    
    const btn = document.getElementById('saveHarvest');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = 'লোড হচ্ছে...';
    btn.disabled = true;
    
    try {
        const token = localStorage.getItem('farmer_jwt');
        
        // If it's a final state, we trigger the /complete endpoint
        // Otherwise just update state?
        // Let's reuse /complete endpoint even for partial harvest, as it appends yield and notes!
        // But if it's NOT final, we just keep status = Healthy
        
        const payload = {
            status: statusText,
            yield_amount_kg: yieldKg,
            harvest_notes: note
        };
        
        const res = await fetch(`${API_URL}/api/crops/${activeCrop.id}/complete`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if(!res.ok) throw new Error('API Error');
        alert(willComplete ? 'ফসল বন্ধ করে হিস্ট্রিতে সেভ করা হয়েছে!' : 'কর্তন আপডেট হয়েছে।');
        
        document.getElementById('harvestModal').classList.remove('active');
        document.body.style.overflow='';
        
        await fetchFarmAndCropDetails();
    } catch(e) {
        alert("Failed: " + e.message);
    }
    
    btn.disabled = false;
    btn.innerHTML = oldHtml;
};

window.handleDeleteCrop = function() {
    closeCropActionModals();
    if(!activeCrop) return;
    
    document.getElementById('deleteCropModal').classList.add('active');
    document.body.style.overflow='hidden';
    
    // Check if planted
    const planted = activeCrop.planted_date ? new Date(activeCrop.planted_date).getTime() : 0;
    const now = Date.now();
    const isPlanted = planted > 0 && planted <= now;
    
    if(isPlanted) {
        document.getElementById('deletePrePlantWarning').style.display = 'none';
        document.getElementById('deletePostPlantWarning').style.display = 'block';
    } else {
        document.getElementById('deletePrePlantWarning').style.display = 'block';
        document.getElementById('deletePostPlantWarning').style.display = 'none';
    }
};

window.submitDeleteCrop = async function() {
    if(!activeCrop) return;
    
    // Optional: Could grab the reason from document.getElementById('deleteReasonSelect').value
    // But since it's a hard delete on backend, we just proceed.
    
    const btn = document.getElementById('confirmDeleteCropBtn');
    const oldText = btn.innerText;
    btn.innerText = 'মুছে ফেলা হচ্ছে...';
    btn.disabled = true;
    
    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/crops/${activeCrop.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) throw new Error('Failed to delete');
        
        alert('ফসল সম্পূর্ণরূপে মুছে ফেলা হয়েছে।');
        localStorage.removeItem('agritech_active_crop_name');
        
        document.getElementById('deleteCropModal').classList.remove('active');
        document.body.style.overflow='';
        window.location.href = 'khamar.html';
    } catch(e) {
        alert("Error: " + e.message);
        btn.innerText = oldText;
        btn.disabled = false;
    }
};

// ==========================================
// 3D Map & Tracking Handlers
// ==========================================

window.handle3DMapClick = async function() {
    const btn = document.getElementById('btn3DMap');
    if(!btn) return;
    
    const token = localStorage.getItem('farmer_jwt');
    const cropId = activeCrop ? activeCrop.id : getCropIdFromURL();
    
    if(!cropId) {
        return showToast('Tr', 'কোনো প্রজেক্ট সিলেক্ট করা নেই।');
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> লোড হচ্ছে...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/crops/${cropId}/plants`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && data.beds && data.beds.length > 0) {
            // Beds exist, redirect to 3D mapping page directly
            window.location.href = `plant_tracker.html?crop_id=${cropId}`;
        } else {
            // No beds yet, open Wizard
            document.getElementById('mapWizardModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    } catch (e) {
        console.error(e);
        showToast('Tr', 'ম্যাপ ডাটা ফেচ করতে সমস্যা হচ্ছে।');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.generate3DMapGrid = async function() {
    const numBeds = document.getElementById('wizardNumBeds').value;
    const bedLength = document.getElementById('wizardBedLength').value;
    const bedWidth = document.getElementById('wizardBedWidth').value;
    const rowsPerBed = document.getElementById('wizardRowsPerBed').value;
    const plantSpacing = document.getElementById('wizardPlantSpacing').value;

    if(!numBeds || !bedLength || !bedWidth || !rowsPerBed || !plantSpacing) {
        return showToast('Tr', 'দয়া করে সবগুলো ফিল্ড পূরণ করুন');
    }

    const btn = document.getElementById('btnGenerateMap');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> তৈরি হচ্ছে...';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('farmer_jwt');
        const cropId = activeCrop ? activeCrop.id : getCropIdFromURL();
        
        const payload = {
            numBeds: parseInt(numBeds),
            bedLength: parseFloat(bedLength),
            bedWidth: parseFloat(bedWidth),
            rowsPerBed: parseInt(rowsPerBed),
            plantSpacing: parseFloat(plantSpacing)
        };

        const res = await fetch(`${API_URL}/api/crops/${cropId}/plants/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('mapWizardModal').classList.remove('active');
            document.body.style.overflow = '';
            showToast('Tr', 'সাফল্যজনকভাবে ম্যাপ তৈরি হয়েছে!');
            // Redirect to 3D page
            setTimeout(() => {
                window.location.href = `plant_tracker.html?crop_id=${cropId}`;
            }, 600);
        } else {
            showToast('Tr', data.error || 'ম্যাপ তৈরি করতে ব্যর্থ হয়েছে');
        }
    } catch (e) {
        console.error(e);
        showToast('Tr', 'সার্ভার এরর');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};
