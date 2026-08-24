/* ============================================
   ANALYTICS.JS — 자산 현황 및 통계 페이지 (개인 전용)
   ============================================ */

const AnalyticsPage = {
    async render() {
        return `
        <div class="analytics-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px;">
            <div class="card" style="padding:18px;">
                <div class="card-header" style="margin-bottom:14px;"><span class="card-title" style="font-size:1rem;font-weight:700;">📊 이번 달 카테고리별 지출 비율</span></div>
                <div class="chart-container" style="height:360px"><canvas id="cat-doughnut-chart"></canvas></div>
            </div>
            <div class="card" style="padding:18px;">
                <div class="card-header" style="margin-bottom:14px;"><span class="card-title" style="font-size:1rem;font-weight:700;">📊 최근 6개월 수입/지출 추이 (막대 그래프)</span></div>
                <div class="chart-container" style="height:360px"><canvas id="monthly-trend-chart"></canvas></div>
            </div>
        </div>`;
    },

    async afterRender() {
        await Promise.all([
            this.drawCategoryDoughnut(),
            this.drawMonthlyTrend()
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
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: '수입 (VND)',
                        data: incomeData,
                        backgroundColor: 'rgba(52, 211, 153, 0.85)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.6
                    },
                    {
                        label: '지출 (VND)',
                        data: expenseData,
                        backgroundColor: 'rgba(251, 113, 133, 0.85)',
                        borderColor: '#f43f5e',
                        borderWidth: 1,
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.6
                    }
                ]
            },
            options: {
                ...Utils.chartDefaults(),
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    ...Utils.chartDefaults().plugins,
                    legend: {
                        position: 'top',
                        labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12, weight: '600' }, padding: 14 }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}`
                        }
                    }
                }
            }
        });
    }
};

Router.register('analytics', AnalyticsPage);
