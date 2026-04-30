import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Components
    registerComponents();

    // 2. Adjust active state of the bottom nav for Khamar page
    setTimeout(() => {
        const bottomNav = document.querySelector('app-bottom-nav');
        if (bottomNav) {
            const items = bottomNav.querySelectorAll('.b-n-item');
            if (items.length > 1) {
                items[0].classList.remove('active');
                items[1].classList.add('active');
                items[1].href = 'khamar.html';
            }
        }
    }, 50);

    // Global toggleDropdown function
    window.toggleDropdown = function (event, dropId) {
        event.stopPropagation();
        const drop = document.getElementById(dropId);

        document.querySelectorAll('.fc-dropdown').forEach(d => {
            if (d.id !== dropId) d.classList.remove('show');
        });

        if (drop) {
            drop.classList.toggle('show');
        }
    };

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.fc-actions-wrapper')) {
            document.querySelectorAll('.fc-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        }
    });

    // Initialize Hero Section Static data (Greeting)
    const hour = new Date().getHours();
    let greeting = 'স্বাগতম!';
    if (hour >= 5 && hour < 12) greeting = 'শুভ সকাল 🌅';
    else if (hour >= 12 && hour < 17) greeting = 'শুভ দুপুর ☀️';
    else if (hour >= 17 && hour < 20) greeting = 'শুভ সন্ধ্যা 🌇';
    else greeting = 'শুভ রাত্রি 🌙';
    
    const greetingEl = document.getElementById('kheroGreeting');
    if(greetingEl) greetingEl.textContent = greeting;

    // Fetch Weather for Hero
    fetchHeroWeather();

    // 3. Fetch Farms dynamically
    loadFarms();
});

async function fetchHeroWeather() {
    try {
        const cacheKey = 'agritech_weather_cache_v2';
        const cached = localStorage.getItem(cacheKey);
        let data = null;
        
        if (cached) {
            const parsedCache = JSON.parse(cached);
            if (Date.now() - parsedCache.timestamp < 3600000) {
                data = parsedCache.data;
            }
        }
        
        if (!data) {
            const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
            const defLat = localStorage.getItem('default_lat') || '23.8103';
            const defLon = localStorage.getItem('default_lon') || '90.4125';
            
            const res = await fetch(`${BASE_URL}/api/weather?lat=${defLat}&lon=${defLon}`);
            data = await res.json();
            
            if (data.success) {
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: Date.now(),
                    data: data
                }));
            }
        }
        
        if (data && data.success && data.current) {
            const tempEl = document.getElementById('kheroTemp');
            const condEl = document.getElementById('kheroCond');
            const iconEl = document.getElementById('kheroWeatherIcon');
            
            if (tempEl) {
                tempEl.textContent = Math.round(data.current.temp) + '°C';
                tempEl.classList.remove('skeleton');
                tempEl.style.width = 'auto';
                tempEl.style.height = 'auto';
            }
            if (condEl) {
                condEl.textContent = data.current.condition_bn || data.current.condition;
                condEl.classList.remove('skeleton');
                condEl.style.width = 'auto';
                condEl.style.height = 'auto';
            }
            
            if (iconEl && data.current.icon) {
                 iconEl.classList.remove('skeleton', 'skeleton-circle');
                 iconEl.style.width = 'auto';
                 iconEl.style.height = 'auto';
                 iconEl.innerHTML = `<img src="https://openweathermap.org/img/wn/${data.current.icon}.png" width="32" height="32" style="border-radius:50%;" />`;
            }
        }
    } catch (e) {
        console.error('Hero weather error:', e);
    }
}

async function loadFarms() {
    const token = localStorage.getItem('farmer_jwt');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
    const listContainer = document.getElementById('farmList');
    const emptyState = document.getElementById('emptyState');

    try {
        // Show loading skeletons
        listContainer.innerHTML = `
            <div class="skeleton skeleton-card" style="margin-bottom:16px;"></div>
            <div class="skeleton skeleton-card" style="margin-bottom:16px;"></div>
        `;

        const response = await fetch(`${BASE_URL}/api/farms`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            if (data.farms.length === 0) {
                emptyState.style.display = 'flex';
                listContainer.style.display = 'none';
            } else {
                emptyState.style.display = 'none';
                listContainer.style.display = 'flex';
                
                // Save the first farm's location as the global default for weather
                if (data.farms[0].latitude && data.farms[0].longitude) {
                    localStorage.setItem('default_lat', data.farms[0].latitude);
                    localStorage.setItem('default_lon', data.farms[0].longitude);
                }
                
                renderFarms(data.farms, listContainer);
            }
        } else {
            listContainer.innerHTML = `<p style="text-align: center; color: red;">এরর: ${data.error || 'ডেটা লোড করা যায়নি'}</p>`;
        }
    } catch (err) {
        console.error("Failed to fetch farms", err);
        listContainer.innerHTML = '<p style="text-align: center; color: red;">ইন্টারনেট সংযোগ চেক করুন</p>';
    }
}

function renderFarms(farms, container) {
    container.innerHTML = '';
    
    // Update Hero Subtitle
    const toBngDigits = (num) => String(num).split('').map(d => ({ '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' }[d] || d)).join('');
    let totalFarms = farms.length;
    let totalPendingGlobal = 0;
    farms.forEach(f => {
        (f.crops || []).forEach(crop => {
            const allT = JSON.parse(crop.tasks_state_json || '[]');
            allT.forEach(t => {
                const s = t.status || (t.is_completed ? 'completed' : 'pending');
                if (s === 'pending') totalPendingGlobal++;
            });
        });
    });
    
    const heroSub = document.getElementById('kheroSubtitle');
    if (heroSub) {
        if (totalFarms > 0) {
            heroSub.textContent = `আপনার ${toBngDigits(totalFarms)}টি জমিতে সর্বমোট ${toBngDigits(totalPendingGlobal)}টি কাজ বাকি আছে।`;
        } else {
            heroSub.textContent = 'আপনার এখনো কোনো জমি নেই। নিচে থেকে জমি যুক্ত করুন।';
        }
        heroSub.classList.remove('skeleton');
        heroSub.style.width = 'auto';
        heroSub.style.height = 'auto';
    }

    farms.forEach((farm, index) => {
        const dropId = `drop_${farm.id}`;
        const activeCrop = (farm.crops && farm.crops.length > 0) ? farm.crops[0] : null;

        // Define crop section markup depending on crop presence
        let cropHtml = ``;
        if (activeCrop) {
            let badgeClass = activeCrop.status === 'Diseased' ? 'danger' : (activeCrop.status === 'Warning' ? 'warning' : 'success');
            let statusText = activeCrop.status === 'Diseased' ? 'রোগাক্রান্ত' : (activeCrop.status === 'Warning' ? 'সতর্কতা' : 'হেলদি');

            // --- Dynamic Calculations ---
            let healthScore = 100;
            let nextTaskText = 'AI প্রোফাইল পর্যবেক্ষণ করছে';
            let nextTaskClass = 'success';
            let harvestText = 'তথ্য নেই';
            let progressWidth = 50;
            let progressStage = 'লাইভ';

            if (activeCrop.tasks_state_json) {
                try {
                    const allTasks = JSON.parse(activeCrop.tasks_state_json || '[]');
                    let totalTasks = 0;
                    let completedTasks = 0;
                    let missedTasks = 0;
                    let pendingTasks = [];
                    let maxDay = 0;
                    let sowingDate = farm.created_at;

                    allTasks.forEach(task => {
                        totalTasks++;
                        
                        const taskDateStr = task.due_date || task.date;
                        const taskTitleStr = task.title || task.task_name || 'অজ্ঞাত কাজ';
                        const taskStatus = task.status || (task.is_completed ? 'completed' : 'pending');
                        const taskDay = parseInt(task.day_offset || task.day || 0);

                        if (taskStatus === 'completed') {
                            completedTasks++;
                        } else if (taskStatus === 'pending') {
                            const tDate = new Date(taskDateStr);
                            tDate.setHours(23, 59, 59, 999);
                            if (new Date() > tDate) {
                                missedTasks++;
                            } else {
                                pendingTasks.push({
                                    title: taskTitleStr,
                                    due_date: taskDateStr
                                });
                            }
                        }
                        
                        if (taskDay > maxDay) maxDay = taskDay;
                        
                        if (taskTitleStr && (taskTitleStr.includes('বপন') || taskTitleStr.includes('রোপণ') || taskTitleStr.includes('রোপন'))) {
                            sowingDate = taskDateStr;
                        }
                    });

                    // Health Score Logic (Penalty for missed tasks or disease)
                    healthScore = 100 - (missedTasks * 5); 
                    if (activeCrop.status === 'Diseased') healthScore -= 30;
                    if (activeCrop.status === 'Warning') healthScore -= 15;
                    if (healthScore < 0) healthScore = 0;
                    if (healthScore > 100) healthScore = 100;

                    // Next Task Logic
                    if (pendingTasks.length > 0) {
                        // Sort by date ascending
                        pendingTasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
                        const nextTask = pendingTasks[0];
                        const tDate = new Date(nextTask.due_date);
                        tDate.setHours(0, 0, 0, 0);
                        const todayDate = new Date();
                        todayDate.setHours(0, 0, 0, 0);
                        const diffTime = tDate - todayDate;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 0) {
                             nextTaskText = 'আজকের কাজ: ' + nextTask.title;
                             nextTaskClass = 'warning';
                        } else {
                             nextTaskText = diffDays + ' দিন পর: ' + nextTask.title;
                             nextTaskClass = 'success';
                        }
                    } else if (missedTasks > 0) {
                        nextTaskText = 'কিছু কাজ মিস হয়েছে';
                        nextTaskClass = 'danger';
                    }

                    // Harvest Date Logic
                    if (sowingDate && maxDay > 0) {
                        const sDate = new Date(sowingDate);
                        sDate.setDate(sDate.getDate() + maxDay);
                        
                        const diffTime = sDate - new Date();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays > 0) {
                            harvestText = `আর ${diffDays} দিন`;
                            progressWidth = Math.min(100, Math.max(0, ((maxDay - diffDays) / maxDay) * 100));
                        } else {
                            harvestText = 'কর্তনের সময় হয়েছে';
                            progressWidth = 100;
                            progressStage = 'ম্যাচিউর';
                        }
                    }

                } catch (e) {
                    console.error("Error parsing tasks for farm", farm.id, e);
                }
            } else if (activeCrop.status === 'Diseased') {
                healthScore = 60;
                nextTaskText = 'পোকামাকড় স্ক্যান করুন';
                nextTaskClass = 'danger';
            }

            cropHtml = `
                <div class="premium-crop-section">
                    <div class="pcs-header">
                        <div class="pcs-image">
                            <img src="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&q=80&w=200&h=200" alt="${activeCrop.crop_name}">
                            <div class="pcs-health-badge ${healthScore >= 80 ? 'good' : (healthScore >= 50 ? 'avg' : 'bad')}">
                                <span class="material-icons-round">health_and_safety</span>
                                <span>${healthScore}%</span>
                            </div>
                        </div>
                        <div class="pcs-info">
                            <div class="pcs-title-row">
                                <h4 class="pcs-crop-name" title="${activeCrop.crop_name}">${activeCrop.crop_name}</h4>
                            </div>
                            <div class="pcs-harvest-info">
                                <div class="phi-left">
                                    <span class="material-icons-round">timer</span>
                                    <span>হারভেস্ট: ${harvestText}</span>
                                </div>
                                <div class="phi-right">
                                    <span class="pcs-status ${badgeClass}">${statusText}</span>
                                    <a href="weather_details.html?lat=${farm.lat || 23.8103}&lon=${farm.lng || 90.4125}" class="unified-weather-badge" id="weather_badge_${farm.id}">
                                        <span class="weather-icon">☁️</span> 
                                        <span class="weather-temp">--°</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pcs-progress">
                        <div class="pcs-progress-header">
                            <span class="pcs-progress-label">বৃদ্ধি পর্যায়</span>
                            <span class="pcs-progress-stage">${progressStage}</span>
                        </div>
                        <div class="pcs-progress-track">
                            <div class="pcs-progress-fill ${badgeClass}" style="width: ${progressWidth}%;"></div>
                        </div>
                    </div>
                    
                    <div class="pcs-next-task ${nextTaskClass}">
                        <div class="nt-icon">
                            <span class="material-icons-round">${nextTaskClass === 'danger' ? 'warning' : 'event'}</span>
                        </div>
                        <div class="nt-content">
                            <span class="nt-label">পরবর্তী কাজ</span>
                            <span class="nt-value">${nextTaskText}</span>
                        </div>
                        <div class="nt-arrow">
                            <span class="material-icons-round">chevron_right</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            cropHtml = `
                <div class="pcs-empty">
                    <div class="pcs-empty-icon">
                        <span class="material-icons-round">add_circle_outline</span>
                    </div>
                    <div class="pcs-empty-text">
                        <h4>খালি জমি</h4>
                        <p>নতুন ফসল রোপণ করে শুরু করুন</p>
                    </div>
                    <button class="pcs-btn-primary" onclick="window.location.href='add_crop.html?farm_id=${farm.id}'; event.stopPropagation();">
                        ফসল যুক্ত করুন
                    </button>
                </div>
            `;
        }

        const card = `
            <div class="farm-card premium-card" onclick="window.location.href='land_details.html?id=${farm.id}'">
                <div class="fc-header">
                    <div class="fc-title-group">
                        <div class="fc-title-inner">
                            <h3>${farm.name}</h3>
                            <span class="fc-area">${farm.area_shotangsho} শতক</span>
                        </div>
                    </div>
                    <div class="fc-actions-wrapper">
                        <button class="icon-btn-small" aria-label="Land Options" onclick="toggleDropdown(event, '${dropId}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                            </svg>
                        </button>
                        <div class="fc-dropdown" id="${dropId}">
                            <button class="fc-drop-item" onclick="window.location.href='add_crop.html?farm_id=${farm.id}'; event.stopPropagation();">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                নতুন ফসল যুক্ত করুন
                            </button>
                            <button class="fc-drop-item" onclick="renameFarm(${farm.id}, '${farm.name.replace(/'/g, "\\'")}'); event.stopPropagation();">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                জমির নাম পরিবর্তন
                            </button>
                            <button class="fc-drop-item danger" onclick="deleteFarm(${farm.id}); event.stopPropagation();">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                জমি বাতিল করুন
                            </button>
                        </div>
                    </div>
                </div>

                ${cropHtml}
            </div>
        `;
        container.innerHTML += card;
        
        // Fetch specific weather for this farm
        if (activeCrop) {
            fetchFarmWeather(farm.id, farm.lat, farm.lng);
        }
    });
}

async function fetchFarmWeather(farmId, lat, lon) {
    try {
        const fetchLat = lat || 23.8103;
        const fetchLon = lon || 90.4125;
        const cacheKey = `agritech_weather_v2_${fetchLat}_${fetchLon}`;
        let data = null;
        
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsedCache = JSON.parse(cached);
            if (Date.now() - parsedCache.timestamp < 3600000) {
                data = parsedCache.data;
            }
        }
        
        if (!data) {
            const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
            const res = await fetch(`${BASE_URL}/api/weather?lat=${fetchLat}&lon=${fetchLon}`);
            data = await res.json();
            if (data.success) {
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: Date.now(),
                    data: data
                }));
            }
        }
        
        if (data && data.success && data.current) {
            const badge = document.getElementById(`weather_badge_${farmId}`);
            if (badge) {
                const tempEl = badge.querySelector('.weather-temp');
                const iconEl = badge.querySelector('.weather-icon');
                if (tempEl) tempEl.textContent = Math.round(data.current.temp) + '°';
                if (iconEl) {
                    const iconCode = data.current.icon;
                    if (iconCode.includes('n')) iconEl.textContent = '🌙';
                    else if (['01d', '02d'].includes(iconCode)) iconEl.textContent = '☀️';
                    else if (['09d', '10d', '11d'].includes(iconCode)) iconEl.textContent = '🌧️';
                    else iconEl.textContent = '☁️';
                }
            }
        }
    } catch (e) {
        console.error('Farm weather error:', e);
    }
}

// --- Farm Actions ---
window.renameFarm = async function(id, currentName) {
    const newName = prompt("জমির নতুন নাম দিন:", currentName);
    if (!newName || newName === currentName) return;

    const token = localStorage.getItem('farmer_jwt');
    const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
    
    try {
        const res = await fetch(`${BASE_URL}/api/farms/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });
        const data = await res.json();
        if(data.success) {
            loadFarms();
        } else {
            alert('এরর: ' + data.error);
        }
    } catch(err) {
        alert('ইন্টারনেট সংযোগ চেক করুন');
    }
};

window.deleteFarm = async function(id) {
    if(!confirm("আপনি কি নিশ্চিত যে এই জমি ও এর সকল তথ্য মুছে ফেলতে চান?")) return;

    const token = localStorage.getItem('farmer_jwt');
    const BASE_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
    
    try {
        const res = await fetch(`${BASE_URL}/api/farms/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if(data.success) {
            loadFarms();
        } else {
            alert('এরর: ' + data.error);
        }
    } catch(err) {
        alert('ইন্টারনেট সংযোগ চেক করুন');
    }
};

