/* ============================================
   ANALYTICS.JS — 자산 현황 및 통계 페이지 (월별 카테고리 비교 분석 강화)
   ============================================ */

const AnalyticsPage = {
    _prevMonth: null,
    _currMonth: null,
    _charts: [],

    async render() {
        const now = new Date();
        this._currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        this._prevMonth = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;

        const monthOptions = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
            monthOptions.push({ val, label });
        }
        const optHtml = monthOptions.map(m => `<option value="${m.val}">${m.label}</option>`).join('');

        return `
        <div style="max-width:1100px;margin:0 auto;">

            <!-- 월 선택 컨트롤 -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
                <span style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">📅 비교 기준:</span>
                <div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:6px 14px;">
                    <select id="sel-prev-month" style="background:transparent;border:none;color:#818cf8;font-weight:700;font-size:0.9rem;cursor:pointer;outline:none;">${optHtml}</select>
                    <span style="color:var(--text-muted);">→</span>
                    <select id="sel-curr-month" style="background:transparent;border:none;color:#fb7185;font-weight:700;font-size:0.9rem;cursor:pointer;outline:none;">${optHtml}</select>
                    <button id="btn-compare-apply" class="btn btn-primary btn-sm" style="padding:3px 12px;font-size:0.8rem;margin-left:4px;">📊 비교</button>
                </div>
            </div>

            <!-- 상단 3열 요약 카드 -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:18px;">
                <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(79,70,229,0.06));border:1px solid rgba(129,140,248,0.3);border-radius:12px;padding:14px 18px;">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;" id="lbl-prev-month">이전 달 지출</div>
                    <div style="font-size:1.35rem;font-weight:800;color:#818cf8;" id="val-prev-expense">—</div>
                </div>
                <div style="background:linear-gradient(135deg,rgba(244,63,94,0.15),rgba(225,29,72,0.06));border:1px solid rgba(251,113,133,0.3);border-radius:12px;padding:14px 18px;">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;" id="lbl-curr-month">이번 달 지출</div>
                    <div style="font-size:1.35rem;font-weight:800;color:#fb7185;" id="val-curr-expense">—</div>
                </div>
                <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.06));border:1px solid rgba(52,211,153,0.3);border-radius:12px;padding:14px 18px;">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">전월 대비 증감</div>
                    <div style="font-size:1.35rem;font-weight:800;" id="val-delta-pct">—</div>
                    <div style="font-size:0.78rem;font-weight:600;margin-top:2px;" id="val-delta-abs"></div>
                </div>
            </div>

            <!-- 카테고리별 비교 패널 -->
            <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:18px;margin-bottom:18px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                    <span style="font-size:0.95rem;font-weight:700;">📊 카테고리별 월별 비교</span>
                    <div style="display:flex;align-items:center;gap:14px;font-size:0.78rem;">
                        <span style="display:flex;align-items:center;gap:5px;">
                            <span style="width:10px;height:10px;border-radius:3px;background:#818cf8;display:inline-block;"></span>
                            <span id="legend-prev" style="color:var(--text-muted);">이전 달</span>
                        </span>
                        <span style="display:flex;align-items:center;gap:5px;">
                            <span style="width:10px;height:10px;border-radius:3px;background:#fb7185;display:inline-block;"></span>
                            <span id="legend-curr" style="color:var(--text-muted);">이번 달</span>
                        </span>
                    </div>
                </div>
                <div id="cat-compare-list">
                    <div style="text-align:center;padding:40px;color:var(--text-muted);">⏳ 로딩 중...</div>
                </div>
            </div>

            <!-- 카테고리 그룹 막대 차트 -->
            <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:18px;margin-bottom:18px;">
                <div style="font-size:0.95rem;font-weight:700;margin-bottom:14px;">📈 카테고리별 지출 비교 차트</div>
                <div style="height:280px;"><canvas id="cat-compare-chart"></canvas></div>
            </div>

            <!-- 도넛 + 6개월 추이 -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:16px;">
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:18px;">
                    <div style="font-size:0.9rem;font-weight:700;margin-bottom:14px;" id="lbl-doughnut">🥧 이번 달 카테고리 비율</div>
                    <div style="height:300px;"><canvas id="cat-doughnut-chart"></canvas></div>
                </div>
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:18px;">
                    <div style="font-size:0.9rem;font-weight:700;margin-bottom:14px;">📉 최근 6개월 수입/지출 추이</div>
                    <div style="height:300px;"><canvas id="monthly-trend-chart"></canvas></div>
                </div>
            </div>

        </div>`;
    },

    async afterRender() {
        const selPrev = document.getElementById('sel-prev-month');
        const selCurr = document.getElementById('sel-curr-month');
        if (selPrev) selPrev.value = this._prevMonth;
        if (selCurr) selCurr.value = this._currMonth;

        document.getElementById('btn-compare-apply')?.addEventListener('click', async () => {
            const newPrev = document.getElementById('sel-prev-month')?.value;
            const newCurr = document.getElementById('sel-curr-month')?.value;
            if (newPrev === newCurr) { Utils.toast('비교 기준 월이 같습니다. 다른 달을 선택하세요.', 'info'); return; }
            this._prevMonth = newPrev;
            this._currMonth = newCurr;
            this._destroyAll();
            await this._renderCompare();
            await this.drawCategoryDoughnut();
        });

        await this._renderCompare();
        await Promise.all([
            this.drawCategoryDoughnut(),
            this.drawMonthlyTrend()
        ]);
    },

    _destroyAll() {
        this._charts.forEach(c => { try { c.destroy(); } catch(e) {} });
        this._charts = [];
    },

    _monthRange(ym) {
        const [y, m] = ym.split('-').map(Number);
        const start = `${y}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { start, end };
    },

    _monthLabel(ym) {
        const [y, m] = ym.split('-').map(Number);
        return `${y}년 ${m}월`;
    },

    async _renderCompare() {
        const prevRange = this._monthRange(this._prevMonth);
        const currRange = this._monthRange(this._currMonth);

        document.getElementById('lbl-prev-month').textContent = this._monthLabel(this._prevMonth) + ' 지출';
        document.getElementById('lbl-curr-month').textContent = this._monthLabel(this._currMonth) + ' 지출';
        document.getElementById('legend-prev').textContent = this._monthLabel(this._prevMonth);
        document.getElementById('legend-curr').textContent = this._monthLabel(this._currMonth);
        document.getElementById('lbl-doughnut').textContent = `🥧 ${this._monthLabel(this._currMonth)} 카테고리 비율`;

        const [prevTx, currTx] = await Promise.all([
            Store.getTransactions({ startDate: prevRange.start, endDate: prevRange.end, type: 'expense' }),
            Store.getTransactions({ startDate: currRange.start, endDate: currRange.end, type: 'expense' })
        ]);

        const buildCatMap = (txList) => {
            const map = {};
            txList.forEach(tx => {
                if (tx.is_game_dues) return;
                const name = tx.personal_categories?.name || '기타';
                const icon = tx.personal_categories?.icon || '💰';
                if (!map[name]) map[name] = { name, icon, amount: 0 };
                map[name].amount += Utils.parseAmount(tx.amount);
            });
            return map;
        };

        const prevMap = buildCatMap(prevTx);
        const currMap = buildCatMap(currTx);
        const allCats = [...new Set([...Object.keys(prevMap), ...Object.keys(currMap)])];

        const prevTotal = Object.values(prevMap).reduce((s, c) => s + c.amount, 0);
        const currTotal = Object.values(currMap).reduce((s, c) => s + c.amount, 0);
        const deltaAbs = currTotal - prevTotal;
        const deltaPct = prevTotal > 0 ? (deltaAbs / prevTotal * 100) : (currTotal > 0 ? 100 : 0);

        document.getElementById('val-prev-expense').textContent = Utils.formatVND(prevTotal);
        document.getElementById('val-curr-expense').textContent = Utils.formatVND(currTotal);

        const pctEl = document.getElementById('val-delta-pct');
        const absEl = document.getElementById('val-delta-abs');
        const isUp = deltaAbs >= 0;
        pctEl.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(deltaPct).toFixed(1)}%`;
        pctEl.style.color = isUp ? '#fb7185' : '#34d399';
        absEl.textContent = `${isUp ? '+' : ''}${Utils.formatVND(deltaAbs)}`;
        absEl.style.color = isUp ? '#fb7185' : '#34d399';

        const maxAmt = Math.max(...allCats.map(c => Math.max(prevMap[c]?.amount || 0, currMap[c]?.amount || 0)), 1);
        allCats.sort((a, b) => (currMap[b]?.amount || 0) - (currMap[a]?.amount || 0));

        const catList = document.getElementById('cat-compare-list');
        if (!allCats.length) {
            catList.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">📭 비교할 데이터가 없습니다</div>`;
        } else {
            catList.innerHTML = allCats.map(catName => {
                const prev = prevMap[catName]?.amount || 0;
                const curr = currMap[catName]?.amount || 0;
                const icon = currMap[catName]?.icon || prevMap[catName]?.icon || '💰';
                const diff = curr - prev;
                const isIncrease = diff > 0;
                const isDec = diff < 0;
                const prevPct = (prev / maxAmt * 100).toFixed(1);
                const currPct = (curr / maxAmt * 100).toFixed(1);

                const badgeBg = isIncrease ? 'rgba(251,113,133,0.18)' : (isDec ? 'rgba(52,211,153,0.18)' : 'rgba(148,163,184,0.12)');
                const badgeFg = isIncrease ? '#fb7185' : (isDec ? '#34d399' : '#94a3b8');
                const arrow = isIncrease ? '▲' : (isDec ? '▼' : '—');
                const diffText = diff !== 0 ? `${isIncrease ? '+' : ''}${Utils.formatVND(diff)}` : '변화 없음';

                return `
                <div style="display:grid;grid-template-columns:120px 1fr auto;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex;align-items:center;gap:7px;overflow:hidden;">
                        <span style="font-size:1.15rem;flex-shrink:0;">${icon}</span>
                        <span style="font-size:0.83rem;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(catName)}</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:0.67rem;color:#818cf8;font-weight:700;width:22px;flex-shrink:0;">전</span>
                            <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:4px;height:6px;overflow:hidden;">
                                <div style="height:100%;width:${prevPct}%;background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:4px;"></div>
                            </div>
                            <span style="font-size:0.74rem;color:#818cf8;font-weight:600;white-space:nowrap;min-width:90px;text-align:right;">${Utils.formatVND(prev)}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:0.67rem;color:#fb7185;font-weight:700;width:22px;flex-shrink:0;">현</span>
                            <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:4px;height:6px;overflow:hidden;">
                                <div style="height:100%;width:${currPct}%;background:linear-gradient(90deg,#f43f5e,#fb7185);border-radius:4px;"></div>
                            </div>
                            <span style="font-size:0.74rem;color:#fb7185;font-weight:600;white-space:nowrap;min-width:90px;text-align:right;">${Utils.formatVND(curr)}</span>
                        </div>
                    </div>
                    <div style="background:${badgeBg};color:${badgeFg};border:1px solid ${badgeFg}33;border-radius:20px;padding:4px 10px;font-size:0.74rem;font-weight:700;white-space:nowrap;text-align:center;min-width:100px;">
                        ${arrow} ${diffText}
                    </div>
                </div>`;
            }).join('');
        }

        this._drawCatCompareChart(allCats, prevMap, currMap);
    },

    _drawCatCompareChart(allCats, prevMap, currMap) {
        const canvas = document.getElementById('cat-compare-chart');
        if (!canvas) return;
        const existIdx = this._charts.findIndex(c => c.canvas?.id === 'cat-compare-chart');
        if (existIdx !== -1) { try { this._charts[existIdx].destroy(); } catch(e) {} this._charts.splice(existIdx, 1); }
        if (!allCats.length) return;

        const showCats = allCats.slice(0, 10);
        const prevData = showCats.map(c => prevMap[c]?.amount || 0);
        const currData = showCats.map(c => currMap[c]?.amount || 0);

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: showCats,
                datasets: [
                    {
                        label: this._monthLabel(this._prevMonth),
                        data: prevData,
                        backgroundColor: 'rgba(99,102,241,0.75)',
                        borderColor: '#6366f1', borderWidth: 1,
                        borderRadius: 5, barPercentage: 0.75, categoryPercentage: 0.65
                    },
                    {
                        label: this._monthLabel(this._currMonth),
                        data: currData,
                        backgroundColor: 'rgba(244,63,94,0.75)',
                        borderColor: '#f43f5e', borderWidth: 1,
                        borderRadius: 5, barPercentage: 0.75, categoryPercentage: 0.65
                    }
                ]
            },
            options: {
                ...Utils.chartDefaults(),
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12, weight: '600' }, padding: 14 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}` } }
                }
            }
        });
        this._charts.push(chart);
    },

    async drawCategoryDoughnut() {
        const canvas = document.getElementById('cat-doughnut-chart');
        if (!canvas) return;
        const existIdx = this._charts.findIndex(c => c.canvas?.id === 'cat-doughnut-chart');
        if (existIdx !== -1) { try { this._charts[existIdx].destroy(); } catch(e) {} this._charts.splice(existIdx, 1); }

        const currRange = this._monthRange(this._currMonth);
        const txList = await Store.getTransactions({ startDate: currRange.start, endDate: currRange.end, type: 'expense' });
        const catMap = {};
        txList.forEach(tx => {
            if (tx.is_game_dues) return;
            const name = tx.personal_categories?.name || '기타';
            catMap[name] = (catMap[name] || 0) + Utils.parseAmount(tx.amount);
        });
        const labels = Object.keys(catMap);
        const data = Object.values(catMap);
        if (!labels.length) {
            canvas.parentElement.innerHTML = '<div class="empty-state"><p class="text-muted">이번 달 지출 데이터 없음</p></div>';
            return;
        }
        const chart = new Chart(canvas, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: Utils.chartColors.slice(0, labels.length), borderWidth: 0, hoverOffset: 10 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '62%',
                plugins: {
                    legend: { position: 'right', labels: { color: '#9ca3b4', font: { family: 'Inter', size: 12 }, padding: 12, boxWidth: 12 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.label}: ${Utils.formatVND(ctx.raw)}` } }
                }
            }
        });
        this._charts.push(chart);
    },

    async drawMonthlyTrend() {
        const canvas = document.getElementById('monthly-trend-chart');
        if (!canvas) return;
        const existIdx = this._charts.findIndex(c => c.canvas?.id === 'monthly-trend-chart');
        if (existIdx !== -1) { try { this._charts[existIdx].destroy(); } catch(e) {} this._charts.splice(existIdx, 1); }

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
        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '수입', data: incomeData, backgroundColor: 'rgba(52,211,153,0.8)', borderColor: '#10b981', borderWidth: 1, borderRadius: 6, barPercentage: 0.7, categoryPercentage: 0.6 },
                    { label: '지출', data: expenseData, backgroundColor: 'rgba(251,113,133,0.8)', borderColor: '#f43f5e', borderWidth: 1, borderRadius: 6, barPercentage: 0.7, categoryPercentage: 0.6 }
                ]
            },
            options: {
                ...Utils.chartDefaults(),
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    ...Utils.chartDefaults().plugins,
                    legend: { position: 'top', labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12, weight: '600' }, padding: 14 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}` } }
                }
            }
        });
        this._charts.push(chart);
    }
};

Router.register('analytics', AnalyticsPage);
