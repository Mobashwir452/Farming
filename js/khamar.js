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

    // 3. Fetch Farms dynamically
    loadFarms();
});

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
        // Show loading state implicitly by clearing the container
        listContainer.innerHTML = '<p style="text-align: center; padding: 20px;">লোড হচ্ছে...</p>';

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
    farms.forEach((farm, index) => {
        const dropId = `drop_${farm.id}`;

        // Define crop section markup depending on crop presence
        let cropHtml = ``;
        if (farm.crop_name) {
            let badgeClass = farm.crop_status === 'Healthy' ? '' : 'danger';
            let statusText = farm.crop_status === 'Healthy' ? 'হেলদি' : (farm.crop_status === 'Warning' ? 'সতর্কতা' : 'রোগাক্রান্ত');

            cropHtml = `
                <div class="fc-crop-info">
                    <div class="crop-image">
                        <img src="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&q=80&w=200&h=200" alt="${farm.crop_name}">
                    </div>
                    <div class="crop-details">
                        <div class="crop-name-row">
                            <h4 class="crop-name">${farm.crop_name}</h4>
                            <span class="crop-badge ${badgeClass}">${statusText}</span>
                        </div>
                        <div class="crop-progress-container">
                            <div class="progress-info">
                                <span class="progress-text">চলমান ফসল</span>
                                <span class="progress-stage">লাইভ</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill ${badgeClass}" style="width: 50%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            cropHtml = `
                <div class="fc-empty-crop">
                    <div class="empty-crop-content">
                        <div class="empty-crop-icon">🌱</div>
                        <div class="empty-crop-text">
                            <h4>খালি জমি</h4>
                            <p>বর্তমানে কোনো ফসল নেই</p>
                        </div>
                    </div>
                    <button class="btn-outline-primary full-width" onclick="window.location.href='add_crop.html?farm_id=${farm.id}'; event.stopPropagation();">+ নতুন ফসল রোপণ করুন</button>
                </div>
            `;
        }

        const card = `
            <div class="farm-card" onclick="window.location.href='land_details.html?id=${farm.id}'">
                <div class="fc-header">
                    <div class="fc-title-group">
                        <div class="fc-title-inner">
                            <h3>${farm.name}</h3>
                            <span class="fc-area">${farm.area_shotangsho} শতাংশ</span>
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

                <div class="fc-footer">
                    ${farm.crop_name ? `
                        <div class="fc-cta ${farm.crop_status !== 'Healthy' ? 'danger' : ''}">
                            <div class="status-indicator ${farm.crop_status !== 'Healthy' ? 'danger' : ''}"></div>
                            <span class="cta-text">AI প্রোফাইল পর্যবেক্ষণ করছে</span>
                        </div>
                    ` : `
                        <div class="fc-cta">
                            <span class="cta-text">জমি প্রস্তুত করুন</span>
                        </div>
                    `}
                    <div class="fc-action">
                        <span>টাইমলাইন</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
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

