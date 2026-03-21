// js/add_land.js

// Mapping Functions (Existing)
window.startMapping = function () {
    document.getElementById('introStep').style.display = 'none';
    document.getElementById('mappingStep').style.display = 'block';
};

window.cancelMapping = function () {
    document.getElementById('mappingStep').style.display = 'none';
    document.getElementById('introStep').style.display = 'block';
};

window.finishMapping = function () {
    document.getElementById('mappingStep').style.display = 'none';
    document.getElementById('completeStep').style.display = 'block';
};

// Manual Entry Functions (New)
window.openManualEntry = function () {
    document.getElementById('modalOverlay').style.display = 'block';
    const modal = document.getElementById('manualEntryModal');
    modal.style.display = 'block';
    // Slight delay to allow CSS transition to trigger
    setTimeout(() => { modal.style.bottom = '0'; }, 10);
};

window.closeManualEntry = function () {
    const modal = document.getElementById('manualEntryModal');
    modal.style.bottom = '-100%';
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('modalOverlay').style.display = 'none';
    }, 300);
};

window.saveManualLand = async function (event) {
    const name = document.getElementById('manualLandName').value;
    const area = document.getElementById('manualLandArea').value;

    if (!name || !area) {
        alert("দয়া করে জমির নাম এবং পরিমাণ দুটোই প্রদান করুন।");
        return;
    }

    const token = localStorage.getItem('farmer_jwt'); // Correct token key
    if (!token) {
        alert("আপনার লগইন মেয়াদ শেষ হয়ে গেছে। দয়া করে পুনরায় লগইন করুন।");
        window.location.href = 'login.html';
        return;
    }

    const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';

    const locationValue = document.getElementById('manualLocation')?.value || '';

    // Show loading state
    const btn = event ? event.target : (window.event ? window.event.target : document.querySelector('#manualEntryModal .btn-primary'));
    let originalText = "সেভ করুন";
    if (btn && btn.tagName === 'BUTTON') {
        originalText = btn.innerHTML;
        btn.innerHTML = "সেভ হচ্ছে...";
        btn.disabled = true;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/farms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: name, area_shotangsho: area, location: locationValue })
        });

        const data = await response.json();

        if (data.success) {
            window.closeManualEntry();
            window.location.href = 'khamar.html';
        } else {
            alert("জমি সেভ করতে সমস্যা হয়েছে: " + (data.error || 'Unknown error'));
            if (btn && btn.tagName === 'BUTTON') { btn.innerHTML = originalText; btn.disabled = false; }
        }
    } catch (e) {
        console.error("Save Manual Land Error:", e);
        alert("নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন।");
        if (btn && btn.tagName === 'BUTTON') { btn.innerHTML = originalText; btn.disabled = false; }
    }
};

window.fetchGPSLocation = function () {
    const statusText = document.getElementById('locationStatus');
    const locationInput = document.getElementById('manualLocation');
    
    if (!navigator.geolocation) {
        alert("আপনার ব্রাউজার জিপিএস সাপোর্ট করে না।");
        return;
    }

    statusText.style.display = 'block';
    statusText.textContent = 'লোকেশন খোঁজা হচ্ছে... (দয়া করে জিপিএস পারমিশন দিন)';
    statusText.style.color = '#3b82f6';

    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        try {
            // Reverse Geocoding using OpenStreetMap Nominatim API (Free, no key required)
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=bn`);
            const data = await response.json();
            
            if (data && data.address) {
                const district = data.address.state_district || data.address.county || data.address.city || data.address.state || '';
                const sub_district = data.address.suburb || data.address.town || data.address.village || '';
                
                const fullLoc = [sub_district, district].filter(Boolean).join(', ');
                locationInput.value = fullLoc;
                
                statusText.textContent = 'লোকেশন সফলভাবে সেট হয়েছে!';
                statusText.style.color = '#10b981';
                setTimeout(() => { statusText.style.display = 'none'; }, 3000);
            } else {
                throw new Error("Address parsing failed");
            }
        } catch (error) {
            console.error("GPS Reverse Geocoding Error:", error);
            statusText.textContent = 'সঠিক লোকেশন পাওয়া যায়নি, ইন্টারনেট চেক করুন।';
            statusText.style.color = '#ef4444';
        }
    }, (error) => {
        console.error("GPS Error:", error);
        statusText.textContent = 'লোকেশন পারমিশন বাতিল করা হয়েছে বা পাওয়া যাচ্ছে না। Error: ' + error.message;
        statusText.style.color = '#ef4444';
    }, {
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
};

let fetchTimeout;
window.searchLocation = async function (query) {
    const suggestionsBox = document.getElementById('locationSuggestions');
    if (query.length < 3) {
        suggestionsBox.style.display = 'none';
        return;
    }

    clearTimeout(fetchTimeout);
    fetchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)},bangladesh&format=json&limit=5&accept-language=bn`);
            const data = await res.json();
            
            if (data && data.length > 0) {
                // Keep only unique meaningful display names up to 3 parts to avoid excessive length
                suggestionsBox.innerHTML = data.map(item => {
                    const shortName = item.display_name.split(',').slice(0, 3).join(',');
                    return `
                    <li style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; display: flex; align-items: flex-start; gap: 10px;" onclick="selectLocation('${shortName.replace(/'/g, "\\'")}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span style="font-size: 14px; color: #334155; line-height: 1.4;">${shortName}</span>
                    </li>
                `}).join('');
                suggestionsBox.style.display = 'block';
            } else {
                suggestionsBox.style.display = 'none';
            }
        } catch (e) {
            console.error("Autocomplete Error:", e);
        }
    }, 500);
};

window.selectLocation = function(name) {
    document.getElementById('manualLocation').value = name;
    document.getElementById('locationSuggestions').style.display = 'none';
    const statusText = document.getElementById('locationStatus');
    statusText.style.display = 'block';
    statusText.textContent = 'লোকেশন সেট হয়েছে!';
    statusText.style.color = '#10b981';
    setTimeout(() => { statusText.style.display = 'none'; }, 3000);
};

document.addEventListener('click', function(e) {
    if(e.target.id !== 'manualLocation') {
        const box = document.getElementById('locationSuggestions');
        if(box) box.style.display = 'none';
    }
});
