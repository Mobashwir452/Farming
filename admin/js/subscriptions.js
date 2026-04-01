// Subscriptions Logic

document.addEventListener('DOMContentLoaded', () => {
    loadPackages();
    loadActiveUsers();
    loadHistory();
    loadPendingPayments();
});

const token = localStorage.getItem('agritech_admin_token');
// API_BASE_URL is inherited from rbac.js

// =======================
// 1. Packages
// =======================
async function loadPackages() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/packages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.success) {
            renderPackages(d.data);
            
            // Populate manual upgrade dropdown
            const select = document.getElementById('manualPackageSelect');
            if(select) {
                select.innerHTML = '<option value="">প্যাকেজ নির্বাচন করুন...</option>' + d.data.map(pkg => 
                    `<option value="${pkg.id}" data-price="${pkg.price_bdt}">${pkg.name} (৳${pkg.price_bdt})</option>`
                ).join('');
            }
        }
    } catch (e) { console.error('Error loading packages', e); }
}

function renderPackages(packages) {
    const grid = document.getElementById('packagesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    packages.forEach(pkg => {
        grid.innerHTML += `
            <div class="package-card ${pkg.name.toLowerCase().includes('pro') || pkg.name.toLowerCase().includes('premium') ? 'premium' : ''}" style="position: relative; padding: 20px;">
                ${pkg.name.toLowerCase().includes('1 year') || pkg.name.toLowerCase().includes('12') ? '<div class="premium-badge">POPULAR</div>' : ''}
                
                <div class="pkg-header" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; text-align: left;">
                    <button type="button" onclick="deletePackageBtn(${pkg.id})" style="position: absolute; right: 20px; top: 20px; background: #fee2e2; border: none; color: #ef4444; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'" title="প্যাকেজ ডিলিট করুন">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    
                    <input type="text" id="pkg-name-${pkg.id}" value="${pkg.name}" style="width: 80%; text-align: left; background: transparent; border: 1px solid transparent; outline: none; font-size: 18px; font-weight: 700; color: var(--primary); margin-bottom: 12px; padding: 4px 8px; margin-left: -8px; border-radius: 6px; transition: border 0.2s;" onfocus="this.style.borderColor='#cbd5e1'" onblur="this.style.borderColor='transparent'" placeholder="প্যাকেজ নাম">
                    
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; font-size: 16px; color: var(--text-main);">৳</span>
                        <input type="number" id="pkg-price-${pkg.id}" value="${pkg.price_bdt}" style="width: 80px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-weight: 600; outline: none;">
                        <span style="color: var(--text-muted); padding: 0 4px;">/</span>
                        <input type="number" id="pkg-duration-${pkg.id}" value="${pkg.duration_days > 0 ? pkg.duration_days : pkg.duration_months}" style="width: 60px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; outline: none;">
                        <select id="pkg-duration-type-${pkg.id}" style="padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; background: white; color: var(--text-muted); font-size: 14px; font-weight: 500;">
                            <option value="months" ${pkg.duration_days > 0 ? '' : 'selected'}>মাস</option>
                            <option value="days" ${pkg.duration_days > 0 ? 'selected' : ''}>দিন</option>
                        </select>
                    </div>
                </div>
                
                <div class="pkg-body" style="text-align: left;">
                    <div class="pkg-feature" style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">স্ক্যান লিমিট (0 = Unlimited)</label>
                        <input type="number" class="form-input" id="pkg-scan-${pkg.id}" value="${pkg.scan_limit}" style="padding: 8px; height: auto;">
                    </div>
                    <div class="pkg-feature" style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">টাইমলাইন লিমিট</label>
                        <input type="number" class="form-input" id="pkg-time-${pkg.id}" value="${pkg.timeline_limit}" style="padding: 8px; height: auto;">
                    </div>
                    <div class="pkg-feature" style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">চ্যাট লিমিট</label>
                        <input type="number" class="form-input" id="pkg-chat-${pkg.id}" value="${pkg.chat_limit}" style="padding: 8px; height: auto;">
                    </div>
                    <div class="pkg-feature" style="margin-bottom: 16px; display: flex; align-items: center; background: #f8fafc; padding: 10px 12px; border-radius: 8px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; font-size: 14px; width: 100%; margin: 0;">
                            <input type="checkbox" id="pkg-active-${pkg.id}" ${pkg.is_active ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
                            প্যাকেজটি অ্যাক্টিভ রাখুন
                        </label>
                    </div>
                    <button class="btn-primary btn-update" style="width: 100%; padding: 10px; border-radius: 8px; font-weight: 600;" onclick="updatePackage(${pkg.id})">আপডেট করুন</button>
                </div>
            </div>
        `;
    });

    // Add New Box
    grid.innerHTML += `
        <div class="package-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 380px; border: 2px dashed #94A3B8; background: transparent; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.backgroundColor='#F0FDF4';" onmouseout="this.style.borderColor='#94A3B8'; this.style.backgroundColor='transparent';" onclick="openNewPackageModal()">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <div style="font-size: 16px; font-weight: 600; color: var(--text-main);">নতুন প্যাকেজ যোগ করুন</div>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px; text-align: center;">ডাটাবেস এক্সেস করে নতুন প্যাকেজ তৈরি করতে হবে</p>
        </div>
    `;
}

async function updatePackage(id) {
    const name = document.getElementById(`pkg-name-${id}`).value;
    const duration_val = document.getElementById(`pkg-duration-${id}`).value;
    const duration_type = document.getElementById(`pkg-duration-type-${id}`).value;
    const price_bdt = document.getElementById(`pkg-price-${id}`).value;
    const scan_limit = document.getElementById(`pkg-scan-${id}`).value;
    const timeline_limit = document.getElementById(`pkg-time-${id}`).value;
    const chat_limit = document.getElementById(`pkg-chat-${id}`).value;
    const is_active = document.getElementById(`pkg-active-${id}`).checked ? 1 : 0;

    let duration_months = duration_type === 'months' ? duration_val : 0;
    let duration_days = duration_type === 'days' ? duration_val : 0;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/packages/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, duration_months, duration_days, price_bdt, scan_limit, timeline_limit, chat_limit, is_active })
        });
        const d = await res.json();
        if(d.success) {
            alert('প্যাকেজ সফলভাবে আপডেট হয়েছে!');
            loadPackages();
        } else alert(d.error);
    } catch(e) { console.error(e); }
}

async function deletePackageBtn(id) {
    if(!confirm("আপনি কি নিশ্চিত যে এই প্যাকেজটি সম্পূর্ণ মুছে ফেলতে চান?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/packages/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if(d.success) {
            alert('প্যাকেজটি মুছে ফেলা হয়েছে!');
            loadPackages();
        } else alert(d.error);
    } catch(e) { console.error(e); }
}

function openNewPackageModal() {
    document.getElementById('newPackageModalOverlay').classList.add('active');
    document.getElementById('newPackageModalContent').classList.add('active');
}

function closeNewPackageModal() {
    document.getElementById('newPackageModalOverlay').classList.remove('active');
    document.getElementById('newPackageModalContent').classList.remove('active');
    document.getElementById('formNewPackage').reset();
}

async function submitNewPackage(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('btnSubmitPkg');
    submitBtn.disabled = true;
    submitBtn.innerText = 'তৈরি হচ্ছে...';

    const duration_val = document.getElementById('np_duration').value;
    const duration_type = document.getElementById('np_duration_type').value;
    
    let duration_months = duration_type === 'months' ? duration_val : 0;
    let duration_days = duration_type === 'days' ? duration_val : 0;

    const payload = {
        name: document.getElementById('np_name').value,
        duration_months: duration_months,
        duration_days: duration_days,
        price_bdt: document.getElementById('np_price').value,
        scan_limit: document.getElementById('np_scan').value,
        timeline_limit: document.getElementById('np_time').value,
        chat_limit: document.getElementById('np_chat').value,
        is_active: document.getElementById('np_status').value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/admin/packages`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const d = await res.json();
        if(d.success) {
            alert('নতুন প্যাকেজ সফলভাবে যোগ করা হয়েছে!');
            closeNewPackageModal();
            loadPackages();
        } else alert(d.error);
    } catch(e) { console.error(e); } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'সেভ করুন';
    }
}

// =======================
// 2. Active Subscribers
// =======================
let activeUsersData = [];
let currentActiveUserPage = 1;
const ACTIVE_USERS_PER_PAGE = 20;

async function loadActiveUsers() {
    const search = document.getElementById('activeUsersSearch')?.value || '';
    try {
        const res = await fetch(`${API_BASE_URL}/admin/subscriptions/active-users?search=${encodeURIComponent(search)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if(d.success) {
            activeUsersData = d.data;
            currentActiveUserPage = 1;
            renderActiveUsers();
        }
    } catch(e) { console.error('Error loading active users:', e); }
}

function renderActiveUsers() {
    const tbody = document.getElementById('activeUsersTableBody');
    document.getElementById('activeUsersCount').innerText = `মোট: ${activeUsersData.length} জন`;
    if(!tbody) return;

    if(activeUsersData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">কোনো অ্যাক্টিভ ইউজার পাওয়া যায়নি</td></tr>`;
        document.getElementById('activeUsersPaginationInfo').innerText = `দেখাচ্ছে ০-০`;
        document.getElementById('btnPrevActiveUser').disabled = true;
        document.getElementById('btnNextActiveUser').disabled = true;
        return;
    }

    const totalPages = Math.ceil(activeUsersData.length / ACTIVE_USERS_PER_PAGE);
    const startIndex = (currentActiveUserPage - 1) * ACTIVE_USERS_PER_PAGE;
    const endIndex = Math.min(startIndex + ACTIVE_USERS_PER_PAGE, activeUsersData.length);
    const currentUsers = activeUsersData.slice(startIndex, endIndex);

    tbody.innerHTML = currentUsers.map(u => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:12px;">
                    <div class="sub-user-avatar" style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:600;color:#64748b;">${(u.full_name || 'U').charAt(0)}</div>
                    <div>
                        <div style="font-weight:600;color:var(--text-main);">${u.full_name || 'অজানা'}</div>
                    </div>
                </div>
            </td>
            <td>${u.phone_number}</td>
            <td>
                <span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                    <span style="width:6px;height:6px;border-radius:50%;background:#166534;"></span> প্রিমিয়াম
                </span>
            </td>
            <td>${u.remaining_scans > 999 ? 'আনলিমিটেড' : u.remaining_scans}টি</td>
            <td><div style="font-size:13px;">${u.subscription_expiry ? new Date(u.subscription_expiry).toLocaleDateString() : 'N/A'}</div></td>
            <td>
                <button onclick="downgradeActiveUser(${u.id})" style="background:none; border:none; cursor:pointer; color:var(--danger); display:flex; align-items:center; gap:4px; font-size:13px; font-weight:600; padding:6px 12px; border-radius:6px; background:#fee2e2;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21V3"></path><path d="M5 14l7 7 7-7"></path></svg>
                    ডাউনগ্রেড
                </button>
            </td>
        </tr>
    `).join('');

    // Update Pagination Controls
    document.getElementById('activeUsersPaginationInfo').innerText = `দেখাচ্ছে ${startIndex + 1}-${endIndex}`;
    document.getElementById('btnPrevActiveUser').disabled = currentActiveUserPage === 1;
    document.getElementById('btnNextActiveUser').disabled = currentActiveUserPage === totalPages;
}

async function downgradeActiveUser(userId) {
    if(!confirm('আপনি কি নিশ্চিত যে এই ইউজারকে ফ্রি টায়ারে নামিয়ে দিতে চান?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/subscriptions/downgrade/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if(d.success) {
            alert('সফলভাবে ডাউনগ্রেড করা হয়েছে!');
            loadActiveUsers(); // refresh the list
        } else {
            alert(d.error || 'ডাউনগ্রেড করা যায়নি।');
        }
    } catch(e) {
        console.error('Error downgrading:', e);
        alert('নেটওয়ার্ক সমস্যা।');
    }
}



document.getElementById('btnPrevActiveUser')?.addEventListener('click', () => {
    if (currentActiveUserPage > 1) {
        currentActiveUserPage--;
        renderActiveUsers();
    }
});

document.getElementById('btnNextActiveUser')?.addEventListener('click', () => {
    const totalPages = Math.ceil(activeUsersData.length / ACTIVE_USERS_PER_PAGE);
    if (currentActiveUserPage < totalPages) {
        currentActiveUserPage++;
        renderActiveUsers();
    }
});

document.getElementById('activeUsersSearch')?.addEventListener('input', () => {
    loadActiveUsers();
});

// =======================
// 3. Payment History
// =======================
async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/subscriptions/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if(d.success) {
            renderHistory(d.data);
        }
    } catch(e) { console.error('Error loading history:', e); }
}

function renderHistory(history) {
    const tbody = document.getElementById('historyTableBody');
    if(!tbody) return;

    if(history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">কোনো পেমেন্ট হিস্ট্রি নেই</td></tr>`;
        return;
    }

    tbody.innerHTML = history.map(h => `
        <tr>
            <td>${new Date(h.created_at).toLocaleString()}</td>
            <td>${h.phone_number}</td>
            <td style="font-weight: 600; color: #10B981;">৳${h.amount_paid} <small style="display:block; color:var(--text-muted); font-weight:normal;">${h.package_name}</small></td>
            <td><span style="background: #E2E8F0; color: #475569; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Trx: ${h.trx_id || '-'}</span></td>
        </tr>
    `).join('');
}

// =======================
// 3.5 Pending Payments
// =======================
async function loadPendingPayments() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/subscriptions/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if(d.success) {
            renderPendingPayments(d.data);
            const badge = document.getElementById('pendingBadge');
            if (badge) {
                if (d.data.length > 0) {
                    badge.style.display = 'inline-block';
                    badge.textContent = d.data.length;
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch(e) { console.error('Error loading pending:', e); }
}

function renderPendingPayments(payments) {
    const tbody = document.getElementById('pendingTableBody');
    if(!tbody) return;

    if(payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">কোনো অপেক্ষমান পেমেন্ট নেই</td></tr>`;
        return;
    }

    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${new Date(p.created_at).toLocaleString()}</td>
            <td>${p.full_name || 'অজানা'}<br><small style="color:var(--text-muted);">${p.phone_number}</small></td>
            <td style="font-weight: 600; color: #f97316;">৳${p.amount_paid} <small style="display:block; color:var(--text-muted); font-weight:normal;">${p.payment_method}</small></td>
            <td style="font-weight: 600;">${p.trx_id}</td>
            <td>
                <button class="btn-primary" style="background:#10b981; padding: 6px 12px; font-size: 13px;" onclick="approvePending(${p.id})">Approve</button>
                <button class="btn-primary" style="background:#ef4444; border:1px solid #ef4444; margin-left:8px; padding: 6px 12px; font-size: 13px; color:white;" onclick="rejectPending(${p.id})">Reject</button>
            </td>
        </tr>
    `).join('');
}

async function approvePending(id) {
    if(!confirm("এই পেমেন্ট কি নিশ্চিতভাবে অ্যাপ্রুভ করবেন?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/subscriptions/approve/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.success) {
            alert(d.message);
            loadPendingPayments();
            loadActiveUsers();
            loadHistory();
        } else alert(d.error);
    } catch (e) {
        alert("Error occurred.");
    }
}

async function rejectPending(id) {
    if(!confirm("এই পেমেন্ট কি বাতিল করবেন? (ইউজার আবার নতুন করে সাবমিট করতে পারবে)")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/subscriptions/reject/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.success) {
            alert(d.message);
            loadPendingPayments();
        } else alert(d.error);
    } catch (e) {
        alert("Error occurred.");
    }
}


// =======================
// 4. Manual Upgrade
// =======================
function searchUserForUpgrade() {
    // Currently, I don't have a direct search API just for 1 user unless I use the general users API
    const phone = document.getElementById('manualSearchInput').value.trim();
    if(!phone) return;

    // Use users API
    fetch(`${API_BASE_URL}/admin/users?search=${encodeURIComponent(phone)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
        if(d.success && d.data.length > 0) {
            const u = d.data[0];
            document.getElementById('manualSelectedUserId').value = u.id;
            document.getElementById('userPreviewEmpty').classList.add('found');
            document.getElementById('userPreviewEmpty').innerHTML = `
                <div class="sub-user-avatar" style="width: 40px; height: 40px; font-size: 16px;">${(u.full_name || 'U').charAt(0)}</div>
                <div>
                    <div style="font-weight: 600; font-size: 15px;">${u.full_name || 'অজানা'}</div>
                    <div style="font-size: 13px; color: var(--text-muted);">বর্তমান প্ল্যান: ${u.subscription_status}</div>
                </div>
            `;
        } else {
            document.getElementById('userPreviewEmpty').classList.remove('found');
            document.getElementById('userPreviewEmpty').innerHTML = `<span style="color:var(--danger)">ইউজার পাওয়া যায়নি। নম্বরটি সঠিক কিনা চেক করুন।</span>`;
            document.getElementById('manualSelectedUserId').value = "";
        }
    }).catch(e => console.error(e));
}

async function submitManualUpgrade() {
    const phone = document.getElementById('manualSearchInput').value.trim();
    if(!phone) return alert('ফোন নম্বর দিন');

    const uid = document.getElementById('manualSelectedUserId').value;
    if(!uid) return alert('প্রথমে ইউজার সার্চ করে নিশ্চিত করুন।');
    const packageSelect = document.getElementById('manualPackageSelect');
    const package_id = packageSelect.value;
    if(!package_id) return alert('প্যাকেজ নির্বাচন করুন!');
    
    // Get the price from selected option
    const amount = packageSelect.options[packageSelect.selectedIndex].getAttribute('data-price');

    const note = document.getElementById('manualRefNote').value || 'Manual Upg';

    const confirmed = confirm("আপনি কি নিশ্চিত?");
    if(!confirmed) return;

    try {
        const payload = {
            farmer_id: uid, 
            phone_number: phone,
            package_id: package_id,
            amount_paid: amount,
            payment_method: 'Manual Office',
            trx_id: note
        };

        const res = await fetch(`${API_BASE_URL}/admin/subscriptions/manual-upgrade`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const d = await res.json();
        
        if(d.success) {
            alert('একাউন্ট সফলভাবে আপগ্রেড করা হয়েছে!');
            loadActiveUsers();
            loadHistory();
            document.getElementById('manualSearchInput').value = '';
            document.getElementById('manualPackageSelect').value = '';
            document.getElementById('manualRefNote').value = '';
            document.getElementById('userPreviewEmpty').classList.remove('found');
            document.getElementById('userPreviewEmpty').innerHTML = 'ফোন নম্বর দিয়ে ইউজার খুঁজুন';
        } else {
            alert('Error: ' + d.error);
        }
    } catch(e) { console.error('Upgrade Error:', e); }
}

// =======================
// 5. Payment Settings
// =======================
document.addEventListener('DOMContentLoaded', () => {
    loadPaymentSettings();

    const paymentSettingsForm = document.getElementById('adminPaymentSettingsForm');
    if (paymentSettingsForm) {
        paymentSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnUpdatePaymentSettings');
            const msg = document.getElementById('paymentSettingsMsg');
            
            const bkash = document.getElementById('adminBkashNumber').value.trim();
            const nagad = document.getElementById('adminNagadNumber').value.trim();
            
            btn.textContent = 'সেভ হচ্ছে...';
            btn.disabled = true;
            msg.textContent = '';
            
            try {
                const res = await fetch(`${API_BASE_URL}/admin/payment-settings`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ bkash, nagad })
                });
                const data = await res.json();
                
                if (data.success) {
                    msg.style.color = '#10b981';
                    msg.textContent = 'পেমেন্ট নম্বর সফলভাবে আপডেট হয়েছে!';
                } else {
                    msg.style.color = '#e2136e';
                    msg.textContent = data.error || 'আপডেট ফেইলড!';
                }
            } catch (err) {
                msg.style.color = '#e2136e';
                msg.textContent = 'সার্ভার এরর, আবার চেষ্টা করুন।';
            } finally {
                btn.textContent = 'সেভ করুন';
                btn.disabled = false;
                setTimeout(() => { msg.textContent = ''; }, 4000);
            }
        });
    }
});

async function loadPaymentSettings() {
    try {
        const res = await fetch(`${API_BASE_URL}/payment-settings`);
        const data = await res.json();
        if(data.success && data.data) {
            if(data.data.bkash) document.getElementById('adminBkashNumber').value = data.data.bkash;
            if(data.data.nagad) document.getElementById('adminNagadNumber').value = data.data.nagad;
        }
    } catch (e) {
        console.error('Failed to load payment settings', e);
    }
}
