/* ============================================
   ANALYTICS.JS — 누적 분석 + 월별 비교 (탭 구조)
   ============================================ */

const AnalyticsPage = {
    _prevMonth: null,
    _currMonth: null,
    _charts: [],
    _activeTab: 'cumulative',   // 'cumulative' | 'compare'
    _allMonthData: [],          // [{ ym, label, income, expense, balance, catMap }]
    _allCategories: [],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RENDER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async render() {
        const now = new Date();
        this._currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        this._prevMonth = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;

        // 비교탭 셀렉트용 월 옵션 (최근 12개월)
        const monthOptions = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
            monthOptions.push({ val, label });
        }
        const optHtml = monthOptions.map(m => `<option value="${m.val}">${m.label}</option>`).join('');

        return `
        <div style="max-width:1140px;margin:0 auto;" id="analytics-root">

            <!-- ─── 탭 네비게이션 ─── -->
            <div style="display:flex;gap:0;border-bottom:2px solid rgba(255,255,255,0.08);margin-bottom:22px;">
                <button id="tab-cumulative" onclick="AnalyticsPage._switchTab('cumulative')"
                    style="padding:10px 20px;font-size:0.9rem;font-weight:700;background:none;border:none;cursor:pointer;
                           color:#818cf8;border-bottom:2px solid #818cf8;margin-bottom:-2px;transition:all 0.2s;">
                    📈 누적 분석
                </button>
                <button id="tab-compare" onclick="AnalyticsPage._switchTab('compare')"
                    style="padding:10px 20px;font-size:0.9rem;font-weight:700;background:none;border:none;cursor:pointer;
                           color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.2s;">
                    🔄 월 비교
                </button>
            </div>

            <!-- ─── 탭: 누적 분석 ─── -->
            <div id="panel-cumulative">

                <!-- KPI 4열 카드 -->
                <div id="kpi-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
                    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.16),rgba(5,150,105,0.06));border:1px solid rgba(52,211,153,0.3);border-radius:13px;padding:14px 18px;">
                        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:5px;">💵 총 수입</div>
                        <div style="font-size:1.25rem;font-weight:800;color:#34d399;" id="kpi-income">—</div>
                    </div>
                    <div style="background:linear-gradient(135deg,rgba(244,63,94,0.15),rgba(225,29,72,0.06));border:1px solid rgba(251,113,133,0.3);border-radius:13px;padding:14px 18px;">
                        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:5px;">💸 총 지출</div>
                        <div style="font-size:1.25rem;font-weight:800;color:#fb7185;" id="kpi-expense">—</div>
                    </div>
                    <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(79,70,229,0.06));border:1px solid rgba(129,140,248,0.3);border-radius:13px;padding:14px 18px;">
                        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:5px;">🏦 순 잔액</div>
                        <div style="font-size:1.25rem;font-weight:800;" id="kpi-balance">—</div>
                    </div>
                    <div style="background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.05));border:1px solid rgba(251,191,36,0.25);border-radius:13px;padding:14px 18px;">
                        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:5px;">📅 기록 기간</div>
                        <div style="font-size:1rem;font-weight:800;color:#fbbf24;" id="kpi-period">—</div>
                        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;" id="kpi-period-sub"></div>
                    </div>
                </div>

                <!-- 월별 히스토리 카드 (가로 스크롤) + 카테고리 추이 차트 -->
                <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:16px;margin-bottom:20px;align-items:start;">

                    <!-- 월별 히스토리 카드 -->
                    <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:16px;">
                        <div style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">📅 월별 히스토리</div>
                        <div id="monthly-history-cards" style="display:flex;flex-direction:column;gap:10px;max-height:360px;overflow-y:auto;padding-right:4px;">
                            <div style="text-align:center;padding:30px;color:var(--text-muted);">⏳ 로딩 중...</div>
                        </div>
                    </div>

                    <!-- 카테고리별 월별 추이 라인 차트 -->
                    <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:16px;">
                        <div style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">📊 카테고리별 월별 추이</div>
                        <div style="height:320px;"><canvas id="cat-trend-chart"></canvas></div>
                    </div>
                </div>

                <!-- 월별 카테고리 스택 차트 -->
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:16px;margin-bottom:20px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <span style="font-size:0.9rem;font-weight:700;">📦 월별 지출 카테고리 스택</span>
                        <div style="display:flex;gap:8px;">
                            <button onclick="AnalyticsPage._toggleStackMode('stacked')" id="btn-stack" class="btn btn-ghost btn-sm"
                                style="padding:2px 9px;font-size:0.76rem;color:#818cf8;border-color:rgba(129,140,248,0.4);">누적</button>
                            <button onclick="AnalyticsPage._toggleStackMode('normal')" id="btn-normal" class="btn btn-ghost btn-sm"
                                style="padding:2px 9px;font-size:0.76rem;">일반</button>
                        </div>
                    </div>
                    <div style="height:260px;"><canvas id="stack-bar-chart"></canvas></div>
                </div>

                <!-- 수입/지출 추이 -->
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:16px;">
                    <div style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">💰 월별 수입 / 지출 추이</div>
                    <div style="height:240px;"><canvas id="monthly-trend-chart"></canvas></div>
                </div>

            </div>

            <!-- ─── 탭: 월 비교 ─── -->
            <div id="panel-compare" style="display:none;">

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

                <!-- 3열 요약 카드 -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:18px;">
                    <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(79,70,229,0.06));border:1px solid rgba(129,140,248,0.3);border-radius:12px;padding:14px 18px;">
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;" id="lbl-prev-month">이전 달 지출</div>
                        <div style="font-size:1.3rem;font-weight:800;color:#818cf8;" id="val-prev-expense">—</div>
                    </div>
                    <div style="background:linear-gradient(135deg,rgba(244,63,94,0.15),rgba(225,29,72,0.06));border:1px solid rgba(251,113,133,0.3);border-radius:12px;padding:14px 18px;">
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;" id="lbl-curr-month">이번 달 지출</div>
                        <div style="font-size:1.3rem;font-weight:800;color:#fb7185;" id="val-curr-expense">—</div>
                    </div>
                    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.06));border:1px solid rgba(52,211,153,0.3);border-radius:12px;padding:14px 18px;">
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">전월 대비 증감</div>
                        <div style="font-size:1.3rem;font-weight:800;" id="val-delta-pct">—</div>
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

                <!-- 카테고리 비교 차트 -->
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:18px;margin-bottom:18px;">
                    <div style="font-size:0.95rem;font-weight:700;margin-bottom:14px;">📈 카테고리별 지출 비교 차트</div>
                    <div style="height:280px;"><canvas id="cat-compare-chart"></canvas></div>
                </div>

                <!-- 도넛 차트 -->
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:18px;">
                    <div style="font-size:0.9rem;font-weight:700;margin-bottom:14px;" id="lbl-doughnut">🥧 이번 달 카테고리 비율</div>
                    <div style="height:280px;"><canvas id="cat-doughnut-chart"></canvas></div>
                </div>

            </div>
        </div>`;
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // AFTER RENDER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async afterRender() {
        // 비교 탭 셀렉터 초기값
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
            this._destroyChartById('cat-compare-chart');
            this._destroyChartById('cat-doughnut-chart');
            await this._renderCompare();
            await this.drawCategoryDoughnut();
        });

        // 누적 분석 탭 먼저 렌더
        await this._renderCumulative();
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAB 전환
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    _switchTab(tab) {
        this._activeTab = tab;
        const isCumul = tab === 'cumulative';

        document.getElementById('panel-cumulative').style.display = isCumul ? 'block' : 'none';
        document.getElementById('panel-compare').style.display = isCumul ? 'none' : 'block';

        const tCumul = document.getElementById('tab-cumulative');
        const tComp = document.getElementById('tab-compare');
        if (tCumul) { tCumul.style.color = isCumul ? '#818cf8' : 'var(--text-muted)'; tCumul.style.borderBottomColor = isCumul ? '#818cf8' : 'transparent'; }
        if (tComp) { tComp.style.color = isCumul ? 'var(--text-muted)' : '#fb7185'; tComp.style.borderBottomColor = isCumul ? 'transparent' : '#fb7185'; }

        // 비교 탭 첫 진입 시 렌더
        if (!isCumul && !document.getElementById('cat-compare-chart')?.dataset.rendered) {
            this._renderCompare().then(() => this.drawCategoryDoughnut());
            if (document.getElementById('cat-compare-chart')) document.getElementById('cat-compare-chart').dataset.rendered = '1';
        }
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 공통 유틸
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

    _monthShort(ym) {
        const [, m] = ym.split('-').map(Number);
        return `${m}월`;
    },

    _destroyChartById(canvasId) {
        const idx = this._charts.findIndex(c => c.canvas?.id === canvasId);
        if (idx !== -1) { try { this._charts[idx].destroy(); } catch(e) {} this._charts.splice(idx, 1); }
    },

    _destroyAll() {
        this._charts.forEach(c => { try { c.destroy(); } catch(e) {} });
        this._charts = [];
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 누적 분석 렌더링
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async _renderCumulative() {
        // 7월부터 현재까지 모든 달 목록 생성
        const now = new Date();
        const startYear = 2026, startMonth = 7; // 가계부 시작: 2026년 7월
        const months = [];
        let y = startYear, m = startMonth;
        while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
            months.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
        }

        // 각 달 데이터 병렬 로드
        const monthDataList = await Promise.all(months.map(async ym => {
            const { start, end } = this._monthRange(ym);
            const [txIncome, txExpense] = await Promise.all([
                Store.getTransactions({ startDate: start, endDate: end, type: 'income' }),
                Store.getTransactions({ startDate: start, endDate: end, type: 'expense' })
            ]);
            const income = txIncome.filter(t => !t.is_game_dues).reduce((s, t) => s + Utils.parseAmount(t.amount), 0);
            const expense = txExpense.filter(t => !t.is_game_dues).reduce((s, t) => s + Utils.parseAmount(t.amount), 0);

            const catMap = {};
            txExpense.forEach(tx => {
                if (tx.is_game_dues) return;
                const name = tx.personal_categories?.name || '기타';
                const icon = tx.personal_categories?.icon || '💰';
                if (!catMap[name]) catMap[name] = { name, icon, amount: 0 };
                catMap[name].amount += Utils.parseAmount(tx.amount);
            });

            return { ym, label: this._monthLabel(ym), short: this._monthShort(ym), income, expense, balance: income - expense, catMap };
        }));

        // 데이터가 있는 달만 필터
        this._allMonthData = monthDataList.filter(d => d.income > 0 || d.expense > 0);

        if (this._allMonthData.length === 0) {
            document.getElementById('monthly-history-cards').innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">📭 데이터가 없습니다</div>`;
            return;
        }

        // 전체 카테고리 목록
        const catSet = new Set();
        this._allMonthData.forEach(d => Object.keys(d.catMap).forEach(c => catSet.add(c)));
        this._allCategories = [...catSet];

        // KPI 카드 업데이트
        const totalIncome = this._allMonthData.reduce((s, d) => s + d.income, 0);
        const totalExpense = this._allMonthData.reduce((s, d) => s + d.expense, 0);
        const netBalance = totalIncome - totalExpense;
        const firstLabel = this._allMonthData[0].short;
        const lastLabel = this._allMonthData[this._allMonthData.length - 1].short;

        document.getElementById('kpi-income').textContent = Utils.formatVND(totalIncome);
        document.getElementById('kpi-expense').textContent = Utils.formatVND(totalExpense);
        const balEl = document.getElementById('kpi-balance');
        balEl.textContent = Utils.formatVND(netBalance);
        balEl.style.color = netBalance >= 0 ? '#34d399' : '#fb7185';
        document.getElementById('kpi-period').textContent = `${this._allMonthData.length}개월`;
        document.getElementById('kpi-period-sub').textContent = `${firstLabel} ~ ${lastLabel}`;

        // 월별 히스토리 카드
        const currYm = this._currMonth;
        const histHtml = this._allMonthData.map(d => {
            const isCurr = d.ym === currYm;
            const topCats = Object.values(d.catMap).sort((a, b) => b.amount - a.amount).slice(0, 3);
            const maxCatAmt = topCats[0]?.amount || 1;
            const borderStyle = isCurr ? 'border:1.5px solid #818cf8;box-shadow:0 0 14px rgba(129,140,248,0.25);' : 'border:1px solid rgba(255,255,255,0.08);';

            return `
            <div style="background:rgba(255,255,255,0.03);${borderStyle}border-radius:10px;padding:12px 14px;flex-shrink:0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:0.9rem;font-weight:800;color:${isCurr ? '#818cf8' : 'var(--text-primary)'};">${d.label}</span>
                    ${isCurr ? '<span style="font-size:0.65rem;background:rgba(129,140,248,0.2);color:#818cf8;border-radius:8px;padding:1px 7px;font-weight:700;">이번 달</span>' : ''}
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                    <div>
                        <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:2px;">수입</div>
                        <div style="font-size:0.82rem;font-weight:700;color:#34d399;">${Utils.formatVND(d.income)}</div>
                    </div>
                    <div>
                        <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:2px;">지출</div>
                        <div style="font-size:0.82rem;font-weight:700;color:#fb7185;">${Utils.formatVND(d.expense)}</div>
                    </div>
                </div>
                ${topCats.length > 0 ? `
                <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">
                    ${topCats.map(c => `
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                        <span style="font-size:0.75rem;width:16px;">${c.icon}</span>
                        <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:3px;height:4px;overflow:hidden;">
                            <div style="height:100%;width:${(c.amount/maxCatAmt*100).toFixed(0)}%;background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:3px;"></div>
                        </div>
                        <span style="font-size:0.68rem;color:var(--text-muted);min-width:70px;text-align:right;">${Utils.formatVND(c.amount)}</span>
                    </div>`).join('')}
                </div>` : ''}
                <div style="margin-top:8px;font-size:0.72rem;font-weight:700;color:${d.balance >= 0 ? '#34d399' : '#fb7185'};">
                    잔액 ${d.balance >= 0 ? '+' : ''}${Utils.formatVND(d.balance)}
                </div>
            </div>`;
        }).join('');
        document.getElementById('monthly-history-cards').innerHTML = histHtml;

        // 차트들 그리기
        await Promise.all([
            this._drawCategoryTrendChart(),
            this._drawStackedBarChart('stacked'),
            this._drawMonthlyTrendChart()
        ]);
    },

    // ─── 카테고리별 월별 추이 라인 차트 ───
    async _drawCategoryTrendChart() {
        this._destroyChartById('cat-trend-chart');
        const canvas = document.getElementById('cat-trend-chart');
        if (!canvas || !this._allMonthData.length) return;

        const labels = this._allMonthData.map(d => d.short);
        const palette = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#a855f7', '#3b82f6'];

        // 상위 카테고리 (전체 합계 기준 최대 6개)
        const catTotals = {};
        this._allMonthData.forEach(d => {
            Object.entries(d.catMap).forEach(([name, v]) => {
                catTotals[name] = (catTotals[name] || 0) + v.amount;
            });
        });
        const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);

        const datasets = topCats.map((catName, i) => {
            const color = palette[i % palette.length];
            return {
                label: catName,
                data: this._allMonthData.map(d => d.catMap[catName]?.amount || 0),
                borderColor: color,
                backgroundColor: color + '18',
                borderWidth: 2.5,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: color,
                fill: false,
                tension: 0.4
            };
        });

        const chart = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets },
            options: {
                ...Utils.chartDefaults(),
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9ca3b4', font: { family: 'Inter', size: 11 }, padding: 10, boxWidth: 10 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}` } }
                },
                scales: {
                    x: { ticks: { color: '#6b7280', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(42,48,69,0.5)' } },
                    y: { ticks: { color: '#6b7280', font: { family: 'Inter', size: 11 }, callback: v => Utils.formatVND(v) }, grid: { color: 'rgba(42,48,69,0.5)' } }
                }
            }
        });
        this._charts.push(chart);
    },

    // ─── 월별 지출 스택 차트 ───
    async _drawStackedBarChart(mode = 'stacked') {
        this._destroyChartById('stack-bar-chart');
        const canvas = document.getElementById('stack-bar-chart');
        if (!canvas || !this._allMonthData.length) return;

        const palette = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];
        const labels = this._allMonthData.map(d => d.short);

        const catTotals = {};
        this._allMonthData.forEach(d => Object.entries(d.catMap).forEach(([n, v]) => { catTotals[n] = (catTotals[n] || 0) + v.amount; }));
        const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);

        const datasets = topCats.map((catName, i) => ({
            label: catName,
            data: this._allMonthData.map(d => d.catMap[catName]?.amount || 0),
            backgroundColor: palette[i % palette.length] + 'cc',
            borderColor: palette[i % palette.length],
            borderWidth: 1,
            borderRadius: mode === 'stacked' ? 0 : 4,
            stack: mode === 'stacked' ? 'stack' : undefined
        }));

        const chart = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                ...Utils.chartDefaults(),
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9ca3b4', font: { family: 'Inter', size: 11 }, padding: 10, boxWidth: 10 } },
                    tooltip: {
                        mode: 'index',
                        callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}` }
                    }
                },
                scales: {
                    x: { stacked: mode === 'stacked', ticks: { color: '#6b7280' }, grid: { color: 'rgba(42,48,69,0.5)' } },
                    y: { stacked: mode === 'stacked', ticks: { color: '#6b7280', callback: v => Utils.formatVND(v) }, grid: { color: 'rgba(42,48,69,0.5)' } }
                }
            }
        });
        this._charts.push(chart);
        this._stackMode = mode;
    },

    _toggleStackMode(mode) {
        document.getElementById('btn-stack').style.color = mode === 'stacked' ? '#818cf8' : 'var(--text-muted)';
        document.getElementById('btn-stack').style.borderColor = mode === 'stacked' ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.1)';
        document.getElementById('btn-normal').style.color = mode === 'normal' ? '#818cf8' : 'var(--text-muted)';
        document.getElementById('btn-normal').style.borderColor = mode === 'normal' ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.1)';
        this._drawStackedBarChart(mode);
    },

    // ─── 월별 수입/지출 추이 ───
    async _drawMonthlyTrendChart() {
        this._destroyChartById('monthly-trend-chart');
        const canvas = document.getElementById('monthly-trend-chart');
        if (!canvas || !this._allMonthData.length) return;

        const labels = this._allMonthData.map(d => d.short);

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '수입', data: this._allMonthData.map(d => d.income), backgroundColor: 'rgba(52,211,153,0.8)', borderColor: '#10b981', borderWidth: 1, borderRadius: 6, barPercentage: 0.7, categoryPercentage: 0.65 },
                    { label: '지출', data: this._allMonthData.map(d => d.expense), backgroundColor: 'rgba(251,113,133,0.8)', borderColor: '#f43f5e', borderWidth: 1, borderRadius: 6, barPercentage: 0.7, categoryPercentage: 0.65 }
                ]
            },
            options: {
                ...Utils.chartDefaults(),
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12, weight: '600' }, padding: 14 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}` } }
                },
                scales: {
                    x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(42,48,69,0.5)' } },
                    y: { ticks: { color: '#6b7280', callback: v => Utils.formatVND(v) }, grid: { color: 'rgba(42,48,69,0.5)' } }
                }
            }
        });
        this._charts.push(chart);
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 월 비교 탭 렌더링 (기존 기능 유지)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
                        <span style="font-size:1.1rem;flex-shrink:0;">${icon}</span>
                        <span style="font-size:0.82rem;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(catName)}</span>
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
        this._destroyChartById('cat-compare-chart');
        const canvas = document.getElementById('cat-compare-chart');
        if (!canvas || !allCats.length) return;

        const showCats = allCats.slice(0, 10);
        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: showCats,
                datasets: [
                    { label: this._monthLabel(this._prevMonth), data: showCats.map(c => prevMap[c]?.amount || 0), backgroundColor: 'rgba(99,102,241,0.75)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 5, barPercentage: 0.75, categoryPercentage: 0.65 },
                    { label: this._monthLabel(this._currMonth), data: showCats.map(c => currMap[c]?.amount || 0), backgroundColor: 'rgba(244,63,94,0.75)', borderColor: '#f43f5e', borderWidth: 1, borderRadius: 5, barPercentage: 0.75, categoryPercentage: 0.65 }
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
        this._destroyChartById('cat-doughnut-chart');
        const canvas = document.getElementById('cat-doughnut-chart');
        if (!canvas) return;

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
        if (!labels.length) { canvas.parentElement.innerHTML = '<div class="empty-state"><p class="text-muted">지출 데이터 없음</p></div>'; return; }

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
    }
};

Router.register('analytics', AnalyticsPage);
