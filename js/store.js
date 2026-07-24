/* ============================================
   STORE.JS — Supabase 클라우드 (1순위) + LocalStorage 키 자동 마이그레이션 DAL
   ============================================ */
if (typeof supabase === 'undefined' || typeof supabase.from !== 'function') {
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY || SUPABASE_ANON_KEY);
}

const DEFAULT_CATEGORIES = [
    { id: 1, name: '식비', type: 'expense', icon: '🍚', sort_order: 1, is_active: true },
    { id: 2, name: '교통비', type: 'expense', icon: '🚗', sort_order: 2, is_active: true },
    { id: 3, name: '쇼핑', type: 'expense', icon: '🛍️', sort_order: 3, is_active: true },
    { id: 4, name: '주거/통신', type: 'expense', icon: '🏠', sort_order: 4, is_active: true },
    { id: 5, name: '취미/유흥', type: 'expense', icon: '🎮', sort_order: 5, is_active: true },
    { id: 6, name: '기타 지출', type: 'expense', icon: '💸', sort_order: 6, is_active: true },
    { id: 7, name: '급여/월급', type: 'income', icon: '💵', sort_order: 1, is_active: true },
    { id: 8, name: '부수입', type: 'income', icon: '💰', sort_order: 2, is_active: true },
    { id: 9, name: '기타 수입', type: 'income', icon: '🎁', sort_order: 3, is_active: true }
];

const Store = {

    // ─── LocalStorage Helpers (모든 구버전 키 호환 마이그레이션) ───
    _getLocal(key, defaultVal = []) {
        try {
            // 현재 키
            let raw = localStorage.getItem('mymoney_' + key);
            // 구버전 키 자동 탐색
            if (!raw) raw = localStorage.getItem('mony_usage_personal_' + key);
            if (!raw) raw = localStorage.getItem('mony_usage_' + key);

            return raw ? JSON.parse(raw) : defaultVal;
        } catch(e) { return defaultVal; }
    },
    _setLocal(key, val) {
        try {
            localStorage.setItem('mymoney_' + key, JSON.stringify(val));
            localStorage.setItem('mony_usage_personal_' + key, JSON.stringify(val));
        } catch(e) {}
    },

    // ─── 개인 가계부: 카테고리 ───

    async getCategories(type = null) {
        try {
            let q = supabase.from('personal_categories').select('*').eq('is_active', true).order('sort_order');
            if (type) q = q.eq('type', type);
            const { data, error } = await q;
            if (!error && data && data.length > 0) {
                this._setLocal('categories', data);
                return data;
            }
        } catch(e) {}

        let list = this._getLocal('categories', DEFAULT_CATEGORIES).filter(c => c.is_active);
        if (type) list = list.filter(c => c.type === type);
        return list.length > 0 ? list : DEFAULT_CATEGORIES;
    },

    async addCategory(cat) {
        let inserted = null;
        try {
            const { data, error } = await supabase.from('personal_categories').insert(cat).select().single();
            if (!error && data) inserted = data;
        } catch(e) {}

        const newCat = inserted || { ...cat, id: Date.now(), is_active: true };
        const list = this._getLocal('categories', DEFAULT_CATEGORIES);
        list.push(newCat);
        this._setLocal('categories', list);
        return newCat;
    },

    async updateCategory(id, updates) {
        try {
            updates.updated_at = new Date().toISOString();
            await supabase.from('personal_categories').update(updates).eq('id', id);
        } catch(e) {}

        const list = this._getLocal('categories', DEFAULT_CATEGORIES);
        const idx = list.findIndex(c => c.id == id);
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates };
            this._setLocal('categories', list);
            return list[idx];
        }
        return null;
    },

    async deleteCategory(id) {
        try {
            await supabase.from('personal_categories').update({ is_active: false }).eq('id', id);
        } catch(e) {}

        const list = this._getLocal('categories', DEFAULT_CATEGORIES);
        const idx = list.findIndex(c => c.id == id);
        if (idx !== -1) {
            list[idx].is_active = false;
            this._setLocal('categories', list);
        }
        return true;
    },

    // ─── 개인 가계부: 거래 (클라우드 + 로컬 데이터 자동 복구) ───

    async getTransactions(filters = {}) {
        const cats = await this.getCategories();
        const catMap = {};
        cats.forEach(c => catMap[c.id] = c);

        let dbTx = [];
        try {
            let q = supabase.from('personal_transactions').select('*, personal_categories(name, icon)').order('tx_date', { ascending: false }).order('created_at', { ascending: false });
            if (filters.startDate) q = q.gte('tx_date', filters.startDate);
            if (filters.endDate) q = q.lte('tx_date', filters.endDate);
            if (filters.type) q = q.eq('type', filters.type);
            if (filters.category_id) q = q.eq('category_id', filters.category_id);
            if (filters.payment_method) q = q.eq('payment_method', filters.payment_method);
            if (filters.limit) q = q.limit(filters.limit);
            const { data, error } = await q;
            if (!error && data) dbTx = data;
        } catch(e) {}

        // 로컬 데이터 (구버전 키 데이터 자동 통합)
        let localTx = this._getLocal('transactions', []);
        let oldPersonalTx = this._getLocal('personal_transactions', []);
        
        let combinedLocal = [...localTx, ...oldPersonalTx];

        if (filters.startDate) combinedLocal = combinedLocal.filter(t => t.tx_date >= filters.startDate);
        if (filters.endDate) combinedLocal = combinedLocal.filter(t => t.tx_date <= filters.endDate);
        if (filters.type) combinedLocal = combinedLocal.filter(t => t.type === filters.type);
        if (filters.category_id) combinedLocal = combinedLocal.filter(t => t.category_id == filters.category_id);
        if (filters.payment_method) combinedLocal = combinedLocal.filter(t => t.payment_method === filters.payment_method);

        // 중복 방지 병합 (id 기준)
        const txMap = {};
        combinedLocal.forEach(t => {
            if (t.id) {
                txMap[t.id] = {
                    ...t,
                    personal_categories: t.personal_categories || catMap[t.category_id] || { name: '기타', icon: '💰' }
                };
            }
        });
        dbTx.forEach(t => {
            if (t.id) {
                txMap[t.id] = {
                    ...t,
                    personal_categories: t.personal_categories || catMap[t.category_id] || { name: '기타', icon: '💰' }
                };
            }
        });

        let result = Object.values(txMap);
        result.sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date) || new Date(b.created_at || 0) - new Date(a.created_at || 0));

        if (filters.limit) result = result.slice(0, filters.limit);
        return result;
    },

    async addTransaction(tx) {
        let inserted = null;
        try {
            const { data, error } = await supabase.from('personal_transactions').insert(tx).select('*, personal_categories(name, icon)').single();
            if (!error && data) inserted = data;
        } catch(e) {}

        const cats = await this.getCategories();
        const cat = cats.find(c => c.id == tx.category_id) || { name: '기타', icon: '💰' };

        const newTx = inserted || {
            ...tx,
            id: 'tx_' + Date.now(),
            created_at: new Date().toISOString(),
            personal_categories: cat
        };

        const list = this._getLocal('transactions', []);
        list.unshift(newTx);
        this._setLocal('transactions', list);

        return newTx;
    },

    async updateTransaction(id, updates) {
        try {
            updates.updated_at = new Date().toISOString();
            await supabase.from('personal_transactions').update(updates).eq('id', id);
        } catch(e) {}

        const list = this._getLocal('transactions', []);
        const idx = list.findIndex(t => t.id == id);
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates };
            this._setLocal('transactions', list);
            return list[idx];
        }
        return null;
    },

    async deleteTransaction(id) {
        try {
            await supabase.from('personal_transactions').delete().eq('id', id);
        } catch(e) {}

        let list = this._getLocal('transactions', []);
        list = list.filter(t => t.id != id);
        this._setLocal('transactions', list);
        return true;
    },

    async getTransactionSummary(startDate, endDate) {
        const txList = await this.getTransactions({ startDate, endDate });
        let income = 0, expense = 0;
        txList.forEach(t => {
            const amt = Number(t.amount) || 0;
            if (t.type === 'income') income += amt;
            else expense += amt;
        });
        return { income, expense, balance: income - expense };
    },

    async getTotalBalance() {
        const txList = await this.getTransactions({});
        let balance = 0;
        txList.forEach(t => {
            const amt = Number(t.amount) || 0;
            balance += t.type === 'income' ? amt : -amt;
        });
        return balance;
    },

    // ─── 개인 환전 ───

    async getExchanges(filters = {}) {
        try {
            let q = supabase.from('exchange_transactions').select('*').order('tx_date', { ascending: false });
            if (filters.startDate) q = q.gte('tx_date', filters.startDate);
            if (filters.endDate) q = q.lte('tx_date', filters.endDate);
            if (filters.person_name) q = q.eq('person_name', filters.person_name);
            if (filters.limit) q = q.limit(filters.limit);
            const { data, error } = await q;
            if (!error && data) {
                this._setLocal('exchanges', data);
                return data;
            }
        } catch(e) {}

        let localEx = this._getLocal('exchanges', []);
        if (filters.startDate) localEx = localEx.filter(e => e.tx_date >= filters.startDate);
        if (filters.endDate) localEx = localEx.filter(e => e.tx_date <= filters.endDate);
        if (filters.person_name) localEx = localEx.filter(e => e.person_name === filters.person_name);

        localEx.sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date));
        if (filters.limit) localEx = localEx.slice(0, filters.limit);
        return localEx;
    },

    async addExchange(ex) {
        let inserted = null;
        try {
            const { data, error } = await supabase.from('exchange_transactions').insert(ex).select().single();
            if (!error && data) inserted = data;
        } catch(e) {}

        const newEx = inserted || { ...ex, id: 'ex_' + Date.now(), created_at: new Date().toISOString() };
        const list = this._getLocal('exchanges', []);
        list.unshift(newEx);
        this._setLocal('exchanges', list);
        return newEx;
    },

    async deleteExchange(id) {
        try {
            await supabase.from('exchange_transactions').delete().eq('id', id);
        } catch(e) {}

        let list = this._getLocal('exchanges', []);
        list = list.filter(e => e.id != id);
        this._setLocal('exchanges', list);
        return true;
    },

    async getExchangeTotal() {
        const exList = await this.getExchanges({});
        let vnd = 0, krw = 0;
        exList.forEach(e => {
            if (e.tx_type === 'VND_TO_KRW') { vnd -= Number(e.amount_vnd); krw += Number(e.amount_krw); }
            else { vnd += Number(e.amount_vnd); krw -= Number(e.amount_krw); }
        });
        return { vnd, krw };
    },

    // ─── 설정 ───

    async getSetting(key) {
        try {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).single();
            if (!error && data) return data.value;
        } catch(e) {}
        return this._getLocal('setting_' + key, null);
    },

    async setSetting(key, value) {
        try {
            await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
        } catch(e) {}
        this._setLocal('setting_' + key, value);
        return true;
    },

    async getAllSettings() {
        try {
            const { data, error } = await supabase.from('app_settings').select('*');
            if (!error && data && data.length > 0) {
                const map = {};
                data.forEach(s => { map[s.key] = s.value; });
                return map;
            }
        } catch(e) {}
        return {};
    }
};
