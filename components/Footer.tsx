import React, { memo } from 'react';

interface FooterProps {
    onNavigate: (page: 'privacy' | 'terms') => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
    return (
        <footer className="w-full bg-slate-900/50 border-t border-slate-700/50 p-4 mt-8">
            <div className="max-w-7xl mx-auto flex justify-center items-center gap-6 text-sm">
                <button 
                    onClick={() => onNavigate('privacy')} 
                    className="text-slate-400 hover:text-violet-400 transition-colors"
                >
                    Política de Privacidad
                </button>
                <span className="text-slate-600">|</span>
                <button 
                    onClick={() => onNavigate('terms')} 
                    className="text-slate-400 hover:text-violet-400 transition-colors"
                >
                    Términos de Servicio
                </button>
            </div>
        </footer>
    );
};

export default memo(Footer);
