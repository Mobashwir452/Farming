import { API_URL } from './auth.js';

let currentFarmId = null;
let currentCropName = null;
let currentVarietyName = null;
let aiGeneratedTimeline = null;

window.onload = async () => {
    const params = new URLSearchParams(window.location.search);
    currentFarmId = params.get('farm_id');
    currentCropName = params.get('crop_name');
    currentVarietyName = params.get('variety_name') || '';
    window.currentPlantingMethod = params.get('planting_method') || '';

    if (currentVarietyName && currentVarietyName !== currentCropName) {
        document.getElementById('crop-name-display').textContent = `${currentCropName} (${currentVarietyName})`;
    } else {
        document.getElementById('crop-name-display').textContent = currentCropName || 'অজানা ফসল';
    }

    if (!currentFarmId || !currentCropName) {
        alert("দুঃখিত, জমির তথ্য বা ফসলের নাম পাওয়া যায়নি। গাইডলাইন লোড করা সম্ভব নয়।");
        document.getElementById('ai-loading-state').innerHTML = '<p style="color:red;">ত্রুটি: তথ্য অসম্পূর্ণ, ফিরে যান।</p>';
        return;
    }

    const token = localStorage.getItem('farmer_jwt');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    await fetchFarmName(token, currentFarmId);
    await fetchPrediction();
};

async function fetchFarmName(token, farmId) {
    try {
        const farmQuery = await fetch(`${API_URL}/api/farms`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const farmData = await farmQuery.json();
        if (farmData.success) {
            const theFarm = farmData.farms.find(f => f.id == farmId);
            if (theFarm) {
                document.getElementById('farm-name-display').textContent = `${theFarm.name} (${theFarm.area_shotangsho} শতাংশ)`;
            } else {
                document.getElementById('farm-name-display').textContent = 'অজ্ঞাত জমি';
            }
        }
    } catch (e) {
        document.getElementById('farm-name-display').textContent = 'অজ্ঞাত জমি';
    }
}

window.fetchPrediction = async function (forceOffSeason = false) {
    const token = localStorage.getItem('farmer_jwt');
    const loadingState = document.getElementById('ai-loading-state');

    let msgIdx = 0;
    const loadingMsgs = [
        "মাটির প্রকৃতি ও আবহাওয়া স্ক্যান করা হচ্ছে...",
        "বীজ ও সারের হিসাব মেলানো হচ্ছে...",
        "আবহাওয়া ও রোগের ঝুঁকি এনালাইসিস চলছে...",
        "বাংলাদেশ কৃষি গবেষণা ইন্সটিটিউট (BARI) এর ডাটাবেস চেক করা হচ্ছে...",
        "আপনার জমির জন্য সম্পূর্ণ কাস্টম টাইমলাইন তৈরি করা হচ্ছে...",
        "সর্বোত্তম ফলাফল প্রসেসিঙে আরেকটু সময় লাগছে..."
    ];

    loadingState.innerHTML = `
        <style>@keyframes rotatespin { 100% { transform: rotate(360deg); } }</style>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: rotatespin 1.2s linear infinite; color: var(--primary); margin-bottom: 16px;">
            <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <h3 id="gemini-loading-msg" style="color: var(--text-main); font-size: 16px; transition: opacity 0.3s; min-height: 24px;">এআই ডাটা সিঙ্ক হচ্ছে...</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">সঠিক তথ্য এনালাইসিস করে আপনার জন্য সবচেয়ে লাভজনক পদ্ধতি তৈরি করা হচ্ছে। দয়া করে অপেক্ষা করুন...</p>
    `;

    window.predLoaderInterval = setInterval(() => {
        const msgEl = document.getElementById('gemini-loading-msg');
        if(msgEl) {
            msgEl.style.opacity = '0';
            setTimeout(() => {
                msgEl.textContent = loadingMsgs[msgIdx % loadingMsgs.length];
                msgEl.style.opacity = '1';
                msgIdx++;
            }, 300);
        }
    }, 2800);

    try {
        const fetchUrl = `${API_URL}/api/ai/predict-crop?farm_id=${currentFarmId}&crop_name=${encodeURIComponent(currentCropName)}${currentVarietyName ? '&variety_name=' + encodeURIComponent(currentVarietyName) : ''}${forceOffSeason ? '&force_off_season=true' : ''}`;
        const response = await fetch(fetchUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const resData = await response.json();

        if (!response.ok || !resData.success) {
            // Handle specific off-season warning sent by RAG backend!
            if (resData.off_season_warning) {
                loadingState.innerHTML = `
                    <div style="background: #FFF1F2; border: 1px solid #FECDD3; padding: 24px; border-radius: 12px; text-align: left;">
                        <h3 style="color: #BE185D; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-size: 16px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            অসময়ে ফসল রোপণ সতর্কতা!
                        </h3>
                        <p style="color: var(--text-main); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                            ${resData.message}
                        </p>
                        <div style="display: flex; gap: 12px;">
                            <button onclick="window.history.back()" style="flex:1; padding: 14px; background: white; border: 1px solid var(--border-color); border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;">ফিরে যান</button>
                            <button onclick="fetchPrediction(true)" style="flex:1; padding: 14px; background: #BE185D; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;">হ্যাঁ, নিশ্চিত</button>
                        </div>
                    </div>
                `;
                return; // Stop here, wait for user input
            }
            if (window.predLoaderInterval) clearInterval(window.predLoaderInterval);
            throw new Error(resData.error || "এনালাইসিস ব্যর্থ হয়েছে");
        }

        if (window.predLoaderInterval) clearInterval(window.predLoaderInterval);
        populateUI(resData.data);

        // Keep a reference to the ENTIRE AI DATA so we can preview and save it later
        window.fullAIData = resData.data;
        aiGeneratedTimeline = resData.data.timeline;
        // Variety display is handled upfront directly from URL input on page load.
        // Update it if the AI surprisingly selected a new variety.
        if (resData.data.variety_name) {
            currentVarietyName = resData.data.variety_name;
            if (currentVarietyName !== currentCropName) {
                document.getElementById('crop-name-display').textContent = `${currentCropName} (${currentVarietyName})`;
            } else {
                document.getElementById('crop-name-display').textContent = currentCropName;
            }
        }

        loadingState.style.display = 'none';
        document.getElementById('ai-result-content').style.display = 'block';

    } catch (e) {
        console.error(e);
        loadingState.innerHTML = `<p style="color:red; font-size: 15px; text-align: center; font-weight: 600;">${e.message || 'সার্ভার সমস্যা, পরে চেষ্টা করুন'}</p>`;
    }
}

function populateUI(data) {
    // Yield Math (Maund = KG / 40)
    const kgAmount = parseInt(data.yield.range) || 0;
    const maundAmount = (kgAmount / 40).toFixed(1);
    // Remove .0 if it's a floating whole number
    const displayMaund = maundAmount.endsWith('.0') ? maundAmount.slice(0, -2) : maundAmount;

    document.getElementById('render-yield-range').innerHTML = `${kgAmount} <span>কেজি</span> <span style="font-size: 16px; color: var(--text-muted); font-weight: 500;">(${displayMaund} মণ)</span>`;
    document.getElementById('render-yield-condition').textContent = data.yield.condition;

    // Timeline Progress Segmented Bar
    const numSteps = (data.timeline && data.timeline.length) ? data.timeline.length : 1;
    let segmentsHtml = '';
    for(let i = 0; i < numSteps; i++) {
        segmentsHtml += `<div style="flex: 1; height: 100%; background: var(--primary); border-right: ${i < numSteps - 1 ? '1.5px solid white' : 'none'}; border-radius: ${i===0?'4px 0 0 4px':(i===numSteps-1?'0 4px 4px 0':'0')};"></div>`;
    }
    const conditionBar = document.querySelector('.condition-bar');
    if (conditionBar) {
        conditionBar.style.display = 'flex';
        conditionBar.style.backgroundColor = 'transparent';
        conditionBar.innerHTML = segmentsHtml;
    }

    // Finance
    document.getElementById('render-fin-cost').textContent = `৳ ${data.finance.cost}`;
    document.getElementById('render-fin-revenue').textContent = `৳ ${data.finance.revenue}`;
    document.getElementById('render-fin-profit').textContent = `৳ ${data.finance.profit}`;

    // Risks
    const risksList = document.getElementById('render-risks');
    risksList.innerHTML = '';
    data.risks.forEach(risk => {
        let iconHtml = risk.type === 'warning'
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`;

        risksList.innerHTML += `
            <li class="risk-item ${risk.type}">
                ${iconHtml}
                <span>${risk.message}</span>
            </li>
        `;
    });

    // Timeline
    const tlContainer = document.getElementById('render-timeline');
    tlContainer.innerHTML = '';
    
    const getCategoryClass = (t) => {
        if(!t) return 'cat-default';
        t = t.toLowerCase();
        if(t.includes('বীজ') || t.includes('চারা') || t.includes('জমি') || t.includes('প্রস্তুত')) return 'cat-prep'; 
        if(t.includes('বপন') || t.includes('রোপণ') || t.includes('সেচ')) return 'cat-sow'; 
        if(t.includes('সার') || t.includes('পরিচর্যা') || t.includes('আগাছা') || t.includes('খুঁটি')) return 'cat-feed'; 
        if(t.includes('রোগ') || t.includes('পোকা') || t.includes('বালাই')) return 'cat-protect'; 
        if(t.includes('সংগ্রহ') || t.includes('হার্ভেস্ট') || t.includes('ফসল')) return 'cat-harvest'; 
        return 'cat-default';
    };

    if (data.timeline && data.timeline.length > 0) {
        data.timeline.forEach((step, idx) => {
            const bnDigit = (step.step_number || (idx + 1)).toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
            const catClass = getCategoryClass(step.title);
            tlContainer.innerHTML += `
                <div class="gl-step ${catClass}">
                    <div class="gl-dot">${bnDigit}</div>
                    <div class="gl-content">
                        <h4>${step.title}</h4>
                        <p>${step.description}</p>
                    </div>
                </div>
            `;
        });
    } else {
        tlContainer.innerHTML = '<p style="color:var(--text-muted); font-size:13px; text-align:center;">কোনো টাইমলাইন পাওয়া যায়নি।</p>';
    }
}

window.acceptAITimeline = function () {
    if (!window.fullAIData || !currentFarmId) return;

    const btn = document.querySelector('.btn-accept');
    const originalText = btn.innerHTML;

    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        প্রস্তুত হচ্ছে...
    `;
    let style = document.getElementById('spinStyle');
    if (!style) {
        style = document.createElement('style');
        style.id = 'spinStyle';
        style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    try { 
        const finalCropSaveName = (currentVarietyName && currentVarietyName !== currentCropName)
            ? `${currentCropName} (${currentVarietyName})`
            : currentCropName;

        const payload = {
            farm_id: currentFarmId,
            crop_name: finalCropSaveName,
            status: 'Healthy',
            timeline: window.fullAIData.timeline,
            daily_tasks: window.fullAIData.daily_tasks,
            resources: window.fullAIData.resources,
            finance: window.fullAIData.finance,
            yield: window.fullAIData.yield,
            base64_image: sessionStorage.getItem('pendingCropImage') || null
        };

        sessionStorage.setItem('pendingAICropData', JSON.stringify(payload));
        window.location.href = 'ai_timeline_tasks.html';
        
    } catch (e) {
        console.error(e);
        alert("প্রসেসিং ব্যর্থ হয়েছে।");
        btn.innerHTML = originalText;
    }
}

