# 📋 진행 이력 추적기 (Progress Tracker)

> **목적**: AI 계정/세션을 이동하더라도 현재 진행 상황을 즉시 파악할 수 있도록 하는 이력 관리 문서.
> **사용법**: 새로운 AI 세션을 시작할 때, 이 파일을 먼저 읽어달라고 요청하세요.

---

## 🔖 프로젝트 기본 정보

| 항목 | 내용 |
|---|---|
| **프로젝트명** | 개인 자산 및 회사 모임(총무) 통합 대시보드 |
| **기본 화폐** | VND (베트남 동) |
| **프로젝트 경로** | `g:\AI\04_Mony_usage` |
| **기술 스택** | HTML/CSS/JS (Vanilla) + Supabase (PostgreSQL) + GitHub Pages |
| **모바일 지원** | PWA (Progressive Web App) |
| **개발 서버 포트** | 5174 |
| **최초 생성일** | 2026-07-21 |
| **최종 수정일** | 2026-07-21 |

---

## 📊 블록별 진행 현황 (Block Status)

| 블록 ID | 블록명 | 설계 | 코드 | 버전 | 최종 수정일 |
|---|---|---|---|---|---|
| BLOCK-00 | 과제 격리 및 멀티태스크 관리 | ✅ | ✅ | v1.0 | 2026-07-21 |
| BLOCK-01 | 메뉴 및 네비게이션 구조 | ✅ | ✅ | v1.0 | 2026-07-21 |
| BLOCK-02 | 개인 가계부 (Personal Ledger) | ✅ | ✅ | v1.0 | 2026-07-21 |
| BLOCK-03 | 회사 모임 관리 (Company Club) | ✅ | ✅ | v1.0 | 2026-07-21 |
| BLOCK-04 | 환전 관리 (Exchange Ledger) | ✅ | ✅ | v1.0 | 2026-07-21 |
| BLOCK-05 | 통합 대시보드 및 시각화 | ✅ | ✅ | v1.0 | 2026-07-21 |
| BLOCK-06 | 설정 (Settings) | ✅ | ✅ | v1.0 | 2026-07-21 |
| BLOCK-07 | AI 프롬프트 가이드 | ✅ | N/A | v1.0 | 2026-07-21 |
| BLOCK-08 | PWA + 모바일 UI | ✅ | ✅ | v1.0 | 2026-07-21 |

> **상태 범례**: ⬜ 미착수 | 🔧 진행중 | ✅ 완료 | 🔄 업데이트 필요 | ⚠️ 이슈 있음

---

## 📁 파일 구조

```
g:\AI\04_Mony_usage\
├── index.html              ← 메인 HTML (PWA 메타 포함)
├── manifest.json           ← PWA 매니페스트
├── sw.js                   ← Service Worker (오프라인 캐싱)
├── PROGRESS_TRACKER.md     ← 본 문서 (진행 이력)
├── SYSTEM_DESIGN.md        ← 블록 기반 시스템 설계서
├── AI_PROMPT_GUIDE.md      ← AI 프롬프트 가이드
├── SETUP_GUIDE.md          ← Supabase + GitHub Pages 설정 가이드
├── css/
│   ├── index.css           ← 글로벌 디자인 시스템 (토큰, 컴포넌트)
│   ├── sidebar.css         ← 사이드바 (PC)
│   ├── mobile.css          ← 모바일 UI (FAB, 하단 탭)
│   ├── dashboard.css       ← 대시보드 페이지
│   ├── personal.css        ← 가계부 페이지
│   ├── club.css            ← 모임 관리 페이지
│   ├── exchange.css        ← 환전 관리 페이지
│   ├── analytics.css       ← 통계 페이지
│   ├── settings.css        ← 설정 페이지
│   └── modal.css           ← 모달 다이얼로그
├── js/
│   ├── config.js           ← ⚠️ Supabase URL & Key (사용자 입력 필요)
│   ├── store.js            ← Supabase 데이터 접근 레이어 (DAL)
│   ├── utils.js            ← 유틸리티 (포맷, 토스트 등)
│   ├── modal.js            ← 모달 관리
│   ├── router.js           ← SPA 라우터
│   ├── app.js              ← 앱 초기화 + 모바일 네비 + FAB
│   └── pages/
│       ├── dashboard.js    ← 대시보드 (요약, 차트, 최근 활동)
│       ├── personal.js     ← 가계부 CRUD + 카테고리 관리
│       ├── club.js         ← 모임 (게임/멤버/회비/순위 4탭)
│       ├── exchange.js     ← 환전 CRUD + 실시간 계산기
│       ├── analytics.js    ← 차트 5종 (도넛, 라인, 바)
│       └── settings.js     ← 설정 + 백업/복원 + 연결 테스트
└── icons/
    ├── icon.svg            ← PWA 아이콘 (SVG)
    └── generate.html       ← PNG 아이콘 생성 유틸리티
```

---

## 📝 변경 이력 (Change Log)

### v1.0 — 2026-07-21 (최초 생성)

| 순번 | 변경 내용 | 변경자 |
|---|---|---|
| 001 | 전체 시스템 설계 문서 3종 작성 (SYSTEM_DESIGN, AI_PROMPT_GUIDE, PROGRESS_TRACKER) | AI |
| 002 | Supabase + GitHub Pages 설정 가이드 작성 | AI |
| 003 | 전체 코드 구현 (HTML 1 + CSS 10 + JS 12 파일) | AI |
| 004 | PWA 지원 추가 (manifest, service worker, 모바일 FAB/하단탭) | AI |

### v1.1 — 2026-07-22 (DB 연동 및 버그 수정)

| 순번 | 변경 내용 | 변경자 |
|---|---|---|
| 006 | Supabase DB 스키마 및 초기 카테고리 생성 (SQL 실행) | 사용자 + AI |
| 007 | Supabase Credentials 연동 (config.js & store.js 핫픽스) | 사용자 + AI |
| 008 | GitHub Pages 경로 복구 및 라이브 대시보드 로딩 성공 | 사용자 + AI |

### v1.2 — 2026-07-22 (회사 모임 회비 산출 시트 추가)

| 순번 | 변경 내용 | 변경자 |
|---|---|---|
| 009 | '회사 모임 관리' 5번째 탭 `🧮 회비 산출 시트` 개발 | AI + 사용자 |
| 010 | 스크린 골프비 + 식사비 MAX 등수별 차등/균등 배분율 실시간 산출 시트 구현 | AI + 사용자 |
| 011 | 카카오톡 / Zalo 단톡방 공지 문구 자동 생성 및 1클릭 복사 기능 구현 | AI + 사용자 |

---

## 🚀 남은 작업 (Next Steps)

1. ⬜ **GitHub Desktop 설치 완료** → 저장소 생성 → 코드 Push
2. ⬜ **Supabase 가입 & 프로젝트 생성** → SQL 실행 → API Key 입력
3. ⬜ **GitHub Pages 활성화** → 배포 URL 확인
4. ⬜ **동작 테스트** (PC + 모바일)
5. ⬜ **모바일에서 PWA 설치** (홈 화면에 추가)
6. ⬜ 집 PC에서 GitHub Desktop 설치 → 저장소 Clone

---

## ⚙️ 새 AI 세션에서 이어서 작업하기

```
나는 '개인 자산 및 회사 모임(총무) 통합 대시보드' 프로젝트를 진행 중이야.
프로젝트 경로: g:\AI\04_Mony_usage

아래 파일들을 순서대로 읽고, 현재 진행 상황을 요약한 뒤 이어서 작업해줘:
1. PROGRESS_TRACKER.md (진행 현황 파악)
2. SYSTEM_DESIGN.md (시스템 설계 참조)
3. AI_PROMPT_GUIDE.md (프롬프트 규칙 참조)
```
