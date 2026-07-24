# 📋 진행 이력 추적기 (Progress Tracker)

> **목적**: 독립 개인 가계부 및 자산 관리 시스템의 이력 관리 문서.
> **기본 화폐**: VND (베트남 동) / KRW (대한민국 원)

---

## 🔖 프로젝트 기본 정보

| 항목 | 내용 |
|---|---|
| **프로젝트명** | MyMoney - 독립 개인 가계부 & 자산 관리 시스템 |
| **기본 화폐** | VND (베트남 동) & KRW (원화) |
| **프로젝트 경로** | `g:\AI\05_Personal_Money` |
| **기술 스택** | HTML/CSS/JS (Vanilla) + Supabase (PostgreSQL) + GitHub Pages |
| **모바일 지원** | PWA (Progressive Web App) |
| **개발 서버 포트** | 5174 |
| **최초 생성일** | 2026-07-21 |
| **독립 전환일** | 2026-07-24 |

---

## 📊 블록별 진행 현황 (Block Status)

| 블록 ID | 블록명 | 설계 | 코드 | 버전 | 최종 수정일 |
|---|---|---|---|---|---|
| BLOCK-00 | 과제 격리 및 멀티태스크 관리 | ✅ | ✅ | v1.0 | 2026-07-24 |
| BLOCK-01 | 메뉴 및 네비게이션 구조 | ✅ | ✅ | v1.0 | 2026-07-24 |
| BLOCK-02 | 개인 가계부 (Personal Ledger) | ✅ | ✅ | v1.0 | 2026-07-24 |
| BLOCK-04 | 개인 환전 관리 (Exchange Ledger) | ✅ | ✅ | v1.0 | 2026-07-24 |
| BLOCK-05 | 개인 대시보드 및 시각화 | ✅ | ✅ | v1.0 | 2026-07-24 |
| BLOCK-06 | 설정 (Settings) | ✅ | ✅ | v1.0 | 2026-07-24 |
| BLOCK-08 | PWA + 모바일 UI | ✅ | ✅ | v1.0 | 2026-07-24 |

> **상태 범례**: ⬜ 미착수 | 🔧 진행중 | ✅ 완료 | 🔄 업데이트 필요 | ⚠️ 이슈 있음

---

## 📁 파일 구조

```
g:\AI\05_Personal_Money\
├── index.html              ← 메인 HTML (PWA 메타 및 5개 개인 메뉴)
├── manifest.json           ← PWA 매니페스트
├── sw.js                   ← Service Worker
├── PROGRESS_TRACKER.md     ← 본 문서 (진행 이력)
├── SYSTEM_DESIGN.md        ← 개인 가계부 시스템 설계서
├── AI_PROMPT_GUIDE.md      ← AI 프롬프트 가이드
├── SETUP_GUIDE.md          ← Supabase + GitHub Pages 설정 가이드
├── css/
│   ├── index.css           ← 글로벌 디자인 시스템
│   ├── sidebar.css         ← 사이드바 (PC)
│   ├── mobile.css          ← 모바일 UI (FAB, 하단 탭)
│   ├── dashboard.css       ← 대시보드 페이지
│   ├── personal.css        ← 가계부 페이지
│   ├── exchange.css        ← 환전 관리 페이지
│   ├── analytics.css       ← 통계 페이지
│   ├── settings.css        ← 설정 페이지
│   └── modal.css           ← 모달 다이얼로그
├── js/
│   ├── config.js           ← Supabase URL & Key
│   ├── store.js            ← Supabase 데이터 접근 레이어 (개인 가계부 DAL)
│   ├── utils.js            ← 유틸리티 (포맷, 토스트 등)
│   ├── modal.js            ← 모달 관리
│   ├── router.js           ← SPA 라우터
│   ├── app.js              ← 앱 초기화 + 모바일 네비 + FAB
│   └── pages/
│       ├── dashboard.js    ← 개인 대시보드 (자산 요약, 6개월 추이, 최근 내역)
│       ├── personal.js     ← 가계부 CRUD + 카테고리 관리
│       ├── exchange.js     ← 개인 환전 CRUD + 실시간 계산기
│       ├── analytics.js    ← 자산 차트 3종 (카테고리 비율, 수입/지출 추이, 환전 현황)
│       └── settings.js     ← 설정 + 백업/복원 + DB 연결 테스트
└── icons/
    └── icon.svg            ← PWA 아이콘
```

---

## 📝 변경 이력 (Change Log)

### v1.0 (개인 가계부 단독 전환) — 2026-07-24

| 순번 | 변경 내용 | 변경자 |
|---|---|---|
| 001 | 통합 대시보드에서 회사 모임(Club) 코드 및 전용 라이브러리/CSS/JS 완전 삭제 | AI |
| 002 | index.html 및 네비게이션을 개인 전용 5개 메뉴로 고도화 | AI |
| 003 | analytics.js 개인 지출/수입/환전 3종 전용 차트로 재구성 | AI |
| 004 | store.js 모임 관련 DAL 정리 및 개인 가계부 데이터 처리 경량화 | AI |
