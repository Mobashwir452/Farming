// Reusable Web Components for AgriTech Application
// Employs modular ES/Vanilla JS architecture

class AppHeader extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
        <header class="global-header">
            <a href="index.html" class="logo">
                <div class="logo-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4h-2l3-6v4h2l-3 6z"/>
                    </svg>
                </div>
                AgriTech
            </a>
            <div class="nav-right">
                <nav class="nav-links">
                    <a href="index.html#features">সুবিধাসমূহ</a>
                    <a href="index.html#how-it-works">কিভাবে কাজ করে</a>
                    <a href="index.html#about">আমাদের সম্পর্কে</a>
                </nav>
                <a href="login.html" class="btn-primary btn-login">লগইন করুন</a>
                <!-- Mobile Menu Toggle -->
                <button class="mobile-menu-toggle" aria-label="Toggle menu">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </div>
        </header>
        `;

        // Mobile menu toggle logic
        const toggleBtn = this.querySelector('.mobile-menu-toggle');
        const navLinks = this.querySelector('.nav-links');

        if (toggleBtn && navLinks) {
            toggleBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
    }
}

class AppFooter extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
        <footer class="global-footer">
            <div class="footer-content">
                <div class="footer-brand">
                    <div class="logo" style="margin-bottom: 16px;">
                        <div class="logo-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4h-2l3-6v4h2l-3 6z"/>
                            </svg>
                        </div>
                        AgriTech
                    </div>
                    <p>আধুনিক কৃষিতে আপনার নির্ভরযোগ্য বিশ্বস্ত সঙ্গী। জিরো-টাইপিং এবং আপনার ভাষায় সম্পূর্ণ ডিজিটাল খামার ব্যবস্থাপনা।</p>
                </div>
                <div class="footer-links">
                    <h4>গুরুত্বপূর্ণ লিংক</h4>
                    <a href="index.html#features">সুবিধাসমূহ</a>
                    <a href="index.html#how-it-works">কিভাবে কাজ করে</a>
                    <a href="#">প্রাইভেসি পলিসি</a>
                </div>
                <div class="footer-contact">
                    <h4>যোগাযোগ</h4>
                    <p>হেল্পলাইন: ১৬১৬২</p>
                    <p>ইমেইল: support@agritech.bd</p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 AgriTech South Asia. All rights reserved.</p>
            </div>
        </footer>
        `;
    }
}

class AppDashHeader extends HTMLElement {
    constructor() { super(); }
    connectedCallback() {
        this.innerHTML = `
        <header class="dash-header">
            <div class="dh-left">
                <button class="menu-btn" id="openSidebar" aria-label="Open menu">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <div class="dh-brand">
                    <div class="logo-icon small">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 20A7 7 0 0 1 4 13V4h9a7 7 0 0 1 7 7v9h-9Z"></path>
                            <path d="M4 20L11 13"></path>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="dh-right">
                <a href="weather_details.html" class="weather-widget" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:4px;">
                    <span class="weather-icon">☀️</span>
                    <span class="weather-temp">৩২°</span>
                </a>
                <button class="notification-btn">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span class="badge">২</span>
                </button>
            </div>
        </header>

        <!-- Weather Bottom Sheet Modal -->
        <div class="calendar-modal" id="weatherModal" style="z-index: 1002;">
            <div class="calendar-content">
                <div class="calendar-header">
                    <h4>আগামী ৫ দিনের আবহাওয়া</h4>
                    <button class="close-modal" id="closeWeatherModal" aria-label="Close modal">&times;</button>
                </div>
                <div class="calendar-body" style="padding: 0;">
                    <div class="weather-day-item">
                        <span class="w-day">আজ</span>
                        <span class="w-icon">☀️</span>
                        <span class="w-temp">৩২° / ২৪°</span>
                    </div>
                    <div class="weather-day-item">
                        <span class="w-day">আগামীকাল</span>
                        <span class="w-icon">🌤️</span>
                        <span class="w-temp">৩১° / ২৩°</span>
                    </div>
                    <div class="weather-day-item">
                        <span class="w-day">শনিবার</span>
                        <span class="w-icon">🌧️</span>
                        <span class="w-temp">২৮° / ২২°</span>
                    </div>
                    <div class="weather-day-item">
                        <span class="w-day">রবিবার</span>
                        <span class="w-icon">🌦️</span>
                        <span class="w-temp">২৯° / ২৩°</span>
                    </div>
                    <div class="weather-day-item">
                        <span class="w-day">সোমবার</span>
                        <span class="w-icon">☀️</span>
                        <span class="w-temp">৩৩° / ২৫°</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Notification Drawer -->
        <div class="notification-drawer" id="notifDrawer">
            <div class="notif-header">
                <h4>নোটিফিকেশন</h4>
                <button class="close-modal" id="closeNotifDrawer" aria-label="Close notifications">&times;</button>
            </div>
            <div class="notif-body">
                <div class="notif-item unread">
                    <p><strong>নতুন আপডেট:</strong> আপনার ইউরিয়া সারের ডেলিভারি সম্পন্ন হয়েছে।</p>
                    <span class="notif-time">১০ মিনিট আগে</span>
                </div>
                <div class="notif-item unread">
                    <p><strong>সতর্কতা:</strong> আগামী ২ দিন বৃষ্টি হতে পারে। সেচ দেওয়া থেকে বিরত থাকুন।</p>
                    <span class="notif-time">১ ঘন্টা আগে</span>
                </div>
                <div class="notif-item">
                    <p><strong>হিসাব:</strong> আপনার টমেটো বিক্রির ৯৩,২০০ টাকা খাতায় যোগ করা হয়েছে।</p>
                    <span class="notif-time">গতকাল</span>
                </div>
            </div>
        </div>
        `;

        // --- Sidebar ---
        const openBtn = this.querySelector('#openSidebar');
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                const sidebar = document.querySelector('#dashboardSidebar');
                const overlay = document.querySelector('#sidebarOverlay');
                if (sidebar && overlay) {
                    sidebar.classList.add('open');
                    overlay.classList.add('open');
                }
            });
        }

        // --- Weather Interactions ---
        const weatherBtn = this.querySelector('.weather-widget');
        const weatherModal = this.querySelector('#weatherModal');
        const closeWeatherModal = this.querySelector('#closeWeatherModal');

        if (weatherBtn && weatherModal) {
            weatherBtn.addEventListener('click', () => {
                weatherModal.classList.add('active');
            });
        }
        if (closeWeatherModal) {
            closeWeatherModal.addEventListener('click', () => {
                weatherModal.classList.remove('active');
            });
        }
        if (weatherModal) {
            weatherModal.addEventListener('click', (e) => {
                if (e.target === weatherModal) weatherModal.classList.remove('active');
            });
        }

        // --- Notification Interactions ---
        const notifBtn = this.querySelector('.notification-btn');
        const notifDrawer = this.querySelector('#notifDrawer');
        const closeNotifDrawer = this.querySelector('#closeNotifDrawer');
        // Reusing sidebar overlay for notification drawer

        if (notifBtn && notifDrawer) {
            notifBtn.addEventListener('click', () => {
                notifDrawer.classList.add('open');
                const overlay = document.querySelector('#sidebarOverlay');
                if (overlay) overlay.classList.add('open');
            });
        }

        const closeDrawer = () => {
            if (notifDrawer) notifDrawer.classList.remove('open');
            const overlay = document.querySelector('#sidebarOverlay');
            // Check if sidebar is open, if not, hide overlay
            const sidebar = document.querySelector('#dashboardSidebar');
            if (overlay && (!sidebar || !sidebar.classList.contains('open'))) {
                overlay.classList.remove('open');
            }
        };

        if (closeNotifDrawer) {
            closeNotifDrawer.addEventListener('click', closeDrawer);
        }

        // Ensure overlay can close notification drawer too
        // Since overlay is outside this component, we can use a small hack or let AppSidebar handle it.
        // Let's add an event listener to overlay generically in AppSidebar to close all modals.
    }
}

class AppSidebar extends HTMLElement {
    constructor() { super(); }
    connectedCallback() {
        this.innerHTML = `
        <div class="sidebar-overlay" id="sidebarOverlay"></div>
        <aside class="dashboard-sidebar" id="dashboardSidebar">
            <div class="sidebar-header">
                <a href="profile.html" class="user-profile" style="text-decoration: none; color: inherit;">
                    <div class="user-avatar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <div class="user-info">
                        <h3>রহিম মিয়া</h3>
                        <p>বগুড়া, রাজশাহী</p>
                    </div>
                </a>
                <button class="close-sidebar" id="closeSidebar">✕</button>
            </div>
            <div class="sidebar-menu">
                <a href="crop_doctor.html" class="s-menu-item">
                    <span class="s-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                            <circle cx="12" cy="13" r="3"></circle>
                        </svg>
                    </span>
                    <span>কৃষি স্ক্যানার (Pest Scouting)</span>
                </a>
                <a href="community.html" class="s-menu-item">
                    <span class="s-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </span>
                    <span>কমিউনিটি ও হেল্পডেস্ক</span>
                </a>
                <a href="tasks.html" class="s-menu-item">
                    <span class="s-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                    </span>
                    <span>কাজের টাইমলাইন</span>
                </a>
                <a href="transactions.html" class="s-menu-item">
                    <span class="s-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                            <line x1="2" y1="10" x2="22" y2="10"></line>
                        </svg>
                    </span>
                    <span>লেনদেন ও হিসাব</span>
                </a>
                <a href="settings.html" class="s-menu-item">
                    <span class="s-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                    </span>
                    <span>অফলাইন সিঙ্ক ও সেটিংস</span>
                    <span class="status-badge green">অনলাইন</span>
                </a>
                <a href="settings.html" class="s-menu-item">
                    <span class="s-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    </span>
                    <span>ভাষা (Language)</span>
                    <span class="status-badge">BN</span>
                </a>
                <a href="#" class="s-menu-item">
                    <span class="s-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                    </span>
                    <span>হেল্পলাইন: ১৬১৬২</span>
                </a>
            </div>
            <div class="sidebar-footer">
                <a href="index.html" class="s-menu-item text-danger">
                    <span class="s-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </span>
                    <span>লগআউট</span>
                </a>
            </div>
        </aside>
        `;

        const closeBtn = this.querySelector('#closeSidebar');

        // This overlay is now global to sidebar and notification drawer
        const overlay = this.querySelector('#sidebarOverlay');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const sidebar = document.querySelector('#dashboardSidebar');
                if (sidebar) sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('open');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                // Close sidebar
                const sidebar = document.querySelector('#dashboardSidebar');
                if (sidebar) sidebar.classList.remove('open');

                // Close Notification Drawer (if present globally inside app-dash-header)
                const notifDrawer = document.querySelector('#notifDrawer');
                if (notifDrawer) notifDrawer.classList.remove('open');

                // Hide overlay
                overlay.classList.remove('open');
            });
        }
    }
}

class AppBottomNav extends HTMLElement {
    constructor() { super(); }
    connectedCallback() {
        this.innerHTML = `
        <nav class="bottom-nav">
            <a href="dashboard.html" class="b-n-item" data-page="dashboard.html">
                <div class="b-n-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </div>
                <span>হোম</span>
            </a>
            <a href="khamar.html" class="b-n-item" data-page="khamar.html">
                <div class="b-n-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13V4h9a7 7 0 0 1 7 7v9h-9Z"></path><path d="M4 20L11 13"></path></svg>
                </div>
                <span>খামার</span>
            </a>
            <div class="b-n-item center-scan">
                <button class="btn-scan" aria-label="Scan Crop" onclick="window.location.href='crop_doctor.html'">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#064E3B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                        <circle cx="12" cy="13" r="3"></circle>
                    </svg>
                </button>
                <span class="scan-text">স্ক্যান</span>
            </div>
            <a href="tasks.html" class="b-n-item" data-page="tasks.html">
                <div class="b-n-icon" style="position: relative;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <!-- Notification Badge -->
                    <span style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: #EF4444; border-radius: 50%; border: 1.5px solid white;"></span>
                </div>
                <span>টাস্ক</span>
            </a>
            <a href="hishab.html" class="b-n-item" data-page="hishab.html">
                <div class="b-n-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                </div>
                <span>হিসাব</span>
            </a>
        </nav>
        `;

        // Highlight active nav item based on current page URL
        const currentPath = window.location.pathname;
        const navItems = this.querySelectorAll('.b-n-item[data-page]');

        let isHome = true; // Default to home

        navItems.forEach(item => {
            const pageName = item.getAttribute('data-page');

            // Highlight khamar nav items for land_details, add_land, land_history
            if (currentPath.includes('khamar') || currentPath.includes('land_details') || currentPath.includes('land_history') || currentPath.includes('add_land')) {
                if (pageName === 'khamar.html') {
                    item.classList.add('active');
                    isHome = false;
                }
            }
            // Highlight tasks for tasks.html
            else if (currentPath.includes('tasks') && pageName === 'tasks.html') {
                item.classList.add('active');
                isHome = false;
            }
            // Highlight hishab for transactions.html and hishab.html
            else if ((currentPath.includes('hishab') || currentPath.includes('transactions')) && pageName === 'hishab.html') {
                item.classList.add('active');
                isHome = false;
            }
            else if (currentPath.includes(pageName)) {
                item.classList.add('active');
                isHome = false;
            } else {
                item.classList.remove('active');
            }
        });

        // Ensure home is set if we couldn't figure it out
        if (isHome && !currentPath.includes('khamar') && !currentPath.includes('land_details') && !currentPath.includes('add_land') && !currentPath.includes('tasks') && !currentPath.includes('hishab') && !currentPath.includes('transactions')) {
            const homeBtn = this.querySelector('[data-page="dashboard.html"]');
            if (homeBtn) homeBtn.classList.add('active');
        }
    }
}

// Export custom elements definition function
export function registerComponents() {
    if (!customElements.get('app-header')) {
        customElements.define('app-header', AppHeader);
    }
    if (!customElements.get('app-footer')) {
        customElements.define('app-footer', AppFooter);
    }
    if (!customElements.get('app-dash-header')) {
        customElements.define('app-dash-header', AppDashHeader);
    }
    if (!customElements.get('app-sidebar')) {
        customElements.define('app-sidebar', AppSidebar);
    }
    if (!customElements.get('app-bottom-nav')) {
        customElements.define('app-bottom-nav', AppBottomNav);
    }
}

// Global Toast System for UX
window.showToast = function (message) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: #1E293B;
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 500;
            z-index: 9999;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            white-space: nowrap;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;

    // Animate In
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    }, 10);

    // Animate Out
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        toast.style.opacity = '0';
    }, 3000);
}

// Global Paywall Modal System
window.showPaywallModal = function (featureName = 'এই ফিচারটি') {
    let modal = document.getElementById('global-paywall-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-paywall-modal';
        modal.className = 'calendar-modal active'; // utilizing existing modal styles
        modal.style.zIndex = '10005';
        
        modal.innerHTML = `
            <div class="calendar-content" style="max-height: 90vh; overflow-y: auto; padding: 0; border-radius: 20px; overflow: hidden; background: white;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; position: relative;">
                    <button class="close-modal" aria-label="Close modal" onclick="window.closePaywallModal()" style="position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.2); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
                    <h4 style="margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px;">লিমিট শেষ! <span class="material-icons-round" style="color: #fbbf24; font-size: 24px;">error_outline</span></h4>
                    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; padding-right: 40px;"><span id="paywallFeatureName" style="font-weight: 600;">এই ফিচারটি</span> ব্যবহারের লিমিট শেষ। আনলিমিটেড এক্সেস পেতে আপগ্রেড করুন।</p>
                </div>
                <div style="padding: 20px; text-align: left;">
                    <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
                        <li style="margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; gap: 8px;"><span class="material-icons-round" style="color: #10b981; font-size: 18px;">check_circle</span> আনলিমিটেড AI স্ক্যান ও স্প্যাম ফ্রি চ্যাট</li>
                        <li style="margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; gap: 8px;"><span class="material-icons-round" style="color: #10b981; font-size: 18px;">check_circle</span> আনলিমিটেড স্মার্ট ক্রপ প্ল্যান জেনারেশন</li>
                        <li style="margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; gap: 8px;"><span class="material-icons-round" style="color: #10b981; font-size: 18px;">check_circle</span> এক্সক্লুসিভ ২৪/৭ এগ্রিকালচার স্পেশালিস্ট সাপোর্ট</li>
                    </ul>
                    
                    <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #059669;">
                        <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">কিভাবে সাবস্ক্রাইব করবেন?</p>
                        <p style="margin: 0; font-size: 13px; color: #475569;">নিচের নম্বরে <strong>৳৪৯৯</strong> সেন্ড মানি করে ফর্মটি পূরণ করুন:</p>
                        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
                            <span id="globalInstructionBkashNumber" style="background: #e2136e; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; width: fit-content;">বিকাশ: لوڈ হচ্ছে...</span>
                            <span id="globalInstructionNagadNumber" style="background: #f97316; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; width: fit-content; display: none;">নগদ: لوڈ হচ্ছে...</span>
                        </div>
                    </div>
                    
                    <h5 style="margin: 0 0 12px 0; font-size: 15px;">পেমেন্ট ইনফরমেশন</h5>
                    <form id="globalPaymentForm">
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                            <label style="font-size: 13px; font-weight: 600; color: #334155;">পেমেন্ট মেথড</label>
                            <select id="globalPayMethod" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;" required>
                                <option value="bkash">বিকাশ (bKash)</option>
                                <option value="nagad">নগদ (Nagad)</option>
                            </select>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                            <label style="font-size: 13px; font-weight: 600; color: #334155;">TrxID</label>
                            <input type="text" id="globalPayTrxId" placeholder="e.g. 9GH3K8L" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;" required>
                        </div>
                        <button type="submit" id="btnSubmitGlobalPayment" style="width: 100%; padding: 14px; background: #10b981; color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 15px; cursor: pointer; transition: 0.2s;">পেমেন্ট সাবমিট করুন</button>
                        <div id="globalPaymentMessage" style="color: #e2136e; font-size: 12px; text-align: center; margin-top: 8px;"></div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Form Logic
        setTimeout(() => {
            const submitBtn = document.getElementById('btnSubmitGlobalPayment');
            const methodSelect = document.getElementById('globalPayMethod');
            const trxInput = document.getElementById('globalPayTrxId');

            if (submitBtn) {
                if (localStorage.getItem('agritech_pending_payment') === 'true') {
                    submitBtn.textContent = 'আপনার রিকোয়েস্ট পেন্ডিং আছে';
                    submitBtn.style.background = '#d97706';
                    submitBtn.disabled = true;
                    if(methodSelect) methodSelect.disabled = true;
                    if(trxInput) trxInput.disabled = true;
                } else {
                    submitBtn.textContent = 'পেমেন্ট সাবমিট করুন';
                    submitBtn.style.background = '#10b981';
                    submitBtn.disabled = false;
                    if(methodSelect) methodSelect.disabled = false;
                    if(trxInput) trxInput.disabled = false;
                }
            }

            const globalPaymentForm = document.getElementById('globalPaymentForm');
            if (globalPaymentForm) {
                globalPaymentForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = document.getElementById('btnSubmitGlobalPayment');
                    const msg = document.getElementById('globalPaymentMessage');
                    const method = document.getElementById('globalPayMethod').value;
                    const trxId = document.getElementById('globalPayTrxId').value;
                    const token = localStorage.getItem('farmer_jwt');
                    
                    btn.textContent = 'সাবমিট হচ্ছে...'; btn.disabled = true;
                    msg.textContent = ''; msg.style.color = '#10b981';
                    
                    const API_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
                    try {
                        const res = await fetch(API_URL + '/api/auth/submit-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                            body: JSON.stringify({ payment_method: method, trx_id: trxId, amount_paid: 499 })
                        });
                        const data = await res.json();
                        if (data.success) {
                            msg.textContent = data.message;
                            globalPaymentForm.reset();
                            setTimeout(() => { window.closePaywallModal(); }, 3000);
                        } else {
                            msg.style.color = '#e2136e';
                            msg.textContent = data.error || 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে';
                        }
                    } catch(err) {
                        msg.style.color = '#e2136e';
                        msg.textContent = 'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।';
                    } finally {
                        btn.textContent = 'পেমেন্ট সাবমিট করুন'; btn.disabled = false;
                    }
                });
            }
            
            // Fetch Payment Settings
            const API_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
            fetch(API_URL + '/api/payment-settings')
                .then(r => r.json())
                .then(d => {
                    if (d.success && d.data) {
                        const bkashEl = document.getElementById('globalInstructionBkashNumber');
                        const nagadEl = document.getElementById('globalInstructionNagadNumber');
                        if (bkashEl && d.data.bkash) {
                            bkashEl.textContent = 'বিকাশ: ' + d.data.bkash;
                        }
                        if (nagadEl && d.data.nagad) {
                            nagadEl.style.display = 'block';
                            nagadEl.textContent = 'নগদ: ' + d.data.nagad;
                        }
                    }
                })
                .catch(e => console.error('Failed to fetch payment settings:', e));
                
        }, 100);

        // Add minimal CSS for active state just in case
        if(!document.getElementById('paywall-css')){
            const style = document.createElement('style');
            style.id = 'paywall-css';
            style.innerHTML = `
                #global-paywall-modal { display: none; }
                #global-paywall-modal.active { display: flex; }
            `;
            document.head.appendChild(style);
        }
    }

    
    document.getElementById('paywallFeatureName').innerText = featureName;
    modal.classList.add('active');
}

window.closePaywallModal = function () {
    const modal = document.getElementById('global-paywall-modal');
    if (modal) modal.classList.remove('active');
}

// Global Error Handler to seamlessly trigger Paywall
window.handleApiError = function (errorData, featureName) {
    if (errorData.error && (errorData.error.toLowerCase().includes('payment required') || errorData.error.toLowerCase().includes('limit exceeded') || errorData.error.toLowerCase().includes('limit reached'))) {
        window.showPaywallModal(featureName);
    } else {
        window.showToast(errorData.error || 'একটি ত্রুটি হয়েছে। আবার চেষ্টা করুন।');
    }
}
