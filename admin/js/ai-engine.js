const BASE_URL = 'https://agritech-backend.mobashwir9.workers.dev';

const getAuthHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('agritech_admin_token')}`
    };
};

// --- Tab 4: Engine Configuration ---

async function loadAiConfig() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/config`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            // Populate Config
            if (document.getElementById('config-system-prompt')) {
                document.getElementById('config-system-prompt').value = data.config.system_prompt || '';
                document.getElementById('config-fallback').value = data.config.fallback_message || '';
                document.getElementById('config-emergency').checked = data.config.emergency_stop === 1;
            }

            // Populate API Keys
            const container = document.getElementById('api-keys-container');
            if (container) {
                container.innerHTML = '';

                if (data.keys && data.keys.length > 0) {
                    data.keys.forEach(keyObj => {
                        const row = document.createElement('div');
                        row.className = 'api-key-row';
                        row.style.cssText = 'display: flex; gap: 12px; align-items: center; background: #F8FAFC; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;';

                        const statusClass = keyObj.status === 'active' ? 'success' : 'danger';
                        const statusText = keyObj.status === 'active' ? 'Active' : 'Exhausted';

                        row.innerHTML = `
                            <input type="password" class="form-control" value="${keyObj.api_key}" style="flex: 1; background: white;" readonly>
                            <span class="ai-badge ${statusClass}" style="white-space: nowrap;">${statusText}</span>
                            <button type="button" class="btn-icon" style="color: var(--danger); background: none; border: none; cursor: pointer; padding: 4px;" title="রিমুভ করুন" onclick="this.closest('.api-key-row').remove()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        `;
                        container.appendChild(row);
                    });
                } else {
                    container.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 12px;">কোনো API Key পাওয়া যায়নি। নতুন যুক্ত করুন।</div>';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load AI config:', error);
    }
}

async function saveAiConfig() {
    const btn = document.getElementById('btn-save-config');
    btn.textContent = 'সেভ হচ্ছে...';
    btn.disabled = true;

    try {
        const inputs = document.querySelectorAll('.api-key-row input');
        const keys = Array.from(inputs).map(input => input.value.trim()).filter(v => v !== '');

        const system_prompt = document.getElementById('config-system-prompt').value;
        const fallback_message = document.getElementById('config-fallback').value;
        const emergency_stop = document.getElementById('config-emergency').checked ? 1 : 0;

        const response = await fetch(`${BASE_URL}/api/admin/ai/config`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ keys, system_prompt, fallback_message, emergency_stop })
        });

        const data = await response.json();
        if (data.success) {
            alert('সফলভাবে সেভ হয়েছে!');
            loadAiConfig();
        } else {
            alert('এরর: ' + data.error);
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('তথ্য সেভ করতে সমস্যা হয়েছে।');
    } finally {
        btn.textContent = 'পরিবর্তন সেভ করুন';
        btn.disabled = false;
    }
}

// Window Expose for inline onclick
window.addApiKeyRow = function () {
    const container = document.getElementById('api-keys-container');
    const rowCount = container.querySelectorAll('.api-key-row').length;

    if (rowCount >= 10) {
        alert('সর্বোচ্চ ১০টি API Key যুক্ত করা যাবে।');
        return;
    }

    if (container.innerHTML.includes('কোনো API Key পাওয়া যায়নি')) {
        container.innerHTML = '';
    }

    const newRow = document.createElement('div');
    newRow.className = 'api-key-row';
    newRow.style.cssText = 'display: flex; gap: 12px; align-items: center; background: #F8FAFC; padding: 12px; border: 1px dashed var(--primary); border-radius: 8px; animation: fadeIn 0.3s ease;';

    newRow.innerHTML = `
        <input type="text" class="form-control" placeholder="নতুন API Key প্রবেশ করান" style="flex: 1; background: white;">
        <span class="ai-badge info" style="white-space: nowrap;">New</span>
        <button type="button" class="btn-icon" style="color: var(--danger); background: none; border: none; cursor: pointer; padding: 4px;" title="বাতিল করুন" onclick="this.closest('.api-key-row').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;
    container.appendChild(newRow);
};

// --- Tab 1: Overview ---
async function loadAiStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/stats`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && document.getElementById('tab-overview')) {
            console.log('Stats loaded:', data.stats);

            // Render Active Keys
            const activeKeys = data.stats.active_keys || 0;
            const elKeys = document.getElementById('stats-active-keys');
            if (elKeys) elKeys.textContent = activeKeys;

            const pKeys = document.getElementById('stats-keys-progress');
            if (pKeys) pKeys.style.width = `${Math.min((activeKeys / 10) * 100, 100)}%`;

            // Render Tokens
            const elTokens = document.getElementById('stats-tokens-used');
            if (elTokens) elTokens.textContent = (data.stats.tokens_used || 0).toLocaleString('bn-BD');

            // Render Total Queries
            const elTotal = document.getElementById('stats-total-queries');
            if (elTotal) elTotal.textContent = (data.stats.total_queries || 0).toLocaleString('bn-BD');

            // Render Doctor Queries
            let docQueries = 0;
            if (data.stats.feature_breakdown) {
                const f = data.stats.feature_breakdown.find(item => item.feature === 'crop_doctor');
                if (f) docQueries = f.count;
            }
            const elDoc = document.getElementById('stats-doctor-queries');
            if (elDoc) elDoc.textContent = docQueries.toLocaleString('bn-BD');

            // Render Trending
            if (data.stats.trending) {
                const tr = document.getElementById('stats-trending');
                if (tr) {
                    tr.innerHTML = '';
                    if (data.stats.trending.length > 0) {
                        data.stats.trending.forEach(item => {
                            const span = document.createElement('span');
                            span.className = 't-tag';
                            span.style.background = 'var(--bg-hover)';
                            span.style.padding = '8px 16px';
                            span.style.borderRadius = '20px';
                            span.style.fontSize = '14px';
                            span.textContent = item;
                            tr.appendChild(span);
                        });
                    } else {
                        tr.innerHTML = '<span class="t-tag" style="background: var(--bg-hover); padding: 8px 16px; border-radius: 20px; font-size: 14px; color: var(--text-muted);">এখনও কোনো জনপ্রিয় অনুসন্ধান নেই।</span>';
                    }
                }
            }
        }
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

// --- Tab 2: Prediction ---
async function loadPredictionRules() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/prediction-rules`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            const select = document.getElementById('pred-crop-select');
            if (select) {
                select.innerHTML = '<option value="">নতুন ফসল সিলেকশন করুন...</option>';
                data.rules.forEach(rule => {
                    const opt = document.createElement('option');
                    opt.value = rule.id;
                    opt.textContent = rule.crop_name;
                    opt.dataset.yield = rule.average_yield;
                    opt.dataset.cost = rule.average_cost;
                    select.appendChild(opt);
                });
                select.addEventListener('change', (e) => {
                    const selected = e.target.options[e.target.selectedIndex];
                    if (selected && selected.value) {
                        document.getElementById('pred-avg-yield').value = selected.dataset.yield || '';
                        document.getElementById('pred-avg-cost').value = selected.dataset.cost || '';
                    } else {
                        document.getElementById('pred-avg-yield').value = '';
                        document.getElementById('pred-avg-cost').value = '';
                    }
                });
            }
        }
    } catch (e) { console.error('Failed to load prediction rules:', e); }
}

// --- Tab 3: Doctor ---
async function loadDoctorRules() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/doctor-rules`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            const input = document.getElementById('doctor-rules-input');
            if (input && data.rules && data.rules.length > 0) {
                input.value = data.rules.map(r => r.rule_text).join('\n\n');
            } else if (input) {
                input.value = '';
            }
        }
    } catch (e) { console.error('Failed to load doctor rules:', e); }
}

// --- Tab 5: RAG ---
async function loadRagDocuments() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/rag/documents`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            const ul = document.getElementById('rag-documents-list');
            if (ul) {
                if (data.documents && data.documents.length > 0) {
                    ul.innerHTML = '';
                    data.documents.forEach(doc => {
                        ul.innerHTML += `
                            <li style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                                <div>
                                    <div style="font-size: 14px; font-weight: 600; color: var(--text-main);">${doc.title}</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">${doc.size} • সিংক হয়েছে: ${doc.date}</div>
                                </div>
                                <span class="ai-badge success">Active</span>
                            </li>
                        `;
                    });
                } else {
                    ul.innerHTML = '<li style="text-align: center; color: var(--text-muted); padding: 24px;">এখনও কোনো নলেজ আপলোড করা হয়নি।</li>';
                }
            }
        }
    } catch (e) { console.error('Failed to load RAG docs:', e); }
}

// --- Tab 6: Logs ---
async function loadAiLogs() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/logs`, { headers: getAuthHeaders() });
        const data = await response.json();
        const tbody = document.getElementById('logs-tbody');

        if (data.success && tbody) {
            tbody.innerHTML = '';

            if (data.logs && data.logs.length > 0) {
                data.logs.forEach(log => {
                    const tr = document.createElement('tr');

                    // Basic time format, can be customized later
                    const timeStr = new Date(log.created_at || Date.now()).toLocaleString('bn-BD', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    let badgeClass = 'info';
                    let featureLabel = 'Prediction';
                    if (log.feature === 'crop_doctor') { badgeClass = 'warning'; featureLabel = 'Doctor'; }

                    tr.innerHTML = `
                        <td style="white-space: nowrap;">${timeStr}</td>
                        <td>${log.farmer_phone || 'System'}</td>
                        <td><span class="ai-badge ${badgeClass}">${featureLabel}</span></td>
                        <td>${(log.input_prompt || '').substring(0, 45)}...</td>
                        <td>${(log.ai_response || '').substring(0, 45)}...</td>
                        <td style="font-family: monospace; color: var(--text-muted);">${log.tokens_used || 0}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">এখনও কোনো লগ এন্ট্রি নেই।</td></tr>';
            }
        }
    } catch (e) {
        console.error('Failed to load logs:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Load config for Tab 4
    loadAiConfig();

    // Load data for other tabs
    loadAiStats();
    loadPredictionRules();
    loadDoctorRules();
    loadRagDocuments();
    loadAiLogs();

    const saveBtn = document.getElementById('btn-save-config');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAiConfig);
    }

    // Bind Prediction Rule save
    const savePredBtn = document.getElementById('btn-save-pred');
    if (savePredBtn) {
        savePredBtn.addEventListener('click', async () => {
            let cropName = document.getElementById('pred-crop-select').options[document.getElementById('pred-crop-select').selectedIndex]?.text || '';
            const cropId = document.getElementById('pred-crop-select').value;
            const yieldVal = document.getElementById('pred-avg-yield').value;
            const costVal = document.getElementById('pred-avg-cost').value;

            if (cropName.includes('নতুন ফসল')) {
                cropName = prompt('নতুন ফসলের নাম দিন (যেমন: বোরো ধান):');
                if (!cropName) return;
            }

            savePredBtn.textContent = 'সেভ হচ্ছে...';
            try {
                const method = cropId ? 'PUT' : 'POST';
                const endpoint = cropId ? `${BASE_URL}/api/admin/ai/prediction-rules/${cropId}` : `${BASE_URL}/api/admin/ai/prediction-rules`;

                const res = await fetch(endpoint, {
                    method: method,
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ crop_name: cropName, average_yield: yieldVal, average_cost: costVal })
                });
                const d = await res.json();
                if (d.success) alert('প্রেডিকশন বেসলাইন সেভ হয়েছে');
                else alert('Error: ' + d.error);
                loadPredictionRules();
            } catch (e) { alert('Failed'); }
            finally { savePredBtn.textContent = 'বেসলাইন আপডেট করুন'; }
        });
    }

    // Bind Doctor Rule save
    const saveDocBtn = document.getElementById('btn-save-doctor-rules');
    if (saveDocBtn) {
        saveDocBtn.addEventListener('click', async () => {
            const rulesText = document.getElementById('doctor-rules-input').value;
            saveDocBtn.textContent = 'সেভ হচ্ছে...';
            try {
                const res = await fetch(`${BASE_URL}/api/admin/ai/doctor-rules`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ rule_text: rulesText, priority: 1, is_active: 1 })
                });
                const d = await res.json();
                if (d.success) alert('ডাক্তার স্ক্যান রুলস সেভ হয়েছে');
                else alert('Error: ' + d.error);
                loadDoctorRules();
            } catch (e) { alert('Failed'); }
            finally { saveDocBtn.textContent = 'সেভ করুন'; }
        });
    }
});
