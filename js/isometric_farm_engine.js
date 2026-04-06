// ==========================================
// 2.5D Isometric HTML/CSS Engine
// Replaces Three.js for better performance while preserving 3D aesthetics
// ==========================================

const API_BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
let farmData = null;
let currentCropId = new URLSearchParams(window.location.search).get('crop_id');
let SCALE = 24; // 1 unit distance = 24px
let isEditMode = false;

document.addEventListener('DOMContentLoaded', () => {
    initIsometricGrid();
});

// Touch/Mouse Pan functionality for the viewport
const viewport = document.querySelector('.iso-viewport');
const wrapper = document.getElementById('isoWrapper');
let isPanning = false;
let startX, startY;
let scrollLeft, scrollTop;

viewport.addEventListener('mousedown', (e) => {
    // Only pan if clicking on empty space, not on a plant orb
    if(e.target.classList.contains('plant-orb') || e.target.closest('.plant-sidebar') || e.target.closest('.floating-edit-btn')) return;
    
    isPanning = true;
    startX = e.pageX - viewport.offsetLeft;
    startY = e.pageY - viewport.offsetTop;
    scrollLeft = viewport.scrollLeft;
    scrollTop = viewport.scrollTop;
});

viewport.addEventListener('mouseleave', () => { isPanning = false; });
viewport.addEventListener('mouseup', () => { isPanning = false; });
viewport.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const x = e.pageX - viewport.offsetLeft;
    const y = e.pageY - viewport.offsetTop;
    const walkX = (x - startX) * 1.5; 
    const walkY = (y - startY) * 1.5;
    viewport.scrollLeft = scrollLeft - walkX;
    viewport.scrollTop = scrollTop - walkY;
});


async function initIsometricGrid() {
    if (!currentCropId) {
        alert("Crop ID missing!");
        return;
    }

    try {
        const token = localStorage.getItem('farmer_jwt');
        const response = await fetch(`${API_BASE_URL}/api/crops/${currentCropId}/plants`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.success && data.beds && data.beds.length > 0) {
            farmData = data.beds;
            renderIsometricFarm();
        } else {
            document.getElementById('isometric-farm-grid').innerHTML = '<div style="color:red; margin-top:20px; font-weight:bold;">No Farm Grid Found. Please Generate Map First.</div>';
        }
    } catch (error) {
        console.error("Error fetching map:", error);
    }
}

function renderIsometricFarm() {
    const gridContainer = document.getElementById('isometric-farm-grid');
    gridContainer.innerHTML = '';
    
    // Layout variables
    let currentXOffset = 0; // placing beds horizontally side-by-side
    const bedMargin = 2 * SCALE; // margin between beds

    farmData.forEach((bed, bIndex) => {
        const bedWidthPx = (bed.width || 4) * SCALE;
        const bedLengthPx = (bed.length || 12) * SCALE;

        // Create Bed Soil Element
        const bedEl = document.createElement('div');
        bedEl.className = 'bed-soil';
        bedEl.style.width = `${bedWidthPx}px`;
        bedEl.style.height = `${bedLengthPx}px`;
        // We offset it in CSS. For iso grids, X goes right-down, Y goes right-up.
        bedEl.style.left = `${currentXOffset}px`;
        bedEl.style.top = `0px`;
        
        bedEl.dataset.bedIndex = bIndex;
        bedEl.dataset.bedId = bed.id;

        // Optionally click empty bed space in Edit Mode to add tree
        bedEl.addEventListener('click', (e) => {
            if (isEditMode && e.target === bedEl) {
                // Determine click local position relative to bed center
                const rect = bedEl.getBoundingClientRect();
                // Because of transform rotate, getting exact logical dx/dz requires reverse matrix
                // For simplicity, we just add a node at the center as default, user can drag later if needed.
                addNewTree(bIndex);
            }
        });

        // Add Plants
        let nodesStr = bed.plants_nodes_json;
        if(typeof nodesStr === 'string') nodesStr = JSON.parse(nodesStr);
        const nodes = nodesStr || [];

        nodes.forEach((node, pIndex) => {
            // Support backward compatibility
            const nodeX = node.x ?? ((node.row || 1) - 1.5) * (bed.width / 3);
            const nodeZ = node.z ?? ((node.col || pIndex + 1) - 5) * 2.0;

            const plantOrb = document.createElement('div');
            plantOrb.className = `plant-orb health-${(node.state || 'H').toLowerCase()}`;
            plantOrb.innerText = node.id.split('-')[1]; // T1, T2 etc

            // Convert logical coordinates (-width/2 to +width/2) to CSS pixels (0 to width)
            // Note: node.x is along width, node.z is along length
            const cssLeft = (nodeX + (bed.width / 2)) * SCALE;
            const cssTop = (nodeZ + (bed.length / 2)) * SCALE;

            // Centering orb (orb is 24x24)
            plantOrb.style.left = `calc(${cssLeft}px - 12px)`;
            plantOrb.style.top = `calc(${cssTop}px - 12px)`;

            plantOrb.addEventListener('click', (e) => {
                e.stopPropagation();
                if(isEditMode) {
                    if(confirm(`আপনি কি ${node.id} গাছটি মুছে ফেলতে চান?`)) {
                        deleteTreeDirectly(bIndex, pIndex);
                    }
                } else {
                    window.openPlantSidebar({
                        bedId: bed.id,
                        plantId: node.id,
                        state: node.state || 'H',
                        location: `Bed ${bIndex + 1} | X: ${nodeX.toFixed(1)}, Z: ${nodeZ.toFixed(1)}`
                    });
                }
            });

            bedEl.appendChild(plantOrb);
        });

        gridContainer.appendChild(bedEl);
        currentXOffset += bedWidthPx + bedMargin;
    });

    // Center viewport on the grid
    const totalWidth = currentXOffset;
    const totalHeight = (farmData[0].length || 12) * SCALE;
    gridContainer.style.width = `${totalWidth}px`;
    gridContainer.style.height = `${totalHeight}px`;

    // Wait a bit to scroll
    setTimeout(() => {
        viewport.scrollLeft = (wrapper.offsetWidth - viewport.offsetWidth) / 2;
        viewport.scrollTop = (wrapper.offsetHeight - viewport.offsetHeight) / 2;
        
        // Hide loading overlay
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 100);
}

// ==== Edit Mode ====
function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('toggleEditModeBtn');
    
    if (isEditMode) {
        btn.classList.add('active');
        btn.innerHTML = '💾 সম্পাদনা শেষ করুন (Save)';
        document.body.style.cursor = 'crosshair';
        closePlantSidebar(); // ensure sidebar is closed
        alert('এডিট মোড চালু হয়েছে।\n- নতুন গাছ বসাতে বেডের ফাঁকা স্থানে ক্লিক করুন।\n- গাছ মুছতে যেকোনো গাছের উপর ক্লিক করুন।');
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '✏️ এডিট ম্যাপ';
        document.body.style.cursor = 'default';
        saveGridChangesToDB();
    }
}

function addNewTree(bIndex) {
    const bed = farmData[bIndex];
    let nodes = typeof bed.plants_nodes_json === 'string' ? JSON.parse(bed.plants_nodes_json) : bed.plants_nodes_json;
    if(!nodes) nodes = [];

    const newCounter = nodes.length + 1;
    const newNode = {
        id: `B${bIndex+1}-T${newCounter}`,
        x: 0, // spawn at center for now
        z: 0,
        row: 1, 
        col: newCounter,
        state: 'H'
    };

    nodes.push(newNode);
    bed.plants_nodes_json = nodes;
    renderIsometricFarm();
}

function deleteTreeDirectly(bIndex, pIndex) {
    const bed = farmData[bIndex];
    let nodes = typeof bed.plants_nodes_json === 'string' ? JSON.parse(bed.plants_nodes_json) : bed.plants_nodes_json;
    if(nodes) {
        nodes.splice(pIndex, 1);
        bed.plants_nodes_json = nodes;
        renderIsometricFarm();
    }
}

async function saveGridChangesToDB() {
    const btn = document.getElementById('toggleEditModeBtn');
    btn.innerHTML = 'Saving...';
    
    try {
        let allSuccess = true;
        const token = localStorage.getItem('farmer_jwt');
        for (let bed of farmData) {
            const bodyData = { plants_nodes_json: bed.plants_nodes_json };
            const resp = await fetch(`${API_BASE_URL}/api/crops/beds/${bed.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(bodyData)
            });
            if(!resp.ok) allSuccess = false;
        }

        if(allSuccess) {
            btn.innerHTML = '✏️ এডিট ম্যাপ';
        } else {
            alert('কিছু পরিবর্তন সেভ হতে সমস্যা হয়েছে।');
            btn.innerHTML = '✏️ এডিট ম্যাপ';
        }
    } catch(e) {
        alert('Server connection error.');
        btn.innerHTML = '✏️ এডিট ম্যাপ';
    }
}
