/* ============================================
   SETTINGS.JS — 설정 페이지
   ============================================ */

const SettingsPage = {
    async render() {
        const settings = await Store.getAllSettings();

        return `
        <div class="settings-section">
            <h3 class="settings-section-title">💱 환율 설정</h3>
            <div class="setting-row">
                <div class="setting-label">
                    <span class="label-title">기본 환율 (1 KRW = ? VND)</span>
                    <span class="label-desc">환전 계산 시 기본 적용되는 환율</span>
                </div>
                <div class="setting-control">
                    <input type="number" id="setting-rate" value="${settings.default_exchange_rate || '18.5'}" step="0.1">
                </div>
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    <span class="label-title">기본 화폐</span>
                    <span class="label-desc">대시보드 표시 기준 화폐</span>
                </div>
                <div class="setting-control">
                    <select id="setting-currency">
                        <option value="VND" ${settings.default_currency === 'VND' ? 'selected' : ''}>VND (베트남 동)</option>
                        <option value="KRW" ${settings.default_currency === 'KRW' ? 'selected' : ''}>KRW (한국 원)</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3 class="settings-section-title">📦 데이터 백업 / 복원</h3>
            <div class="setting-row">
                <div class="setting-label">
                    <span class="label-title">데이터 내보내기 (JSON)</span>
                    <span class="label-desc">모든 데이터를 JSON 파일로 다운로드</span>
                </div>
                <div class="setting-control">
                    <button class="btn btn-primary" id="btn-export">📤 내보내기</button>
                </div>
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    <span class="label-title">데이터 가져오기 (JSON)</span>
                    <span class="label-desc">백업 파일에서 데이터 복원 (기존 데이터 유지)</span>
                </div>
                <div class="setting-control">
                    <input type="file" id="import-file" accept=".json" style="display:none">
                    <button class="btn btn-ghost" id="btn-import">📥 가져오기</button>
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3 class="settings-section-title">🔗 연결 상태</h3>
            <div class="setting-row">
                <div class="setting-label">
                    <span class="label-title">Supabase 연결</span>
                    <span class="label-desc" id="conn-status">확인 중...</span>
                </div>
                <div class="setting-control">
                    <button class="btn btn-ghost btn-sm" id="btn-test-conn">연결 테스트</button>
                </div>
            </div>
        </div>

        <div class="settings-section">
            <h3 class="settings-section-title">ℹ️ 정보</h3>
            <div class="setting-row">
                <div class="setting-label">
                    <span class="label-title">Mony Dashboard</span>
                    <span class="label-desc">v1.0 • 개인 자산 및 회사 모임(총무) 통합 대시보드</span>
                </div>
                <div class="setting-control text-muted">
                    GitHub Pages + Supabase
                </div>
            </div>
        </div>

        <div style="margin-top:32px">
            <button class="btn btn-primary" id="btn-save-settings">💾 설정 저장</button>
        </div>`;
    },

    async afterRender() {
        // 설정 저장
        document.getElementById('btn-save-settings').addEventListener('click', async () => {
            const rate = document.getElementById('setting-rate').value;
            const currency = document.getElementById('setting-currency').value;
            await Store.setSetting('default_exchange_rate', rate);
            await Store.setSetting('default_currency', currency);
            Utils.toast('설정이 저장되었습니다', 'success');
        });

        // 연결 테스트
        document.getElementById('btn-test-conn').addEventListener('click', () => this.testConnection());
        this.testConnection();

        // 내보내기
        document.getElementById('btn-export').addEventListener('click', () => this.exportData());

        // 가져오기
        document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));
    },

    async testConnection() {
        const statusEl = document.getElementById('conn-status');
        try {
            const { data, error } = await supabase.from('app_settings').select('key').limit(1);
            if (error) throw error;
            statusEl.textContent = '✅ 연결 정상';
            statusEl.style.color = 'var(--accent-emerald)';
        } catch (err) {
            statusEl.textContent = '❌ 연결 실패 — config.js의 URL과 Key를 확인하세요';
            statusEl.style.color = 'var(--accent-rose)';
        }
    },

    async exportData() {
        try {
            const [cats, txs, members, games, participants, dues, exchanges, settings] = await Promise.all([
                supabase.from('personal_categories').select('*'),
                supabase.from('personal_transactions').select('*'),
                supabase.from('club_members').select('*'),
                supabase.from('club_games').select('*'),
                supabase.from('club_game_participants').select('*'),
                supabase.from('club_dues').select('*'),
                supabase.from('exchange_transactions').select('*'),
                supabase.from('app_settings').select('*')
            ]);

            const backup = {
                export_info: {
                    version: '1.0',
                    project: 'mony_usage',
                    exported_at: new Date().toISOString()
                },
                personal_categories: cats.data || [],
                personal_transactions: txs.data || [],
                club_members: members.data || [],
                club_games: games.data || [],
                club_game_participants: participants.data || [],
                club_dues: dues.data || [],
                exchange_transactions: exchanges.data || [],
                app_settings: settings.data || []
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mony_backup_${Utils.today()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            Utils.toast('백업 파일이 다운로드되었습니다', 'success');
        } catch (err) {
            Utils.toast('내보내기 실패: ' + err.message, 'error');
        }
    },

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const ok = await Modal.confirm('데이터 가져오기', '백업 파일의 데이터를 추가합니다. 계속하시겠습니까?');
        if (!ok) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            if (!backup.export_info || backup.export_info.project !== 'mony_usage') {
                Utils.toast('유효하지 않은 백업 파일입니다', 'error');
                return;
            }

            // Import in order (categories first, then transactions)
            if (backup.personal_categories?.length) await supabase.from('personal_categories').upsert(backup.personal_categories, { onConflict: 'id' });
            if (backup.club_members?.length) await supabase.from('club_members').upsert(backup.club_members, { onConflict: 'id' });
            if (backup.club_games?.length) await supabase.from('club_games').upsert(backup.club_games, { onConflict: 'id' });
            if (backup.personal_transactions?.length) await supabase.from('personal_transactions').upsert(backup.personal_transactions, { onConflict: 'id' });
            if (backup.club_game_participants?.length) await supabase.from('club_game_participants').upsert(backup.club_game_participants, { onConflict: 'id' });
            if (backup.club_dues?.length) await supabase.from('club_dues').upsert(backup.club_dues, { onConflict: 'id' });
            if (backup.exchange_transactions?.length) await supabase.from('exchange_transactions').upsert(backup.exchange_transactions, { onConflict: 'id' });
            if (backup.app_settings?.length) await supabase.from('app_settings').upsert(backup.app_settings, { onConflict: 'key' });

            Utils.toast('데이터가 성공적으로 복원되었습니다', 'success');
        } catch (err) {
            Utils.toast('가져오기 실패: ' + err.message, 'error');
        }
        event.target.value = '';
    }
};

Router.register('settings', SettingsPage);
