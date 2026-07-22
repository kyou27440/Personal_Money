/* ============================================
   EXCHANGE.JS — 환전 관리 페이지
   ============================================ */

const ExchangePage = {
    async render() {
        const exTotal = await Store.getExchangeTotal();
        const defaultRate = (await Store.getSetting('default_exchange_rate')) || '18.5';

        return `
        <div class="summary-grid mb-lg">
            <div class="summary-card indigo">
                <div class="card-label">순 VND 변동</div>
                <div class="card-value">${Utils.formatVND(exTotal.vnd)}</div>
            </div>
            <div class="summary-card amber">
                <div class="card-label">순 KRW 변동</div>
                <div class="card-value">${Utils.formatKRW(exTotal.krw)}</div>
            </div>
            <div class="summary-card emerald">
                <div class="card-label">기본 환율</div>
                <div class="card-value">1 KRW = ${defaultRate} VND</div>
            </div>
        </div>

        <div class="card mb-lg">
            <div class="card-header"><span class="card-title">💱 환전 계산기</span></div>
            <div class="form-grid">
                <div class="form-group">
                    <label>환전 방향</label>
                    <select id="calc-direction">
                        <option value="KRW_TO_VND">KRW → VND (원화를 주고 동을 받음)</option>
                        <option value="VND_TO_KRW">VND → KRW (동을 주고 원화를 받음)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>환율 (1 KRW = ? VND)</label>
                    <input type="number" id="calc-rate" value="${defaultRate}" step="0.1">
                </div>
                <div class="form-group">
                    <label id="calc-input-label">KRW 금액</label>
                    <input type="text" id="calc-input" placeholder="금액 입력" inputmode="numeric">
                </div>
            </div>
            <div class="exchange-result">
                <div class="text-secondary" style="font-size:0.85rem">환전 결과</div>
                <div class="result-value" id="calc-result">-</div>
            </div>
        </div>

        <div class="section-header">
            <span class="section-title">환전 내역</span>
            <button class="btn btn-primary" id="btn-add-exchange">+ 환전 기록</button>
        </div>

        <div class="filter-bar mb-lg">
            <input type="date" id="ex-filter-start" value="${Utils.monthStart()}">
            <span class="text-muted">~</span>
            <input type="date" id="ex-filter-end" value="${Utils.today()}">
            <input type="text" id="ex-filter-person" placeholder="출장자 이름">
            <button class="btn btn-ghost btn-sm" id="btn-filter-ex">조회</button>
        </div>

        <div class="table-wrapper">
            <table>
                <thead><tr><th>날짜</th><th>출장자</th><th>유형</th><th>환율</th><th style="text-align:right">VND</th><th style="text-align:right">KRW</th><th>비고</th><th>삭제</th></tr></thead>
                <tbody id="ex-table-body">
                    <tr><td colspan="8" class="text-center text-muted" style="padding:40px">로딩 중...</td></tr>
                </tbody>
            </table>
        </div>`;
    },

    async afterRender() {
        document.getElementById('btn-add-exchange').addEventListener('click', () => this.openExchangeModal());
        document.getElementById('btn-filter-ex').addEventListener('click', () => this.loadExchanges());

        // 환전 계산기
        const calcInput = document.getElementById('calc-input');
        const calcRate = document.getElementById('calc-rate');
        const calcDir = document.getElementById('calc-direction');
        const calcResult = document.getElementById('calc-result');
        const calcLabel = document.getElementById('calc-input-label');

        const calculate = () => {
            const amount = Utils.parseAmount(calcInput.value);
            const rate = parseFloat(calcRate.value) || 18.5;
            const dir = calcDir.value;
            if (!amount) { calcResult.textContent = '-'; return; }
            if (dir === 'KRW_TO_VND') {
                calcResult.textContent = Utils.formatVND(amount * rate);
            } else {
                calcResult.textContent = Utils.formatKRW(Math.round(amount / rate));
            }
        };

        calcDir.addEventListener('change', () => {
            calcLabel.textContent = calcDir.value === 'KRW_TO_VND' ? 'KRW 금액' : 'VND 금액';
            calcInput.value = '';
            calcResult.textContent = '-';
        });

        calcInput.addEventListener('input', calculate);
        calcRate.addEventListener('input', calculate);

        await this.loadExchanges();
    },

    async loadExchanges() {
        const filters = {
            startDate: document.getElementById('ex-filter-start').value,
            endDate: document.getElementById('ex-filter-end').value,
            person_name: document.getElementById('ex-filter-person').value.trim() || undefined
        };
        const exList = await Store.getExchanges(filters);
        const tbody = document.getElementById('ex-table-body');

        if (exList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:40px">환전 내역이 없습니다</td></tr>';
            return;
        }

        tbody.innerHTML = exList.map(e => `
            <tr>
                <td>${Utils.formatDateKR(e.tx_date)}</td>
                <td>${Utils.escapeHtml(e.person_name)}</td>
                <td><span class="badge ${e.tx_type === 'VND_TO_KRW' ? 'badge-expense' : 'badge-income'}">${e.tx_type === 'VND_TO_KRW' ? 'VND→KRW' : 'KRW→VND'}</span></td>
                <td>${e.exchange_rate}</td>
                <td style="text-align:right">${Utils.formatVND(e.amount_vnd)}</td>
                <td style="text-align:right">${Utils.formatKRW(e.amount_krw)}</td>
                <td class="text-secondary">${Utils.escapeHtml(e.memo)}</td>
                <td><button class="btn btn-icon btn-sm" onclick="ExchangePage.deleteExchange(${e.id})">🗑️</button></td>
            </tr>
        `).join('');
    },

    async openExchangeModal() {
        const defaultRate = (await Store.getSetting('default_exchange_rate')) || '18.5';
        Modal.open('환전 기록 입력', `
            <div class="form-grid">
                <div class="form-group"><label>날짜</label><input type="date" id="ex-date" value="${Utils.today()}"></div>
                <div class="form-group"><label>출장자 이름</label><input type="text" id="ex-person" placeholder="이름"></div>
                <div class="form-group">
                    <label>거래 유형</label>
                    <select id="ex-type">
                        <option value="VND_TO_KRW">VND 지급 → KRW 수령</option>
                        <option value="KRW_TO_VND">KRW 지급 → VND 수령</option>
                    </select>
                </div>
                <div class="form-group"><label>환율 (1 KRW = ? VND)</label><input type="number" id="ex-rate" value="${defaultRate}" step="0.1"></div>
                <div class="form-group"><label>VND 금액</label><input type="text" id="ex-vnd" placeholder="예: 5000000" inputmode="numeric"></div>
                <div class="form-group"><label>KRW 금액</label><input type="text" id="ex-krw" placeholder="자동 계산" inputmode="numeric"></div>
            </div>
            <div class="form-group mt-md"><label>비고</label><input type="text" id="ex-memo" placeholder="메모 (선택)"></div>
        `, `<button class="btn btn-ghost" onclick="Modal.close()">취소</button><button class="btn btn-primary" id="btn-save-ex">저장</button>`);

        // Auto-calculate
        const vndInput = document.getElementById('ex-vnd');
        const krwInput = document.getElementById('ex-krw');
        const rateInput = document.getElementById('ex-rate');

        vndInput.addEventListener('input', () => {
            const vnd = Utils.parseAmount(vndInput.value);
            const rate = parseFloat(rateInput.value) || 18.5;
            if (vnd > 0) krwInput.value = Math.round(vnd / rate);
        });
        krwInput.addEventListener('input', () => {
            const krw = Utils.parseAmount(krwInput.value);
            const rate = parseFloat(rateInput.value) || 18.5;
            if (krw > 0) vndInput.value = Math.round(krw * rate);
        });

        document.getElementById('btn-save-ex').addEventListener('click', async () => {
            const data = {
                tx_date: document.getElementById('ex-date').value,
                person_name: document.getElementById('ex-person').value.trim(),
                tx_type: document.getElementById('ex-type').value,
                exchange_rate: parseFloat(rateInput.value) || 18.5,
                amount_vnd: Utils.parseAmount(vndInput.value),
                amount_krw: Utils.parseAmount(krwInput.value),
                memo: document.getElementById('ex-memo').value.trim()
            };
            if (!data.tx_date || !data.person_name || !data.amount_vnd) {
                Utils.toast('날짜, 출장자, 금액을 입력해주세요', 'error');
                return;
            }
            const result = await Store.addExchange(data);
            if (result) { Utils.toast('환전이 기록되었습니다', 'success'); Modal.close(); Router.navigate('exchange'); }
        });
    },

    async deleteExchange(id) {
        const ok = await Modal.confirm('환전 삭제', '이 환전 기록을 삭제하시겠습니까?');
        if (ok) { await Store.deleteExchange(id); Utils.toast('삭제되었습니다', 'success'); Router.navigate('exchange'); }
    }
};

Router.register('exchange', ExchangePage);
