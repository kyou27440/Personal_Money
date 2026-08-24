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
        try {
            const { data, error } = await supabase
                .from('game_dues_income')
                .select('*')
                .order('tx_date', { ascending: false })
                .order('created_at', { ascending: false });
            if (!error && data) {
                this._saveLocal(this._KEY_INC, data);
                return data;
            }
        } catch(e) {}
        return this._loadLocal(this._KEY_INC, []);
    },

    async _loadExpense() {
        try {
            const { data, error } = await supabase
                .from('game_dues_expense')
                .select('*')
                .order('tx_date', { ascending: false })
                .order('created_at', { ascending: false });
            if (!error && data) {
                this._saveLocal(this._KEY_EXP, data);
                return data;
            }
        } catch(e) {}
        return this._loadLocal(this._KEY_EXP, []);
    },

    async _addIncome(item) {
        const payload = {
            tx_date: item.tx_date,
            member_name: (item.member_name || '').trim().toUpperCase(),
            amount: Math.abs(Utils.parseAmount(item.amount)),
            memo: (item.memo || '').trim(),
        };
        try {
            const { data, error } = await supabase
                .from('game_dues_income')
                .insert(payload).select().single();
            if (!error && data) {
                this._incomeList.unshift(data);
                this._saveLocal(this._KEY_INC, this._incomeList);
                return data;
            }
        } catch(e) {}
        // offline fallback
        const local = { ...payload, id: 'local_inc_' + Date.now(), created_at: new Date().toISOString() };
        this._incomeList.unshift(local);
        this._saveLocal(this._KEY_INC, this._incomeList);
        return local;
    },

    async _deleteIncome(id) {
        try { await supabase.from('game_dues_income').delete().eq('id', id); } catch(e) {}
        this._incomeList = this._incomeList.filter(r => String(r.id) !== String(id));
        this._saveLocal(this._KEY_INC, this._incomeList);
    },

    async _addExpense(item) {
        const payload = {
            tx_date: item.tx_date,
            title: (item.title || '').trim(),
            amount: Math.abs(Utils.parseAmount(item.amount)),
            memo: (item.memo || '').trim(),
        };
        try {
            const { data, error } = await supabase
                .from('game_dues_expense')
                .insert(payload).select().single();
            if (!error && data) {
                this._expenseList.unshift(data);
                this._saveLocal(this._KEY_EXP, this._expenseList);
                return data;
            }
        } catch(e) {}
        const local = { ...payload, id: 'local_exp_' + Date.now(), created_at: new Date().toISOString() };
        this._expenseList.unshift(local);
        this._saveLocal(this._KEY_EXP, this._expenseList);
        return local;
    },

    async _deleteExpense(id) {
        try { await supabase.from('game_dues_expense').delete().eq('id', id); } catch(e) {}
        this._expenseList = this._expenseList.filter(r => String(r.id) !== String(id));
        this._saveLocal(this._KEY_EXP, this._expenseList);
    },

    _loadSettings() {
        try {
            const raw = localStorage.getItem(this._KEY_SETTINGS);
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return { perPerson: 0, totalMembers: 0 };
    },

    _saveSettings(s) {
        try { localStorage.setItem(this._KEY_SETTINGS, JSON.stringify(s)); } catch(e) {}
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
        this._settings = this._loadSettings();
        this._incomeList  = await this._loadIncome();
        this._expenseList = await this._loadExpense();

        const S = this._calcSummary();
        const members = this._getMemberStats();

        return `
        <div style="max-width:1000px;margin:0 auto;">

            <!-- 요약 카드 -->
            <div class="dues-summary-grid">
                <div class="dues-card income">
                    <span class="dues-card-icon">💰</span>
                    <div class="dues-card-label">총 입금 (멤버)</div>
                    <div class="dues-card-value" id="dues-val-income">${Utils.formatVND(S.totalIncome)}</div>
                    <div class="dues-card-sub">${this._incomeList.length}건</div>
                </div>
                <div class="dues-card expense">
                    <span class="dues-card-icon">💸</span>
                    <div class="dues-card-label">총 지출</div>
                    <div class="dues-card-value" id="dues-val-expense">${Utils.formatVND(S.totalExpense)}</div>
                    <div class="dues-card-sub">${this._expenseList.length}건</div>
                </div>
                <div class="dues-card balance">
                    <span class="dues-card-icon">💵</span>
                    <div class="dues-card-label">현재 잔액</div>
                    <div class="dues-card-value" id="dues-val-balance">${Utils.formatVND(S.balance)}</div>
                    <div class="dues-card-sub">수령 - 지출</div>
                </div>
                <div class="dues-card my-dues">
                    <span class="dues-card-icon">👤</span>
                    <div class="dues-card-label">내 추가 납부액</div>
                    <div class="dues-card-value" id="dues-val-myshortfall">${Utils.formatVND(S.myShortfall)}</div>
                    <div class="dues-card-sub" id="dues-val-myshortfall-sub">${S.totalMembers > 0 ? `${S.totalMembers}명 × ${Utils.formatVND(S.perPerson)}` : '설정 필요'}</div>
                </div>
            </div>

            <!-- 설정 바 -->
            <div class="dues-settings-bar">
                <div class="dues-settings-info">
                    <span>⚙️ 회비 설정:</span>
                    <span>
                        1인당 <strong id="disp-per-person">${Utils.formatVND(S.perPerson)}</strong>
                        <span class="sep">×</span>
                        전체 <strong id="disp-members">${S.totalMembers}명</strong>
                        <span class="sep">=</span>
                        예상 총회비 <strong id="disp-expected">${Utils.formatVND(S.expectedTotal)}</strong>
                    </span>
                </div>
                <button class="btn btn-ghost btn-sm" id="btn-dues-settings" style="border-color:#818cf8;color:#818cf8">
                    ✏️ 회비 설정 변경
                </button>
            </div>

            <!-- 탭 -->
            <div class="dues-tabs">
                <button class="dues-tab-btn active" id="tab-income"  onclick="GameDuesPage.switchTab('income')">📥 입금 내역 <span id="badge-income" style="background:rgba(52,211,153,0.2);color:#34d399;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${this._incomeList.length}</span></button>
                <button class="dues-tab-btn" id="tab-expense" onclick="GameDuesPage.switchTab('expense')">📤 지출 내역 <span id="badge-expense" style="background:rgba(248,113,113,0.15);color:#fb7185;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${this._expenseList.length}</span></button>
                <button class="dues-tab-btn" id="tab-members" onclick="GameDuesPage.switchTab('members')">👥 멤버 현황 <span id="badge-members" style="background:rgba(99,102,241,0.2);color:#818cf8;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${members.length}명</span></button>
            </div>

            <!-- 입금 내역 패널 -->
            <div class="dues-panel active" id="panel-income">
                <div class="dues-section-header">
                    <div class="dues-section-title">💰 게임회비 입금 내역</div>
                    <div style="display:flex;gap:8px">
                        <button class="btn btn-ghost btn-sm" id="btn-filter-income-apply">🔍 조회</button>
                        <button class="btn btn-primary" id="btn-add-income">+ 입금 등록</button>
                    </div>
                </div>

                <div class="dues-filter-bar">
                    <input type="date" id="inc-filter-start" value="${Utils.monthStart()}">
                    <span style="color:var(--text-muted)">~</span>
                    <input type="date" id="inc-filter-end" value="${Utils.today()}">
                    <input type="text" id="inc-filter-name" placeholder="이름 검색" style="width:130px">
                </div>

                <div class="dues-table-wrap">
                    <table class="dues-table">
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>입금자 이름</th>
                                <th style="text-align:right">입금액</th>
                                <th>메모</th>
                                <th style="width:80px">작업</th>
                            </tr>
                        </thead>
                        <tbody id="income-tbody">
                            <tr><td colspan="5" class="text-center text-muted" style="padding:40px">로딩 중...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="income-total-bar" style="text-align:right;padding:10px 4px;font-size:0.85rem;color:var(--text-muted)"></div>
            </div>

            <!-- 지출 내역 패널 -->
            <div class="dues-panel" id="panel-expense">
                <div class="dues-section-header">
                    <div class="dues-section-title">💸 게임회비 지출 내역</div>
                    <div style="display:flex;gap:8px">
                        <button class="btn btn-ghost btn-sm" id="btn-filter-expense-apply">🔍 조회</button>
                        <button class="btn btn-primary" id="btn-add-expense">+ 지출 등록</button>
                    </div>
                </div>

                <div class="dues-filter-bar">
                    <input type="date" id="exp-filter-start" value="${Utils.monthStart()}">
                    <span style="color:var(--text-muted)">~</span>
                    <input type="date" id="exp-filter-end" value="${Utils.today()}">
                </div>

                <div class="dues-table-wrap">
                    <table class="dues-table">
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>내용</th>
                                <th style="text-align:right">지출액</th>
                                <th>메모</th>
                                <th style="width:80px">작업</th>
                            </tr>
                        </thead>
                        <tbody id="expense-tbody">
                            <tr><td colspan="5" class="text-center text-muted" style="padding:40px">로딩 중...</td></tr>
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
        this.renderIncomeTable(this._incomeList);
        this.renderExpenseTable(this._expenseList);
        this.renderMemberGrid();

        document.getElementById('btn-add-income')?.addEventListener('click', () => this.openIncomeModal());
        document.getElementById('btn-add-expense')?.addEventListener('click', () => this.openExpenseModal());
        document.getElementById('btn-dues-settings')?.addEventListener('click', () => this.openSettingsModal());
        document.getElementById('btn-filter-income-apply')?.addEventListener('click', () => this.filterIncome());
        document.getElementById('btn-filter-expense-apply')?.addEventListener('click', () => this.filterExpense());
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAB SWITCH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    switchTab(tab) {
        this._activeTab = tab;
        ['income', 'expense', 'members'].forEach(t => {
            document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
            document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
        });
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RENDER TABLES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    renderIncomeTable(list) {
        const tbody = document.getElementById('income-tbody');
        const totalBar = document.getElementById('income-total-bar');
        if (!tbody) return;

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">입금 내역이 없습니다</td></tr>';
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
            <tr>
                <td style="white-space:nowrap;font-weight:500">${dateStr}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                                    display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#fff;flex-shrink:0">
                            ${initials}
                        </div>
                        <span style="font-weight:600">${name}</span>
                    </div>
                </td>
                <td class="amount-income">+${Utils.formatVND(amt)}</td>
                <td style="color:var(--text-muted)">${Utils.escapeHtml(r.memo || '')}</td>
                <td>
                    <button class="btn btn-icon btn-sm" onclick="GameDuesPage.deleteIncome('${r.id}')" title="삭제">🗑️</button>
                </td>
            </tr>`;
        }).join('');

        if (totalBar) {
            totalBar.innerHTML = `조회 합계: <strong style="color:#34d399">${Utils.formatVND(total)}</strong> (${list.length}건)`;
        }
    },

    renderExpenseTable(list) {
        const tbody = document.getElementById('expense-tbody');
        const totalBar = document.getElementById('expense-total-bar');
        if (!tbody) return;

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">지출 내역이 없습니다</td></tr>';
            if (totalBar) totalBar.textContent = '';
            return;
        }

        const total = list.reduce((s, r) => s + Utils.parseAmount(r.amount), 0);

        tbody.innerHTML = list.map(r => {
            const dateStr = Utils.formatDate(r.tx_date);
            const amt = Utils.parseAmount(r.amount);

            return `
            <tr>
                <td style="white-space:nowrap;font-weight:500">${dateStr}</td>
                <td style="font-weight:600">${Utils.escapeHtml(r.title || '')}</td>
                <td class="amount-expense">-${Utils.formatVND(amt)}</td>
                <td style="color:var(--text-muted)">${Utils.escapeHtml(r.memo || '')}</td>
                <td>
                    <button class="btn btn-icon btn-sm" onclick="GameDuesPage.deleteExpense('${r.id}')" title="삭제">🗑️</button>
                </td>
            </tr>`;
        }).join('');

        if (totalBar) {
            totalBar.innerHTML = `조회 합계: <strong style="color:#fb7185">${Utils.formatVND(total)}</strong> (${list.length}건)`;
        }
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

    openIncomeModal() {
        // 기존 멤버 이름 자동완성 데이터
        const knownNames = [...new Set(this._incomeList.map(r => r.member_name).filter(Boolean))];
        const datalistOpts = knownNames.map(n => `<option value="${Utils.escapeHtml(n)}">`).join('');

        Modal.open('💰 입금 내역 등록', `
            <datalist id="dl-member-names">${datalistOpts}</datalist>
            <div class="form-grid">
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" id="inc-date" value="${Utils.today()}">
                </div>
                <div class="form-group">
                    <label>입금자 이름 (영문)</label>
                    <input type="text" id="inc-name" placeholder="예: PARK, KIM, LEE" list="dl-member-names"
                           style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()">
                </div>
                <div class="form-group full-width">
                    <label>입금액 (VND)</label>
                    <input type="text" id="inc-amount" placeholder="예: 500,000" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모 (선택)</label>
                <input type="text" id="inc-memo" placeholder="예: 8월 회비">
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

            if (!date)   { Utils.toast('날짜를 입력하세요', 'error'); return; }
            if (!name)   { Utils.toast('입금자 이름을 입력하세요', 'error'); return; }
            if (amount <= 0) { Utils.toast('입금액을 입력하세요', 'error'); return; }

            const btn = document.getElementById('btn-save-income');
            if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

            await this._addIncome({ tx_date: date, member_name: name, amount, memo });
            Modal.close();
            this._refreshAll();
            Utils.toast(`${name} 입금 등록 완료!`, 'success');
        });
    },

    openExpenseModal() {
        Modal.open('💸 지출 내역 등록', `
            <div class="form-grid">
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" id="exp-date" value="${Utils.today()}">
                </div>
                <div class="form-group">
                    <label>지출 내용</label>
                    <input type="text" id="exp-title" placeholder="예: 식사, 음료, 간식">
                </div>
                <div class="form-group full-width">
                    <label>지출액 (VND)</label>
                    <input type="text" id="exp-amount" placeholder="예: 2,500,000" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모 (선택)</label>
                <input type="text" id="exp-memo" placeholder="예: 라운딩 후 식사">
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

        document.getElementById('btn-save-settings')?.addEventListener('click', () => {
            const perPerson    = Utils.parseAmount(document.getElementById('set-per-person')?.value || '0');
            const totalMembers = parseInt(document.getElementById('set-members')?.value || '0') || 0;

            this._settings = { perPerson, totalMembers };
            this._saveSettings(this._settings);
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

        set('disp-per-person', Utils.formatVND(S.perPerson));
        set('disp-members', `${S.totalMembers}명`);
        set('disp-expected', Utils.formatVND(S.expectedTotal));

        // 배지
        setHTML('badge-income', `<span style="background:rgba(52,211,153,0.2);color:#34d399;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${this._incomeList.length}</span>`);
        setHTML('badge-expense', `<span style="background:rgba(248,113,113,0.15);color:#fb7185;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${this._expenseList.length}</span>`);
        setHTML('badge-members', `<span style="background:rgba(99,102,241,0.2);color:#818cf8;border-radius:10px;padding:1px 7px;font-size:0.76rem;margin-left:4px">${members.length}명</span>`);

        // 테이블
        this.filterIncome();
        this.filterExpense();
        this.renderMemberGrid();
    },
};

Router.register('gamedues', GameDuesPage);
