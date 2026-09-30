import React, { useState, useEffect } from 'react';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckIcon from './icons/CheckIcon';

const OriginDisplay: React.FC = () => {
    const [origin, setOrigin] = useState('');
    const [hasCopied, setHasCopied] = useState(false);

    useEffect(() => {
        // Ensure this runs only on the client side
        setOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        if (hasCopied) {
            const timer = setTimeout(() => setHasCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [hasCopied]);

    const handleCopy = () => {
        if (origin) {
            navigator.clipboard.writeText(origin);
            setHasCopied(true);
        }
    };

    if (!origin) return null;

    return (
        <div className="space-y-2">
            <label htmlFor="origin-url" className="block text-sm font-medium text-slate-300">
                URL de Origen para Credenciales de Google
            </label>
            <div className="flex items-center gap-2">
                <input
                    id="origin-url"
                    type="text"
                    value={origin}
                    readOnly
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 font-mono text-xs"
                />
                <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition-colors flex-shrink-0"
                    title={hasCopied ? "¡Copiado!" : "Copiar URL de Origen"}
                >
                    {hasCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5 text-slate-300" />}
                </button>
            </div>
        </div>
    );
};

export default OriginDisplay;
