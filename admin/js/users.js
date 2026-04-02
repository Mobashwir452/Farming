let currentUsersPage = 1;
const LIMIT = 10;
let currentSearch = '';
let currentUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    
    // Attach event listeners for search & filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            currentUsersPage = 1;
            loadUsers();
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            // Note: backend may need status filter support, but currently we just fetch all and possibly filter in JS or add it later.
            // For now, reload.
            loadUsers();
        });
    }
});

async function loadUsers() {
    try {
        const token = localStorage.getItem('agritech_admin_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const res = await fetch(`${API_BASE_URL}/admin/users?page=${currentUsersPage}&limit=${LIMIT}&search=${encodeURIComponent(currentSearch)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();

        if (d.success) {
            renderUsersTable(d.data);
            renderPagination(d.pagination);
        } else {
            console.error("Failed to load users:", d.error);
        }
    } catch(err) {
        console.error("Error loading users:", err);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">কোনো ইউজার পাওয়া যায়নি</td></tr>`;
        return;
    }

    // Client-side status filter fallback if API doesn't support it directly
    const statusVal = document.getElementById('statusFilter')?.value || '';
    let filteredUsers = users;
    if (statusVal === 'active') filteredUsers = users.filter(u => u.is_active === 1);
    else if (statusVal === 'suspended') filteredUsers = users.filter(u => u.is_active === 0);

    filteredUsers.forEach(user => {
        const tr = document.createElement('tr');
        
        let avatarHTML = '';
        if (false) { // Condition if user has an image (future)
            avatarHTML = `<img src="${user.profile_url}" style="width: 32px; height: 32px; border-radius: 50%;">`;
        } else {
            const firstLetter = (user.full_name || 'U').charAt(0).toUpperCase();
            avatarHTML = `<div style="width: 32px; height: 32px; border-radius: 50%; background: #E2E8F0; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: #64748B;">${firstLetter}</div>`;
        }

        const subBadge = user.subscription_status === 'pro' 
            ? `<span class="badge badge-premium">প্রিমিয়াম</span>` 
            : `<span class="badge badge-free">ফ্রি</span>`;
        
        const limitText = user.subscription_status === 'pro' ? 'Unlm' : `${user.remaining_timelines}/${user.remaining_scans}/${user.remaining_chats}`;
            
        const statusBadge = user.is_active === 1 
            ? `<span class="badge badge-active">অ্যাক্টিভ</span>`
            : `<span class="badge badge-danger">সাসপেন্ডেড</span>`;

        // Dummy district since DB does not inherently store district unless inside locations or farms
        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${avatarHTML}
                    <span style="font-weight: 500;">${user.full_name || 'অজানা'}</span>
                </div>
            </td>
            <td>${user.phone_number || '-'}</td>
            <td>খামার: ${user.total_lands}টি</td>
            <td>${subBadge}</td>
            <td style="font-size: 12px; font-weight: 500;">${limitText}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right;">
                <button class="btn-outline-primary" style="padding: 6px 12px; font-size: 12px;" onclick="openUserPanelDetails(${user.id})">প্রোফাইল দেখুন</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPagination(pag) {
    const info = document.getElementById('paginationInfo');
    const controls = document.getElementById('paginationControls');
    if(!info || !controls) return;

    info.textContent = `মোট ${pag.total} জন`;

    controls.innerHTML = '';
    
    // Prev
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'পূর্ববর্তী';
    prevBtn.style.cssText = `padding: 6px 12px; border: 1px solid var(--border-color); background: white; border-radius: 6px; cursor: pointer; ${pag.page <= 1 ? 'color: var(--text-muted); cursor: not-allowed;' : ''}`;
    prevBtn.disabled = pag.page <= 1;
    prevBtn.onclick = () => { if(pag.page > 1) { currentUsersPage--; loadUsers(); } };
    controls.appendChild(prevBtn);

    // Current
    const curBtn = document.createElement('button');
    curBtn.textContent = pag.page;
    curBtn.style.cssText = `padding: 6px 12px; border: 1px solid var(--primary); background: var(--primary); color: white; border-radius: 6px;`;
    controls.appendChild(curBtn);

    // Next
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'পরবর্তী';
    nextBtn.style.cssText = `padding: 6px 12px; border: 1px solid var(--border-color); background: white; border-radius: 6px; cursor: pointer; ${pag.page >= pag.totalPages ? 'color: var(--text-muted); cursor: not-allowed;' : ''}`;
    nextBtn.disabled = pag.page >= pag.totalPages;
    nextBtn.onclick = () => { if(pag.page < pag.totalPages) { currentUsersPage++; loadUsers(); } };
    controls.appendChild(nextBtn);
}


// SLIDE OVER LOGIC
let currentTxPage = 1;
async function openUserPanelDetails(id) {
    // Show overlay to indicate loading
    openUserPanel();
    currentUserId = id;
    currentTxPage = 1;

    // Reset financial list and hide load more btn
    const fList = document.getElementById('financialsList');
    const lBtn = document.getElementById('loadMoreTxsBtn');
    if(fList) fList.innerHTML = '';
    if(lBtn) lBtn.style.display = 'none';

    const token = localStorage.getItem('agritech_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${id}/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if(d.success) {
            populatePanel(d.data);
            loadTransactions(id, 1);
        } else {
            alert("Error: " + d.error);
            closeUserPanel();
        }
    } catch(err) {
        console.error(err);
        closeUserPanel();
    }
}

function populatePanel(data) {
    const user = data.user;
    
    // Basic Header
    const titleHeader = document.querySelector('.panel-title h2');
    const titleSub = document.querySelector('.panel-title p');
    if(titleHeader) {
        titleHeader.innerHTML = `${user.full_name || 'অজানা'} 
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: #EFF6FF;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        `;
    }
    if(titleSub) {
        titleSub.innerHTML = `+880 ${user.phone_number} • জয়েন: ${new Date(user.created_at).toLocaleDateString()}`;
    }

    // Tab Data - OVERVIEW
    const overviewTab = document.getElementById('tab-overview');
    if(overviewTab) {
        let subscriptionText = user.subscription_status === 'pro' 
            ? `প্রিমিয়াম ${user.subscription_expiry ? '(মেয়াদ: ' + new Date(user.subscription_expiry).toLocaleDateString() + ')' : ''}`
            : `ফ্রি (বাকি স্ক্যান: ${user.remaining_scans}, টাইমলাইন: ${user.remaining_timelines}, চ্যাট: ${user.remaining_chats})`;
            
        let statusHtml = user.is_active === 1 
            ? `<div class="val" style="color: var(--primary);">অ্যাক্টিভ</div>`
            : `<div class="val" style="color: var(--danger);">সাসপেন্ডেড</div>`;

        // We target internal divs directly. To make it exact, we can replace the innerHTML entirely.
        overviewTab.innerHTML = `
            <div class="data-grid">
                <div class="data-item">
                    <label>পূর্ণ নাম</label>
                    <div class="val">${user.full_name || 'অজানা'}</div>
                </div>
                <div class="data-item">
                    <label>স্ট্যাটাস</label>
                    ${statusHtml}
                </div>
                <div class="data-item">
                    <label>ফলোআপ নম্বর</label>
                    <div class="val">${user.phone_number || '-'}</div>
                </div>
                <div class="data-item">
                    <label>সাবস্ক্রিপশন</label>
                    <div class="val" style="color: #8B5CF6;">${subscriptionText}</div>
                </div>
                <div class="data-item">
                    <label>মোট জমি</label>
                    <div class="val">${data.lands.length}টি</div>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="action-row" style="margin-top: 24px;">
                <button class="btn-primary" style="display: flex; align-items: center; gap: 8px;" onclick="upgradeUserManually(${user.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                    ফ্রি থেকে প্রিমিয়াম
                </button>
                <button class="btn-outline-primary" style="display: flex; align-items: center; gap: 8px; color: var(--danger); border-color: var(--danger); margin-left: auto;" onclick="toggleUserStatus(${user.id}, ${user.is_active})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    ${user.is_active === 1 ? 'সাসপেন্ড করুন' : 'অ্যাক্টিভেট করুন'}
                </button>
            </div>
        `;
    }

// Tab Data - LANDS (Farms)
    const landsTab = document.getElementById('tab-lands');
    if(landsTab) {
        if(data.lands.length === 0){
            landsTab.innerHTML = `<div style="padding: 24px; text-align:center; color: #64748B;">কোনো জমিক তথ্য নেই</div>`;
        } else {
            landsTab.innerHTML = data.lands.map(l => `
                <div class="card" onclick="openAdminLandDrawer(${user.id}, ${l.id}, '${l.name.replace(/'/g, "\\'")}', '${l.area_shotangsho}')" style="box-shadow: none; border: 1px solid var(--border-color); margin-bottom: 16px; cursor: pointer; transition: all 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px; color: var(--primary);">${l.name}</h3>
                            <p style="font-size: 13px; color: var(--text-muted);">আয়তন: ${l.area_shotangsho} শতাংশ</p>
                            <p style="font-size: 12px; color: var(--text-muted);">অবস্থান: ${l.location || '-'}</p>
                        </div>
                        <div style="background: var(--bg-color); padding: 6px; border-radius: 50%;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Tab Data - FINANCIALS
    if (data.financials) {
        const net = data.financials.total_income - data.financials.total_expense;
        const eNet = document.getElementById('financialNet');
        const eInc = document.getElementById('financialIncome');
        const eExp = document.getElementById('financialExpense');
        
        if(eNet) {
            eNet.textContent = `${net >= 0 ? '+' : '-'} ৳ ${Math.abs(net).toLocaleString('bn-BD')}`;
            eNet.style.color = net >= 0 ? 'var(--primary)' : 'var(--danger)';
        }
        if(eInc) eInc.textContent = `৳ ${data.financials.total_income.toLocaleString('bn-BD')}`;
        if(eExp) eExp.textContent = `৳ ${data.financials.total_expense.toLocaleString('bn-BD')}`;
    }

    // Tab Data - ACTIVITY
    const cropScansLabel = document.getElementById('totalCropScans');
    if (cropScansLabel) cropScansLabel.textContent = `${user.ai_scan_count || data.activity.length} বার`;

    const aList = document.getElementById('activityList');
    if (aList) {
        if (data.activity && data.activity.length > 0) {
            aList.innerHTML = data.activity.map(a => `
                <li style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color);">
                    <span style="color: var(--text-main);">AI স্ক্যান: ${a.ai_diagnosis || 'Unknown'}</span>
                    <span style="color: var(--text-muted);">${new Date(a.created_at).toLocaleString()}</span>
                </li>
            `).join('');
        } else {
            aList.innerHTML = `<li style="text-align:center; color: var(--text-muted); font-size: 13px;">কোনো অ্যাক্টিভিটি পাওয়া যায়নি</li>`;
        }
    }

    // Tab Data - SECURITY
    const clearBtn = document.getElementById('clearPinBtn');
    if (clearBtn) {
        clearBtn.onclick = () => clearUserPin(user.id);
    }
}

async function loadTransactions(id, page) {
    const token = localStorage.getItem('agritech_admin_token');
    const loading = document.getElementById('txsLoading');
    const loadMoreBtn = document.getElementById('loadMoreTxsBtn');
    const fList = document.getElementById('financialsList');
    
    if (loading) loading.style.display = 'block';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${id}/transactions?page=${page}&limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        
        if (d.success) {
            if (page === 1) fList.innerHTML = '';
            
            if (d.data.length === 0 && page === 1) {
                fList.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 20px 10px; color: var(--text-muted); font-size: 13px;">কোনো ট্রানজেকশন নেই</td></tr>`;
            } else {
                d.data.forEach(tx => {
                    const tr = document.createElement('tr');
                    tr.style.cssText = "border-bottom: 1px solid var(--border-color);";
                    
                    const isIncome = tx.type === 'income';
                    const amountStr = `${isIncome ? '+' : '-'} ৳ ${parseFloat(tx.amount || 0).toLocaleString('bn-BD')}`;
                    const color = isIncome ? 'var(--primary)' : 'var(--danger)';
                    const dateStr = tx.date ? new Date(tx.date).toLocaleDateString('bn-BD') : (tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('bn-BD') : '-');

                    tr.innerHTML = `
                        <td style="padding: 12px 16px; font-size: 13px;">${dateStr}</td>
                        <td style="padding: 12px 16px; font-size: 13px;">${tx.title || 'Unknown'}</td>
                        <td style="padding: 12px 16px; font-size: 13px; text-align: right; color: ${color};">${amountStr}</td>
                    `;
                    fList.appendChild(tr);
                });
            }

            if (d.pagination.page < d.pagination.totalPages) {
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = 'inline-block';
                    loadMoreBtn.onclick = () => {
                        currentTxPage++;
                        loadTransactions(currentUserId, currentTxPage);
                    };
                }
            }
        }
    } catch(err) {
        console.error("Trans load err:", err);
    } finally {
        if(loading) loading.style.display = 'none';
    }
}

async function clearUserPin(id) {
    if (!confirm('আপনি কি নিশ্চিত যে এই ইউজারের পিন ক্লিয়ার করতে চান? ইউজার এরপর ফোন নাম্বার দিয়ে ওটিপি নিয়ে নতুন পিন সেট করতে পারবে।')) return;
    
    const token = localStorage.getItem('agritech_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${id}/clear-pin`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.success) {
            alert('পিন মুছে ফেলা হয়েছে!');
        } else {
            alert(d.error || 'Error clearing PIN');
        }
    } catch (e) {
        alert('নেটওয়ার্ক সমস্যা।');
        console.error(e);
    }

}

// Actions
async function toggleUserStatus(id, currentStatus) {
    if(!confirm(`ইউজারের স্ট্যাটাস পরিবর্তন করতে চান?`)) return;
    const token = localStorage.getItem('agritech_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: currentStatus === 1 ? false : true })
        });
        const d = await res.json();
        if(d.success) {
            alert('সফলভাবে স্ট্যাটাস আপডেট হয়েছে!');
            loadUsers();
            openUserPanelDetails(id); // reload panel
        } else {
            alert(d.error);
        }
    } catch(e) { console.error(e); }
}

async function upgradeUserManually(id) {
    if(!confirm("এই ইউজারকে ম্যানুয়ালি প্রিমিয়াম প্ল্যানে (মাস্টার এগ্রো - ১২ মাস) উন্নীত করতে চান?")) return;
    const token = localStorage.getItem('agritech_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/admin/subscriptions/manual-upgrade`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: id, amount: 499 })
        });
        const d = await res.json();
        if(d.success) {
            alert('সফলভাবে প্রিমিয়াম করা হয়েছে!');
            loadUsers();
            openUserPanelDetails(id); // reload panel
        } else {
            alert(d.error);
        }
    } catch(e) { console.error(e); }
}

// Side Drawer for Land Details
function closeAdminLandDrawer() {
    document.getElementById('landDrawerOverlay').classList.remove('active');
    document.getElementById('landDrawer').classList.remove('active');
}

async function openAdminLandDrawer(userId, farmId, farmName, farmArea) {
    window.adminFarmName = farmName;
    window.adminFarmAreaStr = farmArea;
    updateAdminDrawerHeader('land');
    
    // Setup panes visibility
    document.getElementById('pane-land-level').style.display = 'block';
    document.getElementById('pane-crop-level').style.display = 'none';

    document.getElementById('landDrawerLoader').style.display = 'block';
    document.getElementById('adminLandLevelContent').style.display = 'none';
    
    document.getElementById('landDrawerOverlay').classList.add('active');
    document.getElementById('landDrawer').classList.add('active');

    const token = localStorage.getItem('agritech_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/farms/${farmId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        
        document.getElementById('landDrawerLoader').style.display = 'none';
        document.getElementById('adminLandLevelContent').style.display = 'block';

        if(d.success) {
            window.adminFarmCrops = d.crops || [];
            window.adminFarmTransactions = d.transactions || [];
            window.adminFarmArea = parseFloat(farmArea) || 1;

            renderAdminLandLevelView();
        } else {
            document.getElementById('adminLandLevelContent').innerHTML = `<div style="color: var(--danger); text-align: center;">ডেটা লোড করতে সমস্যা হয়েছে: ${d.error || 'Unknown Error'}</div>`;
        }
    } catch(e) { 
        console.error(e); 
        document.getElementById('landDrawerLoader').style.display = 'none';
        document.getElementById('adminLandLevelContent').style.display = 'block';
        document.getElementById('adminLandLevelContent').innerHTML = `<div style="color: var(--danger); text-align: center;">নেটওয়ার্ক সমস্যা!</div>`;
    }
}

function updateAdminDrawerHeader(level) {
    const headerEl = document.getElementById('dynamicAdminLandHeader');
    if (!headerEl) return;
    
    headerEl.style.display = 'block';
    
    if (level === 'land') {
        headerEl.style.marginBottom = '20px';
        const areaStr = window.adminFarmAreaStr ? `আয়তন: ${toBngDigits(window.adminFarmAreaStr)} শতাংশ` : '';
        headerEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; width: 100%;">
                <div style="display: flex; justify-content: flex-start;">
                    <button onclick="closeAdminLandDrawer()" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color: var(--text-muted); font-size: 14px; font-weight: 600;" title="ফিরে যান">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> ফিরে যান
                    </button>
                </div>
                <div style="text-align: center; overflow: hidden;">
                    <h2 id="landDrawerName" style="font-size: 18px; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(window.adminFarmName || 'জমির নাম')}</h2>
                    <p id="landDrawerArea" style="font-size: 13px; color: var(--text-muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${areaStr}</p>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                    <button class="btn-close-panel" onclick="closeAdminLandDrawer()" style="background: none; border: none; padding: 0; cursor: pointer; color: var(--text-muted);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
        `;
    } else {
        headerEl.style.marginBottom = '0px';
        const cropName = window.adminActiveCrop ? (window.adminActiveCrop.variety ? `${window.adminActiveCrop.crop_name} (${window.adminActiveCrop.variety})` : window.adminActiveCrop.crop_name) : 'ফসল';
        const subtitle = `${escapeHtml(window.adminFarmName || '')} • ${window.adminFarmAreaStr ? toBngDigits(window.adminFarmAreaStr) + ' শতাংশ' : ''}`;
        
        headerEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; width: 100%;">
                <div style="display: flex; justify-content: flex-start;">
                    <button onclick="backToAdminLandLevel()" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color: var(--text-muted); font-size: 14px; font-weight: 600;" title="ফিরে যান">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> ফিরে যান
                    </button>
                </div>
                <div style="text-align: center; overflow: hidden;">
                    <h2 style="font-size: 18px; font-weight: 700; color: var(--primary-dark); margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(cropName)}</h2>
                    <p style="font-size: 13px; color: var(--text-muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${subtitle}</p>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                    <button class="btn-close-panel" onclick="closeAdminLandDrawer()" style="background: none; border: none; padding: 0; cursor: pointer; color: var(--text-muted);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
        `;
    }
}

function renderAdminLandLevelView() {
    const crops = window.adminFarmCrops;
    const transactions = window.adminFarmTransactions;
    const container = document.getElementById('adminLandLevelContent');
    let html = '';

    // Active Crop
    let activeCrop = crops.find(c => c.status === 'Active' || c.status === 'Healthy' || c.status === 'Weak' || c.status === 'Damaged');
    if(!activeCrop && crops.length > 0 && crops[0].status !== 'harvested') activeCrop = crops[0];
    
    html += `<div style="margin-bottom: 24px;">
                <h4 style="font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">বর্তমান ফসল</h4>`;
    if (activeCrop) {
        const cropIndex = crops.indexOf(activeCrop);
        const cropName = activeCrop.variety ? `${activeCrop.crop_name} (${activeCrop.variety})` : activeCrop.crop_name;
        const statusBadge = `<span class="badge ${activeCrop.status === 'Healthy' || activeCrop.status === 'Active' ? 'badge-active' : 'badge-warning'}">${activeCrop.status === 'Active' ? 'চাষ চলছে' : activeCrop.status}</span>`;
        
        html += `
            <div class="card" onclick="openAdminCropDetails(${cropIndex})" style="box-shadow: none; border: 1px solid var(--border-color); background: white; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin:0;">${escapeHtml(cropName)}</h3>
                    ${statusBadge}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <p style="font-size: 13px; color: var(--text-main); margin: 0 0 4px 0;">রোপন: ${activeCrop.planted_date ? new Date(activeCrop.planted_date).toLocaleDateString('bn-BD') : 'অজানা'} </p>
                        <p style="font-size: 12px; color: var(--text-muted); margin: 0;">এআই স্ক্যানিং: ${toBngDigits(activeCrop.scan_count || 0)} বার (এই জমির সাথে সম্পর্কিত)</p>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>`;
    } else {
        html += `<div class="card" style="box-shadow: none; border: 1px dashed var(--border-color); text-align: center; color: var(--text-muted); padding: 20px;">
                    এই জমিতে বর্তমানে কোনো ফসল নেই
                </div>`;
    }
    html += `</div>`;

    // Total Financial Summary
    let totalExp = 0, totalInc = 0;
    transactions.forEach(t => {
        if(t.type === 'expense') totalExp += parseFloat(t.amount_bdt || 0);
        if(t.type === 'income') totalInc += parseFloat(t.amount_bdt || 0);
    });

    html += `
        <div style="margin-bottom: 24px;">
            <h4 style="font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">আর্থিক বিবরণী (সর্বমোট)</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="card" style="box-shadow: none; border: 1px solid #FECDD3; background: #FFF1F2; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #9F1239; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                        মোট খরচ
                    </div>
                    <div style="font-size: 18px; font-weight: 800; color: #BE185D;">৳ ${toBngDigits(totalExp.toFixed(2))}</div>
                </div>
                <div class="card" style="box-shadow: none; border: 1px solid #A7F3D0; background: #ECFDF5; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #065F46; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                        মোট আয়
                    </div>
                    <div style="font-size: 18px; font-weight: 800; color: #059669;">৳ ${toBngDigits(totalInc.toFixed(2))}</div>
                </div>
            </div>
        </div>
    `;

    // Previous Crops
    const pastCrops = crops.filter(c => c !== activeCrop);
    if (pastCrops.length > 0) {
        html += `<div style="margin-bottom: 24px;">
                    <h4 style="font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">অতীত ফসলসমূহ</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">`;
        pastCrops.forEach((pc) => {
            const index = crops.indexOf(pc);
            const title = pc.variety ? `${pc.crop_name} (${pc.variety})` : pc.crop_name;
            const statusLabel = pc.status === 'harvested' ? 'হারভেস্ট করা হয়েছে' : pc.status;
            html += `
                <div class="card" onclick="openAdminCropDetails(${index})" style="box-shadow: none; border: 1px solid var(--border-color); cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; transition: all 0.2s;">
                    <div>
                        <div style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${escapeHtml(title)}</div>
                        <div style="font-size: 13px; color: var(--text-muted);">${statusLabel} | রোপন: ${pc.planted_date ? new Date(pc.planted_date).toLocaleDateString('bn-BD') : ''}</div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>`;
        });
        html += `</div></div>`;
    }

    container.innerHTML = html;
}

function openAdminCropDetails(cropIndex) {
    const crop = window.adminFarmCrops[cropIndex];
    if (!crop) return;
    
    window.adminActiveCrop = crop;
    
    // Switch panes
    document.getElementById('pane-land-level').style.display = 'none';
    document.getElementById('pane-crop-level').style.display = 'flex';
    
    // Set Header
    updateAdminDrawerHeader('crop');

    // Reset tabs automatically to the first one
    const tabs = document.querySelectorAll('#pane-crop-level .panel-tabs .tab-btn');
    if(tabs.length > 0) switchAdminLandTab('admin-land-tab-overview', tabs[0]);

    // Render Subtabs for this Specific Crop
    renderAdminOverviewTab();
    renderAdminTasksTab(crop.tasks_state_json);
    renderAdminResourcesTab(crop.resources_state_json);
    renderAdminGuidelineModal();
    renderAdminFinanceTab(); 
}

function backToAdminLandLevel() {
    document.getElementById('pane-crop-level').style.display = 'none';
    document.getElementById('pane-land-level').style.display = 'block';
    updateAdminDrawerHeader('land');
}

function switchAdminLandTab(tabId, btnEl) {
    const drawer = document.getElementById('pane-crop-level');
    drawer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    drawer.querySelectorAll('.admin-land-pane').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    btnEl.classList.add('active');
    const target = document.getElementById(tabId);
    if(target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
}

const escapeHtml = (text) => (text || '').toString().replace(/[&<>"']/g, m => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;','\'': '&#039;'}[m]));
const toBngDigits = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

function renderAdminOverviewTab() {
    const contentDiv = document.getElementById('render-admin-overview');
    let html = '';
    const activeCrop = window.adminActiveCrop;

    if(activeCrop) {
        const cropName = activeCrop.variety ? `${activeCrop.crop_name} (${activeCrop.variety})` : activeCrop.crop_name;
        const statusBadge = `<span class="badge ${activeCrop.status === 'Healthy' || activeCrop.status === 'Active' ? 'badge-active' : 'badge-warning'}">${activeCrop.status === 'Active' ? 'চাষ চলছে' : activeCrop.status}</span>`;
        html += `
            <div style="margin-bottom: 24px;">
                <div class="card" style="box-shadow: none; border: 1px solid var(--border-color); background: var(--bg-color);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <h3 style="font-size: 16px; font-weight: 600;">${escapeHtml(cropName)}</h3>
                        ${statusBadge}
                    </div>
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">রোপন: ${activeCrop.planted_date ? new Date(activeCrop.planted_date).toLocaleDateString('bn-BD') : 'অজানা'} </p>
                    <p style="font-size: 13px; color: var(--text-muted);">এআই স্ক্যানিং: ${toBngDigits(activeCrop.scan_count || 0)} বার (এই জমির সাথে সম্পর্কিত)</p>
                </div>
            </div>
        `;
    }
    contentDiv.innerHTML = html;
}

function renderAdminTasksTab(tasksJsonStr) {
    const tlContainer = document.getElementById('render-tasks');
    let tasks = [];
    try { tasks = JSON.parse(tasksJsonStr || '[]'); } catch (e) { }

    if (tasks.length === 0) {
        tlContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো কাজ পাওয়া যায়নি।</p>';
        return;
    }

    tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const groupedTasks = {};
    tasks.forEach(task => {
        const dateStr = task.due_date;
        if (!groupedTasks[dateStr]) groupedTasks[dateStr] = [];
        groupedTasks[dateStr].push(task);
    });

    tlContainer.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];

    const formatBengaliDate = (dateStr) => {
        if (!dateStr) return '';
        const dObj = new Date(dateStr);
        const tObj = new Date(); tObj.setHours(0,0,0,0); dObj.setHours(0,0,0,0);
        const diffDays = Math.ceil((dObj - tObj) / 86400000);
        const bngM = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        let prefix = diffDays === 0 ? 'আজ, ' : (diffDays === 1 ? 'আগামীকাল, ' : (diffDays === -1 ? 'গতকাল, ' : ''));
        return `${prefix}${toBngDigits(dObj.getDate())} ${bngM[dObj.getMonth()]}`;
    };

    for (const [dateStr, dateTasks] of Object.entries(groupedTasks)) {
        let groupHtml = `<div style="margin-bottom: 24px;"><h3 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">${formatBengaliDate(dateStr)}</h3><div style="display: flex; flex-direction: column; gap: 12px;">`;
        dateTasks.forEach(task => {
            let itemClass = ''; let dateLabel = '';
            if (task.status === 'completed') { itemClass = 'completed'; dateLabel = `<span style="color: var(--primary);">✓ সম্পন্ন</span>`; }
            else if (task.status === 'cancelled') { itemClass = 'warning'; dateLabel = `<span style="color: #EF4444;">✕ বাতিলকৃত</span>`; }
            else {
                if (task.due_date === todayStr) { itemClass = 'active'; dateLabel = 'আজকের কাজ'; }
                else if (task.due_date < todayStr) { itemClass = 'warning'; dateLabel = `মিস হয়েছে`; }
                else { itemClass = 'default'; dateLabel = 'সামনের কাজ'; }
            }
            const bgC = itemClass === 'completed' ? '#ECFDF5' : (itemClass === 'active' ? '#EEF2FF' : (itemClass === 'warning' ? '#FEF2F2' : '#F8FAFC'));
            const textC = itemClass === 'completed' ? '#059669' : (itemClass === 'active' ? '#4F46E5' : (itemClass === 'warning' ? '#DC2626' : '#64748B'));
            
            groupHtml += `
                <div style="background: #fff; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-main);">${escapeHtml(task.title)}</h4>
                        <span style="font-size: 11px; padding: 4px 8px; border-radius: 8px; background: ${bgC}; color: ${textC}; font-weight: 600;">${dateLabel}</span>
                    </div>
                    ${task.description ? `<p style="margin: 0; font-size: 13px; color: var(--text-muted);">${escapeHtml(task.description)}</p>` : ''}
                </div>`;
        });
        tlContainer.innerHTML += groupHtml + `</div></div>`;
    }
}

function renderAdminResourcesTab(resJsonStr) {
    const resContainer = document.getElementById('render-resources');
    let resources = [];
    try { resources = JSON.parse(resJsonStr || '[]'); } catch (e) { }

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

    if (resources.length === 0) {
        resContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">কোনো রিসোর্স পাওয়া যায়নি।</p>';
        return;
    }

    resContainer.innerHTML = '';
    for (const [key, group] of Object.entries(grouped)) {
        if (group.items.length > 0) {
            resContainer.innerHTML += `<div style="margin-top: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;"><h4 style="font-size: 13px; font-weight: 700; color: var(--primary-dark); margin: 0; background: var(--primary-light); padding: 4px 10px; border-radius: 12px;">${group.title}</h4><div style="flex: 1; height: 1px; background: var(--border-color);"></div></div>`;
            group.items.forEach(res => {
                const isBought = res.status === 'bought';
                resContainer.innerHTML += `
                    <div style="margin-bottom: 12px; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; background: ${isBought ? '#F8FAFC' : 'white'};">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <input type="checkbox" disabled ${isBought ? 'checked' : ''} style="transform: scale(1.1);">
                            <div style="flex: 1;">
                                <h4 style="margin: 0; font-size: 14px; color: var(--text-main); font-weight: 600;">${escapeHtml(res.name)}</h4>
                                <div style="display: flex; gap: 12px; margin-top: 4px; font-size: 12px; color: var(--text-muted);">
                                    <span>পরিমাণ: ${escapeHtml(res.amount || '-')}</span>
                                    <span>খরচ: ৳ ${res.estimated_cost_bdt || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
            });
        }
    }
}

function renderAdminFinanceTab() {
    const finContainer = document.getElementById('render-finance');
    // Using adminFarmTransactions directly as it contains all farm transactions.
    const txs = window.adminFarmTransactions || [];
    let totalIn = 0, totalEx = 0;
    txs.forEach(t => { if(t.type === 'income') totalIn += t.amount_bdt; if(t.type === 'expense') totalEx += t.amount_bdt; });

    let listHtml = txs.map(t => {
        const isInc = t.type === 'income';
        const iconColor = isInc ? '#10B981' : '#EF4444';
        const iconBg = isInc ? '#D1FAE5' : '#FEE2E2';
        const sign = isInc ? '+' : '-';
        const dStr = t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : 'অজানা';
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 18px; background: ${iconBg}; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                        ${isInc ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>'}
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: var(--text-main);">${escapeHtml(t.description || t.category)}</h4>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--text-muted);">${dStr}</p>
                    </div>
                </div>
                <div><span style="font-weight: 700; font-size: 14px; color: ${iconColor};">${sign}৳${t.amount_bdt}</span></div>
            </div>`;
    }).join('');

    finContainer.innerHTML = `
        <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between;">
                <div style="text-align: center; flex: 1; border-right: 1px solid var(--border-color);">
                    <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 4px 0;">মোট আয়</p>
                    <h3 style="font-size: 16px; color: #10B981; margin: 0; font-weight: 700;">৳ ${totalIn}</h3>
                </div>
                <div style="text-align: center; flex: 1;">
                    <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 4px 0;">মোট ব্যয়</p>
                    <h3 style="font-size: 16px; color: #EF4444; margin: 0; font-weight: 700;">৳ ${totalEx}</h3>
                </div>
            </div>
        </div>
        ${txs.length ? `<div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; margin-bottom: 20px;"><h4 style="margin: 0; padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid var(--border-color); font-size: 13px; font-weight: 700;">লেনদেনের তালিকা</h4>${listHtml}</div>` : '<p style="text-align:center; color: var(--text-muted);">কোনো লেনদেন নেই</p>'}
    `;
}

async function renderAdminGuidelineModal() {
    const container = document.getElementById('modal-guideline-content');
    if (!window.adminActiveCrop) return;
    container.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">লোড হচ্ছে...</p>';

    let masterCache = { timeline_json: null, risks_json: null };
    try {
        const token = localStorage.getItem('agritech_admin_token');
        let cName = window.adminActiveCrop.crop_name || '';
        let vName = window.adminActiveCrop.variety_name || cName;
        if (!window.adminActiveCrop.variety_name && cName.includes('(')) {
            const m = cName.match(/\((.*?)\)/);
            if(m) { vName = m[1].trim(); cName = cName.replace(/\(.*?\)/, '').trim(); }
        }
        const res = await fetch(`${API_BASE_URL}/admin/cache?crop=${encodeURIComponent(cName)}&variety=${encodeURIComponent(vName)}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const resData = await res.json();
        // Since we are admin, we can also use public endpoint if admin one doesn't exist, handling fallback:
        if (resData.success && resData.cache) masterCache = resData.cache;
        else {
            const pRes = await fetch(`${API_BASE_URL}/public/cache?crop=${encodeURIComponent(cName)}&variety=${encodeURIComponent(vName)}`);
            const pData = await pRes.json();
            if(pData.success && pData.cache) masterCache = pData.cache;
        }
    } catch (e) { console.error("Cache miss"); }

    let html = `<div><h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">রোগবালাই ও ঝুঁকি</h4>`;
    let risks = [];
    try { risks = JSON.parse(masterCache.risks_json || window.adminActiveCrop.risks_json || '[]'); } catch(e){}
    if(risks.length) {
        risks.forEach(risk => {
            const title = risk.risk_name || risk.message || risk.title || 'ঝুঁকি';
            const isWarn = risk.type === 'warning', isInfo = risk.type === 'info';
            const boxb = isWarn?'#FECDD3':(isInfo?'#BFDBFE':'#FDE68A');
            const badg = isWarn?'#FFF1F2':(isInfo?'#EFF6FF':'#FEF3C7');
            const textc = isWarn?'#BE185D':(isInfo?'#1D4ED8':'#B45309');
            const lbl = isWarn?'Warning':(isInfo?'Info':(risk.type==='lifespan'?'Lifespan':(risk.type||'সতর্কতা')));
            html += `<div style="background: white; border: 1px solid ${boxb}; padding: 12px; border-radius: 8px; display: flex; gap: 12px; margin-bottom: 8px;">
                <div style="padding: 4px 8px; border: 1px solid ${boxb}; border-radius: 6px; font-size: 12px; background: ${badg}; color: ${textc}; font-weight: 600; flex-shrink: 0;">${lbl}</div>
                <div style="flex-grow: 1; font-size: 13px; color: var(--text-main);">${escapeHtml(title)}</div>
            </div>`;
        });
    } else { html += '<p style="font-size:13px; color:var(--text-muted);">ঝুঁকি ডেটা নেই</p>'; }

    html += `<h4 style="font-size: 14px; font-weight: 600; margin: 24px 0 12px 0;">নির্দেশিকা টাইমলাইন</h4>`;
    let tl = [];
    try { 
        const s = masterCache.timeline_json || window.adminActiveCrop.timeline_json;
        if(s) { const jp = JSON.parse(s); tl = Array.isArray(jp) ? jp : (jp.guideline || jp.timeline || []); }
        if(!tl.length && window.adminActiveCrop.tasks_state_json) tl = JSON.parse(window.adminActiveCrop.tasks_state_json);
    } catch(e){}

    if(tl.length) {
        tl.sort((a,b) => (a.day_offset||0) - (b.day_offset||0));
        tl.forEach((t, i) => {
            const tit = t.title || t.task_name || 'ধাপ';
            const des = t.description || '';
            const tL = tit.toLowerCase();
            const bgC = tL.includes('বীজ')||tL.includes('চারা')?'#dcfce7':(tL.includes('বপন')||tL.includes('সেচ')?'#dbeafe':(tL.includes('সার')?'#fef9c3':(tL.includes('রোগ')?'#fee2e2':'#F1F5F9')));
            html += `<div style="background: white; border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px;">
                <div style="background: ${bgC}; font-weight: 700; width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">${toBngDigits(i+1)}</div>
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${escapeHtml(tit)}</div>
                    <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">${escapeHtml(des)}</div>
                </div>
            </div>`;
        });
    } else { html += '<p style="font-size:13px; color:var(--text-muted);">টাইমলাইন নেই</p>'; }
    
    // Add Hishab (Finance Estimate)
    let masterCacheReady = masterCache && masterCache.resources_json;
    if (masterCacheReady) {
        const area = window.adminFarmArea || 1;
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

        html += `
            <div style="height: 1px; background: var(--border-color); margin: 32px 0 24px 0;"></div>
            <h4 style="font-size: 16px; font-weight: 700; color: var(--primary-dark); margin-bottom: 16px;">এআই প্রাক্কলিত হিসাব (সম্ভাব্য আয়-ব্যয়)</h4>
            <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 14px; color: var(--primary-dark); font-weight: 700; display:flex; align-items:center; gap:8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    সম্ভাব্য ফলন ও আয় (AI প্রোজেক্টেড - ${toBngDigits(area)} শতাংশ)
                </h3>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                    <span style="color: var(--text-muted); font-size: 13px;">আনুমানিক ফলন:</span>
                    <strong style="color: var(--text-main); font-size: 14px;">${toBngDigits(totalYield)} কেজি</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                    <span style="color: var(--text-muted); font-size: 13px;">আনুমানিক বাজারদর:</span>
                    <strong style="color: var(--text-main); font-size: 14px;">৳ ${toBngDigits(pricePerKg)} / কেজি</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                    <span style="color: var(--text-muted); font-size: 13px;">সর্বমোট সম্ভাব্য আয়:</span>
                    <strong style="color: #10B981; font-size: 14px;">${toBngDigits(totalRevenue)} টাকা</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-muted); font-size: 13px;">নিট বা সম্ভাব্য লাভ:</span>
                    <strong style="color: ${netProfit >= 0 ? '#4F46E5' : '#EF4444'}; font-size: 18px; font-weight: 800;">${toBngDigits(netProfit)} টাকা</strong>
                </div>
            </div>

            <h3 style="margin: 0 0 16px 0; font-size: 14px; color: var(--text-main); font-weight: 700; display:flex; align-items:center; gap:8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="22"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                সম্ভাব্য খরচের তালিকা (AI প্রোজেক্টেড)
            </h3>
        `;

        for (const [key, group] of Object.entries(grouped)) {
            if (group.items.length > 0) {
                html += `
                <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="background: #F8FAFC; padding: 10px 16px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px;">${group.icon}</span>
                        <h4 style="margin: 0; font-size: 13px; color: var(--text-main); font-weight: 700;">${group.title}</h4>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                                <th style="text-align: left; padding: 8px 16px; font-weight: 600;">উপাদানের নাম</th>
                                <th style="text-align: right; padding: 8px 16px; font-weight: 600;">পরিমাণ</th>
                                <th style="text-align: right; padding: 8px 16px; font-weight: 600;">মূল্য (৳)</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                group.items.forEach(r => {
                    const amountBn = translateUnit(r.amountScale);
                    const costBn = toBngDigits(r.estimated_cost_bdt);
                    html += `
                            <tr style="border-bottom: 1px dashed var(--border-color);">
                                <td style="padding: 10px 16px; color: var(--text-main);">${escapeHtml(r.name)}</td>
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
            <div style="background: #FEF2F2; border: 1px solid #FECDD3; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <span style="font-size: 13px; font-weight: 700; color: #9F1239;">সর্বমোট সম্ভাব্য খরচ (৳):</span>
                <strong style="font-size: 18px; color: #BE185D;">${toBngDigits(totalExpectedCost)}</strong>
            </div>
            <p style="text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 12px;">(এখানে দেখানো খরচ এবং আয় শুধুমাত্র এআই-প্রজেক্টেড। আপনার নিজস্ব আয়-ব্যয় ট্রাক করতে মেইন পেইজের "আয়-ব্যয়" ট্যাবে যান।)</p>
        `;
    }

    container.innerHTML = html;
}
