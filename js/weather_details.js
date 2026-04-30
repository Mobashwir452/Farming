import { registerComponents } from './components.js';

registerComponents();

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    // Defaults to Dhaka if not provided
    let lat = urlParams.get('lat') || '23.8103';
    let lon = urlParams.get('lon') || '90.4125';
    
    // Parse location name if provided via query, otherwise we'll reverse geocode or use generic
    let locationName = urlParams.get('loc') || (lat === '23.8103' ? 'ঢাকা, বাংলাদেশ' : 'আপনার খামার এলাকা');
    const locEl = document.getElementById('loc-name');
    if (locEl) {
        locEl.textContent = decodeURIComponent(locationName);
        locEl.classList.remove('skeleton');
        locEl.style.width = 'auto';
        locEl.style.height = 'auto';
    }

    fetchWeatherDetails(lat, lon);

    // 1. Pull to Refresh Logic
    const mainArea = document.getElementById('weather-main');
    const ptrIndicator = document.getElementById('ptr-indicator');

    let startY = 0;
    let dist = 0;
    const threshold = 60; // minimum distance to trigger refresh

    mainArea.addEventListener('touchstart', (e) => {
        if (mainArea.scrollTop === 0) {
            startY = e.touches[0].clientY;
        }
    }, { passive: true });

    mainArea.addEventListener('touchmove', (e) => {
        if (startY === 0) return; // Not at top

        const currentY = e.touches[0].clientY;
        dist = currentY - startY;

        if (dist > 0 && dist < 100) {
            ptrIndicator.style.height = `${dist}px`;
            if (dist > threshold) {
                ptrIndicator.classList.add('active');
            }
        }
    }, { passive: true });

    mainArea.addEventListener('touchend', () => {
        if (dist > threshold) {
            refreshWeatherData();
        } else {
            ptrIndicator.classList.remove('active');
            ptrIndicator.style.height = '0';
        }
        startY = 0;
        dist = 0;
    });

    function refreshWeatherData() {
        ptrIndicator.classList.add('active');
        ptrIndicator.style.height = '60px';
        
        fetchWeatherDetails(lat, lon, true).finally(() => {
            ptrIndicator.classList.remove('active');
            ptrIndicator.style.height = '0';
        });
    }

    // 2. Edit Location Logic (Simulated for now, could integrate with real search)
    const editLocationBtn = document.querySelector('.edit-location-btn');
    if (editLocationBtn) {
        editLocationBtn.addEventListener('click', () => {
            alert('লোকেশন পরিবর্তন করতে খামার সেটিংসে যান।');
        });
    }
});

async function fetchWeatherDetails(lat, lon, forceRefresh = false) {
    try {
        const cacheKey = `agritech_weather_v2_${lat}_${lon}`;
        let data = null;
        
        if (!forceRefresh) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                if (Date.now() - parsedCache.timestamp < 3600000) {
                    data = parsedCache.data;
                }
            }
        }
        
        if (!data) {
            const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
            const res = await fetch(`${BASE_URL}/api/weather?lat=${lat}&lon=${lon}`);
            data = await res.json();
            
            if (data.success) {
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: Date.now(),
                    data: data
                }));
            }
        }
        
        if (data && data.success) {
            updateWeatherUI(data);
        } else {
            document.getElementById('cw-cond').textContent = 'তথ্য লোড করতে সমস্যা হয়েছে';
        }
    } catch (err) {
        console.error('Weather detail fetch error:', err);
        document.getElementById('cw-cond').textContent = 'ইন্টারনেট সংযোগ চেক করুন';
    }
}

function updateWeatherUI(data) {
    const current = data.current;
    const forecast = data.forecast;
    const body = document.body;

    // Remove existing themes
    body.classList.remove('theme-sunny', 'theme-cloudy', 'theme-rainy', 'theme-night');
    
    // Theme selection logic based on icon string (e.g. "01d", "04n", "10d")
    if (current.icon) {
        if (current.icon.includes('n')) {
            body.classList.add('theme-night');
        } else if (['01d', '02d'].includes(current.icon)) {
            body.classList.add('theme-sunny');
        } else if (['09d', '10d', '11d', '13d'].includes(current.icon)) {
            body.classList.add('theme-rainy');
        } else {
            body.classList.add('theme-cloudy');
        }
    } else {
        body.classList.add('theme-cloudy');
    }

    // Update Current Weather
    const iconEl = document.getElementById('cw-icon');
    if (iconEl && current.icon) {
        iconEl.classList.remove('skeleton', 'skeleton-circle');
        iconEl.style.width = '100px'; // larger icon looks better once loaded
        iconEl.style.height = '100px';
        iconEl.innerHTML = `<img src="https://openweathermap.org/img/wn/${current.icon}@4x.png" style="width:100%; height:100%; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.2));" alt="Weather">`;
    }

    const tempEl = document.getElementById('cw-temp');
    if (tempEl) {
        tempEl.innerHTML = Math.round(current.temp) + '&deg;C';
    }

    const condEl = document.getElementById('cw-cond');
    if (condEl) {
        condEl.textContent = current.condition_bn || current.condition || 'তথ্য পাওয়া যায়নি';
        condEl.classList.remove('skeleton');
        condEl.style.width = 'auto';
        condEl.style.height = 'auto';
    }
    document.getElementById('cw-humidity').textContent = current.humidity !== undefined ? current.humidity + '%' : '--%';
    document.getElementById('cw-wind').textContent = current.wind_speed !== undefined ? Math.round(current.wind_speed * 3.6) + ' কিমি/ঘ' : '-- কিমি/ঘ';

    // Current Min/Max from the first day of forecast
    if (forecast && forecast.length > 0) {
        const todayForecast = forecast[0];
        document.getElementById('cw-max').innerHTML = 'সর্বোচ্চ ' + Math.round(todayForecast.max_temp) + '&deg;';
        document.getElementById('cw-min').innerHTML = 'সর্বনিম্ন ' + Math.round(todayForecast.min_temp) + '&deg;';
        document.getElementById('cw-feels').innerHTML = 'অনুভূত হচ্ছে ' + Math.round(current.feels_like || current.temp) + '&deg;';
    }

    // Intelligent Weather Tip Logic
    const tipContainer = document.getElementById('agri-tip-container');
    if (tipContainer && forecast && forecast.length > 0) {
        let hasRain = false;
        let highTemp = false;
        let highWind = current.wind_speed && current.wind_speed * 3.6 > 40; // >40 km/h

        // Check next 3 days
        forecast.slice(0, 3).forEach(day => {
            const cond = (day.condition || '').toLowerCase();
            const condBn = (day.condition_bn || '');
            if (cond.includes('rain') || cond.includes('thunderstorm') || condBn.includes('বৃষ্টি')) {
                hasRain = true;
            }
            if (day.max_temp >= 35) {
                highTemp = true;
            }
        });

        let tipMessage = "";
        let tipClass = "success";
        let tipIcon = "lightbulb";

        if (highWind && hasRain) {
            tipMessage = "<strong>ঝড়ের সতর্কতা:</strong> প্রবল বাতাস ও বৃষ্টির সম্ভাবনা। মাঠে ফসল কাটার উপযুক্ত হলে দ্রুত ব্যবস্থা নিন।";
            tipClass = "danger";
            tipIcon = "warning";
        } else if (hasRain) {
            tipMessage = "<strong>বৃষ্টির সম্ভাবনা:</strong> আগামী কয়েকদিনের মধ্যে বৃষ্টির সম্ভাবনা আছে। সার বা কীটনাশক স্প্রে করা থেকে বিরত থাকুন।";
            tipClass = "warning";
            tipIcon = "info";
        } else if (highTemp && !hasRain) {
            tipMessage = "<strong>শুষ্ক আবহাওয়া:</strong> টানা খরা ও রোদের সম্ভাবনা রয়েছে। ফসলের গোড়ায় আর্দ্রতা চেক করে সেচ দেওয়ার প্রস্তুতি নিন।";
            tipClass = "danger";
            tipIcon = "local_fire_department";
        } else {
            tipMessage = "<strong>অনুকূল আবহাওয়া:</strong> আবহাওয়া স্বাভাবিক রয়েছে। জমিতে নিড়ানি দেওয়া, সার প্রয়োগ বা স্প্রে করার জন্য সময়টি উপযুক্ত।";
            tipClass = "success";
            tipIcon = "check_circle";
        }

        tipContainer.innerHTML = `
            <div class="agri-tip-box ${tipClass}">
                <span class="material-icons-round tip-icon">${tipIcon}</span>
                <p style="margin: 0;">${tipMessage}</p>
            </div>
        `;
        tipContainer.style.display = 'block';
    }

    // Render Forecast List
    const forecastList = document.getElementById('forecast-list');
    if (forecastList && forecast) {
        let html = '';
        const daysOfWeek = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
        
        forecast.forEach((day, index) => {
            const dateObj = new Date(day.date);
            let dayName = daysOfWeek[dateObj.getDay()];
            if (index === 0) dayName = 'আজ';
            else if (index === 1) dayName = 'আগামীকাল';
            
            const isTodayClass = index === 0 ? 'today' : '';
            
            // Generate some extra details like rain probability if available (simulated if missing from API)
            let extraHtml = '';
            if ((day.condition || '').toLowerCase().includes('rain') || (day.condition_bn || '').includes('বৃষ্টি')) {
                 extraHtml = `<div class="f-extra" style="color: #FFFFFF; font-size: 11px; font-weight: 600; line-height: 1.1;">বৃষ্টির সম্ভাবনা রয়েছে</div>`;
            }

            html += `
                <div class="forecast-item ${isTodayClass}">
                    <div class="f-day">${dayName}</div>
                    <div class="f-info" style="display: flex; align-items: center; gap: 8px;">
                        <img src="https://openweathermap.org/img/wn/${day.icon}.png" alt="${day.condition}" style="width: 32px; height: 32px; flex-shrink: 0;">
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-size: 13px; line-height: 1.2;">${day.condition_bn || day.condition}</span>
                            ${extraHtml}
                        </div>
                    </div>
                    <div class="f-temps" style="text-align: right;">${Math.round(day.max_temp)}&deg; <span class="text-muted" style="opacity: 0.8; font-size: 0.9em;">/ ${Math.round(day.min_temp)}&deg;</span></div>
                </div>
            `;
        });
        forecastList.innerHTML = html;
    }

    // Render Hourly Forecast
    const hourlyList = document.getElementById('hourly-forecast-list');
    if (hourlyList) {
        if (data.hourly && data.hourly.length > 0) {
            let hourlyHtml = '';
            data.hourly.forEach(hour => {
                const dateObj = new Date(hour.dt * 1000);
                let timeStr = dateObj.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                
                let extraHtml = '';
                if (hour.pop > 0) {
                    extraHtml = `<div style="font-size: 10px; color: #FFFFFF; font-size: 11px; font-weight: 600; line-height: 1.1; display:flex; align-items:center; gap: 2px;"><span class="material-icons-round" style="font-size: 10px;">water_drop</span> ${Math.round(hour.pop * 100)}%</div>`;
                }

                hourlyHtml += `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 16px; background: rgba(255,255,255,0.1); border-radius: 12px; min-width: 60px;">
                        <span style="font-size: 12px; font-weight: 500; margin-bottom: 8px;">${timeStr}</span>
                        <img src="https://openweathermap.org/img/wn/${hour.icon}.png" alt="${hour.condition}" style="width: 32px; height: 32px; margin-bottom: 4px;">
                        <span style="font-size: 14px; font-weight: 700;">${Math.round(hour.temp)}&deg;</span>
                        ${extraHtml}
                    </div>
                `;
            });
            hourlyList.innerHTML = hourlyHtml;
        } else {
             hourlyList.innerHTML = `<div style="text-align:center; padding:10px; width: 100%; color: rgba(255,255,255,0.7); font-size: 13px;">হালনাগাদ করার জন্য অপেক্ষা করুন... (নতুন ডেটা শীঘ্রই আসবে)</div>`;
        }
    }
}



