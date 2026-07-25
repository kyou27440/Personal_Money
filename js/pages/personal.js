/* ============================================
   PERSONAL.JS — 개인 가계부 페이지
   ============================================ */

const PersonalPage = {
    async render() {
        const summary = await Store.getTransactionSummary(Utils.monthStart(), Utils.monthEnd());
        const balance = await Store.getTotalBalance();

        return `
        <div class="personal-summary">
            <div class="summary-card emerald">
                <div class="card-label">이번 달 수입</div>
                <div class="card-value" id="summary-income">${Utils.formatVND(summary.income)}</div>
            </div>
            <div class="summary-card rose">
                <div class="card-label">이번 달 지출</div>
                <div class="card-value" id="summary-expense">${Utils.formatVND(summary.expense)}</div>
            </div>
            <div class="summary-card indigo">
                <div class="card-label">총 잔액</div>
                <div class="card-value" id="summary-balance">${Utils.formatVND(balance)}</div>
            </div>
        </div>

        <div class="section-header">
            <div class="flex items-center gap-sm">
                <span class="section-title">거래 내역</span>
                <button class="btn btn-danger btn-sm hidden" id="btn-bulk-delete-tx">🗑️ 선택 삭제 (<span id="selected-tx-count">0</span>개)</button>
                <button class="btn btn-ghost btn-sm hidden" id="btn-select-zero-tx" style="border-color:var(--accent-amber);color:var(--accent-amber)">⚠️ 0원 내역 선택</button>
            </div>
            <div class="flex gap-sm">
                <button class="btn btn-primary" id="btn-add-tx">+ 입력</button>
                <button class="btn btn-ghost" id="btn-manage-cat">카테고리 관리</button>
            </div>
        </div>

        <div class="filter-bar mb-lg">
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
            <button class="btn btn-ghost btn-sm" id="btn-filter-tx">조회</button>
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
                    <th>작업</th>
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
        document.getElementById('btn-select-zero-tx')?.addEventListener('click', () => this.selectZeroTx());

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
        const balance = await Store.getTotalBalance();
        const incEl = document.getElementById('summary-income');
        const expEl = document.getElementById('summary-expense');
        const balEl = document.getElementById('summary-balance');
        if (incEl) incEl.textContent = Utils.formatVND(summary.income);
        if (expEl) expEl.textContent = Utils.formatVND(summary.expense);
        if (balEl) balEl.textContent = Utils.formatVND(balance);
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
        tbody.innerHTML = txList.map(tx => {
            const isIncome = String(tx.type).trim().toLowerCase() === 'income';
            const methodLabel = tx.payment_method === 'cash' ? '💵 현금' : '💳 계좌이체';
            const methodClass = tx.payment_method === 'cash' ? 'badge-amber' : 'badge-indigo';
            const typeBadge = isIncome ? '<span class="badge badge-income">수입</span>' : '<span class="badge badge-expense">지출</span>';
            const colorClass = isIncome ? 'text-emerald' : 'text-rose';
            const sign = isIncome ? '+' : '-';
            const amt = Utils.parseAmount(tx.amount);
            if (amt === 0) hasZeroTx = true;

            return `
            <tr>
                <td style="text-align:center">
                    <input type="checkbox" class="tx-cb" data-id="${tx.id}" data-amount="${amt}" style="cursor:pointer;width:16px;height:16px">
                </td>
                <td style="white-space:nowrap;font-weight:500">${Utils.formatDateTimeKR(tx.tx_date, tx.created_at)}</td>
                <td>${typeBadge}</td>
                <td><span class="badge ${methodClass}" style="font-size:0.75rem;padding:2px 8px">${methodLabel}</span></td>
                <td>${tx.personal_categories?.icon || '💰'} ${Utils.escapeHtml(tx.personal_categories?.name || '기타')}</td>
                <td style="text-align:right;font-weight:600" class="${colorClass}">${sign}${Utils.formatVND(tx.amount)}</td>
                <td class="text-secondary">${Utils.escapeHtml(tx.memo || '')}</td>
                <td>
                    <button class="btn btn-icon btn-sm" onclick="PersonalPage.editTx('${tx.id}')" title="수정">✏️</button>
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

        this.updateBulkDeleteButton();
    },

    async openTxModal(editTx = null) {
        const cats = await Store.getCategories();
        const isEdit = !!editTx;
        const editTime = editTx && editTx.created_at ? (() => {
            try {
                const d = new Date(editTx.created_at);
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            } catch(e) { return Utils.currentTime(); }
        })() : Utils.currentTime();

        Modal.open(isEdit ? '거래 수정' : '수입/지출 입력', `
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
            if (filtered.length > 0) {
                catSelect.innerHTML = filtered.map(c =>
                    `<option value="${c.id}">${c.icon || '📌'} ${c.name}</option>`
                ).join('');
            } else {
                catSelect.innerHTML = `<option value="1">💰 기타</option>`;
            }
            if (editTx && editTx.category_id) catSelect.value = String(editTx.category_id);
        };

        typeSelect.addEventListener('change', filterCats);
        filterCats();

        document.getElementById('btn-save-tx')?.addEventListener('click', async () => {
            const txDate = Utils.formatDate(document.getElementById('tx-date').value);
            const txTime = document.getElementById('tx-time')?.value || Utils.currentTime();
            const amount = Utils.parseAmount(document.getElementById('tx-amount').value);
            const selectedCatId = document.getElementById('tx-category').value;
            let fullISO = new Date().toISOString();
            try {
                fullISO = new Date(`${txDate}T${txTime}:00`).toISOString();
            } catch(e) {}

            const data = {
                tx_date: txDate,
                created_at: fullISO,
                type: String(document.getElementById('tx-type').value).trim().toLowerCase(),
                payment_method: document.getElementById('tx-method').value,
                category_id: selectedCatId ? (isNaN(Number(selectedCatId)) ? selectedCatId : Number(selectedCatId)) : 1,
                amount: amount,
                memo: document.getElementById('tx-memo').value.trim()
            };

            if (!data.tx_date || !data.amount || data.amount <= 0) {
                Utils.toast('날짜와 올바른 금액(0 이상)을 입력해주세요', 'error');
                return;
            }

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
        const countEl = document.getElementById('selected-tx-count');
        const selectAllCb = document.getElementById('select-all-tx');

        const count = checkedCbs.length;
        if (countEl) countEl.textContent = count;

        if (bulkBtn) {
            if (count > 0) bulkBtn.classList.remove('hidden');
            else bulkBtn.classList.add('hidden');
        }

        if (selectAllCb && allCbs.length > 0) {
            selectAllCb.checked = checkedCbs.length === allCbs.length;
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
