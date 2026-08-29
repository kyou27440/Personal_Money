/* ============================================
   CONFIG.JS — 앱 설정 및 리비전 관리
   ============================================ */
var APP_CONFIG = {
    VERSION: 'v5.5.0',
    BUILD_DATE: '2026-08-29 07:45',
    BUILD_DESC: 'OCR 정밀도 개선 & 게임회비 가계부 취소선 연동 및 문구 옵션',
    SUPABASE_URL: 'https://qkkcugjuopjeuiyczjzf.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFra2N1Z2p1b3BqZXVpeWN6anpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjE2NjQsImV4cCI6MjEwMDIzNzY2NH0.qPYwvuSBp_SEvi1vG4qoCIpbsBU1eTIYz43q-Df00DY'
};

var SUPABASE_URL = APP_CONFIG.SUPABASE_URL;
var SUPABASE_KEY = APP_CONFIG.SUPABASE_KEY;
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

