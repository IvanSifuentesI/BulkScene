import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Send, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  Lock, 
  ArrowLeft, 
  Layers, 
  MessageSquare, 
  Bell, 
  ExternalLink,
  Smartphone,
  Eye,
  Terminal,
  Activity,
  Users,
  Download,
  Mail
} from 'lucide-react';
import { 
  getTelegramConfig, 
  saveTelegramConfig, 
  testTelegramConnection, 
  getUserErrorReports, 
  updateUserReportStatus, 
  deleteUserReport, 
  clearAllUserReports, 
  submitUserErrorReport,
  copyAllErrorsForAntigravityAndPurge,
  AdminTelegramConfig,
  UserErrorReport
} from '../services/adminReportingService';
import { getStoredErrorReports, clearStoredErrorReports, TelemetryErrorReport } from '../services/errorTelemetryService';
import { fetchMarketingLeads, MarketingLeadRecord } from '../services/subscriptionService';

export const AdminDashboard: React.FC = () => {
  // Estado de autenticación del panel admin
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const isAdminSession = localStorage.getItem('bulkscene_admin_authenticated');
      return isAdminSession === 'true';
    } catch {
      return false;
    }
  });

  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'reportes' | 'telegram' | 'telemetria' | 'leads'>('reportes');

  // Configuración de Telegram
  const [telegramConfig, setTelegramConfig] = useState<AdminTelegramConfig>(getTelegramConfig());
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Listas de datos
  const [userReports, setUserReports] = useState<UserErrorReport[]>([]);
  const [telemetryErrors, setTelemetryErrors] = useState<TelemetryErrorReport[]>([]);
  const [marketingLeads, setMarketingLeads] = useState<MarketingLeadRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [leadsCopiedSuccess, setLeadsCopiedSuccess] = useState(false);
  const [sqlCopiedSuccess, setSqlCopiedSuccess] = useState(false);

  const loadData = () => {
    setUserReports(getUserErrorReports());
    setTelemetryErrors(getStoredErrorReports());
    fetchMarketingLeads().then(setMarketingLeads);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Única contraseña autorizada de administrador
    if (adminPin === 'Ivan@9947') {
      setIsAuthenticated(true);
      localStorage.setItem('bulkscene_admin_authenticated', 'true');
      setPinError('');
      loadData();
    } else {
      setPinError('Contraseña de administrador incorrecta.');
    }
  };

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    saveTelegramConfig(telegramConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTestResult(null);
    try {
      const res = await testTelegramConnection(telegramConfig.telegramBotToken, telegramConfig.telegramChatId);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Error al conectar' });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSimulateReport = async () => {
    const demo = await submitUserErrorReport({
      userEmail: 'alumno_prueba@skool.com',
      userComment: 'Simulación de prueba: el motor generó la escena 2 pero falló la descarga del ZIP.',
      stage: 'Generador Masivo',
      errorCode: 'DEMO_TEST_ERROR',
      errorMessage: 'Fallo simulado para verificación de Telegram y Panel Admin',
      technicalDetails: {
        model: 'flux-1-schnell',
        slotNumber: '002',
        promptSnippet: 'Cinematic shot of ancient temple in storm...'
      }
    });

    loadData();
    alert(`¡Reporte de prueba creado (#${demo.id}) y enviado a Telegram!`);
  };

  const SUPABASE_LEADS_SQL = `-- ==============================================================================
-- TABLA: leads_marketing
-- Registra todos los usuarios sin suscripción activa (nuevos prospectos y vencidos)
-- para campañas de email marketing y recuperación de clientes.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.leads_marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    tipo_lead TEXT NOT NULL DEFAULT 'nuevo_prospecto', -- 'nuevo_prospecto' | 'suscripcion_expirada' | 'cuenta_inactiva'
    estado_suscripcion TEXT NOT NULL DEFAULT 'sin_suscripcion', -- 'sin_suscripcion' | 'expirado' | 'inactivo'
    origen TEXT DEFAULT 'solicitud_acceso_app',
    intentos_acceso INTEGER DEFAULT 1,
    fecha_expiracion_anterior TIMESTAMPTZ,
    primer_intento TIMESTAMPTZ DEFAULT NOW(),
    ultimo_intento TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_marketing_email ON public.leads_marketing(email);
CREATE INDEX IF NOT EXISTS idx_leads_marketing_tipo ON public.leads_marketing(tipo_lead);
CREATE INDEX IF NOT EXISTS idx_leads_marketing_ultimo_intento ON public.leads_marketing(ultimo_intento DESC);

ALTER TABLE public.leads_marketing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir insercion anonima y autenticada de leads" ON public.leads_marketing;
CREATE POLICY "Permitir insercion anonima y autenticada de leads" 
ON public.leads_marketing 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion anonima de leads" ON public.leads_marketing;
CREATE POLICY "Permitir actualizacion anonima de leads" 
ON public.leads_marketing 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura publica o autenticada de leads" ON public.leads_marketing;
CREATE POLICY "Permitir lectura publica o autenticada de leads" 
ON public.leads_marketing 
FOR SELECT 
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir eliminacion anonima y autenticada de leads" ON public.leads_marketing;
CREATE POLICY "Permitir eliminacion anonima y autenticada de leads"
ON public.leads_marketing
FOR DELETE
TO anon, authenticated
USING (true);`;

  const handleCopyLeadsEmails = () => {
    const emails = marketingLeads.map(l => l.email).join('\n');
    if (!emails) {
      alert('Aún no hay correos capturados.');
      return;
    }
    navigator.clipboard.writeText(emails);
    setLeadsCopiedSuccess(true);
    setTimeout(() => setLeadsCopiedSuccess(false), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_LEADS_SQL);
    setSqlCopiedSuccess(true);
    setTimeout(() => setSqlCopiedSuccess(false), 2500);
  };

  const handleExportCsv = () => {
    if (marketingLeads.length === 0) {
      alert('No hay leads para exportar.');
      return;
    }
    const headers = ['Email', 'Tipo de Lead', 'Estado', 'Intentos', 'Ultimo Intento', 'Expiracion Anterior'];
    const rows = marketingLeads.map(l => [
      `"${l.email}"`,
      `"${l.tipo_lead}"`,
      `"${l.estado_suscripcion}"`,
      l.intentos_acceso || 1,
      `"${l.ultimo_intento || ''}"`,
      `"${l.fecha_expiracion_anterior || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_marketing_bulkscene_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyTicket = (report: UserErrorReport) => {
    const text = `TICKET: ${report.id}\nUsuario: ${report.userEmail}\nEtapa: ${report.stage}\nMensaje: ${report.userComment}\nError: ${report.errorMessage || 'N/A'}\nFecha: ${report.timestamp}`;
    navigator.clipboard.writeText(text);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllForAntigravity = () => {
    const res = copyAllErrorsForAntigravityAndPurge();
    if (res.count === 0) {
      alert('No hay errores registrados en este momento para copiar.');
      return;
    }
    loadData();
    alert(`📋 ¡Se han copiado ${res.count} errores al portapapeles listos para pegar en Antigravity y se han borrado todos los reportes de la memoria!`);
  };

  const pendingCount = userReports.filter(r => r.status === 'pending').length;
  const filteredReports = userReports.filter(r => {
    if (filterStatus === 'pending') return r.status === 'pending';
    if (filterStatus === 'resolved') return r.status === 'resolved';
    return true;
  });

  // Pantalla de Login de Administrador si no está autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050609] text-gray-100 flex items-center justify-center p-4 relative font-sans selection:bg-red-500 selection:text-white">
        <div className="w-full max-w-md rounded-3xl bg-[#0a0d14] border border-white/10 p-8 shadow-[0_0_80px_rgba(239,68,68,0.15)] text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-red-500" />
          
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-5">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-black text-white">Panel de Control de Errores</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Acceso restringido para el Administrador de BulkScene Studio
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Ingresa la clave de administrador..."
                className="w-full px-4 py-3 rounded-xl bg-[#050608] border border-white/10 text-white text-sm text-center tracking-widest focus:outline-none focus:border-red-500 font-mono"
                autoFocus
              />
              {pinError && <p className="text-xs text-red-400 mt-2">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg transition-all"
            >
              Desbloquear Modo Administrador
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5">
            <Link to="/app" className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Regresar al Estudio</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050609] text-gray-100 font-sans selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <header className="h-16 border-b border-white/[0.06] bg-[#07090f] px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-500 to-amber-400 p-0.5 shadow-lg shadow-red-500/20">
            <div className="w-full h-full bg-[#0a0d14] rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-white tracking-tight">
                MODO <span className="text-red-400">ADMINISTRADOR</span>
              </span>
              <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                Soporte & Telemetría
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">BulkScene Studio v1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyAllForAntigravity}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all active:scale-95"
            title="Copia todos los errores para pegarlos a Antigravity y vacía la bandeja automáticamente"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar para Antigravity y Limpiar</span>
          </button>

          <button
            onClick={handleSimulateReport}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold transition-colors"
            title="Genera un reporte falso para comprobar que Telegram vibre"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Simular Error de Prueba</span>
          </button>

          <Link
            to="/app"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Estudio</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('reportes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'reportes'
                ? 'bg-red-500 text-black shadow-lg shadow-red-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Reportes de Usuarios</span>
            {pendingCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                activeTab === 'reportes' ? 'bg-black text-red-400' : 'bg-red-500 text-white animate-pulse'
              }`}>
                {pendingCount} pendientes
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'telegram'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Configuración Telegram & Webhooks</span>
            {telegramConfig.telegramBotToken && telegramConfig.telegramChatId ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <span className="text-[10px] text-amber-400 font-mono">● Sin configurar</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('telemetria')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'telemetria'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Errores de Código Automáticos</span>
            <span className="text-[10px] font-mono text-slate-400">({telemetryErrors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'leads'
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Leads Email Marketing</span>
            {marketingLeads.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                activeTab === 'leads' ? 'bg-black text-amber-400' : 'bg-amber-400 text-black'
              }`}>
                {marketingLeads.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: REPORTES DE USUARIOS */}
        {activeTab === 'reportes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0d14] p-4 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white">Bandeja de Reportes de Alumnos</h3>
                <p className="text-xs text-slate-400">
                  Problemas y comentarios reportados con el botón "Reportar Error" en la interfaz
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-[#050608] p-1 rounded-xl flex items-center border border-white/10 text-xs">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${filterStatus === 'all' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Todos ({userReports.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Pendientes ({pendingCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('resolved')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${filterStatus === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Resueltos ({userReports.length - pendingCount})
                  </button>
                </div>

                <button
                  onClick={handleCopyAllForAntigravity}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all shadow-sm active:scale-95"
                  title="Copiar todos los reportes para Antigravity y vaciar la lista"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copiar para Antigravity y Limpiar</span>
                </button>

                <button
                  onClick={loadData}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  title="Recargar datos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-[#0a0d14] border border-white/5 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No hay reportes en esta categoría</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Cuando un usuario presione "Reportar Error" en su pantalla, aparecerá aquí al instante y te llegará a Telegram.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-5 rounded-2xl bg-[#0a0d14] border transition-all ${
                      report.status === 'pending'
                        ? 'border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.05)]'
                        : 'border-white/5 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-200 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {report.id}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          report.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {report.status === 'pending' ? '● Pendiente' : '✓ Resuelto'}
                        </span>
                        <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          📍 {report.stage}
                        </span>
                        {report.sentToTelegram && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <Bot className="w-3 h-3" /> Enviado a Telegram
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 font-mono">
                        {new Date(report.timestamp).toLocaleString('es-ES')}
                      </div>
                    </div>

                    {/* Comentario del usuario */}
                    <div className="p-3.5 rounded-xl bg-[#050608] border border-white/5 mb-3 text-xs text-slate-200 leading-relaxed font-sans">
                      <div className="text-[10px] uppercase font-bold text-amber-400 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>Mensaje del Alumno:</span>
                      </div>
                      "{report.userComment}"
                    </div>

                    {/* Datos técnicos */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono mb-4">
                      <div>
                        👤 Usuario: <strong className="text-slate-200">{report.userEmail}</strong>
                      </div>
                      {report.technicalDetails?.slotNumber && (
                        <div>
                          🎬 Escena: <strong className="text-slate-200">#{report.technicalDetails.slotNumber}</strong>
                        </div>
                      )}
                      {report.technicalDetails?.model && (
                        <div>
                          🧠 Modelo: <strong className="text-slate-200">{report.technicalDetails.model}</strong>
                        </div>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        {report.status === 'pending' ? (
                          <button
                            onClick={() => {
                              updateUserReportStatus(report.id, 'resolved');
                              loadData();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcar como Resuelto</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              updateUserReportStatus(report.id, 'pending');
                              loadData();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <span>Reabrir Caso</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleCopyTicket(report)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          {copiedId === report.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === report.id ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este reporte permanentemente?')) {
                            deleteUserReport(report.id);
                            loadData();
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar reporte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TELEGRAM CONFIG */}
        {activeTab === 'telegram' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Formulario */}
            <div className="md:col-span-2 space-y-6">
              <form onSubmit={handleSaveTelegram} className="p-6 rounded-3xl bg-[#0a0d14] border border-white/10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Vincular Bot de Telegram</h3>
                    <p className="text-xs text-slate-400">
                      Recibe notificaciones en tu celular cada vez que un usuario reporte un error
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      1. Telegram Bot Token:
                    </label>
                    <input
                      type="text"
                      value={telegramConfig.telegramBotToken}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, telegramBotToken: e.target.value })}
                      placeholder="Ej: 7123456789:AAHq_mX12ABCDEFghijKLMnopQRSTuvwxYZ"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#050608] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Obtenido de @BotFather en Telegram al crear tu bot.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      2. Telegram Chat ID (Tu chat personal o grupo):
                    </label>
                    <input
                      type="text"
                      value={telegramConfig.telegramChatId}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, telegramChatId: e.target.value })}
                      placeholder="Ej: 123456789 (o -100123456789 si es canal/grupo)"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#050608] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tu ID numérico de Telegram (puedes verlo hablándole a @userinfobot).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      3. Webhook URL Adicional (Opcional - Make / Discord / Zapier):
                    </label>
                    <input
                      type="url"
                      value={telegramConfig.genericWebhookUrl}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, genericWebhookUrl: e.target.value })}
                      placeholder="https://hook.eu1.make.com/... o https://discord.com/api/webhooks/..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#050608] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.notifyOnUserReport}
                        onChange={(e) => setTelegramConfig({ ...telegramConfig, notifyOnUserReport: e.target.checked })}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>Enviar mensaje inmediato cuando un alumno reporte un fallo</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={isTestingTelegram || !telegramConfig.telegramBotToken || !telegramConfig.telegramChatId}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isTestingTelegram ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>Probar Envío a Telegram</span>
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                  >
                    {savedSuccess ? '¡Configuración Guardada!' : 'Guardar Configuración'}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                    testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'
                  }`}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Guía Rápida */}
            <div className="p-6 rounded-3xl bg-[#0a0d14] border border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>¿Cómo crear tu Bot en 1 minuto?</span>
              </h4>

              <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  Abre Telegram y busca al usuario <strong>@BotFather</strong>.
                </li>
                <li>
                  Envía el comando <code>/newbot</code>, dale un nombre y un usuario (ej: <code>BulkSceneAlertsBot</code>).
                </li>
                <li>
                  BotFather te responderá con tu <strong>HTTP API Token</strong>. Cópialo y pégalo arriba en el paso 1.
                </li>
                <li>
                  Abre tu nuevo bot en Telegram y dale clic al botón <strong>"Iniciar"</strong> o escribe <code>/start</code>.
                </li>
                <li>
                  Busca a <strong>@userinfobot</strong> en Telegram y te dará tu <strong>Id</strong> numérico. Pégalo en el paso 2 y haz clic en <i>"Probar Envío"</i>.
                </li>
              </ol>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-mono">
                💡 ¡Listo! Cada error que reporten los alumnos te vibrará en el celular al segundo exacto.
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TELEMETRÍA AUTOMÁTICA */}
        {activeTab === 'telemetria' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#0a0d14] p-4 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white">Excepciones y Errores de Scripts Capturados</h3>
                <p className="text-xs text-slate-400">
                  Logs automáticos capturados en background (APIs, timeouts, sintaxis o promesas no resueltas)
                </p>
              </div>

              {telemetryErrors.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('¿Vaciar los logs de telemetría?')) {
                      clearStoredErrorReports();
                      loadData();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar Historial</span>
                </button>
              )}
            </div>

            {telemetryErrors.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-[#0a0d14] border border-white/5 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Cero errores de script en el historial</h4>
                <p className="text-xs text-slate-400">La aplicación se está ejecutando sin excepciones no capturadas.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {telemetryErrors.map((err) => (
                  <div key={err.id} className="p-4 rounded-2xl bg-[#0a0d14] border border-white/5 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">{err.errorCode}</span>
                        <span>•</span>
                        <span>{err.stage}</span>
                      </div>
                      <span>{new Date(err.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <div className="text-slate-200 font-bold">{err.errorMessage}</div>

                    <div className="text-slate-400 text-[11px]">
                      🔍 <strong>Causa probable:</strong> {err.possibleCause}
                    </div>

                    <div className="text-emerald-400 text-[11px]">
                      💡 <strong>Solución:</strong> {err.suggestedSolution}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LEADS EMAIL MARKETING */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#0a0d14] p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400">Total Leads Capturados</span>
                <div className="text-2xl font-black text-amber-400">{marketingLeads.length}</div>
                <p className="text-[11px] text-slate-500">Usuarios con funciones bloqueadas en el Estudio</p>
              </div>

              <div className="bg-[#0a0d14] p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-cyan-400">Nuevos Prospectos</span>
                <div className="text-2xl font-black text-cyan-300">
                  {marketingLeads.filter(l => l.tipo_lead === 'nuevo_prospecto').length}
                </div>
                <p className="text-[11px] text-slate-500">No registrados previamente en Skool</p>
              </div>

              <div className="bg-[#0a0d14] p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-rose-400">Suscripciones Expiradas</span>
                <div className="text-2xl font-black text-rose-300">
                  {marketingLeads.filter(l => l.tipo_lead === 'suscripcion_expirada' || l.tipo_lead === 'cuenta_inactiva').length}
                </div>
                <p className="text-[11px] text-slate-500">Alumnos anteriores para campaña de reactivación</p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0d14] p-4 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>Base de Datos para Email Marketing</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Registrados en tiempo real desde la tabla <code>leads_marketing</code> de Supabase
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyLeadsEmails}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  {leadsCopiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{leadsCopiedSuccess ? '¡Correos Copiados!' : 'Copiar Correos (Email Marketing)'}</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  onClick={handleCopySql}
                  className="px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Copiar script SQL para crear la tabla en Supabase"
                >
                  {sqlCopiedSuccess ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Terminal className="w-3.5 h-3.5 text-purple-400" />}
                  <span>{sqlCopiedSuccess ? '¡SQL Copiado!' : 'Copiar SQL Supabase'}</span>
                </button>
              </div>
            </div>

            {/* SQL Banner Helper */}
            <div className="p-4 rounded-2xl bg-[#0e121d] border border-amber-500/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Script SQL para Supabase (Tabla: leads_marketing)</span>
                </span>
                <button
                  onClick={handleCopySql}
                  className="text-[11px] font-mono text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{sqlCopiedSuccess ? 'Copiado al portapapeles' : 'Copiar Script'}</span>
                </button>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Ejecuta este script en el <strong>SQL Editor</strong> de Supabase para que los clientes anónimos puedan guardar sus correos sin bloqueos de políticas RLS.
              </p>
              <pre className="p-3 rounded-xl bg-black/50 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-32 scrollbar-thin">
                {SUPABASE_LEADS_SQL}
              </pre>
            </div>

            {/* Leads Table */}
            {marketingLeads.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-[#0a0d14] border border-white/5 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-600" />
                <h4 className="text-sm font-bold text-white">No hay leads registrados aún</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Cuando un usuario nuevo o con suscripción vencida intente ingresar, se registrará aquí de manera automática.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#0a0d14] border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono uppercase text-slate-400">
                      <tr>
                        <th className="py-3 px-4">Correo Electrónico</th>
                        <th className="py-3 px-4">Tipo de Lead</th>
                        <th className="py-3 px-4">Intentos de Acceso</th>
                        <th className="py-3 px-4">Último Intento</th>
                        <th className="py-3 px-4">Vencimiento Anterior</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {marketingLeads.map((lead, idx) => {
                        const isExpired = lead.tipo_lead === 'suscripcion_expirada';
                        const isInactive = lead.tipo_lead === 'cuenta_inactiva';

                        return (
                          <tr key={lead.email || idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-white">
                              {lead.email}
                            </td>
                            <td className="py-3 px-4">
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                                  <span>Expirado (Ex Alumno)</span>
                                </span>
                              ) : isInactive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/30 text-[10px] font-semibold">
                                  <span>Cuenta Inactiva</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold">
                                  <span>Nuevo Prospecto</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              <span className="px-2 py-0.5 rounded-md bg-white/5 font-bold">
                                {lead.intentos_acceso || 1}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {lead.ultimo_intento ? new Date(lead.ultimo_intento).toLocaleString('es-ES') : 'Reciente'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {lead.fecha_expiracion_anterior
                                ? new Date(lead.fecha_expiracion_anterior).toLocaleDateString('es-ES')
                                : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(lead.email);
                                  setCopiedId(lead.email);
                                  setTimeout(() => setCopiedId(null), 1500);
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                title="Copiar correo"
                              >
                                {copiedId === lead.email ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
