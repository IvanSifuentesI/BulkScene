import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Sparkles, 
  Check, 
  Trash2, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { CharacterPersona } from '../types';

interface CharacterVaultProps {
  characters: CharacterPersona[];
  activeCharacterId?: string;
  onSelectCharacter: (id?: string) => void;
  onAddCharacter: (character: CharacterPersona) => void;
  onDeleteCharacter: (id: string) => void;
}

export const CharacterVault: React.FC<CharacterVaultProps> = ({
  characters,
  activeCharacterId,
  onSelectCharacter,
  onAddCharacter,
  onDeleteCharacter,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAnchor, setNewAnchor] = useState('');
  const [newClothing, setNewClothing] = useState('');
  const [newSeed, setNewSeed] = useState<number>(Math.floor(Math.random() * 900000) + 100000);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAnchor.trim()) return;

    const newChar: CharacterPersona = {
      id: `custom-char-${Date.now()}`,
      name: newName.trim(),
      anchorDescription: newAnchor.trim(),
      clothingAnchor: newClothing.trim(),
      defaultSeed: Number(newSeed) || 404,
      createdAt: new Date().toISOString(),
    };

    onAddCharacter(newChar);
    onSelectCharacter(newChar.id);
    setNewName('');
    setNewAnchor('');
    setNewClothing('');
    setNewSeed(Math.floor(Math.random() * 900000) + 100000);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Doctrine */}
      <div className="bg-[#0e0a16] border border-purple-500/20 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Banco de Personajes Consistentes</span>
                <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full">
                  Character Vault
                </span>
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-0.5">
                Consistencia facial y estilística asegurada mediante anclaje de descriptores biométricos invariables y semilla fija (Seed Locking).
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>{showAddForm ? 'Cancelar' : 'Crear Nuevo Personaje'}</span>
        </button>
      </div>

      {/* Creation Modal / Form */}
      {showAddForm && (
        <form 
          onSubmit={handleCreate}
          className="bg-[#100b1a] border border-purple-500/30 rounded-2xl p-6 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.05)] animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Nuevo Registro de Personaje Invariable</span>
            </h3>
            <span className="text-[11px] text-purple-300 font-mono">Se inyectará al inicio de cada escena</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre Clave del Personaje *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Mateo el Explorador"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08050e] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-white/5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Semilla Fija (Seed Locking) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  value={newSeed}
                  onChange={(e) => setNewSeed(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08050e] text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 border border-white/5"
                />
                <button
                  type="button"
                  onClick={() => setNewSeed(Math.floor(Math.random() * 900000) + 100000)}
                  className="px-3 py-2.5 rounded-xl bg-[#140e22] hover:bg-[#1a132c] text-purple-300 text-xs font-mono shrink-0 transition-colors border border-purple-500/30"
                  title="Generar nueva semilla aleatoria"
                >
                  🎲
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descriptor Biométrico Invariable (Rostro, Edad, Pelo, Ojos) *
            </label>
            <textarea
              required
              rows={2}
              value={newAnchor}
              onChange={(e) => setNewAnchor(e.target.value)}
              placeholder="Ej: A 28-year-old adventurous man named Mateo, athletic build, messy brown hair, hazel eyes, sharp jawline..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#08050e] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-white/5 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Vestimenta Fija / Accesorios Constantes (Clothing Anchor)
            </label>
            <input
              type="text"
              value={newClothing}
              onChange={(e) => setNewClothing(e.target.value)}
              placeholder="Ej: wearing a weathered brown leather jacket over a grey crewneck and dark jeans"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#08050e] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-white/5"
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-purple-500/25 transition-all"
            >
              Guardar Personaje en Vault
            </button>
          </div>
        </form>
      )}

      {/* Grid of Characters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sin Personaje / Modo Libre */}
        <div
          onClick={() => onSelectCharacter(undefined)}
          className={`cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all ${
            activeCharacterId === undefined
              ? 'bg-[#180f28] border-2 border-purple-500 ring-2 ring-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.25)]'
              : 'bg-[#0a0711] border border-white/[0.05] hover:border-purple-500/40'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400">Modo Libre</span>
              {activeCharacterId === undefined && (
                <span className="flex items-center gap-1 text-[10px] bg-purple-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm shadow-purple-500/40">
                  <Check className="w-3 h-3" /> Activo
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-sm text-white mb-1">Sin Personaje Fijo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Las escenas se generarán libremente basadas en la descripción textual de cada prompt sin inyección forzada de personaje protagonista.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Variación total plano a plano</span>
          </div>
        </div>

        {/* Personajes Guardados */}
        {characters.map((char) => {
          const isSelected = activeCharacterId === char.id;

          return (
            <div
              key={char.id}
              onClick={() => onSelectCharacter(char.id)}
              className={`cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all group relative ${
                isSelected
                  ? 'bg-[#1a0e2a] border-2 border-purple-500 ring-2 ring-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.3)]'
                  : 'bg-[#0a0711] border border-white/[0.05] hover:border-purple-500/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                    <span className="font-mono text-[10px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded">
                      Seed: #{char.defaultSeed}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] bg-purple-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm shadow-purple-500/40">
                        <Check className="w-3 h-3" /> Activo
                      </span>
                    )}

                    {char.id.startsWith('custom-') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCharacter(char.id);
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Eliminar este personaje"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-extrabold text-sm text-white mb-1.5 group-hover:text-purple-300 transition-colors">
                  {char.name}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-2">
                  {char.anchorDescription}
                </p>

                {char.clothingAnchor && (
                  <div className="text-[11px] text-purple-200/80 bg-purple-950/30 border border-purple-500/20 p-2.5 rounded-xl line-clamp-2">
                    <strong className="text-purple-300">Ropa:</strong> {char.clothingAnchor}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-purple-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Consistencia 100%
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  Lock: ON
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CharacterVault;
