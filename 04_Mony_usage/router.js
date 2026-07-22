/* ============================================
   ROUTER.JS — SPA 페이지 라우팅
   ============================================ */

const Router = {
    currentPage: 'dashboard',
    pages: {},

    /** 페이지 모듈 등록 */
    register(name, module) {
        this.pages[name] = module;
    },

    /** 페이지 전환 */
    async navigate(pageName) {
        if (!this.pages[pageName]) {
            console.warn('Unknown page:', pageName);
            return;
        }

        this.currentPage = pageName;

        // 네비게이션 활성 상태 업데이트
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });

        // 페이지 타이틀 업데이트
        const titles = {
            dashboard: '📊 대시보드',
            personal: '💰 개인 가계부',
            club: '⛳ 회사 모임 관리',
            exchange: '💱 환전 관리',
            analytics: '📈 자산 현황 및 통계',
            settings: '⚙️ 설정'
        };
        document.getElementById('page-title').textContent = titles[pageName] || pageName;

        // 페이지 렌더링
        const container = document.getElementById('page-container');
        container.innerHTML = '<div class="page-content" style="text-align:center;padding:60px"><span style="font-size:2rem">⏳</span><p style="color:var(--text-muted);margin-top:8px">로딩 중...</p></div>';

        try {
            const html = await this.pages[pageName].render();
            container.innerHTML = `<div class="page-content">${html}</div>`;
            if (this.pages[pageName].afterRender) {
                await this.pages[pageName].afterRender();
            }
        } catch (err) {
            console.error(`Page render error [${pageName}]:`, err);
            container.innerHTML = `<div class="page-content"><div class="empty-state"><div class="empty-icon">⚠️</div><p class="empty-text">페이지 로딩 중 오류가 발생했습니다.</p><p class="text-muted">${Utils.escapeHtml(err.message)}</p></div></div>`;
        }

        // 모바일 사이드바 닫기
        document.getElementById('sidebar').classList.remove('mobile-open');
    },

    init() {
        // 네비게이션 클릭 이벤트
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(item.dataset.page);
            });
        });
    }
};
