import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  CheckCircle2, 
  ExternalLink,
  Flame,
  ArrowLeft,
  Users
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { getPricingConfig, PricingConfig, DEFAULT_PRICING_CONFIG } from '../services/pricingService';
import { validateUserSubscription } from '../services/subscriptionService';

export const Registro: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);

  const navigate = useNavigate();

  useEffect(() => {
    getPricingConfig().then(setPricing);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    const emailLower = email.toLowerCase().trim();
    if (!emailLower) {
      setLoading(false);
      return;
    }

    try {
      // 1. Verificar si ya está en usuarios_autorizados
      const { data: existing, error: queryError } = await supabase
        .from('usuarios_autorizados')
        .select('id, activo, fecha_expiracion')
        .eq('email', emailLower)
        .maybeSingle();

      if (existing) {
        setSuccessMessage('¡Tu cuenta ya está registrada y autorizada! Redirigiendo al login...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
        return;
      }

      // 2. Registrar solicitud de acceso
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 30); // 30 días de suscripción inicial

      const { error: insertError } = await supabase
        .from('usuarios_autorizados')
        .insert({
          email: emailLower,
          activo: true,
          fecha_expiracion: expDate.toISOString(),
          creado_en: new Date().toISOString()
        });

      if (insertError) {
        console.warn('[REGISTRO] Supabase insert warning:', insertError);
        // Si no tiene permisos de inserción directa, creamos sesión local de cortesía
      }

      // Autenticar y validar estado
      await validateUserSubscription(emailLower);

      localStorage.setItem('bulkscene_auth_session', 'active');
      localStorage.setItem('bulkscene_user_email', emailLower);
      setSuccessMessage('¡Ingreso completado! Abriendo el Estudio...');
      setTimeout(() => {
        navigate('/app');
      }, 1000);
    } catch (err: any) {
      console.warn('[REGISTRO] Fallback local:', err);
      localStorage.setItem('bulkscene_auth_session', 'active');
      localStorage.setItem('bulkscene_user_email', emailLower);
      localStorage.setItem('bulkscene_subscription_active', 'false');
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050609] text-gray-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-purple-600/15 via-indigo-500/10 to-transparent rounded-full blur-[130px]" />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[400px] bg-gradient-to-t from-emerald-500/15 via-teal-600/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
      </div>

      <div className="w-full max-w-lg z-10 animate-fade-in">
        <div className="relative rounded-3xl bg-[#0a0c13]/90 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(168,85,247,0.08)] overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-purple-500 before:to-transparent">
          
          {/* Top Back Link */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al SaaS</span>
            </Link>

            <span className="text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
              Skool Members Only
            </span>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-[#181126] to-[#0b0813] border border-purple-500/30 text-purple-400 mb-4 shadow-xl shadow-purple-500/10">
              <Users className="w-7 h-7 text-purple-400" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Activa tu Acceso <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">Skool VIP</span>
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
              Ingresa el correo electrónico con el que te uniste a nuestra comunidad de Skool para habilitar todas las funciones del Estudio.
            </p>
          </div>

          {/* Skool Offer Banner ($14 USD) */}
          <div className="mb-6 p-4 rounded-2xl bg-[#140e24] border border-purple-500/30 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Membresía Oficial Skool
              </span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                ${pricing.price} {pricing.currency}{pricing.period}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Incluye: BulkScene Studio + Comunidad Skool + Academia completa + Mentorías y más herramientas.
            </p>
            <a
              href={pricing.skoolUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-300 hover:text-white underline pt-1"
            >
              <span>¿Aún no eres miembro? Únete en Skool aquí</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                Tu Correo de Alumno Skool
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alumno@skool.com"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>ACTIVAR MI ACCESO DE ALUMNO</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center text-xs text-slate-400 space-y-2">
            <p>
              ¿Ya tienes una cuenta activada?{' '}
              <Link to="/login" className="text-emerald-400 hover:underline font-bold">
                Iniciar Sesión Aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Registro;
