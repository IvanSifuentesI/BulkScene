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
  Cpu 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  const navItems = [
    {
      id: 'guion' as AppStage,
      label: 'Director de Guion',
      icon: Clapperboard,
      badge: 'IA',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      activeStyle: 'bg-[#0a231b] border-emerald-500/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      indicatorColor: 'bg-emerald-400',
      iconColor: 'text-emerald-400',
      iconActiveBg: 'bg-emerald-500 text-black',
    },
    {
      id: 'imagenes' as AppStage,
      label: 'Generador Masivo',
      icon: Zap,
      badge: totalScenesCount > 0 ? `${completedScenesCount}/${totalScenesCount}` : null,
      badgeClass: 'bg-emerald-500/20 text-emerald-300',
      activeStyle: 'bg-[#0a231b] border-emerald-500/60 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      indicatorColor: 'bg-emerald-400',
      iconColor: 'text-emerald-400',
      iconActiveBg: 'bg-emerald-500 text-black',
    },
    {
      id: 'personajes' as AppStage,
      label: 'Banco de Personajes',
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
      label: 'Banco de Estilos',
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
      label: 'Voz & Whisper',
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
      label: 'Desglose de Escenas',
      icon: Film,
      badge: totalScenesCount > 0 ? `${totalScenesCount}` : null,
      badgeClass: 'bg-indigo-500/20 text-indigo-300',
      activeStyle: 'bg-[#18132c] border-indigo-500/60 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.15)]',
      indicatorColor: 'bg-indigo-400',
      iconColor: 'text-indigo-400',
      iconActiveBg: 'bg-indigo-500 text-white',
    },
    {
      id: 'showcase' as AppStage,
      label: 'Ver Landing SaaS',
      icon: Globe,
      badge: null,
      badgeClass: '',
      activeStyle: 'bg-[#0f172a] border-blue-500/60 text-blue-300',
      indicatorColor: 'bg-blue-400',
      iconColor: 'text-blue-400',
      iconActiveBg: 'bg-blue-500 text-white',
    },
    {
      id: 'ajustes' as AppStage,
      label: 'Configuración & APIs',
      icon: Settings,
      badge: `${nvidiaKeysCount} keys`,
      badgeClass: 'bg-white/5 text-slate-400',
      activeStyle: 'bg-[#131722] border-slate-500/60 text-slate-200',
      indicatorColor: 'bg-slate-300',
      iconColor: 'text-slate-400',
      iconActiveBg: 'bg-slate-700 text-white',
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div className="truncate">
              <h1 className="font-black text-sm tracking-wide text-white leading-tight flex items-center gap-1.5">
                <span>BulkScene</span>
                <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  PRO
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">
                Batch Video Engine
              </p>
            </div>
          </div>
        ) : (
          <div 
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
            onClick={() => setCurrentStage('guion')}
            title="BulkScene PRO"
          >
            <Sparkles className="w-5 h-5 text-black" />
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

      {/* HyperRender Status Capsule */}
      {!isCollapsed && (
        <div className="mx-3 mt-3 p-3 rounded-2xl bg-[#0b0e17] border border-white/[0.05] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-[11px] font-bold text-white leading-none">HyperRender™ v3</p>
              <p className="text-[9px] font-mono text-slate-400 mt-1">Cluster Activo • 2.4s/img</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentStage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentStage(item.id)}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center transition-all duration-200 rounded-xl relative group border ${
                isCollapsed
                  ? 'justify-center p-3'
                  : 'gap-3 px-3.5 py-2.5 text-left'
              } ${
                isActive
                  ? item.activeStyle
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border-transparent'
              }`}
            >
              {/* Icon container */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold transition-all ${
                  isActive
                    ? item.iconActiveBg
                    : `bg-white/[0.04] ${item.iconColor} group-hover:bg-white/[0.08]`
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-inherit' : item.iconColor}`} />
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1 truncate flex items-center justify-between gap-1">
                  <span
                    className={`text-xs font-bold truncate ${
                      isActive ? 'text-white font-extrabold' : 'text-slate-300 group-hover:text-white'
                    }`}
                  >
                    {item.label}
                  </span>
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
            <div className="p-2.5 rounded-xl bg-[#0e111a] flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 font-mono uppercase">Sesión Creador</p>
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

            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-emerald-400" />
                <span>NVIDIA NIM</span>
              </span>
              <span className="text-emerald-400 font-bold">● ONLINE</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
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
