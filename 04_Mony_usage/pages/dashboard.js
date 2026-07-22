/* ============================================
   DASHBOARD.JS — 통합 대시보드 페이지
   ============================================ */

const DashboardPage = {
    async render() {
        const [balance, clubBal, exchangeTotal, recentTx, recentGames] = await Promise.all([
            Store.getTotalBalance(),
            Store.getClubTotalBalance(),
            Store.getExchangeTotal(),
            Store.getTransactions({ limit: 5 }),
            Store.getGames({ limit: 3 })
        ]);

        const monthSummary = await Store.getTransactionSummary(Utils.monthStart(), Utils.monthEnd());

        return `
        <div class="version-banner" style="background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.15)); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:1.4rem;">🚀</span>
                <div>
                    <div style="font-weight:700;font-size:0.98rem;color:var(--text-primary);">최종 버젼 시스템 업데이트 반영 완료</div>
                    <div style="font-size:0.82rem;color:var(--text-muted);">등수별 회비 산출 시트 비율 표기 및 포커스 유지 완전 개편</div>
                </div>
            </div>
            <div style="text-align:right;">
                <span class="badge badge-income" style="font-size:0.85rem;padding:4px 10px;font-weight:700;">v4.0.0 (최신)</span>
                <div style="font-size:0.8rem;color:#38bdf8;font-weight:700;margin-top:4px;">🕒 2026-07-22 12:35:00</div>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card indigo">
                <div class="card-icon">💰</div>
                <div class="card-label">개인 잔액</div>
                <div class="card-value">${Utils.formatVND(balance)}</div>
                <div class="card-sub">전체 기간 누적</div>
            </div>
            <div class="summary-card emerald">
                <div class="card-icon">⛳</div>
                <div class="card-label">모임 잔액</div>
                <div class="card-value">${Utils.formatVND(clubBal)}</div>
                <div class="card-sub">회비 입금 - 사용</div>
            </div>
            <div class="summary-card amber">
                <div class="card-icon">💱</div>
                <div class="card-label">환전 순 VND</div>
                <div class="card-value">${Utils.formatVND(exchangeTotal.vnd)}</div>
                <div class="card-sub">KRW: ${Utils.formatKRW(exchangeTotal.krw)}</div>
            </div>
            <div class="summary-card rose">
                <div class="card-icon">📉</div>
                <div class="card-label">이번 달 지출</div>
                <div class="card-value">${Utils.formatVND(monthSummary.expense)}</div>
                <div class="card-sub">수입: ${Utils.formatVND(monthSummary.income)}</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header">
                    <span class="card-title">📊 이번 달 수입/지출</span>
                </div>
                <div class="chart-container" style="height:260px">
                    <canvas id="dash-month-chart"></canvas>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <span class="card-title">🏆 최근 게임 순위</span>
                </div>
                ${recentGames.length > 0 ? this.renderRecentGames(recentGames) : '<div class="empty-state"><div class="empty-icon">⛳</div><p class="empty-text">아직 게임 기록이 없습니다</p></div>'}
            </div>
            <div class="card full-width">
                <div class="card-header">
                    <span class="card-title">🕐 최근 활동</span>
                </div>
                ${recentTx.length > 0 ? this.renderRecentActivity(recentTx) : '<div class="empty-state"><div class="empty-icon">📝</div><p class="empty-text">아직 거래 내역이 없습니다</p></div>'}
            </div>
        </div>`;
    },

    renderRecentGames(games) {
        let html = '<div style="display:flex;flex-direction:column;gap:12px">';
        games.forEach(g => {
            const parts = (g.club_game_participants || []).sort((a, b) => (a.ranking || 99) - (b.ranking || 99));
            const partStr = parts.map(p => {
                const rankClass = p.ranking <= 3 ? `rank-${p.ranking}` : 'rank-other';
                return `<span class="ranking-badge ${rankClass}" title="${p.club_members?.name}">${p.ranking || '-'}</span> ${Utils.escapeHtml(p.club_members?.name || '?')}`;
            }).join('&nbsp;&nbsp;');
            html += `<div class="activity-item">
                <div class="activity-icon">⛳</div>
                <div class="activity-info">
                    <div class="activity-title">${Utils.formatDateKR(g.game_date)} ${g.location || ''}</div>
                    <div class="activity-meta" style="margin-top:4px">${partStr || '참여자 없음'}</div>
                </div>
            </div>`;
        });
        html += '</div>';
        return html;
    },

    renderRecentActivity(txList) {
        let html = '<ul class="activity-list">';
        txList.forEach(tx => {
            const icon = tx.type === 'income' ? '📥' : '📤';
            const colorClass = tx.type === 'income' ? 'text-emerald' : 'text-rose';
            const sign = tx.type === 'income' ? '+' : '-';
            html += `<li class="activity-item">
                <div class="activity-icon">${icon}</div>
                <div class="activity-info">
                    <div class="activity-title">${tx.personal_categories?.icon || ''} ${Utils.escapeHtml(tx.personal_categories?.name || '')} ${tx.memo ? '- ' + Utils.escapeHtml(tx.memo) : ''}</div>
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
                    { label: '수입', data: incomeData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
                    { label: '지출', data: expenseData, backgroundColor: 'rgba(244,63,94,0.7)', borderRadius: 6 }
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
