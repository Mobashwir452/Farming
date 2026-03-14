import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ensure all Modular Web Components are loaded and initialized
    registerComponents();

    // Set Active State for Bottom Navigation
    setTimeout(() => {
        const bottomNav = document.querySelector('app-bottom-nav');
        if (bottomNav) {
            const shadow = bottomNav.shadowRoot;
            if (shadow) {
                const navItems = shadow.querySelectorAll('.b-n-item');
                navItems.forEach(item => item.classList.remove('active'));

                // This page logically falls under Khamar
                const khamarNav = shadow.querySelector('.b-n-item[href="khamar.html"]');
                if (khamarNav) {
                    khamarNav.classList.add('active');
                }
            }
        }
    }, 100);

    // Modal Handling for Quick Actions
    const btnFinance = document.getElementById('btnFinance');
    const btnHarvest = document.getElementById('btnHarvest');

    const addTransactionModal = document.getElementById('addTransactionModal');
    const harvestModal = document.getElementById('harvestModal');

    // Open Modals
    if (btnFinance && addTransactionModal) {
        btnFinance.addEventListener('click', () => {
            addTransactionModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (btnHarvest && harvestModal) {
        btnHarvest.addEventListener('click', () => {
            harvestModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close Modals (handlers in HTML via onclick, but adding listeners for backdrop click)
    const lossModal = document.getElementById('lossModal');
    const calendarModalEl = document.getElementById('calendarModal');
    const customStepModal = document.getElementById('customStepModal');
    const weatherModal = document.getElementById('weatherModal');
    const modals = [addTransactionModal, harvestModal, lossModal, calendarModalEl, customStepModal, weatherModal];
    modals.forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    });

    // Timeline actions handling for Land Details
    const doneButtons = document.querySelectorAll('.ld-task-item .btn-tl-action.done');
    const cancelButtons = document.querySelectorAll('.ld-task-item .btn-tl-action.cancel');
    const rescheduleButtons = document.querySelectorAll('.ld-task-item .btn-tl-action.reschedule');

    doneButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskItem = e.currentTarget.closest('.ld-task-item');
            if (taskItem) {
                // Change status visual
                taskItem.classList.remove('active', 'warning');
                taskItem.classList.add('completed');

                // Remove the action buttons
                const actionsDiv = taskItem.querySelector('.task-item-actions');
                if (actionsDiv) {
                    actionsDiv.remove();
                }

                // Append "সম্পন্ন" badge to date
                const dateEl = taskItem.querySelector('.task-date');
                if (dateEl) {
                    dateEl.innerHTML = `${dateEl.textContent.trim()} <span style="color: var(--primary);">✓ সম্পন্ন</span>`;
                    dateEl.style.color = 'var(--text-muted)';
                }
            }
        });
    });

    cancelButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskItem = e.currentTarget.closest('.ld-task-item');
            if (taskItem) {
                taskItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                taskItem.style.opacity = '0';
                taskItem.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    taskItem.remove();
                }, 300);
            }
        });
    });

    rescheduleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeTaskToReschedule = e.currentTarget.closest('.ld-task-item');
            if (calendarModal) {
                calendarModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // Calendar Generate Logic
    const calendarModal = document.getElementById('calendarModal');
    const closeCalendarModal = document.getElementById('closeCalendarModal');
    const confirmReschedule = document.getElementById('confirmReschedule');
    const calendarDays = document.getElementById('calendarDays');
    let selectedDate = null;
    let activeTaskToReschedule = null;

    if (calendarDays && calendarModal) {
        // Render Days (Mocking March)
        const renderCalendar = () => {
            calendarDays.innerHTML = '';
            for (let i = 1; i <= 31; i++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'cal-day';
                dayEl.textContent = i;
                if (i < 24) {  // Past dates
                    dayEl.classList.add('past');
                } else {
                    dayEl.addEventListener('click', () => {
                        document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                        dayEl.classList.add('selected');
                        selectedDate = i;
                    });
                }
                if (i === 24) { // Today
                    dayEl.classList.add('selected');
                    selectedDate = i;
                }
                calendarDays.appendChild(dayEl);
            }
        };

        renderCalendar();

        const closeCal = () => {
            calendarModal.classList.remove('active');
            document.body.style.overflow = '';
            activeTaskToReschedule = null;
        }

        if (confirmReschedule) {
            confirmReschedule.addEventListener('click', () => {
                if (selectedDate && activeTaskToReschedule) {
                    const dateEl = activeTaskToReschedule.querySelector('.task-date');
                    if (dateEl) {
                        dateEl.textContent = `নতুন তারিখ: ${selectedDate} মার্চ`;
                        dateEl.style.color = '#2563EB'; // Primary Blue
                    }
                    activeTaskToReschedule.style.transition = 'transform 0.3s ease';
                    activeTaskToReschedule.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        activeTaskToReschedule.style.transform = 'scale(1)';
                    }, 300);
                    closeCal();
                }
            });
        }
    }

    // History Page: Accordion Logic for Expenses
    const accordionBtns = document.querySelectorAll('.lh-accordion-btn');
    accordionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentBtn = e.currentTarget;
            const content = currentBtn.nextElementSibling;

            // Toggle active classes
            currentBtn.classList.toggle('open');
            content.classList.toggle('open');

            // Change button text contextually
            const span = currentBtn.querySelector('span');
            if (currentBtn.classList.contains('open')) {
                span.textContent = '▲ বিস্তারিত হিসাব লুকান';
            } else {
                span.textContent = '▼ বিস্তারিত হিসাব দেখুন';
            }
        });
    });

});
