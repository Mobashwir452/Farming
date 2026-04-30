document.addEventListener('DOMContentLoaded', () => {
    initGlobalTasks();
    initTabs();
    initCalendarModal();
});

let globalTasks = [];
let activeRescheduleTask = null;
const ITEMS_PER_PAGE = 15;

const tabState = {
    'tab-upcoming': { items: [], page: 1, rendered: false, containerId: 'upcomingTasksList', lastGroup: null },
    'tab-missed': { items: [], page: 1, rendered: false, containerId: 'missedTasksList' },
    'tab-completed': { items: [], page: 1, rendered: false, containerId: 'completedTasksList' },
    'tab-canceled': { items: [], page: 1, rendered: false, containerId: 'cancelledTasksList' }
};

function getSkeletonHtml() {
    let html = '';
    for(let i=0; i<4; i++) {
        html += `
            <div class="skeleton-loader">
                <div class="skeleton-item skeleton-badge"></div>
                <div class="skeleton-item skeleton-header"></div>
                <div class="skeleton-item skeleton-desc"></div>
                <div class="skeleton-buttons">
                    <div class="skeleton-item skeleton-btn"></div>
                    <div class="skeleton-item skeleton-btn small"></div>
                    <div class="skeleton-item skeleton-btn small"></div>
                </div>
            </div>
        `;
    }
    return html;
}

async function initGlobalTasks() {
    try {
        const token = localStorage.getItem('farmer_jwt');
        if (!token) return;

        const activeTabBtn = document.querySelector('.task-tabs .tab-btn.active');
        const activeTabId = activeTabBtn ? activeTabBtn.getAttribute('data-target') : 'tab-upcoming';
        document.getElementById(tabState[activeTabId].containerId).innerHTML = getSkeletonHtml();

        const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
        const response = await fetch(`${BASE_URL}/api/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
            globalTasks = data.tasks;
            processTasks();
            renderActiveTab();
        }
    } catch (e) {
        console.error("Error fetching global tasks:", e);
    }
}

function processTasks() {
    const today = new Date();
    today.setHours(0,0,0,0);

    const pending = [];
    const missed = [];
    const completed = [];
    const cancelled = [];

    globalTasks.forEach(t => {
        if(t.status === 'completed') {
            completed.push(t);
        } else if(t.status === 'skipped') {
            cancelled.push(t);
        } else {
            if(t.due_date) {
                const d = new Date(t.due_date);
                d.setHours(0,0,0,0);
                if(d.getTime() < today.getTime()) {
                    missed.push(t);
                } else {
                    pending.push(t);
                }
            } else {
                pending.push(t);
            }
        }
    });

    pending.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    missed.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    completed.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
    cancelled.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));

    tabState['tab-upcoming'].items = pending;
    tabState['tab-missed'].items = missed;
    tabState['tab-completed'].items = completed;
    tabState['tab-canceled'].items = cancelled;
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.task-tabs .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).style.display = 'block';
            
            if (!tabState[targetId].rendered && globalTasks.length > 0) {
                renderTab(targetId);
            }
        });
    });
}

function renderActiveTab() {
    const activeTabBtn = document.querySelector('.task-tabs .tab-btn.active');
    const targetId = activeTabBtn ? activeTabBtn.getAttribute('data-target') : 'tab-upcoming';
    
    Object.keys(tabState).forEach(k => {
        tabState[k].page = 1;
        tabState[k].rendered = false;
        tabState[k].lastGroup = null;
    });

    renderTab(targetId);
}

// Ensure updateTaskStatus works with new setup
window.renderAllTabs = function() {
    processTasks();
    renderActiveTab();
}

function renderTab(tabId) {
    const container = document.getElementById(tabState[tabId].containerId);
    if(tabState[tabId].page === 1) container.innerHTML = '';
    
    if(tabId === 'tab-upcoming') renderUpcomingPage(container);
    if(tabId === 'tab-missed') renderMissedPage(container);
    if(tabId === 'tab-completed') renderCompletedPage(container);
    if(tabId === 'tab-canceled') renderCancelledPage(container);
}

function appendHtmlAndObserve(container, html, tabId) {
    const state = tabState[tabId];
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    const oldTrigger = container.querySelector('.load-more-trigger');
    if (oldTrigger) oldTrigger.remove();

    while(temp.firstChild) {
        container.appendChild(temp.firstChild);
    }
    
    state.rendered = true;
    
    if (state.page * ITEMS_PER_PAGE < state.items.length) {
        const trigger = document.createElement('div');
        trigger.className = 'load-more-trigger';
        trigger.style.height = '20px';
        container.appendChild(trigger);
        
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                observer.disconnect();
                state.page++;
                renderTab(tabId);
            }
        }, { rootMargin: '100px' });
        observer.observe(trigger);
    }
}

function renderUpcomingPage(container) {
    const state = tabState['tab-upcoming'];
    const page = state.page;
    const itemsToRender = state.items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    
    if (state.items.length === 0) {
        container.innerHTML = getEmptyState('কোনো আসন্ন কাজ নেই');
        state.rendered = true;
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let html = '';
    let currentGroupContainerOpen = false;

    itemsToRender.forEach((t, index) => {
        const d = new Date(t.due_date);
        d.setHours(0,0,0,0);
        
        let groupName = 'ভবিষ্যতের কাজ';
        if (d.getTime() === today.getTime()) groupName = 'আজ';
        else if (d.getTime() === tomorrow.getTime()) groupName = 'আগামীকাল';
        
        if (state.lastGroup !== groupName) {
            if (currentGroupContainerOpen) {
                html += `</section></div>`;
            }
            html += `<div class="date-group">
                <h3>${groupName}</h3>
                <section class="timeline-container" style="margin-bottom: 0;">`;
            state.lastGroup = groupName;
            currentGroupContainerOpen = true;
        } else if (page > 1 && index === 0) {
            html += `<div class="date-group">
                <section class="timeline-container" style="margin-bottom: 0; padding-top: 0;">`;
            currentGroupContainerOpen = true;
        }
        
        html += getUpcomingTaskHtml(t);
    });
    
    if (currentGroupContainerOpen) {
        html += `</section></div>`;
    }
    
    appendHtmlAndObserve(container, html, 'tab-upcoming');
}

function renderMissedPage(container) {
    const state = tabState['tab-missed'];
    const itemsToRender = state.items.slice((state.page - 1) * ITEMS_PER_PAGE, state.page * ITEMS_PER_PAGE);
    if (state.items.length === 0) {
        container.innerHTML = getEmptyState('কোনো ওভারডিউ কাজ নেই', '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>');
        state.rendered = true;
        return;
    }
    container.classList.add('timeline-container');
    container.style.marginBottom = '0';
    let html = '';
    itemsToRender.forEach(t => { html += getMissedTaskHtml(t); });
    appendHtmlAndObserve(container, html, 'tab-missed');
}

function renderCompletedPage(container) {
    const state = tabState['tab-completed'];
    const itemsToRender = state.items.slice((state.page - 1) * ITEMS_PER_PAGE, state.page * ITEMS_PER_PAGE);
    if (state.items.length === 0) {
        container.innerHTML = getEmptyState('কোনো সম্পন্ন কাজ নেই', '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>');
        state.rendered = true;
        return;
    }
    container.classList.add('timeline-container');
    container.style.marginBottom = '0';
    let html = '';
    itemsToRender.forEach(t => { html += getCompletedTaskHtml(t); });
    appendHtmlAndObserve(container, html, 'tab-completed');
}

function renderCancelledPage(container) {
    const state = tabState['tab-canceled'];
    const itemsToRender = state.items.slice((state.page - 1) * ITEMS_PER_PAGE, state.page * ITEMS_PER_PAGE);
    if (state.items.length === 0) {
        container.innerHTML = getEmptyState('কোনো বাতিল কাজ নেই', '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>');
        state.rendered = true;
        return;
    }
    container.classList.add('timeline-container');
    container.style.marginBottom = '0';
    let html = '';
    itemsToRender.forEach(t => { html += getCancelledTaskHtml(t); });
    appendHtmlAndObserve(container, html, 'tab-canceled');
}

// --- HTML Generators ---
function getUpcomingTaskHtml(t) {
    const dateObj = new Date(t.due_date);
    const timeStr = isNaN(dateObj) ? 'সময় নির্ধারিত নয়' : dateObj.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' });
    const title = t.title || 'অজানা কাজ';
    return `
        <div class="ld-task-item" style="position: relative; padding-left: 0; display: block; background: #fff; border: none; border-radius: 16px; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); margin-bottom: 12px; transition: transform 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="flex: 1; padding-right: 12px;">
                    <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1E293B; line-height: 1.3;">${title}</h4>
                </div>
                <div style="flex-shrink: 0;"><span style="font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #EEF2FF; color: #4F46E5; font-weight: 700; white-space: nowrap; display: inline-block;">${timeStr}</span></div>
            </div>
            
            <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center;">
                <span style="font-size: 11px; font-weight: 500; color: var(--primary-color); background: #dcfce7; padding: 4px 8px; border-radius: 6px;">${t.farm_name} • ${t.crop_name}</span>
            </div>

            <div class="task-item-actions" style="margin-top: 14px; display: flex; gap: 8px; align-items: center;">
                <button class="btn-tl-action done" onclick="updateTaskStatus('${t.crop_id}', '${t.id}', 'done')" style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; border: none; background: #10B981; color: white; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); transition: transform 0.2s, box-shadow 0.2s;" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg> সম্পন্ন
                </button>
                <button class="btn-tl-action reschedule" onclick="openRescheduleModal('${t.crop_id}', '${t.id}', '${t.due_date}')" style="padding: 10px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 1px solid #E2E8F0; background: #F8FAFC; border-radius: 10px; cursor: pointer; color: #475569; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'" title="সময় পরিবর্তন">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </button>
                <button class="btn-tl-action cancel" onclick="updateTaskStatus('${t.crop_id}', '${t.id}', 'skip')" style="padding: 10px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 1px solid #FECACA; background: #FEF2F2; border-radius: 10px; cursor: pointer; color: #EF4444; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'" title="বাতিল করুন">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
    `;
}

function getMissedTaskHtml(t) {
    const title = t.title || 'অজানা কাজ';
    return `
        <div class="ld-task-item warning" style="position: relative; padding-left: 0; display: block; background: #fff; border: none; border-radius: 16px; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); margin-bottom: 12px; transition: transform 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="flex: 1; padding-right: 12px;">
                    <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1E293B; line-height: 1.3;">${title}</h4>
                </div>
                <div style="flex-shrink: 0;"><span style="font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #FEF2F2; color: #DC2626; font-weight: 700; white-space: nowrap; display: inline-block;">মিস হয়েছে</span></div>
            </div>
            
            <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center;">
                <span style="font-size: 11px; font-weight: 500; color: var(--primary-color); background: #dcfce7; padding: 4px 8px; border-radius: 6px;">${t.farm_name} • ${t.crop_name}</span>
            </div>
            
            <p style="font-size: 13px; color: #EF4444; margin-top: 4px; font-weight: 600;">কাজটি ওভারডিউ হয়ে গেছে</p>

            <div class="task-item-actions" style="margin-top: 14px; display: flex; gap: 8px; align-items: center;">
                <button class="btn-tl-action done" onclick="updateTaskStatus('${t.crop_id}', '${t.id}', 'done')" style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; border: none; background: #10B981; color: white; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); transition: transform 0.2s, box-shadow 0.2s;" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg> সম্পন্ন
                </button>
                <button class="btn-tl-action reschedule" onclick="openRescheduleModal('${t.crop_id}', '${t.id}', '${t.due_date}')" style="padding: 10px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 1px solid #E2E8F0; background: #F8FAFC; border-radius: 10px; cursor: pointer; color: #475569; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'" title="সময় পরিবর্তন">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </button>
                <button class="btn-tl-action cancel" onclick="updateTaskStatus('${t.crop_id}', '${t.id}', 'skip')" style="padding: 10px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 1px solid #FECACA; background: #FEF2F2; border-radius: 10px; cursor: pointer; color: #EF4444; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'" title="বাতিল করুন">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
    `;
}

function getCompletedTaskHtml(t) {
    const title = t.title || 'অজানা কাজ';
    return `
        <div class="ld-task-item completed" style="position: relative; padding-left: 0; display: block; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 16px; box-shadow: none; margin-bottom: 12px; transition: transform 0.2s; opacity: 0.85;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="flex: 1; padding-right: 12px;">
                    <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1E293B; line-height: 1.3;">${title}</h4>
                </div>
                <div style="flex-shrink: 0;"><span style="font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #ECFDF5; color: #059669; font-weight: 700; white-space: nowrap; display: inline-block;">✓ সম্পন্ন</span></div>
            </div>
            <div style="margin-top: 4px; display: flex; gap: 8px; align-items: center;">
                <span style="font-size: 11px; font-weight: 500; color: #64748B; background: #F1F5F9; padding: 4px 8px; border-radius: 6px;">${t.farm_name} • ${t.crop_name}</span>
            </div>
        </div>
    `;
}

function getCancelledTaskHtml(t) {
    const title = t.title || 'অজানা কাজ';
    return `
        <div class="ld-task-item skipped" style="position: relative; padding-left: 0; display: block; background: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 16px; padding: 16px; box-shadow: none; margin-bottom: 12px; transition: transform 0.2s; opacity: 0.75;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="flex: 1; padding-right: 12px;">
                    <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1E293B; line-height: 1.3; text-decoration: line-through;">${title}</h4>
                </div>
                <div style="flex-shrink: 0;"><span style="font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #FFFBEB; color: #D97706; font-weight: 700; white-space: nowrap; display: inline-block;">✕ স্কিপ করা হয়েছে</span></div>
            </div>
            <div style="margin-top: 4px; display: flex; gap: 8px; align-items: center;">
                <span style="font-size: 11px; font-weight: 500; color: #64748B; background: #F1F5F9; padding: 4px 8px; border-radius: 6px;">${t.farm_name} • ${t.crop_name}</span>
            </div>
        </div>
    `;
}

function getEmptyState(text, iconHtml = '') {
    if(!iconHtml) iconHtml = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
    return `
        <div class="empty-state" style="text-align: center; padding: 60px 20px; color: #94A3B8;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; opacity: 0.5;">
                ${iconHtml}
            </svg>
            <p style="font-size: 14px; font-weight: 500;">${text}</p>
        </div>
    `;
}

window.updateTaskStatus = async function(cropId, taskId, action) {
    try {
        const token = localStorage.getItem('farmer_jwt');
        const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
        const res = await fetch(`${BASE_URL}/api/tasks/${cropId}/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: action })
        });
        
        const data = await res.json();
        if (data.success) {
            const t = globalTasks.find(x => x.id === taskId);
            if (t) {
                if(action === 'done') t.status = 'completed';
                if(action === 'skip') t.status = 'skipped';
            }
            renderAllTabs();
            showToast(action === 'done' ? 'কাজটি সম্পন্ন হয়েছে' : 'কাজটি বাতিল করা হয়েছে');
        } else {
            showToast('সমস্যা হয়েছে: ' + data.error);
        }
    } catch(e) {
        showToast('সার্ভার এরর');
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.classList.add('show');
    
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#1E293B';
    toast.style.color = '#fff';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '30px';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

    setTimeout(() => {
        toast.classList.remove('show');
        toast.style.display = 'none';
    }, 3000);
}

window.openRescheduleModal = function(cropId, taskId, currentDate) {
    activeRescheduleTask = { cropId, taskId };
    const modal = document.getElementById('calendarModal');
    if (modal) {
        modal.classList.add('active');
        renderCalendarDays(currentDate);
    }
}

function initCalendarModal() {
    const modal = document.getElementById('calendarModal');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    const confirmBtn = document.getElementById('confirmReschedule');
    confirmBtn.addEventListener('click', async () => {
        const selectedEl = document.querySelector('.calendar-day.selected');
        if (!selectedEl) {
            showToast('একটি তারিখ নির্বাচন করুন');
            return;
        }
        
        const newDate = selectedEl.getAttribute('data-date');
        if (activeRescheduleTask) {
            confirmBtn.innerText = "অপেক্ষা করুন...";
            confirmBtn.disabled = true;
            try {
                const token = localStorage.getItem('farmer_jwt');
                const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
                const res = await fetch(`${BASE_URL}/api/tasks/${activeRescheduleTask.cropId}/${activeRescheduleTask.taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'reschedule', newDate: newDate })
                });
                
                const data = await res.json();
                if (data.success) {
                    const t = globalTasks.find(x => x.id === activeRescheduleTask.taskId);
                    if (t) {
                        t.due_date = newDate;
                    }
                    renderAllTabs();
                    showToast('তারিখ পরিবর্তন করা হয়েছে');
                    modal.classList.remove('active');
                } else {
                    showToast('সমস্যা হয়েছে: ' + data.error);
                }
            } catch(e) {
                showToast('সার্ভার এরর');
            } finally {
                confirmBtn.innerText = "নির্ধারণ করুন";
                confirmBtn.disabled = false;
            }
        }
    });
}

function renderCalendarDays(currentDateStr) {
    const daysContainer = document.getElementById('calendarDays');
    daysContainer.innerHTML = '';
    
    let baseDate = new Date();
    if (currentDateStr && !isNaN(new Date(currentDateStr))) {
        baseDate = new Date(currentDateStr);
    }
    
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    
    document.querySelector('.calendar-month').innerText = baseDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        daysContainer.innerHTML += `<div class="calendar-day empty"></div>`;
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        d.setHours(0,0,0,0);
        
        let classes = 'calendar-day';
        if (d.getTime() === baseDate.getTime()) classes += ' selected';
        if (d.getTime() === today.getTime() && d.getTime() !== baseDate.getTime()) classes += ' today';
        
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        
        daysContainer.innerHTML += `<div class="${classes}" data-date="${dateStr}">${i}</div>`;
    }
    
    const dayEls = daysContainer.querySelectorAll('.calendar-day:not(.empty)');
    dayEls.forEach(el => {
        el.addEventListener('click', () => {
            dayEls.forEach(d => d.classList.remove('selected'));
            el.classList.add('selected');
        });
    });
}
