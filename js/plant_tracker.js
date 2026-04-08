// js/plant_tracker.js

const API_BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
const cropId = new URLSearchParams(window.location.search).get('crop_id');
let farmData = [];

// App State
let currentFilter = 'all'; 
let isBatchMode = false;
let selectedPlants = new Set(); // Stores objects like {bedId, plantId, pIndex, bIndex}
let currentlyEditingPlant = null; // Stores {bedId, node, bIndex, pIndex}
let expandedBedIndexes = new Set([0]); // Memory for open beds across rerenders

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupFilters();
});

async function initApp() {
    if (!cropId) {
        alert("Crop ID is missing.");
        return;
    }

    try {
        const token = localStorage.getItem('farmer_jwt');
        
        let cropData = null;
        let data = null;

        try {
            // Fetch Crop Details and Beds parallelly, catch errors individually
            const [cropRes, bedsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/crops/${cropId}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                fetch(`${API_BASE_URL}/api/crops/${cropId}/plants`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
            ]);

            if (cropRes && cropRes.ok) cropData = await cropRes.json();
            if (bedsRes && bedsRes.ok) data = await bedsRes.json();
        } catch (e) {
            console.warn("Non-fatal fetch error:", e);
        }

        if (cropData && cropData.success && cropData.crop) {
            document.getElementById('headerCropName').innerText = cropData.crop.crop_name;
            if (document.getElementById('headerFarmName')) {
                document.getElementById('headerFarmName').innerText = cropData.crop.farm_name || 'স্মার্ট ম্যাপ';
            }
        }

        if (data && data.success && data.beds) {
            farmData = data.beds.map(bed => {
                if (typeof bed.plants_nodes_json === 'string') {
                    bed.plants_nodes_json = JSON.parse(bed.plants_nodes_json);
                }
                return bed;
            });
            renderBeds();
        } else {
            document.getElementById('trackerMain').innerHTML = '<div style="text-align:center; padding: 40px;">কোনো ডেটা পাওয়া যায়নি। আগে ম্যাপ তৈরি করুন।</div>';
        }
    } catch (e) {
        console.error("Error initializing app:", e);
        document.getElementById('trackerMain').innerHTML = '<div style="text-align:center; padding: 40px; color: red;">লোকাল ডাটা প্রসেসিং এরর।</div>';
    }
}

// ========================
// Renders the bed list & chips
// ========================
function renderBeds() {
    const main = document.getElementById('trackerMain');
    main.innerHTML = '';
    
    let totalAll = 0, totalHealthy = 0, totalSick = 0, totalCritical = 0;

    farmData.forEach((bed, bIndex) => {
        const nodes = bed.plants_nodes_json || [];
        
        let bedHealthy = 0;
        let bedSick = 0;
        let bedCritical = 0;

        // Create Grid container for chips
        const gridDiv = document.createElement('div');
        gridDiv.className = 'plant-grid';

        nodes.forEach((node, pIndex) => {
            const state = node.state || 'H';
            totalAll++;
            if (state === 'C') { totalCritical++; bedCritical++; }
            else if (state === 'S') { totalSick++; bedSick++; }
            else { totalHealthy++; bedHealthy++; }

            // Filter logic
            if (currentFilter === 'H' && state !== 'H') return;
            if (currentFilter === 'S' && state !== 'S') return;
            if (currentFilter === 'C' && state !== 'C') return;

            const chip = document.createElement('div');
            let stateClass = 'healthy';
            if (state === 'S') stateClass = 'sick';
            if (state === 'C') stateClass = 'critical';

            chip.className = `plant-chip ${stateClass}`;
            chip.innerText = node.id.split('-')[1]; // Show T1, T2 etc.
            
            // Reapply selection state if stored
            const plantKey = `${bIndex}-${pIndex}`;
            if (Array.from(selectedPlants).some(p => `${p.bIndex}-${p.pIndex}` === plantKey)) {
                chip.classList.add('selected');
            }

            chip.addEventListener('click', () => handleChipClick(bed, node, bIndex, pIndex, chip));
            gridDiv.appendChild(chip);
        });

        // Only show bed if it has matching chips
        if (gridDiv.children.length > 0) {
            const bedCard = document.createElement('div');
            bedCard.className = 'bed-card';
            if(isBatchMode) bedCard.classList.add('batch-mode');

            bedCard.innerHTML = `
                <div class="bed-header" onclick="toggleAccordion(this, ${bIndex})">
                    <h2><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg> বেড ${bIndex + 1}</h2>
                    <div class="bed-stats">সুস্থ: ${bedHealthy} | অসুস্থ: ${bedSick} | বিপজ: ${bedCritical}</div>
                </div>
                <div class="bed-content"></div>
            `;
            bedCard.querySelector('.bed-content').appendChild(gridDiv);
            
            // Reapply accordion state
            if(expandedBedIndexes.has(bIndex)) bedCard.classList.add('open');

            main.appendChild(bedCard);
        }
    });

    if (main.innerHTML === '') {
        main.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-dim);">এই ভিউতে কোনো গাছ নেই।</div>';
    }

    // Update Counts
    document.getElementById('countAll').innerText = totalAll;
    document.getElementById('countHealthy').innerText = totalHealthy;
    document.getElementById('countSick').innerText = totalSick;
    if (document.getElementById('countCritical')) document.getElementById('countCritical').innerText = totalCritical;
}

// ========================
// Accordion Logic
// ========================
window.toggleAccordion = function(headerElement, index) {
    const card = headerElement.parentElement;
    if (!card.classList.contains('open')) {
        document.querySelectorAll('.bed-card').forEach(c => c.classList.remove('open'));
        card.classList.add('open');
        expandedBedIndexes.clear();
        expandedBedIndexes.add(index);
    } else {
        card.classList.remove('open');
        expandedBedIndexes.delete(index);
    }
};

// ========================
// Filter Logic
// ========================
function setupFilters() {
    const tabs = document.querySelectorAll('.ld-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-filter');
            renderBeds();
        });
    });
}

// ========================
// Interaction: Chip Click
// ========================
function handleChipClick(bed, node, bIndex, pIndex, chipElement) {
    if (isBatchMode) {
        toggleSelectionState(bed.id, node, bIndex, pIndex, chipElement);
    } else {
        openBottomSheet(bed, node, bIndex, pIndex);
    }
}

// ========================
// Batch Mode Logic
// ========================
function toggleBatchMode() {
    isBatchMode = !isBatchMode;
    const btn = document.getElementById('batchSelectBtn');
    const actionBar = document.getElementById('batchActionBar');
    const bottomNav = document.querySelector('app-bottom-nav');
    
    if (isBatchMode) {
        btn.classList.add('active');
        actionBar.classList.add('visible');
        if(bottomNav) bottomNav.style.display = 'none';
    } else {
        btn.classList.remove('active');
        actionBar.classList.remove('visible');
        if(bottomNav) bottomNav.style.display = '';
        selectedPlants.clear();
        updateSelectedCountUI();
    }
    renderBeds(); // Re-render to add/remove .batch-mode class
}

function toggleSelectionState(bedId, node, bIndex, pIndex, chipEl) {
    const key = `${bIndex}-${pIndex}`;
    
    // Check if already selected
    const existingArr = Array.from(selectedPlants);
    const index = existingArr.findIndex(p => `${p.bIndex}-${p.pIndex}` === key);
    
    if (index > -1) {
        existingArr.splice(index, 1);
        selectedPlants = new Set(existingArr);
        chipEl.classList.remove('selected');
    } else {
        selectedPlants.add({bedId, node, bIndex, pIndex});
        chipEl.classList.add('selected');
    }
    updateSelectedCountUI();
}

function updateSelectedCountUI() {
    document.getElementById('selectedCountValue').innerText = selectedPlants.size;
}

async function markSelectedAreaStatus(status) {
    if (selectedPlants.size === 0) return alert('কোনো গাছ নির্বাচন করা হয়নি!');
    
    const token = localStorage.getItem('farmer_jwt');
    const loadingBtn = document.querySelector(status === 'H' ? '.action-btn-sm.success' : '.action-btn-sm.danger');
    const originalText = loadingBtn.innerText;
    loadingBtn.innerText = 'সেভিং...';

    // Modify local data
    const bedsToUpdate = new Set();
    selectedPlants.forEach(sel => {
        farmData[sel.bIndex].plants_nodes_json[sel.pIndex].state = status;
        bedsToUpdate.add(sel.bIndex);
    });

    try {
        let allSuccess = true;
        for (let bIndex of Array.from(bedsToUpdate)) {
            const bed = farmData[bIndex];
            const resp = await fetch(`${API_BASE_URL}/api/crops/${cropId}/beds/${bed.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ plants_nodes_json: bed.plants_nodes_json })
            });
            if(!resp.ok) allSuccess = false;
        }

        if(!allSuccess) alert('কিছু ডাটা সেভ হতে সমস্যা হয়েছে।');

        // Reset Batch Mode
        toggleBatchMode(); 
    } catch(e) {
        alert('Server Error');
    } finally {
        loadingBtn.innerText = originalText;
    }
}

// ========================
// Bottom Sheet Logic (Single Profile)
// ========================
function openBottomSheet(bed, node, bIndex, pIndex) {
    currentlyEditingPlant = {bed, node, bIndex, pIndex};

    document.getElementById('bsPlantTitle').innerText = `গাছ: ${node.id}`;
    document.getElementById('bsPlantLocation').innerText = `বেড ${bIndex + 1}`;
    
    // Active toggles state
    const state = node.state || 'H';
    document.getElementById('btnSetHealthy').classList.remove('active');
    document.getElementById('btnSetSick').classList.remove('active');
    document.getElementById('btnSetCritical').classList.remove('active');
    if(state === 'H') document.getElementById('btnSetHealthy').classList.add('active');
    else if(state === 'S') document.getElementById('btnSetSick').classList.add('active');
    else if(state === 'C') document.getElementById('btnSetCritical').classList.add('active');

    // Prepare inputs
    document.getElementById('bsHeight').value = node.height || '';
    document.getElementById('bsFruits').value = node.fruits || '';
    document.getElementById('bsLeaves').value = node.leaf_count || '';
    document.getElementById('bsNote').value = node.disease || '';
    
    // Checkboxes
    const fChip = document.getElementById('bsFertilizerChip');
    const pChip = document.getElementById('bsPesticideChip');
    if(node.is_fertilized) fChip.classList.add('active'); else fChip.classList.remove('active');
    if(node.is_pesticide) pChip.classList.add('active'); else pChip.classList.remove('active');
    
    // Reset image / load latest image
    document.getElementById('bsImageInput').value = '';
    const imgPreview = document.getElementById('bsAvatarPreview');
    const rmvBtn = document.getElementById('bsAvatarRemove');
    imgPreview.dataset.base64 = '';
    
    // Find latest image_url from logs
    let latestImage = 'https://placehold.co/100x100?text=Plant';
    if(node.logs && node.logs.length > 0) {
        for(let i = node.logs.length - 1; i >= 0; i--) {
            if(node.logs[i].image_url) {
                latestImage = node.logs[i].image_url;
                break;
            }
        }
    }
    imgPreview.src = latestImage;
    if(latestImage !== 'https://placehold.co/100x100?text=Plant') {
        rmvBtn.style.display = 'flex';
    } else {
        rmvBtn.style.display = 'none';
    }

    populateTimeline(node.logs);

    // Reset bottom sheet view to 'form' tab by default
    const bsTabs = document.getElementById('plantBottomSheet').querySelectorAll('.ld-tab');
    if(bsTabs.length > 0) switchBsTab('form', bsTabs[0]);

    document.getElementById('plantBottomSheet').classList.add('active');
}

function closeBottomSheet() {
    document.getElementById('plantBottomSheet').classList.remove('active');
    currentlyEditingPlant = null;
}

window.switchBsTab = function(tabName, btnEl) {
    const sheet = document.getElementById('plantBottomSheet');
    sheet.querySelectorAll('.ld-tab').forEach(b => b.classList.remove('active'));
    if(btnEl) btnEl.classList.add('active');

    if(tabName === 'form') {
        document.getElementById('bsTabForm').style.display = 'block';
        document.getElementById('bsTabHistory').style.display = 'none';
    } else {
        document.getElementById('bsTabForm').style.display = 'none';
        document.getElementById('bsTabHistory').style.display = 'block';
    }
};

// Submits single plant state fast update (e.g. mark sick) and hides sheet
async function updatePlantStateSingle(status) {
    if(!currentlyEditingPlant) return;
    
    const {bed, node, bIndex, pIndex} = currentlyEditingPlant;
    node.state = status;
    farmData[bIndex].plants_nodes_json[pIndex] = node;

    // Immediately reflect
    closeBottomSheet();
    renderBeds();

    // Call Backend
    const token = localStorage.getItem('farmer_jwt');
    await fetch(`${API_BASE_URL}/api/crops/${cropId}/beds/${bed.id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ plants_nodes_json: bed.plants_nodes_json })
    });
}

// Canvas Image Compression
async function compressImageWebP(dataUrl, quality = 0.8, maxWidth = 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/webp', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// Avatar upload and preview
window.previewPlantAvatar = function(input) {
    const file = input.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const preview = document.getElementById('bsAvatarPreview');
            const compressedBase64 = await compressImageWebP(e.target.result, 0.8, 1024);
            preview.src = compressedBase64;
            preview.dataset.base64 = compressedBase64;
            document.getElementById('bsAvatarRemove').style.display = 'flex';
            
            // Auto Update Avatar to backend logic can be added here, currently handled during "savePlantDetails"
        };
        reader.readAsDataURL(file);
    }
};

window.removePlantAvatar = function(event) {
    event.stopPropagation();
    const preview = document.getElementById('bsAvatarPreview');
    preview.src = 'https://placehold.co/100x100?text=Plant';
    preview.dataset.base64 = '';
    document.getElementById('bsImageInput').value = '';
    document.getElementById('bsAvatarRemove').style.display = 'none';
};

async function uploadImageToR2(base64Data, filename) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/crops/${cropId}/upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('farmer_jwt')}` },
            body: JSON.stringify({ imageBase64: base64Data, filename: filename })
        });
        const data = await res.json();
        if(data.success && data.url) return data.url;
    } catch(e) {}
    // Fallback static URL or mock
    return `https://pub-mock-cloud.r2.dev/plants/${cropId}/${filename}.jpg`;
}

// Full Agronomy Details Save for a single plant
window.savePlantDetails = function(event) {
    const btn = event ? event.target : document.getElementById('bsSaveBtn');
    showConfirmModal('আপডেট নিশ্চিত করুন', 'আপনি কি গাছের এই তথ্যগুলো সেভ করতে চান?', () => executeSavePlantDetails(btn));
};

async function executeSavePlantDetails(btn) {
    if(!currentlyEditingPlant) return;
    const {bed, node, bIndex, pIndex} = currentlyEditingPlant;
    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = 'সেভ হচ্ছে...';
    btn.disabled = true;

    try {
        node.height = document.getElementById('bsHeight').value;
        node.fruits = document.getElementById('bsFruits').value;
        node.leaf_count = document.getElementById('bsLeaves').value;
        
        const noteText = document.getElementById('bsNote').value;
        node.disease = noteText;
        
        node.is_fertilized = document.getElementById('bsFertilizerChip').classList.contains('active');
        node.is_pesticide = document.getElementById('bsPesticideChip').classList.contains('active');

        if (document.getElementById('btnSetCritical').classList.contains('active')) node.state = 'C';
        else if (document.getElementById('btnSetSick').classList.contains('active')) node.state = 'S';
        else if (document.getElementById('btnSetHealthy').classList.contains('active')) node.state = 'H';

        // Handle Image Upload
        let imageUrl = '';
        const preview = document.getElementById('bsAvatarPreview');
        if (preview.dataset.base64 && preview.dataset.base64 !== '') {
            const timestamp = new Date().getTime();
            const fname = `b${bIndex}_t${pIndex}_${timestamp}`;
            imageUrl = await uploadImageToR2(preview.dataset.base64, fname);
        } else if (preview.src.includes('placehold.co')) {
            imageUrl = ''; // User deleted image
        } else {
            imageUrl = preview.src; // Unchanged image
        }

        // Add entry to logs
        if(!node.logs) node.logs = [];
        node.logs.push({
            date: new Date().toLocaleDateString('bn-BD'),
            height: node.height,
            fruits: node.fruits,
            leaves: node.leaf_count,
            note: noteText || 'Status Updated',
            is_fertilized: node.is_fertilized,
            is_pesticide: node.is_pesticide,
            image_url: imageUrl
        });

        farmData[bIndex].plants_nodes_json[pIndex] = node;

        const token = localStorage.getItem('farmer_jwt');
        const resp = await fetch(`${API_BASE_URL}/api/crops/${cropId}/beds/${bed.id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ plants_nodes_json: bed.plants_nodes_json })
        });

        if (resp.ok) {
            btn.innerHTML = 'আপডেট সেভ করুন';
            btn.disabled = false;
            closeBottomSheet();
            renderBeds();
            if (typeof showToast === 'function') showToast('সফলভাবে ডাটা সেভ হয়েছে!');
        } else {
            btn.innerHTML = 'আপডেট সেভ করুন';
            btn.disabled = false;
            if (typeof showToast === 'function') showToast('ডাটা সেভ হতে সমস্যা হয়েছে!');
            else alert('Data save failed');
        }
    } catch (err) {
        console.error('Error saving details:', err);
        btn.innerHTML = 'আপডেট সেভ করুন';
        btn.disabled = false;
        if (typeof showToast === 'function') showToast('নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।');
        else alert('Network error while saving');
    }
}

function populateTimeline(logs) {
    const container = document.getElementById('bsTimelineContainer');
    if (!logs || logs.length === 0) {
        container.innerHTML = '<div class="timeline-empty">এখনো কোনো ডাটা আপডেট করা হয়নি।</div>';
        return;
    }

    // Mock visual timeline
    let html = '';
    [...logs].reverse().forEach((log, i) => {
        const actualIndex = logs.length - 1 - i;
        html += `
        <div style="position:relative; padding-left:14px; margin-bottom:12px; border-left:1px solid var(--border-color);">
            <div style="position:absolute; left:-6px; top:0; width:10px; height:10px; border-radius:50%; background:var(--primary);"></div>
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <p style="font-size:12px; color:var(--text-dim); margin:0;">${log.date}</p>
                    <button onclick="deletePlantLog(${actualIndex})" style="border:none; background:transparent; color:#ef4444; cursor:pointer; font-size:12px; padding:0;">ডিলিট</button>
                </div>
                <div style="background:#f1f5f9; padding:8px; border-radius:6px; margin-top:5px; border:1px solid #e2e8f0;">
                    ${log.image_url ? `<img src="${log.image_url}" onclick="openFullScreenImage('${log.image_url}')" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin-bottom:6px; cursor:pointer;">` : ''}
                    <p style="font-size:13px; margin:0; font-weight:500;">${log.note}</p>
                    <p style="font-size:12px; margin:0; margin-top:4px; opacity:0.8;">
                        ${log.height ? `<b>উচ্চতা:</b> ${log.height}" ` : ''}
                        ${log.leaves ? `<b>পাতা:</b> ${log.leaves} ` : ''}
                        ${log.fruits ? `<b>ফল:</b> ${log.fruits}` : ''}
                    </p>
                    ${(log.is_fertilized || log.is_pesticide) ? `
                    <div style="display:flex; gap:5px; margin-top:6px;">
                        ${log.is_fertilized ? '<span style="font-size:10px; background:#d1fae5; color:#10b981; padding:2px 6px; border-radius:4px;">সার</span>' : ''}
                        ${log.is_pesticide ? '<span style="font-size:10px; background:#e0f2fe; color:#0284c7; padding:2px 6px; border-radius:4px;">ওষুধ</span>' : ''}
                    </div>` : ''}
                </div>
            </div>
        </div>
        `;
    });
    container.innerHTML = html;
}

window.deletePlantLog = function(logIndex) {
    if(!currentlyEditingPlant) return;
    showConfirmModal('হিস্ট্রি মুছুন', 'আপনি কি এই গাছের আপডেটটি মুছে ফেলতে চান?', () => executeDeletePlantLog(logIndex));
};

async function executeDeletePlantLog(logIndex) {
    let {bed, node, bIndex, pIndex} = currentlyEditingPlant;
    node.logs.splice(logIndex, 1);
    
    // Call Backend
    const token = localStorage.getItem('farmer_jwt');
    try {
        await fetch(`${API_BASE_URL}/api/crops/${cropId}/beds/${bed.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ plants_nodes_json: bed.plants_nodes_json })
        });
        
        // Re-render
        populateTimeline(node.logs);
        renderBeds();
    } catch(e) {
        console.error("Failed to delete log", e);
        alert('কোথাও সমস্যা হচ্ছে, আবার চেষ্টা করুন।');
    }
}

window.openFullScreenImage = function(src) {
    const modal = document.getElementById('fullImageModal');
    const view = document.getElementById('fullImageView');
    if (modal && view) {
        view.src = src;
        modal.style.display = 'flex';
    }
};

// ========================
// Grid Setup Editor Logic
// ========================
window.openGridSetupModal = function() {
    const list = document.getElementById('gridSetupBedList');
    list.innerHTML = '';
    
    farmData.forEach((bed, bIndex) => {
        const row = document.createElement('div');
        row.className = 'bed-editor-row';
        const numPlants = bed.plants_nodes_json ? bed.plants_nodes_json.length : 0;
        
        row.innerHTML = `
            <div>
                <strong style="font-size:14px; display:block;">বেড ${bIndex + 1}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <button onclick="changeBedPlants(${bIndex}, -1)" style="width:30px;height:30px;border-radius:50%;border:1px solid #ccc;background:#f8fafc;cursor:pointer;">-</button>
                <span id="bedSetupCount_${bIndex}" style="font-weight:bold; min-width:24px; text-align:center; font-size:16px;">${numPlants}</span>
                <button onclick="changeBedPlants(${bIndex}, 1)" style="width:30px;height:30px;border-radius:50%;border:1px solid #ccc;background:#f8fafc;cursor:pointer;">+</button>
                <button class="del-btn" style="margin-left:5px;width:30px;height:30px;border-radius:50%;border:none;background:#fef2f2;color:#ef4444;font-size:18px;cursor:pointer;line-height:1;" onclick="removeBedFromGrid(${bIndex})">&times;</button>
            </div>
        `;
        list.appendChild(row);
    });
    
    document.getElementById('gridSetupModal').classList.add('active');
};

window.closeGridSetupModal = function() {
    document.getElementById('gridSetupModal').classList.remove('active');
};

window.changeBedPlants = function(bIndex, change) {
    const bed = farmData[bIndex];
    let arr = bed.plants_nodes_json || [];
    let currentLen = arr.length;
    let newLen = currentLen + change;
    if(newLen < 0) newLen = 0;
    
    if (change > 0) {
        // Add plant
        arr.push({
            id: `B${bIndex+1}-T${newLen}`,
            state: 'H',
            logs: []
        });
    } else if (change < 0 && currentLen > 0) {
        // Here we could add logic to delete images from R2 if we removed a plant:
        // const removed = arr.pop();
        // if(removed.logs) removed.logs.forEach(l => { if(l.image_url) { /* delete remote */ }});
        arr.pop();
    }
    
    bed.plants_nodes_json = arr;
    document.getElementById(`bedSetupCount_${bIndex}`).innerText = arr.length;
};

window.addNewBedToGrid = function() {
    farmData.push({
        id: `mock-bed-${Date.now()}`, // Temporary ID until saved to true backend map endpoint 
        bed_index: farmData.length,
        plants_nodes_json: []
    });
    openGridSetupModal(); // redraw
};

window.removeBedFromGrid = function(bIndex) {
    showConfirmModal('বেড মুছুন', 'এই বেড এবং এর ভেতরের সব গাছের ডাটা ও ছবি ডিলিট হয়ে যাবে। নিশ্চিত?', () => {
        farmData.splice(bIndex, 1);
        openGridSetupModal(); 
    });
};

window.saveGridSetupChanges = function(event) {
    const btn = event ? event.target : document.querySelector('.sheet-close-btn');
    showConfirmModal('লেআউট সেভ করুন', 'ম্যাপ লেআউটের নতুন সেটআপ সেভ করতে চান?', () => executeGridSetupChanges(btn));
};

async function executeGridSetupChanges(btn) {
    btn.innerHTML = 'সেভিং...';
    try {
        const token = localStorage.getItem('farmer_jwt');
        const reqBody = { beds: farmData };
        const res = await fetch(`${API_BASE_URL}/api/crops/${cropId}/beds-sync`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(reqBody)
        });
        const data = await res.json();
        
        if (data.success) {
            btn.innerHTML = 'সেভ করুন';
            closeGridSetupModal();
            // Re-fetch beds so we don't end up with mock IDs:
            initApp(); 
        } else {
            alert('Error: ' + data.message);
            btn.innerHTML = 'সেভ করুন';
        }
    } catch(e) {
        alert('নেটওয়ার্ক সমস্যা: ' + e.message);
        console.error('Save error:', e);
        btn.innerHTML = 'সেভ করুন';
    }
};

// ========================
// Detailed Batch Updates
// ========================
window.openBatchUpdateModal = function() {
    if (selectedPlants.size === 0) return alert('কোনো গাছ নির্বাচন করা হয়নি!');
    
    document.getElementById('batchModalCount').innerText = selectedPlants.size;
    document.getElementById('batchLeaves').value = '';
    document.getElementById('batchFruits').value = '';
    document.getElementById('batchNote').value = '';
    document.getElementById('batchFertilizerChip').classList.remove('active');
    document.getElementById('batchPesticideChip').classList.remove('active');
    
    document.getElementById('batchUpdateModal').classList.add('active');
};

window.closeBatchUpdateModal = function() {
    document.getElementById('batchUpdateModal').classList.remove('active');
};

window.saveBatchUpdateDetails = async function() {
    const fertActive = document.getElementById('batchFertilizerChip').classList.contains('active');
    const pestActive = document.getElementById('batchPesticideChip').classList.contains('active');
    const bLeaves = document.getElementById('batchLeaves').value;
    const bFruits = document.getElementById('batchFruits').value;
    const bNote = document.getElementById('batchNote').value;
    
    const loadingBtn = event.target;
    loadingBtn.innerHTML = 'সেভিং...';
    
    const bedsToUpdate = new Set();
    const dt = new Date().toLocaleDateString('bn-BD');

    selectedPlants.forEach(sel => {
        let node = farmData[sel.bIndex].plants_nodes_json[sel.pIndex];
        
        if(bLeaves) node.leaf_count = bLeaves;
        if(bFruits) node.fruits = bFruits;
        node.is_fertilized = fertActive;
        node.is_pesticide = pestActive;
        
        if (bNote.trim() !== '') node.disease = bNote;
        
        if(!node.logs) node.logs = [];
        node.logs.push({
            date: dt,
            leaves: bLeaves || node.leaf_count,
            fruits: bFruits || node.fruits,
            note: bNote || 'Batch Updated',
            is_fertilized: fertActive,
            is_pesticide: pestActive
        });

        bedsToUpdate.add(sel.bIndex);
    });

    const token = localStorage.getItem('farmer_jwt');
    let allSuccess = true;
    for (let bIndex of Array.from(bedsToUpdate)) {
        const bed = farmData[bIndex];
        const resp = await fetch(`${API_BASE_URL}/api/crops/${cropId}/beds/${bed.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ plants_nodes_json: bed.plants_nodes_json })
        });
        if(!resp.ok) allSuccess = false;
    }

    loadingBtn.innerHTML = 'আপডেট করুন';
    closeBatchUpdateModal();

    if(!allSuccess) alert('কিছু ডাটা সেভ হতে সমস্যা হয়েছে।');
    else toggleBatchMode(); 
};

// ========================
// Global Confirmation Modal Logic
// ========================
let currentConfirmCallback = null;

window.showConfirmModal = function(title, text, callback) {
    document.getElementById('confirmActionTitle').innerText = title || 'নিশ্চিত করুন';
    document.getElementById('confirmActionText').innerText = text || 'আপনি কি এই কাজটি করতে চান?';
    currentConfirmCallback = callback;
    document.getElementById('confirmActionModal').classList.add('active');
};

window.closeConfirmModal = function() {
    document.getElementById('confirmActionModal').classList.remove('active');
    currentConfirmCallback = null;
};

document.getElementById('confirmActionBtn').addEventListener('click', function() {
    const cb = currentConfirmCallback;
    closeConfirmModal();
    if(cb) {
        cb();
    }
});
