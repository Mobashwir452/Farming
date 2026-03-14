import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // Register generic components
    registerComponents();

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
            if (!nameObj.value.trim()) {
                if (window.showToast) window.showToast('দয়া করে নাম লিখুন।');
                return;
            }

            // Success animation
            btnSaveProfile.innerHTML = '<span class="material-icons-round" style="font-size:18px;margin-right:8px;vertical-align:middle;">check_circle</span> সংরক্ষিত হয়েছে';
            btnSaveProfile.style.background = '#059669'; // Darker green

            setTimeout(() => {
                closeBottomSheet(editProfileModal);

                // Update UI visually
                const userNameEl = document.querySelector('.user-name');
                if (userNameEl) {
                    userNameEl.innerHTML = `${nameObj.value} <span class="material-icons-round verified-badge" title="NID Verified">verified</span>`;
                }

                // Reset button
                setTimeout(() => {
                    btnSaveProfile.innerHTML = 'সংরক্ষণ করুন';
                    btnSaveProfile.style.background = '';
                    if (window.showToast) window.showToast('আপনার তথ্য সফলভাবে আপডেট হয়েছে।', 'success');
                }, 300);
            }, 1000);
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
