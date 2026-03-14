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
                // Remove active from Home
                items[0].classList.remove('active');

                // Add active to Farm (Khamar) which is the second item
                items[1].classList.add('active');
                // Ensure href points back here just in case
                items[1].href = 'khamar.html';
            }
        }
    }, 50);

    // Mock functionality for opening the add land modal or redirecting
    window.openAddLandModal = function () {
        window.location.href = 'add_land.html';
    };

    // Global toggleDropdown function
    window.toggleDropdown = function (event, dropId) {
        event.stopPropagation();
        const drop = document.getElementById(dropId);

        // Close all other dropdowns
        document.querySelectorAll('.fc-dropdown').forEach(d => {
            if (d.id !== dropId) d.classList.remove('show');
        });

        // Toggle the target
        if (drop) {
            drop.classList.toggle('show');
        }
    };

    // Close dropdowns if clicking anywhere outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.fc-actions-wrapper')) {
            document.querySelectorAll('.fc-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        }
    });

});
