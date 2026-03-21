import { API_URL } from './auth.js';

window.triggerPhotoUpload = function (element) {
    let input = document.getElementById('cropImageInput');
    if (!input) {
        input = document.createElement('input');
        document.body.appendChild(input);
        input.type = 'file';
        input.id = 'cropImageInput';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.style.display = 'none';

        input.onchange = function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const MAX_DIM = 800;
                    if (width > height) {
                        if (width > MAX_DIM) {
                            height *= MAX_DIM / width;
                            width = MAX_DIM;
                        }
                    } else {
                        if (height > MAX_DIM) {
                            width *= MAX_DIM / height;
                            height = MAX_DIM;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/webp', 0.7);
                    sessionStorage.setItem('pendingCropImage', dataUrl);

                    element.innerHTML = `
                        <div style="width: 100%; height: 120px; border-radius: 8px; overflow: hidden; position: relative;">
                            <img src="${dataUrl}" alt="Uploaded photo" style="width: 100%; height: 100%; object-fit: cover;">
                            <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; justify-content: center; align-items: center; cursor: pointer; font-size: 12px; font-weight: bold;" onclick="removePhoto(event, this.parentElement.parentElement)">✕</div>
                        </div>
                    `;
                    element.style.padding = '8px';
                }
                img.src = event.target.result;
            }
            reader.readAsDataURL(file);
        };
    }
    input.click();
}

window.removePhoto = function (event, wrapper) {
    event.stopPropagation();
    sessionStorage.removeItem('pendingCropImage');
    wrapper.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; color: var(--primary);">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <p style="font-size: 15px; font-weight: 600; margin-bottom: 4px; color: var(--text-main);">ক্যামেরা দিয়ে ছবি তুলুন</p>
        <p style="font-size: 13px;">অথবা গ্যালারি থেকে সিলেক্ট করুন</p>
    `;
    wrapper.style.padding = '32px 20px';
    const input = document.getElementById('cropImageInput');
    if (input) input.value = '';
}

window.openMethodSheet = function (e) {
    if (e) e.preventDefault();
    // Assuming validateInputs and activeSuggestIndex are defined elsewhere or will be added.
    // if (!validateInputs()) return; 
    // if (activeSuggestIndex > -1) { /* ... handled in keydown */ }

    const overlay = document.getElementById('methodSheetOverlay');
    const content = document.getElementById('methodSheetContent');

    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        content.style.bottom = '0';
    }, 10);
};

window.closeMethodSheet = function (event) {
    if (event) {
        if (event.target !== document.getElementById('methodSheetOverlay') && event.target.tagName !== 'BUTTON') {
            // keep it open if clicking inside card content unless it's a button
        }
    }
    const overlay = document.getElementById('methodSheetOverlay');
    const content = document.getElementById('methodSheetContent');

    content.style.bottom = '-100%';
    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

function getFarmId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('farm_id') || '';
}

document.addEventListener('DOMContentLoaded', async () => {
    const farmId = getFarmId();
    const display = document.getElementById('selectedFarmDisplay');
    if (!farmId) {
        display.value = "কোন জমি সিলেক্ট করা হয়নি";
        return;
    }

    try {
        const token = localStorage.getItem('farmer_jwt');
        const res = await fetch(`${API_URL}/api/farms/${farmId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.farm) {
            display.value = `${data.farm.name} (${data.farm.area_shotangsho} শতাংশ)`;
        } else {
            display.value = "জমির তথ্য পাওয়া যায়নি";
        }
    } catch (e) {
        display.value = "নেটওয়ার্ক সমস্যা";
    }

    const cropInput = document.getElementById('cropInput');
    const nextStepBtn = document.getElementById('nextStepBtn');
    const autocompleteBox = document.getElementById('cropAutocompleteBox');
    let searchTimeout = null;

    if (cropInput && nextStepBtn) {
        cropInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();

            window._isCropSelected = false;

            // Strict toggle next step button: wait for explicit click
            nextStepBtn.disabled = true;
            nextStepBtn.style.opacity = '0.5';
            nextStepBtn.style.pointerEvents = 'none';

            // Smart Autocomplete Logic
            if (val.length < 2) {
                autocompleteBox.style.display = 'none';
                return;
            }

            const isBengali = /[\u0980-\u09FF]/.test(val);
            if (!isBengali && !val.match(/^\d+$/) && val.match(/[a-zA-Z]/)) {
                autocompleteBox.innerHTML = `
                    <div style="padding: 12px 16px; color: #EF4444; background: #FEF2F2; text-align: center; font-size: 13px; font-weight: 600;">
                        ⚠️ দয়া করে বাংলায় ফসলের নাম লিখুন (যেমন: ধান, আলু)
                    </div>
                `;
                autocompleteBox.style.display = 'block';
                return;
            }

            if (!document.getElementById('spinStyle2')) {
                const style = document.createElement('style');
                style.id = 'spinStyle2';
                style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
                document.head.appendChild(style);
            }

            autocompleteBox.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--primary); font-size: 13px; font-weight: 600; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                    খুঁজে দেখা হচ্ছে...
                </div>
            `;
            autocompleteBox.style.display = 'block';

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                try {
                    const token = localStorage.getItem('farmer_jwt');
                    const res = await fetch(`${API_URL}/api/crops/search?q=${encodeURIComponent(val)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();

                    if (data.success) {
                        let html = '';
                        if (data.results && data.results.length > 0) {
                            html += '<div style="padding: 8px 16px; background: #F8FAFC; border-bottom: 1px solid var(--border-color); font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">সিস্টেমে বিদ্যমান ফসল ও জাত (নির্বাচন করুন)</div>';
                            data.results.forEach(crop => {
                                const varietyPrefix = crop.crop_name === crop.variety_name ?
                                    `<span style="font-weight:600;">${crop.crop_name}</span>` :
                                    `<span style="font-weight:600;">${crop.variety_name}</span> <span style="font-size:12px; color:var(--text-muted);">(${crop.crop_name})</span>`;

                                const badgeHtml = crop.verified_status === 1
                                    ? `<div style="font-size: 11px; background: #ECFDF5; color: #10B981; padding: 2px 6px; border-radius: 4px; border: 1px solid #A7F3D0;">Verified</div>`
                                    : `<div style="font-size: 11px; background: #FFFBEB; color: #D97706; padding: 2px 6px; border-radius: 4px; border: 1px solid #FDE68A;">AI সাজেস্ট</div>`;

                                html += `
                                    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;" 
                                        onmouseover="this.style.background='#F1F5F9'" 
                                        onmouseout="this.style.background='white'"
                                        onclick="selectAutocompleteItem('${crop.variety_name}', '${crop.crop_name}')">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div>${varietyPrefix}</div>
                                            ${badgeHtml}
                                        </div>
                                    </div>
                                `;
                            });
                        }

                        // Always Add a fallback manual option at the very bottom
                        html += `
                            <div style="padding: 8px 16px; background: #F8FAFC; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">অথবা সিস্টেমে না থাকলে</div>
                            <div style="padding: 12px 16px; background: white; cursor: pointer; color: var(--primary); font-weight: 600; text-align: center; transition: background 0.2s;"
                                onmouseover="this.style.background='#F1F5F9'" 
                                onmouseout="this.style.background='white'"
                                onclick="selectAutocompleteItem('${val}', '${val}')">
                                🔍 "${val}" নিয়ে এআই-এর সন্ধান করুন
                            </div>
                        `;

                        autocompleteBox.innerHTML = html;
                        autocompleteBox.style.display = 'block';
                    } else {
                        autocompleteBox.style.display = 'none';
                    }
                } catch (err) {
                    console.error("Autocomplete fail", err);
                }
            }, 300); // Debounce
        });

        // Hide autocomplete on outside click
        document.addEventListener('click', (e) => {
            if (e.target !== cropInput && !autocompleteBox.contains(e.target)) {
                autocompleteBox.style.display = 'none';
            }
        });
    }
});

window.selectAutocompleteItem = function (varietyVal, cropVal) {
    const input = document.getElementById('cropInput');
    input.value = varietyVal;
    window._selectedCropName = cropVal || varietyVal;
    window._isCropSelected = true;

    document.getElementById('cropAutocompleteBox').style.display = 'none';

    // Explicitly enable next step button
    const nextStepBtn = document.getElementById('nextStepBtn');
    nextStepBtn.disabled = false;
    nextStepBtn.style.opacity = '1';
    nextStepBtn.style.pointerEvents = 'auto';
};

// Removed legacy showPlantingOptions and backToStep1

window.proceedToAI = function () {
    const farmId = getFarmId();
    const cropInput = document.getElementById('cropInput');
    const varietyName = cropInput ? cropInput.value.trim() : '';
    const cropName = window._selectedCropName || varietyName;

    if (!varietyName) {
        alert("দয়া করে একটি ফসল নির্বাচন করুন");
        return;
    }

    window.closeMethodSheet();

    setTimeout(() => {
        window.location.href = `ai_crop_prediction.html?farm_id=${farmId}&crop_name=${encodeURIComponent(cropName)}&variety_name=${encodeURIComponent(varietyName)}`;
    }, 300);
}

window.proceedToManual = function () {
    const farmId = getFarmId();
    const cropInput = document.getElementById('cropInput');
    const cropName = cropInput ? cropInput.value.trim() : '';

    if (!cropName) {
        alert("দয়া করে একটি ফসল নির্বাচন করুন");
        return;
    }

    window.closeMethodSheet();
    setTimeout(() => {
        window.location.href = `manual_crop_setup.html?farm_id=${farmId}&crop_name=${encodeURIComponent(cropName)}`;
    }, 300);
}

window.requestAiSuggestion = async function () {
    const btn = document.getElementById('aiSuggestBtn');
    const box = document.getElementById('suggestionBox');

    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> এনালাইসিস করা হচ্ছে...`;
    btn.disabled = true;
    box.style.display = 'none';

    try {
        const token = localStorage.getItem('farmer_jwt');
        // Passing current month integer 1-12
        const currentMonth = new Date().getMonth() + 1;
        const res = await fetch(`${API_URL}/api/ai/suggest-crop?month=${currentMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success && data.crops.length > 0) {
            let html = `<p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">বর্তমান সিজনের জন্য ৩টি সেরা জাত:</p>`;

            // Function to convert English numbers to Bengali numbers
            const toBn = (num) => num.toString().replace(/[0-9]/g, w => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][w]);

            data.crops.forEach(crop => {
                html += `
                    <div style="padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='white'" onclick="selectAiSuggestion('${crop.name}')">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600; font-size: 14px; color: var(--text-main);">${crop.name}</span>
                            <span style="font-size: 12px; font-weight: 600; color: white; background: var(--primary); padding: 2px 8px; border-radius: 12px;">রোগ প্রতিরোধী: ${toBn(crop.score)}/১০</span>
                        </div>
                    </div>
                `;
            });
            box.innerHTML = html;
            box.style.display = 'block';
            btn.style.display = 'none'; // Hide the button once suggestions load
        } else {
            alert('দুঃখিত, এই মাসের জন্য কোনো ডাটাবেস সাজেশন পাওয়া যায়নি।');
            btn.innerHTML = `<span>🌟</span> এআই-কে সেরা লাভজনক ফসল সাজেস্ট করতে বলুন`;
            btn.disabled = false;
        }
    } catch (e) {
        alert('নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।');
        btn.innerHTML = `<span>🌟</span> এআই-কে সেরা লাভজনক ফসল সাজেস্ট করতে বলুন`;
        btn.disabled = false;
    }
}

window.selectAiSuggestion = function (cropName) {
    const input = document.getElementById('cropInput');
    input.value = cropName;
    window._selectedCropName = cropName;

    window._isCropSelected = true;
    const nextStepBtn = document.getElementById('nextStepBtn');
    nextStepBtn.disabled = false;
    nextStepBtn.style.opacity = '1';
    nextStepBtn.style.pointerEvents = 'auto';

    document.getElementById('suggestionBox').style.display = 'none';
    const btn = document.getElementById('aiSuggestBtn');
    btn.style.display = 'flex';
    btn.innerHTML = `<span>✅</span> ${cropName} সিলেক্ট করা হয়েছে (পরিবর্তন করুন)`;
    btn.disabled = false;
}
