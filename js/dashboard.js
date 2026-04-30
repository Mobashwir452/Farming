import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ensure all Modular Web Components are loaded and initialized
    registerComponents();

    // 2. Load Dashboard Data Dynamically
    loadDashboardData();
});

async function loadDashboardData() {
    const API_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
    const token = localStorage.getItem('farmer_jwt');
    const profileStr = localStorage.getItem('farmer_profile');

    // --- 1. User Profile Greeting ---
    const greetingEl = document.getElementById('dashGreetingHero');
    if (greetingEl && profileStr) {
        try {
            const profile = JSON.parse(profileStr);
            const firstName = profile.name ? profile.name.split(' ')[0] : 'চাষী';
            greetingEl.textContent = `শুভ সকাল, ${firstName}! 👋`;
            greetingEl.classList.remove('skeleton', 'skeleton-text');
            greetingEl.style.width = 'auto';
        } catch(e) {}
    } else if (greetingEl) {
        greetingEl.textContent = 'শুভ সকাল! 👋';
        greetingEl.classList.remove('skeleton', 'skeleton-text');
        greetingEl.style.width = 'auto';
    }

    // --- 2. Dynamic Weather Widget ---
    const wIconEl = document.getElementById('dashWeatherIcon');
    const wTempEl = document.getElementById('dashWeatherTemp');
    const wCondEl = document.getElementById('dashWeatherCond');
    try {
        const cachedWeather = localStorage.getItem('agritech_weather_cache_v2');
        if (cachedWeather) {
            const parsed = JSON.parse(cachedWeather);
            if (parsed.data && parsed.data.current) {
                const current = parsed.data.current;
                const conditionText = (current.condition_bn || current.condition || '').toString();
                const tempC = Math.round(current.temp || current.temp_c || 0);
                
                if (wTempEl) {
                    wTempEl.textContent = `${tempC}°C`;
                    wTempEl.classList.remove('skeleton', 'skeleton-text');
                }
                if (wCondEl) {
                    wCondEl.textContent = conditionText;
                    wCondEl.classList.remove('skeleton', 'skeleton-text');
                }
                if (wIconEl) {
                    let wEmoji = '☀️';
                    let cLow = conditionText.toLowerCase();
                    if (cLow.includes('rain') || cLow.includes('drizzle') || cLow.includes('বৃষ্টি')) wEmoji = '🌧️';
                    else if (cLow.includes('cloud') || cLow.includes('মেঘ')) wEmoji = '☁️';
                    else if (cLow.includes('thunder') || cLow.includes('বজ্র')) wEmoji = '⛈️';
                    wIconEl.textContent = wEmoji;
                    wIconEl.classList.remove('skeleton', 'skeleton-circle');
                }
            }
        } else {
             if (wTempEl) { wTempEl.textContent = '২৬°C'; wTempEl.classList.remove('skeleton', 'skeleton-text'); }
             if (wCondEl) { wCondEl.textContent = 'রোদ'; wCondEl.classList.remove('skeleton', 'skeleton-text'); }
             if (wIconEl) { wIconEl.textContent = '☀️'; wIconEl.classList.remove('skeleton', 'skeleton-circle'); }
        }
    } catch (e) {
        if (wTempEl) { wTempEl.textContent = '-'; wTempEl.classList.remove('skeleton', 'skeleton-text'); }
        if (wCondEl) { wCondEl.textContent = '-'; wCondEl.classList.remove('skeleton', 'skeleton-text'); }
        if (wIconEl) { wIconEl.textContent = '☁️'; wIconEl.classList.remove('skeleton', 'skeleton-circle'); }
    }

    if (!token) {
        console.warn("No token found for dashboard data.");
        clearSkeletons();
        return;
    }

    // --- 3. Fetch Farms & Transactions & Tasks Concurrently ---
    try {
        const [farmsRes, txRes, tasksRes] = await Promise.all([
            fetch(`${API_URL}/api/farms`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
            fetch(`${API_URL}/api/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
            fetch(`${API_URL}/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
        ]);

        const farmsData = farmsRes && farmsRes.ok ? await farmsRes.json() : null;
        const txData = txRes && txRes.ok ? await txRes.json() : null;
        const tasksData = tasksRes && tasksRes.ok ? await tasksRes.json() : null;

        // Build farm lookup mapping
        let farmNameToId = {};
        if (farmsData && farmsData.farms) {
            farmsData.farms.forEach(f => {
                farmNameToId[f.name] = f.id;
            });
        }

        // --- Update Farms Count ---
        const farmCountEl = document.getElementById('dashFarmCount');
        if (farmCountEl && farmsData && farmsData.success) {
            const count = farmsData.farms ? farmsData.farms.length : 0;
            farmCountEl.textContent = `${count.toLocaleString('bn-BD')} টি খামার`;
            farmCountEl.classList.remove('skeleton', 'skeleton-text');
            farmCountEl.style.width = 'auto';
        } else if(farmCountEl) {
            farmCountEl.textContent = '০ টি খামার';
            farmCountEl.classList.remove('skeleton', 'skeleton-text');
        }

        // --- Update Transactions ---
        const incExpEl = document.getElementById('dashIncomeExpense');
        const txContainer = document.getElementById('dashTransactionsContainer');
        
        if (txData && txData.success && txData.transactions) {
            const transactions = txData.transactions;
            
            // Calculate total profit/loss
            let totalIncome = 0;
            let totalExpense = 0;
            transactions.forEach(tx => {
                if (tx.type === 'income') totalIncome += Number(tx.amount_bdt || 0);
                else if (tx.type === 'expense') totalExpense += Number(tx.amount_bdt || 0);
            });
            const net = totalIncome - totalExpense;
            
            if (incExpEl) {
                if (net >= 0) {
                    incExpEl.textContent = `৳ ${net.toLocaleString('bn-BD')} লাভ`;
                    incExpEl.style.color = '#059669'; // success color
                } else {
                    incExpEl.textContent = `৳ ${Math.abs(net).toLocaleString('bn-BD')} ক্ষতি`;
                    incExpEl.style.color = '#DC2626'; // danger color
                }
                incExpEl.classList.remove('skeleton', 'skeleton-text');
                incExpEl.style.width = 'auto';
            }

            // Update Recent Transactions
            if (txContainer) {
                txContainer.innerHTML = ''; // Clear skeletons
                if (transactions.length === 0) {
                    txContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748B; font-size: 14px;">কোনো লেনদেন নেই</div>`;
                } else {
                    // Sort descending by date
                    transactions.sort((a,b) => {
                        const dateA = new Date((a.transaction_date || '').replace(' ', 'T'));
                        const dateB = new Date((b.transaction_date || '').replace(' ', 'T'));
                        return dateB - dateA;
                    });
                    const recentTxs = transactions.slice(0, 3); // Show top 3
                    
                    recentTxs.forEach(tx => {
                        let dateStr = 'অজানা তারিখ';
                        if (tx.transaction_date) {
                            try {
                                const d = new Date(tx.transaction_date.replace(' ', 'T'));
                                dateStr = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
                            } catch(e) {}
                        }
                        const isIncome = tx.type === 'income';
                        const titleName = tx.category && tx.category.includes('ম্যানুয়াল') ? (tx.description || tx.category) : (tx.category || (isIncome ? 'আয়' : 'ব্যয়'));

                        const html = `
                            <div class="transaction-item" style="cursor: pointer; transition: transform 0.2s;" onclick="window.location.href='transactions.html'" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                                <div class="tr-icon ${isIncome ? 'income' : 'expense'}">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        ${isIncome 
                                            ? '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>'
                                            : '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>'}
                                    </svg>
                                </div>
                                <div class="tr-info">
                                    <h4>${titleName}</h4>
                                    <p>${dateStr}</p>
                                </div>
                                <div class="tr-amount ${isIncome ? 'positive' : 'negative'}">${isIncome ? '+' : '-'} ৳ ${Number(tx.amount_bdt || 0).toLocaleString('bn-BD')}</div>
                            </div>
                        `;
                        txContainer.innerHTML += html;
                    });
                }
            }
        } else {
            if(incExpEl) {
                incExpEl.textContent = '৳ ০ লাভ-ক্ষতি';
                incExpEl.classList.remove('skeleton', 'skeleton-text');
            }
            if(txContainer) {
                txContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748B; font-size: 14px;">কোনো ডেটা পাওয়া যায়নি</div>`;
            }
        }

        // --- Update Tasks ---
        const dashHeroSection = document.getElementById('dashHeroSection');
        const dashHeroTitle = document.getElementById('dashHeroTitle');
        const dashHeroSubtitle = document.getElementById('dashHeroSubtitle');
        const dashHeroActions = document.getElementById('dashHeroActions');
        const tlContainer = document.getElementById('dashTimelineContainer');

        if (tasksData && tasksData.success && tasksData.tasks) {
            // Filter pending tasks
            let pendingTasks = tasksData.tasks.filter(t => t.status !== 'completed' && t.status !== 'skipped');
            
            // Sort by date (closest first)
            pendingTasks.sort((a,b) => {
                const dateA = a.due_date ? new Date(a.due_date) : new Date(9999,0,1);
                const dateB = b.due_date ? new Date(b.due_date) : new Date(9999,0,1);
                return dateA - dateB;
            });

            const today = new Date();
            today.setHours(0,0,0,0);
            
            let overdueTasks = [];
            let todayTasks = [];
            
            pendingTasks.forEach(t => {
                if (t.due_date) {
                    const d = new Date(t.due_date);
                    d.setHours(0,0,0,0);
                    if (d.getTime() < today.getTime()) overdueTasks.push(t);
                    else if (d.getTime() === today.getTime()) todayTasks.push(t);
                }
            });

            let mainTask = null;
            let isMainTaskMissed = false;

            if (todayTasks.length > 0) {
                mainTask = todayTasks[0];
            } else if (overdueTasks.length > 0) {
                mainTask = overdueTasks[0]; // Oldest overdue task
                isMainTaskMissed = true;
            }

            if (pendingTasks.length > 0 && mainTask) {
                // We have a main task
                if (dashHeroSection) dashHeroSection.classList.remove('empty-state');
                
                const mFarmId = farmNameToId[mainTask.farm_name] || '';
                const mLink = `land_details.html?id=${mFarmId}&crop_id=${mainTask.crop_id}`;
                
                if (dashHeroTitle) {
                    dashHeroTitle.textContent = mainTask.title || 'প্রধান কাজ';
                    dashHeroTitle.classList.remove('skeleton', 'skeleton-text');
                    dashHeroTitle.style.cursor = 'pointer';
                    dashHeroTitle.onclick = () => window.location.href = mLink;
                }
                
                if (dashHeroSubtitle) {
                    let badgeHTML = '';
                    if (isMainTaskMissed) {
                        badgeHTML = `<span style="color: #EF4444; background: #FEF2F2; padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-right: 6px;">⚠️ মিস হয়েছে</span>`;
                    } else {
                        badgeHTML = `<span style="color: #059669; background: #ECFDF5; padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-right: 6px;">🎯 আজকের কাজ</span>`;
                    }
                    dashHeroSubtitle.innerHTML = `${badgeHTML} ${mainTask.farm_name ? mainTask.farm_name + ' • ' : ''}${mainTask.crop_name || ''}`;
                    dashHeroSubtitle.classList.remove('skeleton', 'skeleton-text');
                }

                if (dashHeroActions) {
                    dashHeroActions.style.display = 'flex';
                    dashHeroActions.innerHTML = `
                        <button class="dhero-action-btn success" id="btnMainTaskComplete" data-crop="${mainTask.crop_id}" data-task="${mainTask.id}">সম্পন্ন করেছি</button>
                        <button class="dhero-action-btn danger-outline" id="btnMainTaskLater">বাতিল</button>
                    `;

                    // Bind complete logic
                    const btnComplete = document.getElementById('btnMainTaskComplete');
                    if (btnComplete) {
                        btnComplete.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            btnComplete.innerText = "প্রসেস হচ্ছে...";
                            btnComplete.style.opacity = '0.7';
                            try {
                                const res = await fetch(`${API_URL}/api/tasks/${mainTask.crop_id}/${mainTask.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ action: 'done' })
                                });
                                const rData = await res.json();
                                if(rData.success) {
                                    btnComplete.innerText = "√ সম্পন্ন হয়েছে";
                                    setTimeout(() => window.location.reload(), 800);
                                } else {
                                    btnComplete.innerText = "ব্যর্থ হয়েছে";
                                    setTimeout(() => { btnComplete.innerText = "সম্পন্ন করেছি"; btnComplete.style.opacity = '1'; }, 2000);
                                }
                            } catch(e) {
                                btnComplete.innerText = "ত্রুটি";
                                setTimeout(() => { btnComplete.innerText = "সম্পন্ন করেছি"; btnComplete.style.opacity = '1'; }, 2000);
                            }
                        });
                    }

                    // Bind 'Skip' logic
                    const btnLater = document.getElementById('btnMainTaskLater');
                    if (btnLater) {
                        btnLater.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            btnLater.innerText = "বাতিল হচ্ছে...";
                            btnLater.style.opacity = '0.7';
                            try {
                                const res = await fetch(`${API_URL}/api/tasks/${mainTask.crop_id}/${mainTask.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ action: 'skip' })
                                });
                                const rData = await res.json();
                                if(rData.success) {
                                    btnLater.innerText = "বাতিল করা হয়েছে";
                                    setTimeout(() => window.location.reload(), 800);
                                } else {
                                    btnLater.innerText = "ব্যর্থ হয়েছে";
                                    setTimeout(() => { btnLater.innerText = "বাতিল"; btnLater.style.opacity = '1'; }, 2000);
                                }
                            } catch(e) {
                                btnLater.innerText = "ত্রুটি";
                                setTimeout(() => { btnLater.innerText = "বাতিল"; btnLater.style.opacity = '1'; }, 2000);
                            }
                        });
                    }
                }

                // Render Timeline (excluding mainTask)
                let timelineTasks = pendingTasks.filter(t => t.id !== mainTask.id).slice(0, 3);
                renderTimelineTasks(timelineTasks, tlContainer, today, farmNameToId);

            } else {
                // Empty State logic
                renderEmptyHero();
                
                // Show timeline tasks
                let timelineTasks = pendingTasks.slice(0, 3);
                renderTimelineTasks(timelineTasks, tlContainer, today, farmNameToId);
            }
        } else {
            // No data at all
            renderEmptyHero();
            if (tlContainer) tlContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748B; font-size: 14px;">কোনো ডেটা পাওয়া যায়নি</div>`;
        }

    } catch (e) {
        console.error("Dashboard Data Fetch Error:", e);
        clearSkeletons();
    }
}

function renderEmptyHero() {
    const dashHeroSection = document.getElementById('dashHeroSection');
    const dashHeroTitle = document.getElementById('dashHeroTitle');
    const dashHeroSubtitle = document.getElementById('dashHeroSubtitle');
    const dashHeroActions = document.getElementById('dashHeroActions');

    if (dashHeroSection) dashHeroSection.classList.add('empty-state');
    
    if (dashHeroTitle) {
        dashHeroTitle.textContent = 'কোনো কাজ বাকি নেই 🎉';
        dashHeroTitle.classList.remove('skeleton', 'skeleton-text');
        dashHeroTitle.style.cursor = 'default';
        dashHeroTitle.onclick = null;
    }
    if (dashHeroSubtitle) {
        dashHeroSubtitle.textContent = 'আজকের সব কাজ সম্পন্ন হয়েছে। বিশ্রাম নিন বা খামার ঘুরে দেখুন!';
        dashHeroSubtitle.classList.remove('skeleton', 'skeleton-text');
        dashHeroSubtitle.style.color = '#0284C7';
    }
    if (dashHeroActions) {
        dashHeroActions.style.display = 'flex';
        dashHeroActions.innerHTML = `
            <button class="dhero-action-btn" style="background: white; color: #0284C7; border: 1px solid #BAE6FD;" onclick="window.location.href='khamar.html'">খামার দেখুন</button>
        `;
    }
}

function renderTimelineTasks(tasks, container, today, farmNameToId) {
    if (!container) return;
    container.innerHTML = ''; // clear skeletons

    if (tasks.length === 0) {
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748B; font-size: 14px;">আর কোনো কাজ বাকি নেই</div>`;
        return;
    }

    tasks.forEach(task => {
        let dateStr = 'সময় নির্ধারিত নয়';
        let isMissed = false;
        if (task.due_date) {
            const d = new Date(task.due_date);
            const dTime = new Date(d);
            dTime.setHours(0,0,0,0);
            
            if (dTime.getTime() < today.getTime()) isMissed = true;

            dateStr = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
        }

        const tFarmId = farmNameToId[task.farm_name] || '';
        const tLink = `land_details.html?id=${tFarmId}&crop_id=${task.crop_id}`;

        const html = `
            <div class="timeline-item ${isMissed ? 'alert' : 'pending'}" style="cursor: pointer; transition: transform 0.2s;" onclick="window.location.href='${tLink}'" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                <div class="tl-node">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        ${isMissed ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' : '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'}
                    </svg>
                </div>
                <div class="tl-content">
                    <p class="tl-time" ${isMissed ? 'style="color: #EF4444;"' : ''}>${isMissed ? 'মিস হয়েছে - ' : ''}${dateStr}</p>
                    <p class="tl-title">${task.title}</p>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function clearSkeletons() {
    document.querySelectorAll('.skeleton').forEach(el => {
        el.classList.remove('skeleton', 'skeleton-text', 'skeleton-circle');
        el.style.width = 'auto';
        el.style.color = '';
        if(el.tagName === 'SMALL' || el.tagName === 'P' || el.tagName === 'H3' || el.tagName === 'H4') {
            el.textContent = '-';
        }
    });
}
