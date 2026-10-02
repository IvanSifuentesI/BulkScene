import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowLeft, 
  ExternalLink, 
  Lock, 
  Clock, 
  AlertTriangle, 
  GraduationCap, 
  ShieldAlert,
  UserX
} from 'lucide-react';
import LogoutButton from './LogoutButton';

type TipoMensaje = 'expirado' | 'no_suscrito' | 'conflicto_dispositivo' | 'cuenta_desactivada' | 'no_autorizado' | 'limite_dispositivos';

interface MensajeAccesoProps {
  tipo: TipoMensaje;
  onBack?: () => void;
  expirationDate?: string | null;
}

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'hace un tiempo';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

export const MensajeAcceso: React.FC<MensajeAccesoProps> = ({ tipo, onBack, expirationDate }) => {
  const config = {
    no_suscrito: {
      icono: '🎓',
      titulo: 'Acceso Comunidad Skool',
      descripcion: 'Este correo no cuenta con membresía activa. Únete para obtener acceso completo a BulkScene Studio.',
      botonTexto: 'Unirme a Skool ($14/mes)',
      botonLink: 'https://www.skool.com/ia-automatiza-7412/about',
      color: 'text-emerald-400',
      secondaryText: null,
      secondaryLink: null
    },
    no_autorizado: {
      icono: '🔒',
      titulo: 'Acceso Restringido',
      descripcion: 'Este correo no está registrado como miembro activo de la plataforma.',
      botonTexto: 'Acceso Skool ($14/mes)',
      botonLink: 'https://www.skool.com/ia-automatiza-7412/about',
      color: 'text-red-400',
      secondaryText: null,
      secondaryLink: null
    },
    expirado: {
      icono: '⏰',
      titulo: 'Tu Acceso Ha Finalizado',
      descripcion: `Tu suscripción finalizó el ${formatDate(expirationDate)}. Reactiva tu membresía para continuar creando.`,
      botonTexto: 'Reactivar Acceso ($14/mes)',
      botonLink: 'https://www.skool.com/ia-automatiza-7412/about',
      color: 'text-amber-400',
      secondaryText: 'Si ya renovaste, contacta a Iván por Skool',
      secondaryLink: 'https://www.skool.com/@ivan-sifuentes-3476?g=ia-automatiza'
    },
    conflicto_dispositivo: {
      icono: '📱',
      titulo: 'Sesión en Otro Equipo',
      descripcion: 'Tu cuenta inició sesión en otro dispositivo o ha cambiado tu firma de seguridad.',
      botonTexto: 'Iniciar Sesión',
      botonAction: true,
      color: 'text-cyan-400',
      secondaryText: null,
      secondaryLink: null
    },
    cuenta_desactivada: {
      icono: '🚫',
      titulo: 'Cuenta Desactivada',
      descripcion: 'Tu cuenta ha sido pausada o desactivada.',
      botonTexto: 'Contactar Soporte',
      botonLink: 'https://www.skool.com/ia-automatiza-7412/about',
      color: 'text-slate-400',
      secondaryText: null,
      secondaryLink: null
    },
    limite_dispositivos: {
      icono: '🚧',
      titulo: 'Límite de Dispositivos Simultáneos',
      descripcion: 'Has alcanzado el límite máximo de 2 dispositivos activos permitidos simultáneamente. Cierra sesión en tu otro equipo para ingresar aquí.',
      botonTexto: 'Volver al Inicio',
      botonAction: true,
      color: 'text-amber-400',
      secondaryText: null,
      secondaryLink: null
    }
  }[tipo];

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Bar matching Studio & Login */}
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

        {onBack ? (
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Login</span>
          </button>
        ) : (
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Inicio</span>
          </Link>
        )}
      </header>

      {/* Main Container in Studio Glassmorphic Style */}
      <main className="flex-1 flex items-center justify-center p-4 py-12 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md z-10 animate-fade-in space-y-6">
          <div className="relative rounded-3xl bg-[#0a0d14] border border-white/10 p-7 sm:p-9 shadow-[0_0_80px_rgba(16,185,129,0.12)] overflow-hidden text-center">
            {/* Top highlight bar */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

            <div className="text-5xl mb-4 drop-shadow-lg filter animate-bounce-slow mt-2">
              {config.icono}
            </div>

            <h2 className={`text-xl sm:text-2xl font-black mb-3 ${config.color}`}>
              {config.titulo}
            </h2>

            <p className="text-slate-300 mb-6 leading-relaxed text-sm">
              {config.descripcion}
            </p>

            <div className="space-y-3">
              {config.botonAction ? (
                <LogoutButton className="w-full py-3 px-6 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm" />
              ) : (
                <>
                  <a
                    href={config.botonLink || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <span>{config.botonTexto}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {config.secondaryText && config.secondaryLink && (
                    <a
                      href={config.secondaryLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors border border-white/10"
                    >
                      {config.secondaryText}
                    </a>
                  )}
                </>
              )}

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Probar con otro correo</span>
                </button>
              )}

              <div className="pt-3 border-t border-white/5">
                {tipo === 'no_suscrito' || tipo === 'no_autorizado' ? (
                  <p className="text-xs text-slate-500 leading-relaxed px-2">
                    Si ya adquiriste tu acceso en Skool con otro correo o necesitas soporte, comunícate directamente con la academia.
                  </p>
                ) : (
                  !config.botonAction && <LogoutButton variant="text" />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Studio Footer */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-white/[0.04]">
        <span>BulkScene Studio • Sistema de Verificación Automática de Membresías</span>
      </footer>
    </div>
  );
};

export default MensajeAcceso;
