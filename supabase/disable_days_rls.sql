-- ═════════════════════════════════════════════════════════════════════════════
-- ОГОНЁК · ОТКЛЮЧЕНИЕ RLS ДЛЯ DAYS, PRIDES, GRATITUDES
-- Выполните этот скрипт в Supabase SQL Editor для разрешения облачной синхронизации
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.days DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.prides DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitudes DISABLE ROW LEVEL SECURITY;
