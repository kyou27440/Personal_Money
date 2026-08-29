/* ============================================
   CONFIG.JS — 앱 설정 및 리비전 관리
   ============================================ */
var APP_CONFIG = {
    VERSION: 'v5.7.0',
    BUILD_DATE: '2026-08-29 07:58',
    BUILD_DESC: '신한/베트남 뱅킹 앱 전용 블록 OCR 파서 엔진 전면 개편',
    SUPABASE_URL: 'https://qkkcugjuopjeuiyczjzf.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFra2N1Z2p1b3BqZXVpeWN6anpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjE2NjQsImV4cCI6MjEwMDIzNzY2NH0.qPYwvuSBp_SEvi1vG4qoCIpbsBU1eTIYz43q-Df00DY'
};

var SUPABASE_URL = APP_CONFIG.SUPABASE_URL;
var SUPABASE_KEY = APP_CONFIG.SUPABASE_KEY;
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

