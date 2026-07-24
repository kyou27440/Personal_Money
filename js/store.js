/* ============================================
   STORE.JS — 데이터 무결성 강화 Supabase + LocalStorage DAL
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

    // ─── LocalStorage Helper ───
    _getLocal(key, defaultVal = []) {
        try {
            let raw = localStorage.getItem('mymoney_' + key);
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
        let dbList = [];
        try {
            let q = supabase.from('personal_categories').select('*').eq('is_active', true).order('sort_order');
            if (type && type.trim() !== '') q = q.eq('type', type.trim());
            const { data, error } = await q;
            if (!error && data) dbList = data;
        } catch(e) {}

        const localList = this._getLocal('categories', DEFAULT_CATEGORIES).filter(c => c.is_active);
        
        const map = {};
        DEFAULT_CATEGORIES.forEach(c => map[String(c.id)] = c);
        localList.forEach(c => map[String(c.id)] = c);
        dbList.forEach(c => map[String(c.id)] = c);

        let merged = Object.values(map);
        if (type && type.trim() !== '') {
            const targetType = type.trim().toLowerCase();
            merged = merged.filter(c => String(c.type).trim().toLowerCase() === targetType);
        }
        merged.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        return merged;
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
        const idx = list.findIndex(c => String(c.id) === String(id));
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
        const idx = list.findIndex(c => String(c.id) === String(id));
        if (idx !== -1) {
            list[idx].is_active = false;
            this._setLocal('categories', list);
        }
        return true;
    },

    // ─── 개인 가계부: 거래 ───

    async getTransactions(filters = {}) {
        const cats = await this.getCategories();
        const catMap = {};
        cats.forEach(c => catMap[String(c.id)] = c);

        let dbTx = [];
        try {
            let q = supabase.from('personal_transactions').select('*, personal_categories(name, icon)').order('tx_date', { ascending: false }).order('created_at', { ascending: false });
            if (filters.startDate) q = q.gte('tx_date', Utils.formatDate(filters.startDate));
            if (filters.endDate) q = q.lte('tx_date', Utils.formatDate(filters.endDate));
            if (filters.type && filters.type.trim() !== '') q = q.eq('type', filters.type.trim().toLowerCase());
            if (filters.category_id) q = q.eq('category_id', filters.category_id);
            if (filters.payment_method && filters.payment_method.trim() !== '') q = q.eq('payment_method', filters.payment_method.trim());
            if (filters.limit) q = q.limit(filters.limit);
            const { data, error } = await q;
            if (!error && data) dbTx = data;
        } catch(e) {}

        // LocalStorage 거래 데이터
        let localTx = this._getLocal('transactions', []);
        let oldPersonalTx = this._getLocal('personal_transactions', []);
        let combinedLocal = [...localTx, ...oldPersonalTx];

        // 필터링 적용 (타입 및 정규화 명확히 처리)
        if (filters.startDate) {
            const startClean = Utils.formatDate(filters.startDate);
            combinedLocal = combinedLocal.filter(t => Utils.formatDate(t.tx_date) >= startClean);
        }
        if (filters.endDate) {
            const endClean = Utils.formatDate(filters.endDate);
            combinedLocal = combinedLocal.filter(t => Utils.formatDate(t.tx_date) <= endClean);
        }
        if (filters.type && filters.type.trim() !== '') {
            const targetType = filters.type.trim().toLowerCase();
            combinedLocal = combinedLocal.filter(t => String(t.type).trim().toLowerCase() === targetType);
        }
        if (filters.category_id) {
            combinedLocal = combinedLocal.filter(t => String(t.category_id) === String(filters.category_id));
        }
        if (filters.payment_method && filters.payment_method.trim() !== '') {
            combinedLocal = combinedLocal.filter(t => String(t.payment_method).trim() === filters.payment_method.trim());
        }

        // DB와 로컬 데이터 100% 병합 (ID 기준)
        const txMap = {};
        combinedLocal.forEach(t => {
            if (t.id) {
                const cObj = t.personal_categories || catMap[String(t.category_id)] || { name: '기타', icon: '💰' };
                txMap[String(t.id)] = {
                    ...t,
                    tx_date: Utils.formatDate(t.tx_date),
                    type: String(t.type || 'expense').trim().toLowerCase(),
                    amount: Utils.parseAmount(t.amount),
                    personal_categories: cObj
                };
            }
        });

        dbTx.forEach(t => {
            if (t.id) {
                const cObj = t.personal_categories || catMap[String(t.category_id)] || { name: '기타', icon: '💰' };
                txMap[String(t.id)] = {
                    ...t,
                    tx_date: Utils.formatDate(t.tx_date),
                    type: String(t.type || 'expense').trim().toLowerCase(),
                    amount: Utils.parseAmount(t.amount),
                    personal_categories: cObj
                };
            }
        });

        let result = Object.values(txMap);
        result.sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date) || new Date(b.created_at || 0) - new Date(a.created_at || 0));

        if (filters.limit) result = result.slice(0, filters.limit);
        return result;
    },

    async addTransaction(tx) {
        const cleanTx = {
            ...tx,
            tx_date: Utils.formatDate(tx.tx_date),
            type: String(tx.type || 'expense').trim().toLowerCase(),
            amount: Utils.parseAmount(tx.amount),
            payment_method: tx.payment_method || 'transfer'
        };

        let inserted = null;
        try {
            const { data, error } = await supabase.from('personal_transactions').insert(cleanTx).select('*, personal_categories(name, icon)').single();
            if (!error && data) inserted = data;
        } catch(e) {}

        const cats = await this.getCategories();
        const cat = cats.find(c => String(c.id) === String(cleanTx.category_id)) || { name: '기타', icon: '💰' };

        const newTx = inserted ? {
            ...inserted,
            type: String(inserted.type || 'expense').trim().toLowerCase(),
            amount: Utils.parseAmount(inserted.amount)
        } : {
            ...cleanTx,
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
        if (updates.amount !== undefined) updates.amount = Utils.parseAmount(updates.amount);
        if (updates.type !== undefined) updates.type = String(updates.type).trim().toLowerCase();
        if (updates.tx_date !== undefined) updates.tx_date = Utils.formatDate(updates.tx_date);
        updates.updated_at = new Date().toISOString();

        try {
            await supabase.from('personal_transactions').update(updates).eq('id', id);
        } catch(e) {}

        const list = this._getLocal('transactions', []);
        const idx = list.findIndex(t => String(t.id) === String(id));
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
        list = list.filter(t => String(t.id) !== String(id));
        this._setLocal('transactions', list);

        let oldList = this._getLocal('personal_transactions', []);
        oldList = oldList.filter(t => String(t.id) !== String(id));
        this._setLocal('personal_transactions', oldList);

        return true;
    },

    async getTransactionSummary(startDate, endDate) {
        const txList = await this.getTransactions({ startDate, endDate });
        let income = 0, expense = 0;
        txList.forEach(t => {
            const amt = Utils.parseAmount(t.amount);
            const tType = String(t.type).trim().toLowerCase();
            if (tType === 'income') income += amt;
            else if (tType === 'expense') expense += amt;
        });
        return { income, expense, balance: income - expense };
    },

    async getTotalBalance() {
        const txList = await this.getTransactions({});
        let balance = 0;
        txList.forEach(t => {
            const amt = Utils.parseAmount(t.amount);
            const tType = String(t.type).trim().toLowerCase();
            if (tType === 'income') balance += amt;
            else if (tType === 'expense') balance -= amt;
        });
        return balance;
    },

    // ─── 개인 환전 ───

    async getExchanges(filters = {}) {
        let dbEx = [];
        try {
            let q = supabase.from('exchange_transactions').select('*').order('tx_date', { ascending: false });
            if (filters.startDate) q = q.gte('tx_date', Utils.formatDate(filters.startDate));
            if (filters.endDate) q = q.lte('tx_date', Utils.formatDate(filters.endDate));
            if (filters.person_name) q = q.eq('person_name', filters.person_name);
            if (filters.limit) q = q.limit(filters.limit);
            const { data, error } = await q;
            if (!error && data) dbEx = data;
        } catch(e) {}

        let localEx = this._getLocal('exchanges', []);
        if (filters.startDate) localEx = localEx.filter(e => Utils.formatDate(e.tx_date) >= Utils.formatDate(filters.startDate));
        if (filters.endDate) localEx = localEx.filter(e => Utils.formatDate(e.tx_date) <= Utils.formatDate(filters.endDate));
        if (filters.person_name) localEx = localEx.filter(e => e.person_name === filters.person_name);

        const exMap = {};
        localEx.forEach(e => { if (e.id) exMap[String(e.id)] = e; });
        dbEx.forEach(e => { if (e.id) exMap[String(e.id)] = e; });

        let result = Object.values(exMap);
        result.sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date));
        if (filters.limit) result = result.slice(0, filters.limit);
        return result;
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
        list = list.filter(e => String(e.id) !== String(id));
        this._setLocal('exchanges', list);
        return true;
    },

    async getExchangeTotal() {
        const exList = await this.getExchanges({});
        let vnd = 0, krw = 0;
        exList.forEach(e => {
            const vAmt = Utils.parseAmount(e.amount_vnd);
            const kAmt = Utils.parseAmount(e.amount_krw);
            if (e.tx_type === 'VND_TO_KRW') { vnd -= vAmt; krw += kAmt; }
            else { vnd += vAmt; krw -= kAmt; }
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
