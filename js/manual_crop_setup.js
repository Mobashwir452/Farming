import { API_URL } from './auth.js';

let currentTargetInput = null;
let selectedDayElement = null;
let selectedDateString = null;
let currentFarmId = null;
let currentCropName = null;

// Ensure this runs after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentFarmId = params.get('farm_id');
    currentCropName = params.get('crop_name');

    // Handle Seed vs Seedling Toggle
    const radioInputs = document.querySelectorAll('input[name="input_type"]');
    const qtyLabel = document.getElementById('quantity-label');
    const unitLabel = document.getElementById('unit-label');
    const qtyInput = document.getElementById('quantity-input');

    radioInputs.forEach(radio => {
        radio.addEventListener('change', function () {
            // Update active styles
            document.querySelectorAll('.type-radio-label').forEach(lbl => {
                lbl.style.borderColor = 'var(--border-color)';
                lbl.style.background = 'white';
            });
            if (this.checked) {
                this.parentElement.style.borderColor = 'var(--primary)';
                this.parentElement.style.background = '#F0FDF4'; // light green tint
            }

            // Update text inputs
            if (this.value === 'seed') {
                qtyLabel.innerHTML = 'পরিমাণ (কেজি) <span style="color:red;">*</span>';
                unitLabel.textContent = 'কেজি';
                qtyInput.placeholder = 'যেমন: ৫';
            } else {
                qtyLabel.innerHTML = 'পরিমাণ (টি) <span style="color:red;">*</span>';
                unitLabel.textContent = 'টি';
                qtyInput.placeholder = 'যেমন: ৫০০০';
            }
        });
    });

    // Trigger change to set initial active style
    const activeRadio = document.querySelector('input[name="input_type"]:checked');
    if (activeRadio) activeRadio.dispatchEvent(new Event('change'));

    renderCalendar();
});

// Populate Custom Calendar
function renderCalendar() {
    const daysContainer = document.getElementById('calendarDays');
    if (!daysContainer) return;
    daysContainer.innerHTML = '';

    // Creating a dummy 31 day month for March 2026
    for (let i = 1; i <= 31; i++) {
        const dayDiv = document.createElement('div');
        const bnDigit = i.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
        dayDiv.innerHTML = `<span>${bnDigit}</span>`;

        // Add click listener
        dayDiv.addEventListener('click', function () {
            if (selectedDayElement) {
                selectedDayElement.classList.remove('selected');
            }
            this.classList.add('selected');
            selectedDayElement = this;
            selectedDateString = `${bnDigit} মার্চ ২০২৬`;
        });

        // Pre-select 10th
        if (i === 10) {
            dayDiv.classList.add('selected', 'today');
            selectedDayElement = dayDiv;
            selectedDateString = '১০ মার্চ ২০২৬';
        }

        daysContainer.appendChild(dayDiv);
    }
}

window.openCalendar = function (inputElement) {
    currentTargetInput = inputElement;
    const modal = document.getElementById('calendarModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeCalendar = function () {
    const modal = document.getElementById('calendarModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

window.confirmDateSelection = function () {
    if (currentTargetInput && selectedDateString) {
        currentTargetInput.value = selectedDateString;
    }
    window.closeCalendar();
}

// Add more dynamic steps
let stepCount = 3;
window.addCustomStep = function () {
    stepCount++;
    const container = document.getElementById('dynamic-steps-container');

    const bnDigit = stepCount.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

    const newFormGroup = document.createElement('div');
    newFormGroup.className = 'form-group';
    newFormGroup.style.position = 'relative';
    newFormGroup.style.padding = '16px';
    newFormGroup.style.background = '#ffffff';
    newFormGroup.style.border = '1px solid #E2E8F0';
    newFormGroup.style.borderRadius = '12px';
    newFormGroup.style.marginTop = '16px';

    newFormGroup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <label style="margin-bottom: 0;">নতুন ধাপের নাম</label>
            <button type="button" onclick="this.closest('.form-group').remove()" style="background: #FEF2F2; border: 1px solid #FEE2E2; color: #EF4444; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: background 0.2s;" title="ধাপটি মুছুন">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div style="margin-bottom: 12px;">
            <input type="text" placeholder="যেমন: নিড়ানি ও আগাছা পরিষ্কার" style="width: 100%; padding: 14px; border: 1px solid var(--border-color); border-radius: 12px; font-size: 15px; background: #F8FAFC; outline:none;">
        </div>
        <label>ধাপের তারিখ</label>
        <div class="input-with-icon" onclick="openCalendar(this.querySelector('input'))">
            <input type="text" class="custom-date-picker" readonly placeholder="তারিখ নির্বাচন করুন" style="cursor: pointer; width: 100%; padding: 14px; border: 1px solid var(--border-color); border-radius: 12px; font-size: 15px; color: var(--text-main); font-family: inherit; font-weight: 500; outline: none; background: #F8FAFC; transition: all 0.2s;">
            <svg class="icon-right" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none;">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
        </div>
    `;
    container.appendChild(newFormGroup);

    // Scroll to bottom smoothly
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
    });
}

window.saveManualTimeline = async function () {
    const btn = document.querySelector('.btn-accept');
    const originalText = btn.innerHTML;
    const token = localStorage.getItem('farmer_jwt');

    if (!currentFarmId || !currentCropName) {
        alert("দুঃখিত, জমির তথ্য বা ফসলের নাম পাওয়া যায়নি।");
        return;
    }

    const timeline = [];

    // Extract baseline dates
    const plantingInputs = document.querySelectorAll('.custom-date-picker');
    if (plantingInputs[0] && plantingInputs[0].value && !plantingInputs[0].value.includes('তারিখ')) {
        timeline.push({ step_number: 1, title: 'বীজ বপন/চারা রোপণ', description: 'প্রাথমিক রোপণ', due_date: formatDate(plantingInputs[0].value) });
    }
    if (plantingInputs[1] && plantingInputs[1].value && !plantingInputs[1].value.includes('তারিখ')) {
        timeline.push({ step_number: 2, title: 'প্রথম সেচ', description: 'সেচ প্রদান', due_date: formatDate(plantingInputs[1].value) });
    }
    if (plantingInputs[2] && plantingInputs[2].value && !plantingInputs[2].value.includes('তারিখ')) {
        timeline.push({ step_number: 3, title: 'প্রথম সার', description: 'সার প্রয়োগ', due_date: formatDate(plantingInputs[2].value) });
    }

    // Extract dynamic dates
    let stepCounter = 4;
    const dynamicGroups = document.querySelectorAll('#dynamic-steps-container .form-group');
    dynamicGroups.forEach(group => {
        const stepName = group.querySelector('input[type="text"]').value;
        const stepDate = group.querySelector('.custom-date-picker').value;
        if (stepName && stepDate && !stepDate.includes('তারিখ')) {
            timeline.push({ step_number: stepCounter++, title: stepName, description: 'কাস্টম ধাপ', due_date: formatDate(stepDate) });
        }
    });

    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        তৈরি হচ্ছে...
    `;
    let style = document.getElementById('spinStyle');
    if (!style) {
        style = document.createElement('style');
        style.id = 'spinStyle';
        style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    try {
        const response = await fetch(`${API_URL}/api/crops`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                farm_id: currentFarmId,
                crop_name: currentCropName,
                status: 'Healthy',
                timeline: timeline.length > 0 ? timeline : undefined,
                base64_image: sessionStorage.getItem('pendingCropImage') || null
            })
        });

        const data = await response.json();
        if (data.success) {
            sessionStorage.removeItem('pendingCropImage');
            window.location.href = `khamar.html`;
        } else {
            alert(data.error || "সেভ হতে সমস্যা হয়েছে");
            btn.innerHTML = originalText;
        }
    } catch (e) {
        console.error(e);
        alert("নেটওয়ার্কে সমস্যা হয়েছে।");
        btn.innerHTML = originalText;
    }
}

// Helper string parser
function formatDate(bnDateStr) {
    if (!bnDateStr) return null;
    const months = { 'জানুয়ারি': '01', 'ফেব্রুয়ারি': '02', 'মার্চ': '03', 'এপ্রিল': '04', 'মে': '05', 'জুন': '06', 'জুলাই': '07', 'আগস্ট': '08', 'সেপ্টেম্বর': '09', 'অক্টোবর': '10', 'নভেম্বর': '11', 'ডিসেম্বর': '12' };
    let engStr = bnDateStr.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
    let parts = engStr.split(' ');
    if (parts.length < 3) return null;
    let day = parts[0].padStart(2, '0');
    let month = months[parts[1]] || '01';
    let year = parts[2];
    return `${year}-${month}-${day}`;
}
