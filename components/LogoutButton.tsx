
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import LogoutIcon from './icons/LogoutIcon';

interface LogoutButtonProps {
  className?: string;
  variant?: 'button' | 'text';
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ className, variant = 'button' }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (variant === 'text') {
    return (
      <button 
        onClick={handleLogout}
        className={`text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2 mx-auto ${className}`}
      >
        <LogoutIcon className="w-4 h-4" /> Cerrar Sesión
      </button>
    );
  }

  return (
    <button 
      onClick={handleLogout}
      className={className || "flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 rounded-lg transition-colors w-full justify-center"}
    >
      <LogoutIcon className="w-4 h-4" />
      Cerrar Sesión
    </button>
  );
};

export default LogoutButton;
