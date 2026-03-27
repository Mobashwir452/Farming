// crop_doctor.js
import { registerComponents } from './components.js';

registerComponents();

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const stateLanding = document.getElementById('state-landing');
    const stateScanning = document.getElementById('state-scanning');
    const stateResult = document.getElementById('state-result');
    const tabHistory = document.getElementById('tab-history');

    // Tab Navigation Binding
    window.switchDoctorTab = function(tabId, btn) {
        document.querySelectorAll('.cd-tab-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        
        stateLanding.style.display = tabId === 'scanner' ? 'block' : 'none';
        tabHistory.style.display = tabId === 'history' ? 'block' : 'none';

        if(tabId === 'history') {
            stateResult.style.display = 'none';
            stateScanning.style.display = 'none';
        }
        
        // Tab Persistence logic
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.replaceState({}, '', url);
    };

    const btnOpenCamera = document.getElementById('btn-open-camera');
    const btnOpenGallery = document.getElementById('btn-open-gallery');
    const fileUpload = document.getElementById('file-upload');
    const btnScanAgain = document.getElementById('btn-scan-again');

    const scannedImage = document.getElementById('scanned-image');
    const resultImage = document.getElementById('result-image');

    // Default mock image for demo purposes
    const MOCK_IMAGE_URL = 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';

    // Compression Helper
    async function compressImageWebP(dataUrl, quality = 0.6, maxWidth = 1024) {
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
            img.onerror = () => resolve(dataUrl); // fallback
            // Handle cross-origin if needed (though local files won't have cors issues)
            img.crossOrigin = "anonymous";
            img.src = dataUrl;
        });
    }

    async function loadUserFarms() {
        const token = localStorage.getItem('farmer_jwt');
        if (!token) return;

        const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
        try {
            const response = await fetch(`${BASE_URL}/api/farms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success && data.farms) {
                const selectElement = document.getElementById('land-select');
                selectElement.innerHTML = '<option value="">জমি নির্বাচন করুন (ঐচ্ছিক)</option>';
                const urlParams = new URLSearchParams(window.location.search);
                const preSelectedFarmId = urlParams.get('farm_id');

                data.farms.forEach(farm => {
                    const farmName = farm.name;
                    const cropName = farm.crop_name || 'ফসল নেই';
                    const option = document.createElement('option');
                    option.value = farm.id;
                    option.textContent = `${farmName} (${cropName})`;
                    if (preSelectedFarmId && preSelectedFarmId == farm.id) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            }
        } catch (e) {
            console.error('Failed to load farms dynamically', e);
        }
    }
    
    // Call on load
    loadUserFarms();
    loadRecentScans(); // Load in background

    // Initial Tab Persistence Route Checking
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');
    const tabBtns = document.querySelectorAll('.cd-tab-btn');
    if (activeTab === 'history' && tabBtns.length > 1) {
        switchDoctorTab('history', tabBtns[1]);
    } else if (tabBtns.length > 0) {
        switchDoctorTab('scanner', tabBtns[0]);
    }

    async function loadRecentScans() {
        const token = localStorage.getItem('farmer_jwt');
        if (!token) return;

        const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
        try {
            const response = await fetch(`${BASE_URL}/api/public/crop-scans?limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success && data.scans && data.scans.length > 0) {
                document.getElementById('recent-scans-container').style.display = 'block';
                const scansList = document.getElementById('recent-scans-list');
                scansList.innerHTML = '';
                
                data.scans.forEach(scan => {
                    let imgSrc = scan.image_url;
                    if (imgSrc && imgSrc.startsWith('crop-scans/')) {
                        imgSrc = `${BASE_URL}/api/public/images/${imgSrc.split('/')[1]}`;
                    } else if (!imgSrc || imgSrc === 'expired_removed') {
                        imgSrc = 'https://placehold.co/100x100?text=Expired';
                    } else if (imgSrc.length > 200) {
                        imgSrc = imgSrc;
                    }

                    const badgeColor = scan.confidence_score > 60 ? 'var(--success)' : 'var(--danger)';
                    const scanDate = new Date(scan.created_at).toLocaleDateString('bn-BD');
                    const jsonStr = scan.scan_result_json || '{}';
                    
                    const card = document.createElement('div');
                    card.style.cssText = 'border-radius: 12px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid var(--border-color); cursor: pointer; display: flex; flex-direction: column;';
                    card.onclick = () => window.viewResultDetails(jsonStr, imgSrc, scanDate);

                    card.innerHTML = `
                        <img src="${imgSrc}" style="width: 100%; aspect-ratio: 1; object-fit: cover;">
                        <div style="padding: 10px; display: flex; flex-direction: column; justify-content: space-between; flex-grow: 1;">
                            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: var(--text-dark); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${scan.disease_name_bn || 'ফলাফল নেই'}</h4>
                            <div style="font-size: 11px; color: var(--text-muted); display:flex; justify-content:space-between; margin-top: auto; padding-top: 8px;">
                                <span>${scanDate}</span>
                                <span style="color: ${badgeColor}; font-weight: 600;">${Math.round(scan.confidence_score)}%</span>
                            </div>
                        </div>
                    `;
                    scansList.appendChild(card);
                });
            } else {
                document.getElementById('recent-scans-list').innerHTML = '<p style="text-align:center; width: 100%; color:var(--text-muted); padding: 24px; grid-column: 1 / -1;">কোনো হিস্ট্রি পাওয়া যায়নি</p>';
            }
        } catch (e) {
            console.error('Failed to load recent scans', e);
        }
    }

    // State Management
    function switchState(stateId) {
        stateLanding.style.display = 'none';
        stateScanning.style.display = 'none';
        stateResult.style.display = 'none';

        document.getElementById(stateId).style.display = 'flex';
    }

    async function startScan(imageUrl, compressedUrl = null) {
        // Set images
        scannedImage.src = imageUrl;
        resultImage.src = imageUrl;

        // Switch to scanning state
        switchState('state-scanning');

        // Capture land selection
        const landSelect = document.getElementById('land-select');
        const selectedLandText = landSelect.options[landSelect.selectedIndex].text;
        const selectedLandValue = landSelect.value;
        const token = localStorage.getItem('farmer_jwt');
        const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';

        try {
            const response = await fetch(`${BASE_URL}/api/public/crop-scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    imageBase64: imageUrl,
                    compressedBase64: compressedUrl || imageUrl,
                    farmId: selectedLandValue || null
                })
            });

            const res = await response.json();
            if(!res.success) {
                switchState('state-landing');
                window.showToast?.(res.error || 'স্ক্যান করতে সমস্যা হয়েছে', 'error');
                return;
            }

            const data = res.data; // The returned XML parsed object
            
            // Map to UI elements
            const badge = document.getElementById('result-badge');
            if(data.status === 'disease_detected') {
                badge.className = 'badge danger';
                badge.textContent = 'রোগ শনাক্ত হয়েছে';
            } else if(data.status === 'healthy') {
                badge.className = 'badge success';
                badge.textContent = 'সুস্থ ফসল';
            } else {
                badge.className = 'badge warning';
                badge.textContent = 'অজ্ঞাত ফসল';
            }

            document.getElementById('result-disease-bn').textContent = data.disease_name_bn || 'অজানা';
            document.getElementById('result-disease-en').textContent = data.disease_name_en || '';
            
            document.getElementById('result-confidence-text').textContent = data.confidence_score + '%';
            document.getElementById('result-confidence-fill').style.width = data.confidence_score + '%';

            // Lists
            const symptomsList = document.getElementById('result-symptoms');
            symptomsList.innerHTML = '';
            if(data.symptoms) {
                data.symptoms.split('-').forEach(s => {
                    let text = s.trim();
                    if(text) {
                        const li = document.createElement('li');
                        li.textContent = text.replace(/^[*\-]\s*/, '');
                        symptomsList.appendChild(li);
                    }
                });
            }

            // Helper to format solutions into lists
            function formatList(text, elementId) {
                const list = document.getElementById(elementId);
                list.innerHTML = '';
                if (!text) {
                    list.innerHTML = '<li>কোনো তথ্য নেই</li>';
                    return;
                }
                // Split by newline or hyphen list marks
                const items = text.split(/\n|- /).map(s => s.trim()).filter(s => s.length > 0 && s !== '-');
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    list.appendChild(li);
                });
            }

            formatList(data.organic_solution, 'result-organic');
            formatList(data.chemical_solution, 'result-chemical');
            
            if(data.prevention) {
                document.getElementById('prevention-card').style.display = 'block';
                formatList(data.prevention, 'result-prevention');
            } else {
                document.getElementById('prevention-card').style.display = 'none';
            }

            switchState('state-result');
            window.showToast?.('স্ক্যান সফল হয়েছে', 'success');

        } catch (error) {
            switchState('state-landing');
            window.showToast?.('নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন।', 'error');
        }
    }

    // Event Listeners
    btnOpenCamera.addEventListener('click', async () => {
        // In a real app, this would use the MediaDevices API to open the camera stream
        showToast('ক্যামেরা চালু করা হচ্ছে...', 'info');
        setTimeout(async () => {
            // Using a mock image. In real flow, get blob from camera stream.
            startScan(MOCK_IMAGE_URL, MOCK_IMAGE_URL);
        }, 500);
    });

    btnOpenGallery.addEventListener('click', () => {
        fileUpload.click();
    });

    fileUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            switchState('state-scanning'); // Immediate UI feedback while compressing
            const stateH3 = document.querySelector('#state-scanning h3');
            if(stateH3) stateH3.textContent = 'প্রসেসিং করা হচ্ছে...';
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                const originalBase64 = event.target.result;
                // Show preview immediately before heavy compression starts
                scannedImage.src = originalBase64;

                // Let the UI paint the image before blocking with canvas
                setTimeout(async () => {
                    const compressedWebP = await compressImageWebP(originalBase64, 0.65, 1200);
                    if(stateH3) stateH3.textContent = 'ছবি বিশ্লেষণ করা হচ্ছে...';
                    startScan(originalBase64, compressedWebP);
                }, 50);
            };
            reader.readAsDataURL(file);
        }
    });

    btnScanAgain.addEventListener('click', () => {
        // Reset file input
        fileUpload.value = '';
        switchState('state-landing');
        const cdTabs = document.getElementById('cd-tabs');
        if(cdTabs) cdTabs.style.display = 'flex';
        loadRecentScans();
    });

    // Modal Details Setup
    window.closeAdminModal = function(id) {
        document.getElementById(id).classList.remove('active');
    };

    window.viewResultDetails = function(jsonStr, imgSrc, dDate) {
        try {
            const rd = JSON.parse(jsonStr);
            const badgeColor = rd.confidence_score > 60 ? '#10b981' : '#ef4444';
            
            const formatStringToList = (text) => {
                if (!text) return '';
                const items = text.split(/\n|- /).map(s => s.trim()).filter(s => s.length > 0 && s !== '-');
                if (items.length === 0) return '';
                return `<ul style="margin: 8px 0 0 0; padding-left: 20px; color: #334155;">` +
                       items.map(item => `<li style="margin-bottom: 4px;">${item.replace(/^[*\-]\s*/, '')}</li>`).join('') +
                       `</ul>`;
            };

            const html = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <!-- Left Preview -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; background: #fff; padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <img src="${imgSrc}" style="width: 100%; height: 200px; border-radius: 8px; border: 1px solid #cbd5e1; object-fit: cover;">
                    </div>
                    
                    <!-- Details Matrix -->
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                            <div>
                                <h3 style="margin:0 0 4px 0; font-size: 16px; color: #0f172a; font-weight: 700;">${rd.disease_name_bn || 'অজানা রোগ'}</h3>
                                <div style="margin-top: 6px; font-size: 12px; color: var(--text-muted);">${dDate}</div>
                            </div>
                            <div style="background: ${badgeColor}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; white-space: nowrap;">
                                নিশ্চয়তা: ${rd.confidence_score || 0}%
                            </div>
                        </div>
                        
                        <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                            ${rd.symptoms ? `<div style="margin-bottom: 12px; padding: 10px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px;"><strong>লক্ষণসমূহ:</strong>${formatStringToList(rd.symptoms)}</div>` : ''}
                            ${rd.organic_solution ? `<div style="margin-bottom: 12px; padding: 10px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px;"><strong>জৈব সমাধান:</strong>${formatStringToList(rd.organic_solution)}</div>` : ''}
                            ${rd.chemical_solution ? `<div style="margin-bottom: 12px; padding: 10px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 4px;"><strong>রাসায়নিক সমাধান:</strong>${formatStringToList(rd.chemical_solution)}</div>` : ''}
                            ${rd.prevention ? `<div style="margin-bottom: 12px; padding: 10px; background: #f0f9ff; border-left: 3px solid #0284c7; border-radius: 4px;"><strong>প্রতিকার:</strong>${formatStringToList(rd.prevention)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('historyDetailsBody').innerHTML = html;
            document.getElementById('historyDetailsModal').classList.add('active');
        } catch(e) {
            console.error("View modal err:", e);
            alert("No valid properties available mapping context");
        }
    };
});
