import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Mail,
  ShieldCheck,
  ArrowLeft,
  Lock,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import MensajeAcceso from './MensajeAcceso';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewState, setViewState] = useState<'login' | 'no_suscrito' | 'expired' | 'cuenta_desactivada'>('login');
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setExpirationDate(null);

    const emailLower = email.toLowerCase().trim();
    if (!emailLower) {
      setLoading(false);
      return;
    }

    // Excepción de administración
    if (emailLower === 'admin@bulkscene.ai' || emailLower === 'ivansifuentes340@gmail.com') {
      localStorage.setItem('bulkscene_auth_session', 'active');
      localStorage.setItem('bulkscene_user_email', emailLower);
      localStorage.setItem('bulkscene_subscription_active', 'true');
      navigate('/app');
      return;
    }

    try {
      // 1. Consultar estado en Supabase (tabla usuarios_autorizados)
      const { data: userData, error: queryError } = await supabase
        .from('usuarios_autorizados')
        .select('fecha_expiracion, activo')
        .eq('email', emailLower)
        .maybeSingle();

      if (queryError) {
        console.warn('[LOGIN QUERY NOTICE]:', queryError.message);
      }

      // Caso A: El correo NO existe en la base de datos de usuarios autorizados
      if (!userData) {
        setViewState('no_suscrito');
        setLoading(false);
        return;
      }

      // Caso B: El usuario está desactivado
      if (!userData.activo) {
        setViewState('cuenta_desactivada');
        setLoading(false);
        return;
      }

      // Caso C: El usuario existe pero su suscripción ya venció
      if (userData.fecha_expiracion && new Date(userData.fecha_expiracion).getTime() < Date.now()) {
        setExpirationDate(userData.fecha_expiracion);
        setViewState('expired');
        setLoading(false);
        return;
      }

      // Caso D: Alumno autorizado, activo y con suscripción vigente
      localStorage.setItem('bulkscene_auth_session', 'active');
      localStorage.setItem('bulkscene_user_email', emailLower);
      localStorage.setItem('bulkscene_subscription_active', 'true');
      if (userData.fecha_expiracion) {
        localStorage.setItem('bulkscene_expiration_date', userData.fecha_expiracion);
      }
      navigate('/app');
    } catch (err: any) {
      console.warn('[LOGIN NOTICE]:', err);
      setViewState('no_suscrito');
    } finally {
      setLoading(false);
    }
  };

  if (viewState === 'no_suscrito') {
    return <MensajeAcceso tipo="no_suscrito" onBack={() => setViewState('login')} />;
  }
  if (viewState === 'expired') {
    return <MensajeAcceso tipo="expirado" onBack={() => setViewState('login')} expirationDate={expirationDate} />;
  }
  if (viewState === 'cuenta_desactivada') {
    return <MensajeAcceso tipo="cuenta_desactivada" onBack={() => setViewState('login')} />;
  }

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Bar matching Studio */}
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 flex items-center justify-between border-b border-white/[0.06]">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#090b10] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <span className="font-black text-lg text-white tracking-tight">
              BULKSCENE <span className="text-emerald-400">STUDIO</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                CERO APIS
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                ACCESO MIEMBROS
              </span>
            </div>
          </div>
        </Link>

        <Link
          to="/"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Inicio</span>
        </Link>
      </header>

      {/* Main Login Card in Studio Aesthetic */}
      <main className="flex-1 flex items-center justify-center p-4 py-12 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md z-10 animate-fade-in space-y-6">
          <div className="relative rounded-3xl bg-[#0a0d14] border border-white/10 p-7 sm:p-9 shadow-[0_0_80px_rgba(16,185,129,0.15)] overflow-hidden">
            {/* Top highlight bar */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

            {/* Header info */}
            <div className="text-center space-y-2 mb-7">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
                <Lock className="w-3 h-3" />
                <span>Portal Oficial para Alumnos de Skool</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Iniciar Sesión en el Estudio
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Ingresa con el correo electrónico registrado en tu membresía de Skool para abrir el estudio de producción.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  Correo Electrónico de Alumno
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alumno@skool.com"
                    className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>INGRESAR AL ESTUDIO</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Skool purchase link if not member yet */}
            <div className="mt-5 pt-4 border-t border-white/5 space-y-2 text-center">
              <p className="text-xs text-slate-400">
                ¿Aún no eres miembro de la comunidad?
              </p>
              <a
                href="https://www.skool.com/ia-automatiza-7412"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline"
              >
                <span>Unirse en Skool ($14/mes)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Feature Highlights Grid matching Studio */}
            <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Imágenes Ilimitadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Cero pagos en APIs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Consistencia de Rostro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Escalado 4K Ultra-HD</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 px-4 text-center text-[11px] text-slate-600">
        BulkScene Studio • Acceso Exclusivo para la Comunidad Oficial en Skool
      </footer>
    </div>
  );
};

export default Login;
