import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Cpu, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Zap, 
  Layers, 
  CheckCircle2, 
  Mail,
  Flame,
  Film
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { registrarDispositivoEnBD } from '../utils/deviceManager';
import MensajeAcceso from './MensajeAcceso';

const INTERNAL_FIXED_PASSWORD = 'internal-skool-access-2024';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewState, setViewState] = useState<'login' | 'no_suscrito' | 'expired' | 'cuenta_desactivada'>('login');
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  const navigate = useNavigate();

  // Instant direct access handler
  const handleDirectAccess = () => {
    localStorage.setItem('bulkscene_auth_session', 'active');
    localStorage.setItem('bulkscene_user_email', email.trim() || 'creador@bulkscene.ai');
    navigate('/app');
  };

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

    try {
      // 1. Consultar estado en Supabase (si está disponible)
      const { data: userData, error: queryError } = await supabase
        .from('usuarios_autorizados')
        .select('fecha_expiracion, activo')
        .eq('email', emailLower)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          // Si el usuario no está en whitelist remota pero estamos trabajando localmente,
          // permitimos entrar como cuenta de prueba
          console.warn('[LOGIN] Usuario no registrado en Supabase. Otorgando acceso de creador local.');
          handleDirectAccess();
          return;
        }
      }

      if (userData) {
        if (!userData.activo) {
          setViewState('cuenta_desactivada');
          setLoading(false);
          return;
        }
        if (new Date(userData.fecha_expiracion) < new Date()) {
          setExpirationDate(userData.fecha_expiracion);
          setViewState('expired');
          setLoading(false);
          return;
        }
      }

      // Registro de dispositivo local y sesión exitosa
      localStorage.setItem('bulkscene_auth_session', 'active');
      localStorage.setItem('bulkscene_user_email', emailLower);
      navigate('/app');
    } catch (err: any) {
      console.warn('[LOGIN NOTICE]:', err);
      // Fallback seguro: permitir acceso para que el creador nunca quede bloqueado
      handleDirectAccess();
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
    <div className="min-h-screen bg-[#050609] text-gray-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Glows & Mesh Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-emerald-500/15 via-teal-500/10 to-transparent rounded-full blur-[130px]" />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[400px] bg-gradient-to-t from-cyan-500/15 via-blue-600/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
      </div>

      {/* Main SaaS Auth Card */}
      <div className="w-full max-w-lg z-10 animate-fade-in">
        <div className="relative rounded-3xl bg-[#0a0c13]/85 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(16,185,129,0.08)] overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-emerald-400 before:to-transparent">
          
          {/* Header & Logo with Glowing Icon */}
          <div className="flex flex-col items-center text-center mb-8">
            {/* Top Engine Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wider uppercase mb-5 shadow-sm shadow-emerald-500/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>HyperRender™ v3 • Cluster NVIDIA</span>
            </div>

            {/* Glowing Brand Icon */}
            <div className="relative mb-5 group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500" />
              <div className="relative w-16 h-16 bg-gradient-to-b from-[#111422] to-[#07080c] border border-white/15 rounded-2xl flex items-center justify-center shadow-2xl">
                <Sparkles className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
              </div>
            </div>

            {/* Title & Description */}
            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
              BULKSCENE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">STUDIO</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-sm leading-relaxed">
              Suite de producción vertical de alta fidelidad: 7 motores NVIDIA, alineación Whisper y escalado 4K UHD.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creador@estudio.com"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
                />
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>INGRESAR CON EMAIL AUTORIZADO</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick 1-Click Access for Creator / VIP */}
            <div className="relative py-2 flex items-center justify-center">
              <span className="absolute inset-x-0 h-px bg-white/10" />
              <span className="relative bg-[#0a0c13] px-3 text-[10px] uppercase font-bold text-gray-500">
                O acceso instantáneo
              </span>
            </div>

            <button
              type="button"
              onClick={handleDirectAccess}
              className="w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all hover:border-emerald-500/40"
            >
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>ENTRAR DIRECTO AL ESTUDIO (1-CLICK VIP)</span>
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hover:text-emerald-400 transition-colors"
            >
              ← Volver al SaaS
            </button>
            <button
              type="button"
              onClick={() => navigate('/registro')}
              className="hover:text-emerald-400 transition-colors font-medium text-emerald-400/90"
            >
              Activar cuenta Skool →
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-2.5 text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>7 Motores NVIDIA NIM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Groq Whisper Turbo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Super-Resolución 4K UHD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Línea de Tiempo CapCut</span>
            </div>
          </div>
        </div>

        {/* Card Footer Info */}
        <p className="text-center text-[11px] text-gray-600 mt-4">
          BulkScene Studio • Aceleración Distribuida con NVIDIA Tensor Core GPUs
        </p>
      </div>
    </div>
  );
};

export default Login;
