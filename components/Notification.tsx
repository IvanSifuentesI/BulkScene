
import React, { useState, useEffect } from 'react';
import CheckIcon from './icons/CheckIcon';
import InfoIcon from './icons/InfoIcon';
import ClipboardIcon from './icons/ClipboardIcon';

export interface NotificationProps {
    message: string;
    title?: string;
    type?: 'success' | 'error' | 'info' | 'warning' | 'critical';
    technicalDetails?: string; // Para errores que se envían a soporte
    onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, title, type = 'success', technicalDetails, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [copied, setCopied] = useState(false);

    // Auto-close solo si NO es un error crítico
    useEffect(() => {
        if (type !== 'critical' && type !== 'error') {
            const timer = setTimeout(() => {
                setIsVisible(false);
                if (onClose) onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [type, onClose]);

    const handleCopyError = () => {
        if (technicalDetails) {
            navigator.clipboard.writeText(technicalDetails);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isVisible) return null;

    let bgClass = "bg-slate-800";
    let borderClass = "border-slate-700";
    let iconColor = "text-slate-400";
    let Icon = InfoIcon;

    switch (type) {
        case 'success':
            bgClass = "bg-green-900/90";
            borderClass = "border-green-500/50";
            iconColor = "text-green-400";
            Icon = CheckIcon;
            break;
        case 'warning':
            bgClass = "bg-amber-900/90";
            borderClass = "border-amber-500/50";
            iconColor = "text-amber-400";
            Icon = InfoIcon;
            break;
        case 'error':
            bgClass = "bg-red-900/90";
            borderClass = "border-red-500/50";
            iconColor = "text-red-300";
            Icon = InfoIcon;
            break;
        case 'critical':
            bgClass = "bg-red-950";
            borderClass = "border-red-500";
            iconColor = "text-red-500";
            Icon = (props) => (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
            );
            break;
        default: // info
            bgClass = "bg-blue-900/90";
            borderClass = "border-blue-500/50";
            iconColor = "text-blue-400";
            break;
    }

    return (
        <div className={`fixed bottom-6 right-6 max-w-md w-full animate-fade-in z-[100]`}>
            <div className={`${bgClass} border ${borderClass} rounded-xl shadow-2xl overflow-hidden backdrop-blur-md`}>
                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 mt-1 ${iconColor}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-grow">
                            {title && <h3 className={`font-bold text-lg mb-1 ${type === 'critical' ? 'text-white' : 'text-slate-100'}`}>{title}</h3>}
                            <p className={`text-sm leading-relaxed ${type === 'critical' ? 'text-red-100' : 'text-slate-300'}`}>
                                {message}
                            </p>
                            
                            {type === 'critical' && (
                                <div className="mt-4 bg-black/30 rounded-lg p-3 border border-red-500/30">
                                    <p className="text-xs text-red-200 mb-2 font-semibold uppercase tracking-wider">Acción Requerida:</p>
                                    <p className="text-xs text-slate-300 mb-3">
                                        Toma una captura de pantalla y envíasela a Iván junto con el código de error.
                                    </p>
                                    <button 
                                        onClick={handleCopyError}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-800/50 hover:bg-red-700/50 rounded text-xs font-mono text-red-100 transition-colors border border-red-500/30"
                                    >
                                        {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                                        {copied ? "¡Copiado al portapapeles!" : "Copiar Error Técnico"}
                                    </button>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => { setIsVisible(false); if(onClose) onClose(); }}
                            className="text-slate-400 hover:text-white transition-colors p-1"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                {/* Progress bar for auto-closing notifications */}
                {type !== 'critical' && type !== 'error' && (
                    <div className="h-1 w-full bg-slate-700/30">
                        <div className={`h-full ${iconColor.replace('text-', 'bg-')} animate-[shrink_5s_linear_forwards]`} style={{ width: '100%' }}></div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
};

export default Notification;
