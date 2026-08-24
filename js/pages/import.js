/* ============================================
   PAGES/IMPORT.JS — Import Page (Excel & Image OCR)
   ============================================ */

const ImportPage = {
    _rows: [],
    _activeTab: 'excel',
    _categories: [],
    _rawRows: null,
    _rawHeader: null,
    _currentMapping: null,

    async render() {
        return `
        <div style="max-width:900px;margin:0 auto;">

            <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));
                        border:1px solid rgba(99,102,241,0.25);border-radius:16px;
                        padding:18px 22px;margin-bottom:24px;display:flex;gap:14px;align-items:flex-start;">
                <span style="font-size:1.8rem;flex-shrink:0">📂</span>
                <div>
                    <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:4px">
                        엑셀 · 이미지로 가계부 자동 등록
                    </div>
                    <div style="font-size:0.84rem;color:var(--text-muted);line-height:1.6">
                        은행 내역 <strong style="color:#818cf8">엑셀(.xlsx/.xls/.csv)</strong> 또는
                        <strong style="color:#818cf8">은행 앱 캡처 이미지</strong>를 업로드하면<br>
                        날짜·금액·입출금을 자동으로 인식해 미리보기 후 일괄 등록합니다.
                        목적·카테고리는 나중에 직접 수정하세요.
                    </div>
                </div>
            </div>

            <div class="import-tabs">
                <button class="import-tab-btn active" id="tab-excel" onclick="ImportPage.switchTab('excel')">
                    📊 엑셀 가져오기
                </button>
                <button class="import-tab-btn" id="tab-image" onclick="ImportPage.switchTab('image')">
                    📷 이미지 OCR
                </button>
            </div>

            <div class="import-panel active" id="panel-excel">
                <div class="dropzone" id="dropzone-excel">
                    <input type="file" id="file-excel" accept=".xlsx,.xls,.csv" />
                    <span class="dropzone-icon">📊</span>
                    <div class="dropzone-title">엑셀 파일을 드래그하거나 클릭하여 선택</div>
                    <div class="dropzone-sub">
                        지원 형식: <strong>.xlsx · .xls · .csv</strong><br>
                        표준 은행 내역: 날짜 | 입금액 | 출금액 | 잔액 | 적요
                    </div>
                </div>

                <div class="import-progress" id="excel-progress">
                    <div class="import-progress-spinner"></div>
                    <span class="import-progress-text" id="excel-progress-text">파일 분석 중...</span>
                </div>

                <div class="col-mapping-section" id="col-mapping-section">
                    <div class="col-mapping-title">📌 컬럼 매핑 확인 (자동 감지됨, 필요시 수정)</div>
                    <div class="col-mapping-grid" id="col-mapping-grid"></div>
                    <button class="btn btn-primary btn-sm" onclick="ImportPage.applyMapping()">
                        매핑 적용 &amp; 미리보기
                    </button>
                </div>
            </div>

            <div class="import-panel" id="panel-image">
                <div class="dropzone" id="dropzone-image">
                    <input type="file" id="file-image" accept="image/*" multiple />
                    <span class="dropzone-icon">📷</span>
                    <div class="dropzone-title">은행 앱 캡처 이미지를 드래그하거나 클릭하여 선택</div>
                    <div class="dropzone-sub">
                        지원 형식: <strong>PNG · JPG · HEIC</strong><br>
                        KB국민 · 신한 · 하나 · 우리 · 카카오뱅크 등 국내 은행 앱 내역 화면
                    </div>
                </div>

                <div class="import-progress" id="image-progress">
                    <div class="import-progress-spinner"></div>
                    <span class="import-progress-text" id="image-progress-text">OCR 분석 중... (처음 실행 시 언어 데이터 다운로드)</span>
                </div>

                <div class="img-preview-wrap" id="img-preview-wrap"></div>
                <div class="ocr-raw-box" id="ocr-raw-box"></div>
            </div>

            <div class="import-preview-section" id="import-preview-section">
                <div class="import-preview-header">
                    <div class="import-preview-title">
                        📋 미리보기
                        <span class="import-preview-count" id="preview-count">0건</span>
                    </div>
                    <div class="import-preview-actions">
                        <button class="btn btn-ghost btn-sm" onclick="ImportPage.toggleAllRows(true)">전체 선택</button>
                        <button class="btn btn-ghost btn-sm" onclick="ImportPage.toggleAllRows(false)">전체 해제</button>
                        <button class="btn btn-ghost btn-sm" onclick="ImportPage.skipDuplicates()">⚠️ 중복 제외</button>
                    </div>
                </div>

                <div class="import-table-wrap">
                    <table class="import-table">
                        <thead>
                            <tr>
                                <th style="width:36px">
                                    <input type="checkbox" id="import-select-all"
                                        onchange="ImportPage.toggleAllRows(this.checked)"
                                        style="cursor:pointer;width:15px;height:15px">
                                </th>
                                <th>날짜</th>
                                <th>구분</th>
                                <th>결제수단</th>
                                <th>금액 (VND)</th>
                                <th>메모 / 적요</th>
                                <th>상태</th>
                            </tr>
                        </thead>
                        <tbody id="import-tbody"></tbody>
                    </table>
                </div>

                <div class="import-save-bar">
                    <div class="import-save-summary" id="import-save-summary">0건 선택됨</div>
                    <button class="btn btn-ghost" onclick="ImportPage.clearAll()">🗑️ 초기화</button>
                    <button class="btn btn-primary" id="btn-import-save" onclick="ImportPage.saveSelected()">
                        ✅ 선택 항목 등록
                    </button>
                </div>

                <div class="import-result-bar" id="import-result-bar"></div>
            </div>

        </div>
        `;
    },

    async afterRender() {
        this._rows = [];
        this._categories = await Store.getCategories();

        const fileExcel = document.getElementById('file-excel');
        if (fileExcel) {
            fileExcel.addEventListener('change', (e) => {
                if (e.target.files[0]) this.handleExcelFile(e.target.files[0]);
            });
        }

        const fileImg = document.getElementById('file-image');
        if (fileImg) {
            fileImg.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.handleImageFiles(Array.from(e.target.files));
            });
        }

        this._bindDrop('dropzone-excel', (files) => {
            const f = files.find(f => /\.(xlsx|xls|csv)$/i.test(f.name));
            if (f) this.handleExcelFile(f);
            else Utils.toast('엑셀 파일(.xlsx, .xls, .csv)만 지원합니다', 'error');
        });

        this._bindDrop('dropzone-image', (files) => {
            const imgs = files.filter(f => /\.(png|jpg|jpeg|gif|bmp|webp|heic)$/i.test(f.name));
            if (imgs.length > 0) this.handleImageFiles(imgs);
            else Utils.toast('이미지 파일만 지원합니다', 'error');
        });

        document.getElementById('import-tbody')?.addEventListener('change', () => {
            this.updateSaveSummary();
        });
    },

    switchTab(tab) {
        this._activeTab = tab;
        ['excel', 'image'].forEach(t => {
            document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
            document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
        });
    },

    _bindDrop(zoneId, callback) {
        const zone = document.getElementById(zoneId);
        if (!zone) return;
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) callback(files);
        });
    },

    async handleExcelFile(file) {
        this.showProgress('excel', `"${file.name}" 분석 중...`);
        this.hideMappingSection();
        this.hidePreview();

        try {
            const rows = await this._parseExcel(file);
            if (!rows || rows.length < 2) {
                this.hideProgress('excel');
                Utils.toast('파일에 데이터가 없거나 형식이 맞지 않습니다', 'error');
                return;
            }

            const header = rows[0].map(c => String(c || '').trim());
            const dataRows = rows.slice(1).filter(r => r.some(c => c !== null && c !== '' && c !== undefined));

            const mapping = this._autoDetectColumns(header);
            this._renderMappingUI(header, mapping);

            this._rawRows = dataRows;
            this._rawHeader = header;
            this._currentMapping = mapping;

            this.hideProgress('excel');
            document.getElementById('col-mapping-section').classList.add('visible');
            this.applyMapping();

        } catch(e) {
            this.hideProgress('excel');
            Utils.toast('파일 파싱 오류: ' + e.message, 'error');
            console.error(e);
        }
    },

    async _parseExcel(file) {
        if (typeof XLSX === 'undefined') {
            await this._loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    resolve(json);
                } catch(err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    _autoDetectColumns(header) {
        const mapping = { date: -1, income: -1, expense: -1, balance: -1, memo: -1 };

        const patterns = {
            date:    /날짜|일자|거래일|transaction.*date|date/i,
            income:  /입금|수입|입금액|credit|deposit|income/i,
            expense: /출금|지출|출금액|debit|withdraw|expense/i,
            balance: /잔액|balance|잔고/i,
            memo:    /적요|메모|내용|설명|remark|memo|desc|note/i,
        };

        header.forEach((col, idx) => {
            Object.keys(patterns).forEach(key => {
                if (mapping[key] === -1 && patterns[key].test(col)) {
                    mapping[key] = idx;
                }
            });
        });

        if (mapping.date === -1 && header.length > 0) mapping.date = 0;
        if (mapping.income === -1 && header.length > 1) mapping.income = 1;
        if (mapping.expense === -1 && header.length > 2) mapping.expense = 2;
        if (mapping.memo === -1 && header.length > 4) mapping.memo = 4;

        return mapping;
    },

    _renderMappingUI(header, mapping) {
        const grid = document.getElementById('col-mapping-grid');
        if (!grid) return;

        const fields = [
            { key: 'date',    label: '📅 날짜 컬럼' },
            { key: 'income',  label: '📈 입금액 컬럼' },
            { key: 'expense', label: '📉 출금액 컬럼' },
            { key: 'balance', label: '💰 잔액 컬럼 (선택)' },
            { key: 'memo',    label: '📝 메모/적요 컬럼 (선택)' },
        ];

        const options = [
            '<option value="-1">— 해당없음 —</option>',
            ...header.map((col, i) => `<option value="${i}">${i + 1}. ${col || '(빈 컬럼)'}</option>`)
        ].join('');

        grid.innerHTML = fields.map(f => `
            <div class="col-mapping-item">
                <label>${f.label}</label>
                <select id="map-${f.key}" onchange="ImportPage._onMappingChange()">
                    ${options}
                </select>
            </div>
        `).join('');

        fields.forEach(f => {
            const sel = document.getElementById(`map-${f.key}`);
            if (sel) sel.value = String(mapping[f.key]);
        });
    },

    _onMappingChange() {
        const keys = ['date', 'income', 'expense', 'balance', 'memo'];
        keys.forEach(k => {
            const el = document.getElementById(`map-${k}`);
            if (el) this._currentMapping[k] = parseInt(el.value);
        });
    },

    applyMapping() {
        if (!this._rawRows) return;

        const mapping = this._currentMapping || {};
        const rows = [];

        this._rawRows.forEach((row, ridx) => {
            const dateVal = mapping.date >= 0 ? row[mapping.date] : '';
            const incVal  = mapping.income >= 0  ? row[mapping.income]  : 0;
            const expVal  = mapping.expense >= 0 ? row[mapping.expense] : 0;
            const memoVal = mapping.memo >= 0    ? row[mapping.memo]    : '';

            const parsedDate = this._parseDate(dateVal);
            if (!parsedDate) return;

            const incAmt  = this._parseNumber(incVal);
            const expAmt  = this._parseNumber(expVal);

            if (incAmt <= 0 && expAmt <= 0) return;

            if (incAmt > 0) {
                rows.push({
                    _idx: `excel_${ridx}_inc`,
                    date: parsedDate,
                    type: 'income',
                    amount: incAmt,
                    memo: String(memoVal || '').trim(),
                    method: 'transfer',
                    isDup: false,
                });
            }
            if (expAmt > 0) {
                rows.push({
                    _idx: `excel_${ridx}_exp`,
                    date: parsedDate,
                    type: 'expense',
                    amount: expAmt,
                    memo: String(memoVal || '').trim(),
                    method: 'transfer',
                    isDup: false,
                });
            }
        });

        this._rows = rows;
        this._checkDuplicates().then(() => this.renderPreview());
    },

    async handleImageFiles(files) {
        this.showProgress('image', 'Tesseract.js 로드 중... (최초 1회)');
        this.hidePreview();

        const previewWrap = document.getElementById('img-preview-wrap');
        const rawBox = document.getElementById('ocr-raw-box');
        previewWrap.innerHTML = '';
        previewWrap.classList.remove('visible');
        rawBox.textContent = '';
        rawBox.classList.remove('visible');

        try {
            if (typeof Tesseract === 'undefined') {
                await this._loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
            }

            let allText = '';
            const allRows = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                this.showProgress('image', `OCR 분석 중... (${i + 1}/${files.length})`);

                const imgUrl = URL.createObjectURL(file);
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = file.name;
                previewWrap.appendChild(img);
                previewWrap.classList.add('visible');

                const result = await Tesseract.recognize(file, 'kor+eng', {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            const pct = Math.round((m.progress || 0) * 100);
                            this.showProgress('image', `OCR 인식 중... ${pct}% (${i + 1}/${files.length})`);
                        }
                    }
                });

                const text = result.data.text || '';
                allText += `\n--- 이미지 ${i + 1} ---\n` + text;

                const extracted = this._extractFromOCRText(text);
                allRows.push(...extracted);
            }

            if (allText.trim()) {
                rawBox.textContent = allText.trim();
                rawBox.classList.add('visible');
            }

            this.hideProgress('image');

            if (allRows.length === 0) {
                Utils.toast('거래 내역을 인식하지 못했습니다. 선명한 이미지를 사용해주세요.', 'error');
                return;
            }

            this._rows = allRows;
            await this._checkDuplicates();
            this.renderPreview();

        } catch(e) {
            this.hideProgress('image');
            Utils.toast('OCR 오류: ' + e.message, 'error');
            console.error('OCR error:', e);
        }
    },

    _extractFromOCRText(text) {
        const rows = [];
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        const incomeKw = /입금|수입|적립|환급|이자|급여|월급|매출|받음/;
        const expenseKw = /출금|지출|결제|이체|납부|사용|인출/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const dateMatch = line.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
            const dateMatchShort = line.match(/(\d{1,2})[.\-\/](\d{1,2})/);

            const amountMatches = [...line.matchAll(/([+-]?\d{1,3}(?:,\d{3})+|\d{4,})/g)];
            if (amountMatches.length === 0) continue;

            let parsedDate = null;
            if (dateMatch) {
                parsedDate = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[3]).padStart(2,'0')}`;
            } else if (dateMatchShort) {
                const now = new Date();
                parsedDate = `${now.getFullYear()}-${String(dateMatchShort[1]).padStart(2,'0')}-${String(dateMatchShort[2]).padStart(2,'0')}`;
            }

            if (!parsedDate) continue;

            const amounts = amountMatches.map(m => this._parseNumber(m[1])).filter(a => a > 0);
            if (amounts.length === 0) continue;
            const mainAmt = Math.max(...amounts);
            if (mainAmt < 100) continue;

            let type = 'expense';
            const isNegative = /[-−]\s*\d/.test(line);
            if (incomeKw.test(line) && !isNegative) type = 'income';
            if (expenseKw.test(line) || isNegative) type = 'expense';

            const memoText = line
                .replace(/\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/g, '')
                .replace(/\d{1,3}(?:,\d{3})+/g, '')
                .replace(/[+\-=|│]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 40);

            rows.push({
                _idx: `ocr_${i}_${Date.now()}`,
                date: parsedDate,
                type,
                amount: mainAmt,
                memo: memoText,
                method: 'transfer',
                isDup: false,
            });
        }

        return rows;
    },

    async _checkDuplicates() {
        if (this._rows.length === 0) return;

        try {
            const dates = this._rows.map(r => r.date).filter(Boolean).sort();
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];

            const existing = await Store.getTransactions({ startDate: minDate, endDate: maxDate });
            const existingSet = new Set(
                existing.map(t => `${Utils.formatDate(t.tx_date)}_${Utils.parseAmount(t.amount)}_${String(t.type).toLowerCase()}`)
            );

            this._rows.forEach(row => {
                const key = `${row.date}_${row.amount}_${row.type}`;
                row.isDup = existingSet.has(key);
            });
        } catch(e) {
            console.warn('중복 체크 실패:', e);
        }
    },

    renderPreview() {
        const section = document.getElementById('import-preview-section');
        const tbody = document.getElementById('import-tbody');
        const countEl = document.getElementById('preview-count');
        if (!section || !tbody) return;

        if (this._rows.length === 0) {
            section.classList.remove('visible');
            return;
        }

        section.classList.add('visible');
        countEl.textContent = `${this._rows.length}건`;

        tbody.innerHTML = this._rows.map((row, i) => {
            const isIncome = row.type === 'income';
            const amtClass = isIncome ? 'amount-income' : 'amount-expense';
            const dupBadge = row.isDup
                ? '<span class="badge-dup">⚠️ 중복</span>'
                : '<span class="badge-new">✅ 신규</span>';

            return `
            <tr data-idx="${i}" class="${row.isDup ? 'skipped' : ''}">
                <td>
                    <input type="checkbox" class="import-row-cb" data-idx="${i}"
                        ${row.isDup ? '' : 'checked'}
                        style="cursor:pointer;width:15px;height:15px"
                        onchange="ImportPage._onRowCheck(${i}, this.checked)">
                </td>
                <td>
                    <input type="date" class="import-date" data-idx="${i}"
                        value="${row.date}"
                        onchange="ImportPage._onFieldChange(${i},'date',this.value)">
                </td>
                <td>
                    <select class="import-type" data-idx="${i}"
                        onchange="ImportPage._onFieldChange(${i},'type',this.value)">
                        <option value="expense" ${!isIncome ? 'selected' : ''}>📉 지출</option>
                        <option value="income"  ${isIncome ? 'selected' : ''}>📈 수입</option>
                    </select>
                </td>
                <td>
                    <select class="import-method" data-idx="${i}"
                        onchange="ImportPage._onFieldChange(${i},'method',this.value)">
                        <option value="transfer" ${row.method === 'transfer' ? 'selected' : ''}>💳 계좌이체</option>
                        <option value="cash"     ${row.method === 'cash' ? 'selected' : ''}>💵 현금</option>
                    </select>
                </td>
                <td class="${amtClass}">
                    <input type="text" class="import-amount" data-idx="${i}"
                        value="${row.amount.toLocaleString('ko-KR')}"
                        inputmode="numeric"
                        onchange="ImportPage._onFieldChange(${i},'amount',this.value)"
                        style="text-align:right;font-weight:700;min-width:100px">
                </td>
                <td>
                    <input type="text" class="import-memo" data-idx="${i}"
                        value="${Utils.escapeHtml(row.memo || '')}"
                        placeholder="메모 (선택)"
                        onchange="ImportPage._onFieldChange(${i},'memo',this.value)"
                        style="min-width:120px;max-width:200px">
                </td>
                <td>${dupBadge}</td>
            </tr>
            `;
        }).join('');

        this.updateSaveSummary();
    },

    _onFieldChange(idx, field, value) {
        if (!this._rows[idx]) return;
        if (field === 'amount') {
            this._rows[idx].amount = Utils.parseAmount(value);
        } else {
            this._rows[idx][field] = value;
        }
    },

    _onRowCheck(idx, checked) {
        const row = document.querySelector(`tr[data-idx="${idx}"]`);
        if (row) row.classList.toggle('skipped', !checked);
        this.updateSaveSummary();
    },

    toggleAllRows(checked) {
        document.querySelectorAll('.import-row-cb').forEach(cb => {
            cb.checked = checked;
            const idx = parseInt(cb.dataset.idx);
            const row = document.querySelector(`tr[data-idx="${idx}"]`);
            if (row) row.classList.toggle('skipped', !checked);
        });
        const selectAll = document.getElementById('import-select-all');
        if (selectAll) selectAll.checked = checked;
        this.updateSaveSummary();
    },

    skipDuplicates() {
        document.querySelectorAll('.import-row-cb').forEach(cb => {
            const idx = parseInt(cb.dataset.idx);
            if (this._rows[idx] && this._rows[idx].isDup) {
                cb.checked = false;
                const row = document.querySelector(`tr[data-idx="${idx}"]`);
                if (row) row.classList.add('skipped');
            }
        });
        this.updateSaveSummary();
    },

    updateSaveSummary() {
        const checked = document.querySelectorAll('.import-row-cb:checked');
        const summaryEl = document.getElementById('import-save-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `<strong>${checked.length}건</strong> 선택됨`;
        }
    },

    async saveSelected() {
        const checked = [...document.querySelectorAll('.import-row-cb:checked')];
        if (checked.length === 0) {
            Utils.toast('등록할 항목을 선택하세요', 'info');
            return;
        }

        const btn = document.getElementById('btn-import-save');
        if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

        const cats = this._categories;
        const defaultExpCat = cats.find(c => c.type === 'expense') || { id: 6 };
        const defaultIncCat = cats.find(c => c.type === 'income')  || { id: 9 };

        let successCount = 0;
        let failCount = 0;
        const resultBar = document.getElementById('import-result-bar');

        for (const cb of checked) {
            const idx = parseInt(cb.dataset.idx);
            const row = this._rows[idx];
            if (!row) continue;

            const dateEl   = document.querySelector(`.import-date[data-idx="${idx}"]`);
            const typeEl   = document.querySelector(`.import-type[data-idx="${idx}"]`);
            const methodEl = document.querySelector(`.import-method[data-idx="${idx}"]`);
            const amtEl    = document.querySelector(`.import-amount[data-idx="${idx}"]`);
            const memoEl   = document.querySelector(`.import-memo[data-idx="${idx}"]`);

            const finalDate   = dateEl?.value   || row.date;
            const finalType   = typeEl?.value   || row.type;
            const finalMethod = methodEl?.value || row.method;
            const finalAmt    = Utils.parseAmount(amtEl?.value ?? row.amount);
            const finalMemo   = memoEl?.value   ?? row.memo;

            if (finalAmt <= 0) { failCount++; continue; }

            const catId = finalType === 'income'
                ? (defaultIncCat.id || 9)
                : (defaultExpCat.id || 6);

            try {
                await Store.addTransaction({
                    tx_date: finalDate,
                    type: finalType,
                    amount: finalAmt,
                    category_id: catId,
                    payment_method: finalMethod,
                    memo: finalMemo || '가져오기',
                });
                successCount++;
            } catch(e) {
                failCount++;
                console.error('저장 실패:', e, row);
            }
        }

        if (btn) { btn.disabled = false; btn.textContent = '✅ 선택 항목 등록'; }

        if (resultBar) {
            resultBar.className = successCount > 0 ? 'import-result-bar success' : 'import-result-bar error';
            resultBar.innerHTML = successCount > 0
                ? `✅ ${successCount}건 등록 완료! ${failCount > 0 ? '(' + failCount + '건 실패)' : ''} — <a href="#" onclick="Router.navigate('personal');return false;" style="color:inherit;font-weight:700;text-decoration:underline">가계부에서 확인</a>`
                : `❌ 저장에 실패했습니다. 다시 시도해주세요.`;
        }

        if (successCount > 0) {
            Utils.toast(`${successCount}건이 가계부에 등록되었습니다!`, 'success');

            checked.forEach(cb => {
                const idx = parseInt(cb.dataset.idx);
                if (this._rows[idx]) this._rows[idx].isDup = true;
                cb.checked = false;
                const tr = document.querySelector(`tr[data-idx="${idx}"]`);
                if (tr) {
                    tr.classList.add('skipped');
                    const badge = tr.querySelector('td:last-child');
                    if (badge) badge.innerHTML = '<span class="badge-dup">✅ 등록됨</span>';
                }
            });

            this.updateSaveSummary();
        }
    },

    clearAll() {
        this._rows = [];
        this._rawRows = null;
        this._rawHeader = null;
        this._currentMapping = null;

        const fe = document.getElementById('file-excel');
        const fi = document.getElementById('file-image');
        if (fe) fe.value = '';
        if (fi) fi.value = '';

        this.hideMappingSection();
        this.hidePreview();

        const rawBox = document.getElementById('ocr-raw-box');
        if (rawBox) { rawBox.textContent = ''; rawBox.classList.remove('visible'); }

        const imgWrap = document.getElementById('img-preview-wrap');
        if (imgWrap) { imgWrap.innerHTML = ''; imgWrap.classList.remove('visible'); }

        const resultBar = document.getElementById('import-result-bar');
        if (resultBar) resultBar.className = 'import-result-bar';

        Utils.toast('초기화되었습니다', 'info');
    },

    showProgress(type, text) {
        const el = document.getElementById(`${type}-progress`);
        const txt = document.getElementById(`${type}-progress-text`);
        if (el) el.classList.add('visible');
        if (txt) txt.textContent = text;
    },

    hideProgress(type) {
        const el = document.getElementById(`${type}-progress`);
        if (el) el.classList.remove('visible');
    },

    hideMappingSection() {
        document.getElementById('col-mapping-section')?.classList.remove('visible');
    },

    hidePreview() {
        document.getElementById('import-preview-section')?.classList.remove('visible');
    },

    _parseDate(val) {
        if (!val) return null;

        if (val instanceof Date) {
            if (isNaN(val.getTime())) return null;
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        const s = String(val).trim();
        if (!s) return null;

        let match = s.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
        if (match) return `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;

        const num = parseFloat(s);
        if (!isNaN(num) && num > 40000 && num < 60000) {
            const d = new Date(Date.UTC(1899, 11, 30) + num * 86400000);
            if (!isNaN(d.getTime())) {
                return d.toISOString().slice(0, 10);
            }
        }

        return null;
    },

    _parseNumber(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return Math.abs(val);
        const s = String(val).replace(/[,\s₩원]/g, '').replace(/[+]/g, '');
        const n = parseFloat(s.replace(/-/, ''));
        return isNaN(n) ? 0 : Math.abs(n);
    },

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
            document.head.appendChild(s);
        });
    },
};

Router.register('import', ImportPage);