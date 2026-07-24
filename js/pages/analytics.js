/* ============================================
   ANALYTICS.JS — 자산 현황 및 통계 페이지 (개인 전용)
   ============================================ */

const AnalyticsPage = {
    async render() {
        return `
        <div class="analytics-grid">
            <div class="card">
                <div class="card-header"><span class="card-title">📊 이번 달 카테고리별 지출 비율</span></div>
                <div class="chart-container" style="height:300px"><canvas id="cat-doughnut-chart"></canvas></div>
            </div>
            <div class="card">
                <div class="card-header"><span class="card-title">📈 최근 6개월 수입/지출 추이</span></div>
                <div class="chart-container" style="height:300px"><canvas id="monthly-trend-chart"></canvas></div>
            </div>
            <div class="card full-width">
                <div class="card-header"><span class="card-title">💱 최근 6개월 환전 현황 (VND / KRW)</span></div>
                <div class="chart-container" style="height:280px"><canvas id="exchange-bar-chart"></canvas></div>
            </div>
        </div>`;
    },

    async afterRender() {
        await Promise.all([
            this.drawCategoryDoughnut(),
            this.drawMonthlyTrend(),
            this.drawExchangeBar()
        ]);
    },

    async drawCategoryDoughnut() {
        const canvas = document.getElementById('cat-doughnut-chart');
        if (!canvas) return;
        const txList = await Store.getTransactions({ startDate: Utils.monthStart(), endDate: Utils.monthEnd(), type: 'expense' });
        const catMap = {};
        txList.forEach(tx => {
            const name = tx.personal_categories?.name || '기타';
            catMap[name] = (catMap[name] || 0) + Number(tx.amount);
        });
        const labels = Object.keys(catMap);
        const data = Object.values(catMap);
        if (labels.length === 0) { canvas.parentElement.innerHTML = '<div class="empty-state"><p class="text-muted">이번 달 지출 데이터 없음</p></div>'; return; }

        new Chart(canvas, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: Utils.chartColors.slice(0, labels.length), borderWidth: 0, hoverOffset: 8 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#9ca3b4', font: { family: 'Inter', size: 12 }, padding: 12 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.label}: ${Utils.formatVND(ctx.raw)}` } }
                }
            }
        });
    },

    async drawMonthlyTrend() {
        const canvas = document.getElementById('monthly-trend-chart');
        if (!canvas) return;
        const now = new Date();
        const labels = [], incomeData = [], expenseData = [];
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
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '수입', data: incomeData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
                    { label: '지출', data: expenseData, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: { ...Utils.chartDefaults(), plugins: { ...Utils.chartDefaults().plugins, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}` } } } }
        });
    },

    async drawExchangeBar() {
        const canvas = document.getElementById('exchange-bar-chart');
        if (!canvas) return;
        const now = new Date();
        const labels = [], vndData = [], krwData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = d.toISOString().split('T')[0];
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
            labels.push(`${d.getMonth() + 1}월`);
            const exList = await Store.getExchanges({ startDate: start, endDate: end });
            let vnd = 0, krw = 0;
            exList.forEach(e => { vnd += Number(e.amount_vnd); krw += Number(e.amount_krw); });
            vndData.push(vnd);
            krwData.push(krw);
        }
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'VND 거래량', data: vndData, backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6, yAxisID: 'y' },
                    { label: 'KRW 거래량', data: krwData, backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 6, yAxisID: 'y1' }
                ]
            },
            options: {
                ...Utils.chartDefaults(),
                scales: {
                    x: Utils.chartDefaults().scales.x,
                    y: { ...Utils.chartDefaults().scales.y, position: 'left', title: { display: true, text: 'VND', color: '#6b7280' } },
                    y1: { ...Utils.chartDefaults().scales.y, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'KRW', color: '#6b7280' } }
                }
            }
        });
    }
};

Router.register('analytics', AnalyticsPage);
