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
                <div class="card-value">${Utils.formatVND(summary.income)}</div>
            </div>
            <div class="summary-card rose">
                <div class="card-label">이번 달 지출</div>
                <div class="card-value">${Utils.formatVND(summary.expense)}</div>
            </div>
            <div class="summary-card indigo">
                <div class="card-label">총 잔액</div>
                <div class="card-value">${Utils.formatVND(balance)}</div>
            </div>
        </div>

        <div class="section-header">
            <span class="section-title">거래 내역</span>
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
                <option value="">전체</option>
                <option value="income">수입</option>
                <option value="expense">지출</option>
            </select>
            <button class="btn btn-ghost btn-sm" id="btn-filter-tx">조회</button>
        </div>

        <div class="table-wrapper">
            <table>
                <thead><tr>
                    <th>날짜</th><th>구분</th><th>카테고리</th><th style="text-align:right">금액 (VND)</th><th>메모</th><th>작업</th>
                </tr></thead>
                <tbody id="tx-table-body">
                    <tr><td colspan="6" class="text-center text-muted" style="padding:40px">로딩 중...</td></tr>
                </tbody>
            </table>
        </div>`;
    },

    async afterRender() {
        document.getElementById('btn-add-tx').addEventListener('click', () => this.openTxModal());
        document.getElementById('btn-manage-cat').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('btn-filter-tx').addEventListener('click', () => this.loadTransactions());
        await this.loadTransactions();
    },

    async loadTransactions() {
        const startDate = document.getElementById('filter-start').value;
        const endDate = document.getElementById('filter-end').value;
        const type = document.getElementById('filter-type').value;
        const txList = await Store.getTransactions({ startDate, endDate, type: type || undefined });
        const tbody = document.getElementById('tx-table-body');

        if (txList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">거래 내역이 없습니다</td></tr>';
            return;
        }

        tbody.innerHTML = txList.map(tx => `
            <tr>
                <td>${Utils.formatDateKR(tx.tx_date)}</td>
                <td><span class="badge badge-${tx.type}">${tx.type === 'income' ? '수입' : '지출'}</span></td>
                <td>${tx.personal_categories?.icon || ''} ${Utils.escapeHtml(tx.personal_categories?.name || '')}</td>
                <td style="text-align:right;font-weight:600" class="${tx.type === 'income' ? 'text-emerald' : 'text-rose'}">${tx.type === 'income' ? '+' : '-'}${Utils.formatVND(tx.amount)}</td>
                <td class="text-secondary">${Utils.escapeHtml(tx.memo)}</td>
                <td>
                    <button class="btn btn-icon btn-sm" onclick="PersonalPage.editTx(${tx.id})" title="수정">✏️</button>
                    <button class="btn btn-icon btn-sm" onclick="PersonalPage.deleteTx(${tx.id})" title="삭제">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    async openTxModal(editTx = null) {
        const cats = await Store.getCategories();
        const isEdit = !!editTx;

        const catOptions = cats.map(c =>
            `<option value="${c.id}" ${editTx?.category_id === c.id ? 'selected' : ''}>${c.icon} ${c.name} (${c.type === 'income' ? '수입' : '지출'})</option>`
        ).join('');

        Modal.open(isEdit ? '거래 수정' : '수입/지출 입력', `
            <div class="form-grid">
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" id="tx-date" value="${editTx ? Utils.formatDate(editTx.tx_date) : Utils.today()}">
                </div>
                <div class="form-group">
                    <label>구분</label>
                    <select id="tx-type">
                        <option value="expense" ${editTx?.type === 'expense' || !editTx ? 'selected' : ''}>지출</option>
                        <option value="income" ${editTx?.type === 'income' ? 'selected' : ''}>수입</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>카테고리</label>
                    <select id="tx-category">${catOptions}</select>
                </div>
                <div class="form-group">
                    <label>금액 (VND)</label>
                    <input type="text" id="tx-amount" placeholder="예: 250000" value="${editTx ? editTx.amount : ''}" inputmode="numeric">
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

        // Filter categories by selected type
        const typeSelect = document.getElementById('tx-type');
        const catSelect = document.getElementById('tx-category');
        const filterCats = () => {
            const selType = typeSelect.value;
            const filtered = cats.filter(c => c.type === selType);
            catSelect.innerHTML = filtered.map(c =>
                `<option value="${c.id}">${c.icon} ${c.name}</option>`
            ).join('');
            if (editTx && editTx.category_id) catSelect.value = editTx.category_id;
        };
        typeSelect.addEventListener('change', filterCats);
        filterCats();

        document.getElementById('btn-save-tx').addEventListener('click', async () => {
            const data = {
                tx_date: document.getElementById('tx-date').value,
                type: document.getElementById('tx-type').value,
                category_id: Number(document.getElementById('tx-category').value),
                amount: Utils.parseAmount(document.getElementById('tx-amount').value),
                memo: document.getElementById('tx-memo').value.trim()
            };
            if (!data.tx_date || !data.amount || data.amount <= 0) {
                Utils.toast('날짜와 금액을 입력해주세요', 'error');
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
                Router.navigate('personal');
            } else {
                Utils.toast('저장에 실패했습니다', 'error');
            }
        });
    },

    async editTx(id) {
        const txList = await Store.getTransactions({});
        const tx = txList.find(t => t.id === id);
        if (tx) this.openTxModal(tx);
    },

    async deleteTx(id) {
        const ok = await Modal.confirm('거래 삭제', '이 거래 내역을 삭제하시겠습니까?');
        if (ok) {
            const result = await Store.deleteTransaction(id);
            if (result) {
                Utils.toast('삭제되었습니다', 'success');
                Router.navigate('personal');
            }
        }
    },

    async openCategoryModal() {
        const cats = await Store.getCategories();
        const rows = cats.map(c => `
            <tr>
                <td>${c.icon}</td>
                <td>${Utils.escapeHtml(c.name)}</td>
                <td><span class="badge badge-${c.type}">${c.type === 'income' ? '수입' : '지출'}</span></td>
                <td><button class="btn btn-icon btn-sm" onclick="PersonalPage.deleteCategory(${c.id})">🗑️</button></td>
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

        document.getElementById('btn-add-cat').addEventListener('click', async () => {
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
