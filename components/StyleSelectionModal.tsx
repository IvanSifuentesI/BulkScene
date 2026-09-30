import React, { useState, useCallback, memo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import MagicIcon from './icons/MagicIcon';

const PREDEFINED_STYLES = [
    { name: 'Realismo Cinemático', prompt: 'Hyperrealistic style, 8K, cinematic, dramatic lighting, rich and deep colors, rule of thirds composition' },
    { name: 'Sci-Fi', prompt: '8K hyper-realistic cinematic sci-fi, futuristic cyberpunk aesthetic, cool blue-cyan color palette with warm golden-orange accents, dramatic atmospheric lighting, photorealistic metallic textures with wear and patina, anamorphic lens, epic wide-angle composition, shot on 35mm film with film grain, ultra-detailed 3D rendering with ray tracing' },
    { name: 'Épica Bíblica', prompt: 'Renaissance oil painting style, divine lighting, period clothing, ancient Middle Eastern architecture, solemn and grand atmosphere' },
    { name: 'Antigua Roma (Peplum)', prompt: 'Classic Hollywood epic style, saturated Technicolor colors, detailed Roman armor and togas, monumental marble architecture, large crowds' },
    { name: 'Grecia Clásica', prompt: 'Greek red-figure pottery style, character profiles, geometric patterns, mythological scenes, limited color palette of terracotta and black' },
    { name: 'Anime Vibrante', prompt: 'Japanese anime style, vibrant colors, sharp lines, Studio Ghibli aesthetic, expressive characters, detailed backgrounds' },
    { name: 'Render 3D Moderno', prompt: 'Modern 3D animation movie style, like Pixar or Disney, characters with detailed textures, soft and realistic lighting, vivid and appealing colors' },
    { name: 'Documental de Naturaleza', prompt: 'Nature documentary style, realistic, telephoto lens shot, natural colors, high definition, sharp focus, no fantasy elements' },
    { name: 'Cyberpunk Noir', prompt: 'Cyberpunk style, neon lights, constant rain, futuristic city streets, high contrast, dark and technological atmosphere' },
    { name: 'Fantasía Épica', prompt: 'Epic fantasy art style, mystical lighting, intricate details, grand landscapes, magical atmosphere, inspired by video game concept art' },
    { name: 'Terror Psicológico', prompt: 'Psychological horror style, desaturated color palette, high contrast, deep shadows, unsettling camera angles, oppressive atmosphere' },
    { name: 'Pintura Acuarela', prompt: 'Watercolor painting style, soft edges, translucent colors, visible paper texture, dreamy and ethereal atmosphere' }
];

interface StyleSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (sceneInstructions: string) => void;
}

// Constant default value to prevent unstable hook reference
const INITIAL_CUSTOM_STYLES: {name: string, prompt: string}[] = [];

const StyleSelectionModal: React.FC<StyleSelectionModalProps> = ({ isOpen, onClose, onGenerate }) => {
    const [customStyle, setCustomStyle] = useState('');
    const [selectedStyleName, setSelectedStyleName] = useState('');
    
    // Estado para estilos personalizados
    const [savedStyles, setSavedStyles] = useLocalStorage<{name: string, prompt: string}[]>('user-custom-styles', INITIAL_CUSTOM_STYLES);
    const [isSaving, setIsSaving] = useState(false);
    const [newStyleName, setNewStyleName] = useState('');

    const handleStyleSelect = useCallback((style: { name: string; prompt: string }) => {
        setSelectedStyleName(style.name);
        setCustomStyle(style.prompt);
    }, []);

    const handleSaveCustomStyle = useCallback(() => {
        if (newStyleName.trim() && customStyle.trim()) {
            const newStyle = { name: newStyleName.trim(), prompt: customStyle.trim() };
            setSavedStyles(prev => [...prev, newStyle]);
            setSelectedStyleName(newStyle.name);
            setIsSaving(false);
            setNewStyleName('');
        }
    }, [newStyleName, customStyle, setSavedStyles]);

    const handleDeleteCustomStyle = useCallback((index: number) => {
        const styleToDelete = savedStyles[index];
        setSavedStyles(prev => prev.filter((_, i) => i !== index));
        if (selectedStyleName === styleToDelete.name) {
             setSelectedStyleName('');
        }
    }, [savedStyles, setSavedStyles, selectedStyleName]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (customStyle.trim()) {
            onGenerate(customStyle.trim());
        }
    }, [customStyle, onGenerate]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl transform transition-all overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-violet-400 mb-4">Elige un Estilo Visual</h2>
                <p className="text-slate-400 mb-6">Define un estilo visual coherente para todas las escenas que se generarán a partir de tu guion.</p>
                
                <div className="mb-6">
                    {/* Auto Generate Option */}
                    <button 
                        onClick={() => onGenerate('AUTO_GENERATE_STYLE')}
                        className="w-full flex items-center justify-center gap-3 p-4 mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-white font-bold shadow-lg transform hover:scale-[1.02] transition-all border border-violet-400/30"
                    >
                        <MagicIcon className="w-6 h-6" />
                        <span>✨ Estilo Automático (IA)</span>
                        <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">Recomendado</span>
                    </button>
                    <p className="text-xs text-slate-500 text-center mb-6 -mt-4">
                        La IA analizará tu guion y el prompt maestro para crear el estilo visual perfecto.
                    </p>

                    <h3 className="text-lg font-semibold text-slate-300 mb-3">Estilos Predefinidos</h3>
                    <div className="flex flex-wrap gap-2">
                        {PREDEFINED_STYLES.map(style => (
                             <button 
                                key={style.name}
                                type="button"
                                onClick={() => handleStyleSelect(style)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                    selectedStyleName === style.name 
                                    ? 'bg-violet-600 text-white' 
                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                }`}
                             >
                                {style.name}
                             </button>
                        ))}
                    </div>
                </div>

                {savedStyles.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-300 mb-3">Mis Estilos</h3>
                        <div className="flex flex-wrap gap-2">
                            {savedStyles.map((style, index) => (
                                <div key={index} className="relative group">
                                     <button 
                                        type="button"
                                        onClick={() => handleStyleSelect(style)}
                                        className={`pl-3 pr-8 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                            selectedStyleName === style.name 
                                            ? 'bg-violet-600 text-white' 
                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                        }`}
                                     >
                                        {style.name}
                                     </button>
                                     <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteCustomStyle(index); }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-400 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                                        title="Eliminar estilo"
                                     >
                                        <TrashIcon className="w-3 h-3" />
                                     </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="scene-instructions" className="block text-sm font-medium text-slate-300 mb-2">Instrucciones de Estilo (Prompt)</label>
                        <textarea 
                            id="scene-instructions"
                            value={customStyle}
                            onChange={(e) => {
                                setCustomStyle(e.target.value);
                                if (isSaving) setIsSaving(false);
                            }}
                            placeholder="Ej: 'Estilo hiperrealista, 8K, cinematográfico...' o selecciona uno de los estilos predefinidos."
                            rows={5}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" 
                            required 
                        />
                    </div>

                    {/* UI para Guardar Estilo Manual */}
                    <div className="flex justify-between items-center mt-2 h-10">
                        {isSaving ? (
                             <div className="flex items-center gap-2 flex-grow mr-4 animate-fade-in">
                                <input 
                                    type="text" 
                                    value={newStyleName}
                                    onChange={(e) => setNewStyleName(e.target.value)}
                                    placeholder="Nombre del nuevo estilo..."
                                    className="bg-slate-900 border border-slate-500 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 w-full max-w-xs"
                                    autoFocus
                                />
                                <button 
                                    type="button"
                                    onClick={handleSaveCustomStyle}
                                    disabled={!newStyleName.trim()}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Confirmar
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setIsSaving(false); setNewStyleName(''); }}
                                    className="px-2 py-1.5 text-slate-400 hover:text-white transition-colors"
                                    title="Cancelar"
                                >
                                    ✕
                                </button>
                             </div>
                        ) : (
                             <button 
                                type="button"
                                onClick={() => setIsSaving(true)}
                                disabled={!customStyle.trim()}
                                className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Guardar como nuevo estilo
                            </button>
                        )}
                    </div>

                     <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition-colors">Cancelar</button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-bold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                            disabled={!customStyle.trim()}
                        >
                            Generar Escenas
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default memo(StyleSelectionModal);
