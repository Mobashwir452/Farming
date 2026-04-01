import { API_URL } from './auth.js';

let pendingAICropData = null;

window.onload = () => {
    const rawData = sessionStorage.getItem('pendingAICropData');
    if (!rawData) {
        alert("কোনো ডাটা পাওয়া যায়নি। দয়া করে আবার চেষ্টা করুন।");
        window.history.back();
        return;
    }

    pendingAICropData = JSON.parse(rawData);
    document.getElementById('final-crop-name').textContent = pendingAICropData.crop_name;
    
    renderFinanceInfo();
    renderResources();
};

function renderFinanceInfo() {
    if (!pendingAICropData.finance || !pendingAICropData.yield) return;
    
    // Add "কেজি" string if it's just a number, convert numbers to Bengali for the top section.
    const rawYield = String(pendingAICropData.yield.range).replace(' কেজি', '').replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
    const yieldStr = rawYield + " কেজি";
    
    const yieldEl = document.getElementById('display-yield-range');
    const lifespanEl = document.getElementById('display-lifespan');
    const priceEl = document.getElementById('display-price-per-kg');
    const revenueEl = document.getElementById('display-revenue');
    const profitEl = document.getElementById('display-profit');
    
    if (yieldEl) yieldEl.textContent = yieldStr;
    
    let lifespanStr = pendingAICropData.yield.lifespan;
    if (!lifespanStr || lifespanStr === 'অজানা' || lifespanStr === 'Unknown') {
        const tasks = pendingAICropData.daily_tasks || [];
        const maxOffset = tasks.reduce((max, task) => Math.max(max, parseInt(task.day_offset) || 0), 0);
        if (maxOffset > 0) {
            const bnMax = maxOffset.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
            lifespanStr = `আনুমানিক ${bnMax} দিন`;
        } else if (pendingAICropData.duration_days) {
            const bnDur = pendingAICropData.duration_days.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
            lifespanStr = `আনুমানিক ${bnDur} দিন`;
        } else {
            lifespanStr = 'অজানা';
        }
    }

    if (lifespanEl) lifespanEl.textContent = lifespanStr;
    
    if (priceEl) priceEl.textContent = "৳ " + String(pendingAICropData.finance.price_per_kg || '0').replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
    if (revenueEl) revenueEl.textContent = String(pendingAICropData.finance.revenue || '-').replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]) + " টাকা";
    if (profitEl) {
        let profitStr = String(pendingAICropData.finance.profit || '-');
        profitEl.textContent = profitStr.replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]) + " টাকা";
        profitEl.style.color = profitStr.includes('-') ? '#EF4444' : '#4F46E5'; 
    }
}

function renderResources() {
    const container = document.querySelector('.resource-table-container');
    if (!container) return;

    const resources = pendingAICropData.resources || [];
    
    if (resources.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted); font-family: \'Noto Sans Bengali\', sans-serif;">কোনো খরচের বিবরণী পাওয়া যায়নি</div>';
        return;
    }

    const grouped = {
        'seed_or_sapling': { title: 'বীজ বা চারা', icon: '🌱', items: [] },
        'fertilizer': { title: 'সার ব্যবস্থাপনা', icon: '🌿', items: [] },
        'pesticide': { title: 'বালাইনাশক ও ঔষধ', icon: '🛡️', items: [] },
        'irrigation': { title: 'সেচ ব্যবস্থাপনা', icon: '💧', items: [] },
        'labor_and_other': { title: 'শ্রমিক ও অন্যান্য', icon: '👨🏽‍🌾', items: [] }
    };

    let total = 0;
    resources.forEach(r => {
        total += r.estimated_cost_bdt || 0;
        const cat = r.category || 'labor_and_other';
        if (grouped[cat]) {
            grouped[cat].items.push(r);
        } else {
            grouped['labor_and_other'].items.push(r);
        }
    });

    const translateUnit = str => {
        if (!str || str === '-') return '-';
        return str.replace(/kg/gi, 'কেজি')
                  .replace(/gm/gi, 'গ্রাম')
                  .replace(/litters|litter/gi, 'লিটার')
                  .replace(/l|L/g, 'লিটার')
                  .replace(/ml/gi, 'মিলি')
                  .replace(/pcs/gi, 'টি')
                  .replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
    };

    let html = '';
    for (const [key, group] of Object.entries(grouped)) {
        if (group.items.length > 0) {
            html += `
            <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); font-family: 'Noto Sans Bengali', sans-serif;">
                <div style="background: #F8FAFC; padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">${group.icon}</span>
                    <h4 style="margin: 0; font-size: 14px; color: var(--text-main); font-weight: 700;">${group.title}</h4>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                            <th style="text-align: left; padding: 10px 16px; font-weight: 600;">উপাদানের নাম</th>
                            <th style="text-align: right; padding: 10px 16px; font-weight: 600;">পরিমাণ</th>
                            <th style="text-align: right; padding: 10px 16px; font-weight: 600;">মূল্য (৳)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            group.items.forEach(r => {
                const amountBn = translateUnit((r.amount || '-').toString());
                const costBn = (r.estimated_cost_bdt || 0).toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
                html += `
                        <tr style="border-bottom: 1px dashed var(--border-color);">
                            <td style="padding: 10px 16px; color: var(--text-main);">${r.name}</td>
                            <td style="text-align: right; padding: 10px 16px; color: var(--text-muted);">${amountBn}</td>
                            <td style="text-align: right; padding: 10px 16px; color: var(--text-main); font-weight: 500;">${costBn}</td>
                        </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            </div>
            `;
        }
    }
    
    // Fallback logic for total
    const fallbackStr = String(pendingAICropData.finance?.cost || '0').replace(/[^\d\.]/g, '');
    const fallbackCost = parseFloat(fallbackStr) || 0;
    const finalTotal = total > 0 ? total : fallbackCost;
    const totalBn = finalTotal.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

    html += `
        <div style="background: #FEF2F2; border: 1px solid #FECDD3; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-family: 'Noto Sans Bengali', sans-serif;">
            <span style="font-size: 14px; font-weight: 700; color: #9F1239;">সর্বমোট সম্ভাব্য খরচ (৳):</span>
            <strong style="font-size: 18px; color: #BE185D;">${totalBn}</strong>
        </div>
    `;

    container.innerHTML = html;
}


window.closeDatePicker = function (event) {
    if (event && event.target !== document.getElementById('datePickerOverlay') && event.target.tagName !== 'BUTTON') {
        return;
    }
    const overlay = document.getElementById('datePickerOverlay');
    const content = document.getElementById('datePickerContent');
    content.style.bottom = '-100%';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

/* --- Calendar Logic --- */
const EN_TO_BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

function getBengaliNumeral(num) {
    return num.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
}

window.currentCalendarViewDate = null;

function renderTimelineCalendar(initialDateStr = null, resetView = true) {
    if (resetView) {
        if (initialDateStr) {
            const parsed = new Date(initialDateStr);
            if (!isNaN(parsed)) {
                window.currentCalendarViewDate = parsed;
            } else {
                window.currentCalendarViewDate = new Date();
            }
        } else {
            window.currentCalendarViewDate = new Date();
        }
    } else if (!window.currentCalendarViewDate) {
        window.currentCalendarViewDate = new Date();
    }

    const calendarDays = document.getElementById('calendarDays');
    const monthLabel = document.getElementById('calendarMonthLabel');
    if (!calendarDays || !monthLabel) return;
    
    calendarDays.innerHTML = '';
    
    const realToday = new Date();
    let selectedDateStr = document.getElementById('selectedPlantingDate')?.value || initialDateStr;
    
    const currentMonth = window.currentCalendarViewDate.getMonth();
    const currentYear = window.currentCalendarViewDate.getFullYear();
    
    monthLabel.textContent = `${EN_TO_BN_MONTHS[currentMonth]} ${getBengaliNumeral(currentYear)}`;
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        calendarDays.appendChild(emptyDiv);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'cal-day';
        dayEl.textContent = getBengaliNumeral(i);
        
        const thisCellDate = new Date(currentYear, currentMonth, i);
        thisCellDate.setHours(0,0,0,0);
        const realTodayCopy = new Date(realToday);
        realTodayCopy.setHours(0,0,0,0);
        
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(i).padStart(2, '0');
        const cellDateStr = `${currentYear}-${monthStr}-${dayStr}`;
        
        if (thisCellDate < realTodayCopy) {
            dayEl.classList.add('past');
        }
        
        dayEl.addEventListener('click', () => {
            document.querySelectorAll('#calendarDays .cal-day').forEach(el => el.classList.remove('selected'));
            dayEl.classList.add('selected');
            document.getElementById('selectedPlantingDate').value = cellDateStr;
        });
        
        if (selectedDateStr === cellDateStr) {
            dayEl.classList.add('selected');
            document.getElementById('selectedPlantingDate').value = cellDateStr;
        }
        
        calendarDays.appendChild(dayEl);
    }
}

window.changeCalendarMonth = function(offset) {
    if (!window.currentCalendarViewDate) return;
    window.currentCalendarViewDate.setMonth(window.currentCalendarViewDate.getMonth() + offset);
    renderTimelineCalendar(null, false);
};

window.confirmAndSave = function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('selectedPlantingDate').value = today;

    renderTimelineCalendar();

    const overlay = document.getElementById('datePickerOverlay');
    const content = document.getElementById('datePickerContent');
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        content.style.bottom = '0';
    }, 10);
}

window.finalizeAndSave = async function () {
    const btn = document.getElementById('btn-finalize-save');
    const originalText = btn.innerHTML;
    const token = localStorage.getItem('farmer_jwt');

    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        সেভ হচ্ছে...
    `;
    let style = document.getElementById('spinStyle');
    if (!style) {
        style = document.createElement('style');
        style.id = 'spinStyle';
        style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    try { 
        // Read custom date
        const dateInput = document.getElementById('selectedPlantingDate').value;
        const plantingDate = dateInput || new Date().toISOString().split('T')[0];
        pendingAICropData.planting_date = plantingDate;

        const response = await fetch(`${API_URL}/api/crops`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pendingAICropData)
        });

        if (response.status === 401) {
            alert('আপনার লগইন সেশনের মেয়াদ শেষ হয়ে গেছে। দয়া করে পুনরায় লগইন করুন।');
            localStorage.removeItem('farmer_jwt');
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        if (response.ok && data.success !== false) {
            sessionStorage.removeItem('pendingAICropData');
            sessionStorage.removeItem('pendingCropImage');
            
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                সফলভাবে সেভ হয়েছে!
            `;
            btn.style.background = '#10B981';
            
            setTimeout(() => {
                window.location.href = 'khamar.html';
            }, 1000);
        } else {
            if (data && data.error && (data.error.toLowerCase().includes('payment required') || data.error.toLowerCase().includes('limit exceeded') || data.error.toLowerCase().includes('limit reached'))) {
                document.getElementById('datePickerOverlay').style.display = 'none'; // hide date picker modal
                if(window.showPaywallModal) window.showPaywallModal('ফার্মিং রুটিন জেনারেশন');
                else alert(data.error);
            } else {
                alert(data.error || "সেভ হতে সমস্যা হয়েছে");
            }
            btn.innerHTML = originalText;
        }
    } catch (e) {
        console.error(e);
        alert("নেটওয়ার্কে সমস্যা হয়েছে।");
        btn.innerHTML = originalText;
    }
}
