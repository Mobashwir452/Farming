import { registerComponents } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    // Ensure all Modular Web Components are loaded and initialized
    registerComponents();

    /* --- Tab Filtering --- */
    const tabs = document.querySelectorAll('.transaction-tabs .tab-btn');
    const transactionItems = document.querySelectorAll('.transaction-item');
    const emptyState = document.getElementById('tr-empty-state');

    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));

                // Add active class to clicked tab
                tab.classList.add('active');

                const targetTab = tab.getAttribute('data-tab');
                let visibleCount = 0;

                transactionItems.forEach(item => {
                    // Check if item has 'income' or 'expense' icon
                    const isIncome = item.querySelector('.tr-icon.income') !== null;
                    const isExpense = item.querySelector('.tr-icon.expense') !== null;

                    if (targetTab === 'all') {
                        item.style.display = 'flex';
                        visibleCount++;
                    } else if (targetTab === 'income' && isIncome) {
                        item.style.display = 'flex';
                        visibleCount++;
                    } else if (targetTab === 'expense' && isExpense) {
                        item.style.display = 'flex';
                        visibleCount++;
                    } else {
                        item.style.display = 'none';
                    }
                });

                // Handle empty state
                if (emptyState) {
                    if (visibleCount === 0) {
                        emptyState.style.display = 'block';
                    } else {
                        emptyState.style.display = 'none';
                    }
                }
            });
        });
    }

    /* --- Add Transaction Modal Functionality --- */
    const fabBtn = document.querySelector('.fab-btn');
    const addTransactionModal = document.getElementById('addTransactionModal');
    const closeAddModalBtn = document.getElementById('closeAddModal');
    const saveTransactionBtn = document.getElementById('saveTransaction');

    const openAddModal = () => {
        if (addTransactionModal) {
            addTransactionModal.classList.add('active');
        }
    };

    const closeAddModal = () => {
        if (addTransactionModal) {
            addTransactionModal.classList.remove('active');
        }
    };

    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            // Button bounce animation
            fabBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                fabBtn.style.transform = 'scale(1)';
                openAddModal();
            }, 150);
        });
    }

    if (closeAddModalBtn) {
        closeAddModalBtn.addEventListener('click', closeAddModal);
    }

    if (addTransactionModal) {
        // Close if clicking outside calendar content
        addTransactionModal.addEventListener('click', (e) => {
            if (e.target === addTransactionModal) {
                closeAddModal();
            }
        });
    }

    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', () => {
            // Mock Saving behavior
            const originalText = saveTransactionBtn.textContent;
            saveTransactionBtn.textContent = 'যোগ হচ্ছে...';
            setTimeout(() => {
                closeAddModal();
                saveTransactionBtn.textContent = originalText;
            }, 500);
        });
    }
});
