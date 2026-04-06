// ==========================================
// Smart Sidebar UI Controller (Glassmorphism)
// ==========================================

let currentPlantSelection = null;

// Expose globally
window.openPlantSidebar = function(plantData) {
    currentPlantSelection = plantData;
    
    // Update Header
    document.getElementById('sbPlantTitle').innerText = `${plantData.plantId}`;
    if(plantData.location) document.getElementById('sbPlantLocation').innerText = plantData.location;
    
    const statusEl = document.getElementById('sbPlantStatus');
    const healthText = document.getElementById('sbHealthText');
    const healthCircle = document.getElementById('sbHealthCircle');
    const chartSvg = document.querySelector('.circular-chart');
    
    // Reset Classes
    statusEl.className = 'health-badge';
    chartSvg.className = 'circular-chart';
    
    if(plantData.state === 'H') {
        statusEl.classList.add('h-healthy');
        statusEl.innerText = 'স্ট্যাটাস: সুস্থ';
        healthText.innerText = '95%';
        healthCircle.setAttribute('stroke-dasharray', '95, 100');
        chartSvg.classList.add('green');
    } else if(plantData.state === 'S') {
        statusEl.classList.add('h-sick');
        statusEl.innerText = 'স্ট্যাটাস: অসুস্থ';
        healthText.innerText = '45%';
        healthCircle.setAttribute('stroke-dasharray', '45, 100');
        chartSvg.classList.add('red');
    } else {
        statusEl.classList.add('h-dead');
        statusEl.innerText = 'স্ট্যাটাস: মৃত';
        healthText.innerText = '0%';
        healthCircle.setAttribute('stroke-dasharray', '0, 100');
        chartSvg.classList.add('grey');
    }
    
    // Inject Profile Form
    injectSmartProfileForm(plantData);

    // Slide in
    document.getElementById('plantSidebar').classList.add('active');
    
    // Fetch logs
    fetchPlantLogs(plantData.bedId, plantData.plantId);
}

function injectSmartProfileForm(data) {
    const panel = document.getElementById('smartUpdatePanel');
    panel.style.display = 'block';
    panel.innerHTML = `
        <h4 style="margin:0 0 12px 0; font-size: 13px; color: var(--agri-dark);">অ্যাগ্রোনমি আপডেট</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label style="font-size: 11px; opacity: 0.7;">উচ্চতা (ইঞ্চি)</label>
                <input type="number" id="plantHeight" class="form-input" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;" value="12">
            </div>
            <div>
                <label style="font-size: 11px; opacity: 0.7;">ফলের সংখ্যা</label>
                <input type="number" id="plantFruitCount" class="form-input" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;" value="0">
            </div>
            <div style="grid-column: span 2;">
                <label style="font-size: 11px; opacity: 0.7;">রোগ/লক্ষন</label>
                <select id="plantDisease" class="form-input" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;">
                    <option value="">কোনো লক্ষন নেই</option>
                    <option value="Yellowing">পাতা হলুদ হয়ে যাওয়া</option>
                    <option value="Wilting">গাছ ঝিমিয়ে পড়া</option>
                    <option value="Insects">পোকামাকড় আক্রমণ</option>
                </select>
            </div>
            <div style="grid-column: span 2; margin-top: 5px;">
                <button onclick="saveSmartProfile()" style="width: 100%; padding: 8px; background: rgba(5,150,105,0.1); color: var(--agri-green); border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s;">আপডেট প্রোফাইল</button>
            </div>
        </div>
    `;
}

window.saveSmartProfile = async function() {
    if(!currentPlantSelection) return;
    const height = document.getElementById('plantHeight').value;
    const fruits = document.getElementById('plantFruitCount').value;
    const disease = document.getElementById('plantDisease').value;
    
    // Simulate API call for saving plant details
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = 'সেভ হচ্ছে...';
    
    // Here we will eventually send to D1: 
    // UPDATE crop_beds SET plants_nodes_json = (logic to map and update the node)
    // For now we just add an auto timeline log to demonstrate the functionality
    
    setTimeout(() => {
        btn.innerText = '✅ সেভড';
        let logMsg = `উচ্চতা: ${height}", ফল: ${fruits}`;
        if(disease) logMsg += `, লক্ষণ: ${disease}`;
        
        postAutoLog(currentPlantSelection.bedId, currentPlantSelection.plantId, logMsg, 'Profile Updated');
        
        setTimeout(() => btn.innerText = originalText, 2000);
    }, 800);
}

function postAutoLog(bedId, plantId, note, action) {
    // Re-use logic from addPlantLog but make it programatic
    document.getElementById('newLogInput').value = `${action} - ${note}`;
    addPlantLog(); // which internally calls the backend
}

window.closePlantSidebar = function() {
    document.getElementById('plantSidebar').classList.remove('active');
    currentPlantSelection = null;
}

async function fetchPlantLogs(bedId, plantId) {
    const tlContainer = document.getElementById('sbTimeline');
    tlContainer.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); font-size: 12px;">লগ লোড হচ্ছে...</p>';

    try {
        const res = await fetch(`${API_URL}/api/crops/beds/${bedId}/plants/${plantId}/logs`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await res.json();
        
        if (data.success && data.logs.length > 0) {
            tlContainer.innerHTML = data.logs.map(log => `
                <div class="tl-item">
                    <div class="tl-dot ${log.ai_scan_id ? 'ai' : ''}">${log.ai_scan_id ? '🤖' : '🌱'}</div>
                    <div class="tl-content">
                        <span class="tl-date">${new Date(log.created_at).toLocaleString('bn-BD')}</span>
                        ${log.note}
                    </div>
                </div>
            `).join('');
        } else {
            tlContainer.innerHTML = `
                <div class="tl-item">
                    <div class="tl-dot">!</div>
                    <div class="tl-content">
                        <span class="tl-date">এইমাত্র</span>
                        এখন পর্যন্ত কোনো নোট যোগ করা হয়নি।
                    </div>
                </div>
            `;
        }
    } catch (e) {
        tlContainer.innerHTML = '<p style="text-align: center; color: #ef4444; font-size: 12px;">লগ লোড করতে সমস্যা হয়েছে।</p>';
    }
}

window.addPlantLog = async function() {
    if (!currentPlantSelection) return;
    const input = document.getElementById('newLogInput');
    const note = input.value.trim();
    if (!note) return;

    try {
        input.disabled = true;
        const res = await fetch(`${API_URL}/api/crops/beds/${currentPlantSelection.bedId}/plants/${currentPlantSelection.plantId}/logs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ note })
        });
        
        const data = await res.json();
        if (data.success) {
            input.value = '';
            fetchPlantLogs(currentPlantSelection.bedId, currentPlantSelection.plantId);
        }
    } catch (e) {
        console.error(e);
        alert("নোট সেভ করতে সমস্যা হয়েছে");
    } finally {
        input.disabled = false;
    }
}

// In a real sophisticated system, markPlantState and deletePlant would edit the plants_nodes_json in DB and then reload/refresh the 3D map.
// For demonstration of the UI limits in Phase 5:
window.markPlantState = function(state) {
    if(!currentPlantSelection) return;
    // Just a UI mock to show it updates (since doing delta JSON overwrite requires full map rebuild)
    alert('গাছের স্বাস্থ্য পরিবর্তন করা হয়েছে। এটি ডিনামিকভাবে মূল ম্যাপে যুক্ত হবে।');
    // Updating local memory and reloading sidebar
    currentPlantSelection.state = state;
    openPlantSidebar(currentPlantSelection);
}

window.deletePlant = function() {
    if(!currentPlantSelection) return;
    if(confirm('আপনি কি নিশ্চিত যে এই বেড থেকে এই গাছটি মুছে ফেলতে চান?')) {
        alert('গাছ মুছে ফেলা হয়েছে।');
        closePlantSidebar();
    }
}
