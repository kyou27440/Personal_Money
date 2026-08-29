/* ============================================
   STORE.JS — 클라우드 단일 진실 출처 (Single Source of Truth) DAL
   ============================================ */
if (typeof supabase === 'undefined' || typeof supabase.from !== 'function') {
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY || SUPABASE_ANON_KEY);
}

const DEFAULT_CATEGORIES = [
    { id: 1, name: '식비', type: 'expense', icon: '🍚', sort_order: 1, is_active: true },
    { id: 2, name: '담배', type: 'expense', icon: '🚬', sort_order: 2, is_active: true },
    { id: 3, name: '교통비', type: 'expense', icon: '🚗', sort_order: 3, is_active: true },
    { id: 4, name: '쇼핑', type: 'expense', icon: '🛍️', sort_order: 4, is_active: true },
    { id: 5, name: '주거/통신', type: 'expense', icon: '🏠', sort_order: 5, is_active: true },
    { id: 6, name: '취미/유흥', type: 'expense', icon: '🎮', sort_order: 6, is_active: true },
    { id: 7, name: '기타 지출', type: 'expense', icon: '💸', sort_order: 7, is_active: true },
    { id: 8, name: '급여/월급', type: 'income', icon: '💵', sort_order: 1, is_active: true },
    { id: 9, name: '부수입', type: 'income', icon: '💰', sort_order: 2, is_active: true },
    { id: 10, name: '기타 수입', type: 'income', icon: '🎁', sort_order: 3, is_active: true }
];

const Store = {
    _isSyncing: false,

    // ─── 로컬 오프라인 임시 드래프트 완전 제거 (동기화 완료 후 호출) ───
    _clearLocalDrafts() {
        const keysToRemove = [
            'mymoney_transactions',
            'mony_usage_personal_transactions',
            'mymoney_personal_transactions',
            'mony_usage_transactions',
            'transactions',
            'personal_transactions',
            'mymoney_personal_ledger',
            'personal_ledger',
            'mymoney_exchanges',
            'mony_usage_personal_exchanges',
            'mymoney_personal_exchanges',
            'mony_usage_exchanges',
            'exchanges',
            'personal_exchanges'
        ];
        keysToRemove.forEach(k => {
            try { localStorage.removeItem(k); } catch(e) {}
        });
    },

    // ─── Supabase DB 중복 데이터 근본 정제 ───
    async _deduplicateDatabase() {
        try {
            const { data: dbTx } = await supabase.from('personal_transactions').select('id, tx_date, amount, type, memo').order('id', { ascending: true });
            if (dbTx && dbTx.length > 0) {
                const seen = new Set();
                const duplicateIds = [];
                dbTx.forEach(t => {
                    const key = `${Utils.formatDate(t.tx_date)}_${Utils.parseAmount(t.amount)}_${String(t.type).trim().toLowerCase()}_${String(t.memo || '').trim()}`;
                    if (seen.has(key)) {
                        duplicateIds.push(t.id);
                    } else {
                        seen.add(key);
                    }
                });
                if (duplicateIds.length > 0) {
                    console.log('🧹 DB 가계부 중복 데이터 정제 삭제:', duplicateIds);
                    await supabase.from('personal_transactions').delete().in('id', duplicateIds);
                }
            }
        } catch(e) {}

        try {
            const { data: dbEx } = await supabase.from('exchange_transactions').select('id, tx_date, amount_vnd, amount_krw, tx_type, person_name').order('id', { ascending: true });
            if (dbEx && dbEx.length > 0) {
                const seen = new Set();
                const duplicateIds = [];
                dbEx.forEach(e => {
                    const key = `${Utils.formatDate(e.tx_date)}_${Utils.parseAmount(e.amount_vnd)}_${Utils.parseAmount(e.amount_krw)}_${e.tx_type}_${e.person_name || ''}`;
                    if (seen.has(key)) {
                        duplicateIds.push(e.id);
                    } else {
                        seen.add(key);
                    }
                });
                if (duplicateIds.length > 0) {
                    console.log('🧹 DB 환전 중복 데이터 정제 삭제:', duplicateIds);
                    await supabase.from('exchange_transactions').delete().in('id', duplicateIds);
                }
            }
        } catch(e) {}
    },

    // ─── LocalStorage 탐색 (오프라인 미동기화 드래프트 전용) ───
    _scanAllLocalTransactions() {
        const found = [];
        const seen = new Set();

        const addCandidate = (item) => {
            if (item && typeof item === 'object') {
                const amt = Utils.parseAmount(item.amount);
                if (amt > 0) {
                    const dStr = Utils.formatDate(item.tx_date || item.date || item.created_at || Utils.today());
                    const tType = String(item.type || (item.category_type || 'expense')).trim().toLowerCase();
                    const memoStr = String(item.memo || item.note || item.description || '').trim();
                    const key = `${dStr}_${amt}_${tType}_${memoStr}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        found.push({
                            ...item,
                            tx_date: dStr,
                            amount: amt,
                            type: tType,
                            memo: memoStr
                        });
                    }
                }
            }
        };

        const keysToScan = [
            'mymoney_transactions',
            'mony_usage_personal_transactions',
            'mymoney_personal_transactions',
            'mony_usage_transactions',
            'transactions',
            'personal_transactions'
        ];

        keysToScan.forEach(k => {
            try {
                const raw = localStorage.getItem(k);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) parsed.forEach(addCandidate);
                }
            } catch(e) {}
        });

        return found;
    },

    _scanAllLocalExchanges() {
        const found = [];
        const seen = new Set();

        const addCandidate = (item) => {
            if (item && typeof item === 'object') {
                const vAmt = Utils.parseAmount(item.amount_vnd);
                const kAmt = Utils.parseAmount(item.amount_krw);
                if (vAmt > 0 || kAmt > 0) {
                    const dStr = Utils.formatDate(item.tx_date || item.date || Utils.today());
                    const tType = item.tx_type || 'KRW_TO_VND';
                    const key = `${dStr}_${vAmt}_${kAmt}_${tType}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        found.push({
                            ...item,
                            tx_date: dStr,
                            amount_vnd: vAmt,
                            amount_krw: kAmt,
                            tx_type: tType
                        });
                    }
                }
            }
        };

        const keysToScan = [
            'mymoney_exchanges',
            'mony_usage_personal_exchanges',
            'mymoney_personal_exchanges',
            'exchanges'
        ];

        keysToScan.forEach(k => {
            try {
                const raw = localStorage.getItem(k);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) parsed.forEach(addCandidate);
                }
            } catch(e) {}
        });

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
        } catch(e) {}
    },

    // ─── 오프라인 데이터 ➔ Supabase 클라우드 DB 원샷 이관 & 임시 저장소 완벽 소멸 ───
    async _syncLocalToCloud() {
        if (this._isSyncing) return;
        this._isSyncing = true;
        try {
            // DB 중복 자동 정리
            await this._deduplicateDatabase();

            const localTx = this._scanAllLocalTransactions();
            if (localTx.length > 0) {
                const { data: dbTx } = await supabase.from('personal_transactions').select('id, amount, tx_date, type, memo');
                const existingKeys = new Set((dbTx || []).map(t => `${Utils.formatDate(t.tx_date)}_${Utils.parseAmount(t.amount)}_${String(t.type).trim().toLowerCase()}_${String(t.memo || '').trim()}`));
                const validCatIds = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
                const inFlightKeys = new Set();

                for (const item of localTx) {
                    const amt = Utils.parseAmount(item.amount);
                    const tType = String(item.type || 'expense').trim().toLowerCase();
                    const dStr = Utils.formatDate(item.tx_date || Utils.today());
                    const memoStr = String(item.memo || '').trim();
                    const key = `${dStr}_${amt}_${tType}_${memoStr}`;

                    if (amt > 0 && !existingKeys.has(key) && !inFlightKeys.has(key)) {
                        inFlightKeys.add(key);
                        let catId = Number(item.category_id);
                        if (!validCatIds.has(catId)) {
                            catId = tType === 'income' ? 10 : 1;
                        }
                        const payload = {
                            tx_date: dStr,
                            type: tType,
                            category_id: catId,
                            amount: amt,
                            memo: memoStr || '이전 이관 데이터'
                        };
                        const { data, error } = await supabase.from('personal_transactions').insert(payload).select().single();
                        if (!error && data) {
                            existingKeys.add(key);
                            console.log('✅ 오프라인 수입/지출 데이터 Supabase 클라우드 이관 성공:', payload);
                        }
                    }
                }
            }

            await this._syncLocalExchangesToCloud();

            // 이관 완료 후 오프라인 임시 드래프트 완벽 청소
            this._clearLocalDrafts();
        } catch(e) {
            console.warn('⚠️ 자동 동기화 예외 발생:', e.message);
        } finally {
            this._isSyncing = false;
        }
    },

    async _syncLocalExchangesToCloud() {
        try {
            const localEx = this._scanAllLocalExchanges();
            if (localEx.length === 0) return;

            const { data: dbEx } = await supabase.from('exchange_transactions').select('id, amount_vnd, amount_krw, tx_date, tx_type');
            const existingKeys = new Set((dbEx || []).map(e => `${Utils.formatDate(e.tx_date)}_${Utils.parseAmount(e.amount_vnd)}_${Utils.parseAmount(e.amount_krw)}_${e.tx_type}`));
            const inFlightKeys = new Set();

            for (const item of localEx) {
                const vAmt = Utils.parseAmount(item.amount_vnd);
                const kAmt = Utils.parseAmount(item.amount_krw);
                const dStr = Utils.formatDate(item.tx_date || Utils.today());
                const key = `${dStr}_${vAmt}_${kAmt}_${item.tx_type || 'KRW_TO_VND'}`;

                if ((vAmt > 0 || kAmt > 0) && !existingKeys.has(key) && !inFlightKeys.has(key)) {
                    inFlightKeys.add(key);
                    const payload = {
                        tx_date: dStr,
                        person_name: item.person_name || '본인',
                        tx_type: item.tx_type || 'KRW_TO_VND',
                        exchange_rate: Number(item.exchange_rate || 1),
                        amount_vnd: vAmt,
                        amount_krw: kAmt,
                        memo: item.memo || ''
                    };
                    const { data, error } = await supabase.from('exchange_transactions').insert(payload).select().single();
                    if (!error && data) {
                        existingKeys.add(key);
                        console.log('✅ 오프라인 환전 데이터 Supabase 이관 성공:', payload);
                    }
                }
            }
        } catch(e) {}
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
        // 클라우드 동기화 수행
        await this._syncLocalToCloud();

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
            if (filters.limit) q = q.limit(filters.limit);
            const { data, error } = await q;
            if (!error && data) dbTx = data;
        } catch(e) {}

        // 오프라인 드래프트 탐색
        const localTx = this._scanAllLocalTransactions();

        // 엄격한 메모리 상 중복 정제
        const dbKeys = new Set(dbTx.map(t => `${Utils.formatDate(t.tx_date)}_${Utils.parseAmount(t.amount)}_${String(t.type).trim().toLowerCase()}_${String(t.memo || '').trim()}`));
        const txMap = {};

        // 1. DB 거래 항목 우선 추가
        dbTx.forEach(t => {
            if (t.id) {
                const key = `${Utils.formatDate(t.tx_date)}_${Utils.parseAmount(t.amount)}_${String(t.type).trim().toLowerCase()}_${String(t.memo || '').trim()}`;
                if (!txMap[String(t.id)]) {
                    const cObj = t.personal_categories || catMap[String(t.category_id)] || (String(t.type).trim().toLowerCase() === 'income' ? { name: '급여/수입', icon: '💵' } : { name: '기타', icon: '💰' });
                    const isGameDues = /(?:\[🎮\s*게임회비|\[게임회비|\[회비이전\])/i.test(t.memo || '');
                    txMap[String(t.id)] = {
                        ...t,
                        tx_date: Utils.formatDate(t.tx_date),
                        type: String(t.type || 'expense').trim().toLowerCase(),
                        amount: Utils.parseAmount(t.amount),
                        payment_method: t.payment_method || (/(?:cash|현금)/i.test(t.memo || '') ? 'cash' : 'transfer'),
                        personal_categories: cObj,
                        is_game_dues: isGameDues
                    };
                }
            }
        });

        // 2. 미동기화 오프라인 드래프트만 추가
        localTx.forEach(t => {
            const dStr = Utils.formatDate(t.tx_date || Utils.today());
            const amt = Utils.parseAmount(t.amount);
            const tType = String(t.type || 'expense').trim().toLowerCase();
            const memoStr = String(t.memo || '').trim();
            const key = `${dStr}_${amt}_${tType}_${memoStr}`;

            if (!dbKeys.has(key)) {
                const idKey = t.id ? String(t.id) : ('local_' + key);
                if (!txMap[idKey]) {
                    const cObj = t.personal_categories || catMap[String(t.category_id)] || (tType === 'income' ? { name: '급여/수입', icon: '💵' } : { name: '기타', icon: '💰' });
                    const isGameDues = /(?:\[🎮\s*게임회비|\[게임회비|\[회비이전\])/i.test(memoStr);
                    txMap[idKey] = {
                        ...t,
                        id: idKey,
                        tx_date: dStr,
                        type: tType,
                        amount: amt,
                        payment_method: t.payment_method || (/(?:cash|현금)/i.test(memoStr) ? 'cash' : 'transfer'),
                        personal_categories: cObj,
                        is_game_dues: isGameDues
                    };
                }
            }
        });

        let result = Object.values(txMap);

        if (filters.payment_method && filters.payment_method.trim() !== '') {
            const pm = filters.payment_method.trim();
            result = result.filter(t => String(t.payment_method || 'transfer').trim() === pm);
        }

        // ─── 정렬 로직 (1차: tx_date 최신순, 2차: created_at / id 최신순) ───
        const sortComparator = (a, b) => {
            const dateA = a.tx_date ? String(a.tx_date).slice(0, 10) : '';
            const dateB = b.tx_date ? String(b.tx_date).slice(0, 10) : '';

            const getTime = (t) => {
                if (t.created_at) {
                    const d = new Date(t.created_at);
                    if (!isNaN(d.getTime())) return d.getTime();
                }
                if (typeof t.id === 'number') return t.id;
                return 0;
            };

            const sortMode = filters.sort || 'date-desc';
            if (sortMode === 'date-asc') {
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                return getTime(a) - getTime(b);
            } else if (sortMode === 'amount-desc') {
                return (b.amount - a.amount) || dateB.localeCompare(dateA) || (getTime(b) - getTime(a));
            } else if (sortMode === 'amount-asc') {
                return (a.amount - b.amount) || dateB.localeCompare(dateA) || (getTime(b) - getTime(a));
            } else {
                // 기본: 최신 거래일자 순 -> 같은 날짜 내에서는 최초/최신 등록시간 순
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                return getTime(b) - getTime(a);
            }
        };

        result.sort(sortComparator);

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

        const validCatIds = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
        let catId = Number(cleanTx.category_id);
        if (!validCatIds.has(catId)) {
            catId = cleanTx.type === 'income' ? 10 : 1;
        }

        let memoText = cleanTx.memo || '';
        if (cleanTx.payment_method === 'cash' && !/(?:cash|현금)/i.test(memoText)) {
            memoText = (memoText ? memoText + ' ' : '') + '[현금]';
        }

        const dbPayload = {
            tx_date: cleanTx.tx_date,
            type: cleanTx.type,
            category_id: catId,
            amount: cleanTx.amount,
            memo: memoText
        };
        if (cleanTx.created_at) {
            dbPayload.created_at = cleanTx.created_at;
        }

        let inserted = null;
        try {
            const { data, error } = await supabase.from('personal_transactions').insert(dbPayload).select('*, personal_categories(name, icon)').single();
            if (!error && data) inserted = data;
            else if (error) console.error('Supabase Transaction Insert Error:', error);
        } catch(e) {
            console.error('Supabase Transaction Exception:', e);
        }

        const cats = await this.getCategories();
        const cat = cats.find(c => String(c.id) === String(cleanTx.category_id)) || (cleanTx.type === 'income' ? { name: '급여/수입', icon: '💵' } : { name: '기타', icon: '💰' });

        window.AppVersion?.updateSyncStatus();

        if (inserted) {
            // 성공 시 DB 생성 항목 즉시 반환 (LocalStorage에 재주입하지 않음)
            return {
                ...inserted,
                type: String(inserted.type || 'expense').trim().toLowerCase(),
                amount: Utils.parseAmount(inserted.amount),
                payment_method: cleanTx.payment_method,
                personal_categories: cat
            };
        } else {
            // 실패 시 오프라인 전용 임시 보관
            const offlineTx = {
                ...cleanTx,
                id: 'local_' + Date.now(),
                created_at: cleanTx.created_at || new Date().toISOString(),
                personal_categories: cat
            };
            const list = this._scanAllLocalTransactions();
            list.unshift(offlineTx);
            this._setLocal('transactions', list);
            return offlineTx;
        }
    },

    async updateTransaction(id, updates) {
        if (updates.amount !== undefined) updates.amount = Utils.parseAmount(updates.amount);
        if (updates.type !== undefined) updates.type = String(updates.type).trim().toLowerCase();
        if (updates.tx_date !== undefined) updates.tx_date = Utils.formatDate(updates.tx_date);
        updates.updated_at = new Date().toISOString();

        try {
            const dbUpdates = {};
            if (updates.tx_date !== undefined) dbUpdates.tx_date = updates.tx_date;
            if (updates.created_at !== undefined) dbUpdates.created_at = updates.created_at;
            if (updates.type !== undefined) dbUpdates.type = updates.type;
            if (updates.category_id !== undefined) dbUpdates.category_id = Number(updates.category_id);
            if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
            if (updates.memo !== undefined) dbUpdates.memo = updates.memo;
            dbUpdates.updated_at = updates.updated_at;

            await supabase.from('personal_transactions').update(dbUpdates).eq('id', id);
        } catch(e) {}

        window.AppVersion?.updateSyncStatus();
        return true;
    },

    async deleteTransactions(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return true;
        const targetIds = new Set(ids.map(id => String(id)));

        try {
            const dbIds = Array.from(targetIds).filter(id => !id.startsWith('local_'));
            if (dbIds.length > 0) {
                await supabase.from('personal_transactions').delete().in('id', dbIds);
            }
        } catch(e) {
            console.error('Supabase 삭제 오류:', e);
        }

        this._clearLocalDrafts();
        window.AppVersion?.updateSyncStatus();
        return true;
    },

    async deleteTransaction(id) {
        return await this.deleteTransactions([id]);
    },

    async getTransactionSummary(startDate, endDate) {
        const txList = await this.getTransactions({ startDate, endDate });
        let income = 0, expense = 0;
        let incomeCash = 0, incomeTransfer = 0;
        let expenseCash = 0, expenseTransfer = 0;
        txList.forEach(t => {
            if (t.is_game_dues) return; // 게임회비 이전 항목은 통계에서 제외 (미반영)

            const amt = Utils.parseAmount(t.amount);
            const tType = String(t.type).trim().toLowerCase();
            const pm = t.payment_method === 'cash' ? 'cash' : 'transfer';
            if (tType === 'income') {
                income += amt;
                if (pm === 'cash') incomeCash += amt;
                else incomeTransfer += amt;
            } else if (tType === 'expense') {
                expense += amt;
                if (pm === 'cash') expenseCash += amt;
                else expenseTransfer += amt;
            }
        });
        return {
            income,
            incomeCash,
            incomeTransfer,
            expense,
            expenseCash,
            expenseTransfer,
            balance: income - expense
        };
    },

    async getTotalBalance() {
        const txList = await this.getTransactions({});
        let balance = 0;
        txList.forEach(t => {
            if (t.is_game_dues) return; // 게임회비 이전 항목은 제외

            const amt = Utils.parseAmount(t.amount);
            const tType = String(t.type).trim().toLowerCase();
            if (tType === 'income') balance += amt;
            else if (tType === 'expense') balance -= amt;
        });
        return balance;
    },

    async getBalanceBreakdown() {
        const txList = await this.getTransactions({});
        const summary = {
            cash: { income: 0, expense: 0, balance: 0 },
            transfer: { income: 0, expense: 0, balance: 0 },
            total: { income: 0, expense: 0, balance: 0 }
        };
        txList.forEach(t => {
            if (t.is_game_dues) return; // 게임회비 이전 항목은 제외

            const amt = Utils.parseAmount(t.amount);
            const tType = String(t.type).trim().toLowerCase();
            const pm = t.payment_method === 'cash' ? 'cash' : 'transfer';
            if (tType === 'income') {
                summary[pm].income += amt;
                summary.total.income += amt;
            } else if (tType === 'expense') {
                summary[pm].expense += amt;
                summary.total.expense += amt;
            }
        });
        summary.cash.balance = summary.cash.income - summary.cash.expense;
        summary.transfer.balance = summary.transfer.income - summary.transfer.expense;
        summary.total.balance = summary.total.income - summary.total.expense;
        return summary;
    },

    // ─── 개인 환전 ───

    async getExchanges(filters = {}) {
        await this._syncLocalExchangesToCloud();

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

        const localEx = this._scanAllLocalExchanges();
        const dbKeys = new Set(dbEx.map(e => `${Utils.formatDate(e.tx_date)}_${Utils.parseAmount(e.amount_vnd)}_${Utils.parseAmount(e.amount_krw)}_${e.tx_type}`));
        const exMap = {};

        dbEx.forEach(e => { if (e.id) exMap[String(e.id)] = e; });

        localEx.forEach(e => {
            const dStr = Utils.formatDate(e.tx_date || Utils.today());
            const vAmt = Utils.parseAmount(e.amount_vnd);
            const kAmt = Utils.parseAmount(e.amount_krw);
            const key = `${dStr}_${vAmt}_${kAmt}_${e.tx_type || 'KRW_TO_VND'}`;

            if (!dbKeys.has(key)) {
                const idKey = e.id ? String(e.id) : ('local_ex_' + key);
                if (!exMap[idKey]) exMap[idKey] = { ...e, id: idKey };
            }
        });

        let result = Object.values(exMap);
        result.sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date));
        if (filters.limit) result = result.slice(0, filters.limit);
        return result;
    },

    async addExchange(ex) {
        const dbPayload = {
            tx_date: Utils.formatDate(ex.tx_date),
            person_name: ex.person_name || '본인',
            tx_type: ex.tx_type || 'KRW_TO_VND',
            exchange_rate: Number(ex.exchange_rate || 1),
            amount_vnd: Utils.parseAmount(ex.amount_vnd),
            amount_krw: Utils.parseAmount(ex.amount_krw),
            memo: ex.memo || ''
        };

        let inserted = null;
        try {
            const { data, error } = await supabase.from('exchange_transactions').insert(dbPayload).select().single();
            if (!error && data) inserted = data;
        } catch(e) {}

        if (inserted) {
            return inserted;
        } else {
            const offlineEx = { ...ex, id: 'local_ex_' + Date.now(), created_at: new Date().toISOString() };
            const list = this._scanAllLocalExchanges();
            list.unshift(offlineEx);
            this._setLocal('exchanges', list);
            return offlineEx;
        }
    },

    async deleteExchange(id) {
        try {
            await supabase.from('exchange_transactions').delete().eq('id', id);
        } catch(e) {}
        this._clearLocalDrafts();
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

    // ─── 게임회비 관리 ───

    async getGameDuesIncome(filters = {}) {
        let dbList = [];
        try {
            let q = supabase.from('game_dues_income').select('*').order('tx_date', { ascending: false }).order('created_at', { ascending: false });
            if (filters.startDate) q = q.gte('tx_date', Utils.formatDate(filters.startDate));
            if (filters.endDate) q = q.lte('tx_date', Utils.formatDate(filters.endDate));
            const { data, error } = await q;
            if (!error && data) dbList = data;
        } catch(e) {}

        const localList = this._getLocal('mymoney_gamedues_income', []);
        const dbIds = new Set(dbList.map(r => String(r.id)));
        const combined = [...dbList];

        // DB에 없는 로컬 데이터 병합
        localList.forEach(r => {
            if (!dbIds.has(String(r.id))) {
                combined.push(r);
            }
        });

        // 정렬: 1차 tx_date 내림차순, 2차 created_at/id 내림차순
        combined.sort((a, b) => {
            const dComp = String(b.tx_date).localeCompare(String(a.tx_date));
            if (dComp !== 0) return dComp;
            return String(b.created_at || '').localeCompare(String(a.created_at || ''));
        });

        return combined;
    },

    async getGameDuesExpense(filters = {}) {
        let dbList = [];
        try {
            let q = supabase.from('game_dues_expense').select('*').order('tx_date', { ascending: false }).order('created_at', { ascending: false });
            if (filters.startDate) q = q.gte('tx_date', Utils.formatDate(filters.startDate));
            if (filters.endDate) q = q.lte('tx_date', Utils.formatDate(filters.endDate));
            const { data, error } = await q;
            if (!error && data) dbList = data;
        } catch(e) {}

        const localList = this._getLocal('mymoney_gamedues_expense', []);
        const dbIds = new Set(dbList.map(r => String(r.id)));
        const combined = [...dbList];

        localList.forEach(r => {
            if (!dbIds.has(String(r.id))) {
                combined.push(r);
            }
        });

        combined.sort((a, b) => {
            const dComp = String(b.tx_date).localeCompare(String(a.tx_date));
            if (dComp !== 0) return dComp;
            return String(b.created_at || '').localeCompare(String(a.created_at || ''));
        });

        return combined;
    },

    async addGameDuesIncome(item) {
        const payload = {
            tx_date: Utils.formatDate(item.tx_date),
            member_name: (item.member_name || '').trim().toUpperCase(),
            amount: Math.abs(Utils.parseAmount(item.amount)),
            memo: (item.memo || '').trim()
        };
        if (item.created_at) payload.created_at = item.created_at;

        // 로컬스토리지에 항상 즉시 저장 (유실 방지)
        const local = { ...payload, id: 'local_inc_' + Date.now(), created_at: payload.created_at || new Date().toISOString() };
        const list = this._getLocal('mymoney_gamedues_income', []);
        list.unshift(local);
        this._setLocal('mymoney_gamedues_income', list);

        try {
            const { data, error } = await supabase.from('game_dues_income').insert(payload).select().single();
            if (!error && data) {
                // Supabase 성공 시 로컬 아이템 ID 동기화
                local.id = data.id;
                this._setLocal('mymoney_gamedues_income', list);
                return data;
            }
        } catch(e) {}

        window.AppVersion?.updateSyncStatus();
        return local;
    },

    async addGameDuesExpense(item) {
        const payload = {
            tx_date: Utils.formatDate(item.tx_date),
            title: (item.title || '게임회비 지출').trim(),
            amount: Math.abs(Utils.parseAmount(item.amount)),
            memo: (item.memo || '').trim()
        };
        if (item.created_at) payload.created_at = item.created_at;

        const local = { ...payload, id: 'local_exp_' + Date.now(), created_at: payload.created_at || new Date().toISOString() };
        const list = this._getLocal('mymoney_gamedues_expense', []);
        list.unshift(local);
        this._setLocal('mymoney_gamedues_expense', list);

        try {
            const { data, error } = await supabase.from('game_dues_expense').insert(payload).select().single();
            if (!error && data) {
                local.id = data.id;
                this._setLocal('mymoney_gamedues_expense', list);
                window.AppVersion?.updateSyncStatus();
                return data;
            }
        } catch(e) {}

        window.AppVersion?.updateSyncStatus();
        return local;
    },

    async updateGameDuesIncome(id, updates) {
        const payload = {};
        if (updates.tx_date !== undefined) payload.tx_date = Utils.formatDate(updates.tx_date);
        if (updates.member_name !== undefined) payload.member_name = updates.member_name.trim().toUpperCase();
        if (updates.amount !== undefined) payload.amount = Math.abs(Utils.parseAmount(updates.amount));
        if (updates.memo !== undefined) payload.memo = updates.memo.trim();

        try {
            await supabase.from('game_dues_income').update(payload).eq('id', id);
        } catch(e) {}

        let list = this._getLocal('mymoney_gamedues_income', []);
        const idx = list.findIndex(r => String(r.id) === String(id));
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...payload };
            this._setLocal('mymoney_gamedues_income', list);
        }
        window.AppVersion?.updateSyncStatus();
        return true;
    },

    async updateGameDuesExpense(id, updates) {
        const payload = {};
        if (updates.tx_date !== undefined) payload.tx_date = Utils.formatDate(updates.tx_date);
        if (updates.title !== undefined) payload.title = updates.title.trim();
        if (updates.amount !== undefined) payload.amount = Math.abs(Utils.parseAmount(updates.amount));
        if (updates.memo !== undefined) payload.memo = updates.memo.trim();

        try {
            await supabase.from('game_dues_expense').update(payload).eq('id', id);
        } catch(e) {}

        let list = this._getLocal('mymoney_gamedues_expense', []);
        const idx = list.findIndex(r => String(r.id) === String(id));
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...payload };
            this._setLocal('mymoney_gamedues_expense', list);
        }
        window.AppVersion?.updateSyncStatus();
        return true;
    },

    async deleteGameDuesIncome(id) {
        try { await supabase.from('game_dues_income').delete().eq('id', id); } catch(e) {}
        let list = this._getLocal('mymoney_gamedues_income', []);
        list = list.filter(r => String(r.id) !== String(id));
        this._setLocal('mymoney_gamedues_income', list);
        window.AppVersion?.updateSyncStatus();
        return true;
    },

    async deleteGameDuesExpense(id) {
        try { await supabase.from('game_dues_expense').delete().eq('id', id); } catch(e) {}
        let list = this._getLocal('mymoney_gamedues_expense', []);
        list = list.filter(r => String(r.id) !== String(id));
        this._setLocal('mymoney_gamedues_expense', list);
        window.AppVersion?.updateSyncStatus();
        return true;
    },

    /** 개인 가계부 내역을 게임회비 관리로 이전 (가계부에서는 삭제하지 않고 취소선/미반영 마킹 보존) */
    async convertPersonalTxToGameDues(tx) {
        if (!tx) return false;

        const isIncome = String(tx.type).trim().toLowerCase() === 'income';
        const rawMemo = tx.memo || '';
        const memberName = Utils.extractMemberName(rawMemo) || 'MEMBERS';

        if (isIncome) {
            await this.addGameDuesIncome({
                tx_date: tx.tx_date,
                member_name: memberName,
                amount: tx.amount,
                memo: rawMemo,
                created_at: tx.created_at
            });
        } else {
            await this.addGameDuesExpense({
                tx_date: tx.tx_date,
                title: rawMemo || '모임 지출',
                amount: tx.amount,
                memo: `[가계부에서 이전] ${rawMemo}`,
                created_at: tx.created_at
            });
        }

        // 개인 가계부에서 거래를 삭제하지 않고, 메모에 마커를 붙여 미반영/취소선 상태로 보존 (중복 생성 방지)
        if (tx.id) {
            const cleanMemo = rawMemo.replace(/\[🎮\s*게임회비[^\]]*\]\s*/g, '').trim();
            const newMemo = `[🎮 게임회비 이전] ${cleanMemo}`.trim();
            await this.updateTransaction(tx.id, { memo: newMemo });
        }

        return true;
    },

    /** 게임회비 항목을 다시 개인 가계부로 되돌리기 (게임회비에서는 삭제, 가계부에서는 마커 제거하여 복원) */
    async convertGameDuesToPersonalTx(item, isIncome = true) {
        if (!item) return false;

        const txDate = Utils.formatDate(item.tx_date || Utils.today());
        const amt = Utils.parseAmount(item.amount);

        // 기존 가계부에서 이전된 내역이 있는지 검색하여 복원
        const allTx = await this.getTransactions({ startDate: txDate, endDate: txDate });
        const matched = allTx.find(t => t.is_game_dues && Utils.parseAmount(t.amount) === amt);

        if (matched) {
            // 기존 가계부 거래의 마커를 제거하여 정상 활성화
            const cleanMemo = (matched.memo || '').replace(/\[🎮\s*게임회비[^\]]*\]\s*/g, '').trim();
            await this.updateTransaction(matched.id, { memo: cleanMemo || (isIncome ? '수입' : '지출') });
        } else {
            // 없는 경우 신규 등록
            const memo = isIncome
                ? (item.memo ? `${item.member_name} / ${item.memo}` : `${item.member_name} 회비환원`)
                : (item.memo || item.title || '게임회비 지출환원');

            await this.addTransaction({
                tx_date: txDate,
                created_at: item.created_at || new Date().toISOString(),
                type: isIncome ? 'income' : 'expense',
                category_id: isIncome ? 10 : 1,
                payment_method: 'transfer',
                amount: amt,
                memo: memo
            });
        }

        // 게임회비 DB에서 삭제
        if (item.id) {
            if (isIncome) {
                await this.deleteGameDuesIncome(item.id);
            } else {
                await this.deleteGameDuesExpense(item.id);
            }
        }

        return true;
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
