import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // Ensure all Modular Web Components are loaded and initialized
    registerComponents();

    // Setup filter action (placeholder)
    const filterBtn = document.querySelector('.header-action');
    if (filterBtn) {
        // Optional: override the inline onclick if needed later
    }

    // Setup report download action (placeholder)
    const fabBtn = document.querySelector('.fab-report');
    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            // Button bounce animation
            fabBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                fabBtn.style.transform = 'scale(1)';
            }, 150);
        });
    }
});
