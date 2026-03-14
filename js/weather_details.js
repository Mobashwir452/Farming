import { registerComponents } from './components.js';

registerComponents();

document.addEventListener('DOMContentLoaded', () => {
    // 1. Pull to Refresh Logic (Simulated)
    const mainArea = document.getElementById('weather-main');
    const ptrIndicator = document.getElementById('ptr-indicator');

    let startY = 0;
    let dist = 0;
    const threshold = 60; // minimum distance to trigger refresh

    mainArea.addEventListener('touchstart', (e) => {
        // Only allow pull-to-refresh when at the top of the scrollable area
        if (mainArea.scrollTop === 0) {
            startY = e.touches[0].clientY;
        }
    });

    mainArea.addEventListener('touchmove', (e) => {
        if (startY === 0) return; // Not at top

        const currentY = e.touches[0].clientY;
        dist = currentY - startY;

        if (dist > 0 && dist < 100) {
            // Apply visual resistance
            ptrIndicator.style.height = `${dist}px`;
            if (dist > threshold) {
                ptrIndicator.classList.add('active');
            }
        }
    });

    mainArea.addEventListener('touchend', () => {
        if (dist > threshold) {
            // Trigger refresh
            refreshWeatherData();
        } else {
            // Cancel
            ptrIndicator.classList.remove('active');
            ptrIndicator.style.height = '0';
        }

        // Reset
        startY = 0;
        dist = 0;
    });

    function refreshWeatherData() {
        ptrIndicator.classList.add('active');
        ptrIndicator.style.height = '60px';

        // Simulate API delay
        setTimeout(() => {
            ptrIndicator.classList.remove('active');
            ptrIndicator.style.height = '0';
            showToast('আবহাওয়ার তথ্য আপডেট করা হয়েছে', 'success');
        }, 1500);
    }

    // 2. Edit Location Logic
    const editLocationBtn = document.querySelector('.edit-location-btn');
    if (editLocationBtn) {
        editLocationBtn.addEventListener('click', () => {
            // Simulate prompting for new location
            const currentLoc = document.querySelector('.header-location span:nth-child(2)').innerText;
            const newLoc = prompt("নতুন লোকেশন লিখুন:", currentLoc);

            if (newLoc && newLoc.trim() !== "") {
                document.querySelector('.header-location span:nth-child(2)').innerText = newLoc.trim();
                showToast('লোকেশন পরিবর্তন করা হয়েছে। নতুন ডাটা ফেচ করা হচ্ছে...', 'info');
                // Trigger refresh visually
                setTimeout(refreshWeatherData, 500);
            }
        });
    }
});
