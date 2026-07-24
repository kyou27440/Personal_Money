/* ============================================
   UTILS.JS — 유틸리티 함수 모음 (방어적 데이터 파싱 전면 보강)
   ============================================ */

const Utils = {
    /** VND 금액 포맷: 1,234,567 ₫ (한국식 쉼표 표기 적용) */
    formatVND(amount) {
        const num = Number(amount);
        if (amount == null || isNaN(num)) return '0 ₫';
        return num.toLocaleString('ko-KR') + ' ₫';
    },

    /** KRW 금액 포맷: ₩1,234,567 */
    formatKRW(amount) {
        const num = Number(amount);
        if (amount == null || isNaN(num)) return '₩0';
        return '₩' + num.toLocaleString('ko-KR');
    },

    /** 숫자 포맷 (통화 기호 없음) */
    formatNumber(n) {
        const num = Number(n);
        if (n == null || isNaN(num)) return '0';
        return num.toLocaleString();
    },

    /** 입력값에서 완벽하게 숫자만 추출 (베트남동 2.724.000, 20.000.000 천단위 점/쉼표 표기 완벽 방어) */
    parseAmount(str) {
        if (typeof str === 'number') return isNaN(str) ? 0 : Math.round(str);
        if (!str) return 0;
        let s = String(str).trim();
        if (!s) return 0;

        // 점(.) 처리: 여러 개의 점이 있거나(2.724.000), 2.724 / 50.000 처럼 천단위 구분기호인 경우 점 제거
        if (s.includes('.')) {
            const parts = s.split('.');
            if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
                s = s.replace(/\./g, '');
            }
        }
        // 쉼표(,) 제거
        s = s.replace(/,/g, '');

        const cleaned = s.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : Math.round(parsed);
    },

    /** 금액 입력창 실시간 천단위 쉼표 포맷터 바인딩 */
    bindAmountInputFormatter(inputEl) {
        if (!inputEl) return;
        inputEl.addEventListener('input', (e) => {
            const val = e.target.value;
            if (!val) return;
            const num = Utils.parseAmount(val);
            if (num > 0) {
                e.target.value = num.toLocaleString('ko-KR');
            } else if (val.trim() === '' || val === '0') {
                e.target.value = '';
            }
        });
    },

    /** 날짜 포맷: YYYY-MM-DD (로컬 시간 기준 정제) */
    formatDate(dateStr) {
        if (!dateStr) return Utils.today();
        const str = String(dateStr).trim();
        const clean = str.includes('T') ? str.split('T')[0] : str.split(' ')[0];
        const parts = clean.split('-');
        if (parts.length === 3) {
            const yyyy = parts[0];
            const mm = parts[1].padStart(2, '0');
            const dd = parts[2].padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        return str;
    },

    /** 날짜 한국식 표시: 07월 24일 (금) */
    formatDateKR(dateStr) {
        if (!dateStr) return '';
        const formatted = Utils.formatDate(dateStr);
        const parts = formatted.split('-').map(Number);
        if (parts.length < 3 || isNaN(parts[0])) return dateStr;
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const mm = String(parts[1]).padStart(2, '0');
        const dd = String(parts[2]).padStart(2, '0');
        return `${mm}월 ${dd}일 (${days[d.getDay()]})`;
    },

    /** 오늘 날짜 YYYY-MM-DD (로컬 시간 기준) */
    today() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    /** 이번 달 시작일 YYYY-MM-01 */
    monthStart() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}-01`;
    },

    /** 이번 달 종료일 YYYY-MM-DD */
    monthEnd() {
        const now = new Date();
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const yyyy = last.getFullYear();
        const mm = String(last.getMonth() + 1).padStart(2, '0');
        const dd = String(last.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    /** 이번 주 시작일 (월요일) */
    weekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        const mon = new Date(now);
        mon.setDate(now.getDate() - diff);
        const yyyy = mon.getFullYear();
        const mm = String(mon.getMonth() + 1).padStart(2, '0');
        const dd = String(mon.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    /** 토스트 알림 */
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /** HTML 이스케이프 */
    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /** 경과 시간 표시 */
    timeAgo(dateStr) {
        const now = new Date();
        const d = new Date(dateStr);
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return '방금 전';
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
        return Utils.formatDate(dateStr);
    },

    /** Chart.js 기본 옵션 */
    chartDefaults() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#9ca3b4', font: { family: 'Inter', size: 12 } } }
            },
            scales: {
                x: { ticks: { color: '#6b7280', font: { family: 'Inter' } }, grid: { color: 'rgba(42,48,69,0.5)' } },
                y: { ticks: { color: '#6b7280', font: { family: 'Inter' } }, grid: { color: 'rgba(42,48,69,0.5)' } }
            }
        };
    },

    /** 차트 색상 팔레트 */
    chartColors: [
        '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
        '#f43f5e', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'
    ],

    /** 실시간 KRW->VND 매매기준 환율 가져오기 */
    async fetchLiveExchangeRate() {
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/KRW');
            if (res.ok) {
                const data = await res.json();
                if (data && data.rates && data.rates.VND) {
                    return parseFloat(data.rates.VND.toFixed(2));
                }
            }
        } catch(e) {}

        try {
            const res2 = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/krw.json');
            if (res2.ok) {
                const data2 = await res2.json();
                if (data2 && data2.krw && data2.krw.vnd) {
                    return parseFloat(data2.krw.vnd.toFixed(2));
                }
            }
        } catch(e) {}

        return null;
    }
};
