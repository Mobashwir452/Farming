import { registerComponents } from './components.js';
import { API_URL } from './auth.js';

let currentFarmId = null;
let activeCrop = null;

// Expose switchTab globally
window.switchTab = function(tabId, btnEl) {
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
            
            if(pageTitle) pageTitle.textContent = resData.farm.name;
            if(overviewTitle) overviewTitle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${resData.farm.name}`;
            if(areaValue) areaValue.textContent = `${resData.farm.area_shotangsho} শতাংশ`;

            // Display Active Crop
            const activeCrops = (resData.crops || []).filter(c => c.status !== 'Harvested');
            if (activeCrops.length > 0) {
                activeCrop = activeCrops[0]; // For simplicity, take the first active one
                
                // Set Crop Profile
                const cropNameEl = document.querySelector('.ld-crop-text h4');
                const cropStatusEl = document.querySelector('.ld-crop-text p:nth-child(3) span');
                if(cropNameEl) cropNameEl.textContent = activeCrop.crop_name;
                if(cropStatusEl) cropStatusEl.innerHTML = `${activeCrop.status} (এআই ম্যাপড)`;

                // Fill Financial Snapshot
                document.getElementById('current-cost-display').textContent = `৳ ${activeCrop.expected_cost_bdt || 0}`;
                document.getElementById('current-rev-display').textContent = `৳ ${activeCrop.expected_revenue_bdt || 0}`;
                const profitEl = document.getElementById('current-profit-display');
                if(profitEl) {
                    const profit = (activeCrop.expected_revenue_bdt || 0) - (activeCrop.expected_cost_bdt || 0);
                    profitEl.textContent = `৳ ${profit}`;
                }

                // Render Tabs
                renderTasksTab(activeCrop.tasks_state_json);
                renderGuidelineModal();
                renderResourcesTab(activeCrop.resources_state_json);
                renderFinanceTab();
                
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
                resources_state_json: activeCrop.resources_state_json
            })
        });
    } catch (e) {
        console.error("Failed to save crop state", e);
    }
}

// Global Toggle for resources and tasks (Optimistic UI)
window.toggleResourceCheck = function(id, el) {
    const parent = el.closest('.resource-check-item');
    if (el.checked) {
        parent.classList.add('bought');
    } else {
        parent.classList.remove('bought');
    }
    
    // Update local JSON state
    try {
        let resArr = JSON.parse(activeCrop.resources_state_json || '[]');
        const idx = resArr.findIndex(r => r.id === id);
        if (idx > -1) {
            resArr[idx].status = el.checked ? 'bought' : 'pending';
            activeCrop.resources_state_json = JSON.stringify(resArr);
            saveCropState();
            renderFinanceTab(); // re-evaluates updated costs based on bought resources? The user didn't mention this, but I'll update it later if needed.
        }
    } catch(e) {}
};

window.markTaskDone = function(taskId, btnEl) {
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
    } catch(e) {}
};

window.rescheduleTask = function(taskId) {
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
    } catch(e) {}
};

window.cancelTask = function(taskId) {
    try {
        let tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
        const filtered = tasks.filter(t => t.id !== taskId);
        activeCrop.tasks_state_json = JSON.stringify(filtered);
        saveCropState();
        renderTasksTab(activeCrop.tasks_state_json);
    } catch(e) {}
};

window.addCustomTask = function() {
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
    } catch(e) {
        console.error(e);
    }
};

function renderTasksTab(tasksJsonStr) {
    const tlContainer = document.getElementById('render-tasks');
    
    let tasks = [];
    try {
        tasks = JSON.parse(tasksJsonStr || '[]');
    } catch(e) {}

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
    const toBngDigits = (num) => String(num).split('').map(d => ({ '0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯' }[d] || d)).join('');

    // Format Bengali Date
    const formatBengaliDate = (dateStr) => {
        if(!dateStr) return '';
        const dateObj = new Date(dateStr);
        const today = new Date();
        today.setHours(0,0,0,0);
        dateObj.setHours(0,0,0,0);
        
        const diffTime = dateObj - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const bngMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        const dateNum = toBngDigits(dateObj.getDate());
        
        let prefix = '';
        if(diffDays === 0) prefix = 'আজ, ';
        else if(diffDays === 1) prefix = 'আগামীকাল, ';
        else if(diffDays === -1) prefix = 'গতকাল, ';
        
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
            } else {
                if (task.due_date === todayStr) {
                    itemClass = 'active';
                    dateLabel = 'আজকের কাজ';
                    showActions = true;
                } else if (task.due_date < todayStr) {
                    itemClass = 'warning';
                    dateLabel = `মিস হয়েছে`;
                    showActions = true;
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

    tlContainer.innerHTML += `
        <!-- Add Custom Step Button -->
        <div style="padding: 0 16px;">
            <button
                style="width: 100%; padding: 12px; background: transparent; border: 1px dashed var(--border-color); border-radius: 12px; color: var(--text-main); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;"
                onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'"
                onclick="document.getElementById('customStepModal').classList.add('active'); document.body.style.overflow='hidden';">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                নতুন কাজ বা ধাপ যোগ করুন
            </button>
        </div>
    `;
}

function renderResourcesTab(resJsonStr) {
    const resContainer = document.getElementById('render-resources');
    
    let resources = [];
    try {
        resources = JSON.parse(resJsonStr || '[]');
    } catch(e) {}

    if (resources.length === 0) {
        resContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো রিসোর্স পাওয়া যায়নি।</p>';
        return;
    }

    const grouped = {
        'seed_or_sapling': { title: 'বীজ বা চারা', items: [] },
        'fertilizer': { title: 'সার ব্যবস্থাপনা', items: [] },
        'pesticide': { title: 'বালাইনাশক ও ঔষধ', items: [] },
        'labor_and_other': { title: 'শ্রমিক ও অন্যান্য', items: [] }
    };

    resources.forEach(r => {
        const cat = r.category || 'labor_and_other';
        if (grouped[cat]) {
            grouped[cat].items.push(r);
        } else {
            grouped['labor_and_other'].items.push(r);
        }
    });

    resContainer.innerHTML = '';

    for (const [key, group] of Object.entries(grouped)) {
        if (group.items.length > 0) {
            resContainer.innerHTML += `
            <div style="margin-top: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <h4 style="font-size: 14px; font-weight: 700; color: var(--primary-dark); margin: 0; background: var(--primary-light); padding: 4px 10px; border-radius: 12px;">${group.title}</h4>
                <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
            </div>`;
            
            group.items.forEach((res) => {
                const isBought = res.status === 'bought';
                resContainer.innerHTML += `
                    <div class="resource-check-item ${isBought ? 'bought' : ''}" style="margin-bottom: 8px;">
                        <input type="checkbox" class="res-checkbox" onchange="toggleResourceCheck('${res.id}', this)" ${isBought ? 'checked' : ''}>
                        <div style="flex: 1;">
                            <h4 class="res-title" style="margin: 0 0 4px 0; font-size: 15px; color: var(--text-main); font-weight: 600;">${res.name}</h4>
                            <p style="margin: 0; font-size: 13px; color: var(--text-muted);">পরিমাণ: <strong>${res.amount || '-'}</strong> | আনুমানিক: ৳${res.estimated_cost_bdt || 0}</p>
                        </div>
                    </div>
                `;
            });
        }
    }
}

function renderFinanceTab() {
    const finContainer = document.getElementById('render-finance');
    finContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো আর্থিক হিসাব এখনো যুক্ত করা হয়নি।</p>';
    // Wait for subsequent integration of manual transaction recording
}

window.renderGuidelineModal = function() {
    const modalBody = document.querySelector('#aiGuidelineModal .calendar-body');
    if (!modalBody) return;
    
    let tasks = [];
    try {
        tasks = JSON.parse(activeCrop.tasks_state_json || '[]');
    } catch(e) {}

    if (tasks.length === 0) {
        modalBody.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো নির্দেশিকা পাওয়া যায়নি।</p>';
        return;
    }

    // Sort by day_offset or due_date
    tasks.sort((a, b) => {
        if(a.day_offset !== undefined && b.day_offset !== undefined) {
            return a.day_offset - b.day_offset;
        }
        return new Date(a.due_date) - new Date(b.due_date);
    });

    // Helper to Bengali Digits
    const toBngDigits = (num) => String(num).split('').map(d => ({ '0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯' }[d] || d)).join('');

    let guidelineHtml = `<div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">`;

    tasks.forEach(task => {
        const dayLabel = task.day_offset !== undefined ? `দিন ${toBngDigits(task.day_offset)}` : '';
        guidelineHtml += `
            <div style="display: flex; gap: 12px; position: relative;">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: var(--primary); border: 2px solid #fff; box-shadow: 0 0 0 2px var(--primary-light); z-index: 2;"></div>
                    <div style="width: 2px; flex: 1; background: var(--border-color); margin-top: 4px;"></div>
                </div>
                <div style="flex: 1; padding-bottom: 16px;">
                    <div style="font-size: 13px; color: var(--primary-dark); font-weight: 700; margin-bottom: 4px;">${dayLabel}</div>
                    <div style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${task.title}</div>
                    <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">${task.description}</div>
                </div>
            </div>
        `;
    });

    guidelineHtml += `</div>`;
    modalBody.innerHTML = guidelineHtml;
};
