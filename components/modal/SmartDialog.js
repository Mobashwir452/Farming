// components/modal/SmartDialog.js

class SmartDialogComponent {
    constructor() {
        this.initDOM();
    }

    initDOM() {
        if (document.getElementById('smart-dialog-overlay')) return; // Already exists

        // Add CSS styles
        const style = document.createElement('style');
        style.innerHTML = `
            .smart-dialog-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 99999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
            .smart-dialog-overlay.active { opacity: 1; pointer-events: auto; }
            .smart-dialog-content { background: white; width: 90%; max-width: 320px; border-radius: 20px; padding: 24px; text-align: center; transform: scale(0.9); opacity: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
            .smart-dialog-overlay.active .smart-dialog-content { transform: scale(1); opacity: 1; }
            .sd-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; }
            .sd-icon.warning { background: #FEF2F2; color: #EF4444; }
            .sd-icon.success { background: #ECFDF5; color: #10B981; }
            .sd-icon.info { background: #EFF6FF; color: #3B82F6; }
            .sd-title { font-size: 18px; font-weight: 700; color: #1E293B; margin: 0 0 8px 0; }
            .sd-message { font-size: 14px; color: #475569; margin: 0 0 24px 0; line-height: 1.5; white-space: pre-wrap; font-family: 'Noto Sans Bengali', sans-serif; }
            .sd-input { width: 100%; padding: 12px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; margin-bottom: 24px; outline: none; transition: border 0.2s; box-sizing: border-box; text-align: center; }
            .sd-input:focus { border-color: #059669; }
            .sd-buttons { display: flex; gap: 12px; }
            .sd-btn { flex: 1; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: background 0.2s; }
            .sd-btn-cancel { background: #F1F5F9; color: #475569; }
            .sd-btn-cancel:hover { background: #E2E8F0; }
            .sd-btn-confirm { background: #059669; color: white; }
            .sd-btn-danger { background: #EF4444; color: white; }
        `;
        document.head.appendChild(style);

        // Inject DOM
        const overlay = document.createElement('div');
        overlay.id = 'smart-dialog-overlay';
        overlay.className = 'smart-dialog-overlay';
        overlay.innerHTML = `
            <div class="smart-dialog-content">
                <div id="sd-icon" class="sd-icon info"></div>
                <h3 id="sd-title" class="sd-title">ডায়ালগ</h3>
                <p id="sd-message" class="sd-message"></p>
                <input type="text" id="sd-input" class="sd-input" autocomplete="off" style="display: none;">
                <div class="sd-buttons" id="sd-buttons">
                    <button id="sd-cancel" class="sd-btn sd-btn-cancel" style="display: none;">বাতিল</button>
                    <button id="sd-confirm" class="sd-btn sd-btn-confirm">ঠিক আছে</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        this.overlay = overlay;
        this.iconEl = document.getElementById('sd-icon');
        this.titleEl = document.getElementById('sd-title');
        this.msgEl = document.getElementById('sd-message');
        this.inputEl = document.getElementById('sd-input');
        this.cancelBtn = document.getElementById('sd-cancel');
        this.confirmBtn = document.getElementById('sd-confirm');
    }

    _getIconSvg(type) {
        if (type === 'warning' || type === 'danger') return `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86l-8.47 14.14c-1 1.74.23 4 2.23 4h15.9c2 0 3.26-2.26 2.23-4L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        if (type === 'success') return `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        return `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    _show(type, title, message, showCancel, inputVal) {
        // Safe check if UI is missing
        if (!this.overlay) this.initDOM();

        // Bind data
        this.iconEl.className = 'sd-icon ' + (type === 'danger' ? 'warning' : type || 'info');
        this.iconEl.innerHTML = this._getIconSvg(type);
        this.titleEl.textContent = title;
        this.msgEl.innerHTML = message; // Using innerHTML to support <br/> and bold tags which some prompts use.
        
        if (inputVal !== null) {
            this.inputEl.style.display = 'block';
            this.inputEl.value = inputVal || '';
            setTimeout(() => this.inputEl.focus(), 100);
        } else {
            this.inputEl.style.display = 'none';
        }

        this.cancelBtn.style.display = showCancel ? 'block' : 'none';
        this.confirmBtn.className = 'sd-btn ' + (type === 'danger' ? 'sd-btn-danger' : 'sd-btn-confirm');
        if (type === 'danger') this.confirmBtn.textContent = 'মুছে ফেলুন';
        else this.confirmBtn.textContent = 'ঠিক আছে';

        this.overlay.classList.add('active');

        return new Promise(resolve => {
            const cleanup = () => {
                this.overlay.classList.remove('active');
                this.cancelBtn.onclick = null;
                this.confirmBtn.onclick = null;
            };

            this.cancelBtn.onclick = () => { cleanup(); resolve(inputVal !== null ? null : false); };
            this.confirmBtn.onclick = () => { cleanup(); resolve(inputVal !== null ? this.inputEl.value : true); };
        });
    }

    async alert(message, title = "বার্তা", type = "info") {
        return this._show(type, title, message, false, null);
    }

    async confirm(message, title = "নিশ্চিতকরণ?", type = "warning") {
        return this._show(type, title, message, true, null);
    }

    async prompt(message, defaultValue = "", title = "তথ্য প্রদান") {
        return this._show("info", title, message, true, defaultValue);
    }
}

// Auto-initialize component
document.addEventListener('DOMContentLoaded', () => {
    if (!window.SmartDialog) window.SmartDialog = new SmartDialogComponent();
});
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!window.SmartDialog) window.SmartDialog = new SmartDialogComponent();
}
