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
  Activity
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
  AdminTelegramConfig,
  UserErrorReport
} from '../services/adminReportingService';
import { getStoredErrorReports, clearStoredErrorReports, TelemetryErrorReport } from '../services/errorTelemetryService';

export const AdminDashboard: React.FC = () => {
  // Estado de autenticación del panel admin
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const email = localStorage.getItem('bulkscene_user_email');
      const isAdminSession = localStorage.getItem('bulkscene_admin_authenticated');
      return email === 'ivansifuentes1998@gmail.com' || isAdminSession === 'true';
    } catch {
      return false;
    }
  });

  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'reportes' | 'telegram' | 'telemetria'>('reportes');

  // Configuración de Telegram
  const [telegramConfig, setTelegramConfig] = useState<AdminTelegramConfig>(getTelegramConfig());
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Listas de datos
  const [userReports, setUserReports] = useState<UserErrorReport[]>([]);
  const [telemetryErrors, setTelemetryErrors] = useState<TelemetryErrorReport[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = () => {
    setUserReports(getUserErrorReports());
    setTelemetryErrors(getStoredErrorReports());
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Clave de acceso administrativa
    if (adminPin === 'admin2026' || adminPin === 'bulkscene@2026' || adminPin === '1998') {
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

  const handleCopyTicket = (report: UserErrorReport) => {
    const text = `TICKET: ${report.id}\nUsuario: ${report.userEmail}\nEtapa: ${report.stage}\nMensaje: ${report.userComment}\nError: ${report.errorMessage || 'N/A'}\nFecha: ${report.timestamp}`;
    navigator.clipboard.writeText(text);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
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
      </div>
    </div>
  );
};

export default AdminDashboard;
