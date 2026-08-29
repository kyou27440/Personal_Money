/* ============================================
   APP.JS — 앱 초기화 및 부트스트랩 (리비전 & 반영 시점 실시간 관리)
   ============================================ */

window.AppVersion = {
    get version() { return typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.VERSION : 'v5.5.0'; },
    get buildDate() { return typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.BUILD_DATE : '2026-08-29'; },
    get buildDesc() { return typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.BUILD_DESC : ''; },

    /** 데이터 반영/동기화 시각 실시간 갱신 */
    updateSyncStatus(customTime = null) {
        const now = new Date();
        const timeStr = customTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        localStorage.setItem('mymoney_last_sync_time', timeStr);

        const badge = document.getElementById('sync-status-badge');
        if (badge) {
            badge.innerHTML = `
                <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#34d399;margin-right:4px;box-shadow:0 0 6px #34d399;" title="클라우드 실시간 동기화 정상"></span>
                <strong style="color:#818cf8;">${this.version}</strong> • <span style="color:var(--text-muted);">반영: ${timeStr}</span>
            `;
        }

        const sideVer = document.querySelector('.sidebar-version');
        if (sideVer) {
            sideVer.innerHTML = `
                <div style="font-weight:700;color:#818cf8;margin-bottom:2px;">${this.version} (${this.buildDate})</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">${this.buildDesc}</div>
                <div style="font-size:0.68rem;color:#34d399;margin-top:3px;">🟢 최근 반영: ${timeStr}</div>
            `;
        }
    },

    /** 즉시 강제 새로고침 및 캐시 초기화 */
    async forceReload() {
        Utils.toast('🔄 최신 데이터 및 리비전을 동기화합니다...', 'info');
        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            } catch(e) {}
        }
        setTimeout(() => {
            window.location.reload(true);
        }, 300);
    }
};

(async function () {
    'use strict';

    // ── 날짜 및 리비전/반영시점 헤더 렌더링 ──
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dateStr = `${yyyy}.${mm}.${dd} (${days[now.getDay()]})`;

        const lastSync = localStorage.getItem('mymoney_last_sync_time') || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        dateEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                <span style="font-weight:600;">${dateStr}</span>
                <button id="sync-status-badge" class="btn btn-ghost btn-sm" onclick="AppVersion.forceReload()"
                        style="padding:2px 8px;font-size:0.72rem;border-color:rgba(99,102,241,0.3);background:rgba(99,102,241,0.06);border-radius:12px;cursor:pointer;display:flex;align-items:center;"
                        title="클릭 시 최신 리비전 및 데이터 강제 새로고침">
                    <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#34d399;margin-right:4px;box-shadow:0 0 6px #34d399;"></span>
                    <strong style="color:#818cf8;">${AppVersion.version}</strong> • <span style="color:var(--text-muted);">반영: ${lastSync}</span>
                </button>
            </div>
        `;
    }

    AppVersion.updateSyncStatus();

    // ── 사이드바 토글 ──
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileToggle = document.getElementById('mobile-menu-toggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // 모바일: 콘텐츠 클릭 시 사이드바 닫기
    document.getElementById('main-content').addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-open');
        }
    });

    // ── 모달 초기화 ──
    Modal.init();

    // ── 라우터 초기화 ──
    Router.init();

    // ── 모바일 하단 탭 네비게이션 ──
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            // 하단 탭 활성 상태 동기화
            document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
            item.classList.add('active');
            Router.navigate(page);
        });
    });

    // 라우터 네비게이션 시 하단 탭도 동기화
    const originalNavigate = Router.navigate.bind(Router);
    Router.navigate = async function (pageName) {
        await originalNavigate(pageName);
        // 하단 탭 활성 상태 동기화
        document.querySelectorAll('.bottom-nav-item').forEach(b => {
            b.classList.toggle('active', b.dataset.page === pageName);
        });
    };

    // ── FAB: 빠른 입력 버튼 ──
    const fab = document.getElementById('fab-quick-add');
    if (fab) {
        fab.addEventListener('click', () => {
            // 현재 페이지에 따라 적절한 입력 모달 오픈
            const page = Router.currentPage;
            switch (page) {
                case 'personal':
                    PersonalPage.openTxModal();
                    break;
                case 'exchange':
                    ExchangePage.openExchangeModal();
                    break;
                default:
                    // 기본: 가계부 입력 (가장 자주 쓰는 기능)
                    PersonalPage.openTxModal();
                    break;
            }
        });
    }

    // ── Supabase 연결 확인 & 초기 페이지 로드 ──
    try {
        const { data, error } = await supabase.from('app_settings').select('key').limit(1);
        if (error) throw error;
        console.log('✅ Supabase 연결 성공');
    } catch (err) {
        console.warn('⚠️ Supabase 연결 실패:', err.message);
        console.warn('   → js/config.js에서 SUPABASE_URL과 SUPABASE_ANON_KEY를 설정하세요.');
    }

    // 대시보드 로드
    Router.navigate('dashboard');
})();
