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
                        <button class="btn btn-primary btn-sm" onclick="ImportPage.addNewRow()">+ 수기 행 추가</button>
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
                                <th>등록 대상</th>
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
        const dropExcel = document.getElementById('dropzone-excel');
        if (fileExcel) {
            fileExcel.addEventListener('change', (e) => {
                if (e.target.files[0]) this.handleExcelFile(e.target.files[0]);
            });
        }
        if (dropExcel && fileExcel) {
            dropExcel.addEventListener('click', (e) => {
                if (e.target !== fileExcel) fileExcel.click();
            });
        }

        const fileImg = document.getElementById('file-image');
        const dropImg = document.getElementById('dropzone-image');
        if (fileImg) {
            fileImg.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.handleImageFiles(Array.from(e.target.files));
            });
        }
        if (dropImg && fileImg) {
            dropImg.addEventListener('click', (e) => {
                if (e.target !== fileImg) fileImg.click();
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

        // 탭 버튼 이벤트 확실한 바인딩
        document.getElementById('tab-excel')?.addEventListener('click', () => this.switchTab('excel'));
        document.getElementById('tab-image')?.addEventListener('click', () => this.switchTab('image'));

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
        if (!this._currentMapping) this._currentMapping = {};
        keys.forEach(k => {
            const el = document.getElementById(`map-${k}`);
            if (el) this._currentMapping[k] = parseInt(el.value);
        });
    },

    applyMapping() {
        if (!this._rawRows || this._rawRows.length === 0) {
            Utils.toast('파싱할 엑셀 데이터가 없습니다.', 'error');
            return;
        }

        // 최신 셀렉트 박스 값 직접 읽기
        this._onMappingChange();
        const mapping = this._currentMapping || {};
        const rawRows = [];

        this._rawRows.forEach((row, ridx) => {
            const dateVal = mapping.date >= 0 ? row[mapping.date] : '';
            const incVal  = mapping.income >= 0  ? row[mapping.income]  : 0;
            const expVal  = mapping.expense >= 0 ? row[mapping.expense] : 0;
            const memoVal = mapping.memo >= 0    ? row[mapping.memo]    : '';

            const parsed = this._parseDateTime(dateVal, ridx);
            if (!parsed || !parsed.date) return;

            const incAmt  = this._parseNumber(incVal);
            const expAmt  = this._parseNumber(expVal);

            if (incAmt <= 0 && expAmt <= 0) return;

            if (incAmt > 0) {
                rawRows.push({
                    _idx: `excel_${ridx}_inc`,
                    date: parsed.date,
                    time: parsed.time,
                    created_at: parsed.fullISO,
                    type: 'income',
                    amount: incAmt,
                    memo: String(memoVal || '').trim(),
                    method: 'transfer',
                    isDup: false,
                });
            }
            if (expAmt > 0) {
                rawRows.push({
                    _idx: `excel_${ridx}_exp`,
                    date: parsed.date,
                    time: parsed.time,
                    created_at: parsed.fullISO,
                    type: 'expense',
                    amount: expAmt,
                    memo: String(memoVal || '').trim(),
                    method: 'transfer',
                    isDup: false,
                });
            }
        });

        if (rawRows.length === 0) {
            Utils.toast('선택한 컬럼에서 유효한 거래 내역(날짜/금액)을 찾지 못했습니다. 매핑 설정을 확인해주세요.', 'error');
            return;
        }

        // ① 배치 내 자체 중복 제거 (날짜+금액+구분 동일)
        const { unique, batchDupCount } = this._deduplicateRows(rawRows);
        this._rows = unique;

        this._checkDuplicates().then(dbDupCount => {
            const total = batchDupCount + dbDupCount;
            this.renderPreview();
            if (total > 0) {
                Utils.toast(`🗑️ 중복 ${total}건 자동 제거 (파일내 ${batchDupCount}건 + 기존DB ${dbDupCount}건)`, 'info');
            } else {
                Utils.toast(`✅ ${this._rows.length}건의 거래 내역을 불러왔습니다.`, 'success');
            }
        });
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

            // ① 배치 내 자체 중복 제거
            const { unique, batchDupCount } = this._deduplicateRows(allRows);
            this._rows = unique;

            const dbDupCount = await this._checkDuplicates();
            this.renderPreview();

            const total = batchDupCount + dbDupCount;
            if (total > 0) {
                Utils.toast(`🗑️ 중복 ${total}건 자동 제거 (이미지내 ${batchDupCount}건 + DB중복 ${dbDupCount}건)`, 'info');
            }

        } catch(e) {
            this.hideProgress('image');
            Utils.toast('OCR 오류: ' + e.message, 'error');
            console.error('OCR error:', e);
        }
    },

    _extractFromOCRText(text) {
        const rows = [];
        if (!text || !text.trim()) return rows;

        // 1. 기간 범위 라인 및 상단 UI 헤더 필터링
        const isDateRangeHeader = (line) => {
            return /\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4}\s*[-~]\s*\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4}/.test(line) ||
                   /(?:1개월|3개월|6개월|조회기간|계좌\s*정보|거래이력|거래내역)/.test(line);
        };

        // 2. 단일 거래 시작 일시 매칭 (Anchor)
        const matchTxDateTime = (line) => {
            if (isDateRangeHeader(line)) return null;

            // DD/MM/YYYY HH:mm:ss or HH:mm
            const dmyMatch = line.match(/(?:^|[^\d])(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
            if (dmyMatch) {
                const date = `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, '0')}-${String(dmyMatch[1]).padStart(2, '0')}`;
                const time = dmyMatch[4] ? `${String(dmyMatch[4]).padStart(2, '0')}:${String(dmyMatch[5]).padStart(2, '0')}:${dmyMatch[6] ? String(dmyMatch[6]).padStart(2, '0') : '00'}` : '12:00:00';
                return { date, time };
            }

            // YYYY.MM.DD HH:mm:ss or HH:mm
            const ymdMatch = line.match(/(?:^|[^\d])(\d{4})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})(?:일)?(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
            if (ymdMatch) {
                const date = `${ymdMatch[1]}-${String(ymdMatch[2]).padStart(2, '0')}-${String(ymdMatch[3]).padStart(2, '0')}`;
                const time = ymdMatch[4] ? `${String(ymdMatch[4]).padStart(2, '0')}:${String(ymdMatch[5]).padStart(2, '0')}:${ymdMatch[6] ? String(ymdMatch[6]).padStart(2, '0') : '00'}` : '12:00:00';
                return { date, time };
            }

            // 단축 MM.DD or MM/DD
            const mdMatch = line.match(/(?:^|[^\d])(\d{1,2})[.\-\/월]\s*(\d{1,2})(?:일)?(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
            if (mdMatch && !line.includes('개월')) {
                const now = new Date();
                const date = `${now.getFullYear()}-${String(mdMatch[1]).padStart(2, '0')}-${String(mdMatch[2]).padStart(2, '0')}`;
                const time = mdMatch[3] ? `${String(mdMatch[3]).padStart(2, '0')}:${String(mdMatch[4]).padStart(2, '0')}:00` : '12:00:00';
                return { date, time };
            }

            return null;
        };

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const blocks = [];
        let currentBlock = null;

        // 거래 블록 분할
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (isDateRangeHeader(line)) continue;

            const dt = matchTxDateTime(line);
            if (dt) {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = { dt, lines: [line] };
            } else if (currentBlock) {
                currentBlock.lines.push(line);
            }
        }
        if (currentBlock) blocks.push(currentBlock);

        // 각 거래 블록 정밀 파싱
        for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
            const b = blocks[bIdx];
            const fullBlockText = b.lines.join(' ');

            // 잔액 라인 제외
            const contentLines = b.lines.filter(l => !/(?:잔액|잔고|số dư|so du|balance|차기잔액)/i.test(l));

            let foundAmt = null;
            let type = 'expense';

            // 1. 부호가 붙은 금액 우선 탐색 (+ 130,000, - 19,600, - 1,596,000 등)
            for (const line of contentLines) {
                const signMatch = line.match(/([+\-−])\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);
                if (signMatch) {
                    const sign = signMatch[1];
                    const rawNum = parseInt(signMatch[2].replace(/[.,]/g, ''), 10);
                    if (rawNum >= 100 && rawNum !== 2025 && rawNum !== 2026 && rawNum !== 2027) {
                        foundAmt = rawNum;
                        type = (sign === '+') ? 'income' : 'expense';
                        break;
                    }
                }
            }

            // 2. 부호 없는 일반 거래 금액 탐색
            if (!foundAmt) {
                for (const line of contentLines) {
                    // 승인번호/전문번호/계좌번호(슬래시 포함 긴 숫자 및 8자리 이상) 및 연도 제거
                    const cleanLine = line
                        .replace(/\d{5,}\/\d+/g, '')
                        .replace(/\b\d{8,}\b/g, '')
                        .replace(/202[4-9]/g, '');

                    const amtMatch = cleanLine.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);
                    if (amtMatch) {
                        const num = parseInt(amtMatch[1].replace(/[.,]/g, ''), 10);
                        if (num >= 100 && num !== 2025 && num !== 2026 && num !== 2027) {
                            foundAmt = num;
                            if (/(?:입금|수입|이자|급여|월급|nhận|thu|nạp|\+)/i.test(fullBlockText)) type = 'income';
                            else type = 'expense';
                            break;
                        }
                    }
                }
            }

            if (!foundAmt) continue;

            // 3. 적요 및 메모 정밀 추출
            const memoParts = [];
            for (const line of contentLines) {
                let m = line
                    .replace(/\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4}/g, '')
                    .replace(/\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/g, '')
                    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, '')
                    .replace(/[+\-−]?\s*\d{1,3}(?:[.,]\d{3})+/g, '')
                    .replace(/[+\-−]\s*\d+/g, '')
                    .replace(/[>│|]/g, '')
                    .trim();

                if (m && !/(?:전체|입금|출금|1개월|조회)/.test(m)) {
                    memoParts.push(m);
                }
            }

            let memoText = memoParts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 45);

            // 사람 이름 입금인 경우 수입으로 자동 보정
            if (type === 'expense' && Utils.isLikelyMemberName(memoText) && !/(?:송금|출금|결제|당발)/.test(memoText)) {
                type = 'income';
            }

            rows.push({
                _idx: `ocr_${bIdx}_${Date.now()}_${Math.random()}`,
                date: b.dt.date,
                created_at: `${b.dt.date}T${b.dt.time}`,
                type,
                amount: foundAmt,
                memo: memoText || (type === 'income' ? '입금' : '지출'),
                method: 'transfer',
                isDup: false
            });
        }

        return rows;
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 중복 제거 유틸
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * 배치(업로드한 파일) 내 자체 중복 제거
     * 기준: 날짜 + 금액 + 구분(입금/출금) 동일
     */
    _deduplicateRows(rows) {
        const seen = new Set();
        const unique = [];
        let batchDupCount = 0;

        rows.forEach(row => {
            const key = `${row.date}_${row.amount}_${row.type}`;
            if (seen.has(key)) {
                batchDupCount++;
            } else {
                seen.add(key);
                unique.push(row);
            }
        });

        return { unique, batchDupCount };
    },

    /**
     * DB(Supabase) 기존 내역과 비교해 중복 자동 제거
     * 기준: 날짜 + 금액 + 구분 동일
     * 반환: 제거된 건수
     */
    async _checkDuplicates() {
        if (this._rows.length === 0) return 0;

        try {
            const dates = this._rows.map(r => r.date).filter(Boolean).sort();
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];

            const existing = await Store.getTransactions({ startDate: minDate, endDate: maxDate });
            const existingSet = new Set(
                existing.map(t => `${Utils.formatDate(t.tx_date)}_${Utils.parseAmount(t.amount)}_${String(t.type).toLowerCase()}`)
            );

            const before = this._rows.length;
            this._rows = this._rows.filter(row => {
                const key = `${row.date}_${row.amount}_${row.type}`;
                return !existingSet.has(key);
            });
            const dbDupCount = before - this._rows.length;

            return dbDupCount;
        } catch(e) {
            console.warn('중복 체크 실패:', e);
            return 0;
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

            // 기본 타겟 자동 감지: 입금 중 사람 이름이 있는 건은 게임회비로 기본 설정
            const isDues = row.target ? (row.target === 'gamedues') : Utils.isLikelyGameDues(row.type, row.memo);
            const detectedName = Utils.extractMemberName(row.memo);

            return `
            <tr data-idx="${i}">
                <td>
                    <input type="checkbox" class="import-row-cb" data-idx="${i}"
                        checked
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
                    <select class="import-target" data-idx="${i}"
                        onchange="ImportPage._onFieldChange(${i},'target',this.value)"
                        style="font-weight:600;color:${isDues ? '#fbbf24' : '#818cf8'};background:${isDues ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.1)'}">
                        <option value="personal" ${!isDues ? 'selected' : ''}>💰 개인 가계부</option>
                        <option value="gamedues" ${isDues ? 'selected' : ''}>🎮 게임회비${detectedName ? ' (' + detectedName + ')' : ''}</option>
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
                <td><span class="badge-new">${isDues ? '🎮 회비감지' : '✅ 신규'}</span></td>
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

        let personalCount = 0;
        let gameDuesCount = 0;
        let failCount = 0;
        const resultBar = document.getElementById('import-result-bar');

        for (const cb of checked) {
            const idx = parseInt(cb.dataset.idx);
            const row = this._rows[idx];
            if (!row) continue;

            const dateEl   = document.querySelector(`.import-date[data-idx="${idx}"]`);
            const typeEl   = document.querySelector(`.import-type[data-idx="${idx}"]`);
            const targetEl = document.querySelector(`.import-target[data-idx="${idx}"]`);
            const methodEl = document.querySelector(`.import-method[data-idx="${idx}"]`);
            const amtEl    = document.querySelector(`.import-amount[data-idx="${idx}"]`);
            const memoEl   = document.querySelector(`.import-memo[data-idx="${idx}"]`);

            const finalDate   = dateEl?.value   || row.date;
            const finalType   = typeEl?.value   || row.type;
            const finalTarget = targetEl?.value || (Utils.isLikelyGameDues(finalType, row.memo) ? 'gamedues' : 'personal');
            const finalMethod = methodEl?.value || row.method;
            const finalAmt    = Utils.parseAmount(amtEl?.value ?? row.amount);
            const finalMemo   = memoEl?.value   ?? row.memo;

            if (finalAmt <= 0) { failCount++; continue; }

            try {
                const createdAt = row.created_at || (row.time ? `${finalDate}T${row.time}+07:00` : null);

                if (finalTarget === 'gamedues') {
                    // 🎮 게임회비로 분리 저장 (개인 가계부/자산에 미반영)
                    if (finalType === 'income') {
                        const memberName = Utils.extractMemberName(finalMemo) || 'MEMBERS';
                        await Store.addGameDuesIncome({
                            tx_date: finalDate,
                            member_name: memberName,
                            amount: finalAmt,
                            memo: finalMemo,
                            created_at: createdAt
                        });
                    } else {
                        await Store.addGameDuesExpense({
                            tx_date: finalDate,
                            title: finalMemo || '식사/모임 지출',
                            amount: finalAmt,
                            memo: finalMemo,
                            created_at: createdAt
                        });
                    }
                    gameDuesCount++;
                } else {
                    // 💰 개인 가계부로 저장
                    const catId = finalType === 'income'
                        ? (defaultIncCat.id || 9)
                        : (defaultExpCat.id || 6);

                    await Store.addTransaction({
                        tx_date: finalDate,
                        created_at: createdAt,
                        type: finalType,
                        amount: finalAmt,
                        category_id: catId,
                        payment_method: finalMethod,
                        memo: finalMemo || '가져오기',
                    });
                    personalCount++;
                }
            } catch(e) {
                failCount++;
                console.error('저장 실패:', e, row);
            }
        }

        if (btn) { btn.disabled = false; btn.textContent = '✅ 선택 항목 등록'; }

        const totalSuccess = personalCount + gameDuesCount;
        if (resultBar) {
            resultBar.className = totalSuccess > 0 ? 'import-result-bar success' : 'import-result-bar error';
            resultBar.innerHTML = totalSuccess > 0
                ? `✅ 총 ${totalSuccess}건 등록 완료! (개인 가계부: ${personalCount}건, 🎮 게임회비: ${gameDuesCount}건)`
                : `❌ 저장에 실패했습니다. 다시 시도해주세요.`;
        }

        if (totalSuccess > 0) {
            Utils.toast(`가계부 ${personalCount}건 + 게임회비 ${gameDuesCount}건 등록 완료!`, 'success');

            checked.forEach(cb => {
                cb.checked = false;
                const tr = document.querySelector(`tr[data-idx="${cb.dataset.idx}"]`);
                if (tr) {
                    tr.classList.add('skipped');
                    const badge = tr.querySelector('td:last-child');
                    if (badge) badge.innerHTML = '<span class="badge-new" style="background:rgba(16,185,129,0.15);color:#34d399">✅ 등록됨</span>';
                }
            });

            this.updateSaveSummary();
        }
    },

    addNewRow() {
        const newRow = {
            _idx: `manual_${Date.now()}`,
            date: Utils.today(),
            type: 'expense',
            target: 'personal',
            amount: 0,
            memo: '',
            method: 'transfer',
            isDup: false
        };
        this._rows.push(newRow);
        this.renderPreview();
        Utils.toast('새 행이 추가되었습니다. 날짜와 금액을 입력하세요.', 'info');

        // 새로 추가된 행의 금액 인풋으로 포커스
        setTimeout(() => {
            const lastIdx = this._rows.length - 1;
            const amtEl = document.querySelector(`.import-amount[data-idx="${lastIdx}"]`);
            if (amtEl) amtEl.focus();
        }, 100);
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

    _parseDateTime(val, ridx = 0) {
        if (!val && val !== 0) return null;

        let dateStr = null;
        let timeStr = null;

        // 1. Date 객체인 경우 (Excel 라이브러리가 파싱한 경우)
        if (val instanceof Date) {
            if (isNaN(val.getTime())) return null;
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;

            const hh = val.getHours();
            const mm = val.getMinutes();
            const ss = val.getSeconds();
            // 자정이 아닌 실제 시간이 들어있는 경우
            if (hh !== 0 || mm !== 0 || ss !== 0) {
                timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
            }
        }

        const s = String(val).trim();

        // 2. 문자열 내에서 시간 패턴(HH:mm:ss 또는 HH:mm) 추출
        if (!timeStr && s) {
            const timeMatch = s.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (timeMatch) {
                const hh = String(timeMatch[1]).padStart(2, '0');
                const mm = String(timeMatch[2]).padStart(2, '0');
                const ss = String(timeMatch[3] || '00').padStart(2, '0');
                timeStr = `${hh}:${mm}:${ss}`;
            }
        }

        // 3. 날짜 파싱
        if (!dateStr && s) {
            // YYYY-MM-DD 또는 YYYY/MM/DD 또는 YYYY.MM.DD
            let m1 = s.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
            if (m1) {
                dateStr = `${m1[1]}-${String(m1[2]).padStart(2, '0')}-${String(m1[3]).padStart(2, '0')}`;
            }
            // DD/MM/YYYY 또는 DD-MM-YYYY 또는 DD.MM.YYYY
            if (!dateStr) {
                let m2 = s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/);
                if (m2) {
                    dateStr = `${m2[3]}-${String(m2[2]).padStart(2, '0')}-${String(m2[1]).padStart(2, '0')}`;
                }
            }
            // YYYYMMDD
            if (!dateStr) {
                let m3 = s.match(/^(\d{4})(\d{2})(\d{2})/);
                if (m3) {
                    dateStr = `${m3[1]}-${m3[2]}-${m3[3]}`;
                }
            }
            // Excel 일련번호 (소수점 포함 시 시간 계산)
            if (!dateStr) {
                const num = parseFloat(s);
                if (!isNaN(num) && num > 30000 && num < 70000) {
                    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
                    if (!isNaN(d.getTime())) {
                        dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                        if (!timeStr) {
                            const hh = d.getUTCHours();
                            const mm = d.getUTCMinutes();
                            const ss = d.getUTCSeconds();
                            if (hh !== 0 || mm !== 0 || ss !== 0) {
                                timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
                            }
                        }
                    }
                }
            }
        }

        if (!dateStr) return null;

        // 시간이 엑셀 원본에 없으면 깨끗하게 빈값 유지 (있을 때만 시간 표현)
        return {
            date: dateStr,
            time: timeStr || '',
            fullISO: timeStr ? `${dateStr}T${timeStr}+07:00` : null
        };
    },

    _parseDate(val) {
        const res = this._parseDateTime(val);
        return res ? res.date : null;
    },

    _parseNumber(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return Math.abs(val);
        // 통화기호, 쉼표, 공백, 플러스 기호 제거
        let s = String(val).trim().replace(/[,\s₩원VNDvndđĐ$]/g, '').replace(/^\+/, '');
        // 괄호 음수 표기 (1,000) -> 1000
        if (s.startsWith('(') && s.endsWith(')')) {
            s = s.slice(1, -1);
        }
        const n = parseFloat(s.replace(/^-/, ''));
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