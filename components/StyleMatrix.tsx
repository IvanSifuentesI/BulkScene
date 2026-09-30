import React, { useState } from 'react';
import { 
  Palette, 
  Plus, 
  Sparkles, 
  Check, 
  Trash2
} from 'lucide-react';
import { StylePreset } from '../types';

interface StyleMatrixProps {
  styles: StylePreset[];
  activeStyleId?: string;
  onSelectStyle: (id?: string) => void;
  onAddStyle: (style: StylePreset) => void;
  onDeleteStyle: (id: string) => void;
}

export const StyleMatrix: React.FC<StyleMatrixProps> = ({
  styles,
  activeStyleId,
  onSelectStyle,
  onAddStyle,
  onDeleteStyle,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Personalizado');
  const [newModifier, setNewModifier] = useState('');
  const [newColor, setNewColor] = useState('#10b981');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newModifier.trim()) return;

    const newStyle: StylePreset = {
      id: `custom-style-${Date.now()}`,
      name: newName.trim(),
      category: newCategory.trim() || 'Personalizado',
      promptModifier: newModifier.trim(),
      badgeColor: newColor,
      description: newDesc.trim() || 'Estilo visual personalizado por el creador.',
    };

    onAddStyle(newStyle);
    onSelectStyle(newStyle.id);
    setNewName('');
    setNewModifier('');
    setNewDesc('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#181308] border border-amber-500/20 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Banco de Estilos Visuales</span>
                <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                  Style Matrix
                </span>
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-0.5">
                Catálogo de directivas estéticas de alta conversión. Se inyectan uniformemente en cada escena garantizando coherencia de iluminación, textura y acabado artístico.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>{showAddForm ? 'Cancelar' : 'Crear Estilo Personalizado'}</span>
        </button>
      </div>

      {/* Creation Modal / Form */}
      {showAddForm && (
        <form 
          onSubmit={handleCreate}
          className="bg-[#1c160a] border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.05)] animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Nuevo Preset de Estilo Visual</span>
            </h3>
            <span className="text-[11px] text-amber-300 font-mono">Inyección uniforme a todo el lote</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre del Estilo *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Cyberpunk Neón Dark"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0c07] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 border border-white/5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Categoría
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Ej: Cine, Anime, 3D, Ilustración"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0c07] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 border border-white/5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Color de Identificación
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-10 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                />
                <span className="font-mono text-xs text-slate-400">{newColor}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Directiva de Prompt Obligatoria (Modificador Visual Clave) *
            </label>
            <textarea
              required
              rows={2}
              value={newModifier}
              onChange={(e) => setNewModifier(e.target.value)}
              placeholder="Ej: cinematic 35mm film photography, Kodak Portra 400 color science, natural volumetric light, 8k..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0c07] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 border border-white/5 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción Breve
            </label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Para qué tipo de videos se recomienda este estilo..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0c07] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 border border-white/5"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md shadow-amber-500/25 transition-all"
            >
              Guardar Preset en Matriz
            </button>
          </div>
        </form>
      )}

      {/* Grid of Styles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {styles.map((style) => {
          const isSelected = activeStyleId === style.id;

          return (
            <div
              key={style.id}
              onClick={() => onSelectStyle(style.id)}
              className={`cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all group relative ${
                isSelected
                  ? 'bg-[#221808] border-2 border-amber-500 ring-2 ring-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                  : 'bg-[#0e0c07] border border-white/[0.05] hover:border-amber-500/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span 
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{ 
                      color: style.badgeColor || '#f59e0b', 
                      backgroundColor: `${style.badgeColor || '#f59e0b'}20` 
                    }}
                  >
                    ● {style.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] bg-amber-500 text-black font-bold px-2.5 py-0.5 rounded-full shadow-sm shadow-amber-500/40">
                        <Check className="w-3 h-3" /> Activo
                      </span>
                    )}

                    {style.id.startsWith('custom-') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteStyle(style.id);
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Eliminar este estilo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-extrabold text-sm text-white mb-1.5 group-hover:text-amber-300 transition-colors">
                  {style.name}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {style.description}
                </p>

                <div className="bg-black/50 border border-white/[0.04] p-3 rounded-xl">
                  <span className="text-[10px] text-amber-400/80 block mb-1 font-mono uppercase">
                    Inyección de Prompt:
                  </span>
                  <p className="text-[11px] text-slate-300 font-mono line-clamp-2 leading-tight">
                    {style.promptModifier}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500">
                <span>Aplicado a todo el lote</span>
                <span className="font-bold text-xs" style={{ color: style.badgeColor || '#f59e0b' }}>●</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StyleMatrix;
