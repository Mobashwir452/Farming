// admin/js/pagination.js

class AdminPagination {
    constructor(config) {
        this.containerId = config.containerId;
        this.itemName = config.itemName || 'items';
        this.limit = config.limit || 10;
        this.onChange = config.onChange;
        
        this.currentPage = 1;
        this.totalItems = 0;
        
        this.renderShell();
    }

    renderShell() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`AdminPagination: Container #${this.containerId} not found`);
            return;
        }
        
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                <div style="font-size: 13px; color: var(--text-muted);" class="pagination-info">এসাইনিং পেজিনেশন...</div>
                <div style="display: flex; gap: 8px;" class="pagination-controls">
                    <button class="btn-outline pagination-prev" disabled style="padding: 6px 12px; font-size: 13px;">পূর্ববর্তী</button>
                    <button class="btn-outline pagination-next" disabled style="padding: 6px 12px; font-size: 13px;">পরবর্তী</button>
                </div>
            </div>
        `;

        this.infoEl = container.querySelector('.pagination-info');
        this.btnPrev = container.querySelector('.pagination-prev');
        this.btnNext = container.querySelector('.pagination-next');

        this.btnPrev.addEventListener('click', () => {
             if (this.currentPage > 1) {
                 this.onChange(this.currentPage - 1, this.limit);
             }
        });

        this.btnNext.addEventListener('click', () => {
             const maxPage = Math.ceil(this.totalItems / this.limit);
             if (this.currentPage < maxPage) {
                 this.onChange(this.currentPage + 1, this.limit);
             }
        });
    }

    update(totalItems, currentPage) {
        this.totalItems = totalItems;
        this.currentPage = parseInt(currentPage);
        
        const maxPage = Math.ceil(this.totalItems / this.limit) || 1;
        
        this.infoEl.innerText = `Total: ${totalItems} ${this.itemName} | Page: ${this.currentPage} of ${maxPage}`;
        this.btnPrev.disabled = this.currentPage <= 1;
        this.btnNext.disabled = this.currentPage >= maxPage;
    }
}

window.AdminPagination = AdminPagination;
