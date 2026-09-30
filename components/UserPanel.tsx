
import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import LogoutButton from './LogoutButton';

const UserPanel: React.FC = () => {
  const [email, setEmail] = useState('');
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.warn("Session error in UserPanel:", sessionError.message);
            return;
        }

        if (isMounted && session?.user?.email) {
          setEmail(session.user.email);
          
          const { data, error: dataError } = await supabase
            .from('usuarios_autorizados')
            .select('fecha_expiracion')
            .eq('email', session.user.email)
            .single();

          if (dataError) {
             // PGRST116 code means no rows returned (user not in whitelist yet or similar)
             if (dataError.code !== 'PGRST116') {
                 console.warn("Error fetching user data:", dataError.message);
             }
             return;
          }

          if (isMounted && data?.fecha_expiracion) {
            const expDate = new Date(data.fecha_expiracion);
            const now = new Date();
            const diffTime = expDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysLeft(diffDays);
          }
        }
      } catch (err) {
        // Catch generic network errors (like Failed to fetch) to prevent app crash
        console.error("UserPanel fetch error:", err);
      }
    };

    fetchUserData();

    return () => { isMounted = false; };
  }, []);

  const getStatusColor = () => {
    if (daysLeft === null) return 'bg-slate-500';
    if (daysLeft > 15) return 'bg-green-500';
    if (daysLeft > 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (daysLeft === null) return 'Cargando...';
    if (daysLeft < 0) return 'Expirado';
    return `${daysLeft} días restantes`;
  };

  return (
    <div className="bg-slate-900/50 border-t border-slate-800 p-4">
      {/* Cabecera Usuario */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300 font-bold text-lg shadow-inner">
          {email.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium text-white truncate" title={email}>{email}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            <span className="text-xs text-slate-400">{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        {daysLeft !== null && daysLeft < 7 && (
          <a 
            href="https://www.skool.com/ia-automatiza-7412/about" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block w-full text-center px-3 py-2 rounded-lg bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 text-xs font-semibold transition-colors border border-indigo-500/30 mb-2"
          >
            ⚡ Renovar Acceso
          </a>
        )}

        <LogoutButton className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 rounded-lg transition-colors border border-red-900/20" />
      </div>
    </div>
  );
};

export default UserPanel;
