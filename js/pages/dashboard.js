/* ============================================
   DASHBOARD.JS — 통합 대시보드 페이지
   ============================================ */

const DashboardPage = {
    async render() {
        const [balance, exchangeTotal, recentTx] = await Promise.all([
            Store.getTotalBalance(),
            Store.getExchangeTotal(),
            Store.getTransactions({ limit: 5 })
        ]);

        const monthSummary = await Store.getTransactionSummary(Utils.monthStart(), Utils.monthEnd());

        return `
        <div class="version-banner" style="background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.15)); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:1.4rem;">💰</span>
                <div>
                    <div style="font-weight:700;font-size:0.98rem;color:var(--text-primary);">나만의 독립 개인 가계부 & 자산 관리 시스템</div>
                    <div style="font-size:0.82rem;color:var(--text-muted);">개인 수입·지출 관리, 자산 분석 및 개인 환전 통합 대시보드</div>
                </div>
            </div>
            <div style="text-align:right;">
                <span class="badge badge-income" style="font-size:0.85rem;padding:4px 10px;font-weight:700;">v2.0.5 (전수 이관 픽스)</span>
                <div style="font-size:0.8rem;color:#38bdf8;font-weight:700;margin-top:4px;">🕒 2026-07-25 07:36</div>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card indigo">
                <div class="card-icon">💰</div>
                <div class="card-label">개인 자산 누적 잔액</div>
                <div class="card-value">${Utils.formatVND(balance)}</div>
                <div class="card-sub">전체 기간 수입 - 지출</div>
            </div>
            <div class="summary-card rose">
                <div class="card-icon">📉</div>
                <div class="card-label">이번 달 지출</div>
                <div class="card-value">${Utils.formatVND(monthSummary.expense)}</div>
                <div class="card-sub">수입: ${Utils.formatVND(monthSummary.income)}</div>
            </div>
            <div class="summary-card amber">
                <div class="card-icon">💱</div>
                <div class="card-label">개인 환전 순 VND</div>
                <div class="card-value">${Utils.formatVND(exchangeTotal.vnd)}</div>
                <div class="card-sub">KRW: ${Utils.formatKRW(exchangeTotal.krw)}</div>
            </div>
            <div class="summary-card emerald">
                <div class="card-icon">📈</div>
                <div class="card-label">이번 달 순수입</div>
                <div class="card-value">${Utils.formatVND(monthSummary.income - monthSummary.expense)}</div>
                <div class="card-sub">수입 - 지출 정산</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header">
                    <span class="card-title">📊 최근 6개월 수입/지출 추이</span>
                </div>
                <div class="chart-container" style="height:260px">
                    <canvas id="dash-month-chart"></canvas>
                </div>
            </div>
            <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <span class="card-title">📝 최근 개인 거래 내역</span>
                    <button class="btn btn-emerald btn-sm" onclick="Router.navigate('personal')">가계부 이동 ➔</button>
                </div>
                ${recentTx.length > 0 ? this.renderRecentActivity(recentTx) : '<div class="empty-state"><div class="empty-icon">📝</div><p class="empty-text">아직 거래 내역이 없습니다</p></div>'}
            </div>
        </div>`;
    },

    renderRecentActivity(txList) {
        let html = '<ul class="activity-list">';
        txList.forEach(tx => {
            const icon = tx.type === 'income' ? '📥' : '📤';
            const colorClass = tx.type === 'income' ? 'text-emerald' : 'text-rose';
            const sign = tx.type === 'income' ? '+' : '-';
            const methodTag = tx.payment_method === 'cash' ? '💵' : '💳';
            html += `<li class="activity-item">
                <div class="activity-icon">${icon}</div>
                <div class="activity-info">
                    <div class="activity-title">${methodTag} ${tx.personal_categories?.icon || ''} ${Utils.escapeHtml(tx.personal_categories?.name || '')} ${tx.memo ? '- ' + Utils.escapeHtml(tx.memo) : ''}</div>
                    <div class="activity-meta">${Utils.formatDateKR(tx.tx_date)}</div>
                </div>
                <div class="${colorClass}" style="font-weight:600;white-space:nowrap">${sign}${Utils.formatVND(tx.amount)}</div>
            </li>`;
        });
        html += '</ul>';
        return html;
    },

    async afterRender() {
        await this.renderMonthChart();
    },

    async renderMonthChart() {
        const canvas = document.getElementById('dash-month-chart');
        if (!canvas) return;

        const now = new Date();
        const labels = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = d.toISOString().split('T')[0];
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
            labels.push(`${d.getMonth() + 1}월`);
            const s = await Store.getTransactionSummary(start, end);
            incomeData.push(s.income);
            expenseData.push(s.expense);
        }

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '수입', data: incomeData, backgroundColor: 'rgba(16, 185, 129, 0.7)', borderRadius: 6 },
                    { label: '지출', data: expenseData, backgroundColor: 'rgba(244, 63, 94, 0.7)', borderRadius: 6 }
                ]
            },
            options: {
                ...Utils.chartDefaults(),
                plugins: {
                    ...Utils.chartDefaults().plugins,
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}` } }
                }
            }
        });
    }
};

Router.register('dashboard', DashboardPage);
