/* ============================================
   PERSONAL.JS — 개인 가계부 페이지
   ============================================ */

const PersonalPage = {
    async render() {
        const summary = await Store.getTransactionSummary(Utils.monthStart(), Utils.monthEnd());
        const breakdown = await Store.getBalanceBreakdown();

        return `
        <div class="personal-summary">
            <div class="summary-card emerald">
                <div class="card-label">이번 달 수입</div>
                <div class="card-value" id="summary-income">${Utils.formatVND(summary.income)}</div>
                <div class="card-sub" id="summary-income-sub" style="display:flex;justify-content:center;gap:12px;margin-top:6px;font-size:0.82rem;color:var(--text-muted);">
                    <span>💵 현금: <strong style="color:var(--accent-emerald)">${Utils.formatVND(summary.incomeCash)}</strong></span>
                    <span>💳 계좌: <strong style="color:#6366f1">${Utils.formatVND(summary.incomeTransfer)}</strong></span>
                </div>
            </div>
            <div class="summary-card rose">
                <div class="card-label">이번 달 지출</div>
                <div class="card-value" id="summary-expense">${Utils.formatVND(summary.expense)}</div>
                <div class="card-sub" id="summary-expense-sub" style="display:flex;justify-content:center;gap:12px;margin-top:6px;font-size:0.82rem;color:var(--text-muted);">
                    <span>💵 현금: <strong style="color:var(--accent-emerald)">${Utils.formatVND(summary.expenseCash)}</strong></span>
                    <span>💳 계좌: <strong style="color:#6366f1">${Utils.formatVND(summary.expenseTransfer)}</strong></span>
                </div>
            </div>
            <div class="summary-card indigo">
                <div class="card-label">총 잔액</div>
                <div class="card-value" id="summary-balance">${Utils.formatVND(breakdown.total.balance)}</div>
                <div class="card-sub" id="summary-balance-sub" style="display:flex;justify-content:center;gap:12px;margin-top:6px;font-size:0.82rem;color:var(--text-muted);">
                    <span>💵 현금: <strong style="color:var(--accent-emerald)">${Utils.formatVND(breakdown.cash.balance)}</strong></span>
                    <span>💳 계좌: <strong style="color:#6366f1">${Utils.formatVND(breakdown.transfer.balance)}</strong></span>
                </div>
            </div>
        </div>

        <!-- 게임회비 의심 거래 자동 감지 배너 -->
        <div id="dues-suggestion-banner" class="hidden" style="background: linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08)); border: 1px solid rgba(251,191,36,0.3); border-radius: 12px; padding: 10px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:1.3rem;">🎮</span>
                <div>
                    <div style="font-weight:700;font-size:0.9rem;color:#fbbf24;">게임회비로 보이는 멤버 입금 내역이 <span id="dues-detect-count">0</span>건 감지되었습니다!</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);">개인 가계부에서 제외하고 전용 [게임회비 관리]로 분리 이전하거나, 개인 입금으로 유지할 수 있습니다.</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <button class="btn btn-ghost btn-sm" id="btn-ignore-all-dues" style="border-color:rgba(255,255,255,0.2);color:var(--text-muted);font-size:0.78rem;padding:4px 10px;" title="게임회비가 아님: 개인 입금으로 확정하고 이 배너를 닫습니다">
                    ❌ 회비 아님 (개인입금 확정)
                </button>
                <button class="btn btn-sm" id="btn-bulk-move-dues" style="background:#fbbf24;color:#1e1e2e;font-weight:700;border:none;padding:4px 12px;font-size:0.82rem;">
                    🎮 감지된 회비 일괄 이전하기
                </button>
            </div>
        </div>

        <!-- ⚡ 빠른 1초 직접 입력 바 -->
        <div class="card mb-lg quick-input-card" style="background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.06)); border: 1px solid rgba(99,102,241,0.25); border-radius: 12px; padding: 12px 16px; width: 100%; box-sizing: border-box; max-width: 100%;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                <div style="font-weight:700;font-size:0.9rem;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                    <span>✍️ 가계부 직접 입력</span>
                    <span style="font-size:0.75rem;font-weight:500;color:var(--text-muted);">모달 없이 바로 등록</span>
                </div>
                <button class="btn btn-primary btn-sm" id="btn-add-tx" style="padding:3px 10px;font-size:0.8rem;">+ 상세 입력 모달</button>
            </div>
            <div class="quick-input-row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;width:100%;box-sizing:border-box;">
                <input type="date" id="quick-date" value="${Utils.today()}" style="flex:1 1 125px;min-width:115px;max-width:160px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;box-sizing:border-box;">
                <select id="quick-type" style="flex:1 1 90px;min-width:85px;max-width:110px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;box-sizing:border-box;">
                    <option value="expense">📉 지출</option>
                    <option value="income">📈 수입</option>
                </select>
                <select id="quick-method" style="flex:1 1 100px;min-width:95px;max-width:120px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;box-sizing:border-box;">
                    <option value="transfer">💳 계좌이체</option>
                    <option value="cash">💵 현금</option>
                </select>
                <select id="quick-category" style="flex:1 1 110px;min-width:100px;max-width:140px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;box-sizing:border-box;"></select>
                <input type="text" id="quick-amount" placeholder="금액 (VND)" inputmode="numeric" style="flex:1 1 120px;min-width:110px;max-width:160px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;font-weight:700;box-sizing:border-box;">
                <input type="text" id="quick-memo" placeholder="메모 (선택)" style="flex:2 1 140px;min-width:120px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;box-sizing:border-box;">
                <button class="btn btn-primary btn-sm" id="btn-quick-submit" style="flex:0 0 auto;min-width:85px;height:33px;font-weight:700;padding:4px 12px;box-sizing:border-box;">+ 바로 추가</button>
            </div>
        </div>

        <div class="section-header">
            <div class="flex items-center gap-sm flex-wrap">
                <span class="section-title">거래 내역</span>
                <button class="btn btn-danger btn-sm hidden" id="btn-bulk-delete-tx">🗑️ 선택 삭제 (<span id="selected-tx-count">0</span>개)</button>
                <button class="btn btn-ghost btn-sm hidden" id="btn-bulk-edit-tx" style="border-color:#818cf8;color:#818cf8;">✏️ 선택 일괄 수정</button>
                <button class="btn btn-ghost btn-sm hidden" id="btn-select-zero-tx" style="border-color:var(--accent-amber);color:var(--accent-amber)">⚠️ 0원 내역 선택</button>
            </div>
            <div class="flex gap-sm">
                <button class="btn btn-ghost" id="btn-manage-cat">카테고리 관리</button>
            </div>
        </div>

        <div class="filter-bar mb-lg" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                <button class="btn btn-ghost btn-sm" id="btn-filter-all-time" style="padding:4px 8px;font-size:0.78rem;">🗓️ 전체 기간</button>
                <button class="btn btn-ghost btn-sm" id="btn-filter-this-month" style="padding:4px 8px;font-size:0.78rem;">이번 달</button>
                <button class="btn btn-ghost btn-sm" id="btn-filter-last-month" style="padding:4px 8px;font-size:0.78rem;">지난 달</button>
                <button class="btn btn-ghost btn-sm" id="btn-filter-duplicates" style="padding:4px 8px;font-size:0.78rem;border-color:rgba(251,191,36,0.4);color:#fbbf24;">⚠️ 중복 의심 필터</button>
            </div>
            <input type="date" id="filter-start" value="${Utils.monthStart()}">
            <span class="text-muted">~</span>
            <input type="date" id="filter-end" value="${Utils.today()}">
            <select id="filter-type">
                <option value="">전체 구분</option>
                <option value="income">수입</option>
                <option value="expense">지출</option>
            </select>
            <select id="filter-method">
                <option value="">전체 수단</option>
                <option value="transfer">💳 계좌이체</option>
                <option value="cash">💵 현금</option>
            </select>
            <select id="filter-sort">
                <option value="date-desc">📅 최근 날짜순 (최신순)</option>
                <option value="date-asc">📅 과거 날짜순 (오래된순)</option>
                <option value="amount-desc">💰 금액 높은순</option>
                <option value="amount-asc">💰 금액 낮은순</option>
            </select>
            <button class="btn btn-ghost btn-sm" id="btn-filter-tx">🔍 조회</button>
        </div>

        <div id="category-breakdown-container"></div>

        <div class="table-wrapper">
            <table>
                <thead><tr>
                    <th style="width:40px;text-align:center">
                        <input type="checkbox" id="select-all-tx" title="전체 선택" style="cursor:pointer;width:16px;height:16px">
                    </th>
                    <th id="th-sort-date" style="cursor:pointer;user-select:none" title="날짜 정렬 변경">날짜 <span id="sort-icon-date">🔽</span></th>
                    <th>구분</th>
                    <th>수단</th>
                    <th>카테고리</th>
                    <th id="th-sort-amount" style="text-align:right;cursor:pointer;user-select:none" title="금액 정렬 변경">금액 (VND) <span id="sort-icon-amount">↕️</span></th>
                    <th>메모</th>
                    <th>작업 (더블클릭 수정)</th>
                </tr></thead>
                <tbody id="tx-table-body">
                    <tr><td colspan="8" class="text-center text-muted" style="padding:40px">로딩 중...</td></tr>
                </tbody>
            </table>
        </div>`;
    },

    async afterRender() {
        document.getElementById('btn-add-tx')?.addEventListener('click', () => this.openTxModal());
        document.getElementById('btn-manage-cat')?.addEventListener('click', () => this.openCategoryModal());
        document.getElementById('btn-filter-tx')?.addEventListener('click', () => this.loadTransactions());
        document.getElementById('filter-sort')?.addEventListener('change', () => this.loadTransactions());
        document.getElementById('btn-bulk-delete-tx')?.addEventListener('click', () => this.bulkDeleteTx());
        document.getElementById('btn-bulk-edit-tx')?.addEventListener('click', () => this.bulkEditTx());
        document.getElementById('btn-select-zero-tx')?.addEventListener('click', () => this.selectZeroTx());
        document.getElementById('btn-bulk-move-dues')?.addEventListener('click', () => this.bulkMoveToGameDues());
        document.getElementById('btn-ignore-all-dues')?.addEventListener('click', () => this.ignoreAllSuggestedDues());

        // ─── 날짜 기간 숏컷 버튼 ───
        document.getElementById('btn-filter-all-time')?.addEventListener('click', () => {
            const start = document.getElementById('filter-start');
            const end = document.getElementById('filter-end');
            if (start) start.value = '2020-01-01';
            if (end) end.value = Utils.today();
            this.loadTransactions();
        });

        document.getElementById('btn-filter-this-month')?.addEventListener('click', () => {
            const start = document.getElementById('filter-start');
            const end = document.getElementById('filter-end');
            if (start) start.value = Utils.monthStart();
            if (end) end.value = Utils.today();
            this.loadTransactions();
        });

        document.getElementById('btn-filter-last-month')?.addEventListener('click', () => {
            const now = new Date();
            const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
            const start = document.getElementById('filter-start');
            const end = document.getElementById('filter-end');
            if (start) start.value = Utils.formatDate(lastMonthFirst);
            if (end) end.value = Utils.formatDate(lastMonthLast);
            this.loadTransactions();
        });

        document.getElementById('btn-filter-duplicates')?.addEventListener('click', () => this.filterDuplicates());

        // ─── ⚡ 빠른 1초 수기 입력 폼 바인딩 ───
        const quickAmt = document.getElementById('quick-amount');
        if (quickAmt) Utils.bindAmountInputFormatter(quickAmt);

        const quickType = document.getElementById('quick-type');
        const quickCat = document.getElementById('quick-category');
        const cats = await Store.getCategories();

        const updateQuickCats = () => {
            const t = String(quickType?.value || 'expense').trim().toLowerCase();
            const filtered = cats.filter(c => String(c.type).trim().toLowerCase() === t);
            if (quickCat) {
                quickCat.innerHTML = filtered.map(c => `<option value="${c.id}">${c.icon || '📌'} ${c.name}</option>`).join('');
            }
        };

        if (quickType) {
            quickType.addEventListener('change', updateQuickCats);
            updateQuickCats();
        }

        document.getElementById('btn-quick-submit')?.addEventListener('click', async () => {
            const date = document.getElementById('quick-date')?.value || Utils.today();
            const type = document.getElementById('quick-type')?.value || 'expense';
            const method = document.getElementById('quick-method')?.value || 'transfer';
            const catId = document.getElementById('quick-category')?.value;
            const amtStr = document.getElementById('quick-amount')?.value;
            const memo = (document.getElementById('quick-memo')?.value || '').trim();
            const amt = Utils.parseAmount(amtStr);

            if (!amt || amt <= 0) {
                Utils.toast('금액을 입력해주세요', 'error');
                document.getElementById('quick-amount')?.focus();
                return;
            }

            const btn = document.getElementById('btn-quick-submit');
            if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

            const res = await Store.addTransaction({
                tx_date: date,
                type: type,
                category_id: Number(catId) || (type === 'income' ? 10 : 1),
                payment_method: method,
                amount: amt,
                memo: memo
            });

            if (btn) { btn.disabled = false; btn.textContent = '+ 바로 추가'; }

            if (res) {
                Utils.toast(`✅ ${Utils.formatVND(amt)} 등록 완료!`, 'success');
                if (document.getElementById('quick-amount')) document.getElementById('quick-amount').value = '';
                if (document.getElementById('quick-memo')) document.getElementById('quick-memo').value = '';

                // 현재 필터 범위에 포함되도록 조정
                const filterStart = document.getElementById('filter-start');
                const filterEnd = document.getElementById('filter-end');
                if (filterStart && filterStart.value > date) filterStart.value = date;
                if (filterEnd && filterEnd.value < date) filterEnd.value = date;

                await this.loadTransactions();
                await this.refreshSummary();
            }
        });

        document.getElementById('th-sort-date')?.addEventListener('click', () => {
            const sortEl = document.getElementById('filter-sort');
            if (sortEl) {
                sortEl.value = sortEl.value === 'date-desc' ? 'date-asc' : 'date-desc';
                this.loadTransactions();
            }
        });

        document.getElementById('th-sort-amount')?.addEventListener('click', () => {
            const sortEl = document.getElementById('filter-sort');
            if (sortEl) {
                sortEl.value = sortEl.value === 'amount-desc' ? 'amount-asc' : 'amount-desc';
                this.loadTransactions();
            }
        });

        const selectAllCb = document.getElementById('select-all-tx');
        if (selectAllCb) {
            selectAllCb.addEventListener('change', (e) => {
                const cbs = document.querySelectorAll('.tx-cb');
                cbs.forEach(cb => cb.checked = e.target.checked);
                this.updateBulkDeleteButton();
            });
        }

        const tbody = document.getElementById('tx-table-body');
        if (tbody) {
            tbody.addEventListener('change', (e) => {
                if (e.target.classList.contains('tx-cb')) {
                    this.updateBulkDeleteButton();
                }
            });
        }

        await this.loadTransactions();
    },

    async refreshSummary() {
        const summary = await Store.getTransactionSummary(Utils.monthStart(), Utils.monthEnd());
        const breakdown = await Store.getBalanceBreakdown();
        const incEl = document.getElementById('summary-income');
        const incSubEl = document.getElementById('summary-income-sub');
        const expEl = document.getElementById('summary-expense');
        const expSubEl = document.getElementById('summary-expense-sub');
        const balEl = document.getElementById('summary-balance');
        const balSubEl = document.getElementById('summary-balance-sub');
        if (incEl) incEl.textContent = Utils.formatVND(summary.income);
        if (incSubEl) {
            incSubEl.innerHTML = `
                <span>💵 현금: <strong style="color:var(--accent-emerald)">${Utils.formatVND(summary.incomeCash)}</strong></span>
                <span>💳 계좌: <strong style="color:#6366f1">${Utils.formatVND(summary.incomeTransfer)}</strong></span>
            `;
        }
        if (expEl) expEl.textContent = Utils.formatVND(summary.expense);
        if (expSubEl) {
            expSubEl.innerHTML = `
                <span>💵 현금: <strong style="color:var(--accent-emerald)">${Utils.formatVND(summary.expenseCash)}</strong></span>
                <span>💳 계좌: <strong style="color:#6366f1">${Utils.formatVND(summary.expenseTransfer)}</strong></span>
            `;
        }
        if (balEl) balEl.textContent = Utils.formatVND(breakdown.total.balance);
        if (balSubEl) {
            balSubEl.innerHTML = `
                <span>💵 현금: <strong style="color:var(--accent-emerald)">${Utils.formatVND(breakdown.cash.balance)}</strong></span>
                <span>💳 계좌: <strong style="color:#6366f1">${Utils.formatVND(breakdown.transfer.balance)}</strong></span>
            `;
        }
    },

    renderCategoryBreakdown(txList) {
        const container = document.getElementById('category-breakdown-container');
        if (!container) return;

        if (!txList || txList.length === 0) {
            container.innerHTML = '';
            return;
        }

        const expenseMap = {};
        let totalExpense = 0;
        let totalIncome = 0;

        txList.forEach(tx => {
            const amt = Utils.parseAmount(tx.amount);
            const isIncome = String(tx.type).trim().toLowerCase() === 'income';
            if (isIncome) {
                totalIncome += amt;
            } else {
                totalExpense += amt;
                const catName = tx.personal_categories?.name || '기타';
                const catIcon = tx.personal_categories?.icon || '💸';
                const key = `${catIcon} ${catName}`;
                if (!expenseMap[key]) {
                    expenseMap[key] = { name: catName, icon: catIcon, amount: 0, count: 0 };
                }
                expenseMap[key].amount += amt;
                expenseMap[key].count += 1;
            }
        });

        const catArray = Object.values(expenseMap);
        catArray.sort((a, b) => b.amount - a.amount);

        if (catArray.length === 0 && totalIncome === 0) {
            container.innerHTML = '';
            return;
        }

        const colors = [
            '#38bdf8', '#fbbf24', '#f43f5e', '#10b981', '#8b5cf6',
            '#ec4899', '#06b6d4', '#6366f1', '#f97316', '#a855f7'
        ];

        let stackedBarHtml = '';
        let pillsHtml = '';
        let catGridHtml = '';

        catArray.forEach((item, index) => {
            const color = colors[index % colors.length];
            const pct = totalExpense > 0 ? ((item.amount / totalExpense) * 100).toFixed(1) : 0;
            stackedBarHtml += `<div class="cat-stacked-segment" style="width:${pct}%;background:${color};" title="${item.name}: ${pct}% (${Utils.formatVND(item.amount)})"></div>`;

            pillsHtml += `
                <div class="cat-pill-badge" style="background:${color}18;color:${color};border-color:${color}33;">
                    <span>${item.icon} ${Utils.escapeHtml(item.name)}</span>
                    <strong style="margin-left:2px;">${pct}%</strong>
                </div>
            `;

            catGridHtml += `
                <div class="cat-item-card">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
                        <span style="font-size:0.82rem;font-weight:600;color:var(--text-primary);">${item.icon} ${Utils.escapeHtml(item.name)}</span>
                        <span class="badge" style="background:${color}22;color:${color};font-weight:700;font-size:0.75rem;padding:1px 6px;">${pct}%</span>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.8rem;">
                        <span style="color:var(--text-muted);font-size:0.75rem;">${item.count}건</span>
                        <strong style="color:${color};font-weight:700;">${Utils.formatVND(item.amount)}</strong>
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="cat-compact-bar-container">
                <div class="cat-compact-header">
                    <div class="cat-compact-left">
                        <span class="cat-compact-label">📊 점유율</span>
                        <div class="cat-compact-bar" title="지출 카테고리 비중">
                            ${stackedBarHtml}
                        </div>
                    </div>
                    <div class="cat-compact-right">
                        <div class="cat-pills-row">
                            ${pillsHtml}
                        </div>
                        <button id="btn-toggle-cat-detail" class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:0.75rem;border-color:rgba(255,255,255,0.15)">
                            🔍 상세
                        </button>
                    </div>
                </div>
                <div id="cat-detail-panel" class="hidden mt-sm" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:0.82rem;color:var(--text-secondary);">
                        <span>카테고리별 상세 내역</span>
                        <span>지출 합계: <strong class="text-rose">${Utils.formatVND(totalExpense)}</strong></span>
                    </div>
                    <div class="cat-grid">
                        ${catGridHtml}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-toggle-cat-detail')?.addEventListener('click', () => {
            const panel = document.getElementById('cat-detail-panel');
            const btn = document.getElementById('btn-toggle-cat-detail');
            if (panel) {
                const isHidden = panel.classList.contains('hidden');
                if (isHidden) {
                    panel.classList.remove('hidden');
                    if (btn) btn.textContent = '▲ 접기';
                } else {
                    panel.classList.add('hidden');
                    if (btn) btn.textContent = '🔍 상세';
                }
            }
        });
    },

    async loadTransactions() {
        const startDate = document.getElementById('filter-start')?.value || Utils.monthStart();
        const endDate = document.getElementById('filter-end')?.value || Utils.today();
        const type = document.getElementById('filter-type')?.value;
        const method = document.getElementById('filter-method')?.value;
        const sort = document.getElementById('filter-sort')?.value || 'date-desc';

        // 테이블 헤더 아이콘 동기화
        const dateIcon = document.getElementById('sort-icon-date');
        const amountIcon = document.getElementById('sort-icon-amount');
        if (dateIcon) dateIcon.textContent = sort === 'date-desc' ? '🔽' : (sort === 'date-asc' ? '🔼' : '↕️');
        if (amountIcon) amountIcon.textContent = sort === 'amount-desc' ? '🔽' : (sort === 'amount-asc' ? '🔼' : '↕️');

        const txList = await Store.getTransactions({
            startDate,
            endDate,
            type: type && type.trim() !== '' ? type.trim() : undefined,
            payment_method: method && method.trim() !== '' ? method.trim() : undefined,
            sort: sort
        });

        // 카테고리별 사용금액 및 점유율 브레이크다운 렌더링
        this.renderCategoryBreakdown(txList);
        const tbody = document.getElementById('tx-table-body');
        if (!tbody) return;

        const selectAllCb = document.getElementById('select-all-tx');
        if (selectAllCb) selectAllCb.checked = false;

        if (txList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:40px">거래 내역이 없습니다</td></tr>';
            this.updateBulkDeleteButton();
            return;
        }

        let hasZeroTx = false;
        this.cachedTransactions = txList;
        tbody.innerHTML = txList.map(tx => {
            const isIncome = String(tx.type).trim().toLowerCase() === 'income';
            const methodLabel = tx.payment_method === 'cash' ? '💵 현금' : '💳 계좌이체';
            const methodClass = tx.payment_method === 'cash' ? 'badge-amber' : 'badge-indigo';
            const typeBadge = isIncome ? '<span class="badge badge-income">수입</span>' : '<span class="badge badge-expense">지출</span>';
            const colorClass = isIncome ? 'text-emerald' : 'text-rose';
            const sign = isIncome ? '+' : '-';
            const amt = Utils.parseAmount(tx.amount);
            if (amt === 0) hasZeroTx = true;

            const isDues = Utils.isLikelyGameDues(tx.type, tx.memo);
            const memoStr = String(tx.memo || '').trim();
            const isLongMemo = memoStr.length > 25 || /(?:VNPAY|scanning QR|TRANSFER|CK|IB|VCB|BIDV|MBBANK|TECHCOM)/i.test(memoStr);
            const isImported = isLongMemo || memoStr === '가져오기' || /(?:TRANSFER|CK|IB)/i.test(memoStr);
            const dateDisplay = isImported ? Utils.formatDateKR(tx.tx_date) : Utils.formatDateTimeKR(tx.tx_date, tx.created_at);

            return `
            <tr ondblclick="PersonalPage.editTx('${tx.id}')" style="cursor:pointer" title="더블클릭하여 이 거래 전체 수정">
                <td style="text-align:center" onclick="event.stopPropagation()">
                    <input type="checkbox" class="tx-cb" data-id="${tx.id}" data-amount="${amt}" data-date="${tx.tx_date}" style="cursor:pointer;width:16px;height:16px">
                </td>
                <td style="white-space:nowrap;font-weight:500">${dateDisplay}</td>
                <td>${typeBadge}</td>
                <td><span class="badge ${methodClass}" style="font-size:0.75rem;padding:2px 8px">${methodLabel}</span></td>
                <td onclick="event.stopPropagation()">
                    <button class="btn btn-ghost btn-sm" onclick="PersonalPage.quickEditCategory('${tx.id}')" style="padding:2px 6px;font-size:0.78rem;border-color:rgba(255,255,255,0.12);" title="클릭하여 카테고리 즉시 변경">
                        ${tx.personal_categories?.icon || '💰'} ${Utils.escapeHtml(tx.personal_categories?.name || '기타')} ▾
                    </button>
                </td>
                <td style="text-align:right;font-weight:600" class="${colorClass}">${sign}${Utils.formatVND(tx.amount)}</td>
                <td class="text-secondary" onclick="event.stopPropagation()" style="max-width:280px;">
                    <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;" title="${Utils.escapeHtml(memoStr)}">
                            ${Utils.escapeHtml(memoStr || '—')}
                        </span>
                        <button class="btn btn-icon btn-sm" onclick="PersonalPage.quickEditMemo('${tx.id}')" style="padding:1px 4px;font-size:0.7rem;" title="메모 직접 수정">✏️</button>
                        ${isLongMemo ? `<button class="btn btn-ghost btn-sm" onclick="PersonalPage.quickCleanMemo('${tx.id}')" style="padding:1px 5px;font-size:0.7rem;border-color:rgba(99,102,241,0.4);color:#818cf8;" title="긴 은행 전문/불필요 텍스트 깔끔히 정리">🧹정리</button>` : ''}
                        ${isDues ? `<button class="btn btn-ghost btn-sm" onclick="PersonalPage.moveToGameDues('${tx.id}')" style="padding:1px 6px;font-size:0.72rem;border-color:rgba(251,191,36,0.5);color:#fbbf24;" title="가계부에서 분리하여 게임회비로 이전">🎮 회비로 이전</button>` : ''}
                    </div>
                </td>
                <td style="white-space:nowrap" onclick="event.stopPropagation()">
                    <button class="btn btn-icon btn-sm" onclick="PersonalPage.editTx('${tx.id}')" title="상세 수정">✏️</button>
                    <button class="btn btn-icon btn-sm" onclick="PersonalPage.moveToGameDues('${tx.id}')" title="게임회비로 분리 이전" style="color:#fbbf24">🎮</button>
                    <button class="btn btn-icon btn-sm" onclick="PersonalPage.deleteTx('${tx.id}')" title="삭제">🗑️</button>
                </td>
            </tr>
            `;
        }).join('');

        const selectZeroBtn = document.getElementById('btn-select-zero-tx');
        if (selectZeroBtn) {
            if (hasZeroTx) selectZeroBtn.classList.remove('hidden');
            else selectZeroBtn.classList.add('hidden');
        }

        // 게임회비 의심 거래 감지 배너 업데이트 (무시된 거래 제외)
        const ignoredIds = this._getIgnoredDuesIds();
        const duesTxList = txList.filter(t => Utils.isLikelyGameDues(t.type, t.memo) && !ignoredIds.includes(String(t.id)));
        const duesBanner = document.getElementById('dues-suggestion-banner');
        const duesCountEl = document.getElementById('dues-detect-count');
        if (duesBanner && duesCountEl) {
            if (duesTxList.length > 0) {
                duesCountEl.textContent = duesTxList.length;
                duesBanner.classList.remove('hidden');
            } else {
                duesBanner.classList.add('hidden');
            }
        }

        this.updateBulkDeleteButton();
    },

    _getIgnoredDuesIds() {
        try {
            const raw = localStorage.getItem('mymoney_ignored_dues_ids');
            return raw ? JSON.parse(raw) : [];
        } catch(e) {
            return [];
        }
    },

    _saveIgnoredDuesIds(ids) {
        try {
            const existing = this._getIgnoredDuesIds();
            const merged = Array.from(new Set([...existing, ...ids.map(String)]));
            localStorage.setItem('mymoney_ignored_dues_ids', JSON.stringify(merged));
        } catch(e) {}
    },

    /** 감지된 모든 의심 거래를 '회비 아님 (개인 입금)'으로 확정하고 배너 닫기 */
    ignoreAllSuggestedDues() {
        const ignoredIds = this._getIgnoredDuesIds();
        const duesTxList = (this.cachedTransactions || []).filter(t => Utils.isLikelyGameDues(t.type, t.memo) && !ignoredIds.includes(String(t.id)));
        if (duesTxList.length === 0) {
            document.getElementById('dues-suggestion-banner')?.classList.add('hidden');
            return;
        }

        const ok = confirm(`감지된 ${duesTxList.length}건의 내역을 [게임회비가 아닌 순수 개인 입금]으로 확정할까요?\n(더 이상 이 배너가 뜨지 않습니다)`);
        if (!ok) return;

        this._saveIgnoredDuesIds(duesTxList.map(t => t.id));
        document.getElementById('dues-suggestion-banner')?.classList.add('hidden');
        Utils.toast('✅ 개인 입금으로 확정되었습니다. (감지 배너 닫힘)', 'success');
        this.loadTransactions();
    },

    /** 감지된 게임회비 거래 스마트 일괄 이전 모달 (아닌 항목 체크 해제 시 자동 무시) */
    async bulkMoveToGameDues() {
        const ignoredIds = this._getIgnoredDuesIds();
        const duesTxList = (this.cachedTransactions || []).filter(t => Utils.isLikelyGameDues(t.type, t.memo) && !ignoredIds.includes(String(t.id)));
        if (duesTxList.length === 0) {
            Utils.toast('이전할 게임회비 입금 내역이 없습니다.', 'info');
            return;
        }

        const rowsHtml = duesTxList.map((tx, idx) => {
            const detectedName = Utils.extractMemberName(tx.memo);
            const amt = Utils.parseAmount(tx.amount);
            return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <td style="text-align:center;padding:8px;">
                    <input type="checkbox" class="bulk-dues-cb" data-idx="${idx}" checked style="cursor:pointer;width:16px;height:16px;">
                </td>
                <td style="white-space:nowrap;padding:8px;font-size:0.83rem;">${Utils.formatDateKR(tx.tx_date)}</td>
                <td style="padding:8px;">
                    <input type="text" id="dues-name-${idx}" value="${Utils.escapeHtml(detectedName)}" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(251,191,36,0.3);background:rgba(251,191,36,0.08);color:#fbbf24;font-weight:700;font-size:0.83rem;width:120px;text-transform:uppercase;">
                </td>
                <td style="text-align:right;padding:8px;font-weight:700;color:#34d399;font-size:0.85rem;">+${Utils.formatVND(amt)}</td>
                <td style="padding:8px;color:var(--text-muted);font-size:0.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${Utils.escapeHtml(tx.memo)}">
                    ${Utils.escapeHtml(tx.memo)}
                </td>
            </tr>
            `;
        }).join('');

        Modal.open(`🎮 감지된 게임회비 확인 및 일괄 이전 (${duesTxList.length}건)`, `
            <div style="font-size:0.84rem;color:var(--text-muted);margin-bottom:12px;line-height:1.5;">
                회비로 입금된 항목을 확인하세요. <strong style="color:#fbbf24">회비가 아닌 건은 체크를 해제</strong>하면 가계부에 그대로 남습니다.
            </div>
            <div style="max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;margin-bottom:14px;">
                <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
                    <thead style="background:rgba(255,255,255,0.04);position:sticky;top:0;">
                        <tr>
                            <th style="width:36px;text-align:center;padding:8px;">
                                <input type="checkbox" id="bulk-dues-select-all" checked style="cursor:pointer;">
                            </th>
                            <th style="padding:8px;text-align:left;">날짜</th>
                            <th style="padding:8px;text-align:left;">회원 이름</th>
                            <th style="padding:8px;text-align:right;">금액</th>
                            <th style="padding:8px;text-align:left;">원본 적요/메모</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
            <div id="bulk-dues-summary" style="font-size:0.85rem;font-weight:600;color:#fbbf24;text-align:right;margin-bottom:6px;">
                선택됨: ${duesTxList.length}건 (총 ${Utils.formatVND(duesTxList.reduce((s,t)=>s+Utils.parseAmount(t.amount),0))})
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-confirm-bulk-dues" style="background:#fbbf24;color:#1e1e2e;font-weight:700;border:none;">
                🚀 선택 항목 게임회비로 즉시 이전
            </button>
        `);

        // 전체 선택 토글 및 합계 계산
        const updateDuesSummary = () => {
            const checked = document.querySelectorAll('.bulk-dues-cb:checked');
            let sum = 0;
            checked.forEach(cb => {
                const idx = parseInt(cb.dataset.idx);
                sum += Utils.parseAmount(duesTxList[idx]?.amount);
            });
            const summaryEl = document.getElementById('bulk-dues-summary');
            if (summaryEl) summaryEl.innerHTML = `선택됨: <strong style="color:#fff">${checked.length}건</strong> (총 <strong style="color:#34d399">${Utils.formatVND(sum)}</strong>)`;
        };

        document.getElementById('bulk-dues-select-all')?.addEventListener('change', (e) => {
            document.querySelectorAll('.bulk-dues-cb').forEach(cb => cb.checked = e.target.checked);
            updateDuesSummary();
        });

        document.querySelectorAll('.bulk-dues-cb').forEach(cb => {
            cb.addEventListener('change', updateDuesSummary);
        });

        document.getElementById('btn-confirm-bulk-dues')?.addEventListener('click', async () => {
            const checked = [...document.querySelectorAll('.bulk-dues-cb:checked')];
            if (checked.length === 0) {
                Utils.toast('이전할 항목을 선택해주세요', 'info');
                return;
            }

            const btn = document.getElementById('btn-confirm-bulk-dues');
            if (btn) { btn.disabled = true; btn.textContent = '이전 처리 중...'; }

            let successCount = 0;
            for (const cb of checked) {
                const idx = parseInt(cb.dataset.idx);
                const tx = duesTxList[idx];
                if (!tx) continue;

                const nameInput = document.getElementById(`dues-name-${idx}`);
                const finalName = nameInput?.value?.trim()?.toUpperCase() || Utils.extractMemberName(tx.memo);

                try {
                    await Store.addGameDuesIncome({
                        tx_date: tx.tx_date,
                        member_name: finalName,
                        amount: tx.amount,
                        memo: tx.memo,
                        created_at: tx.created_at
                    });
                    if (tx.id) await Store.deleteTransaction(tx.id);
                    successCount++;
                } catch(e) {
                    console.error('회비 이전 오류:', e);
                }
            }

            Utils.toast(`🎉 ${successCount}건이 게임회비로 분리 이전되었습니다! (개인 가계부에서 제외됨)`, 'success');
            Modal.close();
            await PersonalPage.refresh();
        });
    },

    /** 단일 거래를 게임회비로 분리 이전 */
    async moveToGameDues(txId) {
        const tx = this.cachedTransactions.find(t => String(t.id) === String(txId));
        if (!tx) return;

        const name = Utils.extractMemberName(tx.memo);
        const isIncome = String(tx.type).trim().toLowerCase() === 'income';
        const msg = isIncome
            ? `이 입금(${Utils.formatVND(tx.amount)})을 개인 가계부에서 제외하고, 🎮 [${name}] 게임회비 입금으로 이전할까요?`
            : `이 지출(${Utils.formatVND(tx.amount)})을 개인 가계부에서 제외하고, 🎮 게임회비 지출로 이전할까요?`;

        if (!confirm(msg)) return;

        const success = await Store.convertPersonalTxToGameDues(tx);
        if (success) {
            Utils.toast('🎮 게임회비로 성공적으로 이전되었습니다! (개인 가계부에서 분리됨)', 'success');
            await this.refresh();
        }
    },

    async openTxModal(editTx = null) {
        const cats = await Store.getCategories();
        const isEdit = !!editTx;
        const editTime = editTx && editTx.created_at ? (() => {
            try {
                const d = new Date(editTx.created_at);
                if (!isNaN(d.getTime())) {
                    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                }
            } catch(e) {}
            return Utils.currentTime();
        })() : Utils.currentTime();

        Modal.open(isEdit ? '거래 내역 수정' : '새 거래 입력', `
            <div class="form-grid">
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" id="tx-date" value="${editTx ? Utils.formatDate(editTx.tx_date) : Utils.today()}">
                </div>
                <div class="form-group">
                    <label>시간 (시:분)</label>
                    <input type="time" id="tx-time" value="${editTime}">
                </div>
                <div class="form-group">
                    <label>구분</label>
                    <select id="tx-type">
                        <option value="expense" ${editTx?.type === 'expense' || !editTx ? 'selected' : ''}>지출</option>
                        <option value="income" ${editTx?.type === 'income' ? 'selected' : ''}>수입</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>결제/입금 수단</label>
                    <select id="tx-method">
                        <option value="transfer" ${editTx?.payment_method === 'transfer' || !editTx ? 'selected' : ''}>💳 계좌이체 (은행)</option>
                        <option value="cash" ${editTx?.payment_method === 'cash' ? 'selected' : ''}>💵 현금</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>카테고리</label>
                    <select id="tx-category"></select>
                </div>
                <div class="form-group full-width">
                    <label>금액 (VND)</label>
                    <input type="text" id="tx-amount" placeholder="예: 250,000" value="${editTx && editTx.amount ? editTx.amount.toLocaleString('ko-KR') : ''}" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모</label>
                <input type="text" id="tx-memo" placeholder="메모 (선택)" value="${editTx ? Utils.escapeHtml(editTx.memo) : ''}">
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-tx">${isEdit ? '수정' : '저장'}</button>
        `);

        const amountInput = document.getElementById('tx-amount');
        Utils.bindAmountInputFormatter(amountInput);

        const typeSelect = document.getElementById('tx-type');
        const catSelect = document.getElementById('tx-category');

        const filterCats = () => {
            const selType = String(typeSelect.value).trim().toLowerCase();
            const filtered = cats.filter(c => String(c.type).trim().toLowerCase() === selType);
            let optionsHtml = '';
            if (filtered.length > 0) {
                optionsHtml = filtered.map(c =>
                    `<option value="${c.id}">${c.icon || '📌'} ${c.name}</option>`
                ).join('');
            } else {
                optionsHtml = `<option value="1">💰 기타</option>`;
            }

            optionsHtml += `<option value="DUES_CONVERT" style="color:#fbbf24;font-weight:700;background:rgba(251,191,36,0.1)">🎮 [게임회비로 분리 이전 (가계부 제외)]</option>`;

            catSelect.innerHTML = optionsHtml;
            if (editTx && editTx.category_id) catSelect.value = String(editTx.category_id);
        };

        typeSelect.addEventListener('change', filterCats);
        filterCats();

        document.getElementById('btn-save-tx')?.addEventListener('click', async () => {
            const txDate = Utils.formatDate(document.getElementById('tx-date').value);
            const txTime = document.getElementById('tx-time')?.value || Utils.currentTime();
            const amount = Utils.parseAmount(document.getElementById('tx-amount').value);
            const selectedCatId = document.getElementById('tx-category').value;
            const memoText = document.getElementById('tx-memo').value.trim();
            const txType = String(document.getElementById('tx-type').value).trim().toLowerCase();

            let fullISO = new Date().toISOString();
            try {
                fullISO = new Date(`${txDate}T${txTime}:00`).toISOString();
            } catch(e) {}

            if (!txDate || amount <= 0) {
                Utils.toast('날짜와 올바른 금액(0 이상)을 입력해주세요', 'error');
                return;
            }

            if (selectedCatId === 'DUES_CONVERT') {
                const tempTx = {
                    id: editTx?.id,
                    tx_date: txDate,
                    created_at: fullISO,
                    type: txType,
                    amount: amount,
                    memo: memoText
                };
                await Store.convertPersonalTxToGameDues(tempTx);
                Utils.toast('🎮 게임회비로 분리 이전 완료! (개인 가계부에서 제외됨)', 'success');
                Modal.close();
                await PersonalPage.refresh();
                return;
            }

            const data = {
                tx_date: txDate,
                created_at: fullISO,
                type: txType,
                payment_method: document.getElementById('tx-method').value,
                category_id: selectedCatId ? (isNaN(Number(selectedCatId)) ? selectedCatId : Number(selectedCatId)) : 1,
                amount: amount,
                memo: memoText
            };

            let result;
            if (isEdit) {
                result = await Store.updateTransaction(editTx.id, data);
            } else {
                result = await Store.addTransaction(data);
            }

            if (result) {
                Utils.toast(isEdit ? '거래가 수정되었습니다' : '거래가 저장되었습니다', 'success');
                Modal.close();

                // 날짜 필터가 입력된 날짜를 포함하도록 자동 확대
                const filterEnd = document.getElementById('filter-end');
                const filterStart = document.getElementById('filter-start');
                if (filterEnd && filterEnd.value < txDate) filterEnd.value = txDate;
                if (filterStart && filterStart.value > txDate) filterStart.value = txDate;

                await this.loadTransactions();
                await this.refreshSummary();
            } else {
                Utils.toast('저장에 실패했습니다', 'error');
            }
        });
    },

    async editTx(id) {
        const txList = await Store.getTransactions({});
        const tx = txList.find(t => String(t.id) === String(id));
        if (tx) this.openTxModal(tx);
    },

    async deleteTx(id) {
        const ok = await Modal.confirm('거래 삭제', '이 거래 내역을 삭제하시겠습니까?');
        if (ok) {
            const result = await Store.deleteTransaction(id);
            if (result) {
                Utils.toast('삭제되었습니다', 'success');
                await this.loadTransactions();
                await this.refreshSummary();
            }
        }
    },

    updateBulkDeleteButton() {
        const checkedCbs = document.querySelectorAll('.tx-cb:checked');
        const allCbs = document.querySelectorAll('.tx-cb');
        const bulkBtn = document.getElementById('btn-bulk-delete-tx');
        const bulkEditBtn = document.getElementById('btn-bulk-edit-tx');
        const countEl = document.getElementById('selected-tx-count');
        const selectAllCb = document.getElementById('select-all-tx');

        const count = checkedCbs.length;
        if (countEl) countEl.textContent = count;

        if (bulkBtn) {
            if (count > 0) bulkBtn.classList.remove('hidden');
            else bulkBtn.classList.add('hidden');
        }

        if (bulkEditBtn) {
            if (count > 0) {
                bulkEditBtn.classList.remove('hidden');
                bulkEditBtn.textContent = `✏️ 선택 ${count}개 일괄 수정`;
            } else {
                bulkEditBtn.classList.add('hidden');
            }
        }

        if (selectAllCb && allCbs.length > 0) {
            selectAllCb.checked = checkedCbs.length === allCbs.length;
        }
    },

    /** 선택한 항목들 일괄 수정 (카테고리/결제수단/날짜 등) */
    async bulkEditTx() {
        const checkedCbs = document.querySelectorAll('.tx-cb:checked');
        const ids = Array.from(checkedCbs).map(cb => cb.dataset.id);
        if (ids.length === 0) {
            Utils.toast('수정할 항목을 선택해주세요', 'info');
            return;
        }

        const cats = await Store.getCategories();
        const catOptions = cats.map(c => `<option value="${c.id}">[${c.type === 'income' ? '수입' : '지출'}] ${c.icon || '📌'} ${c.name}</option>`).join('');

        Modal.open(`선택한 ${ids.length}개 항목 일괄 수정`, `
            <div style="font-size:0.86rem;color:var(--text-muted);margin-bottom:14px;">
                변경하고자 하는 항목만 선택하여 일괄 적용할 수 있습니다.
            </div>
            <div class="form-grid">
                <div class="form-group full-width">
                    <label>카테고리 일괄 변경 (선택)</label>
                    <select id="bulk-cat">
                        <option value="">— 변경 안 함 —</option>
                        ${catOptions}
                        <option value="DUES_CONVERT" style="color:#fbbf24;font-weight:700;">🎮 [게임회비로 일괄 분리 이전 (가계부 제외)]</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>결제 수단 일괄 변경 (선택)</label>
                    <select id="bulk-method">
                        <option value="">— 변경 안 함 —</option>
                        <option value="transfer">💳 계좌이체</option>
                        <option value="cash">💵 현금</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>날짜 일괄 변경 (선택)</label>
                    <input type="date" id="bulk-date">
                </div>
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-bulk-edit">일괄 적용</button>
        `);

        document.getElementById('btn-save-bulk-edit')?.addEventListener('click', async () => {
            const catVal = document.getElementById('bulk-cat')?.value;
            const methodVal = document.getElementById('bulk-method')?.value;
            const dateVal = document.getElementById('bulk-date')?.value;

            if (!catVal && !methodVal && !dateVal) {
                Utils.toast('변경할 항목을 최소 하나 이상 선택하세요', 'info');
                return;
            }

            const btn = document.getElementById('btn-save-bulk-edit');
            if (btn) { btn.disabled = true; btn.textContent = '적용 중...'; }

            // 🎮 게임회비로 일괄 이전인 경우
            if (catVal === 'DUES_CONVERT') {
                let successCount = 0;
                for (const id of ids) {
                    const tx = (PersonalPage.cachedTransactions || []).find(t => String(t.id) === String(id));
                    if (tx) {
                        await Store.convertPersonalTxToGameDues(tx);
                        successCount++;
                    }
                }
                Utils.toast(`🎮 ${successCount}건이 게임회비로 이전되었습니다! (개인 가계부에서 제외됨)`, 'success');
                Modal.close();
                await PersonalPage.refresh();
                return;
            }

            const updates = {};
            if (catVal) updates.category_id = Number(catVal);
            if (methodVal) updates.payment_method = methodVal;
            if (dateVal) updates.tx_date = dateVal;

            let updatedCount = 0;
            for (const id of ids) {
                try {
                    await Store.updateTransaction(id, updates);
                    updatedCount++;
                } catch(e) {
                    console.error('일괄 수정 오류:', e);
                }
            }

            Utils.toast(`총 ${updatedCount}건의 내역이 일괄 수정되었습니다!`, 'success');
            Modal.close();
            await PersonalPage.loadTransactions();
            await PersonalPage.refreshSummary();
        });
    },

    /** 카테고리 빠른 변경 모달 */
    async quickEditCategory(txId) {
        const tx = (this.cachedTransactions || []).find(t => String(t.id) === String(txId));
        if (!tx) return;

        const cats = await Store.getCategories();
        const tType = String(tx.type).trim().toLowerCase();
        const filtered = cats.filter(c => String(c.type).trim().toLowerCase() === tType);

        Modal.open(`카테고리 변경: ${tx.personal_categories?.icon || '📌'} ${tx.personal_categories?.name || '기타'}`, `
            <div style="font-size:0.86rem;color:var(--text-muted);margin-bottom:12px;">
                거래: <strong>${Utils.formatDateKR(tx.tx_date)}</strong> · <strong>${Utils.formatVND(tx.amount)}</strong> (${tx.memo || '메모 없음'})
            </div>
            <div class="form-group full-width">
                <label>새 카테고리 선택</label>
                <select id="quick-change-cat" style="font-size:0.95rem;padding:8px 12px;">
                    ${filtered.map(c => `<option value="${c.id}" ${String(c.id) === String(tx.category_id) ? 'selected' : ''}>${c.icon || '📌'} ${c.name}</option>`).join('')}
                    <option value="DUES_CONVERT" style="color:#fbbf24;font-weight:700;">🎮 [게임회비로 분리 이전 (가계부 제외)]</option>
                </select>
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-quick-cat">변경 저장</button>
        `);

        document.getElementById('btn-save-quick-cat')?.addEventListener('click', async () => {
            const newCatId = document.getElementById('quick-change-cat')?.value;
            if (!newCatId) return;

            if (newCatId === 'DUES_CONVERT') {
                await Store.convertPersonalTxToGameDues(tx);
                Utils.toast('🎮 게임회비로 분리 이전되었습니다!', 'success');
            } else {
                await Store.updateTransaction(tx.id, { category_id: Number(newCatId) });
                Utils.toast('카테고리가 변경되었습니다!', 'success');
            }
            Modal.close();
            await PersonalPage.loadTransactions();
            await PersonalPage.refreshSummary();
        });
    },

    /** 긴 은행 전문/메모 원클릭 자동 정제 */
    async quickCleanMemo(txId) {
        const tx = (this.cachedTransactions || []).find(t => String(t.id) === String(txId));
        if (!tx) return;

        let raw = String(tx.memo || '').trim();
        // VNPAY, QR코드 중복 번호, URL, 슬래시 중복 정리
        let cleaned = raw.replace(/VNPAY\s+payment\s+by\s+scanning\s+QR\s+code\s*:\s*/gi, '')
                         .replace(/([A-Z0-9]{10,})\s*\/\s*\1/g, '$1')
                         .replace(/\b(TRANSFER|TRANSFERRING|CK|MB|IB)\b/gi, '')
                         .replace(/[\/\-_]{2,}/g, '/')
                         .replace(/\s+/g, ' ')
                         .trim();

        if (!cleaned || cleaned === '/') cleaned = '간편결제';

        const ok = confirm(`메모를 깔끔하게 정제할까요?\n\n이전: "${raw}"\n이후: "${cleaned}"`);
        if (!ok) return;

        await Store.updateTransaction(tx.id, { memo: cleaned });
        Utils.toast('메모가 정제되었습니다!', 'success');
        await this.loadTransactions();
    },

    /** 메모 직접 빠른 수정 */
    async quickEditMemo(txId) {
        const tx = (this.cachedTransactions || []).find(t => String(t.id) === String(txId));
        if (!tx) return;

        const newMemo = prompt('메모를 수정하세요 (불필요하면 내용을 지우고 확인):', tx.memo || '');
        if (newMemo === null) return;

        await Store.updateTransaction(tx.id, { memo: newMemo.trim() });
        Utils.toast('메모가 수정되었습니다!', 'success');
        await this.loadTransactions();
    },

    /** 중복 의심 거래 (동일 날짜 + 동일 금액 2건 이상) 필터링 */
    async filterDuplicates() {
        const allTx = await Store.getTransactions({ limit: 1000 });
        const map = {};

        allTx.forEach(t => {
            const key = `${Utils.formatDate(t.tx_date)}_${Utils.parseAmount(t.amount)}`;
            if (!map[key]) map[key] = [];
            map[key].push(t);
        });

        // 2건 이상인 키만 추출
        const dupKeys = new Set(Object.keys(map).filter(k => map[k].length >= 2));
        const dupTxList = allTx.filter(t => dupKeys.has(`${Utils.formatDate(t.tx_date)}_${Utils.parseAmount(t.amount)}`));

        if (dupTxList.length === 0) {
            Utils.toast('동일한 날짜와 금액을 가진 중복 의심 거래가 없습니다! 👍', 'success');
            return;
        }

        Utils.toast(`⚠️ 중복 의심 거래 총 ${dupTxList.length}건을 필터링했습니다. 확인 후 불필요한 건을 삭제하세요.`, 'info');

        // 날짜/금액순으로 묶어서 정렬
        dupTxList.sort((a, b) => {
            const dComp = String(b.tx_date).localeCompare(String(a.tx_date));
            if (dComp !== 0) return dComp;
            return Utils.parseAmount(b.amount) - Utils.parseAmount(a.amount);
        });

        this.renderCategoryBreakdown(dupTxList);
        const tbody = document.getElementById('tx-table-body');
        if (tbody) {
            let hasZeroTx = false;
            this.cachedTransactions = dupTxList;
            tbody.innerHTML = dupTxList.map(tx => {
                const isIncome = String(tx.type).trim().toLowerCase() === 'income';
                const methodLabel = tx.payment_method === 'cash' ? '💵 현금' : '💳 계좌이체';
                const methodClass = tx.payment_method === 'cash' ? 'badge-amber' : 'badge-indigo';
                const typeBadge = isIncome ? '<span class="badge badge-income">수입</span>' : '<span class="badge badge-expense">지출</span>';
                const colorClass = isIncome ? 'text-emerald' : 'text-rose';
                const sign = isIncome ? '+' : '-';
                const amt = Utils.parseAmount(tx.amount);

                return `
                <tr style="background:rgba(251,191,36,0.06);border-left:3px solid #fbbf24;" ondblclick="PersonalPage.editTx('${tx.id}')">
                    <td style="text-align:center" onclick="event.stopPropagation()">
                        <input type="checkbox" class="tx-cb" data-id="${tx.id}" data-amount="${amt}" style="cursor:pointer;width:16px;height:16px">
                    </td>
                    <td style="white-space:nowrap;font-weight:500">${Utils.formatDateTimeKR(tx.tx_date, tx.created_at)}</td>
                    <td>${typeBadge}</td>
                    <td><span class="badge ${methodClass}" style="font-size:0.75rem;padding:2px 8px">${methodLabel}</span></td>
                    <td onclick="event.stopPropagation()">
                        <button class="btn btn-ghost btn-sm" onclick="PersonalPage.quickEditCategory('${tx.id}')" style="padding:2px 6px;font-size:0.78rem;">
                            ${tx.personal_categories?.icon || '💰'} ${Utils.escapeHtml(tx.personal_categories?.name || '기타')} ▾
                        </button>
                    </td>
                    <td style="text-align:right;font-weight:700" class="${colorClass}">${sign}${Utils.formatVND(tx.amount)}</td>
                    <td class="text-secondary" onclick="event.stopPropagation()">
                        <span style="color:#fbbf24;font-size:0.75rem;font-weight:700;">[중복의심]</span> ${Utils.escapeHtml(tx.memo || '—')}
                    </td>
                    <td style="white-space:nowrap" onclick="event.stopPropagation()">
                        <button class="btn btn-icon btn-sm" onclick="PersonalPage.editTx('${tx.id}')" title="수정">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="PersonalPage.deleteTx('${tx.id}')" style="padding:2px 8px;font-size:0.75rem;" title="이 중복건 삭제">🗑️ 삭제</button>
                    </td>
                </tr>
                `;
            }).join('');
            this.updateBulkDeleteButton();
        }
    },

    selectZeroTx() {
        const cbs = document.querySelectorAll('.tx-cb');
        let count = 0;
        cbs.forEach(cb => {
            if (parseFloat(cb.dataset.amount || '0') === 0) {
                cb.checked = true;
                count++;
            }
        });
        this.updateBulkDeleteButton();
        if (count > 0) {
            Utils.toast(`0원 거래 내역 ${count}개가 선택되었습니다`, 'info');
        } else {
            Utils.toast('0원 거래 내역이 없습니다', 'info');
        }
    },

    async bulkDeleteTx() {
        const checkedCbs = document.querySelectorAll('.tx-cb:checked');
        const ids = Array.from(checkedCbs).map(cb => cb.dataset.id);
        if (ids.length === 0) return;

        const ok = await Modal.confirm('일괄 삭제', `선택한 ${ids.length}개의 거래 내역을 삭제하시겠습니까?`);
        if (ok) {
            const result = await Store.deleteTransactions(ids);
            if (result) {
                Utils.toast(`${ids.length}개의 거래 내역이 삭제되었습니다`, 'success');
                await this.loadTransactions();
                await this.refreshSummary();
            } else {
                Utils.toast('삭제 중 오류가 발생했습니다', 'error');
            }
        }
    },

    async openCategoryModal() {
        const cats = await Store.getCategories();
        const rows = cats.map(c => `
            <tr>
                <td>${c.icon || '📌'}</td>
                <td>${Utils.escapeHtml(c.name)}</td>
                <td><span class="badge badge-${c.type}">${c.type === 'income' ? '수입' : '지출'}</span></td>
                <td><button class="btn btn-icon btn-sm" onclick="PersonalPage.deleteCategory('${c.id}')">🗑️</button></td>
            </tr>
        `).join('');

        Modal.open('카테고리 관리', `
            <div class="form-grid mb-lg">
                <div class="form-group">
                    <label>카테고리명</label>
                    <input type="text" id="cat-name" placeholder="예: 커피">
                </div>
                <div class="form-group">
                    <label>구분</label>
                    <select id="cat-type">
                        <option value="expense">지출</option>
                        <option value="income">수입</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>아이콘</label>
                    <input type="text" id="cat-icon" value="📌" maxlength="4" style="width:60px">
                </div>
            </div>
            <button class="btn btn-success btn-sm mb-lg" id="btn-add-cat">+ 추가</button>
            <div class="table-wrapper">
                <table><thead><tr><th>아이콘</th><th>이름</th><th>구분</th><th>삭제</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="4" class="text-center text-muted">카테고리 없음</td></tr>'}</tbody>
                </table>
            </div>
        `);

        document.getElementById('btn-add-cat')?.addEventListener('click', async () => {
            const name = document.getElementById('cat-name').value.trim();
            const type = document.getElementById('cat-type').value;
            const icon = document.getElementById('cat-icon').value || '📌';
            if (!name) { Utils.toast('카테고리명을 입력해주세요', 'error'); return; }
            const result = await Store.addCategory({ name, type, icon });
            if (result) {
                Utils.toast('카테고리가 추가되었습니다', 'success');
                this.openCategoryModal();
            } else {
                Utils.toast('추가 실패 (중복 이름일 수 있습니다)', 'error');
            }
        });
    },

    async deleteCategory(id) {
        const ok = await Modal.confirm('카테고리 삭제', '이 카테고리를 삭제하시겠습니까? (기존 거래 내역은 유지됩니다)');
        if (ok) {
            await Store.deleteCategory(id);
            Utils.toast('삭제되었습니다', 'success');
            this.openCategoryModal();
        }
    }
};

Router.register('personal', PersonalPage);
