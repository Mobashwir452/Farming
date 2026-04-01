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
                <div class="card" style="box-shadow: none; border: 1px solid var(--border-color); margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${l.name}</h3>
                            <p style="font-size: 13px; color: var(--text-muted);">আয়তন: ${l.area_shotangsho} শতাংশ</p>
                            <p style="font-size: 12px; color: var(--text-muted);">অবস্থান: ${l.location || '-'}</p>
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
