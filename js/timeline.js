document.addEventListener('DOMContentLoaded', () => {

    /* --- 1. Tab Functionality (tasks.html) --- */
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = {
        'আসন্ন': document.getElementById('tab-upcoming'),
        'সম্পন্ন': document.getElementById('tab-completed'),
        'বাতিল': document.getElementById('tab-canceled')
    };

    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all
                tabs.forEach(t => t.classList.remove('active'));
                Object.values(tabContents).forEach(content => {
                    if (content) content.style.display = 'none';
                });

                // Add active to clicked
                tab.classList.add('active');
                const targetContent = tabContents[tab.textContent.trim()];
                if (targetContent) {
                    targetContent.style.display = 'block';
                }
            });
        });
    }

    /* --- 2. Action Buttons (Done, Cancel) --- */
    const doneButtons = document.querySelectorAll('.btn-tl-action.done');
    const cancelButtons = document.querySelectorAll('.btn-tl-action.cancel');

    const handleTaskMovement = (btn, actionType) => {
        const trItem = btn.closest('.timeline-item');
        if (!trItem) return;

        trItem.style.transition = 'opacity 0.3s ease, margin 0.3s ease, padding 0.3s ease, height 0.3s ease';
        trItem.style.opacity = '0';
        trItem.style.height = trItem.offsetHeight + 'px';

        setTimeout(() => {
            trItem.style.height = '0';
            trItem.style.margin = '0';
            trItem.style.padding = '0';
            trItem.style.overflow = 'hidden';

            setTimeout(() => {
                // If on tasks page, move to specific tab
                let targetTab = null;
                if (actionType === 'done' && tabContents['সম্পন্ন']) targetTab = tabContents['সম্পন্ন'];
                if (actionType === 'cancel' && tabContents['বাতিল']) targetTab = tabContents['বাতিল'];

                if (targetTab) {
                    // Remove Empty State text if first item
                    const emptyState = targetTab.querySelector('.empty-state');
                    if (emptyState) emptyState.style.display = 'none';

                    // Reset inline styles for the new container
                    trItem.style.opacity = '1';
                    trItem.style.height = 'auto';
                    trItem.style.margin = '';
                    trItem.style.padding = '';
                    trItem.style.overflow = '';

                    // Remove action buttons in completed/cancelled view
                    const actionsBox = trItem.querySelector('.task-item-actions');
                    if (actionsBox) actionsBox.remove();

                    // Add item to new tab
                    if (!targetTab.querySelector('.timeline-container')) {
                        const newContainer = document.createElement('section');
                        newContainer.className = 'timeline-container';
                        newContainer.style.marginTop = '20px';
                        targetTab.appendChild(newContainer);
                    }
                    targetTab.querySelector('.timeline-container').appendChild(trItem);
                } else {
                    // Just remove if on Dashboard
                    trItem.remove();
                }

                // Check if current date group in Upcoming is empty
                document.querySelectorAll('.date-group').forEach(group => {
                    const items = group.querySelectorAll('.timeline-item');
                    if (items.length === 0) {
                        group.style.display = 'none';
                    }
                });
            }, 300);
        }, 300);
    };

    doneButtons.forEach(btn => btn.addEventListener('click', (e) => handleTaskMovement(e.currentTarget, 'done')));
    cancelButtons.forEach(btn => btn.addEventListener('click', (e) => handleTaskMovement(e.currentTarget, 'cancel')));


    /* --- 3. Calendar Modal Functionality --- */
    const calendarModal = document.getElementById('calendarModal');
    const rescheduleButtons = document.querySelectorAll('.btn-tl-action.reschedule, .btn-task.outline');
    const closeModalBtn = document.querySelector('.close-modal');
    const confirmRescheduleBtn = document.getElementById('confirmReschedule');
    const calendarDays = document.getElementById('calendarDays');

    // Calendar Generation
    // We mock March 2026. Let's assume today is March 24, 2026.

    const TODAY_DATE = 24;
    let selectedDate = null;
    let activeTaskToReschedule = null;

    const renderCalendar = () => {
        if (!calendarDays) return;
        calendarDays.innerHTML = '';

        // 31 days in March 2026, starting on Sunday (0)
        for (let i = 1; i <= 31; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'cal-day';
            dayEl.textContent = i;

            // disable past dates
            if (i < TODAY_DATE) {
                dayEl.classList.add('past');
            } else {
                dayEl.addEventListener('click', () => {
                    // Remove selected from all
                    document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                    dayEl.classList.add('selected');
                    selectedDate = i;
                });
            }

            // Auto select today by default
            if (i === TODAY_DATE) {
                dayEl.classList.add('selected');
                selectedDate = i;
            }

            calendarDays.appendChild(dayEl);
        }
    };

    if (calendarModal) {
        renderCalendar();

        rescheduleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                activeTaskToReschedule = e.currentTarget.closest('.timeline-item');
                calendarModal.classList.add('active');
            });
        });

        const closeCalendar = () => {
            calendarModal.classList.remove('active');
            activeTaskToReschedule = null;
        };

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeCalendar);

        calendarModal.addEventListener('click', (e) => {
            // Close if clicking outside calendar content
            if (e.target === calendarModal) {
                closeCalendar();
            }
        });

        if (confirmRescheduleBtn) {
            confirmRescheduleBtn.addEventListener('click', () => {
                if (selectedDate) {
                    // Check if it's a generic input trigger
                    if (window.calendarTargetId) {
                        const targetEl = document.getElementById(window.calendarTargetId);
                        if (targetEl) {
                            targetEl.textContent = `${selectedDate} মার্চ ২০২৬`;
                        }
                        window.calendarTargetId = null; // Reset
                        closeCalendar();
                    }
                    // Otherwise it's the timeline reschedule tool
                    else if (activeTaskToReschedule) {
                        const timeEl = activeTaskToReschedule.querySelector('.tl-time');
                        if (timeEl) timeEl.textContent = `নতুন তারিখ: ${selectedDate} মার্চ`;

                        // Show a quick brief animation
                        activeTaskToReschedule.style.transition = 'transform 0.3s ease';
                        activeTaskToReschedule.style.transform = 'scale(1.02)';
                        setTimeout(() => {
                            activeTaskToReschedule.style.transform = 'scale(1)';
                        }, 300);

                        closeCalendar();
                    }
                }
            });
        }
    }
});
