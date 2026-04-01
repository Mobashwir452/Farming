// js/add_land.js
window.currentLat = null;
window.currentLng = null;

// MAP STATE VARIABLES
let map = null;
let polyline = null;
let userMarker = null;
let watchId = null;
let pointMarkers = [];
window.walkedCoordinates = []; // Will store [lat, lng]
window.calculatedAreaShotangsho = 0;

// Mapping Functions (GPS Integration)
window.startMapping = function () {
    document.getElementById('introStep').style.display = 'none';
    document.getElementById('mappingStep').style.display = 'block';

    // UI Updates
    const placeholder = document.getElementById('gpsPlaceholderContent');
    if (placeholder) placeholder.style.display = 'none';
    const statusText = document.getElementById('gpsStatusText');
    if (statusText) {
        statusText.textContent = "লোকেশন সিগন্যাল খুঁজছে... দয়া করে হাঁটতে থাকুন।";
        statusText.style.color = "var(--primary)";
    }

    if (!navigator.geolocation) {
        alert("আপনার ব্রাউজার জিপিএস সাপোর্ট করে না।");
        window.cancelMapping();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            window.currentLat = lat;
            window.currentLng = lng;

            // Initialize Leaflet Map
            if (!map) {
                map = L.map('gpsMap').setView([lat, lng], 19);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 22,
                    maxNativeZoom: 19,
                    attribution: '© OSM'
                }).addTo(map);

                polyline = L.polyline([], {color: '#10b981', weight: 4, opacity: 0.8}).addTo(map);
                
                userMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: "#3b82f6",
                    color: "#fff",
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 1
                }).addTo(map);
            } else {
                map.setView([lat, lng], 19);
                polyline.setLatLngs([]);
                userMarker.setLatLng([lat, lng]);
            }

            window.walkedCoordinates = [];
            // Clear previous points if re-starting
            pointMarkers.forEach(m => { if(map) map.removeLayer(m); });
            pointMarkers = [];
            if (statusText) statusText.textContent = "ম্যাপিং চলছে... জমির সীমানায় গিয়ে পয়েন্ট যোগ করুন।";

            // Start watching position
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const acc = pos.coords.accuracy;
                    // Ignore highly inaccurate readings unless it's the only data
                    if (acc > 30 && window.walkedCoordinates.length > 0) return;

                    const clat = pos.coords.latitude;
                    const clng = pos.coords.longitude;

                    // Update UI User Marker only
                    userMarker.setLatLng([clat, clng]);
                    map.panTo([clat, clng]);
                    
                    window.currentLat = clat;
                    window.currentLng = clng;
                },
                (err) => {
                    console.error("Watch error:", err);
                    if (statusText) {
                        statusText.textContent = "জিপিএস সিগন্যাল দুর্বল!";
                        statusText.style.color = "var(--danger)";
                    }
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
            );
        },
        (error) => {
            alert("লোকেশন পারমিশন পাওয়া যায়নি। ದয়া করে ব্রাউজার সেটিংস থেকে Location permission on করুন।");
            window.cancelMapping();
        },
        { enableHighAccuracy: true }
    );
};

window.cancelMapping = function () {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    watchId = null;

    document.getElementById('mappingStep').style.display = 'none';
    document.getElementById('introStep').style.display = 'block';

    const placeholder = document.getElementById('gpsPlaceholderContent');
    if (placeholder) placeholder.style.display = 'flex';
    const statusText = document.getElementById('gpsStatusText');
    if (statusText) {
        statusText.textContent = "ম্যাপ খোলার জন্য অপেক্ষা করুন...";
        statusText.style.color = "var(--text-main)";
    }

    if (map) {
        pointMarkers.forEach(m => map.removeLayer(m));
        pointMarkers = [];
        map.remove();
        map = null;
        polyline = null;
        userMarker = null;
    }
};

window.addCornerPoint = function() {
    if (!window.currentLat || !window.currentLng) {
        alert("লোকেশন এখনও পাওয়া যায়নি, একটু অপেক্ষা করুন।");
        return;
    }
    
    // Prevent double clicking very fast or adding exact same point
    if (window.walkedCoordinates.length > 0) {
        let lastP = window.walkedCoordinates[window.walkedCoordinates.length - 1];
        if (lastP[0] === window.currentLat && lastP[1] === window.currentLng) {
            return;
        }
    }

    const newPoint = [window.currentLat, window.currentLng];
    window.walkedCoordinates.push(newPoint);
    polyline.addLatLng(newPoint);
    
    // Add marker for corner
    const marker = L.circleMarker(newPoint, {
        radius: 6,
        fillColor: "#ef4444", // Red for corner point
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    }).addTo(map);
    pointMarkers.push(marker);

    // Live area update if >= 3 elements
    if (window.walkedCoordinates.length >= 3) {
        try {
            const coordsCopy = [...window.walkedCoordinates];
            coordsCopy.push(coordsCopy[0]); // close polygon for area calculation
            const turfCoords = coordsCopy.map(p => [p[1], p[0]]);
            const poly = turf.polygon([turfCoords]);
            const area = turf.area(poly) / 40.4686;
            
            const liveAreaE = document.getElementById('liveAreaDisplay');
            if (liveAreaE) liveAreaE.textContent = area.toFixed(2);
        } catch(e) {}
    }

    const statusText = document.getElementById('gpsStatusText');
    if (statusText) statusText.textContent = `পয়েন্ট যোগ হয়েছে: ${window.walkedCoordinates.length} টি`;
};

window.finishMapping = function () {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    watchId = null;

    if (window.walkedCoordinates.length < 3) {
        alert("যথেষ্ট ডাটা পাওয়া যায়নি। অন্তত ৩টি পয়েন্ট (লোকেশন) প্রয়োজন। দয়া করে একটু বেশি হাঁটুন।");
        return;
    }

    // Close the polygon visually
    const firstPoint = window.walkedCoordinates[0];
    window.walkedCoordinates.push(firstPoint);
    polyline.addLatLng(firstPoint);

    try {
        // Convert to Turf format [lng, lat]
        const turfCoords = window.walkedCoordinates.map(p => [p[1], p[0]]);
        const polygon = turf.polygon([turfCoords]);
        
        // Area in sq meters
        const areaSqMeters = turf.area(polygon);
        
        // 1 Shotangsho = 40.4686 sq meters
        window.calculatedAreaShotangsho = (areaSqMeters / 40.4686).toFixed(2);
        
        // Add filled polygon to map
        L.polygon(window.walkedCoordinates, {color: '#10b981', fillColor: '#10b981', fillOpacity: 0.3}).addTo(map);
        map.fitBounds(polyline.getBounds(), {padding: [20, 20]});

        document.getElementById('mappingStep').style.display = 'none';
        document.getElementById('completeStep').style.display = 'block';

        // Update result UI area text (assuming it's the second p tag inside completeStep block)
        const completeRows = document.querySelectorAll('#completeStep p');
        if(completeRows && completeRows.length > 1) {
            completeRows[1].textContent = `মোট আয়তন: ${window.calculatedAreaShotangsho} শতাংশ`;
        }

        const statusText = document.getElementById('gpsStatusText');
        if (statusText) {
            statusText.textContent = "ম্যাপিং সফলভাবে সম্পন্ন হয়েছে!";
            statusText.style.color = "#10b981";
        }
    } catch (e) {
        console.error("Area Calculation Error:", e);
        alert("আয়তন হিসাবে একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    }
};

window.saveGpsLand = async function (event) {
    const name = document.getElementById('gpsLandName').value;
    const area = window.calculatedAreaShotangsho;

    if (!name) {
        alert("দয়া করে জমির একটি নাম দিন।");
        return;
    }

    const token = localStorage.getItem('farmer_jwt');
    if (!token) {
        alert("আপনার লগইন মেয়াদ শেষ হয়ে গেছে। দয়া করে পুনরায় লগইন করুন।");
        window.location.href = 'login.html';
        return;
    }

    const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';

    const btn = event.target;
    let originalText = btn.innerHTML;
    btn.innerHTML = "সেভ হচ্ছে...";
    btn.disabled = true;

    try {
        const payload = { 
            name: name, 
            area_shotangsho: area, 
            location: 'GPS Auto Mapping', // Generic fallback
            lat: window.currentLat,
            lng: window.currentLng,
            map_coordinates: JSON.stringify(window.walkedCoordinates)
        };

        const response = await fetch(`${BASE_URL}/api/farms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = 'add_crop.html';
        } else {
            if (data && data.error && (data.error.toLowerCase().includes('payment required') || data.error.toLowerCase().includes('limit exceeded'))) {
                if(window.showPaywallModal) window.showPaywallModal('জমি যোগ করা');
                else alert(data.error);
            } else {
                alert("জমি সেভ করতে সমস্যা হয়েছে: " + (data.error || 'Unknown error'));
            }
            btn.innerHTML = originalText; btn.disabled = false;
        }
    } catch (e) {
        console.error("Save GPS Land Error:", e);
        alert("নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন।");
        btn.innerHTML = originalText; btn.disabled = false;
    }
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
        const payload = { 
            name: name, 
            area_shotangsho: area, 
            location: locationValue,
            lat: window.currentLat,
            lng: window.currentLng
        };

        const response = await fetch(`${BASE_URL}/api/farms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            window.closeManualEntry();
            window.location.href = 'khamar.html';
        } else {
            if (data && data.error && (data.error.toLowerCase().includes('payment required') || data.error.toLowerCase().includes('limit exceeded'))) {
                window.closeManualEntry();
                if(window.showPaywallModal) window.showPaywallModal('জমি যোগ করা');
                else alert(data.error);
            } else {
                alert("জমি সেভ করতে সমস্যা হয়েছে: " + (data.error || 'Unknown error'));
            }
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
        window.currentLat = lat;
        window.currentLng = lon;
        
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
                    <li style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; display: flex; align-items: flex-start; gap: 10px;" onclick="selectLocation('${shortName.replace(/'/g, "\\'")}', '${item.lat}', '${item.lon}')">
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

window.selectLocation = function(name, lat, lng) {
    document.getElementById('manualLocation').value = name;
    if (lat && lng) {
        window.currentLat = parseFloat(lat);
        window.currentLng = parseFloat(lng);
    }
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
