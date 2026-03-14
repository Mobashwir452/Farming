import { registerComponents } from './components.js';

registerComponents();

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab Switching Logic
    const tabs = document.querySelectorAll('.com-tab');
    const contents = document.querySelectorAll('.com-tab-content');
    const fabAskExpert = document.getElementById('btnAskExpert');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active class to selected
            tab.classList.add('active');
            const targetId = `tab-${tab.getAttribute('data-tab')}`;
            document.getElementById(targetId).classList.add('active');

            // FAB visibility logic
            if (tab.getAttribute('data-tab') === 'helpdesk') {
                fabAskExpert.style.display = 'flex';
                // Trigger animation
                fabAskExpert.style.animation = 'fadeIn 0.3s ease';
            } else {
                fabAskExpert.style.display = 'none';
            }
        });
    });

    // 2. Interaction Buttons inside Community Tab
    const likeButtons = document.querySelectorAll('.interaction-btn');
    likeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.currentTarget.innerText.includes('শেয়ার') || e.currentTarget.innerText.includes('মতামত')) {
                window.showToast('এই ফাংশনটি এখনো তৈরি করা হয়নি!', 'info');
                return;
            }

            // Toggle Like logic
            const isActive = e.currentTarget.classList.toggle('active');
            const iconSpan = e.currentTarget.querySelector('.material-icons-round');
            let countTxt = e.currentTarget.innerText.replace(/[^0-9]/g, '');
            let count = parseInt(countTxt) || 13;
            if (isActive) {
                count += 1;
            } else {
                count -= 1;
            }
            e.currentTarget.innerHTML = `<span class="material-icons-round">${iconSpan.textContent}</span> ${count}`;
        });
    });

    // 3. Ask Expert Modal Logic
    const expertModal = document.getElementById('expertModal');
    const closeExpertModal = document.getElementById('closeExpertModal');
    const submitAskExpert = document.getElementById('submitAskExpert');

    // Open Modal
    fabAskExpert.addEventListener('click', () => {
        expertModal.classList.add('active');
    });

    // Close Modal
    closeExpertModal.addEventListener('click', () => {
        expertModal.classList.remove('active');
    });

    // Close on overlay click
    expertModal.addEventListener('click', (e) => {
        if (e.target === expertModal) {
            expertModal.classList.remove('active');
        }
    });

    // Submit Action
    submitAskExpert.addEventListener('click', () => {
        const textVal = document.getElementById('expertQuestionText').value.trim();
        if (!textVal) {
            window.showToast('অনুগ্রহ করে আপনার সমস্যা সম্পর্কে কিছু লিখুন।');
            return;
        }

        // Show success animation/toast
        submitAskExpert.innerHTML = '<span class="material-icons-round" style="font-size:18px;margin-right:8px;">check_circle</span> জমা হয়েছে';
        submitAskExpert.style.background = '#059669'; // darker green

        setTimeout(() => {
            expertModal.classList.remove('active');

            // Reset modal after closing
            setTimeout(() => {
                submitAskExpert.innerHTML = 'প্রশ্ন জমা দিন';
                submitAskExpert.style.background = '';
                document.getElementById('expertQuestionText').value = '';
                window.showToast('আপনার প্রশ্ন কৃষি বিশেষজ্ঞের কাছে পাঠানো হয়েছে।', 'success');
            }, 300);
        }, 1000);
    });
});
