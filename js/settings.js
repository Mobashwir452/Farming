import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // Register components like header (if any used globally)
    registerComponents();

    // Elements
    const syncCard = document.getElementById('syncCard');
    const connBanner = document.getElementById('connBanner');
    const syncIconBox = document.getElementById('syncIconBox');
    const syncIcon = document.getElementById('syncIcon');
    const syncTitle = document.getElementById('syncTitle');
    const syncTimestamp = document.getElementById('syncTimestamp');
    const btnManualSync = document.getElementById('btnManualSync');

    // Simulate initial state
    let isOffline = !navigator.onLine;

    const updateOnlineStatus = () => {
        isOffline = !navigator.onLine;

        if (isOffline) {
            connBanner.className = 'conn-status-banner offline';
            connBanner.innerText = 'অফলাইনে আছেন';
            syncIconBox.className = 'sync-icon-container offline-mode';
            syncIcon.innerText = 'cloud_off';
            syncTitle.innerText = 'ইন্টারনেট সংযোগ বিচ্ছিন্ন';
            syncTitle.style.color = '#94A3B8';
            btnManualSync.disabled = true;
            btnManualSync.innerHTML = '<span class="material-icons-round" style="font-size: 18px;">cloud_off</span> সংযোগ নেই';
        } else {
            connBanner.className = 'conn-status-banner online';
            connBanner.innerText = 'অনলাইনে আছেন';
            syncIconBox.className = 'sync-icon-container';
            syncIcon.innerText = 'cloud_done';
            syncTitle.innerText = 'সকল ডেটা সিঙ্ক করা আছে';
            syncTitle.style.color = 'var(--text-main)';
            btnManualSync.disabled = false;
            btnManualSync.innerHTML = '<span class="material-icons-round" style="font-size: 18px;">sync</span> এখনই সিঙ্ক করুন';
        }
    };

    // Listen to network changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Init

    // Manual Sync Button Logic
    if (btnManualSync) {
        btnManualSync.addEventListener('click', () => {
            if (isOffline) {
                if (window.showToast) window.showToast('দয়া করে ইন্টারনেট সংযোগ চালু করুন।', 'error');
                return;
            }

            // Start Sync animation
            syncIconBox.classList.add('syncing');
            syncIcon.innerText = 'autorenew';
            syncTitle.innerText = 'ডেটা সিঙ্ক হচ্ছে...';
            btnManualSync.disabled = true;
            btnManualSync.innerText = 'অপেক্ষা করুন...';

            // Simulate API call delay
            setTimeout(() => {
                syncIconBox.classList.remove('syncing');
                syncIcon.innerText = 'check_circle';
                syncIconBox.style.color = '#059669'; // Dark green
                syncIconBox.style.background = '#D1FAE5';

                syncTitle.innerText = 'সিঙ্ক সম্পন্ন হয়েছে';

                const now = new Date();
                const timeString = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                syncTimestamp.innerText = `সর্বশেষ আপডেট: আজ, ${timeString}`;

                if (window.showToast) window.showToast('সকল ডেটা সফলভাবে ক্লাউডে সেভ হয়েছে।', 'success');

                // Revert button shortly after
                setTimeout(() => {
                    syncIcon.innerText = 'cloud_done';
                    syncIconBox.style.color = '';
                    syncIconBox.style.background = '';
                    syncTitle.innerText = 'সকল ডেটা সিঙ্ক করা আছে';

                    btnManualSync.disabled = false;
                    btnManualSync.innerHTML = '<span class="material-icons-round" style="font-size: 18px;">sync</span> এখনই সিঙ্ক করুন';
                }, 2500);

            }, 2000); // 2 seconds fake delay
        });
    }

    // Toggle Switches Handlers (Mock logic)
    const togglePush = document.getElementById('togglePush');
    const toggleSms = document.getElementById('toggleSms');
    const toggleAutoSync = document.getElementById('toggleAutoSync');

    const handleToggle = (el, featureName) => {
        if (!el) return;
        el.addEventListener('change', (e) => {
            const statusStr = e.target.checked ? 'চালু' : 'বন্ধ';
            if (window.showToast) {
                window.showToast(`${featureName} ${statusStr} করা হয়েছে।`, e.target.checked ? 'success' : 'info');
            }
        });
    };

    handleToggle(togglePush, 'নোটিফিকেশন');
    handleToggle(toggleSms, 'এসএমএস অ্যালার্ট');
    handleToggle(toggleAutoSync, 'অটো সিঙ্ক');

    // Language Modal Logic
    const btnChangeLang = document.getElementById('btnChangeLang');
    const langModal = document.getElementById('langModal');
    const closeLangModal = document.getElementById('closeLangModal');
    const langOptions = document.querySelectorAll('.lang-option');
    const currentLangDisp = document.getElementById('currentLangDisp');

    if (btnChangeLang && langModal) {
        btnChangeLang.addEventListener('click', () => {
            langModal.classList.add('active');
        });

        // Close logic
        const closeLM = () => {
            langModal.classList.remove('active');
        };

        if (closeLangModal) closeLangModal.addEventListener('click', closeLM);
        langModal.addEventListener('click', (e) => {
            if (e.target === langModal) closeLM();
        });

        langOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                // remove active from all
                langOptions.forEach(o => o.classList.remove('active'));
                // add active to clicked
                opt.classList.add('active');

                const lang = opt.getAttribute('data-lang');
                currentLangDisp.innerText = lang === 'bn' ? 'বাংলা' : 'English';

                setTimeout(() => {
                    closeLM();
                    if (window.showToast) window.showToast(`অ্যাপের ভাষা ${lang === 'bn' ? 'বাংলা' : 'English'} করা হয়েছে।`, 'success');
                }, 300);
            });
        });
    }

    // Clear Cache Button
    const btnClearCache = document.getElementById('btnClearCache');
    if (btnClearCache) {
        btnClearCache.addEventListener('click', () => {
            // Confirm Dialog mock
            const isConfirmed = confirm('আপনি কি নিশ্চিত যে ক্যাশ এবং স্টোরেজ ক্লিয়ার করতে চান? অফলাইন ডাটা সেভ না হয়ে থাকলে মুছে যেতে পারে।');
            if (isConfirmed) {
                // Clear localStorage for mock UI
                // localStorage.clear();

                if (window.showToast) {
                    window.showToast('ক্যাশ স্টোরেজ সফলভাবে রিফ্রেশ করা হয়েছে।', 'success');
                }
            }
        });
    }

});
