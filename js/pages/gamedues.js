/* ============================================
   PAGES/GAMEDUES.JS — 게임회비 관리 페이지
   총무용: 멤버 입금 추적 + 지출 기록 + 내 회비 자동 계산
   ============================================ */

const GameDuesPage = {
    _activeTab: 'income',
    _incomeList: [],
    _expenseList: [],
    _settings: { perPerson: 0, totalMembers: 0 },

    /* ─── DB 또는 localStorage fallback ─── */
    _KEY_INC: 'mymoney_gamedues_income',
    _KEY_EXP: 'mymoney_gamedues_expense',
    _KEY_SETTINGS: 'mymoney_gamedues_settings',

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DATA ACCESS — Supabase + localStorage fallback
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async _loadIncome() {
        return await Store.getGameDuesIncome();
    },

    async _loadExpense() {
        return await Store.getGameDuesExpense();
    },

    async _addIncome(item) {
        const res = await Store.addGameDuesIncome(item);
        this._incomeList = await Store.getGameDuesIncome();
        return res;
    },

    async _updateIncome(id, updates) {
        const res = await Store.updateGameDuesIncome(id, updates);
        this._incomeList = await Store.getGameDuesIncome();
        return res;
    },

    async _deleteIncome(id) {
        // 1. 로컬 리스트에서 즉시 제거 (UI 즉각 반영)
        this._incomeList = this._incomeList.filter(r => String(r.id) !== String(id));
        // 2. Store 비동기 삭제 (Supabase + localStorage 동기화)
        await Store.deleteGameDuesIncome(id);
    },

    async _addExpense(item) {
        const res = await Store.addGameDuesExpense(item);
        this._expenseList = await Store.getGameDuesExpense();
        return res;
    },

    async _updateExpense(id, updates) {
        const res = await Store.updateGameDuesExpense(id, updates);
        this._expenseList = await Store.getGameDuesExpense();
        return res;
    },

    async _deleteExpense(id) {
        // 1. 로컬 리스트에서 즉시 제거 (UI 즉각 반영)
        this._expenseList = this._expenseList.filter(r => String(r.id) !== String(id));
        // 2. Store 비동기 삭제 (Supabase + localStorage 동기화)
        await Store.deleteGameDuesExpense(id);
    },

    async _loadSettings() {
        try {
            const remoteVal = await Store.getSetting('gamedues_settings');
            if (remoteVal) {
                const parsed = typeof remoteVal === 'string' ? JSON.parse(remoteVal) : remoteVal;
                if (parsed && typeof parsed === 'object') {
                    try { localStorage.setItem(this._KEY_SETTINGS, JSON.stringify(parsed)); } catch(e) {}
                    return parsed;
                }
            }
        } catch(e) {}
        try {
            const raw = localStorage.getItem(this._KEY_SETTINGS);
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return { perPerson: 0, totalMembers: 0 };
    },

    async _saveSettings(s) {
        try { localStorage.setItem(this._KEY_SETTINGS, JSON.stringify(s)); } catch(e) {}
        try {
            await Store.setSetting('gamedues_settings', s);
        } catch(e) {}
    },

    _loadLocal(key, def) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return def;
    },

    _saveLocal(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
    },

    /* ─── 요약 계산 ─── */
    _calcSummary() {
        const totalIncome  = this._incomeList.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);
        const totalExpense = this._expenseList.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);
        const balance      = totalIncome - totalExpense;

        const perPerson    = Utils.parseAmount(this._settings.perPerson);
        const totalMembers = parseInt(this._settings.totalMembers) || 0;
        const expectedTotal = perPerson * totalMembers;
        // 내가 채워야 할 금액 = 예상 총회비 - 멤버들 입금 합계 (음수면 초과)
        const myShortfall  = Math.max(0, expectedTotal - totalIncome);

        return { totalIncome, totalExpense, balance, perPerson, totalMembers, expectedTotal, myShortfall };
    },

    /* ─── 멤버 목록 집계 ─── */
    _getMemberStats() {
        const map = {};
        this._incomeList.forEach(r => {
            const name = String(r.member_name || '').trim().toUpperCase();
            if (!name) return;
            if (!map[name]) map[name] = { name, total: 0, count: 0 };
            map[name].total += Utils.parseAmount(r.amount);
            map[name].count += 1;
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RENDER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async render() {
        this._settings = await this._loadSettings();
        this._incomeList  = await this._loadIncome();
        this._expenseList = await this._loadExpense();
        this._personalTxList = await Store.getTransactions({ limit: 1000 });

        const S = this._calcSummary();
        const members = this._getMemberStats();

        return `
        <div style="width:100%;margin:0 auto;">

            <!-- 🌟 3열 초슬림 프리미엄 요약 카드 그리드 -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:12px;margin-bottom:12px;">
                <!-- 카드 1: 총 입금 -->
                <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.06));border:1px solid rgba(52,211,153,0.3);border-radius:10px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:8px;background:rgba(52,211,153,0.18);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">💰</div>
                        <div>
                            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">총 입금 (멤버)</div>
                            <div style="font-size:1.1rem;font-weight:800;color:#34d399;" id="dues-val-income">${Utils.formatVND(S.totalIncome)}</div>
                        </div>
                    </div>
                    <span style="background:rgba(52,211,153,0.2);color:#34d399;font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:10px;">${this._incomeList.length}건</span>
                </div>

                <!-- 카드 2: 총 지출 -->
                <div style="background:linear-gradient(135deg,rgba(244,63,94,0.12),rgba(225,29,72,0.06));border:1px solid rgba(251,113,133,0.3);border-radius:10px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:8px;background:rgba(251,113,133,0.18);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">💸</div>
                        <div>
                            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">총 모임 지출</div>
                            <div style="font-size:1.1rem;font-weight:800;color:#fb7185;" id="dues-val-expense">${Utils.formatVND(S.totalExpense)}</div>
                        </div>
                    </div>
                    <span style="background:rgba(248,113,113,0.2);color:#fb7185;font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:10px;">${this._expenseList.length}건</span>
                </div>

                <!-- 카드 3: 현재 잔액 + 이월 버튼 -->
                <div style="background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(79,70,229,0.06));border:1px solid rgba(129,140,248,0.3);border-radius:10px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:8px;background:rgba(129,140,248,0.18);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">⚖️</div>
                        <div>
                            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">현재 정산 잔액</div>
                            <div style="font-size:1.1rem;font-weight:800;color:#818cf8;" id="dues-val-balance">${Utils.formatVND(S.balance)}</div>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
                        <span style="font-size:0.75rem;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:2px 7px;border-radius:6px;">수령 - 지출</span>
                        <div id="dues-carryover-btn-wrap">
                        ${S.balance > 0 ? `
                        <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.openCarryoverModal(${S.balance})"
                            style="padding:2px 9px;font-size:0.72rem;border-color:rgba(251,191,36,0.5);color:#fbbf24;font-weight:700;white-space:nowrap;"
                            title="잔액을 다음 모임 날짜의 입금으로 이월 등록">
                            🔄 다음 모임 이월
                        </button>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 🔍 김상국(총무) 개인 가계부 지출 대조 현황 전용 배너 -->
            <div id="dues-ledger-sync-banner" style="background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06));border:1px solid rgba(129,140,248,0.25);border-radius:10px;padding:8px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;">
                    <span style="font-size:1.1rem;">🔍</span>
                    <div>
                        <strong style="color:#818cf8;">[김상국 본인 가계부 지출 대조 현황]</strong>
                        <span style="color:var(--text-secondary);margin-left:4px;" id="ledger-sync-stat-text">게임회비 지출과 개인 가계부 지출을 실시간 대조 중...</span>
                    </div>
                </div>
                <div id="ledger-sync-action-btn-area"></div>
            </div>

            <!-- 슬림 탭 -->
            <div class="dues-tabs">
                <button class="dues-tab-btn active" id="tab-rounds" onclick="GameDuesPage.switchTab('rounds')">⛳ 📅 날짜별 모임 정산 <span id="badge-rounds" style="background:rgba(99,102,241,0.2);color:#818cf8;border-radius:10px;padding:1px 7px;font-size:0.75rem;margin-left:4px"></span></button>
                <button class="dues-tab-btn" id="tab-income"  onclick="GameDuesPage.switchTab('income')">📥 입금 내역 <span id="badge-income" style="background:rgba(52,211,153,0.2);color:#34d399;border-radius:10px;padding:1px 7px;font-size:0.75rem;margin-left:4px">${this._incomeList.length}</span></button>
                <button class="dues-tab-btn" id="tab-expense" onclick="GameDuesPage.switchTab('expense')">📤 지출 내역 <span id="badge-expense" style="background:rgba(248,113,113,0.15);color:#fb7185;border-radius:10px;padding:1px 7px;font-size:0.75rem;margin-left:4px">${this._expenseList.length}</span></button>
                <button class="dues-tab-btn" id="tab-members" onclick="GameDuesPage.switchTab('members')">👥 멤버 현황 <span id="badge-members" style="background:rgba(99,102,241,0.2);color:#818cf8;border-radius:10px;padding:1px 7px;font-size:0.75rem;margin-left:4px">${members.length}명</span></button>
            </div>

            <!-- ⛳ 1순위: 날짜별 모임 종합 정산 패널 -->
            <div class="dues-panel active" id="panel-rounds">
                <div class="dues-section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                    <div class="dues-section-title" style="font-size:0.95rem;">⛳ 일자별 모임 정산 피드 (스크린비·회식비·납부현황)</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.forceReloadAll()" style="border-color:#818cf8;color:#818cf8;font-weight:700;padding:3px 9px;font-size:0.78rem;" title="클라우드에서 8월 26일 및 모든 모임 회비 강제 새로고침">🔄 8/26 및 전체 동기화</button>
                        <button class="btn btn-ghost btn-sm" id="btn-sync-from-ledger-round" style="border-color:#fbbf24;color:#fbbf24;font-weight:700;padding:3px 9px;font-size:0.78rem;">⚡ 가계부에서 회비 자동 가져오기</button>
                        <button class="btn btn-primary btn-sm" onclick="GameDuesPage.openExpenseModal()" style="padding:3px 9px;font-size:0.78rem;">+ 지출 등록</button>
                        <button class="btn btn-emerald btn-sm" onclick="GameDuesPage.openIncomeModal()" style="background:#10b981;color:#fff;padding:3px 9px;font-size:0.78rem;">+ 입금 등록</button>
                    </div>
                </div>

                <div class="dues-filter-bar">
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-ghost btn-sm" id="btn-round-all-time" style="padding:2px 7px;font-size:0.76rem;">🗓️ 전체</button>
                        <button class="btn btn-ghost btn-sm" id="btn-round-this-month" style="padding:2px 7px;font-size:0.76rem;">이번 달</button>
                        <button class="btn btn-ghost btn-sm" id="btn-round-last-month" style="padding:2px 7px;font-size:0.76rem;">지난 달</button>
                    </div>
                    <input type="date" id="round-filter-start" value="2020-01-01" style="width:125px;">
                    <span style="color:var(--text-muted)">~</span>
                    <input type="date" id="round-filter-end" value="${Utils.today()}" style="width:125px;">
                    <button class="btn btn-ghost btn-sm" id="btn-filter-round-apply" style="padding:2px 8px;font-size:0.76rem;">🔍 조회</button>
                </div>

                <!-- 날짜별 모임 정산 카드 목록 컨테이너 -->
                <div id="rounds-cards-container" style="display:flex;flex-direction:column;gap:10px;">
                    <!-- 동적 렌더링 -->
                </div>
            </div>

            <!-- 입금 내역 패널 -->
            <div class="dues-panel" id="panel-income">
                <div class="dues-section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div class="dues-section-title">💰 게임회비 입금 내역</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="btn btn-danger btn-sm hidden" id="btn-bulk-revert-income" style="font-weight:700;">💰 선택 항목 가계부로 되돌리기</button>
                        <button class="btn btn-ghost btn-sm" id="btn-sync-from-ledger" style="border-color:#fbbf24;color:#fbbf24;font-weight:700;">⚡ 가계부에서 회비 자동 가져오기</button>
                        <button class="btn btn-primary btn-sm" id="btn-add-income">+ 입금 등록</button>
                    </div>
                </div>

                <div class="dues-filter-bar" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-ghost btn-sm" id="btn-inc-all-time" style="padding:3px 8px;font-size:0.78rem;">🗓️ 전체</button>
                        <button class="btn btn-ghost btn-sm" id="btn-inc-this-month" style="padding:3px 8px;font-size:0.78rem;">이번 달</button>
                        <button class="btn btn-ghost btn-sm" id="btn-inc-last-month" style="padding:3px 8px;font-size:0.78rem;">지난 달</button>
                    </div>
                    <input type="date" id="inc-filter-start" value="2020-01-01" style="width:130px;">
                    <span style="color:var(--text-muted)">~</span>
                    <input type="date" id="inc-filter-end" value="${Utils.today()}" style="width:130px;">
                    <input type="text" id="inc-filter-name" placeholder="이름 검색" style="width:110px;">
                    <button class="btn btn-ghost btn-sm" id="btn-filter-income-apply">🔍 조회</button>
                </div>

                <div class="dues-table-wrap">
                    <table class="dues-table">
                        <thead>
                            <tr>
                                <th style="width:36px;text-align:center;">
                                    <input type="checkbox" id="inc-select-all" style="cursor:pointer;">
                                </th>
                                <th>날짜</th>
                                <th>입금자 이름</th>
                                <th style="text-align:right">입금액</th>
                                <th>메모</th>
                                <th style="width:140px;text-align:center;">작업</th>
                            </tr>
                        </thead>
                        <tbody id="income-tbody">
                            <tr><td colspan="6" class="text-center text-muted" style="padding:40px">로딩 중...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="income-total-bar" style="text-align:right;padding:10px 4px;font-size:0.85rem;color:var(--text-muted)"></div>
            </div>

            <!-- 지출 내역 패널 -->
            <div class="dues-panel" id="panel-expense">
                <div class="dues-section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div class="dues-section-title">💸 게임회비 지출 내역</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="btn btn-danger btn-sm hidden" id="btn-bulk-revert-expense" style="font-weight:700;">💰 선택 항목 가계부로 되돌리기</button>
                        <button class="btn btn-primary btn-sm" id="btn-add-expense">+ 지출 등록</button>
                    </div>
                </div>

                <div class="dues-filter-bar" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-ghost btn-sm" id="btn-exp-all-time" style="padding:3px 8px;font-size:0.78rem;">🗓️ 전체</button>
                        <button class="btn btn-ghost btn-sm" id="btn-exp-this-month" style="padding:3px 8px;font-size:0.78rem;">이번 달</button>
                        <button class="btn btn-ghost btn-sm" id="btn-exp-last-month" style="padding:3px 8px;font-size:0.78rem;">지난 달</button>
                    </div>
                    <input type="date" id="exp-filter-start" value="2020-01-01" style="width:130px;">
                    <span style="color:var(--text-muted)">~</span>
                    <input type="date" id="exp-filter-end" value="${Utils.today()}" style="width:130px;">
                    <button class="btn btn-ghost btn-sm" id="btn-filter-expense-apply">🔍 조회</button>
                </div>

                <div class="dues-table-wrap">
                    <table class="dues-table">
                        <thead>
                            <tr>
                                <th style="width:36px;text-align:center;">
                                    <input type="checkbox" id="exp-select-all" style="cursor:pointer;">
                                </th>
                                <th>날짜</th>
                                <th>내용</th>
                                <th style="text-align:right">지출액</th>
                                <th>메모</th>
                                <th style="width:140px;text-align:center;">작업</th>
                            </tr>
                        </thead>
                        <tbody id="expense-tbody">
                            <tr><td colspan="6" class="text-center text-muted" style="padding:40px">로딩 중...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="expense-total-bar" style="text-align:right;padding:10px 4px;font-size:0.85rem;color:var(--text-muted)"></div>
            </div>

            <!-- 멤버 현황 패널 -->
            <div class="dues-panel" id="panel-members">
                <div class="dues-section-header">
                    <div class="dues-section-title">👥 멤버별 입금 현황</div>
                </div>
                <div id="member-grid-container"></div>
            </div>

        </div>
        `;
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // AFTER RENDER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async afterRender() {
        this.updateLedgerSyncBanner();
        this.renderRoundsFeed();
        this.renderIncomeTable(this._incomeList);
        this.renderExpenseTable(this._expenseList);
        this.renderMemberGrid();

        document.getElementById('btn-add-income')?.addEventListener('click', () => this.openIncomeModal());
        document.getElementById('btn-add-expense')?.addEventListener('click', () => this.openExpenseModal());
        document.getElementById('btn-dues-settings')?.addEventListener('click', () => this.openSettingsModal());
        document.getElementById('btn-filter-income-apply')?.addEventListener('click', () => this.filterIncome());
        document.getElementById('btn-filter-expense-apply')?.addEventListener('click', () => this.filterExpense());
        document.getElementById('btn-filter-round-apply')?.addEventListener('click', () => this.renderRoundsFeed());
        document.getElementById('btn-sync-from-ledger')?.addEventListener('click', () => this.syncFromLedger());
        document.getElementById('btn-sync-from-ledger-round')?.addEventListener('click', () => this.syncFromLedger());
        document.getElementById('btn-bulk-revert-income')?.addEventListener('click', () => this.bulkRevertToPersonalLedger(true));
        document.getElementById('btn-bulk-revert-expense')?.addEventListener('click', () => this.bulkRevertToPersonalLedger(false));

        // 모임 라운드 기간 숏컷
        document.getElementById('btn-round-all-time')?.addEventListener('click', () => {
            const s = document.getElementById('round-filter-start');
            const e = document.getElementById('round-filter-end');
            if (s) s.value = '2020-01-01';
            if (e) e.value = Utils.today();
            this.renderRoundsFeed();
        });
        document.getElementById('btn-round-this-month')?.addEventListener('click', () => {
            const s = document.getElementById('round-filter-start');
            const e = document.getElementById('round-filter-end');
            if (s) s.value = Utils.monthStart();
            if (e) e.value = Utils.today();
            this.renderRoundsFeed();
        });
        document.getElementById('btn-round-last-month')?.addEventListener('click', () => {
            const now = new Date();
            const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
            const s = document.getElementById('round-filter-start');
            const e = document.getElementById('round-filter-end');
            if (s) s.value = Utils.formatDate(lastMonthFirst);
            if (e) e.value = Utils.formatDate(lastMonthLast);
            this.renderRoundsFeed();
        });

        // 입금 기간 숏컷
        document.getElementById('btn-inc-all-time')?.addEventListener('click', () => {
            const s = document.getElementById('inc-filter-start');
            const e = document.getElementById('inc-filter-end');
            if (s) s.value = '2020-01-01';
            if (e) e.value = Utils.today();
            this.filterIncome();
        });
        document.getElementById('btn-inc-this-month')?.addEventListener('click', () => {
            const s = document.getElementById('inc-filter-start');
            const e = document.getElementById('inc-filter-end');
            if (s) s.value = Utils.monthStart();
            if (e) e.value = Utils.today();
            this.filterIncome();
        });
        document.getElementById('btn-inc-last-month')?.addEventListener('click', () => {
            const now = new Date();
            const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
            const s = document.getElementById('inc-filter-start');
            const e = document.getElementById('inc-filter-end');
            if (s) s.value = Utils.formatDate(lastMonthFirst);
            if (e) e.value = Utils.formatDate(lastMonthLast);
            this.filterIncome();
        });

        // 지출 기간 숏컷
        document.getElementById('btn-exp-all-time')?.addEventListener('click', () => {
            const s = document.getElementById('exp-filter-start');
            const e = document.getElementById('exp-filter-end');
            if (s) s.value = '2020-01-01';
            if (e) e.value = Utils.today();
            this.filterExpense();
        });
        document.getElementById('btn-exp-this-month')?.addEventListener('click', () => {
            const s = document.getElementById('exp-filter-start');
            const e = document.getElementById('exp-filter-end');
            if (s) s.value = Utils.monthStart();
            if (e) e.value = Utils.today();
            this.filterExpense();
        });
        document.getElementById('btn-exp-last-month')?.addEventListener('click', () => {
            const now = new Date();
            const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
            const s = document.getElementById('exp-filter-start');
            const e = document.getElementById('exp-filter-end');
            if (s) s.value = Utils.formatDate(lastMonthFirst);
            if (e) e.value = Utils.formatDate(lastMonthLast);
            this.filterExpense();
        });
    },

    /** 가계부에 남아있는 회비 입금 거래 자동 스캔 & 일괄 가져오기 */
    async syncFromLedger() {
        const allTx = await Store.getTransactions({ limit: 1000 });
        const duesTxList = allTx.filter(t => !t.is_game_dues && Utils.isLikelyGameDues(t.type, t.memo));

        if (duesTxList.length === 0) {
            Utils.toast('가계부에 이전할 새로운 게임회비 입금 내역이 없습니다.', 'info');
            return;
        }

        const totalAmt = duesTxList.reduce((s, t) => s + Utils.parseAmount(t.amount), 0);
        const ok = confirm(`개인 가계부에서 감지된 ${duesTxList.length}건(총 ${Utils.formatVND(totalAmt)})의 멤버 회비 입금을\n게임회비 관리로 가져올까요?\n(가계부에는 취소선으로 보존되어 중복 생성을 방지합니다)`);
        if (!ok) return;

        let successCount = 0;
        for (const tx of duesTxList) {
            await Store.convertPersonalTxToGameDues(tx);
            successCount++;
        }

        Utils.toast(`🎉 총 ${successCount}건의 게임회비를 가계부에서 가져왔습니다!`, 'success');
        await this.refresh();
    },

    /** 특정 모임 날짜 집중 보기 선택 */
    selectDate(dateKey) {
        this._selectedDate = dateKey;
        this.renderGroupedView();
        const container = document.getElementById('grouped-rounds-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    /** 전체 모임 리스트로 복귀 */
    clearSelectedDate() {
        this._selectedDate = null;
        this.renderGroupedView();
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAB SWITCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    switchTab(tab) {
        this._activeTab = tab;
        ['rounds', 'income', 'expense', 'members'].forEach(t => {
            document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
            document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
        });
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⛳ 1순위: 날짜별 모임 정산 피드 렌더링
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    renderRoundsFeed() {
        const container = document.getElementById('rounds-cards-container');
        const badgeRounds = document.getElementById('badge-rounds');
        if (!container) return;

        const start = document.getElementById('round-filter-start')?.value || '';
        const end   = document.getElementById('round-filter-end')?.value || '';

        // 1. 날짜별 그룹핑
        const dateMap = {};

        this._incomeList.forEach(inc => {
            const d = Utils.formatDate(inc.tx_date);
            if (start && d < start) return;
            if (end && d > end) return;
            if (!dateMap[d]) dateMap[d] = { date: d, incomes: [], expenses: [] };
            dateMap[d].incomes.push(inc);
        });

        this._expenseList.forEach(exp => {
            const d = Utils.formatDate(exp.tx_date);
            if (start && d < start) return;
            if (end && d > end) return;
            if (!dateMap[d]) dateMap[d] = { date: d, incomes: [], expenses: [] };
            dateMap[d].expenses.push(exp);
        });

        const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
        if (badgeRounds) badgeRounds.textContent = `${sortedDates.length}개 모임`;

        if (sortedDates.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:12px;color:var(--text-muted);">
                    <div style="font-size:2rem;margin-bottom:8px;">⛳</div>
                    <div style="font-size:1rem;font-weight:600;">조회된 모임 정산 내역이 없습니다</div>
                    <div style="font-size:0.82rem;margin-top:6px;">상단의 [+ 입금 등록] 또는 [+ 지출 등록] 버튼으로 모임 내역을 추가해보세요.</div>
                </div>
            `;
            return;
        }

        // 모바일/단일 날짜 집중 모드 처리
        let datesToRender = sortedDates;
        let navHeaderHtml = '';

        if (this._selectedDate && dateMap[this._selectedDate]) {
            datesToRender = [this._selectedDate];
            const currIdx = sortedDates.indexOf(this._selectedDate);
            const prevDate = currIdx < sortedDates.length - 1 ? sortedDates[currIdx + 1] : null;
            const nextDate = currIdx > 0 ? sortedDates[currIdx - 1] : null;

            navHeaderHtml = `
                <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(251,191,36,0.1));border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button class="btn btn-primary btn-sm" onclick="GameDuesPage.clearSelectedDate()" style="font-weight:700;padding:4px 12px;font-size:0.82rem;">
                            ⬅️ 전체 모임 목록 보기
                        </button>
                        <span style="font-weight:700;color:#fbbf24;font-size:0.92rem;">🗓️ ${Utils.formatDateKR(this._selectedDate)} 모임 상세</span>
                    </div>
                    <div style="display:flex;gap:6px;">
                        ${prevDate ? `<button class="btn btn-ghost btn-sm" onclick="GameDuesPage.selectDate('${prevDate}')" style="font-size:0.75rem;padding:3px 8px;">◀ 이전 (${Utils.formatDateKR(prevDate)})</button>` : ''}
                        ${nextDate ? `<button class="btn btn-ghost btn-sm" onclick="GameDuesPage.selectDate('${nextDate}')" style="font-size:0.75rem;padding:3px 8px;">다음 (${Utils.formatDateKR(nextDate)}) ▶</button>` : ''}
                    </div>
                </div>
            `;
        } else if (sortedDates.length > 1) {
            // 전체 목록 모드일 때 모바일 빠른 날짜 점프 바
            navHeaderHtml = `
                <div style="margin-bottom:12px;display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;">
                    <span style="font-size:0.78rem;color:var(--text-muted);display:flex;align-items:center;white-space:nowrap;margin-right:2px;">⚡ 날짜별 바로보기:</span>
                    ${sortedDates.map(d => `
                        <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.selectDate('${d}')" style="padding:2px 8px;font-size:0.75rem;white-space:nowrap;border-color:rgba(255,255,255,0.12);">
                            📅 ${Utils.formatDateKR(d)}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = navHeaderHtml + datesToRender.map(dateKey => {
            const grp = dateMap[dateKey];
            const dateTitle = Utils.formatDateKR(grp.date);
            const totalInc = grp.incomes.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);
            const totalExp = grp.expenses.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);
            const rawBalance = totalInc - totalExp;

            // 🌟 5만동 이하 잔액 총무 수고비 자동 처리 (5만동 이하일 때만 0으로 정산)
            const isManagerTipEligible = rawBalance > 0 && rawBalance <= 50000;
            const managerTip = isManagerTipEligible ? rawBalance : 0;
            const displayTotalExp = totalExp + managerTip;
            const finalBalance = isManagerTipEligible ? 0 : rawBalance;

            // 스크린비 vs 식사비 지출 분류
            let screenExp = 0;
            let mealExp = 0;
            let otherExp = 0;

            grp.expenses.forEach(e => {
                const text = `${e.title || ''} ${e.memo || ''}`.toLowerCase();
                const amt = Utils.parseAmount(e.amount);
                if (/(?:스크린|골프|screen|golf|라운딩|round|zone)/i.test(text)) {
                    screenExp += amt;
                } else if (/(?:식사|회식|밥|술|식당|저녁|점심|고기|맥주|커피|meal|dinner)/i.test(text)) {
                    mealExp += amt;
                } else {
                    otherExp += amt;
                }
            });

            const balColor = finalBalance > 0 ? '#34d399' : (finalBalance === 0 ? '#818cf8' : '#fb7185');
            const balSign = finalBalance > 0 ? '+' : '';

            // 좌측: 멤버별 입금 리스트 (김상국 본인 회비 가계부 지출 연동)
            const incItemsHtml = grp.incomes.length > 0 ? grp.incomes.map(inc => {
                const initials = (inc.member_name || '?').slice(0, 2).toUpperCase();
                const amt = Utils.parseAmount(inc.amount);
                const isMe = /(?:김상국|상국|본인|나)/i.test(inc.member_name);

                let myLedgerBadge = '';
                if (isMe) {
                    const incDateStr = Utils.formatDate(inc.tx_date);
                    const matched = (this._personalTxList || []).find(t => {
                        return String(t.type).toLowerCase() === 'expense' &&
                               Utils.formatDate(t.tx_date) === incDateStr &&
                               Utils.parseAmount(t.amount) === amt;
                    });

                    myLedgerBadge = matched
                        ? `<span class="badge" style="background:rgba(52,211,153,0.15);color:#34d399;font-size:0.65rem;padding:1px 5px;border:1px solid rgba(52,211,153,0.3);" title="내 개인 가계부에 지출(골프/회비)로 정상 기록됨">✅ 가계부 지출 반영됨</span>`
                        : `<button class="btn btn-ghost btn-sm" onclick="GameDuesPage.copyMyDuesToPersonalLedger('${inc.id}')" style="background:rgba(251,191,36,0.15);color:#fbbf24;font-size:0.65rem;padding:1px 6px;border:1px solid rgba(251,191,36,0.4);font-weight:700;" title="클릭 시 내 개인 가계부에 지출(취미/골프회비)로 1초 등록!">+ 내 가계부 지출 등록</button>`;
                }

                return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.82rem;gap:6px;${isMe ? 'background:rgba(99,102,241,0.05);border-radius:4px;padding-left:4px;' : ''}"
                         ondblclick="GameDuesPage.openEditIncomeModal('${inc.id}')" title="더블클릭하여 금액/이름 수정">
                        <div style="display:flex;align-items:center;gap:5px;overflow:hidden;flex-wrap:wrap;">
                            <div style="width:22px;height:22px;border-radius:50%;background:${isMe ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)'};
                                        display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>
                            <span style="font-weight:700;color:${isMe ? '#fbbf24' : 'var(--text-primary)'};white-space:nowrap;">${Utils.escapeHtml(inc.member_name)}${isMe ? ' (본인)' : ''}</span>
                            ${myLedgerBadge}
                            ${inc.memo ? `<span style="color:var(--text-muted);font-size:0.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${Utils.escapeHtml(inc.memo)}">(${Utils.escapeHtml(inc.memo)})</span>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;" onclick="event.stopPropagation()">
                            <span style="font-weight:700;color:#34d399;font-size:0.86rem;">+${Utils.formatVND(amt)}</span>
                            <button class="btn btn-icon btn-sm" onclick="GameDuesPage.openEditIncomeModal('${inc.id}')" style="padding:1px 4px;font-size:0.72rem;" title="금액/이름 수정">✏️</button>
                            <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.revertToPersonalLedger('${inc.id}', true)" style="padding:1px 5px;font-size:0.68rem;border-color:rgba(99,102,241,0.4);color:#818cf8;" title="회비가 아님: 게임회비에서 빼고 개인 가계부(입금)로 이동">💰가계부로</button>
                            <button class="btn btn-icon btn-sm" onclick="GameDuesPage.deleteIncome('${inc.id}')" style="padding:1px 3px;font-size:0.68rem;" title="삭제">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('') : '<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0;">입금 내역 없음</div>';

            // 우측: 지출 내역 리스트
            let expRows = grp.expenses.map(exp => {
                const text = `${exp.title || ''} ${exp.memo || ''}`.toLowerCase();
                const amt = Utils.parseAmount(exp.amount);
                const isScreen = /(?:스크린|골프|screen|golf|라운딩|round)/i.test(text);
                const isMeal = /(?:식사|회식|밥|술|식당|저녁|점심|고기|맥주|meal|dinner)/i.test(text);
                const badgeTag = isScreen
                    ? '<span class="badge badge-indigo" style="font-size:0.68rem;padding:1px 5px;">⛳ 스크린</span>'
                    : (isMeal ? '<span class="badge badge-amber" style="font-size:0.68rem;padding:1px 5px;">🍖 회식/식사</span>' : '<span class="badge badge-expense" style="font-size:0.68rem;padding:1px 5px;">기타</span>');

                return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.82rem;gap:6px;"
                         ondblclick="GameDuesPage.openEditExpenseModal('${exp.id}')" title="더블클릭하여 금액/내용 수정">
                        <div style="display:flex;align-items:center;gap:5px;overflow:hidden;flex-wrap:wrap;">
                            ${badgeTag}
                            <span style="font-weight:600;color:var(--text-primary);white-space:nowrap;">${Utils.escapeHtml(exp.title || '지출')}</span>
                            ${exp.memo ? `<span style="color:var(--text-muted);font-size:0.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${Utils.escapeHtml(exp.memo)}">(${Utils.escapeHtml(exp.memo)})</span>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;" onclick="event.stopPropagation()">
                            <span style="font-weight:700;color:#fb7185;font-size:0.86rem;">-${Utils.formatVND(amt)}</span>
                            <button class="btn btn-icon btn-sm" onclick="GameDuesPage.openEditExpenseModal('${exp.id}')" style="padding:1px 4px;font-size:0.72rem;" title="금액/지출내용 수정">✏️</button>
                            <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.revertToPersonalLedger('${exp.id}', false)" style="padding:1px 5px;font-size:0.68rem;border-color:rgba(99,102,241,0.4);color:#818cf8;" title="모임 지출이 아님: 가계부 지출로 이동">💰가계부로</button>
                            <button class="btn btn-icon btn-sm" onclick="GameDuesPage.deleteExpense('${exp.id}')" style="padding:1px 3px;font-size:0.68rem;" title="삭제">🗑️</button>
                        </div>
                    </div>
                `;
            });

            // ☕ 5만동 이하 총무 수고비 행 추가
            if (isManagerTipEligible) {
                expRows.push(`
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(251,191,36,0.15);font-size:0.82rem;gap:6px;background:rgba(251,191,36,0.04);border-radius:4px;margin-top:2px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span class="badge badge-amber" style="font-size:0.68rem;padding:1px 5px;background:rgba(251,191,36,0.2);color:#fbbf24;">☕ 총무 수고비</span>
                            <span style="font-weight:600;color:#fbbf24;">모임 잔액 자동 수고비</span>
                            <span style="color:var(--text-muted);font-size:0.72rem;">(5만동 이하 0원 정산)</span>
                        </div>
                        <span style="font-weight:700;color:#fbbf24;font-size:0.86rem;padding-right:4px;">-${Utils.formatVND(managerTip)}</span>
                    </div>
                `);
            }

            const expItemsHtml = expRows.length > 0 ? expRows.join('') : '<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0;">지출 내역 없음</div>';
            const expCountText = isManagerTipEligible ? `${grp.expenses.length}건 + 수고비` : `${grp.expenses.length}건`;

            return `
            <div class="dues-round-card">
                <!-- 카드 상단 종합 요약 바 (슬림 높이) -->
                <div style="background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);padding:8px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:1.1rem;">📅</span>
                        <div>
                            <span style="font-size:0.95rem;font-weight:700;color:#fff;">${dateTitle} 모임 정산</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);margin-left:4px;">${grp.date}</span>
                        </div>
                        ${!this._selectedDate ? `<button class="btn btn-ghost btn-sm" onclick="GameDuesPage.selectDate('${grp.date}')" style="padding:1px 6px;font-size:0.7rem;margin-left:6px;border-color:rgba(251,191,36,0.4);color:#fbbf24;" title="이 날짜 모임만 집중해서 보기">🔍 이 날짜만 보기</button>` : ''}
                    </div>

                    <!-- 3대 요약 뱃지 (슬림) -->
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <div style="background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);padding:2px 8px;border-radius:6px;text-align:right;">
                            <span style="font-size:0.68rem;color:#34d399;font-weight:600;">💰 회비:</span>
                            <span style="font-size:0.86rem;font-weight:800;color:#34d399;">+${Utils.formatVND(totalInc)}</span>
                        </div>
                        <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);padding:2px 8px;border-radius:6px;text-align:right;">
                            <span style="font-size:0.68rem;color:#fb7185;font-weight:600;">💸 지출:</span>
                            <span style="font-size:0.86rem;font-weight:800;color:#fb7185;">-${Utils.formatVND(displayTotalExp)}</span>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);border:1px solid ${balColor}66;padding:2px 8px;border-radius:6px;text-align:right;">
                            <span style="font-size:0.68rem;color:var(--text-muted);font-weight:600;">⚖️ 잔액:</span>
                            <span style="font-size:0.88rem;font-weight:800;color:${balColor};">${balSign}${Utils.formatVND(finalBalance)}${isManagerTipEligible ? ' (0원 정산)' : ''}</span>
                        </div>
                    </div>
                </div>

                <!-- 지출 목적별 요약 태그 바 -->
                ${displayTotalExp > 0 ? `
                <div style="background:rgba(0,0,0,0.2);padding:4px 14px;display:flex;gap:12px;font-size:0.75rem;border-bottom:1px solid rgba(255,255,255,0.05);flex-wrap:wrap;">
                    ${screenExp > 0 ? `<span>⛳ <strong>스크린비</strong>: <span style="color:#818cf8;font-weight:700;">${Utils.formatVND(screenExp)}</span></span>` : ''}
                    ${mealExp > 0 ? `<span>🍖 <strong>식사/회식비</strong>: <span style="color:#fbbf24;font-weight:700;">${Utils.formatVND(mealExp)}</span></span>` : ''}
                    ${otherExp > 0 ? `<span>💰 <strong>기타지출</strong>: <span style="color:#94a3b8;font-weight:700;">${Utils.formatVND(otherExp)}</span></span>` : ''}
                    ${managerTip > 0 ? `<span>☕ <strong>총무 수고비</strong>: <span style="color:#fbbf24;font-weight:700;">${Utils.formatVND(managerTip)}</span></span>` : ''}
                </div>` : ''}

                <!-- 카드 본문: 2열 그리드 (입금 vs 지출) -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:10px;padding:10px 14px;">
                    <!-- 좌측: 멤버별 납부 -->
                    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:4px;">
                            <span style="font-size:0.8rem;font-weight:700;color:#34d399;">👥 멤버별 납부 (${grp.incomes.length}명)</span>
                            <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.openIncomeModal('${grp.date}')" style="padding:1px 5px;font-size:0.7rem;border-color:rgba(52,211,153,0.3);color:#34d399;">+ 입금추가</button>
                        </div>
                        ${incItemsHtml}
                    </div>

                    <!-- 우측: 지출 내역 -->
                    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:4px;">
                            <span style="font-size:0.8rem;font-weight:700;color:#fb7185;">🧾 지출 내역 (${expCountText})</span>
                            <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.openExpenseModal('${grp.date}')" style="padding:1px 5px;font-size:0.7rem;border-color:rgba(248,113,113,0.3);color:#fb7185;">+ 지출추가</button>
                        </div>
                        ${expItemsHtml}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RENDER TABLES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    renderIncomeTable(list) {
        const tbody = document.getElementById('income-tbody');
        const totalBar = document.getElementById('income-total-bar');
        if (!tbody) return;

        const selectAllCb = document.getElementById('inc-select-all');
        if (selectAllCb) selectAllCb.checked = false;
        this._updateBulkRevertButton('income');

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">입금 내역이 없습니다</td></tr>';
            if (totalBar) totalBar.textContent = '';
            return;
        }

        const total = list.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);

        tbody.innerHTML = list.map(r => {
            const dateStr = Utils.formatDate(r.tx_date);
            const name = Utils.escapeHtml(r.member_name || '');
            const initials = name.slice(0, 2) || '?';
            const amt = Utils.parseAmount(r.amount);

            return `
            <tr ondblclick="GameDuesPage.openEditIncomeModal('${r.id}')" style="cursor:pointer" title="더블클릭하여 금액/이름 수정">
                <td style="text-align:center;" onclick="event.stopPropagation()">
                    <input type="checkbox" class="inc-cb" data-id="${r.id}" style="cursor:pointer;width:16px;height:16px;">
                </td>
                <td style="white-space:nowrap;font-weight:500">${dateStr}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                                    display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#fff;flex-shrink:0">
                            ${initials}
                        </div>
                        <span style="font-weight:600">${name}</span>
                    </div>
                </td>
                <td class="amount-income">+${Utils.formatVND(amt)}</td>
                <td style="color:var(--text-muted)">${Utils.escapeHtml(r.memo || '')}</td>
                <td style="white-space:nowrap;text-align:center;" onclick="event.stopPropagation()">
                    <button class="btn btn-icon btn-sm" onclick="GameDuesPage.openEditIncomeModal('${r.id}')" title="금액/이름 수정">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.revertToPersonalLedger('${r.id}', true)" style="padding:2px 6px;font-size:0.75rem;border-color:rgba(99,102,241,0.4);color:#818cf8;" title="이 입금을 다시 개인 가계부로 환원">💰가계부로</button>
                    <button class="btn btn-icon btn-sm" onclick="GameDuesPage.deleteIncome('${r.id}')" title="삭제">🗑️</button>
                </td>
            </tr>`;
        }).join('');

        if (totalBar) {
            totalBar.innerHTML = `조회 합계: <strong style="color:#34d399">${Utils.formatVND(total)}</strong> (${list.length}건)`;
        }

        // 체크박스 리스너
        tbody.querySelectorAll('.inc-cb').forEach(cb => {
            cb.addEventListener('change', () => this._updateBulkRevertButton('income'));
        });
        if (selectAllCb) {
            selectAllCb.onchange = (e) => {
                tbody.querySelectorAll('.inc-cb').forEach(cb => cb.checked = e.target.checked);
                this._updateBulkRevertButton('income');
            };
        }
    },

    renderExpenseTable(list) {
        const tbody = document.getElementById('expense-tbody');
        const totalBar = document.getElementById('expense-total-bar');
        if (!tbody) return;

        const selectAllCb = document.getElementById('exp-select-all');
        if (selectAllCb) selectAllCb.checked = false;
        this._updateBulkRevertButton('expense');

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">지출 내역이 없습니다</td></tr>';
            if (totalBar) totalBar.textContent = '';
            return;
        }

        const total = list.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);

        tbody.innerHTML = list.map(r => {
            const dateStr = Utils.formatDate(r.tx_date);
            const amt = Utils.parseAmount(r.amount);

            // 🔍 가계부 지출 대조
            const matchedPersonalTx = (this._personalTxList || []).find(t => {
                return String(t.type).toLowerCase() === 'expense' &&
                       Utils.formatDate(t.tx_date) === dateStr &&
                       Utils.parseAmount(t.amount) === amt;
            });

            const ledgerBadge = matchedPersonalTx
                ? `<span class="badge" style="background:rgba(52,211,153,0.15);color:#34d399;font-size:0.68rem;padding:1px 5px;border:1px solid rgba(52,211,153,0.3);margin-left:6px;" title="내 개인 가계부에도 정상 등록되어 있음">✅ 가계부 반영</span>`
                : `<button class="btn btn-ghost btn-sm" onclick="GameDuesPage.copyExpenseToPersonalLedger('${r.id}')" style="background:rgba(251,191,36,0.1);color:#fbbf24;font-size:0.68rem;padding:1px 6px;border:1px solid rgba(251,191,36,0.3);margin-left:6px;font-weight:700;" title="가계부에 지출 내역이 없음! 클릭 시 내 가계부 지출로 즉시 복사 등록">+ 가계부 미기록</button>`;

            return `
            <tr ondblclick="GameDuesPage.openEditExpenseModal('${r.id}')" style="cursor:pointer" title="더블클릭하여 금액/내용 수정">
                <td style="text-align:center;" onclick="event.stopPropagation()">
                    <input type="checkbox" class="exp-cb" data-id="${r.id}" style="cursor:pointer;width:16px;height:16px;">
                </td>
                <td style="white-space:nowrap;font-weight:500">${dateStr}</td>
                <td>
                    <span style="font-weight:600">${Utils.escapeHtml(r.title || '')}</span>
                    ${ledgerBadge}
                </td>
                <td class="amount-expense">-${Utils.formatVND(amt)}</td>
                <td style="color:var(--text-muted)">${Utils.escapeHtml(r.memo || '')}</td>
                <td style="white-space:nowrap;text-align:center;" onclick="event.stopPropagation()">
                    <button class="btn btn-icon btn-sm" onclick="GameDuesPage.openEditExpenseModal('${r.id}')" title="금액/내용 수정">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.revertToPersonalLedger('${r.id}', false)" style="padding:2px 6px;font-size:0.75rem;border-color:rgba(99,102,241,0.4);color:#818cf8;" title="이 지출을 다시 개인 가계부로 환원">💰가계부로</button>
                    <button class="btn btn-icon btn-sm" onclick="GameDuesPage.deleteExpense('${r.id}')" title="삭제">🗑️</button>
                </td>
            </tr>`;
        }).join('');

        if (totalBar) {
            totalBar.innerHTML = `조회 합계: <strong style="color:#fb7185">${Utils.formatVND(total)}</strong> (${list.length}건)`;
        }

        tbody.querySelectorAll('.exp-cb').forEach(cb => {
            cb.addEventListener('change', () => this._updateBulkRevertButton('expense'));
        });
        if (selectAllCb) {
            selectAllCb.onchange = (e) => {
                tbody.querySelectorAll('.exp-cb').forEach(cb => cb.checked = e.target.checked);
                this._updateBulkRevertButton('expense');
            };
        }
    },

    _updateBulkRevertButton(type = 'income') {
        const checked = document.querySelectorAll(`.${type === 'income' ? 'inc' : 'exp'}-cb:checked`);
        const btn = document.getElementById(`btn-bulk-revert-${type}`);
        if (btn) {
            if (checked.length > 0) {
                btn.classList.remove('hidden');
                btn.textContent = `💰 선택 ${checked.length}건 가계부로 되돌리기`;
            } else {
                btn.classList.add('hidden');
            }
        }
    },

    /** 단일 회비 항목을 개인 가계부로 되돌리기 */
    async revertToPersonalLedger(id, isIncome = true) {
        const list = isIncome ? this._incomeList : this._expenseList;
        const item = list.find(r => String(r.id) === String(id));
        if (!item) return;

        const title = isIncome ? `${item.member_name} 입금 (${Utils.formatVND(item.amount)})` : `${item.title || '지출'} (${Utils.formatVND(item.amount)})`;
        const ok = confirm(`[${title}]\n이 내역을 게임회비 관리에서 제외하고, 다시 [개인 가계부]로 되돌릴까요?`);
        if (!ok) return;

        const success = await Store.convertGameDuesToPersonalTx(item, isIncome);
        if (success) {
            Utils.toast('💰 개인 가계부로 성공적으로 복원되었습니다!', 'success');
            await this.refresh();
        }
    },

    /** 선택 항목들 일괄 개인 가계부로 되돌리기 */
    async bulkRevertToPersonalLedger(isIncome = true) {
        const type = isIncome ? 'income' : 'expense';
        const checked = document.querySelectorAll(`.${isIncome ? 'inc' : 'exp'}-cb:checked`);
        const ids = Array.from(checked).map(cb => cb.dataset.id);
        if (ids.length === 0) return;

        const ok = confirm(`선택한 ${ids.length}건의 내역을 게임회비에서 제외하고, [개인 가계부]로 일괄 되돌릴까요?`);
        if (!ok) return;

        const list = isIncome ? this._incomeList : this._expenseList;
        let count = 0;
        for (const id of ids) {
            const item = list.find(r => String(r.id) === String(id));
            if (item) {
                await Store.convertGameDuesToPersonalTx(item, isIncome);
                count++;
            }
        }

        Utils.toast(`🎉 총 ${count}건이 개인 가계부로 복원되었습니다!`, 'success');
        await this.refresh();
    },

    /** 게임회비 지출을 개인 가계부에도 지출로 복사 등록 (총무 본인 결제분 반영) */
    async copyExpenseToPersonalLedger(id) {
        const item = this._expenseList.find(r => String(r.id) === String(id));
        if (!item) return;

        const categories = await Store.getCategories();
        // 레저/취미 or 식비 or 기타 카테고리 매칭
        const isScreen = /(?:스크린|골프|screen|golf|라운딩|round)/i.test(`${item.title} ${item.memo}`);
        const isMeal = /(?:식사|회식|밥|술|식당|저녁|점심|고기|맥주|meal|dinner)/i.test(`${item.title} ${item.memo}`);

        let cat = categories.find(c => isScreen ? /취미|레저|문화|골프/i.test(c.name) : (isMeal ? /식비|외식|식사/i.test(c.name) : false));
        if (!cat) cat = categories.find(c => /기타|생활/i.test(c.name)) || categories[0];

        const memoStr = `[게임회비 결제] ${item.title || '지출'}${item.memo ? ' (' + item.memo + ')' : ''}`;

        const ok = confirm(`[${Utils.formatDateKR(item.tx_date)} - ${item.title}]\n금액: ${Utils.formatVND(item.amount)}\n\n이 모임 지출을 [내 개인 가계부]의 지출로 등록할까요?\n(카테고리: ${cat ? cat.name : '기타'})`);
        if (!ok) return;

        await Store.addTransaction({
            tx_date: item.tx_date,
            type: 'expense',
            amount: item.amount,
            category_id: cat ? cat.id : null,
            payment_method: 'account',
            memo: memoStr
        });

        Utils.toast(`✅ 개인 가계부에 ${Utils.formatVND(item.amount)} 지출이 등록되었습니다!`, 'success');
        await this.refresh();
    },

    renderMemberGrid() {
        const container = document.getElementById('member-grid-container');
        if (!container) return;

        const members = this._getMemberStats();
        const S = this._calcSummary();

        if (members.length === 0) {
            container.innerHTML = `
                <div class="dues-empty">
                    <span class="dues-empty-icon">👥</span>
                    <p>아직 등록된 멤버가 없습니다</p>
                </div>`;
            return;
        }

        const perPerson = S.perPerson;

        container.innerHTML = `
            <div class="member-grid">
                ${members.map(m => {
                    const pct = perPerson > 0 ? Math.min(100, Math.round(m.total / perPerson * 100)) : 100;
                    const isPaid = m.total >= perPerson || perPerson === 0;
                    const borderColor = isPaid ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.3)';
                    const initials = (m.name || '').slice(0, 2).toUpperCase();

                    return `
                    <div class="member-card" style="border-color:${borderColor}">
                        <div class="member-avatar">${initials}</div>
                        <div class="member-info">
                            <div class="member-name">${Utils.escapeHtml(m.name)}</div>
                            <div class="member-total">${Utils.formatVND(m.total)}</div>
                            <div class="member-count">${m.count}회 입금${perPerson > 0 ? ' · ' + pct + '%' : ''}</div>
                            ${perPerson > 0 ? `
                            <div style="margin-top:5px;height:3px;border-radius:3px;background:rgba(255,255,255,0.08)">
                                <div style="width:${pct}%;height:100%;border-radius:3px;background:${isPaid ? '#34d399' : '#fbbf24'};transition:width 0.4s"></div>
                            </div>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FILTER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    filterIncome() {
        const start = document.getElementById('inc-filter-start')?.value || '';
        const end   = document.getElementById('inc-filter-end')?.value || '';
        const name  = (document.getElementById('inc-filter-name')?.value || '').trim().toUpperCase();

        let list = this._incomeList;
        if (start) list = list.filter(r => Utils.formatDate(r.tx_date) >= start);
        if (end)   list = list.filter(r => Utils.formatDate(r.tx_date) <= end);
        if (name)  list = list.filter(r => String(r.member_name || '').toUpperCase().includes(name));

        this.renderIncomeTable(list);
    },

    filterExpense() {
        const start = document.getElementById('exp-filter-start')?.value || '';
        const end   = document.getElementById('exp-filter-end')?.value || '';

        let list = this._expenseList;
        if (start) list = list.filter(r => Utils.formatDate(r.tx_date) >= start);
        if (end)   list = list.filter(r => Utils.formatDate(r.tx_date) <= end);

        this.renderExpenseTable(list);
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MODALS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    openIncomeModal(defaultDate = null) {
        // 기존 멤버 이름 자동완성 데이터
        const knownNames = [...new Set(this._incomeList.map(r => r.member_name).filter(Boolean))];
        const datalistOpts = knownNames.map(n => `<option value="${Utils.escapeHtml(n)}">`).join('');

        Modal.open('💰 입금 내역 등록', `
            <datalist id="dl-member-names">${datalistOpts}</datalist>
            <div class="form-grid">
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" id="inc-date" value="${defaultDate || Utils.today()}">
                </div>
                <div class="form-group">
                    <label>입금자 이름 (영문/한글)</label>
                    <input type="text" id="inc-name" placeholder="예: KIM SANGKOOK, PARK, LEE" list="dl-member-names"
                           style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase(); GameDuesPage._handleIncomeNameChange(this.value)">
                </div>
                <div class="form-group full-width">
                    <label>입금액 (VND)</label>
                    <input type="text" id="inc-amount" placeholder="예: 500,000" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모 (선택)</label>
                <input type="text" id="inc-memo" placeholder="예: 8월 모임 회비">
            </div>

            <!-- 김상국 본인 회비 가계부 지출 연동 체크박스 -->
            <div class="form-group mt-md" id="wrap-sync-personal" style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:8px;padding:10px 12px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#fbbf24;font-weight:700;font-size:0.85rem;margin:0;">
                    <input type="checkbox" id="inc-sync-personal" style="width:17px;height:17px;cursor:pointer;">
                    <span>💰 내 개인 가계부에도 지출로 동시 등록 (김상국 회비 납부)</span>
                </label>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;padding-left:25px;">
                    체크 시 개인 가계부에 [지출 - 취미/골프회비]로 즉시 자동 기록되어 개인 지갑 지출이 정상 반영됩니다.
                </div>
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-income">저장</button>
        `);

        Utils.bindAmountInputFormatter(document.getElementById('inc-amount'));

        document.getElementById('btn-save-income')?.addEventListener('click', async () => {
            const date   = document.getElementById('inc-date')?.value;
            const name   = document.getElementById('inc-name')?.value?.trim().toUpperCase();
            const amount = Utils.parseAmount(document.getElementById('inc-amount')?.value);
            const memo   = document.getElementById('inc-memo')?.value?.trim() || '';
            const syncToPersonal = document.getElementById('inc-sync-personal')?.checked;

            if (!date)   { Utils.toast('날짜를 입력하세요', 'error'); return; }
            if (!name)   { Utils.toast('입금자 이름을 입력하세요', 'error'); return; }
            if (amount <= 0) { Utils.toast('입금액을 입력하세요', 'error'); return; }

            const btn = document.getElementById('btn-save-income');
            if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

            // 1. 게임회비 입금 등록
            await this._addIncome({ tx_date: date, member_name: name, amount, memo });

            // 2. 가계부 지출 동시 등록 선택 시
            if (syncToPersonal) {
                try {
                    const categories = await Store.getCategories();
                    const cat = categories.find(c => /취미|레저|문화|골프/i.test(c.name)) || categories.find(c => /기타/i.test(c.name)) || categories[0];
                    const dateKR = Utils.formatDateKR(date);
                    const memoStr = `[게임회비] ${dateKR} 모임 본인 회비 납부 (${name})${memo ? ' - ' + memo : ''}`;

                    await Store.addTransaction({
                        tx_date: date,
                        type: 'expense',
                        amount: amount,
                        category_id: cat ? cat.id : null,
                        payment_method: 'account',
                        memo: memoStr
                    });
                    Utils.toast(`✅ ${name} 입금 등록 & 개인 가계부 지출(${Utils.formatVND(amount)}) 자동 연동 완료!`, 'success');
                } catch(e) {
                    console.error('가계부 지출 연동 오류:', e);
                }
            } else {
                Utils.toast(`${name} 입금 등록 완료!`, 'success');
            }

            Modal.close();
            this._refreshAll();
        });
    },

    _handleIncomeNameChange(name) {
        const isMe = /(?:김상국|상국|KIM\s*SANG|SANG\s*KOOK|본인|나)/i.test(name || '');
        const cb = document.getElementById('inc-sync-personal');
        if (cb) {
            cb.checked = isMe;
        }
    },

    openExpenseModal(defaultDate = null, defaultTitle = '') {
        Modal.open('💸 모임 지출 내역 등록', `
            <div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap;">
                <span style="font-size:0.78rem;color:var(--text-muted);display:flex;align-items:center;">빠른 선택:</span>
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('exp-title').value='⛳ 스크린 골프장 비용'" style="padding:2px 8px;font-size:0.75rem;">⛳ 스크린비</button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('exp-title').value='🍖 저녁 식사 / 회식비'" style="padding:2px 8px;font-size:0.75rem;">🍖 식사/회식비</button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('exp-title').value='☕ 음료 / 간식'" style="padding:2px 8px;font-size:0.75rem;">☕ 음료/간식</button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" id="exp-date" value="${defaultDate || Utils.today()}">
                </div>
                <div class="form-group">
                    <label>지출 내용 / 항목</label>
                    <input type="text" id="exp-title" value="${defaultTitle}" placeholder="예: 스크린 골프비, 저녁 식사">
                </div>
                <div class="form-group full-width">
                    <label>지출액 (VND)</label>
                    <input type="text" id="exp-amount" placeholder="예: 2,500,000" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모 (선택)</label>
                <input type="text" id="exp-memo" placeholder="예: 4명 참가 / 골프존 18홀">
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-expense">저장</button>
        `);

        Utils.bindAmountInputFormatter(document.getElementById('exp-amount'));

        document.getElementById('btn-save-expense')?.addEventListener('click', async () => {
            const date   = document.getElementById('exp-date')?.value;
            const title  = document.getElementById('exp-title')?.value?.trim();
            const amount = Utils.parseAmount(document.getElementById('exp-amount')?.value);
            const memo   = document.getElementById('exp-memo')?.value?.trim() || '';

            if (!date)   { Utils.toast('날짜를 입력하세요', 'error'); return; }
            if (!title)  { Utils.toast('지출 내용을 입력하세요', 'error'); return; }
            if (amount <= 0) { Utils.toast('지출액을 입력하세요', 'error'); return; }

            const btn = document.getElementById('btn-save-expense');
            if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

            await this._addExpense({ tx_date: date, title, amount, memo });
            Modal.close();
            this._refreshAll();
            Utils.toast('지출 등록 완료!', 'success');
        });
    },

    openEditIncomeModal(id) {
        const item = this._incomeList.find(r => String(r.id) === String(id));
        if (!item) { Utils.toast('해당 입금 내역을 찾을 수 없습니다', 'error'); return; }

        const knownNames = [...new Set(this._incomeList.map(r => r.member_name).filter(Boolean))];
        const datalistOpts = knownNames.map(n => `<option value="${Utils.escapeHtml(n)}">`).join('');
        const amt = Utils.parseAmount(item.amount);

        Modal.open('✏️ 게임회비 입금 내역 수정', `
            <datalist id="dl-member-names-edit">${datalistOpts}</datalist>
            <div class="form-grid">
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" id="edit-inc-date" value="${Utils.formatDate(item.tx_date)}">
                </div>
                <div class="form-group">
                    <label>입금자 이름 (영문)</label>
                    <input type="text" id="edit-inc-name" value="${Utils.escapeHtml(item.member_name || '')}" list="dl-member-names-edit"
                           style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()">
                </div>
                <div class="form-group full-width">
                    <label>입금액 (VND)</label>
                    <input type="text" id="edit-inc-amount" value="${amt > 0 ? amt.toLocaleString('ko-KR') : ''}" placeholder="예: 500,000" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모 (선택)</label>
                <input type="text" id="edit-inc-memo" value="${Utils.escapeHtml(item.memo || '')}" placeholder="예: 8월 모임 회비">
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-update-income">수정 완료</button>
        `);

        Utils.bindAmountInputFormatter(document.getElementById('edit-inc-amount'));

        document.getElementById('btn-update-income')?.addEventListener('click', async () => {
            const date   = document.getElementById('edit-inc-date')?.value;
            const name   = document.getElementById('edit-inc-name')?.value?.trim().toUpperCase();
            const amount = Utils.parseAmount(document.getElementById('edit-inc-amount')?.value);
            const memo   = document.getElementById('edit-inc-memo')?.value?.trim() || '';

            if (!date)   { Utils.toast('날짜를 입력하세요', 'error'); return; }
            if (!name)   { Utils.toast('입금자 이름을 입력하세요', 'error'); return; }
            if (amount <= 0) { Utils.toast('입금액을 입력하세요', 'error'); return; }

            const btn = document.getElementById('btn-update-income');
            if (btn) { btn.disabled = true; btn.textContent = '수정 중...'; }

            await this._updateIncome(id, { tx_date: date, member_name: name, amount, memo });
            Modal.close();
            this._refreshAll();
            Utils.toast('입금 내역이 성공적으로 수정되었습니다!', 'success');
        });
    },

    openEditExpenseModal(id) {
        const item = this._expenseList.find(r => String(r.id) === String(id));
        if (!item) { Utils.toast('해당 지출 내역을 찾을 수 없습니다', 'error'); return; }

        const amt = Utils.parseAmount(item.amount);

        Modal.open('✏️ 게임회비 지출 내역 수정', `
            <div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap;">
                <span style="font-size:0.78rem;color:var(--text-muted);display:flex;align-items:center;">빠른 선택:</span>
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('edit-exp-title').value='⛳ 스크린 골프장 비용'" style="padding:2px 8px;font-size:0.75rem;">⛳ 스크린비</button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('edit-exp-title').value='🍖 저녁 식사 / 회식비'" style="padding:2px 8px;font-size:0.75rem;">🍖 식사/회식비</button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('edit-exp-title').value='☕ 음료 / 간식'" style="padding:2px 8px;font-size:0.75rem;">☕ 음료/간식</button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" id="edit-exp-date" value="${Utils.formatDate(item.tx_date)}">
                </div>
                <div class="form-group">
                    <label>지출 내용 / 항목</label>
                    <input type="text" id="edit-exp-title" value="${Utils.escapeHtml(item.title || '')}" placeholder="예: 스크린 골프비, 저녁 식사">
                </div>
                <div class="form-group full-width">
                    <label>지출액 (VND)</label>
                    <input type="text" id="edit-exp-amount" value="${amt > 0 ? amt.toLocaleString('ko-KR') : ''}" placeholder="예: 2,500,000" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모 (선택)</label>
                <input type="text" id="edit-exp-memo" value="${Utils.escapeHtml(item.memo || '')}" placeholder="예: 4명 참가 / 골프존 18홀">
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-update-expense">수정 완료</button>
        `);

        Utils.bindAmountInputFormatter(document.getElementById('edit-exp-amount'));

        document.getElementById('btn-update-expense')?.addEventListener('click', async () => {
            const date   = document.getElementById('edit-exp-date')?.value;
            const title  = document.getElementById('edit-exp-title')?.value?.trim();
            const amount = Utils.parseAmount(document.getElementById('edit-exp-amount')?.value);
            const memo   = document.getElementById('edit-exp-memo')?.value?.trim() || '';

            if (!date)   { Utils.toast('날짜를 입력하세요', 'error'); return; }
            if (!title)  { Utils.toast('지출 내용을 입력하세요', 'error'); return; }
            if (amount <= 0) { Utils.toast('지출액을 입력하세요', 'error'); return; }

            const btn = document.getElementById('btn-update-expense');
            if (btn) { btn.disabled = true; btn.textContent = '수정 중...'; }

            await this._updateExpense(id, { tx_date: date, title, amount, memo });
            Modal.close();
            this._refreshAll();
            Utils.toast('지출 내역이 성공적으로 수정되었습니다!', 'success');
        });
    },

    openSettingsModal() {
        const S = this._calcSummary();

        Modal.open('⚙️ 게임회비 설정', `
            <div style="margin-bottom:14px;font-size:0.85rem;color:var(--text-muted);line-height:1.6">
                1인당 회비와 전체 인원을 설정하면<br>
                <strong style="color:#fbbf24">내가 추가로 납부해야 할 금액</strong>을 자동 계산합니다.
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>1인당 회비 금액 (VND)</label>
                    <input type="text" id="set-per-person" value="${S.perPerson > 0 ? S.perPerson.toLocaleString('ko-KR') : ''}" placeholder="예: 500,000" inputmode="numeric">
                </div>
                <div class="form-group">
                    <label>전체 참여 인원 (명)</label>
                    <input type="number" id="set-members" value="${S.totalMembers || ''}" placeholder="예: 10" min="1" max="100">
                </div>
            </div>

            <div class="my-dues-calc-box" id="settings-preview">
                ${this._renderCalcPreview(S)}
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-settings">저장</button>
        `);

        Utils.bindAmountInputFormatter(document.getElementById('set-per-person'));

        // 실시간 미리보기 업데이트
        const updatePreview = () => {
            const pp = Utils.parseAmount(document.getElementById('set-per-person')?.value || '0');
            const tm = parseInt(document.getElementById('set-members')?.value || '0') || 0;
            const totalIncome = this._incomeList.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);
            const expected = pp * tm;
            const shortfall = Math.max(0, expected - totalIncome);
            const preview = { perPerson: pp, totalMembers: tm, expectedTotal: expected, myShortfall: shortfall, totalIncome };
            const box = document.getElementById('settings-preview');
            if (box) box.innerHTML = this._renderCalcPreview(preview);
        };

        document.getElementById('set-per-person')?.addEventListener('input', updatePreview);
        document.getElementById('set-members')?.addEventListener('input', updatePreview);

        document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
            const perPerson    = Utils.parseAmount(document.getElementById('set-per-person')?.value || '0');
            const totalMembers = parseInt(document.getElementById('set-members')?.value || '0') || 0;

            this._settings = { perPerson, totalMembers };
            await this._saveSettings(this._settings);
            Modal.close();
            this._refreshAll();
            Utils.toast('설정이 저장되었습니다', 'success');
        });
    },

    _renderCalcPreview(S) {
        const totalInc = S.totalIncome !== undefined ? S.totalIncome : this._incomeList.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);
        return `
            <div class="calc-row">
                <span class="calc-label">예상 총 회비</span>
                <span class="calc-value">${S.totalMembers > 0 ? S.totalMembers + '명 × ' + Utils.formatVND(S.perPerson) : '—'} = ${Utils.formatVND(S.expectedTotal || 0)}</span>
            </div>
            <div class="calc-row">
                <span class="calc-label">멤버 입금 합계</span>
                <span class="calc-value" style="color:#34d399">${Utils.formatVND(totalInc)}</span>
            </div>
            <div class="calc-row">
                <span class="calc-label">👤 내 추가 납부액</span>
                <span class="calc-value highlight">${Utils.formatVND(S.myShortfall || 0)}</span>
            </div>
        `;
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 잔액 이월 (다음 모임으로 잔액 입금 이관)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    openCarryoverModal(balance) {
        const amt = Math.abs(Utils.parseAmount(balance));
        if (amt <= 0) {
            Utils.toast('이월할 잔액이 없습니다', 'error');
            return;
        }

        // 다음 모임 날짜 기본값: 오늘 이후 가장 가까운 날짜 또는 오늘
        const nextDate = Utils.today();

        Modal.open('🔄 게임회비 잔액 이월 등록', `
            <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">이월할 잔액 금액</div>
                <div style="font-size:1.4rem;font-weight:800;color:#fbbf24;">🏦 ${Utils.formatVND(amt)}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
                    이 금액은 게임회비 공금으로, 선택한 날짜의 <strong style="color:#34d399">입금 내역</strong>에 자동 등록됩니다.
                </div>
            </div>

            <div class="form-grid">
                <div class="form-group">
                    <label>📅 이월할 날짜 (다음 모임 날짜)</label>
                    <input type="date" id="carryover-date" value="${nextDate}">
                </div>
                <div class="form-group">
                    <label>이월 금액 (VND) — 수정 가능</label>
                    <input type="text" id="carryover-amount" value="${amt.toLocaleString('ko-KR')}" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모 (선택)</label>
                <input type="text" id="carryover-memo" value="이전 모임 잔액 이월" placeholder="예: 8월 26일 잔액 이월">
            </div>

            <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:8px;padding:8px 12px;margin-top:12px;font-size:0.78rem;color:var(--text-muted);">
                💡 이월된 잔액은 <strong style="color:#818cf8">게임회비 입금 내역</strong>에만 등록되며, 개인 가계부에는 영향을 주지 않습니다.
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-carryover" style="background:#f59e0b;border-color:#f59e0b;">🔄 이월 등록</button>
        `);

        Utils.bindAmountInputFormatter(document.getElementById('carryover-amount'));

        document.getElementById('btn-save-carryover')?.addEventListener('click', async () => {
            const date   = document.getElementById('carryover-date')?.value;
            const amount = Utils.parseAmount(document.getElementById('carryover-amount')?.value);
            const memo   = document.getElementById('carryover-memo')?.value?.trim() || '이전 모임 잔액 이월';

            if (!date)      { Utils.toast('날짜를 입력하세요', 'error'); return; }
            if (amount <= 0){ Utils.toast('이월 금액을 입력하세요', 'error'); return; }

            const btn = document.getElementById('btn-save-carryover');
            if (btn) { btn.disabled = true; btn.textContent = '등록 중...'; }

            await this._addIncome({
                tx_date: date,
                member_name: '이월잔액',
                amount: amount,
                memo: `[🔄 이월] ${memo}`
            });

            Modal.close();
            this._refreshAll();
            Utils.toast(`✅ ${Utils.formatDateKR(date)}에 이월 잔액 ${Utils.formatVND(amount)} 입금 등록 완료!`, 'success');
        });
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DELETE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async deleteIncome(id) {
        if (!confirm('이 입금 내역을 삭제할까요?')) return;
        await this._deleteIncome(id);
        this._refreshAll();
        Utils.toast('삭제되었습니다', 'info');
    },

    async deleteExpense(id) {
        if (!confirm('이 지출 내역을 삭제할까요?')) return;
        await this._deleteExpense(id);
        this._refreshAll();
        Utils.toast('삭제되었습니다', 'info');
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // REFRESH — 요약 카드 + 테이블 + 멤버 전체 갱신
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    _refreshAll() {
        const S = this._calcSummary();
        const members = this._getMemberStats();

        // 요약 카드 업데이트
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const setHTML = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

        set('dues-val-income', Utils.formatVND(S.totalIncome));
        set('dues-val-expense', Utils.formatVND(S.totalExpense));
        set('dues-val-balance', Utils.formatVND(S.balance));
        set('dues-val-myshortfall', Utils.formatVND(S.myShortfall));
        set('dues-val-myshortfall-sub', S.totalMembers > 0
            ? `${S.totalMembers}명 × ${Utils.formatVND(S.perPerson)}`
            : '설정 필요');

        // 잔액 색상 동적 업데이트
        const balEl = document.getElementById('dues-val-balance');
        if (balEl) {
            balEl.style.color = S.balance > 0 ? '#34d399' : (S.balance < 0 ? '#fb7185' : '#818cf8');
        }

        // 이월 버튼 동적 갱신 (잔액 > 0 시 표시, 0 이하 시 숨김)
        const carryoverBtnWrap = document.getElementById('dues-carryover-btn-wrap');
        if (carryoverBtnWrap) {
            if (S.balance > 0) {
                carryoverBtnWrap.innerHTML = `
                    <button class="btn btn-ghost btn-sm" onclick="GameDuesPage.openCarryoverModal(${S.balance})"
                        style="padding:2px 9px;font-size:0.72rem;border-color:rgba(251,191,36,0.5);color:#fbbf24;font-weight:700;white-space:nowrap;"
                        title="잔액을 다음 모임 날짜의 입금으로 이월 등록">
                        🔄 다음 모임 이월
                    </button>`;
            } else {
                carryoverBtnWrap.innerHTML = '';
            }
        }

        set('disp-per-person', Utils.formatVND(S.perPerson));
        set('disp-members', `${S.totalMembers}명`);
        set('disp-expected', Utils.formatVND(S.expectedTotal));

        // 배지
        setHTML('badge-income', `<span style="background:rgba(52,211,153,0.2);color:#34d399;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${this._incomeList.length}</span>`);
        setHTML('badge-expense', `<span style="background:rgba(248,113,113,0.15);color:#fb7185;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${this._expenseList.length}</span>`);
        setHTML('badge-members', `<span style="background:rgba(99,102,241,0.2);color:#818cf8;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${members.length}명</span>`);

        // 가계부 지출 대조 배너 업데이트
        this.updateLedgerSyncBanner();

        // 테이블 & 모임 피드
        this.renderRoundsFeed();
        this.filterIncome();
        this.filterExpense();
        this.renderMemberGrid();
    },

    /** 상단 [김상국 본인 회비 가계부 지출 연동 배너] 실시간 업데이트 */
    updateLedgerSyncBanner() {
        const statText = document.getElementById('ledger-sync-stat-text');
        const actionArea = document.getElementById('ledger-sync-action-btn-area');
        if (!statText) return;

        // 김상국 본인 입금 목록 추출
        const myIncomes = this._incomeList.filter(inc => /(?:김상국|상국|본인|나)/i.test(inc.member_name));
        let matchedCount = 0;
        let unrecordedList = [];

        myIncomes.forEach(inc => {
            const incDateStr = Utils.formatDate(inc.tx_date);
            const amt = Utils.parseAmount(inc.amount);
            const matched = (this._personalTxList || []).find(t => {
                return String(t.type).toLowerCase() === 'expense' &&
                       Utils.formatDate(t.tx_date) === incDateStr &&
                       Utils.parseAmount(t.amount) === amt;
            });
            if (matched) {
                matchedCount++;
            } else {
                unrecordedList.push(inc);
            }
        });

        if (myIncomes.length === 0) {
            statText.innerHTML = `등록된 김상국(본인) 회비 납부 내역이 없습니다.`;
            if (actionArea) actionArea.innerHTML = '';
            return;
        }

        const unrecordedCount = unrecordedList.length;
        const totalMyAmt = myIncomes.reduce((s, e) => s + Utils.parseAmount(e.amount), 0);

        if (unrecordedCount === 0) {
            statText.innerHTML = `김상국 본인 회비 총 <strong style="color:#fff">${myIncomes.length}회 (${Utils.formatVND(totalMyAmt)})</strong> 모두 <strong style="color:#34d399">내 가계부 지출에 100% 반영됨 ✅</strong>`;
            if (actionArea) actionArea.innerHTML = `<span class="badge badge-income" style="font-size:0.75rem;padding:3px 8px;">완벽 일치</span>`;
        } else {
            const unrecordedAmt = unrecordedList.reduce((s, e) => s + Utils.parseAmount(e.amount), 0);
            statText.innerHTML = `본인 회비 총 ${myIncomes.length}회 중 <strong style="color:#34d399">${matchedCount}회 반영</strong> / <strong style="color:#fbbf24">${unrecordedCount}회 (${Utils.formatVND(unrecordedAmt)}) 미반영 ⚠️</strong>`;
            if (actionArea) {
                actionArea.innerHTML = `
                    <button class="btn btn-primary btn-sm" onclick="GameDuesPage.bulkCopyMyDuesToPersonalLedger()" style="background:#f59e0b;color:#000;font-weight:700;font-size:0.75rem;padding:3px 9px;">
                        ⚡ 미반영 ${unrecordedCount}건 내 가계부 지출로 일괄 등록
                    </button>
                `;
            }
        }
    },

    /** 김상국 본인 단일 회비를 개인 가계부 지출(골프/취미)로 복사 등록 */
    async copyMyDuesToPersonalLedger(id) {
        const item = this._incomeList.find(r => String(r.id) === String(id));
        if (!item) return;

        const categories = await Store.getCategories();
        let cat = categories.find(c => /취미|레저|문화|골프/i.test(c.name)) || categories.find(c => /기타/i.test(c.name)) || categories[0];

        const dateKR = Utils.formatDateKR(item.tx_date);
        const memoStr = `[게임회비] ${dateKR} 모임 본인 회비 납부`;

        const ok = confirm(`[${dateKR} 모임 - 본인 회비]\n금액: ${Utils.formatVND(item.amount)}\n\n이 본인 회비를 [내 개인 가계부]의 지출로 등록할까요?\n(카테고리: ${cat ? cat.name : '취미/레저'})`);
        if (!ok) return;

        await Store.addTransaction({
            tx_date: item.tx_date,
            type: 'expense',
            amount: item.amount,
            category_id: cat ? cat.id : null,
            payment_method: 'account',
            memo: memoStr
        });

        Utils.toast(`✅ 개인 가계부에 본인 회비 ${Utils.formatVND(item.amount)} 지출이 등록되었습니다!`, 'success');
        await this.refresh();
    },

    /** 미반영된 모든 김상국 본인 회비를 개인 가계부 지출로 일괄 등록 */
    async bulkCopyMyDuesToPersonalLedger() {
        const myIncomes = this._incomeList.filter(inc => /(?:김상국|상국|본인|나)/i.test(inc.member_name));
        const unrecordedList = [];

        myIncomes.forEach(inc => {
            const incDateStr = Utils.formatDate(inc.tx_date);
            const amt = Utils.parseAmount(inc.amount);
            const matched = (this._personalTxList || []).find(t => {
                return String(t.type).toLowerCase() === 'expense' &&
                       Utils.formatDate(t.tx_date) === incDateStr &&
                       Utils.parseAmount(t.amount) === amt;
            });
            if (!matched) unrecordedList.push(inc);
        });

        if (unrecordedList.length === 0) {
            Utils.toast('가계부에 등록할 미반영 본인 회비가 없습니다.', 'info');
            return;
        }

        const totalAmt = unrecordedList.reduce((s, e) => s + Utils.parseAmount(e.amount), 0);
        const ok = confirm(`가계부에 아직 지출로 기록되지 않은 본인 회비 ${unrecordedList.length}건 (총 ${Utils.formatVND(totalAmt)})을\n[내 개인 가계부] 지출(취미/레저)로 일괄 등록할까요?`);
        if (!ok) return;

        const categories = await Store.getCategories();
        let cat = categories.find(c => /취미|레저|문화|골프/i.test(c.name)) || categories.find(c => /기타/i.test(c.name)) || categories[0];

        for (const inc of unrecordedList) {
            const dateKR = Utils.formatDateKR(inc.tx_date);
            await Store.addTransaction({
                tx_date: inc.tx_date,
                type: 'expense',
                amount: inc.amount,
                category_id: cat ? cat.id : null,
                payment_method: 'account',
                memo: `[게임회비] ${dateKR} 모임 본인 회비 납부`
            });
        }

        Utils.toast(`🎉 총 ${unrecordedList.length}건의 본인 회비가 개인 가계부 지출로 등록되었습니다!`, 'success');
        await this.refresh();
    }
};

Router.register('gamedues', GameDuesPage);


