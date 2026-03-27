const BASE_URL = 'https://agritech-backend.mobashwir9.workers.dev';

const getAuthHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('agritech_admin_token')}`
    };
};

// --- Global AI Engine Settings ---
async function loadAiConfig() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/config`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && data.config) {
            const emCheck = document.getElementById('config-emergency');
            if (emCheck) {
                emCheck.checked = data.config.emergency_stop === 1;
                const stText = document.getElementById('emergency-status-text');
                if (stText) {
                    stText.textContent = emCheck.checked ? 'বর্তমান স্ট্যাটাস: সম্পূর্ণ বন্ধ (Emergency ON)' : 'বর্তমান স্ট্যাটাস: চালু আছে (Active)';
                    stText.style.color = emCheck.checked ? '#DC2626' : '#16A34A';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load global config:', error);
    }
}

async function saveAiConfig() {
    // Only saves the kill switch now
    const emCheck = document.getElementById('config-emergency');
    if (!emCheck) return;
    
    try {
        const emergency_stop = emCheck.checked ? 1 : 0;
        const response = await fetch(`${BASE_URL}/api/admin/ai/config`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ keys: [], emergency_stop }) // legacy payload structure
        });

        const data = await response.json();
        if (data.success) {
            loadAiConfig();
            loadApiKeys(currentApiPage); // Refresh api keys as status might have changed
        } else {
            alert('এরর: ' + data.error);
            emCheck.checked = !emCheck.checked; // revert
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('খুব সম্ভবত নেটওয়ার্ক এরর।');
        emCheck.checked = !emCheck.checked; // revert
    }
}

// --- Prompt Studio Logic ---
let aiPromptTemplates = {};
let currentActivePromptKey = null;

async function loadAiPrompts() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/prompts`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && data.prompts) {
            aiPromptTemplates = {};
            data.prompts.forEach(p => {
                aiPromptTemplates[p.prompt_key] = p;
            });
            // Inject hardcoded Crop Doctor Prompt
            aiPromptTemplates['crop_doctor_prompt'] = {
                prompt_key: 'crop_doctor_prompt',
                system_role: 'Act as an expert Agricultural Plant Pathologist in Bangladesh. Analyze the provided crop image.',
                template_body: `[ADMIN DIAGNOSTIC RULES]: (Fetched dynamically during scan)\n\nYou MUST output your response strictly using ONLY the following XML tags:\n<status> (disease_detected, healthy, not_a_crop) </status>\n<disease_name_bn> ... </disease_name_bn>\n<disease_name_en> ... </disease_name_en>\n<confidence_score> ... </confidence_score>\n<symptoms> ... </symptoms>\n<organic_solution> ... </organic_solution>\n<chemical_solution> ... </chemical_solution>\n<prevention> ... </prevention>`,
                fallback_message: 'এআই সার্ভার এখন ব্যস্ত, একটু পর চেষ্টা করুন।',
                is_readonly: true
            };
            renderPromptSubtabs();
        }
    } catch (error) {
        console.error('Failed to load prompts:', error);
    }
}

function renderPromptSubtabs() {
    const container = document.getElementById('prompt-subtabs');
    if (!container) return;
    
    container.innerHTML = '';
    const keys = Object.keys(aiPromptTemplates);
    
    if (keys.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted); font-size:13px;">কোনো প্রম্পট টেমপ্লেট পাওয়া যায়নি।</span>';
        return;
    }
    
    if (!currentActivePromptKey || !aiPromptTemplates[currentActivePromptKey]) {
        currentActivePromptKey = keys[0];
    }
    
    keys.forEach(key => {
        const btn = document.createElement('button');
        const isActive = key === currentActivePromptKey;
        btn.className = isActive ? 'btn-primary' : 'btn-outline';
        btn.style.padding = '8px 16px';
        btn.style.borderRadius = '6px';
        
        let label = key;
        if (key === 'cache_generator_prompt') label = 'Crop Generator';
        if (key === 'cron_verifier_prompt') label = 'Cron Verifier';
        if (key === 'crop_doctor_prompt') label = 'Crop Doctor (Vision)';
        
        btn.textContent = label;
        btn.onclick = () => {
            currentActivePromptKey = key;
            renderPromptSubtabs();
            populatePromptEditor();
        };
        container.appendChild(btn);
    });
    
    populatePromptEditor();
}

function populatePromptEditor() {
    if (!currentActivePromptKey || !aiPromptTemplates[currentActivePromptKey]) return;
    
    const p = aiPromptTemplates[currentActivePromptKey];
    document.getElementById('current-prompt-key').value = p.prompt_key;
    document.getElementById('prompt-system-role').value = p.system_role || '';
    document.getElementById('prompt-template-body').value = p.template_body || '';
    document.getElementById('prompt-fallback-message').value = p.fallback_message || '';
    
    const btn = document.getElementById('btn-save-prompt');
    const isReadOnly = p.is_readonly || p.prompt_key === 'cache_generator_prompt' || p.prompt_key === 'cron_verifier_prompt';
    
    document.getElementById('prompt-system-role').readOnly = isReadOnly;
    document.getElementById('prompt-template-body').readOnly = isReadOnly;
    document.getElementById('prompt-fallback-message').readOnly = isReadOnly;
    
    if (isReadOnly) {
        btn.style.display = 'none';
        if (!document.getElementById('readonly-notice')) {
            const notice = document.createElement('div');
            notice.id = 'readonly-notice';
            notice.style.color = 'var(--danger)';
            notice.style.fontSize = '12px';
            notice.style.marginTop = '10px';
            notice.innerHTML = '⚠️ এই প্রম্পটটি ড্যাশবোর্ড থেকে সুরক্ষিত। আপডেট করতে হলে ব্যাকএন্ড সোর্স কোড (`ai_engine.js`) মডিফাই করতে হবে।';
            btn.parentNode.appendChild(notice);
        } else {
            document.getElementById('readonly-notice').style.display = 'block';
        }
    } else {
        btn.style.display = 'block';
        if (document.getElementById('readonly-notice')) {
            document.getElementById('readonly-notice').style.display = 'none';
        }
    }
}

async function saveCurrentPrompt() {
    const btn = document.getElementById('btn-save-prompt');
    const prompt_key = document.getElementById('current-prompt-key').value;
    const system_role = document.getElementById('prompt-system-role').value;
    const template_body = document.getElementById('prompt-template-body').value;
    const fallback_message = document.getElementById('prompt-fallback-message').value;

    if (!prompt_key || !template_body) {
        alert("টেমপ্লেট বডি খালি রাখা যাবে না।");
        return;
    }

    if (btn) {
        btn.innerHTML = 'সেভ হচ্ছে...';
        btn.disabled = true;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/prompts`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ prompt_key, system_role, template_body, fallback_message })
        });

        const data = await response.json();
        if (data.success) {
            aiPromptTemplates[prompt_key].system_role = system_role;
            aiPromptTemplates[prompt_key].template_body = template_body;
            aiPromptTemplates[prompt_key].fallback_message = fallback_message;
            if (btn) btn.innerHTML = 'সেভ হয়েছে!';
            setTimeout(() => { if (btn) btn.innerHTML = 'টেমপ্লেট আপডেট করুন'; }, 2000);
        } else {
            alert('এরর: ' + data.error);
            if (btn) btn.innerHTML = 'টেমপ্লেট আপডেট করুন';
        }
    } catch (error) {
        console.error('Save prompt error:', error);
        alert('তথ্য সেভ করতে সমস্যা হয়েছে।');
        if (btn) btn.innerHTML = 'টেমপ্লেট আপডেট করুন';
    } finally {
        if (btn) btn.disabled = false;
    }
}


// --- Tab 2: API Management ---
let currentApiPage = 1;
let apiPagination = null;

window.loadApiKeys = async function(page = 1) {
    try {
        currentApiPage = page;
        const response = await fetch(`${BASE_URL}/api/admin/ai/api-keys?page=${page}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        const tbody = document.getElementById('api-keys-tbody');
        if (data.success && tbody) {
            tbody.innerHTML = '';
            if (data.keys.length > 0) {
                data.keys.forEach(k => {
                    const tr = document.createElement('tr');
                    
                    let statusColor = '#E2E8F0';
                    let statusLabel = 'অজানা';
                    if (k.status === 'active') { statusColor = 'var(--success)'; statusLabel = 'অ্যাক্টিভ'; }
                    else if (k.status === 'exhausted') { statusColor = 'var(--danger)'; statusLabel = 'Exhausted'; }
                    else if (k.status === 'disabled') { statusColor = '#94A3B8'; statusLabel = 'সাসপেন্ড'; }
                    
                    let timeRemaining = '-';
                    if (k.status === 'exhausted' && k.reset_date) {
                        const remainingMs = new Date(k.reset_date) - new Date();
                        if (remainingMs > 0) {
                            const hours = Math.floor(remainingMs / 3600000);
                            const minutes = Math.floor((remainingMs % 3600000) / 60000);
                            timeRemaining = `<span style="color:var(--danger); font-size:12px;">${hours}h ${minutes}m পর অন হবে</span>`;
                        } else {
                            timeRemaining = '<span style="color:var(--success); font-size:12px;">রেডি! রিফ্রেশ দিন</span>';
                        }
                    }

                    tr.innerHTML = `
                        <td style="font-family: monospace; font-size: 13px; width: 340px; min-width: 340px; max-width: 340px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                <div style="flex: 1; overflow: hidden; white-space: nowrap;">
                                    <span id="key-mask-${k.id}">${k.api_key.substring(0, 10)}*******************</span>
                                    <span id="key-full-${k.id}" style="display: none; background: #F8FAFC; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">${k.api_key}</span>
                                </div>
                                <button onclick="toggleKeyVisibility(${k.id})" style="color: var(--text-muted); background: transparent; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; opacity: 0.8; flex-shrink: 0;" title="Show/Hide">
                                    <svg id="eye-icon-${k.id}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                            </div>
                        </td>
                        <td style="text-align: center;"><span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; background:${statusColor}20; color:${statusColor}; border:1px solid ${statusColor}40;">${statusLabel}</span></td>
                        <td style="text-align: right; font-weight: 500;">${k.today_usage || 0} বার</td>
                        <td style="text-align: right; color: var(--text-muted);">${k.total_usage || 0} বার</td>
                        <td style="text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px; border-bottom: none; border-top: none;">
                            ${timeRemaining === '-' ? `
                                <button onclick="toggleApiKey(${k.id}, '${k.status === 'active' ? 'disabled' : 'active'}')" style="color:var(--primary); background:transparent; border:none; cursor:pointer; display:flex; align-items:center; padding:2px;" title="${k.status === 'active' ? 'সাসপেন্ড করুন' : 'অ্যাক্টিভ করুন'}">
                                    ${k.status === 'active' ? 
                                      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>' 
                                      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'}
                                </button>
                                <button onclick="deleteApiKey(${k.id})" style="color:var(--danger); background:transparent; border:none; cursor:pointer; display:flex; align-items:center; padding:2px;" title="ডিলিট করুন">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            ` : timeRemaining}
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">কোনো API Key ইনসার্ট করা হয়নি।</td></tr>';
            }
            if (!apiPagination) {
                apiPagination = new window.AdminPagination({
                    containerId: 'api-pagination-container',
                    itemName: 'keys',
                    limit: data.limit || 10,
                    onChange: (page) => window.loadApiKeys(page)
                });
            }
            apiPagination.update(data.total, data.page);
        }
    } catch(e) { console.error('Error fetching API keys:', e); }
};

window.submitNewApiKeys = async function() {
    const rawText = document.getElementById('new-api-key-input').value;
    // Split by either comma or newline
    const keys = rawText.split(/[,\n]/).map(s => s.trim()).filter(s => s !== '');
    if (keys.length === 0) return alert('কমপক্ষে একটি Key দিন!');
    
    try {
        const res = await fetch(`${BASE_URL}/api/admin/ai/api-keys`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ keys })
        });
        const data = await res.json();
        if(data.success) {
            alert('সফলভাবে যুক্ত হয়েছে!');
            document.getElementById('add-api-key-modal').style.display = 'none';
            document.getElementById('new-api-key-input').value = '';
            loadApiKeys(currentApiPage);
        } else { alert('Error: ' + data.error); }
    } catch(e) { alert('Failed'); }
};

window.toggleApiKey = async function(id, newStatus) {
    if(!confirm(`আপনি কি এই Key টি ${newStatus} করতে চান?`)) return;
    try {
        const res = await fetch(`${BASE_URL}/api/admin/ai/api-keys/${id}/toggle`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if(data.success) loadApiKeys(currentApiPage);
        else alert('Error: ' + data.error);
    } catch(e) { alert('Failed'); }
};

window.toggleKeyVisibility = function(id) {
    const mask = document.getElementById(`key-mask-${id}`);
    const full = document.getElementById(`key-full-${id}`);
    const eye = document.getElementById(`eye-icon-${id}`);
    
    if (mask.style.display === 'none') {
        mask.style.display = 'inline';
        full.style.display = 'none';
        eye.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    } else {
        mask.style.display = 'none';
        full.style.display = 'inline';
        eye.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    }
};

window.deleteApiKey = async function(id) {
    if(!confirm(`Key টি চিরতরে মুছে ফেলতে চান?`)) return;
    try {
        const res = await fetch(`${BASE_URL}/api/admin/ai/api-keys/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if(data.success) loadApiKeys(currentApiPage);
        else alert('Error: ' + data.error);
    } catch(e) { alert('Failed'); }
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
            const stats = data.stats;

            // 1. API Keys
            document.getElementById('stats-active-keys').textContent = stats.active_keys || 0;
            document.getElementById('stats-total-keys').textContent = stats.total_keys || 0;
            const keyProg = document.getElementById('stats-keys-progress');
            if (keyProg) keyProg.style.width = stats.total_keys ? `${(stats.active_keys / stats.total_keys) * 100}%` : '0%';

            // 2. Total Queries
            document.getElementById('stats-total-queries').textContent = (stats.total_queries || 0).toLocaleString('bn-BD');

            // 3. Success Rate
            document.getElementById('stats-success-rate').textContent = `${stats.success_rate || 0}%`;
            document.getElementById('stats-failed-rate').textContent = stats.failed_rate || 0;
            const sucProg = document.getElementById('stats-success-progress');
            if (sucProg) sucProg.style.width = `${stats.success_rate || 0}%`;

            // 4. Hours Saved
            document.getElementById('stats-hours-saved').textContent = `${(stats.hours_saved || 0).toLocaleString('bn-BD')} ঘণ্টা`;

            // 5. Feature Breakdown
            const fbContainer = document.getElementById('stats-feature-breakdown');
            if (fbContainer) {
                fbContainer.innerHTML = '';
                if (stats.feature_breakdown && stats.feature_breakdown.length > 0) {
                    stats.feature_breakdown.forEach(f => {
                        let name = f.feature;
                        if (name === 'public_prediction') name = 'ফার্মার অ্যাপ প্রেডিকশন';
                        else if (name === 'admin_cache') name = 'অ্যাডমিন ম্যানুয়াল ক্যাশ';
                        else if (name === 'cron_verify') name = 'অটো-ভেরিফিকেশন (Cron)';
                        else if (name === 'crop_doctor') name = 'ক্রপ ডাক্তার';

                        fbContainer.innerHTML += `
                            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
                                <span>${name}</span>
                                <span>${f.count} রিকোয়েস্ট</span>
                            </div>
                            <div class="progress-container" style="margin-bottom: 12px; height: 6px;">
                                <div class="progress-fill" style="width: ${stats.total_queries ? (f.count / stats.total_queries * 100) : 0}%;"></div>
                            </div>
                        `;
                    });
                } else {
                    fbContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 14px;">কোনো ডেটা নেই।</div>';
                }
            }

            // 6. Exhausted Keys Tracker
            const exContainer = document.getElementById('stats-exhausted-keys');
            if (exContainer) {
                exContainer.innerHTML = '';
                if (stats.exhausted_keys && stats.exhausted_keys.length > 0) {
                    stats.exhausted_keys.forEach(k => {
                        const resetTime = new Date(new Date(k.reset_date).getTime() + (24 * 60 * 60 * 1000));
                        let diffHrs = Math.max(0, Math.floor((resetTime - Date.now()) / (1000 * 60 * 60)));
                        exContainer.innerHTML += `<li>Key ID ${k.id} - Active হবে: <span style="color: var(--danger); font-weight: 500;">আর ${diffHrs} ঘণ্টা পর</span></li>`;
                    });
                } else {
                    exContainer.innerHTML = '<li>কোনো কী বর্তমানে Exhausted হয়নি।</li>';
                }
            }

            // 7. Trending
            const trContainer = document.getElementById('stats-trending');
            if (trContainer) {
                trContainer.innerHTML = '';
                if (stats.trending && stats.trending.length > 0) {
                    stats.trending.forEach(item => {
                        trContainer.innerHTML += `<span style="background: var(--bg-hover); padding: 8px 16px; border-radius: 20px; font-size: 14px;">${item.crop_name} (${item.hit_count} বার)</span>`;
                    });
                } else {
                    trContainer.innerHTML = '<span style="background: var(--bg-hover); padding: 8px 16px; border-radius: 20px; font-size: 14px; color: var(--text-muted);">এখনও কোনো জনপ্রিয় অনুসন্ধান নেই।</span>';
                }
            }

            // 8. Vision Metrics (Crop Doctor)
            if (stats.vision_metrics) {
                const vm = stats.vision_metrics;
                const scansEl = document.getElementById('stats-vision-scans');
                if(scansEl) scansEl.textContent = (vm.total_scans || 0).toLocaleString('bn-BD');
                
                const rateEl = document.getElementById('stats-vision-rate');
                if(rateEl) rateEl.textContent = `${vm.success_rate || 0}%`;
                
                const dList = document.getElementById('stats-vision-disease-list');
                const tDisease = document.getElementById('stats-vision-top-disease');
                
                if (tDisease && dList) {
                    if (vm.top_diseases && vm.top_diseases.length > 0) {
                        tDisease.textContent = vm.top_diseases[0].name;
                        dList.innerHTML = vm.top_diseases.slice(1).map(d => `${d.name} (${d.hit_count})`).join(', ') || 'অন্যান্য রোগ নেই';
                    } else {
                        tDisease.textContent = 'নেই';
                        dList.textContent = 'এখনও কোনো রোগ শনাক্ত হয়নি।';
                    }
                }
            }

            // 8. Error Logs
            const erContainer = document.getElementById('stats-error-logs');
            if (erContainer) {
                erContainer.innerHTML = '';
                if (stats.recent_errors && stats.recent_errors.length > 0) {
                    stats.recent_errors.forEach(err => {
                        erContainer.innerHTML += `
                            <tr>
                                <td>${err.feature_type}</td>
                                <td>${err.crop_name || '--'}</td>
                                <td style="color: var(--danger);">${(err.error_message || '').substring(0, 40)}...</td>
                            </tr>
                        `;
                    });
                } else {
                    erContainer.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">কোনো রিসেন্ট এরর লগ পাওয়া যায়নি।</td></tr>';
                }
            }
        }
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

// --- Tab 2: Prediction ---
async function loadMasterCrops() {
    try {
        const response = await fetch(`${BASE_URL}/api/admin/ai/master-crops`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            const select = document.getElementById('test-crop-select');
            if (select) {
                select.innerHTML = '<option value="">ফসল সিলেক্ট করুন...</option>';
                data.crops.forEach(crop => {
                    const opt = document.createElement('option');
                    opt.value = crop.id;
                    opt.textContent = `${crop.crop_name} (${crop.variety_name})`;
                    opt.dataset.name = crop.crop_name;
                    opt.dataset.variety = crop.variety_name;
                    select.appendChild(opt);
                });
            }
        }
        
        // Also fetch global prompt setting
        const stRes = await fetch(`${BASE_URL}/api/admin/ai/settings/global-prompt`, { headers: getAuthHeaders() });
        const stData = await stRes.json();
        if (stData.success && stData.prompt) {
            document.getElementById('global-prompt-input').value = stData.prompt;
        }
    } catch (e) { console.error('Failed to load master crops:', e); }
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
    loadAiPrompts();

    // Load data for other tabs
    loadAiStats();
    loadApiKeys();
    loadDoctorRules();
    loadRagDocuments();
    loadAiLogs();

    const savePromptBtn = document.getElementById('btn-save-prompt');
    if (savePromptBtn) {
        savePromptBtn.addEventListener('click', saveCurrentPrompt);
    }

    // Bind Emergency Status text change on toggle
    const emSwitch = document.getElementById('config-emergency');
    if (emSwitch) {
        emSwitch.addEventListener('change', (e) => {
            const stText = document.getElementById('emergency-status-text');
            if (stText) {
                stText.textContent = e.target.checked ? 'বর্তমান স্ট্যাটাস: সিস্টেম বন্ধ (Emergency ON)' : 'বর্তমান স্ট্যাটাস: চালু আছে (Active)';
                stText.style.color = e.target.checked ? '#DC2626' : '#16A34A';
            }
            saveAiConfig(); // Auto sync
        });
    }

    // Bind Global Prompt Save
    const saveGlobalBtn = document.getElementById('btn-save-global-prompt');
    if (saveGlobalBtn) {
        saveGlobalBtn.addEventListener('click', async () => {
            const promptText = document.getElementById('global-prompt-input').value;
            saveGlobalBtn.textContent = 'সেভ হচ্ছে...';
            try {
                const res = await fetch(`${BASE_URL}/api/admin/ai/settings/global-prompt`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ prompt: promptText })
                });
                const d = await res.json();
                if (d.success) alert('গ্লোবাল প্রম্পট ওভাররাইড সেভ হয়েছে।');
                else alert('Error: ' + d.error);
            } catch (e) { alert('Failed'); }
            finally { saveGlobalBtn.textContent = 'সেভ করুন'; }
        });
    }

    // Note: Test Generation and Clear Cache were replaced by Tab 2 API Management

    // --- Crop Doctor logic ---
    const saveDocBtn = document.getElementById('btn-save-doctor-rules');
    if (saveDocBtn) {
        saveDocBtn.addEventListener('click', async () => {
            const rulesText = document.getElementById('doctor-rules-input').value;
            saveDocBtn.textContent = 'সেভ হচ্ছে...';
            try {
                const res = await fetch(`${BASE_URL}/api/admin/crop-doctor/rules`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ rules: rulesText })
                });
                const d = await res.json();
                if (d.success) alert('ডাক্তার স্ক্যান রুলস সেভ হয়েছে');
                else alert('Error: ' + d.error);
            } catch (e) { alert('Failed'); }
            finally { saveDocBtn.textContent = 'সেভ করুন'; }
        });
    }

    // Load Rules
    async function loadDoctorRules() {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/crop-doctor/rules`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                const input = document.getElementById('doctor-rules-input');
                if (input) input.value = data.rules || '';
            }
        } catch (e) {}
    }

    window.showJsonAlert = (str) => {
        try {
            const obj = JSON.parse(str);
            alert(JSON.stringify(obj, null, 2));
        } catch(e) { alert(str); }
    };

    // Load Scans
    async function updateCropDoctorFeed() {
        try {
            const resOk = await fetch(`${BASE_URL}/api/admin/crop-doctor/scans?limit=50`, { headers: getAuthHeaders() });
            const dataOk = await resOk.json();
            if(dataOk.success) {
                const tbody = document.getElementById('doctor-full-logs-tbody');
                if(tbody) {
                    tbody.innerHTML = '';
                    if(!dataOk.scans.length) {
                        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">নতুন কোনো স্ক্যান রেকর্ড নেই।</td></tr>';
                    } else {
                        dataOk.scans.forEach(scan => {
                            const dDate = new Date(scan.created_at).toLocaleString('bn-BD');
                            
                            let imgSrc = scan.image_url;
                            if (imgSrc && imgSrc.startsWith('crop-scans/')) {
                                imgSrc = `${BASE_URL}/api/public/images/${imgSrc.split('/')[1]}`;
                            } else if (imgSrc === 'expired_removed') {
                                imgSrc = 'https://placehold.co/100x100?text=Expired';
                            } else if (imgSrc && imgSrc.length > 200) {
                                imgSrc = imgSrc; // Base64 Legacy
                            } else {
                                imgSrc = 'https://placehold.co/100x100?text=No+Image';
                            }

                            const badgeColor = scan.confidence_score > 60 ? 'var(--success)' : 'var(--danger)';
                            const jsonStr = scan.scan_result_json ? scan.scan_result_json.replace(/'/g, "&apos;") : '{}';
                            const jsonBtn = `<button class="btn-outline-primary" style="padding:6px 12px; font-size:12px; display:inline-flex; align-items:center; gap:6px; font-weight:600;" onclick='window.showScanDetailsModal(this.dataset.json, "${imgSrc}", "${scan.id}", "${dDate}")' data-json='${jsonStr}'>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                View
                            </button>`;
                            
                            tbody.innerHTML += `<tr>
                                <td>#${scan.id}</td>
                                <td><a href="${imgSrc}" target="_blank"><img src="${imgSrc}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);"></a></td>
                                <td>${scan.farm_id ? 'Farm: '+scan.farm_id : 'Guest'}${scan.user_id != null ? '<br><small style="color:var(--text-muted)">User: ' + (scan.user_id === 0 ? 'Admin' : scan.user_id) + '</small>' : ''}</td>
                                <td><strong>${scan.disease_name_bn}</strong><br><span style="color:${badgeColor}; font-weight:600;">Confidence: ${scan.confidence_score}%</span></td>
                                <td>${jsonBtn}</td>
                                <td>${dDate}</td>
                            </tr>`;
                        });
                    }
                }
            }
        } catch(e) { console.error("Could not load scan logs:", e); }
    }

    // Sandbox Scanner Logic
    const btnSandbox = document.getElementById('btn-sandbox-scan');
    const sandboxInput = document.getElementById('sandbox-image-upload');
    if (btnSandbox && sandboxInput) {
        btnSandbox.addEventListener('click', () => {
            const file = sandboxInput.files[0];
            if(!file) return alert('দয়া করে একটি ছবি আপলোড করুন');
            
            btnSandbox.innerHTML = 'স্ক্যান হচ্ছে...';
            btnSandbox.disabled = true;

            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Str = e.target.result;
                const resultBox = document.getElementById('sandbox-result-box');
                resultBox.style.display = 'block';
                resultBox.innerHTML = 'স্ক্যান করা হচ্ছে... দয়া করে অপেক্ষা করুন।';
                try {
                    const response = await fetch(`${BASE_URL}/api/public/crop-scan`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('agritech_admin_token')}`
                        },
                        body: JSON.stringify({ imageBase64: base64Str })
                    });
                    const res = await response.json();
                    if (res.success) {
                        const rd = res.data;
                        const badgeColor = rd.confidence_score > 60 ? '#10b981' : '#ef4444';
                        resultBox.innerHTML = `
                            <div style="display: grid; grid-template-columns: minmax(200px, 300px) 1fr; gap: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                                <!-- Left Preview -->
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start;">
                                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-align: left; width: 100%;">আপলোড করা ছবি:</h4>
                                    <img src="${base64Str}" style="width: 100%; height: auto; max-width: 100%; border-radius: 8px; border: 1px solid #cbd5e1; object-fit: cover;">
                                </div>
                                
                                <!-- Right Details -->
                                <div style="display: flex; flex-direction: column;">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                                        <div>
                                            <h3 style="margin:0 0 4px 0; font-size: 20px; color: #0f172a; font-weight: 700;">${rd.disease_name_bn || 'অজানা রোগ'}</h3>
                                            <span style="color: #64748b; font-style: italic; font-size: 14px;">${rd.disease_name_en || ''}</span>
                                        </div>
                                        <div style="background: ${badgeColor}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; white-space: nowrap; display: inline-block;">
                                            নিশ্চয়তা: ${rd.confidence_score}%
                                        </div>
                                    </div>
                                    
                                    <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                                        ${rd.symptoms ? `<div style="margin-bottom: 12px; padding: 10px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px;"><strong>লক্ষণসমূহ:</strong><br>${rd.symptoms}</div>` : ''}
                                        ${rd.organic_solution ? `<div style="margin-bottom: 12px; padding: 10px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px;"><strong>জৈব সমাধান:</strong><br>${rd.organic_solution}</div>` : ''}
                                        ${rd.chemical_solution ? `<div style="margin-bottom: 12px; padding: 10px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 4px;"><strong>রাসায়নিক সমাধান:</strong><br>${rd.chemical_solution}</div>` : ''}
                                        ${rd.prevention ? `<div style="margin-bottom: 12px; padding: 10px; background: #f0f9ff; border-left: 3px solid #0284c7; border-radius: 4px;"><strong>প্রতিকার:</strong><br>${rd.prevention}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                        updateCropDoctorFeed(); // refresh feed
                    } else {
                        resultBox.innerHTML = `<strong style="color:var(--danger)">স্ক্যান ব্যর্থ:</strong><br>${res.error}`;
                    }
                } catch(err) {
                    resultBox.innerHTML = 'Network Error.';
                } finally {
                    btnSandbox.innerHTML = 'স্ক্যান করুন';
                    btnSandbox.disabled = false;
                }
            };
            reader.readAsDataURL(file);
        });
    }

    const refreshLogsBtn = document.getElementById('refresh-logs-btn');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', updateCropDoctorFeed);
    }

    loadDoctorRules();
    updateCropDoctorFeed();

    // UI Scan Details View
    window.showScanDetailsModal = (jsonStr, imgSrc, scanId, dDate) => {
        try {
            const rd = JSON.parse(jsonStr.replace(/&apos;/g, "'"));
            const badgeColor = rd.confidence_score > 60 ? '#10b981' : '#ef4444';
            
            const contentBox = document.getElementById('scanDetailsModalContent');
            contentBox.innerHTML = `
                <div style="display: grid; grid-template-columns: minmax(200px, 250px) 1fr; gap: 24px; align-items: start;">
                    <!-- Left Column: Image -->
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <img src="${imgSrc}" style="width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; object-fit: cover; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;"><strong>লগ আইডি:</strong> #${scanId}</p>
                            <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>সময়:</strong> ${dDate}</p>
                        </div>
                    </div>
                    
                    <!-- Right Column: Details -->
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
                            <div>
                                <h3 style="margin:0 0 6px 0; font-size: 20px; color: #0f172a; font-weight: 700;">${rd.disease_name_bn || 'অজানা অবস্থা'}</h3>
                                <span style="color: #64748b; font-style: italic; font-size: 14px;">${rd.disease_name_en || ''}</span>
                            </div>
                            <div style="background: ${badgeColor}; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                নিশ্চয়তা: ${rd.confidence_score}%
                            </div>
                        </div>
                        
                        <div style="font-size: 14px; line-height: 1.6; color: #334155; display: flex; flex-direction: column; gap: 12px;">
                            ${rd.status ? `<p style="margin:0;"><strong>স্ট্যাটাস:</strong> <span style="background:#e2e8f0; padding:2px 8px; border-radius:4px; font-size:12px;">${rd.status.replace(/_/g, ' ').toUpperCase()}</span></p>` : ''}
                            ${rd.symptoms ? `<div style="padding: 12px; background: #fffaf0; border-left: 4px solid #f59e0b; border-radius: 6px;"><strong style="color: #b45309; display:block; margin-bottom:4px;">লক্ষণসমূহ:</strong>${rd.symptoms}</div>` : ''}
                            ${rd.organic_solution ? `<div style="padding: 12px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px;"><strong style="color: #15803d; display:block; margin-bottom:4px;">জৈব সমাধান:</strong>${rd.organic_solution}</div>` : ''}
                            ${rd.chemical_solution ? `<div style="padding: 12px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px;"><strong style="color: #b91c1c; display:block; margin-bottom:4px;">রাসায়নিক সমাধান:</strong>${rd.chemical_solution}</div>` : ''}
                            ${rd.prevention ? `<div style="padding: 12px; background: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 6px;"><strong style="color: #0369a1; display:block; margin-bottom:4px;">প্রতিকার:</strong>${rd.prevention}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('scanDetailsModalOverlay').classList.add('active');
            document.getElementById('scanDetailsModal').style.display = 'block';
        } catch(e) {
            alert('Error parsing or displaying JSON result: ' + e.message);
        }
    };

    window.closeScanDetailsModal = () => {
        document.getElementById('scanDetailsModalOverlay').classList.remove('active');
        document.getElementById('scanDetailsModal').style.display = 'none';
        document.getElementById('scanDetailsModalContent').innerHTML = '';
    };
});
