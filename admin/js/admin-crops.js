// js/admin-crops.js

let globalCrops = [];
let currentTab = 'verified';

window.switchTab = function (tabName) {
    currentTab = tabName;

    document.getElementById('tabVerified').style.color = tabName === 'verified' ? 'var(--primary)' : 'var(--text-muted)';
    document.getElementById('tabVerified').style.borderBottomColor = tabName === 'verified' ? 'var(--primary)' : 'transparent';

    document.getElementById('tabPending').style.color = tabName === 'pending' ? 'var(--primary)' : 'var(--text-muted)';
    document.getElementById('tabPending').style.borderBottomColor = tabName === 'pending' ? 'var(--primary)' : 'transparent';

    handleSearch();
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        fetchCrops();
    }, 500);
});

async function fetchCrops() {
    const token = localStorage.getItem('agritech_admin_token');
    if (!token) return;

    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}/api/admin/crops`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            globalCrops = data.crops;
            const pendingCount = globalCrops.filter(c => c.verified_status === 0).length;
            const badge = document.getElementById('pendingCountBadge');
            if (badge) {
                badge.textContent = pendingCount;
                badge.style.background = pendingCount > 0 ? '#ef4444' : 'var(--border-color)';
                badge.style.color = pendingCount > 0 ? 'white' : 'var(--text-muted)';
            }
            populateCategoryFilter();
            handleSearch();
        } else {
            document.getElementById('cropsTbody').innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">এরর: ${data.error}</td></tr>`;
        }
    } catch (e) {
        document.getElementById('cropsTbody').innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">সার্ভার কানেকশন ফেইল্ড</td></tr>`;
        console.error(e);
    }
}

function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    const categories = [...new Set(globalCrops.map(c => c.crop_category))];

    let html = '<option value="">সব ক্যাটাগরি</option>';
    categories.forEach(cat => {
        if (cat) html += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
    });
    select.innerHTML = html;
}

function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    const filtered = globalCrops.filter(c => {
        const matchesQuery = c.crop_name.toLowerCase().includes(query) || (c.variety_name && c.variety_name.toLowerCase().includes(query));
        const matchesCategory = category === "" || c.crop_category === category;
        const matchesTab = currentTab === 'verified' ? (c.verified_status !== 0) : (c.verified_status === 0);
        return matchesQuery && matchesCategory && matchesTab;
    });

    renderCropsTable(filtered);
}

function renderCropsTable(crops) {
    const tbody = document.getElementById('cropsTbody');

    if (!crops || crops.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px;">কোনো ডেটা পাওয়া যায়নি</td></tr>`;
        return;
    }

    tbody.innerHTML = crops.map(crop => {
        let actionButtons = '';
        if (currentTab === 'verified') {
            actionButtons = `
                <button class="btn-outline-primary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="openEditCropModal(${crop.id})">এডিট</button>
                <button class="btn-outline-primary" style="padding: 4px 8px; font-size: 11px; color: var(--danger); border-color: var(--danger);" onclick="deleteCrop(${crop.id})">ডিলিট</button>
            `;
        } else {
            actionButtons = `
                <button class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; border-color: #10B981; background: #10B981;" onclick="updatePendingStatus(${crop.id}, 1)">Approve</button>
                <button class="btn-outline-primary" style="padding: 4px 8px; font-size: 11px; color: var(--danger); border-color: var(--danger);" onclick="updatePendingStatus(${crop.id}, -1)">Reject</button>
            `;
        }

        return `
            <tr>
                <td style="color: var(--text-muted);">#${crop.id}</td>
                <td><span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--primary);">${escapeHtml(crop.crop_category || 'N/A')}</span></td>
                <td style="font-weight: 500;">${escapeHtml(crop.crop_name)}</td>
                <td>${escapeHtml(crop.variety_name || '')}</td>
                <td><span style="font-size: 11px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px;">${escapeHtml(crop.planting_months || 'N/A')}</span></td>
                <td><span style="font-size: 11px; background: #fce7f3; color: #be185d; padding: 2px 6px; border-radius: 4px;">${crop.disease_resistance_score || 'N/A'}/10</span></td>
                <td style="font-weight: 600;">${crop.base_yield_per_shotangsho_kg || 0}</td>
                <td>${crop.avg_duration_days || 0} দিন</td>
                <td style="text-align: center;">
                    ${crop.has_cache == 1
                ? '<button class="btn-outline-primary" style="padding: 4px 8px; font-size: 11px; border-color: #10B981; color: #10B981;" onclick="openCacheModal(' + crop.id + ', true)">ভিউ ক্যাশ</button>'
                : '<button class="btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="openCacheModal(' + crop.id + ', false)">+ অ্যাড ক্যাশ</button>'
            }
                </td>
                <td style="text-align: right; min-width: 120px;">
                    ${actionButtons}
                </td>
            </tr>
        `;
    }).join('');
}

window.updatePendingStatus = async function (id, statusVal) {
    if (statusVal === -1 && !confirm('আপনি কি নিশ্চিত যে আপনি এই পেন্ডিং ডাটাটি রিজেক্ট ও ডিলিট করতে চান?')) return;
    if (statusVal === 1 && !confirm('এই এআই ডাটাটি ভেরিফাইড হিসেবে অ্যাপ্রুভ করতে চান?')) return;

    const token = localStorage.getItem('agritech_admin_token');
    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}/api/admin/crops/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: statusVal })
        });

        const data = await response.json();
        if (data.success) {
            fetchCrops();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Server connection failed.');
    }
}

function openEditCropModal(id) {
    const crop = globalCrops.find(c => c.id === id);
    if (!crop) return;

    document.getElementById('fc_id').value = crop.id;
    document.getElementById('fc_category').value = crop.crop_category;
    document.getElementById('fc_name').value = crop.crop_name;
    document.getElementById('fc_variety').value = crop.variety_name;
    document.getElementById('fc_regions').value = crop.suitable_regions || '';
    document.getElementById('fc_soil').value = crop.soil_type || '';
    document.getElementById('fc_yield').value = crop.base_yield_per_shotangsho_kg;
    document.getElementById('fc_duration').value = crop.avg_duration_days;
    document.getElementById('fc_disease').value = crop.disease_resistance || '';
    document.getElementById('fc_features').value = crop.special_features || '';
    document.getElementById('fc_source').value = crop.data_source || '';

    document.getElementById('modalTitle').textContent = 'এডিট ফসল (ID: ' + id + ')';

    document.getElementById('cropModalOverlay').classList.add('active');
    document.getElementById('cropModal').style.display = 'block';
}

async function deleteCrop(id) {
    if (!confirm('আপনি কি নিশ্চিত যে আপনি ডাটাবেস থেকে এই ফসলটি সম্পূর্ণ মুছে ফেলতে চান?')) return;

    const token = localStorage.getItem('agritech_admin_token');
    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}/api/admin/crops/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
            fetchCrops();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Server connection failed.');
    }
}

async function submitCrop(e) {
    e.preventDefault();
    const token = localStorage.getItem('agritech_admin_token');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const cropId = document.getElementById('fc_id').value;
    const method = cropId ? 'PUT' : 'POST';
    const endpoint = cropId ? `/api/admin/crops/${cropId}` : `/api/admin/crops`;

    const payload = {
        crop_category: document.getElementById('fc_category').value,
        crop_name: document.getElementById('fc_name').value,
        variety_name: document.getElementById('fc_variety').value,
        suitable_regions: document.getElementById('fc_regions').value || null,
        soil_type: document.getElementById('fc_soil').value || null,
        base_yield_per_shotangsho_kg: parseInt(document.getElementById('fc_yield').value),
        avg_duration_days: parseInt(document.getElementById('fc_duration').value),
        disease_resistance: document.getElementById('fc_disease').value || null,
        special_features: document.getElementById('fc_features').value || null,
        data_source: document.getElementById('fc_source').value
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'অপেক্ষা করুন...';

    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}${endpoint}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            closeAddCropModal();
            fetchCrops(); // Refresh table
            alert(cropId ? 'সফলভাবে ডাটা আপডেট হয়েছে!' : 'সফলভাবে ডাটাবেসে ফসল যুক্ত হয়েছে!');
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Server connection failed.');
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'ডাটাবেসে সেভ করুন';
    }
}

async function submitBulkCrop(e) {
    e.preventDefault();
    const token = localStorage.getItem('agritech_admin_token');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const textData = document.getElementById('bulk_csv_data').value;
    const lines = textData.trim().split('\n');

    const bulkArray = [];
    for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(',').map(s => s.trim());
        if (cols.length >= 10) {
            bulkArray.push({
                crop_category: cols[0],
                crop_name: cols[1],
                variety_name: cols[2],
                suitable_regions: cols[3],
                soil_type: cols[4],
                base_yield_per_shotangsho_kg: parseInt(cols[5]),
                avg_duration_days: parseInt(cols[6]),
                disease_resistance: cols[7],
                special_features: cols[8],
                data_source: cols[9]
            });
        }
    }

    if (bulkArray.length === 0) {
        alert("ভুল ফরম্যাট অথবা কোনো ভ্যালিড ডাটা নেই।");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'আপলোড হচ্ছে...';

    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}/api/admin/crops/bulk`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ crops: bulkArray })
        });

        const data = await response.json();

        if (data.success) {
            closeBulkCropModal();
            fetchCrops();
            alert(`সফলভাবে ${bulkArray.length} টি ফসল যুক্ত হয়েছে!`);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Server connection failed.');
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'আপলোড শুরু করুন';
    }
}

// ==========================================
// CACHE MANAGEMENT LOGIC
// ==========================================

let currentCacheCropId = null;
let currentTimelineData = [];
let currentRisksData = [];
let currentResourcesData = [];
let currentTasksData = [];

window.switchCacheTab = function(tabId, btn) {
    document.querySelectorAll('.cache-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--text-muted)';
        b.style.borderBottomColor = 'transparent';
    });
    btn.classList.add('active');
    btn.style.color = 'var(--primary)';
    btn.style.borderBottomColor = 'var(--primary)';

    document.querySelectorAll('.cache-tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('cache-tab-' + tabId).style.display = 'block';
}

async function openCacheModal(id, hasCache) {
    const crop = globalCrops.find(c => c.id === id);
    if (!crop) return;

    currentCacheCropId = id;
    const cropString = crop.variety_name ? `${crop.crop_name} (${crop.variety_name})`.trim() : crop.crop_name;

    document.getElementById('cacheModalTitle').textContent = `ক্যাশ: ${cropString}`;
    document.getElementById('cache_crop_string').value = crop.crop_name;
    document.getElementById('cache_variety_name').value = cropString;

    document.getElementById('cropModalOverlay').classList.add('active');
    document.getElementById('cacheModal').style.display = 'block';

    if (hasCache) {
        document.getElementById('cacheDataSection').style.display = 'block';
        document.getElementById('cacheMissingSection').style.display = 'none';
        document.getElementById('cacheDeleteBtn').style.display = 'block';
        document.getElementById('cacheSaveBtn').innerHTML = 'আপডেট করুন';

        await fetchCacheData(cropString);
    } else {
        document.getElementById('cacheDataSection').style.display = 'none';
        document.getElementById('cacheMissingSection').style.display = 'block';

        document.getElementById('cacheForm').reset();
        currentTimelineData = [];
        currentRisksData = [];
        currentResourcesData = [];
        currentTasksData = [];
        renderTimelineEditor();
        renderRisksEditor();
        renderResourcesEditor();
        renderTasksEditor();

        document.getElementById('cacheDeleteBtn').style.display = 'none';
        document.getElementById('cacheSaveBtn').innerHTML = 'নতুন সেভ করুন';
    }
}

function closeCacheModal() {
    document.getElementById('cropModalOverlay').classList.remove('active');
    document.getElementById('cacheModal').style.display = 'none';
    currentCacheCropId = null;
    currentTimelineData = [];
    currentRisksData = [];
    currentResourcesData = [];
    currentTasksData = [];
}

function showManualCacheForm() {
    document.getElementById('cacheMissingSection').style.display = 'none';
    document.getElementById('cacheDataSection').style.display = 'block';
    
    // Switch to first tab safely
    const firstTabBtn = document.querySelector('.cache-tab-btn');
    if (firstTabBtn) switchCacheTab('guidelines', firstTabBtn);
}

async function fetchCacheData() {
    const crop = globalCrops.find(c => c.id === currentCacheCropId);
    if (!crop) return;

    const token = localStorage.getItem('agritech_admin_token');
    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}/api/admin/cache?crop=${encodeURIComponent(crop.crop_name)}&variety=${encodeURIComponent(crop.variety_name || crop.crop_name)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.cache) {
            document.getElementById('cache_yield').value = data.cache.base_yield_kg || '';
            document.getElementById('cache_cost').value = data.cache.base_cost_taka || '';
            document.getElementById('cache_revenue').value = data.cache.base_revenue_taka || '';

            try { 
                const tlJson = JSON.parse(data.cache.timeline_json || '{"guideline":[], "tasks":[]}');
                if (Array.isArray(tlJson)) {
                     currentTimelineData = tlJson;
                     currentTasksData = [];
                } else {
                     currentTimelineData = tlJson.guideline || [];
                     currentTasksData = tlJson.tasks || [];
                }
            } catch (e) { currentTimelineData = []; currentTasksData = []; }
            
            try { currentRisksData = JSON.parse(data.cache.risks_json || '[]'); } catch (e) { currentRisksData = []; }
            try { currentResourcesData = JSON.parse(data.cache.resources_json || '[]'); } catch (e) { currentResourcesData = []; }

            renderTimelineEditor();
            renderRisksEditor();
            renderResourcesEditor();
            renderTasksEditor();

            document.getElementById('cacheModalSubtitle').textContent = `তৈরি: ${data.cache.created_at}`;
        }
    } catch (e) {
        console.error("Failed to load cache", e);
    }
}

// === GUIDELINE EDITOR ===
window.renderTimelineEditor = function () {
    const container = document.getElementById('timelineContainer');
    if (currentTimelineData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 13px;">কোনো ধাপ যোগ করা হয়নি।</div>';
        return;
    }

    const getBgColor = (t) => {
        if(!t) return '#F1F5F9';
        t = t.toLowerCase();
        if(t.includes('বীজ') || t.includes('চারা') || t.includes('জমি') || t.includes('প্রস্তুত')) return '#dcfce7'; 
        if(t.includes('বপন') || t.includes('রোপণ') || t.includes('সেচ')) return '#dbeafe'; 
        if(t.includes('সার') || t.includes('পরিচর্যা') || t.includes('আগাছা') || t.includes('খুঁটি')) return '#fef9c3'; 
        if(t.includes('রোগ') || t.includes('পোকা') || t.includes('বালাই')) return '#fee2e2'; 
        if(t.includes('সংগ্রহ') || t.includes('হার্ভেস্ট') || t.includes('ফসল')) return '#ffedd5'; 
        return '#F1F5F9';
    };

    const getTextColor = (t) => {
        if(!t) return 'var(--text-main)';
        t = t.toLowerCase();
        if(t.includes('বীজ') || t.includes('চারা') || t.includes('জমি') || t.includes('প্রস্তুত')) return '#166534'; 
        if(t.includes('বপন') || t.includes('রোপণ') || t.includes('সেচ')) return '#1e40af'; 
        if(t.includes('সার') || t.includes('পরিচর্যা') || t.includes('আগাছা') || t.includes('খুঁটি')) return '#854d0e'; 
        if(t.includes('রোগ') || t.includes('পোকা') || t.includes('বালাই')) return '#991b1b'; 
        if(t.includes('সংগ্রহ') || t.includes('হার্ভেস্ট') || t.includes('ফসল')) return '#9a3412'; 
        return 'var(--text-main)';
    };

    container.innerHTML = currentTimelineData.map((step, idx) => {
        const bg = getBgColor(step.title);
        const textCol = getTextColor(step.title);
        return `
        <div style="background: white; border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start;">
            <div style="background: ${bg}; color: ${textCol}; font-weight: 700; width: 28px; height: 28px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.05);">${idx + 1}</div>
            <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8px;">
                <input type="text" value="${escapeHtml(step.title || '')}" oninput="updateTimelineField(${idx}, 'title', this.value); this.parentElement.previousElementSibling.style.background = getBgColor(this.value); this.parentElement.previousElementSibling.style.color = getTextColor(this.value);" placeholder="ধাপের নাম (যেমন: জমি প্রস্তুত)" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 13px; font-weight: 600;">
                <textarea oninput="updateTimelineField(${idx}, 'description', this.value)" placeholder="ধাপের বিবরণ..." rows="4" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 13px; font-family: inherit; resize: vertical; line-height: 1.5;">${escapeHtml(step.description || '')}</textarea>
            </div>
            <button type="button" onclick="removeTimelineStep(${idx})" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 4px; flex-shrink: 0;" title="ডিলিট করুন">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
        `;
    }).join('');
}

window.addTimelineStep = function () {
    currentTimelineData.push({ step_number: currentTimelineData.length + 1, title: '', description: '' });
    renderTimelineEditor();
}

window.removeTimelineStep = function (index) {
    currentTimelineData.splice(index, 1);
    currentTimelineData.forEach((step, idx) => step.step_number = idx + 1);
    renderTimelineEditor();
}

window.updateTimelineField = function (index, field, value) {
    if (currentTimelineData[index]) {
        currentTimelineData[index][field] = value;
    }
}

// === RISKS EDITOR ===
window.renderRisksEditor = function () {
    const container = document.getElementById('risksContainer');
    if (currentRisksData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 12px; color: #F43F5E; font-size: 13px; opacity: 0.7;">কোনো ঝুঁকি যোগ করা হয়নি।</div>';
        return;
    }

    container.innerHTML = currentRisksData.map((risk, idx) => `
        <div style="background: white; border: 1px solid #FECDD3; padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start;">
            <select onchange="updateRiskField(${idx}, 'type', this.value)" style="padding: 8px; border: 1px solid #FECDD3; border-radius: 6px; font-size: 13px; background: #FFF1F2; color: #BE185D; font-weight: 600; outline: none; flex-shrink: 0;">
                <option value="warning" ${risk.type === 'warning' ? 'selected' : ''}>Warning</option>
                <option value="info" ${risk.type === 'info' ? 'selected' : ''}>Info</option>
                <option value="lifespan" ${risk.type === 'lifespan' ? 'selected' : ''}>Lifespan</option>
            </select>
            <input type="text" value="${escapeHtml(risk.message || '')}" oninput="updateRiskField(${idx}, 'message', this.value)" placeholder="ঝুঁকির বিবরণ লিখুন..." style="flex-grow: 1; padding: 8px; border: 1px solid #FECDD3; border-radius: 6px; font-size: 13px;">
            <button type="button" onclick="removeRiskRow(${idx})" style="background: none; border: none; color: #BE185D; cursor: pointer; padding: 4px; flex-shrink: 0;" title="ডিলিট করুন">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `).join('');
}

window.addRiskRow = function () {
    currentRisksData.push({ type: 'warning', message: '' });
    renderRisksEditor();
}

window.removeRiskRow = function (index) {
    currentRisksData.splice(index, 1);
    renderRisksEditor();
}

window.updateRiskField = function (index, field, value) {
    if (currentRisksData[index]) {
        currentRisksData[index][field] = value;
    }
}

// === RESOURCES EDITOR ===
window.renderResourcesEditor = function () {
    const container = document.getElementById('resourcesContainer');
    if (currentResourcesData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 12px; color: #15803D; font-size: 13px; opacity: 0.7;">কোনো খরচের বিবরণী যোগ করা হয়নি।</div>';
        return;
    }

    container.innerHTML = currentResourcesData.map((res, idx) => `
        <div style="background: white; border: 1px solid #BBF7D0; padding: 12px; border-radius: 8px; display: grid; grid-template-columns: 100px 1fr 80px 80px 30px; gap: 8px; align-items: center;">
            <select onchange="updateResourceField(${idx}, 'category', this.value)" style="padding: 8px; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 12px; background: #F0FDF4; color: #166534; font-weight: 600; outline: none; width: 100%;">
                <option value="seed_or_sapling" ${res.category === 'seed_or_sapling' ? 'selected' : ''}>বীজ/চারা</option>
                <option value="fertilizer" ${res.category === 'fertilizer' ? 'selected' : ''}>সার</option>
                <option value="pesticide" ${res.category === 'pesticide' ? 'selected' : ''}>কীটনাশক</option>
                <option value="irrigation" ${res.category === 'irrigation' ? 'selected' : ''}>সেচ</option>
                <option value="labor_and_other" ${res.category === 'labor_and_other' ? 'selected' : ''}>লেবার/অন্যান্য</option>
            </select>
            <input type="text" value="${escapeHtml(res.name || '')}" oninput="updateResourceField(${idx}, 'name', this.value)" placeholder="নাম (যেমন: ইউরিয়া)" style="width: 100%; padding: 8px; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 13px;">
            <input type="text" value="${escapeHtml(res.amount || '')}" oninput="updateResourceField(${idx}, 'amount', this.value)" placeholder="পরিমাণ" style="width: 100%; padding: 8px; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 13px;">
            <input type="number" value="${res.estimated_cost_bdt || 0}" oninput="updateResourceField(${idx}, 'estimated_cost_bdt', this.value)" placeholder="খরচ" style="width: 100%; padding: 8px; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 13px;">
            <button type="button" onclick="removeResourceRow(${idx})" style="background: none; border: none; color: #166534; cursor: pointer; padding: 4px; display:flex; justify-content:center;" title="ডিলিট করুন">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `).join('');
}

window.addResourceRow = function () {
    currentResourcesData.push({ category: 'fertilizer', name: '', amount: '', estimated_cost_bdt: 0 });
    renderResourcesEditor();
}

window.removeResourceRow = function (index) {
    currentResourcesData.splice(index, 1);
    renderResourcesEditor();
}

window.updateResourceField = function (index, field, value) {
    if (currentResourcesData[index]) {
        currentResourcesData[index][field] = field === 'estimated_cost_bdt' ? parseFloat(value) || 0 : value;
    }
}

// === TASKS EDITOR ===
window.renderTasksEditor = function () {
    const container = document.getElementById('tasksContainer');
    if (currentTasksData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 12px; color: #4338CA; font-size: 13px; opacity: 0.7;">কোনো দৈনিক কাজ যোগ করা হয়নি।</div>';
        return;
    }

    // Sort tasks strictly based on day offset before rendering
    currentTasksData.sort((a, b) => parseInt(a.day_offset || 0) - parseInt(b.day_offset || 0));

    container.innerHTML = currentTasksData.map((task, idx) => `
        <div style="background: white; border: 1px solid #C7D2FE; padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start;">
            <div style="display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: flex-start; flex-shrink: 0; width: 60px;">
                <label style="font-size: 10px; color: #4338CA; font-weight: 600;">অফসেট</label>
                <input type="number" value="${task.day_offset || 0}" oninput="updateTaskField(${idx}, 'day_offset', this.value); if(this.value.endsWith('.')){}else{renderTasksEditor()}" style="width: 100%; text-align: center; padding: 6px; border: 1px solid #C7D2FE; border-radius: 6px; font-size: 13px; font-weight: 700; color: #3730A3;">
            </div>
            <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8px;">
                <input type="text" value="${escapeHtml(task.title || '')}" oninput="updateTaskField(${idx}, 'title', this.value)" placeholder="কাজের নাম (যেমন: ১ম স্প্রে)" style="width: 100%; padding: 8px; border: 1px solid #C7D2FE; border-radius: 6px; font-size: 13px; font-weight: 600;">
                <textarea oninput="updateTaskField(${idx}, 'description', this.value)" placeholder="কী করতে হবে তার বিবরণ..." rows="2" style="width: 100%; padding: 8px; border: 1px solid #C7D2FE; border-radius: 6px; font-size: 13px; font-family: inherit; resize: vertical;">${escapeHtml(task.description || '')}</textarea>
            </div>
            <button type="button" onclick="removeDailyTaskRow(${idx})" style="background: none; border: none; color: #4338CA; cursor: pointer; padding: 4px; flex-shrink: 0;" title="ডিলিট করুন">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
    `).join('');
}

window.addDailyTaskRow = function () {
    currentTasksData.push({ day_offset: 0, title: '', description: '' });
    renderTasksEditor();
}

window.removeDailyTaskRow = function (index) {
    currentTasksData.splice(index, 1);
    renderTasksEditor();
}

window.updateTaskField = function (index, field, value) {
    if (currentTasksData[index]) {
        currentTasksData[index][field] = field === 'day_offset' ? parseInt(value) || 0 : value;
    }
}

// === SUBMIT EVENT ===
async function submitCache(e) {
    e.preventDefault();
    const token = localStorage.getItem('agritech_admin_token');
    const submitBtn = document.getElementById('cacheSaveBtn');

    const crop = globalCrops.find(c => c.id === currentCacheCropId);
    if (!crop) return;

    // Clean up empty steps/risks just in case
    const cleanTimeline = currentTimelineData.filter(s => s.title.trim() || s.description.trim());
    const cleanTasks = currentTasksData.filter(t => t.title.trim() || t.description.trim());
    const cleanRisks = currentRisksData.filter(r => r.message.trim());
    const cleanResources = currentResourcesData.filter(r => r.name.trim());

    // Pack Guideline and Tasks naturally back into timeline_json as { guideline: [...], tasks: [...] } 
    // to keep it strictly aligned with standard outputs expected by AI logic.
    const packedTimelineData = {
        guideline: cleanTimeline,
        tasks: cleanTasks
    };

    const payload = {
        crop_name: crop.crop_name,
        variety_name: crop.variety_name,
        base_yield_kg: parseFloat(document.getElementById('cache_yield').value) || 0,
        base_cost_taka: parseFloat(document.getElementById('cache_cost').value) || 0,
        base_revenue_taka: parseFloat(document.getElementById('cache_revenue').value) || 0,
        timeline_json: JSON.stringify(packedTimelineData),
        risks_json: JSON.stringify(cleanRisks),
        resources_json: JSON.stringify(cleanResources)
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'অপেক্ষা করুন...';

    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}/api/admin/cache`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            alert('ক্যাশ সফলভাবে সেভ হয়েছে!');
            closeCacheModal();
            fetchCrops(); // Refresh table to update the View/Add button
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Server connection failed.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'সেভ করুন';
    }
}

async function deleteCache() {
    if (!confirm('আপনি কি নিশ্চিত যে এই ক্যাশটি ডিলিট করতে চান?')) return;

    const crop = globalCrops.find(c => c.id === currentCacheCropId);
    if (!crop) return;

    const token = localStorage.getItem('agritech_admin_token');

    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}/api/admin/cache?crop=${encodeURIComponent(crop.crop_name)}&variety=${encodeURIComponent(crop.variety_name || crop.crop_name)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
            closeCacheModal();
            fetchCrops(); // Refresh table
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Server connection failed.');
    }
}

async function generateAICache() {
    const aiBtn = document.getElementById('aiGenBtn');
    aiBtn.disabled = true;
    aiBtn.innerHTML = 'আবহাওয়া এনালাইসিস চলছে...';
    
    let adminMsgIdx = 0;
    const adminLoadingMsgs = [
        "মাটি ও রোদ বিবেচনা করা হচ্ছে...",
        "সার ও ওষুধের মেট্রিক্স তৈরি হচ্ছে...",
        "আগের ডাটার সাথে মিল খোঁজা হচ্ছে...",
        "বাংলাদেশ কৃষি গবেষণা ইন্সটিটিউট (BARI) এর ডাটাবেস চেক করা হচ্ছে...",
        "টাইমলাইন প্রস্তুত করা হচ্ছে...",
        "সর্বোত্তম ফলাফল প্রসেসিঙে আরেকটু সময় লাগছে..."
    ];
    window.adminLoaderInterval = setInterval(() => {
        aiBtn.innerHTML = adminLoadingMsgs[adminMsgIdx % adminLoadingMsgs.length];
        adminMsgIdx++;
    }, 2800);

    const token = localStorage.getItem('agritech_admin_token');

    const crop = globalCrops.find(c => c.id === currentCacheCropId);
    if (!crop) {
        if (window.adminLoaderInterval) clearInterval(window.adminLoaderInterval);
        aiBtn.disabled = false;
        aiBtn.innerHTML = 'এআই দিয়ে জেনারেট করুন';
        return;
    }
    const cropString = crop.variety_name ? `${crop.crop_name} (${crop.variety_name})`.trim() : crop.crop_name;

    try {
        const response = await fetch(`${window.ADMIN_CONFIG?.API_BASE_URL || 'https://agritech-backend.mobashwir9.workers.dev'}/api/admin/cache/generate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                crop_string: cropString,
                crop_name: crop.crop_name,
                variety_name: crop.variety_name
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('এআই সফলভাবে টাইমলাইন তৈরি করে ক্যাশ করেছে!');
            closeCacheModal();
            fetchCrops(); // Refresh table
        } else {
            alert('AI Error: ' + data.error);
        }
    } catch (error) {
        alert('AI Generation connection failed.');
    } finally {
        if (window.adminLoaderInterval) clearInterval(window.adminLoaderInterval);
        aiBtn.disabled = false;
        aiBtn.innerHTML = 'এআই দিয়ে জেনারেট করুন';
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
