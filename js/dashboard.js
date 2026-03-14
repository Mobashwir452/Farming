import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ensure all Modular Web Components are loaded and initialized
    registerComponents();

    // 2. Logic to dismiss Daily Task when complete
    const taskCard = document.querySelector('.task-card');
    const btnSuccess = document.querySelector('.btn-task.success');

    if (btnSuccess && taskCard) {
        btnSuccess.addEventListener('click', () => {
            btnSuccess.innerText = "√ সম্পন্ন হয়েছে";
            btnSuccess.style.background = "#059669";

            // Just basic animation to hide card after clicking success
            setTimeout(() => {
                taskCard.style.opacity = '0';
                taskCard.style.transform = 'translateY(-10px)';
                taskCard.style.transition = 'all 0.4s ease';

                setTimeout(() => {
                    taskCard.style.display = 'none';
                }, 400);
            }, 800);
        });
    }

    // 3. Scan Button Ripple Effect Handler
    const btnScan = document.querySelector('.btn-scan');
    if (btnScan) {
        btnScan.addEventListener('click', () => {
            // Basic interaction demo before proper camera integration
            const originalBg = btnScan.style.background;
            btnScan.style.background = '#059669';
            setTimeout(() => {
                btnScan.style.background = originalBg;
            }, 300);
        });
    }
});
