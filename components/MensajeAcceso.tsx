
import React from 'react';
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
        return dateString; // Fallback to original string if format is invalid
    }
};

const MensajeAcceso: React.FC<MensajeAccesoProps> = ({ tipo, onBack, expirationDate }) => {
  const config = {
    no_suscrito: {
      icono: '🎓',
      titulo: 'Acceso exclusivo comunidad Skool',
      descripcion: 'Este correo no tiene una suscripción activa en nuestra comunidad. Únete para obtener acceso inmediato a esta herramienta.',
      botonTexto: 'Unirme a la comunidad en Skool →',
      botonLink: 'https://www.skool.com/ia-automatiza-7412/about',
      color: 'text-indigo-400',
      secondaryText: null,
      secondaryLink: null
    },
    no_autorizado: {
      icono: '🔒',
      titulo: 'Acceso Restringido',
      descripcion: 'Este correo no está autorizado para acceder a la aplicación.',
      botonTexto: 'Unirme a la comunidad en Skool →',
      botonLink: 'https://www.skool.com/ia-automatiza-7412/about',
      color: 'text-red-400',
      secondaryText: null,
      secondaryLink: null
    },
    expirado: {
      icono: '⏰',
      titulo: 'Tu acceso ha finalizado',
      descripcion: `Tu suscripción finalizó el ${formatDate(expirationDate)}. Para seguir disfrutando de esta y todas las herramientas de automatización, renueva tu acceso en nuestra comunidad.`,
      botonTexto: 'Renovar en Skool y Desbloquear Acceso →',
      botonLink: 'https://www.skool.com/ia-automatiza-7412/about',
      color: 'text-amber-400',
      secondaryText: 'Si ya renovaste, contacta a Ivan por Skool',
      secondaryLink: 'https://www.skool.com/@ivan-sifuentes-3476?g=ia-automatiza'
    },
    conflicto_dispositivo: {
      icono: '📱',
      titulo: 'Sesión Cerrada',
      descripcion: 'Tu sesión se cerró porque tu cuenta está activa en otro dispositivo no autorizado o ha cambiado tu firma de seguridad.',
      botonTexto: 'Volver a Iniciar Sesión',
      botonAction: true,
      color: 'text-orange-400',
      secondaryText: null,
      secondaryLink: null
    },
    cuenta_desactivada: {
      icono: '🚫',
      titulo: 'Cuenta Desactivada',
      descripcion: 'Tu cuenta ha sido desactivada temporalmente por un administrador.',
      botonTexto: 'Contactar Soporte en Skool',
      botonLink: 'https://www.skool.com/ia-automatiza-7412/about',
      color: 'text-slate-400',
      secondaryText: null,
      secondaryLink: null
    },
    limite_dispositivos: {
        icono: '🚧',
        titulo: 'Límite de Dispositivos',
        descripcion: 'Has alcanzado el máximo de 2 dispositivos permitidos simultáneamente. Por favor, cierra sesión en uno de tus otros equipos para poder ingresar aquí, o contacta al administrador.',
        botonTexto: 'Volver al Inicio',
        botonAction: true,
        color: 'text-yellow-400',
        secondaryText: null,
        secondaryLink: null
    }
  }[tipo];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Fondo decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-violet-600/15 rounded-full blur-[110px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:28px_28px] opacity-25" />
      </div>

      <div className="max-w-[480px] w-full bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(59,130,246,0.08)] p-8 sm:p-9 text-center animate-fade-in z-10 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-blue-400/50 before:to-transparent">
        
        {/* Botón Volver (Solo si se proporciona la función onBack) */}
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-4 left-4 text-slate-500 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
            title="Volver al inicio"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver
          </button>
        )}

        <div className="text-6xl mb-6 drop-shadow-lg filter animate-bounce-slow mt-4">{config.icono}</div>
        
        <h2 className={`text-2xl font-bold mb-4 ${config.color}`}>
          {config.titulo}
        </h2>
        
        <p className="text-slate-300 mb-8 leading-relaxed text-sm md:text-base">
          {config.descripcion}
        </p>

        <div className="space-y-4">
          {config.botonAction ? (
             // Si es conflicto o limite, usamos el botón para reiniciar el flujo (logout)
            <LogoutButton className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-900/30 flex items-center justify-center gap-2" />
          ) : (
            <>
                <a 
                  href={config.botonLink || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-900/40 transform hover:-translate-y-0.5 flex items-center justify-center"
                >
                  {config.botonTexto}
                </a>

                {/* Secondary Button specifically for Expired users */}
                {config.secondaryText && config.secondaryLink && (
                    <a 
                        href={config.secondaryLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full py-2.5 px-4 bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-colors border border-slate-700 hover:border-slate-600"
                    >
                        {config.secondaryText}
                    </a>
                )}
            </>
          )}

          <div className="pt-4 border-t border-slate-800/50">
            {tipo === 'no_suscrito' ? (
              <p className="text-xs text-slate-500 leading-relaxed px-4">
                Si eres alumno de Skool, envía un mensaje a Iván a través de la academia.
              </p>
            ) : (
              !config.botonAction && <LogoutButton variant="text" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MensajeAcceso;
