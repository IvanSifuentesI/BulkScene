
import React, { useState, useEffect, useCallback, memo } from 'react';
import { AutoPacingConfig } from '../types';

interface AutoPacingModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AutoPacingConfig;
    onSave: (newConfig: AutoPacingConfig) => void;
}

const AutoPacingModal: React.FC<AutoPacingModalProps> = ({ isOpen, onClose, config, onSave }) => {
    const [localConfig, setLocalConfig] = useState(config);

    useEffect(() => {
        setLocalConfig(config);
    }, [config, isOpen]);

    const handleChange = (field: keyof AutoPacingConfig, value: string) => {
        const numValue = parseFloat(value);
        if (value === '' || (!isNaN(numValue) && numValue >= 0.5)) {
            setLocalConfig(prev => ({ ...prev, [field]: value === '' ? 1 : numValue }));
        }
    };
    
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onSave(localConfig);
        onClose();
    }, [onSave, localConfig, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-violet-400">Regla de Oro (Ritmo)</h2>
                    <div className="px-3 py-1 rounded bg-violet-900/50 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase">
                        Modo: {localConfig.mode}
                    </div>
                </div>
                
                <p className="text-slate-400 mb-6 text-sm">
                    La IA obedecerá estrictamente estos rangos de tiempo. 
                    <span className="block mt-1 text-amber-400 font-semibold">⚠️ Bajo ninguna circunstancia se generarán cortes fuera de estos límites.</span>
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* HOOK CONFIG */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border-l-4 border-l-orange-500 border-t border-r border-b border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-orange-400">🔥 Hook (Inicio)</h3>
                            <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">Primeras {localConfig.hookThresholdWords} palabras</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300 whitespace-nowrap">Rango:</span>
                            <input 
                                type="number" step="0.5" min="0.5"
                                value={localConfig.hookMinSeconds} 
                                onChange={e => handleChange('hookMinSeconds', e.target.value)} 
                                className="w-20 bg-slate-700 border border-slate-600 p-2 rounded text-center font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                            />
                            <span className="text-slate-500 font-bold">-</span>
                            <input 
                                type="number" step="0.5" min={localConfig.hookMinSeconds}
                                value={localConfig.hookMaxSeconds} 
                                onChange={e => handleChange('hookMaxSeconds', e.target.value)} 
                                className="w-20 bg-slate-700 border border-slate-600 p-2 rounded text-center font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                            />
                            <span className="text-sm text-slate-300">segundos / imagen</span>
                        </div>
                    </div>

                    {/* REST CONFIG */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border-l-4 border-l-blue-500 border-t border-r border-b border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-blue-400">📖 Resto del Guion</h3>
                            <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">Desde la palabra {localConfig.hookThresholdWords + 1}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300 whitespace-nowrap">Rango:</span>
                            <input 
                                type="number" step="0.5" min="0.5"
                                value={localConfig.restMinSeconds} 
                                onChange={e => handleChange('restMinSeconds', e.target.value)} 
                                className="w-20 bg-slate-700 border border-slate-600 p-2 rounded text-center font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                            <span className="text-slate-500 font-bold">-</span>
                            <input 
                                type="number" step="0.5" min={localConfig.restMinSeconds}
                                value={localConfig.restMaxSeconds} 
                                onChange={e => handleChange('restMaxSeconds', e.target.value)} 
                                className="w-20 bg-slate-700 border border-slate-600 p-2 rounded text-center font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                            <span className="text-sm text-slate-300">segundos / imagen</span>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-4 pt-4 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition-colors">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-bold shadow-lg shadow-violet-900/20 transition-colors">Guardar Regla</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default memo(AutoPacingModal);
