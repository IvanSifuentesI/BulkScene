-- =========================================================================
-- TABLA: leads_marketing
-- Sistema de Captura de Leads y Usuarios Expirados para Email Marketing
-- =========================================================================

-- 1. Crear la tabla leads_marketing
CREATE TABLE IF NOT EXISTS public.leads_marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    tipo_lead TEXT NOT NULL DEFAULT 'nuevo_prospecto', -- 'nuevo_prospecto', 'suscripcion_expirada', 'cuenta_inactiva'
    estado_suscripcion TEXT NOT NULL DEFAULT 'sin_suscripcion', -- 'sin_suscripcion', 'expirado', 'inactivo'
    origen TEXT DEFAULT 'solicitud_acceso_app',
    intentos_acceso INTEGER DEFAULT 1,
    fecha_expiracion_anterior TIMESTAMPTZ,
    primer_intento TIMESTAMPTZ DEFAULT NOW(),
    ultimo_intento TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para optimizar consultas rápidas y búsquedas
CREATE INDEX IF NOT EXISTS idx_leads_marketing_email ON public.leads_marketing(email);
CREATE INDEX IF NOT EXISTS idx_leads_marketing_tipo ON public.leads_marketing(tipo_lead);
CREATE INDEX IF NOT EXISTS idx_leads_marketing_ultimo_intento ON public.leads_marketing(ultimo_intento DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.leads_marketing ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas anteriores si existían
DROP POLICY IF EXISTS "Permitir insercion anonima y autenticada de leads" ON public.leads_marketing;
DROP POLICY IF EXISTS "Permitir actualizacion anonima de leads" ON public.leads_marketing;
DROP POLICY IF EXISTS "Permitir lectura publica o autenticada de leads" ON public.leads_marketing;

-- 5. Crear Políticas de Seguridad RLS:
-- Inserción permitida para cualquier cliente (anon o authenticated) al intentar ingresar
CREATE POLICY "Permitir insercion anonima y autenticada de leads"
ON public.leads_marketing
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Actualización permitida para registrar nuevos intentos de acceso y actualizar fecha
CREATE POLICY "Permitir actualizacion anonima de leads"
ON public.leads_marketing
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Lectura permitida para el panel de administración
CREATE POLICY "Permitir lectura publica o autenticada de leads"
ON public.leads_marketing
FOR SELECT
TO anon, authenticated
USING (true);

-- Eliminación permitida para administración y depuración
DROP POLICY IF EXISTS "Permitir eliminacion anonima y autenticada de leads" ON public.leads_marketing;
CREATE POLICY "Permitir eliminacion anonima y autenticada de leads"
ON public.leads_marketing
FOR DELETE
TO anon, authenticated
USING (true);

-- =========================================================================
-- LISTO: Ejecuta este script en Supabase > SQL Editor y dale a RUN.
-- Automáticamente la aplicación registrará cada nuevo correo y cada usuario
-- expirado que intente acceder, clasificándolos para tus campañas de Email.
-- =========================================================================
