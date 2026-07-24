/* ============================================
   STORE.JS — 클라우드 자동 이관 & 멀티 도메인 완전 동기화 DAL
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

    // ─── LocalStorage 전수 탐색 ───
    _scanAllLocalTransactions() {
        const found = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                const lowerK = k.toLowerCase();
                // 카테고리, 설정, 환전 등 무관한 키는 탐색 대상에서 제외
                if (lowerK.includes('category') || lowerK.includes('categories') || lowerK.includes('setting') || lowerK.includes('exchange')) {
                    continue;
                }
                if (lowerK.includes('transaction') || lowerK.includes('ledger') || lowerK.includes('tx')) {
                    try {
                        const raw = localStorage.getItem(k);
                        if (!raw) continue;
                        const parsed = JSON.parse(raw);
                        const processItem = (item) => {
                            if (item && typeof item === 'object') {
                                // 카테고리 객체 특성(sort_order, is_active만 있는 경우) 제외
                                if (item.sort_order !== undefined || (item.is_active !== undefined && item.amount === undefined)) {
                                    return;
                                }
                                const amt = Utils.parseAmount(item.amount);
                                // 실제 거래 항목(금액이 0 초과이거나 거래 유효 데이터)만 포함
                                if (amt > 0 || item.payment_method || (item.tx_date && item.category_id)) {
                                    found.push(item);
                                }
                            }
                        };
                        if (Array.isArray(parsed)) {
                            parsed.forEach(processItem);
                        } else if (parsed && typeof parsed === 'object') {
                            processItem(parsed);
                        }
                    } catch(e) {}
                }
            }
        } catch(e) {}
        return found;
    },

    _getLocal(key, defaultVal = []) {
        try {
            const raw = localStorage.getItem('mymoney_' + key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}
        return defaultVal;
    },

    _setLocal(key, val) {
        try {
            localStorage.setItem('mymoney_' + key, JSON.stringify(val));
            localStorage.setItem('mony_usage_personal_' + key, JSON.stringify(val));
        } catch(e) {}
    },

    // ─── 로컬 데이터 ➔ Supabase 클라우드 DB 자동 이관 ───
    async _syncLocalToCloud() {
        try {
            const localTx = this._scanAllLocalTransactions();
            if (localTx.length === 0) return;

            // DB에 존재하는 데이터 확인
            const { data: dbTx } = await supabase.from('personal_transactions').select('id, amount, tx_date, type');
            const existingKeys = new Set((dbTx || []).map(t => `${t.tx_date}_${t.amount}_${t.type}`));

            for (const item of localTx) {
                const amt = Utils.parseAmount(item.amount);
                const tType = String(item.type || 'expense').trim().toLowerCase();
                const dStr = Utils.formatDate(item.tx_date || Utils.today());
                const key = `${dStr}_${amt}_${tType}`;

                if (amt > 0 && !existingKeys.has(key)) {
                    // Supabase로 이관
                    const catId = item.category_id ? (isNaN(Number(item.category_id)) ? 1 : Number(item.category_id)) : (tType === 'income' ? 7 : 1);
                    const payload = {
                        tx_date: dStr,
                        type: tType,
                        payment_method: item.payment_method || 'transfer',
                        category_id: catId,
                        amount: amt,
                        memo: item.memo || '이전 이관 데이터'
                    };
                    const { data, error } = await supabase.from('personal_transactions').insert(payload).select().single();
                    if (!error && data) {
                        existingKeys.add(key);
                        console.log('✅ 로컬 수입/지출 데이터 Supabase 클라우드 이관 성공:', payload);
                    }
                }
            }
        } catch(e) {
            console.warn('⚠️ 자동 동기화 시도 중 (Supabase 세팅 대기):', e.message);
        }
    },

    // ─── 개인 가계부: 카테고리 ───

    async getCategories(type = null) {
        let dbList = [];
        try {
            let q = supabase.from('personal_categories').select('*').eq('is_active', true).order('sort_order');
            if (type && type.trim() !== '') q = q.eq('type', type.trim().toLowerCase());
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
        // 배경에서 로컬 ➔ 클라우드 이관 시도
        this._syncLocalToCloud();

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

        // 로컬 탐색 데이터
        const allScanned = this._scanAllLocalTransactions();

        let filteredLocal = allScanned;
        if (filters.startDate) {
            const startClean = Utils.formatDate(filters.startDate);
            filteredLocal = filteredLocal.filter(t => Utils.formatDate(t.tx_date || Utils.today()) >= startClean);
        }
        if (filters.endDate) {
            const endClean = Utils.formatDate(filters.endDate);
            filteredLocal = filteredLocal.filter(t => Utils.formatDate(t.tx_date || Utils.today()) <= endClean);
        }
        if (filters.type && filters.type.trim() !== '') {
            const targetType = filters.type.trim().toLowerCase();
            filteredLocal = filteredLocal.filter(t => String(t.type || 'expense').trim().toLowerCase() === targetType);
        }
        if (filters.category_id) {
            filteredLocal = filteredLocal.filter(t => String(t.category_id) === String(filters.category_id));
        }
        if (filters.payment_method && filters.payment_method.trim() !== '') {
            filteredLocal = filteredLocal.filter(t => String(t.payment_method || 'transfer').trim() === filters.payment_method.trim());
        }

        // DB와 로컬 100% 통합
        const txMap = {};
        filteredLocal.forEach(t => {
            const idKey = t.id ? String(t.id) : ('local_' + Utils.formatDate(t.tx_date) + '_' + Utils.parseAmount(t.amount) + '_' + (t.type || ''));
            const cObj = t.personal_categories || catMap[String(t.category_id)] || (String(t.type).trim().toLowerCase() === 'income' ? { name: '급여/수입', icon: '💵' } : { name: '기타', icon: '💰' });
            txMap[idKey] = {
                ...t,
                id: idKey,
                tx_date: Utils.formatDate(t.tx_date || Utils.today()),
                type: String(t.type || 'expense').trim().toLowerCase(),
                amount: Utils.parseAmount(t.amount),
                payment_method: t.payment_method || 'transfer',
                personal_categories: cObj
            };
        });

        dbTx.forEach(t => {
            if (t.id) {
                const cObj = t.personal_categories || catMap[String(t.category_id)] || (String(t.type).trim().toLowerCase() === 'income' ? { name: '급여/수입', icon: '💵' } : { name: '기타', icon: '💰' });
                txMap[String(t.id)] = {
                    ...t,
                    tx_date: Utils.formatDate(t.tx_date),
                    type: String(t.type || 'expense').trim().toLowerCase(),
                    amount: Utils.parseAmount(t.amount),
                    payment_method: t.payment_method || 'transfer',
                    personal_categories: cObj
                };
            }
        });

        let result = Object.values(txMap);
        result.sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date) || new Date(b.created_at || 0) - new Date(a.created_at || 0));

        if (result.length > 0) {
            this._setLocal('transactions', result);
        }

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
        const cat = cats.find(c => String(c.id) === String(cleanTx.category_id)) || (cleanTx.type === 'income' ? { name: '급여/수입', icon: '💵' } : { name: '기타', icon: '💰' });

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

        const list = await this.getTransactions({});
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

        const list = await this.getTransactions({});
        const idx = list.findIndex(t => String(t.id) === String(id));
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates };
            this._setLocal('transactions', list);
            return list[idx];
        }
        return null;
    },

    async deleteTransactions(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return true;
        const targetIds = new Set(ids.map(id => String(id)));

        // Supabase DB 삭제
        try {
            const dbIds = Array.from(targetIds).filter(id => !id.startsWith('local_'));
            if (dbIds.length > 0) {
                await supabase.from('personal_transactions').delete().in('id', dbIds);
            }
        } catch(e) {
            console.error('Supabase 삭제 오류:', e);
        }

        // 로컬 데이터 전수 정제 (모든 관련 키에서 완벽 제거)
        const keysToClean = ['mymoney_transactions', 'mony_usage_personal_transactions'];
        keysToClean.forEach(key => {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        const updated = parsed.filter(t => t && !targetIds.has(String(t.id)));
                        localStorage.setItem(key, JSON.stringify(updated));
                    }
                }
            } catch(e) {}
        });

        return true;
    },

    async deleteTransaction(id) {
        return await this.deleteTransactions([id]);
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
