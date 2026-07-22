# 🚀 Supabase + GitHub Pages 설정 가이드

> **목적**: 모바일/집/회사 어디서든 접속 가능한 환경 구축
> **소요 시간**: 약 15~20분 (처음 하시는 분 기준)
> **필요한 것**: Gmail 계정, GitHub 계정

---

## 📋 순서 요약

```
STEP 1: Supabase 가입 & 프로젝트 생성
STEP 2: 데이터베이스 테이블 생성 (SQL 복붙)
STEP 3: API Key 확인 & 코드에 입력
STEP 4: GitHub 저장소 생성 & 코드 업로드
STEP 5: GitHub Pages 활성화
STEP 6: 접속 테스트 🎉
```

---

## STEP 1: Supabase 가입 & 프로젝트 생성

1. **https://supabase.com** 접속
2. **"Start your project"** 클릭
3. **"Continue with GitHub"** 클릭 (GitHub 계정으로 로그인)
   - GitHub 계정이 없으면 먼저 https://github.com 에서 가입
4. **New Project** 클릭
5. 아래와 같이 입력:

| 항목 | 입력값 |
|---|---|
| Organization | (기본값 선택) |
| Project name | `mony-dashboard` |
| Database Password | (안전한 비밀번호 입력 후 **반드시 메모**) |
| Region | `Southeast Asia (Singapore)` ← 베트남에서 가장 빠름 |
| Pricing Plan | `Free` |

6. **"Create new project"** 클릭 → 1~2분 대기

---

## STEP 2: 데이터베이스 테이블 생성

1. Supabase 대시보드 왼쪽 메뉴에서 **"SQL Editor"** 클릭
2. **"New query"** 클릭
3. 아래 SQL을 **전체 복사**하여 붙여넣기
4. **"Run"** 클릭

```sql
-- =============================================
-- Mony Dashboard - 전체 DB 스키마
-- Supabase (PostgreSQL) 용
-- =============================================

-- 1. 개인 가계부 카테고리
CREATE TABLE personal_categories (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT      NOT NULL UNIQUE,
    type          TEXT      NOT NULL CHECK(type IN ('income', 'expense')),
    icon          TEXT      DEFAULT '💰',
    sort_order    INT       DEFAULT 0,
    is_active     BOOLEAN   DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. 개인 가계부 거래 내역
CREATE TABLE personal_transactions (
    id            BIGSERIAL PRIMARY KEY,
    tx_date       DATE      NOT NULL,
    type          TEXT      NOT NULL CHECK(type IN ('income', 'expense')),
    category_id   BIGINT    NOT NULL REFERENCES personal_categories(id) ON DELETE RESTRICT,
    amount        NUMERIC   NOT NULL CHECK(amount > 0),
    memo          TEXT      DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. 모임 멤버
CREATE TABLE club_members (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT      NOT NULL,
    company       TEXT      DEFAULT '현지',
    member_type   TEXT      NOT NULL CHECK(member_type IN ('regular', 'temporary')),
    status        TEXT      DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'departed')),
    join_date     DATE      NOT NULL,
    leave_date    DATE      DEFAULT NULL,
    memo          TEXT      DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 4. 게임 기록
CREATE TABLE club_games (
    id            BIGSERIAL PRIMARY KEY,
    game_date     DATE      NOT NULL,
    game_time     TIME      DEFAULT NULL,
    location      TEXT      DEFAULT '스크린골프장',
    total_cost    NUMERIC   DEFAULT 0,
    memo          TEXT      DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 5. 게임 참여자 & 순위
CREATE TABLE club_game_participants (
    id            BIGSERIAL PRIMARY KEY,
    game_id       BIGINT    NOT NULL REFERENCES club_games(id) ON DELETE CASCADE,
    member_id     BIGINT    NOT NULL REFERENCES club_members(id) ON DELETE RESTRICT,
    ranking       INT       DEFAULT NULL,
    score         INT       DEFAULT NULL,
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(game_id, member_id)
);

-- 6. 회비 입출금
CREATE TABLE club_dues (
    id            BIGSERIAL PRIMARY KEY,
    dues_date     DATE      NOT NULL,
    member_id     BIGINT    NOT NULL REFERENCES club_members(id) ON DELETE RESTRICT,
    type          TEXT      NOT NULL CHECK(type IN ('deposit', 'withdrawal')),
    amount        NUMERIC   NOT NULL CHECK(amount > 0),
    game_id       BIGINT    DEFAULT NULL REFERENCES club_games(id) ON DELETE SET NULL,
    memo          TEXT      DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 7. 환전 거래
CREATE TABLE exchange_transactions (
    id              BIGSERIAL PRIMARY KEY,
    tx_date         DATE      NOT NULL,
    person_name     TEXT      NOT NULL,
    tx_type         TEXT      NOT NULL CHECK(tx_type IN ('VND_TO_KRW', 'KRW_TO_VND')),
    exchange_rate   NUMERIC   NOT NULL,
    amount_vnd      NUMERIC   NOT NULL CHECK(amount_vnd > 0),
    amount_krw      NUMERIC   NOT NULL CHECK(amount_krw > 0),
    memo            TEXT      DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 8. 앱 설정
CREATE TABLE app_settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 기본 데이터 삽입 (초기 카테고리 & 설정)
-- =============================================

-- 기본 지출 카테고리
INSERT INTO personal_categories (name, type, icon, sort_order) VALUES
    ('식비', 'expense', '🍜', 1),
    ('교통비', 'expense', '🚕', 2),
    ('주거비', 'expense', '🏠', 3),
    ('통신비', 'expense', '📱', 4),
    ('생활용품', 'expense', '🛒', 5),
    ('의료비', 'expense', '🏥', 6),
    ('여가/문화', 'expense', '🎬', 7),
    ('경조사', 'expense', '💐', 8),
    ('기타 지출', 'expense', '📌', 9);

-- 기본 수입 카테고리
INSERT INTO personal_categories (name, type, icon, sort_order) VALUES
    ('급여', 'income', '💵', 1),
    ('보너스', 'income', '🎁', 2),
    ('부수입', 'income', '💰', 3),
    ('기타 수입', 'income', '📌', 4);

-- 기본 설정
INSERT INTO app_settings (key, value) VALUES
    ('default_currency', 'VND'),
    ('default_exchange_rate', '18.5'),
    ('theme', 'dark'),
    ('language', 'ko');

-- =============================================
-- Row Level Security (RLS) - 공개 접근 허용
-- 개인 단독 사용이므로 anon key로 전체 접근 허용
-- =============================================

ALTER TABLE personal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON personal_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON personal_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON club_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON club_games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON club_game_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON club_dues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON exchange_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL USING (true) WITH CHECK (true);
```

> ✅ "Success. No rows returned" 메시지가 나오면 성공!

---

## STEP 3: API Key 확인 & 코드에 입력

1. Supabase 대시보드 왼쪽 메뉴 → **"Project Settings"** (톱니바퀴 아이콘)
2. **"API"** 탭 클릭
3. 아래 2개 값을 복사:

| 항목 | 위치 |
|---|---|
| **Project URL** | `https://xxxxxxxx.supabase.co` |
| **anon public key** | `eyJhbG...` (매우 긴 문자열) |

4. 프로젝트 폴더의 `js/config.js` 파일을 열어서 복사한 값을 붙여넣기:

```javascript
// js/config.js 안에 아래 값을 교체
const SUPABASE_URL = 'https://여기에-Project-URL-붙여넣기.supabase.co';
const SUPABASE_ANON_KEY = '여기에-anon-public-key-붙여넣기';
```

---

## STEP 4: GitHub 저장소 생성 & 코드 업로드

### 방법 A: GitHub 웹사이트에서 직접 업로드 (가장 쉬움)

1. **https://github.com** 로그인
2. 오른쪽 상단 **"+"** → **"New repository"**
3. 설정:
   - Repository name: `mony-dashboard`
   - **Public** 선택 (GitHub Pages 무료 사용 조건)
   - "Add a README file" 체크 ❌ (체크하지 마세요)
4. **"Create repository"** 클릭
5. **"uploading an existing file"** 링크 클릭
6. 프로젝트 폴더(`04_Mony_usage`) 안의 **모든 파일**을 드래그앤드롭
7. **"Commit changes"** 클릭

### 방법 B: VS Code에서 Git 사용 (Git 설치 필요)
```bash
cd g:\AI\04_Mony_usage
git init
git add .
git commit -m "Initial commit: Mony Dashboard"
git remote add origin https://github.com/YOUR_USERNAME/mony-dashboard.git
git push -u origin main
```

---

## STEP 5: GitHub Pages 활성화

1. GitHub 저장소 페이지 → **"Settings"** 탭
2. 왼쪽 메뉴 → **"Pages"**
3. Source: **"Deploy from a branch"**
4. Branch: **`main`** / **`/ (root)`** 선택
5. **"Save"** 클릭
6. 1~2분 후 URL 생성:

```
https://YOUR_USERNAME.github.io/mony-dashboard/
```

---

## STEP 6: 접속 테스트 🎉

위 URL을 아래 기기에서 열어보세요:
- ✅ 회사 PC 브라우저
- ✅ 집 PC 브라우저
- ✅ 모바일 브라우저 (크롬, 사파리)

**모든 기기에서 같은 데이터**가 보이면 성공!

---

## ⚠️ 보안 참고

> 현재 설정은 **개인 단독 사용** 기준입니다.
> URL을 아는 사람은 누구나 데이터에 접근할 수 있으므로, URL을 타인에게 공유하지 마세요.
> 추후 로그인 기능이 필요하면 Supabase Auth를 추가할 수 있습니다.
