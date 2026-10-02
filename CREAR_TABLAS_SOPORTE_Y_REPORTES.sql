-- ==============================================================================
-- BULKSCENE STUDIO - TABLAS DE SOPORTE, REPORTES DE USUARIOS Y TELEMETRÍA
-- Ejecuta este script completo en el SQL Editor de tu Dashboard de Supabase:
-- https://supabase.com/dashboard/project/pvcjahzwnhbfajmrtzmg/sql/new
-- ==============================================================================

-- 1. TABLA DE REPORTES DE USUARIOS (Tickets enviados con el modal de error)
CREATE TABLE IF NOT EXISTS public.reportes_soporte_admin (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_email TEXT NOT NULL DEFAULT 'alumno@bulkscene.ai',
    user_comment TEXT NOT NULL,
    stage TEXT DEFAULT 'Sistema',
    error_code TEXT DEFAULT 'USER_REPORTED_ISSUE',
    error_message TEXT,
    technical_details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'resolved'
    sent_to_telegram BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_reportes_soporte_created ON public.reportes_soporte_admin(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_soporte_status ON public.reportes_soporte_admin(status);
CREATE INDEX IF NOT EXISTS idx_reportes_soporte_email ON public.reportes_soporte_admin(user_email);

-- 2. TABLA DE TELEMETRÍA AUTOMÁTICA DE ERRORES (Excepciones de código y APIs)
CREATE TABLE IF NOT EXISTS public.errores_telemetria (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_email TEXT DEFAULT 'creador@bulkscene.ai',
    stage TEXT DEFAULT 'Sistema',
    error_code TEXT,
    error_message TEXT,
    possible_cause TEXT,
    suggested_solution TEXT,
    context_data JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_errores_telemetria_created ON public.errores_telemetria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errores_telemetria_code ON public.errores_telemetria(error_code);

-- 3. TABLA DE CONFIGURACIÓN GLOBAL DE SOPORTE & TELEGRAM
CREATE TABLE IF NOT EXISTS public.configuracion_soporte (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    telegram_bot_token TEXT DEFAULT '',
    telegram_chat_id TEXT DEFAULT '',
    generic_webhook_url TEXT DEFAULT '',
    notify_on_user_report BOOLEAN DEFAULT true,
    notify_on_critical_auto_error BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar registro base si no existe
INSERT INTO public.configuracion_soporte (id, telegram_bot_token, telegram_chat_id)
VALUES ('global_config', '', '')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) CON POLÍTICAS PÚBLICAS Y SEGURAS
-- ==============================================================================

-- 4. POLÍTICAS PARA reportes_soporte_admin
ALTER TABLE public.reportes_soporte_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir insercion publica de reportes" ON public.reportes_soporte_admin;
CREATE POLICY "Permitir insercion publica de reportes"
ON public.reportes_soporte_admin FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de reportes" ON public.reportes_soporte_admin;
CREATE POLICY "Permitir lectura de reportes"
ON public.reportes_soporte_admin FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion de reportes" ON public.reportes_soporte_admin;
CREATE POLICY "Permitir actualizacion de reportes"
ON public.reportes_soporte_admin FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminacion de reportes" ON public.reportes_soporte_admin;
CREATE POLICY "Permitir eliminacion de reportes"
ON public.reportes_soporte_admin FOR DELETE
TO anon, authenticated
USING (true);

-- 5. POLÍTICAS PARA errores_telemetria
ALTER TABLE public.errores_telemetria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir insercion publica de telemetria" ON public.errores_telemetria;
CREATE POLICY "Permitir insercion publica de telemetria"
ON public.errores_telemetria FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de telemetria" ON public.errores_telemetria;
CREATE POLICY "Permitir lectura de telemetria"
ON public.errores_telemetria FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir eliminacion de telemetria" ON public.errores_telemetria;
CREATE POLICY "Permitir eliminacion de telemetria"
ON public.errores_telemetria FOR DELETE
TO anon, authenticated
USING (true);

-- 6. POLÍTICAS PARA configuracion_soporte
ALTER TABLE public.configuracion_soporte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de configuracion de soporte" ON public.configuracion_soporte;
CREATE POLICY "Permitir lectura de configuracion de soporte"
ON public.configuracion_soporte FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion de configuracion de soporte" ON public.configuracion_soporte;
CREATE POLICY "Permitir actualizacion de configuracion de soporte"
ON public.configuracion_soporte FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir insercion de configuracion de soporte" ON public.configuracion_soporte;
CREATE POLICY "Permitir insercion de configuracion de soporte"
ON public.configuracion_soporte FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ==============================================================================
-- HABILITAR REALTIME EN SUPABASE PARA REPORTES INSTANTÁNEOS
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reportes_soporte_admin;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
