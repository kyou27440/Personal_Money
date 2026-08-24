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

    /** 날짜+시간 한국식 표시: 07월 24일 (금) 14:35 (시간 없거나 엑셀 가져오기 항목은 07월 24일 (금)만 표시) */
    formatDateTimeKR(dateStr, createdAtStr = null) {
        if (!dateStr) return '';
        const baseKR = Utils.formatDateKR(dateStr);
        const formattedDate = Utils.formatDate(dateStr);
        
        // createdAtStr가 존재하고 시간 정보가 있을 때
        if (createdAtStr && typeof createdAtStr === 'string' && (createdAtStr.includes('T') || createdAtStr.includes(':'))) {
            try {
                const d = new Date(createdAtStr);
                if (!isNaN(d.getTime())) {
                    // 거래 날짜(tx_date)와 생성 시각(created_at)의 날짜가 일치할 때만 실제 거래 시간으로 인정!
                    // (엑셀 등으로 나중에 일괄 가져온 과거 거래는 날짜가 다르므로 가짜 시간 표시 원천 차단)
                    const createdDateStr = Utils.formatDate(d);
                    if (createdDateStr === formattedDate) {
                        const hh = d.getHours();
                        const mm = d.getMinutes();
                        const ss = d.getSeconds();
                        if (hh !== 0 || mm !== 0 || ss !== 0) {
                            return `${baseKR} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                        }
                    }
                }
            } catch(e) {}
        }
        return baseKR;
    },

    /** 현재 시각 HH:mm (로컬 시간 기준) */
    currentTime() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
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

    /** 적요/메모에서 멤버 이름(영문/한글) 추출 */
    extractMemberName(memo) {
        if (!memo) return '';
        let s = String(memo).trim();

        // 1. "KIM NAMSU TRANSFER/KIM NAMSU" 또는 ".../NAME" 형태
        if (s.includes('/')) {
            const parts = s.split('/');
            const lastPart = parts[parts.length - 1].trim();
            if (lastPart && /^[A-Za-z\s]+$/.test(lastPart)) {
                return lastPart.toUpperCase();
            }
        }

        // 2. "TRANSFER", "IB", "MB", "NAPAS", "TO", "FROM" 등 은행 키워드 제거
        let cleaned = s.replace(/\b(TRANSFER|TRANSFERRING|IB|MB|NAPAS|CK|CHUYEN KHOAN|TIEN|QR|VIETQR|EBANK|ONLINE)\b/gi, ' ')
                       .replace(/[\/\-_:,;\[\]\(\)]/g, ' ')
                       .replace(/\s+/g, ' ')
                       .trim();

        // 3. 영문 대문자 이름 패턴 (2~4단어)
        const engMatch = cleaned.match(/^[A-Za-z\s]{2,30}$/);
        if (engMatch) {
            return engMatch[0].trim().toUpperCase();
        }

        // 4. 한글 이름 패턴 (2~4글자)
        const korMatch = cleaned.match(/[가-힣]{2,4}/);
        if (korMatch) {
            return korMatch[0].trim();
        }

        // 5. 기본: 정제된 문자열의 앞 20자
        return cleaned.slice(0, 20).toUpperCase();
    },

    /** 메모가 사람 이름으로 된 게임회비 입금인지 판별 */
    isLikelyGameDues(type, memo) {
        if (type !== 'income') return false;
        if (!memo) return false;

        const rawUpper = String(memo).toUpperCase();
        // 은행/금융 시스템 키워드는 무조건 제외
        if (/(INTEREST|PAYMENT|CASHBACK|REFUND|REWARD|FEE|COMMISSION|TAX|SALARY|BONUS|DIVIDEND|이자|급여|월급|환급|캐시백|배당|수수료|세금|적금|예금)/i.test(rawUpper)) {
            return false;
        }

        const name = Utils.extractMemberName(memo);
        // 이름이 2자 이상 영문 또는 한글이면 게임회비로 간주
        return Boolean(name && name.length >= 2 && !/^(TRANSFER|DEPOSIT|CREDIT|INCOME|DDA|VA|QR|VNPAY)$/i.test(name));
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
