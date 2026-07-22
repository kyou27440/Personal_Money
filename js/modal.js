/* ============================================
   MODAL.JS — 모달 다이얼로그 관리
   ============================================ */

const Modal = {
    overlay: null,
    titleEl: null,
    bodyEl: null,
    footerEl: null,
    closeBtn: null,

    init() {
        this.overlay = document.getElementById('modal-overlay');
        this.titleEl = document.getElementById('modal-title');
        this.bodyEl = document.getElementById('modal-body');
        this.footerEl = document.getElementById('modal-footer');
        this.closeBtn = document.getElementById('modal-close');

        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) this.close();
        });
    },

    open(title, bodyHTML, footerHTML = '') {
        this.titleEl.textContent = title;
        this.bodyEl.innerHTML = bodyHTML;
        this.footerEl.innerHTML = footerHTML;
        this.overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Focus first input if exists
        setTimeout(() => {
            const firstInput = this.bodyEl.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    },

    close() {
        this.overlay.classList.add('hidden');
        document.body.style.overflow = '';
        this.bodyEl.innerHTML = '';
        this.footerEl.innerHTML = '';
    },

    /** 확인 다이얼로그 */
    confirm(title, message) {
        return new Promise((resolve) => {
            this.open(title,
                `<p style="color:var(--text-secondary)">${message}</p>`,
                `<button class="btn btn-ghost" id="modal-cancel-btn">취소</button>
                 <button class="btn btn-danger" id="modal-confirm-btn">확인</button>`
            );
            document.getElementById('modal-confirm-btn').addEventListener('click', () => { this.close(); resolve(true); });
            document.getElementById('modal-cancel-btn').addEventListener('click', () => { this.close(); resolve(false); });
        });
    }
};
