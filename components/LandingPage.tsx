import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Sparkles, 
  ArrowRight, 
  FolderArchive, 
  Play, 
  Lock, 
  Check, 
  Flame,
  ExternalLink,
  Users,
  GraduationCap,
  Wrench,
  ShieldCheck,
  Cpu,
  LogIn
} from 'lucide-react';
import { getPricingConfig, PricingConfig, DEFAULT_PRICING_CONFIG } from '../services/pricingService';

interface LandingPageProps {
  onOpenStudio: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenStudio }) => {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);

  useEffect(() => {
    getPricingConfig().then(setPricing);
  }, []);

  return (
    <div className="space-y-20 py-4 px-4 sm:px-6 max-w-6xl mx-auto text-slate-100 animate-fade-in select-none">
      {/* 1. SaaS Top Bar */}
      <header className="flex items-center justify-between py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#090b10] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <span className="font-black text-lg text-white tracking-tight">
              BULKSCENE <span className="text-emerald-400">STUDIO</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              SaaS v3.0
            </span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          <a
            href="#pricing"
            className="hidden md:inline-block text-xs text-slate-400 hover:text-white transition-colors font-medium px-3 py-1.5"
          >
            Precios Skool
          </a>

          <Link
            to="/login"
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>Iniciar Sesión</span>
          </Link>

          <a
            href={pricing.skoolUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
          >
            <span>Unirse por ${pricing.price} USD</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-wide uppercase shadow-[0_0_15px_rgba(16,185,129,0.15)] border border-emerald-500/30">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>HyperRender™ Engine • 7 Modelos NVIDIA + Whisper + 4K UHD</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Genera <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">1,000 Imágenes en Secuencia Estricta</span> para Videos Virales
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Pega tu guion completo escena por escena. Mantén la consistencia facial de tu protagonista en cada toma y descarga un archivo ZIP ordenado cronológicamente (#001 a #1000) listo para arrastrar directamente a CapCut, Premiere o DaVinci Resolve.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onOpenStudio}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>ABRIR ESTUDIO DE PRODUCCIÓN AHORA</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#pricing"
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-[#0e111a] hover:bg-slate-800 text-slate-300 font-bold text-sm transition-all flex items-center justify-center hover:text-white border border-white/5"
          >
            Ver Membresía Skool (${pricing.price} USD)
          </a>
        </div>

        {/* Proof metrics */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-center border-t border-white/[0.04]">
          <div className="p-4 rounded-2xl bg-[#0e111a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-white/5">
            <p className="text-2xl font-black text-white font-mono">1,000</p>
            <p className="text-xs text-slate-500 mt-0.5">Escenas por Lote</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0e111a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-white/5">
            <p className="text-2xl font-black text-emerald-400 font-mono">1.8s</p>
            <p className="text-xs text-slate-500 mt-0.5">Velocidad / Imagen</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0e111a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-white/5">
            <p className="text-2xl font-black text-teal-400 font-mono">100%</p>
            <p className="text-xs text-slate-500 mt-0.5">Orden A-Z Invariable</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0e111a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-white/5">
            <p className="text-2xl font-black text-emerald-300 font-mono">2160x3840</p>
            <p className="text-xs text-slate-500 mt-0.5">Super-Resolución 4K UHD</p>
          </div>
        </div>
      </section>

      {/* 3. The Creator Bento Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Diseñado para la Producción Industrial de Contenido
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            La generación una a una en interfaces tradicionales destruye tu ritmo de producción. BulkScene Studio resuelve cada cuello de botella.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#0e111a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-white/5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FolderArchive className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">
              Nomenclatura Estricta 001_escena.png
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Si la escena #98 falla y la reintentas, mantiene intacto su slot 098. Al descargar el ZIP y arrastrar la carpeta a CapCut, la línea de tiempo se sincroniza de inmediato con tu guion de voz.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#0e111a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-white/5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">
              Banco de Personajes con Seed Locking
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Define tu protagonista una sola vez con anclajes biométricos permanentes y semilla fija. El sistema fusiona tu escena con el personaje para evitar cambios de fisonomía entre tomas.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#0e111a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] border border-white/5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">
              Super-Resolución 4K UHD por Convolución
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Escalado real en el navegador mediante interpolación bicúbica multi-etapa y Unsharp Masking (2160 × 3840 px). Imágenes hipernítidas sin pixelación para pantallas de alta densidad y monitores Retina.
            </p>
          </div>
        </div>
      </section>

      {/* 4. OFFICIAL SKOOL PRICING SECTION (Dynamic Price Sync) */}
      <section id="pricing" className="space-y-8 pt-4">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold uppercase border border-amber-500/30">
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Membresía Oficial Comunidad Skool</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Acceso Completo Todo Incluido
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Una sola suscripción a través de nuestra comunidad en Skool te da acceso ilimitado a BulkScene Studio, formación completa, mentoría y herramientas.
          </p>
        </div>

        {/* Featured Offer Card */}
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-b from-[#131a26] via-[#0d1017] to-[#07090e] border-2 border-emerald-500/60 p-8 sm:p-12 shadow-[0_0_60px_rgba(16,185,129,0.25)] overflow-hidden">
            {/* Top highlight ribbon */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-400 text-black text-[11px] font-black px-6 py-1.5 rounded-bl-2xl uppercase tracking-wider shadow">
              🔥 Oferta Skool Oficial
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/[0.08]">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Membresía Todo Incluido
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  BulkScene Studio + Academia Skool
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                  Formación completa en automatización de videos virales, mentoría directa y la suite completa de producción.
                </p>
              </div>

              {/* Dynamic Price Display */}
              <div className="text-left md:text-right shrink-0">
                <div className="flex items-baseline md:justify-end gap-1">
                  <span className="text-4xl sm:text-6xl font-black text-emerald-400 font-mono tracking-tight">
                    ${pricing.price}
                  </span>
                  <span className="text-sm font-bold text-slate-400 uppercase">
                    {pricing.currency}{pricing.period}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                  ⚡ Sincronizado en tiempo real con Skool
                </span>
              </div>
            </div>

            {/* Included Features Grid */}
            <div className="py-8 space-y-4">
              <h4 className="text-xs uppercase font-extrabold text-slate-300 tracking-wider">
                ¿Qué incluye tu membresía mensual?
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-200">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Wrench className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Herramienta BulkScene Studio</strong>
                    <span className="text-slate-400 text-[11px]">7 Motores NVIDIA NIM, FLUX.1, Whisper Turbo y escalado 4K.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Users className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Comunidad Privada en Skool</strong>
                    <span className="text-slate-400 text-[11px]">Networking con creadores automatizados y casos de éxito reales.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Academia & Formación Completa</strong>
                    <span className="text-slate-400 text-[11px]">Cursos paso a paso para dominar creación y monetización de Shorts.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Mentoría & Soporte Continuo</strong>
                    <span className="text-slate-400 text-[11px]">Acompañamiento directo con Iván Sifuentes para optimizar tus canales.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] sm:col-span-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Más Herramientas, Workflows & Scripts Exclusivos</strong>
                    <span className="text-slate-400 text-[11px]">Plantillas de CapCut, prompts validados y actualizaciones constantes sin costo extra.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Action Button (Links to Skool Payment) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <a
                href={pricing.skoolUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 uppercase tracking-wider"
              >
                <span>OBTENER ACCESO EN SKOOL (${pricing.price} USD/MES)</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <Link
                to="/registro"
                className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-white/[0.05] hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors"
              >
                <span>¿Ya pagaste en Skool? Activa tu cuenta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-center text-[11px] text-slate-500 mt-4">
              Pago procesado de forma 100% segura a través de Skool. Cancela cuando quieras en 1 clic.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Final Call to Action */}
      <section className="p-8 sm:p-12 rounded-3xl bg-[#0e111a] border border-white/5 shadow-[0_0_40px_rgba(16,185,129,0.1),inset_0_1px_0_0_rgba(255,255,255,0.04)] text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          Acelera tu Producción de Video hoy Mismo
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Deja de copiar y pegar prompts uno a uno. Sube tu guion de 100 escenas y ten tu video listo en minutos.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onOpenStudio}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>EMPEZAR EN EL ESTUDIO AHORA</span>
          </button>

          <Link
            to="/login"
            className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
