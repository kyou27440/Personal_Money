/* ============================================
   UTILS.JS — 유틸리티 함수 모음
   ============================================ */

const Utils = {
    /** VND 금액 포맷: 1,234,567 ₫ */
    formatVND(amount) {
        if (amount == null || isNaN(amount)) return '0 ₫';
        return Number(amount).toLocaleString('vi-VN') + ' ₫';
    },

    /** KRW 금액 포맷: ₩1,234,567 */
    formatKRW(amount) {
        if (amount == null || isNaN(amount)) return '₩0';
        return '₩' + Number(amount).toLocaleString('ko-KR');
    },

    /** 숫자 포맷 (통화 기호 없음) */
    formatNumber(n) {
        if (n == null || isNaN(n)) return '0';
        return Number(n).toLocaleString();
    },

    /** 날짜 포맷: YYYY-MM-DD */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toISOString().split('T')[0];
    },

    /** 날짜 한국식 표시: 07월 21일 (월) */
    formatDateKR(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${mm}월 ${dd}일 (${days[d.getDay()]})`;
    },

    /** 오늘 날짜 YYYY-MM-DD */
    today() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    },

    /** 이번 달 시작일 */
    monthStart() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    },

    /** 이번 달 종료일 */
    monthEnd() {
        const now = new Date();
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return last.toISOString().split('T')[0];
    },

    /** 이번 주 시작일 (월요일) */
    weekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        const mon = new Date(now);
        mon.setDate(now.getDate() - diff);
        return mon.toISOString().split('T')[0];
    },

    /** 토스트 알림 */
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
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

    /** 입력값에서 숫자만 추출 (쉼표 제거) */
    parseAmount(str) {
        if (typeof str === 'number') return str;
        return Number(String(str).replace(/[^0-9.-]/g, '')) || 0;
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

    /** Chart.js 기본 옵션 (다크 테마) */
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
};
