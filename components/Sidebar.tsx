import React from 'react';
import { 
  Clapperboard, 
  Zap, 
  Users, 
  Palette, 
  Mic, 
  Film, 
  Settings, 
  Globe, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Cpu,
  ShieldCheck,
  Lock 
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  isSubscriptionActive, 
  triggerSubscriptionModal, 
  getProSubscriptionInfo, 
  startSubscriptionHeartbeat, 
  ProSubscriptionInfo, 
  SKOOL_CHECKOUT_URL 
} from '../services/subscriptionService';

export type AppStage = 
  | 'guion' 
  | 'imagenes' 
  | 'personajes' 
  | 'estilos' 
  | 'audio' 
  | 'escenas' 
  | 'ajustes' 
  | 'showcase';

interface SidebarProps {
  currentStage: AppStage;
  setCurrentStage: (stage: AppStage) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  totalScenesCount: number;
  completedScenesCount: number;
  nvidiaKeysCount: number;
  userEmail?: string;
  onDownloadZip?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentStage,
  setCurrentStage,
  isCollapsed,
  toggleSidebar,
  totalScenesCount,
  completedScenesCount,
  nvidiaKeysCount,
  userEmail,
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('bulkscene_auth_session');
    localStorage.removeItem('bulkscene_user_email');
    navigate('/login');
  };

  const [proInfo, setProInfo] = React.useState<ProSubscriptionInfo>(() => getProSubscriptionInfo());

  React.useEffect(() => {
    // Escucha de heartbeat cada 1 minuto
    const unsubscribe = startSubscriptionHeartbeat((info) => {
      setProInfo(info);
    });

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ProSubscriptionInfo>;
      if (custom.detail) {
        setProInfo(custom.detail);
      } else {
        setProInfo(getProSubscriptionInfo());
      }
    };

    window.addEventListener('bulkscene_subscription_updated', handleUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener('bulkscene_subscription_updated', handleUpdate);
    };
  }, []);

  const isSubscribed = proInfo.isPro;

  const navItems = [
    {
      id: 'guion' as AppStage,
      label: '1. Estudio Master',
      icon: Clapperboard,
      badge: 'IA',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      activeStyle: 'bg-[#0a231b] border-emerald-500/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      indicatorColor: 'bg-emerald-400',
      iconColor: 'text-emerald-400',
      iconActiveBg: 'bg-emerald-500 text-black',
    },
    {
      id: 'personajes' as AppStage,
      label: '2. Personajes',
      icon: Users,
      badge: null,
      badgeClass: '',
      activeStyle: 'bg-[#240e38] border-purple-500/60 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]',
      indicatorColor: 'bg-purple-400',
      iconColor: 'text-purple-400',
      iconActiveBg: 'bg-purple-600 text-white',
    },
    {
      id: 'estilos' as AppStage,
      label: '3. Estilos',
      icon: Palette,
      badge: null,
      badgeClass: '',
      activeStyle: 'bg-[#2a1c06] border-amber-500/60 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      indicatorColor: 'bg-amber-400',
      iconColor: 'text-amber-400',
      iconActiveBg: 'bg-amber-500 text-black',
    },
    {
      id: 'audio' as AppStage,
      label: '4. Audio & Voz',
      icon: Mic,
      badge: null,
      badgeClass: '',
      activeStyle: 'bg-[#0a202c] border-cyan-500/60 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      indicatorColor: 'bg-cyan-400',
      iconColor: 'text-cyan-400',
      iconActiveBg: 'bg-cyan-500 text-black',
    },
    {
      id: 'escenas' as AppStage,
      label: '5. Escenas',
      icon: Film,
      badge: totalScenesCount > 0 ? `${totalScenesCount}` : null,
      badgeClass: 'bg-indigo-500/20 text-indigo-300',
      activeStyle: 'bg-[#18132c] border-indigo-500/60 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.15)]',
      indicatorColor: 'bg-indigo-400',
      iconColor: 'text-indigo-400',
      iconActiveBg: 'bg-indigo-500 text-white',
    },
    {
      id: 'imagenes' as AppStage,
      label: '6. Generador',
      icon: Zap,
      badge: totalScenesCount > 0 ? `${completedScenesCount}/${totalScenesCount}` : null,
      badgeClass: 'bg-emerald-500/20 text-emerald-300',
      activeStyle: 'bg-[#0a231b] border-emerald-500/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      indicatorColor: 'bg-emerald-400',
      iconColor: 'text-emerald-400',
      iconActiveBg: 'bg-emerald-500 text-black',
    },
    {
      id: 'ajustes' as AppStage,
      label: 'Configuración & APIs',
      icon: Settings,
      badge: !isSubscribed ? 'Bloqueado' : (nvidiaKeysCount > 0 ? `${nvidiaKeysCount} keys` : null),
      badgeClass: !isSubscribed ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold' : 'bg-white/5 text-slate-400',
      activeStyle: 'bg-[#131722] border-slate-500/60 text-slate-200',
      indicatorColor: 'bg-slate-300',
      iconColor: !isSubscribed ? 'text-amber-400' : 'text-slate-400',
      iconActiveBg: 'bg-slate-700 text-white',
      isLocked: !isSubscribed,
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } h-screen bg-[#07080c] border-r border-white/[0.06] flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out z-30 select-none`}
    >
      {/* Brand Header */}
      <div
        className={`p-4 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        } border-b border-white/[0.04] transition-all`}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => setCurrentStage('guion')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div className="truncate">
              <h1 className="font-black text-sm tracking-wide text-white leading-tight flex items-center gap-1.5">
                <span>BulkScene</span>
                <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  PRO
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">
                Studio
              </p>
            </div>
          </div>
        ) : (
          <div 
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
            onClick={() => setCurrentStage('guion')}
            title="BulkScene Studio"
          >
            <Sparkles className="w-4 h-4 text-black" />
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Status Capsule */}
      {!isCollapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-[#0b0e17] border border-white/[0.04] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[11px] font-bold text-slate-300">Motor Activo</p>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold">2.4s/img</span>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentStage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'ajustes' && !isSubscribed) {
                  triggerSubscriptionModal({ featureName: 'Configuración & APIs', stage: 'Barra Lateral' });
                  return;
                }
                setCurrentStage(item.id);
              }}
              title={isCollapsed ? (item.id === 'ajustes' && !isSubscribed ? 'Configuración (Bloqueado)' : item.label) : ''}
              className={`w-full flex items-center transition-all duration-200 rounded-xl relative group border ${
                isCollapsed
                  ? 'justify-center p-3'
                  : 'gap-3 px-3 py-2 text-left'
              } ${
                isActive
                  ? item.activeStyle
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border-transparent'
              } ${item.id === 'ajustes' && !isSubscribed ? 'opacity-80' : ''}`}
            >
              {/* Icon container */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold transition-all relative ${
                  isActive
                    ? item.iconActiveBg
                    : `bg-white/[0.04] ${item.iconColor} group-hover:bg-white/[0.08]`
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-inherit' : item.iconColor}`} />
                {item.id === 'ajustes' && !isSubscribed && (
                  <span className="absolute -top-1 -right-1 p-0.5 bg-amber-500/90 text-black rounded-full shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1 truncate flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-white font-extrabold' : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.id === 'ajustes' && !isSubscribed && (
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                        item.badgeClass || 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Active left indicator bar */}
              {isActive && (
                <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${item.indicatorColor}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* User Session & Logout Footer */}
      <div className="p-3 border-t border-white/[0.04] bg-[#07080c] space-y-2">
        {!isCollapsed ? (
          <>
            <div className="p-2 rounded-xl bg-[#0e111a] flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 font-mono uppercase">Sesión</p>
                <p className="text-xs font-bold text-slate-300 truncate max-w-[140px]">
                  {userEmail || 'creador@bulkscene.ai'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Estado de Suscripción PRO / Verificación en tiempo real */}
            {proInfo.isPro ? (
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                  proInfo.urgency === 'red'
                    ? 'bg-rose-500/10 border-rose-500/35 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    : proInfo.urgency === 'yellow'
                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        proInfo.urgency === 'red'
                          ? 'bg-rose-400 animate-pulse'
                          : proInfo.urgency === 'yellow'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-black px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-white/10 text-white font-sans shrink-0">
                      PRO
                    </span>
                    <span className="font-bold text-[10px] truncate" title={proInfo.label}>
                      {proInfo.label}
                    </span>
                  </div>
                </div>

                {/* Recordatorio de renovación directo a Skool */}
                <a
                  href={proInfo.skoolUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[9px] font-bold py-1 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                    proInfo.urgency === 'red'
                      ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm animate-pulse'
                      : proInfo.urgency === 'yellow'
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                  }`}
                  title="Renovar suscripción en Skool para mantener acceso ilimitado"
                >
                  <span>
                    {proInfo.urgency === 'red'
                      ? '⚠️ Renovar Urgente en Skool'
                      : proInfo.urgency === 'yellow'
                      ? '⚡ Renovar en Skool'
                      : 'Membresía Skool →'}
                  </span>
                </a>
              </div>
            ) : (
              <button
                onClick={() => triggerSubscriptionModal({ featureName: 'Desbloqueo de Suite Completa', stage: 'Sidebar' })}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] text-amber-300 font-semibold transition-all group"
                title="Haz clic para activar tu suscripción en Skool"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Sin suscripción</span>
                </span>
                <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black group-hover:scale-105 transition-transform">
                  ACTIVAR
                </span>
              </button>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-emerald-400" />
                <span>Motor Neuronal</span>
              </span>
              <span className="text-emerald-400 font-bold">● ONLINE</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {proInfo.isPro ? (
              <a
                href={proInfo.skoolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  proInfo.urgency === 'red'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
                    : proInfo.urgency === 'yellow'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                }`}
                title={`Usuario PRO: ${proInfo.label}. Clic para gestionar en Skool.`}
              >
                <span className="text-[9px] font-black uppercase font-sans">PRO</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    proInfo.urgency === 'red'
                      ? 'bg-rose-400'
                      : proInfo.urgency === 'yellow'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
              </a>
            ) : (
              <button
                onClick={() => triggerSubscriptionModal({ featureName: 'Desbloqueo de Suite Completa', stage: 'Sidebar' })}
                className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                title="Sin suscripción activa - Clic para desbloquear"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
