import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // Register generic components
    registerComponents();

    const EN_TO_BN_NUMBERS = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    const toBnNum = (str) => String(str).replace(/[0-9]/g, match => EN_TO_BN_NUMBERS[match]);
    const API_URL = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';

    async function loadUserProfile() {
        const token = localStorage.getItem('farmer_jwt');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success && data.farmer) {
                localStorage.setItem('farmer_profile', JSON.stringify(data.farmer));
                renderProfileInfo(data.farmer);
            }
        } catch (e) {
            console.error("Error loading profile", e);
            const cachedStr = localStorage.getItem('farmer_profile');
            if (cachedStr) {
                try { renderProfileInfo(JSON.parse(cachedStr)); } catch(err){}
            }
        }
    }

    function renderProfileInfo(farmer) {
        // Update standard user info
        document.getElementById('userNameDisplay').innerHTML = farmer.name;
        document.getElementById('editName').value = farmer.name;
        
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl && farmer.name) {
            avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(farmer.name)}&background=10b981&color=fff&size=150&bold=true`;
        }

        document.getElementById('userPhoneDisplay').textContent = toBnNum(farmer.phone);
        
        const editPhoneEl = document.getElementById('editPhone');
        if (editPhoneEl) {
            editPhoneEl.value = toBnNum(farmer.phone);
        }
        
        const addrDisplay = document.getElementById('userAddressDisplay');
        const editAddr = document.getElementById('editAddress');
        if (farmer.address) {
            addrDisplay.textContent = farmer.address;
            editAddr.value = farmer.address;
        } else {
            addrDisplay.textContent = 'ঠিকানা আপডেট করুন';
            editAddr.value = '';
        }

        const editEmail = document.getElementById('editEmail');
        if(editEmail) {
            editEmail.value = farmer.email || '';
        }

        // Subscription Stats
        const type = farmer.subscription_level || 'free';
        const txtEl = document.getElementById('subscriptionStatusText');
        if (txtEl) txtEl.textContent = type === 'free' ? 'ফ্রি ইউজার' : (type === 'ultra' ? 'আল্ট্রা ইউজার' : 'প্রো ইউজার');

        // Farm count (from API or fallback to localStorage)
        const totalLands = farmer.total_lands !== undefined ? farmer.total_lands : (localStorage.getItem('agritech_total_farms') || 0);
        const totalLandsCountEl = document.getElementById('totalLandsCount');
        if (totalLandsCountEl) totalLandsCountEl.textContent = `${toBnNum(totalLands)} টি`;

        // Render Dynamic Subscription Panel
        const panel = document.getElementById('subscriptionDetailsPanel');
        if (panel) {
            panel.style.display = 'block';
            let bgStyle = 'linear-gradient(135deg, #64748b, #475569)';
            let title = 'AgriTech Free';
            
            const calculateDaysLeft = (expiryDate) => {
                const now = new Date();
                const exp = new Date(expiryDate);
                const diffTime = exp - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            };

            const formatExpiryWithDays = (expiryDate) => {
                const d = new Date(expiryDate);
                const daysLeft = calculateDaysLeft(expiryDate);
                let daysLeftStr = '';
                if (daysLeft > 0) {
                    daysLeftStr = ` (আর ${toBnNum(daysLeft)} দিন বাকি)`;
                } else {
                    daysLeftStr = ' (মেয়াদ শেষ)';
                }
                return `মেয়াদ শেষ: ${toBnNum(d.getDate())}/${toBnNum(d.getMonth()+1)}/${toBnNum(d.getFullYear())}${daysLeftStr}`;
            };

            // Days until next month (for Free tier default)
            const getDaysUntilNextMonth = () => {
                const now = new Date();
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                const daysLeft = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));
                return daysLeft;
            };

            let expiryStr = '';
            if (farmer.pkg_duration_days && farmer.pkg_duration_days > 0) {
                expiryStr = `লিমিট রিসেট: প্রতি ${toBnNum(farmer.pkg_duration_days)} দিন পর পর`;
            } else if (farmer.pkg_duration_months && farmer.pkg_duration_months > 1) {
                 expiryStr = `লিমিট রিসেট: প্রতি ${toBnNum(farmer.pkg_duration_months)} মাস পর পর`;
            } else {
                 expiryStr = `লিমিট রিসেট হবে ১ তারিখে (আর ${toBnNum(getDaysUntilNextMonth())} দিন পর)`;
            }
            let btnText = 'আপগ্রেড করুন';

            if (type === 'pro') {
                bgStyle = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
                title = 'AgriTech Pro';
                btnText = 'প্যাকেজ দেখুন';
                if(farmer.subscription_expiry) {
                    expiryStr = formatExpiryWithDays(farmer.subscription_expiry);
                } else {
                    expiryStr = 'মেয়াদ: আজীবন (আনলিমিটেড)';
                }
            } else if (type === 'ultra') {
                bgStyle = 'linear-gradient(135deg, #8b5cf6, #5b21b6)';
                title = 'AgriTech Ultra';
                btnText = 'প্যাকেজ দেখুন';
                if(farmer.subscription_expiry) {
                    expiryStr = formatExpiryWithDays(farmer.subscription_expiry);
                } else {
                    expiryStr = 'মেয়াদ: আজীবন (আনলিমিটেড)';
                }
            }
            const formatLimit = (count, limit) => {
                if (limit === 'unlimited') return 'আনলিমিটেড';
                return `বাকি: ${toBnNum(count)} / ${toBnNum(limit)} টি`;
            };
            
            panel.style.background = bgStyle;

            document.getElementById('subPackageName').textContent = title;
            
            const actionBtn = document.querySelector('.upgrade-btn');
            if (actionBtn) {
                if (farmer.has_pending_payment) {
                    actionBtn.textContent = 'ভেরিফিকেশন পেন্ডিং';
                    actionBtn.style.color = '#d97706'; // Dark amber
                    actionBtn.style.background = '#fef3c7'; // Light amber bg
                    actionBtn.style.pointerEvents = 'none'; // Disable click
                    localStorage.setItem('agritech_pending_payment', 'true');
                } else {
                    localStorage.removeItem('agritech_pending_payment');
                    actionBtn.textContent = btnText;
                    actionBtn.style.pointerEvents = 'auto';
                    actionBtn.style.background = '#ffffff';
                    if (type === 'free') {
                        actionBtn.style.color = '#059669'; // Green from free theme
                    } else if (type === 'pro') {
                        actionBtn.style.color = '#1d4ed8'; // Blue from pro theme
                    } else if (type === 'ultra') {
                        actionBtn.style.color = '#5b21b6'; // Purple from ultra theme
                    }
                }
            }

            const subExpiryTextEl = document.getElementById('subExpiryText');
            if(subExpiryTextEl) {
                subExpiryTextEl.textContent = expiryStr;
            }

            document.getElementById('limitScans').textContent = formatLimit(farmer.ai_scan_count, farmer.ai_scan_limit);
            document.getElementById('limitTimeline').textContent = formatLimit(farmer.ai_timeline_count, farmer.ai_timeline_limit);
            document.getElementById('limitChat').textContent = formatLimit(farmer.ai_chat_count, farmer.ai_chat_limit);
        }
    }

    loadUserProfile();

    
    window.openPremiumModal = () => {
        const modal = document.getElementById('premiumModal');
        if (modal) modal.classList.add('active');
    };
    
    // Add payment submission logic
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitPayment');
            const msg = document.getElementById('paymentMessage');
            
            const method = document.getElementById('payMethod').value;
            const trxId = document.getElementById('payTrxId').value;
            const token = localStorage.getItem('farmer_jwt');
            
            btn.textContent = 'সাবমিট হচ্ছে...';
            btn.disabled = true;
            msg.textContent = '';
            msg.style.color = '#10b981';
            
            try {
                const res = await fetch(API_URL + '/api/auth/submit-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        payment_method: method,
                        trx_id: trxId,
                        amount_paid: 499
                    })
                });
                const data = await res.json();
                
                if (data.success) {
                    msg.textContent = data.message;
                    paymentForm.reset();
                    setTimeout(() => {
                        const modal = document.getElementById('premiumModal');
                        if(modal) modal.classList.remove('active');
                        msg.textContent = '';
                    }, 3000);
                } else {
                    msg.style.color = '#e2136e';
                    msg.textContent = data.error || 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে';
                }
            } catch(err) {
                msg.style.color = '#e2136e';
                msg.textContent = 'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।';
            } finally {
                btn.textContent = 'পেমেন্ট সাবমিট করুন';
                btn.disabled = false;
            }
        });
    }


    // 1. Logout Modal Logic
    const btnLogout = document.getElementById('btnLogout');
    const logoutModal = document.getElementById('logoutModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');

    // Open Modal
    if (btnLogout && logoutModal) {
        btnLogout.addEventListener('click', () => {
            logoutModal.classList.add('active');

            // Subtle animation for content
            const content = logoutModal.querySelector('.logout-content');
            if (content) {
                content.style.transform = 'scale(1)';
            }
        });
    }

    // Close Modal
    const closeModal = () => {
        if (logoutModal) {
            logoutModal.classList.remove('active');
            const content = logoutModal.querySelector('.logout-content');
            if (content) {
                content.style.transform = 'scale(0.95)';
            }
        }
    };

    if (btnCancelLogout) {
        btnCancelLogout.addEventListener('click', closeModal);
    }

    // Close on overlay click
    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                closeModal();
            }
        });
    }

    // 2. Profile Image Edit Mock
    const editImageBtn = document.querySelector('.edit-image-btn');
    if (editImageBtn) {
        editImageBtn.addEventListener('click', () => {
            if (window.showToast) {
                window.showToast('ছবি পরিবর্তনের অপশন শিঘ্রই চালু হবে।', 'info');
            }
        });
    }

    // 3. New Bottom Sheet Modals Logic (Edit Profile & Security)
    const btnEditProfileTop = document.getElementById('btnEditProfileTop');
    const btnEditProfileMenu = document.getElementById('btnEditProfileMenu');
    const btnSecurityMenu = document.getElementById('btnSecurityMenu');

    const editProfileModal = document.getElementById('editProfileModal');
    const securityModal = document.getElementById('securityModal');

    // Function to open a specific bottom sheet
    const openBottomSheet = (modalEl) => {
        if (modalEl) {
            modalEl.classList.add('active');
        }
    };

    // Function to close a specific bottom sheet
    const closeBottomSheet = (modalEl) => {
        if (modalEl) {
            modalEl.classList.remove('active');
        }
    };

    // Open Events
    if (btnEditProfileTop) btnEditProfileTop.addEventListener('click', () => openBottomSheet(editProfileModal));
    if (btnEditProfileMenu) btnEditProfileMenu.addEventListener('click', () => openBottomSheet(editProfileModal));
    if (btnSecurityMenu) btnSecurityMenu.addEventListener('click', () => openBottomSheet(securityModal));

    // Close buttons logic
    const closeBtns = document.querySelectorAll('.close-modal-btn');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = btn.getAttribute('data-close');
            if (modalId) {
                closeBottomSheet(document.getElementById(modalId));
            }
        });
    });

    // Close on overlay click for bottom sheets
    [editProfileModal, securityModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeBottomSheet(modal);
                }
            });
        }
    });

    // 4. Action Buttons (Save Profile & Change PIN)
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    const btnSaveSecurity = document.getElementById('btnSaveSecurity');

    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', () => {
            const nameObj = document.getElementById('editName');
            const addressObj = document.getElementById('editAddress');
            const emailObj = document.getElementById('editEmail');
            
            if (!nameObj.value.trim()) {
                if (window.showToast) window.showToast('দয়া করে নাম লিখুন।');
                return;
            }

            const newName = nameObj.value.trim();
            const newAddress = addressObj.value.trim();
            const newEmail = emailObj ? emailObj.value.trim() : null;
            const token = localStorage.getItem('farmer_jwt');

            btnSaveProfile.innerHTML = '<span class="material-icons-round" style="font-size:18px;margin-right:8px;vertical-align:middle;">autorenew</span> সংরক্ষণ হচ্ছে...';
            btnSaveProfile.disabled = true;

            fetch(API_URL + '/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ name: newName, address: newAddress, email: newEmail })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    btnSaveProfile.innerHTML = '<span class="material-icons-round" style="font-size:18px;margin-right:8px;vertical-align:middle;">check_circle</span> সংরক্ষিত হয়েছে';
                    btnSaveProfile.style.background = '#059669';
                    
                    localStorage.setItem('farmer_profile', JSON.stringify(data.user));
                    renderProfileInfo(data.user);

                    setTimeout(() => {
                        closeBottomSheet(editProfileModal);
                        btnSaveProfile.innerHTML = 'সংরক্ষণ করুন';
                        btnSaveProfile.style.background = '';
                        btnSaveProfile.disabled = false;
                        if (window.showToast) window.showToast('আপনার তথ্য সফলভাবে আপডেট হয়েছে।', 'success');
                    }, 1000);
                } else {
                    throw new Error(data.error || 'Failed to update');
                }
            })
            .catch(err => {
                btnSaveProfile.innerHTML = 'সংরক্ষণ করুন';
                btnSaveProfile.disabled = false;
                if (window.showToast) window.showToast('ত্রুটি: ' + err.message, 'error');
            });
        });
    }

    if (btnSaveSecurity) {
        btnSaveSecurity.addEventListener('click', () => {
            const currentPin = document.getElementById('currentPin').value;
            const newPin = document.getElementById('newPin').value;
            const confirmPin = document.getElementById('confirmPin').value;

            if (!currentPin || !newPin || !confirmPin) {
                if (window.showToast) window.showToast('দয়া করে সব ফিল্ড পূরণ করুন।');
                return;
            }
            if (newPin !== confirmPin) {
                if (window.showToast) window.showToast('নতুন পিন এবং কনফার্ম পিন মিলছে না।');
                return;
            }

            // Success animation
            btnSaveSecurity.innerHTML = '<span class="material-icons-round" style="font-size:18px;margin-right:8px;vertical-align:middle;">check_circle</span> পিন পরিবর্তিত';
            btnSaveSecurity.style.background = '#059669'; // Darker green

            setTimeout(() => {
                closeBottomSheet(securityModal);

                // Reset Form and button
                setTimeout(() => {
                    document.getElementById('currentPin').value = '';
                    document.getElementById('newPin').value = '';
                    document.getElementById('confirmPin').value = '';

                    btnSaveSecurity.innerHTML = 'পিন পরিবর্তন করুন';
                    btnSaveSecurity.style.background = '';
                    if (window.showToast) window.showToast('আপনার নিরাপত্তা পিন সফলভাবে পরিবর্তন করা হয়েছে।', 'success');
                }, 300);
            }, 1000);
        });
    }
});

// Fetch Payment Settings
const storedApiUrl = localStorage.getItem('API_URL') || 'https://agritech-backend.mobashwir9.workers.dev';
fetch(storedApiUrl + '/api/payment-settings').then(r => r.json()).then(d => {
    if (d.success && d.data) {
        const bkashEl = document.getElementById('instructionBkashNumber');
        const nagadEl = document.getElementById('instructionNagadNumber');
        if (bkashEl && d.data.bkash) bkashEl.textContent = 'বিকাশ: ' + d.data.bkash;
        if (nagadEl && d.data.nagad) { nagadEl.style.display = 'block'; nagadEl.textContent = 'নগদ: ' + d.data.nagad; }
    }
}).catch(e => console.error(e));
