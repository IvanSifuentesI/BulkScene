import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  FolderArchive, 
  Lock, 
  Check, 
  Flame,
  ExternalLink,
  Users,
  GraduationCap,
  Wrench,
  ShieldCheck,
  LogIn,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Film,
  Sliders,
  Maximize2,
  Zap,
  Infinity as InfinityIcon,
  Copy,
  CheckCheck,
  Star,
  Quote
} from 'lucide-react';
import { getPricingConfig, PricingConfig, DEFAULT_PRICING_CONFIG } from '../services/pricingService';

interface LandingPageProps {
  onOpenStudio?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);

  useEffect(() => {
    getPricingConfig().then(setPricing);
  }, []);


  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const copyPromptToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptIdx(idx);
    setTimeout(() => setCopiedPromptIdx(null), 2000);
  };

  // 6 Escenas Místicas, Épicas y de Acción Cinemática de Alto Impacto Visual
  const sampleScenes = [
    {
      num: '001',
      title: 'Invocación de Runa Ancestral',
      time: '0-2.4s',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      prompt: 'Cinematic 35mm film still, ancient sorcerer with glowing runic eyes channeling dark ethereal energy inside a fog-shrouded cathedral, mystical volumetric rays, vibrant neon cyan and amber sparks, cinematic depth of field, photorealistic 8k.'
    },
    {
      num: '002',
      title: 'El Guardián en la Niebla',
      time: '2.4-5.0s',
      imageUrl: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80',
      prompt: 'Dark fantasy gothic establishing shot, ancient towering black stone citadel surrounded by perpetual mist and purple aurora lightning, dark fantasy moody atmosphere, hyper-detailed architecture, cinematic lighting, 8k.'
    },
    {
      num: '003',
      title: 'Vórtice Cósmico y Poder',
      time: '5.0-7.8s',
      imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
      prompt: 'Epic fantasy wide angle shot, warrior standing heroically at the center of a swirling celestial vortex of glowing stardust and kinetic plasma energy, dramatic silhouette, cosmic dust particles, IMAX cinematic composition.'
    },
    {
      num: '004',
      title: 'El Relicario Prismático',
      time: '7.8-10.2s',
      imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
      prompt: 'Extreme close up macro shot of an ancient arcane crystal relic floating in mid-air, emitting glowing iridescent prismatic light beams, shallow depth of field, sharp reflections, Kodak Portra 400 color science, 4K UHD.'
    },
    {
      num: '005',
      title: 'Batalla Mística en Llamas',
      time: '10.2-13.0s',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
      prompt: 'Dynamic high action scene, mythical shadow sorcerer unleashing a torrent of glowing fiery embers across a subterranean cavern, cinematic motion blur on periphery with crystal sharp subject focus, blockbuster movie still.'
    },
    {
      num: '006',
      title: 'El Reino Astral del Despertar',
      time: '13.0-15.5s',
      imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      prompt: 'Heroic wide establishing shot, celestial entity overlooking a vast cosmic dimension of floating monolithic islands and radiant nebulae at twilight, volumetric god rays, epic cinematic grandeur, 8k resolution.'
    }
  ];

  const workflowSteps = [
    {
      step: 'Paso 1',
      title: 'Pegar Guion o Idea',
      desc: 'Analiza tu guion y desglosa escenas automáticamente.'
    },
    {
      step: 'Paso 2',
      title: 'Fijar Personaje & Estilo',
      desc: 'Bloquea el rostro y aplica estilos consistentes.'
    },
    {
      step: 'Paso 3',
      title: 'Generación Masiva & ZIP',
      desc: 'Genera imágenes y descarga un ZIP listo para editar.'
    }
  ];

  // Testimonios de alumnos y creadores de contenido viral (Fórmula 100K)
  const testimonials = [
    {
      name: 'Mateo Ramos',
      channel: '@MisteriosVisuales',
      badge: 'Canal de Shorts / 420K subs',
      metric: '100 escenas en 3 min',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      quote: 'Pasé de tardarme 2 días enteros creando imágenes una por una en Midjourney a generar 120 escenas místicas en menos de 5 minutos. Todas con el mismo protagonista y sin pagar un solo centavo en APIs. Es brutal.'
    },
    {
      name: 'Valeria Delgado',
      channel: '@CuriosaMenteIA',
      badge: 'Creadora TikTok / 310K seg',
      metric: 'Cero gasto en APIs',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
      quote: 'Lo que más me impresionó es la consistencia de los personajes. El rostro de mi avatar no cambia en ninguna escena del video. Descargas el ZIP con los números exactos (#001 a #080), lo tiras a CapCut y la edición queda casi lista.'
    },
    {
      name: 'Carlos Mendoza',
      channel: 'Agencia ViralFaceless',
      badge: '6 Canales Automatizados',
      metric: '10x velocidad de entrega',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
      quote: 'Antes gastábamos más de $150 USD mensuales entre Midjourney y llamadas de API que se acababan a mitad de mes. Con la membresía de Skool a $14 USD generamos miles de imágenes al mes sin límites ni facturas sorpresa.'
    }
  ];

  const faqs = [
    {
      q: '¿Realmente la generación de imágenes es ilimitada y sin pagar APIs?',
      a: 'Sí, todo integrado. Sin pagos extras.'
    },
    {
      q: '¿Cómo accedo a la herramienta una vez que me uno en Skool?',
      a: 'Inicia sesión con tu correo de Skool.'
    },
    {
      q: '¿Qué pasa si en el futuro el precio de la membresía en Skool sube?',
      a: 'Tu precio queda congelado de por vida.'
    },
    {
      q: '¿Puedo mantener la cara y ropa de mis personajes constante en todas las escenas?',
      a: 'Sí. El modo de consistencia mantiene el rostro.'
    },
    {
      q: '¿Necesito una computadora potente o tarjeta gráfica cara para usarlo?',
      a: 'No. Todo el procesamiento corre en la nube.'
    },
    {
      q: '¿Puedo cancelar mi suscripción en cualquier momento?',
      a: 'Sí. Puedes cancelar en cualquier momento.'
    }
  ];

  const modes = [
    {
      title: 'Modo Generación Masiva por Lotes',
      subtitle: 'Bulk Batch Engine',
      badge: 'Escenas Consecutivas',
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      desc: 'Genera lotes de imágenes en un ZIP numerado.',
      features: ['Nomenclatura cronológica invariable', 'Reintento individual por slot sin perder posición', 'Exportación en 1 clic']
    },
    {
      title: 'Modo Anclaje Facial y Consistencia',
      subtitle: 'Character Seed Locker',
      badge: 'Cero Cambios de Fisonomía',
      icon: <Lock className="w-5 h-5 text-purple-400" />,
      desc: 'Mantiene el mismo rostro y ropa en todas tus escenas.',
      features: ['Anclaje de rostro y vestimenta fija', 'Semilla fija invariable', 'Compatibilidad con múltiples avatares']
    },
    {
      title: 'Modo Director Creativo Automatizado',
      subtitle: 'Smart Script Director',
      badge: 'Ángulos Cinematográficos',
      icon: <Film className="w-5 h-5 text-cyan-400" />,
      desc: 'Calcula encuadres y estilos a partir de tu texto.',
      features: ['Segmentación según ritmo de palabras', 'Cálculo dinámico de encuadres y lentes', 'Optimización automática de prompts']
    },
    {
      title: 'Modo Galería de 10+ Estilos de Cine',
      subtitle: 'Master Style Presets',
      badge: 'Estética Viral Instantánea',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      desc: 'Aplica universos visuales con un solo clic.',
      features: ['Paletas de iluminación volumétrica', 'Ciencia de color cinematográfica', 'Presets probados para alta retención']
    },
    {
      title: 'Modo Super-Resolución Ultra HD 4K',
      subtitle: 'In-Browser 4K Upscaler',
      badge: '2160 × 3840 px',
      icon: <Maximize2 className="w-5 h-5 text-teal-400" />,
      desc: 'Escala cualquier escena a 4K sin perder calidad.',
      features: ['Resolución nativa 2160 × 3840', 'Filtro Unsharp Masking de micro-detalle', 'Optimizado para video vertical 9:16']
    },
    {
      title: 'Modo Sincronización Audiovisual',
      subtitle: 'Timeline Alignment Engine',
      badge: 'CapCut • Premiere • DaVinci',
      icon: <FolderArchive className="w-5 h-5 text-blue-400" />,
      desc: 'Sincroniza imágenes con locución automáticamente.',
      features: ['Emparejamiento de locución con imagen', 'Alineación de cortes por segundo', 'Ahorro del 85% de tiempo de edición']
    },
    {
      title: 'Modo Bóveda de Presets y Personalización',
      subtitle: 'Custom Workspace',
      badge: 'Flujos Reutilizables',
      icon: <Sliders className="w-5 h-5 text-pink-400" />,
      desc: 'Guarda personajes y estilos en tu bóveda personal.',
      features: ['Biblioteca de personajes guardados', 'Historial de prompts con restauración en 1 clic', 'Configuración de aspecto (9:16, 16:9, 1:1)']
    }
  ];

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">

      {/* 2. MAIN HEADER / NAVIGATION */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
            <div className="w-full h-full bg-[#090b10] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <span className="font-black text-base sm:text-lg text-white tracking-tight">
              BULKSCENE <span className="text-emerald-400">STUDIO</span>
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                CERO APIS
              </span>
              <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                100% ILIMITADO
              </span>
            </div>
          </div>
        </div>

        {/* Navigation CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#modos"
            className="hidden md:inline-block text-xs text-slate-400 hover:text-white transition-colors font-medium px-3 py-1.5"
          >
            Modos de Creación
          </a>

          <a
            href="#testimonios"
            className="hidden sm:inline-block text-xs text-slate-400 hover:text-white transition-colors font-medium px-3 py-1.5"
          >
            Resultados
          </a>

          <a
            href="#oferta"
            className="hidden sm:inline-block text-xs text-slate-400 hover:text-white transition-colors font-medium px-3 py-1.5"
          >
            Qué Incluye
          </a>

          <Link
            to="/login"
            className="px-3 sm:px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Miembros</span>
          </Link>

          <a
            href={pricing.skoolUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all hover:scale-105"
          >
            <span>Unirse ($14)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* 3. HERO SECTION (High-Converting Tripwire VSL Hook - Mobile & Desktop Fluid) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-12 sm:pb-16 text-center space-y-6 sm:space-y-8">
        {/* Core Category Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] sm:text-xs font-bold tracking-wide uppercase border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] max-w-full truncate">
          <Zap className="w-3.5 h-3.5 fill-emerald-400 shrink-0" />
          <span className="truncate">IMÁGENES ILIMITADAS EN MINUTOS • CERO APIS</span>
        </div>

        {/* The Core Headline (La Gran Promesa) */}
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1] sm:leading-[1.08]">
          Genera Lotes de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Imágenes Ilimitadas</span>
        </h1>

        {/* Subheadline (Resolución de Dolor & Mecanismo) */}
        <p className="text-sm sm:text-lg lg:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Crea videos consistentes y listos para edición. <strong className="text-slate-200">Sin pagos de tokens ni facturas de APIs.</strong>
        </p>

        {/* Rediseño Premium del Precio Especial de Lanzamiento (Hero Card) */}
        <div className="pt-2 max-w-2xl mx-auto w-full">
          <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0f1422]/90 via-[#0a0d16]/90 to-[#07090f]/90 border border-emerald-500/40 p-4 sm:p-7 shadow-[0_0_50px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl overflow-hidden group text-left">
            {/* Top highlight subtle glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-24 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
              {/* Left Column: Pricing & Tag */}
              <div className="text-center sm:text-left space-y-2 w-full sm:w-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>PRECIO ESPECIAL DE LANZAMIENTO</span>
                </div>

                <div className="flex items-baseline justify-center sm:justify-start gap-2.5 sm:gap-3">
                  <span className="text-sm sm:text-base line-through text-slate-500 font-mono font-bold">
                    $197 USD
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 font-mono tracking-tight">
                      ${pricing.price}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase font-mono">
                      {pricing.currency}{pricing.period}
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
                    93% OFF
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 font-medium">
                  ✓ Acceso Inmediato • Cancela en 1 clic • Sin costos en APIs
                </p>
              </div>

              {/* Right Column: CTA Button */}
              <div className="w-full sm:w-auto shrink-0">
                <a
                  href={pricing.skoolUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-wider"
                >
                  <span>DESBLOQUEAR ACCESO ($14/MES)</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-slate-400 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Pago Seguro por Skool
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Cancela cuando quieras
            </span>
            <span>•</span>
            <Link to="/login" className="text-emerald-400 hover:underline font-bold">
              ¿Ya eres alumno? Entra aquí →
            </Link>
          </div>
        </div>
        <div className="pt-2 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto text-center">
          <div className="p-3 sm:p-4 rounded-2xl bg-[#0e111a]/80 border border-white/5 shadow-inner">
            <div className="flex items-center justify-center gap-1.5 text-xl sm:text-2xl font-black text-white font-mono">
              <InfinityIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              <span>Ilimitadas</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Sin límite de imágenes</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-[#0e111a]/80 border border-white/5 shadow-inner">
            <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">$0 en APIs</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Cero cobros por tokens</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-[#0e111a]/80 border border-white/5 shadow-inner">
            <p className="text-xl sm:text-2xl font-black text-teal-400 font-mono">1.8s</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Velocidad de generación</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-[#0e111a]/80 border border-white/5 shadow-inner">
            <p className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">4K UHD</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Super-Resolución 2160p</p>
          </div>
        </div>

        {/* 4. VISUAL APP MOCKUP SHOWCASE (Estilo Mac con Imágenes Místicas y Épicas - Mobile & PC Fluid) */}
        <div className="pt-4 max-w-5xl mx-auto w-full">
          <div className="relative rounded-2xl sm:rounded-3xl bg-[#0a0d14] border border-white/10 p-2 sm:p-5 shadow-[0_0_90px_rgba(16,185,129,0.18)] overflow-hidden">
            {/* Mac top chrome */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/5 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
                <span className="ml-2 sm:ml-3 font-mono text-[10px] sm:text-[11px] text-slate-400 hidden sm:inline-block">
                  bulkscene-studio.app/workspace/produccion-viral-1000-escenas
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Motor Activo • $0.00 APIs</span>
              </div>
            </div>

            {/* Interactive Workflow Steps Bar */}
            <div className="p-2 sm:px-6 sm:py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-between gap-2 overflow-x-auto">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 hidden md:inline">
                Flujo del Estudio:
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 w-full justify-between sm:justify-start">
                {workflowSteps.map((wf, wIdx) => (
                  <button
                    key={wIdx}
                    onClick={() => setActiveWorkflowStep(wIdx)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 text-left shrink-0 ${
                      activeWorkflowStep === wIdx
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/[0.03] text-slate-400 border border-transparent hover:text-white'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] sm:text-[10px] flex items-center justify-center font-mono font-bold">
                      {wIdx + 1}
                    </span>
                    <span>{wf.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Workspace View */}
            <div className="p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 text-left">
              {/* Left Column: Script and Character Lock + Active Modes */}
              <div className="space-y-3 sm:space-y-4">
                {/* Active Mode Dynamic Box */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#121622] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      {workflowSteps[activeWorkflowStep].title}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Activo
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {workflowSteps[activeWorkflowStep].desc}
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      Anclaje de Protagonista
                    </span>
                    <span className="text-[10px] text-purple-300 font-mono bg-purple-500/20 px-2 py-0.5 rounded">
                      Semilla #481920
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Guardián Astral: túnica oscura, runas luminosas en antebrazos y ojos celestiales. Mismo rostro y rasgos asegurados en todas las tomas.
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-emerald-400" />
                    Estilo Visual Activo
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg font-bold">
                      Fantasía Épica & Cinemático 35mm
                    </span>
                    <span className="text-xs font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded">
                      4K UHD
                    </span>
                  </div>
                </div>
              </div>

              {/* Center & Right Column: Scene Grid Preview with MÍSTICAS Y ÉPICAS IMAGES */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Lote Masivo Generado (Escenas del Guion Místico)
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px] sm:text-[11px] font-bold">
                    ✓ Lote de Escenas Ilimitadas Listo (100%)
                  </span>
                </div>

                {/* 6 Striking Visual Scene Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {sampleScenes.map((sc, i) => (
                    <div
                      key={i}
                      className="group relative rounded-2xl bg-[#121622] border border-white/10 overflow-hidden aspect-[9/16] hover:border-emerald-500/80 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 flex flex-col justify-between"
                    >
                      {/* Photographic Image Background */}
                      <img
                        src={sc.imageUrl}
                        alt={sc.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* Vignette Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60 pointer-events-none" />

                      {/* Top Header Information */}
                      <div className="relative z-10 p-2 sm:p-2.5 flex items-center justify-between text-[10px]">
                        <span className="font-mono font-black text-emerald-300 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-emerald-500/30 shadow">
                          #{sc.num}
                        </span>
                        <span className="text-slate-300 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono">
                          {sc.time}
                        </span>
                      </div>

                      {/* Hover Overlay with Prompt Copy Action */}
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 text-center bg-black/75 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 mb-2">
                          ✓ 4K UHD Renderizado
                        </span>
                        <p className="text-[10px] text-slate-200 line-clamp-3 italic mb-3">
                          "{sc.prompt}"
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyPromptToClipboard(sc.prompt, i);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-extrabold text-[10px] flex items-center gap-1 shadow-md hover:bg-emerald-400 transition-colors"
                        >
                          {copiedPromptIdx === i ? (
                            <>
                              <CheckCheck className="w-3 h-3" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Prompt</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Bottom Title & Scene Output Name */}
                      <div className="relative z-10 p-2 sm:p-2.5 space-y-0.5">
                        <p className="text-[10px] sm:text-[11px] text-white font-extrabold leading-tight drop-shadow">
                          {sc.title}
                        </p>
                        <p className="text-[9px] font-mono text-emerald-400 drop-shadow truncate">
                          {sc.num}_escena.png
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Status Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <FolderArchive className="w-4 h-4 text-emerald-400" />
                    <span>Archivo de salida: <strong className="text-white">Lote_1000_Escenas_Sincronizadas.zip</strong></span>
                  </div>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-center sm:text-left">
                    Listo para arrastrar a CapCut y Premiere
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN DE PRUEBA SOCIAL Y TESTIMONIOS (Fórmula 100K) */}
      <section id="testimonios" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8 sm:space-y-12 border-t border-white/[0.06]">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold uppercase border border-emerald-500/30">
            <Users className="w-3.5 h-3.5" />
            <span>Casos Reales de Alumnos y Creadores</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Lo que Dicen Quienes Ya Crean a Escala
          </h2>
          <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto">
            Creadores de canales automatizados y agencias de video vertical que transformaron su velocidad de publicación con BulkScene Studio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-3xl bg-[#0e111a] border border-white/5 hover:border-emerald-500/30 transition-all duration-300 space-y-4 flex flex-col justify-between shadow-lg shadow-black/40"
            >
              <div className="space-y-3">
                {/* Rating stars & metric pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {t.metric}
                  </span>
                </div>

                <Quote className="w-6 h-6 text-slate-600" />
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              {/* Author footer */}
              <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover border border-emerald-500/40 shrink-0"
                />
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{t.name}</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">{t.channel}</p>
                  <p className="text-[9px] text-slate-500">{t.badge}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. EL VIEJO CAMINO VS EL NUEVO MÉTODO (Fórmula 100K Problem vs Solution) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8 sm:space-y-12 border-t border-white/[0.06]">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            La Transformación Radical en tu Flujo de Trabajo
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            El Viejo Camino vs El Nuevo Método
          </h2>
          <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto">
            Descubre por qué los creadores de canales automatizados están reemplazando las herramientas tradicionales por BulkScene Studio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
          {/* El Viejo Camino */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#140b0e]/70 border border-red-500/20 space-y-5 sm:space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">El Viejo Camino</h3>
                <p className="text-xs text-red-300">Costoso, lento y lleno de límites técnicos</p>
              </div>
            </div>

            <ul className="space-y-3.5 sm:space-y-4 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Suscripciones mensuales de $30 a $60 USD</strong> en herramientas que limitan la cantidad de imágenes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Facturas sorpresa de APIs:</strong> Cobros por cada token o prompt enviado que encarecen cada video.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Inconsistencia de personajes:</strong> La cara y ropa del protagonista cambian en cada toma, arruinando la calidad visual.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Generación manual 1 a 1:</strong> Copiar prompts, esperar, descargar y renombrar archivos durante horas enteras.</span>
              </li>
            </ul>
          </div>

          {/* El Nuevo Método con BulkScene Studio */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#091512]/70 border border-emerald-500/30 space-y-5 sm:space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">El Nuevo Método (BulkScene Studio)</h3>
                <p className="text-xs text-emerald-300">Ilimitado, sin APIs y 100% automatizado</p>
              </div>
            </div>

            <ul className="space-y-3.5 sm:space-y-4 text-xs text-slate-200">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Imágenes Ilimitadas y Gratuitas:</strong> Genera tantas tomas como quieras sin límite mensual ni cargos extra.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Cero APIs y Cero Pagos de Tokens:</strong> Todo el poder de procesamiento está incluido con tu acceso en Skool.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Consistencia Facial Garantizada:</strong> Anclaje biométrico y semillas fijas para que tu protagonista sea el mismo siempre.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Lotes en ZIP Ordenados (#001 a #N):</strong> Arrastras la carpeta directamente a CapCut o Premiere y el video queda sincronizado.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. LOS 7 MODOS DE CREACIÓN (Módulo de Poder Explicativo) */}
      <section id="modos" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8 sm:space-y-12 border-t border-white/[0.06]">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-bold uppercase border border-cyan-500/30">
            <Sliders className="w-3.5 h-3.5" />
            <span>Versatilidad Total para Creadores de Contenido</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Los 7 Modos de Producción Incluidos
          </h2>
          <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto">
            Cada modo está diseñado específicamente para eliminar un obstáculo real al crear videos virales para TikTok, Shorts y Reels.
          </p>
        </div>

        {/* Interactive Mode Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {modes.map((mode, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-3xl bg-[#0e111a] border border-white/5 hover:border-emerald-500/40 transition-all duration-300 space-y-4 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    {mode.icon}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {mode.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-base text-white">{mode.title}</h3>
                  <span className="text-[11px] font-mono text-slate-500">{mode.subtitle}</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {mode.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-1.5">
                {mode.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. THE VALUE STACK & SKOOL OFFER (Hormozi Value Stack / Fórmula 100K) */}
      <section id="oferta" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8 sm:space-y-12 border-t border-white/[0.06]">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold uppercase border border-amber-500/30">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Oferta Irresistible Skool • Todo Incluido</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Todo lo que Recibes al Unirte Hoy
          </h2>
          <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto">
            No solo te llevas el software de generación ilimitada, sino todo el ecosistema de aceleración para dominar la creación y monetización de videos virales.
          </p>
        </div>

        {/* Featured Offer Stack Card */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#131b28] via-[#0b0e16] to-[#06080d] border-2 border-emerald-500/60 p-5 sm:p-12 shadow-[0_0_80px_rgba(16,185,129,0.25)] overflow-hidden space-y-6 sm:space-y-8">
            {/* Top Ribbon */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-400 text-black text-[10px] sm:text-[11px] font-black px-4 sm:px-6 py-1.5 rounded-bl-2xl uppercase tracking-wider shadow">
              🔥 Membresía Oficial en Skool
            </div>

            {/* Header of Offer */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 pb-6 border-b border-white/[0.08]">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Membresía Completa de la Academia
                </span>
                <h3 className="text-2xl sm:text-4xl font-black text-white">
                  BulkScene Studio + Academia Skool
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
                  Acceso sin restricciones a la suite de imágenes ilimitadas, comunidad de creadores, cursos paso a paso y mentoría con Iván Sifuentes.
                </p>
              </div>

              {/* Price Box with Anchoring */}
              <div className="text-left md:text-right shrink-0">
                <div className="text-xs text-slate-500 font-mono line-through mb-0.5">
                  Valor Normal: $685 USD
                </div>
                <div className="flex items-baseline md:justify-end gap-1">
                  <span className="text-4xl sm:text-6xl font-black text-emerald-400 font-mono tracking-tight">
                    ${pricing.price}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase">
                    {pricing.currency}{pricing.period}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1 border border-emerald-500/20">
                  ⚡ Sincronizado en vivo con Skool
                </span>
              </div>
            </div>

            {/* The 5 Stacked Value Deliverables (Fórmula 100K) */}
            <div className="space-y-3.5">
              <h4 className="text-xs uppercase font-extrabold text-slate-300 tracking-wider">
                Desglose detallado de todo lo que incluye tu membresía:
              </h4>

              <div className="space-y-3">
                {/* Item 1 */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white text-xs sm:text-sm block">1. Software BulkScene Studio (Suite Ilimitada)</strong>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        Generación de imágenes ilimitadas en minutos, sin APIs, consistencia de personajes, 7 modos de creación y escalado 4K Ultra HD.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400 line-through shrink-0">$197 USD/mes</span>
                </div>

                {/* Item 2 */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white text-xs sm:text-sm block">2. Comunidad Exclusiva de Creadores en Skool</strong>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        Red privada de networking con creadores de canales automatizados, casos de éxito reales y apoyo mutuo diario.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400 line-through shrink-0">$97 USD/mes</span>
                </div>

                {/* Item 3 */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white text-xs sm:text-sm block">3. Academia Completa de Automatización de Videos</strong>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        Módulos paso a paso para dominar guionización de alta retención, hooks virales, edición rápida y monetización en YouTube y TikTok.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400 line-through shrink-0">$147 USD</span>
                </div>

                {/* Item 4 */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white text-xs sm:text-sm block">4. Mentoría Semanal y Acompañamiento Directo</strong>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        Preguntas y respuestas directas con Iván Sifuentes para optimizar tus canales, revisar tus videos y acelerar tus resultados.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400 line-through shrink-0">$197 USD</span>
                </div>

                {/* Item 5 */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white text-xs sm:text-sm block">5. Bóveda de Workflows, Prompts y Plantillas de Edición</strong>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        Plantillas para CapCut, fórmulas de prompts de alta conversión y scripts automáticos que actualizamos constantemente.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400 line-through shrink-0">$47 USD</span>
                </div>
              </div>
            </div>

            {/* Total Stacking Calculation Strip */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <div>
                <span className="text-xs uppercase font-bold text-emerald-300">Valor Total Real Acumulado:</span>
                <span className="ml-2 text-xs sm:text-sm font-mono text-slate-400 line-through font-bold">$685 USD</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white">
                ¡Pagas únicamente <span className="text-emerald-400 font-mono text-base sm:text-lg">${pricing.price} USD/mes</span> en Skool!
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <a
                href={pricing.skoolUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all transform hover:-translate-y-0.5 uppercase tracking-wider"
              >
                <span>DESBLOQUEAR ACCESO ($14/MES)</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <Link
                to="/login"
                className="w-full sm:w-auto py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl bg-white/[0.05] hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors"
              >
                <span>Ya soy miembro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-center text-[10px] sm:text-[11px] text-slate-500">
              🔒 Pago seguro por Skool. Cancela cuando quieras en 1 clic.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION (Despejando Objeciones de Compra) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6 sm:space-y-8 border-t border-white/[0.06]">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold uppercase">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Respuestas Rápidas</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Todo lo que necesitas saber antes de ingresar a nuestra comunidad.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#0e111a] border border-white/5 overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFaq(i)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-white hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-emerald-400 shrink-0 transition-transform duration-200 ${
                    activeFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {activeFaq === i && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 9. FINAL CALL TO ACTION (Fórmula 100K Closing) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="p-6 sm:p-14 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#0e121a] to-teal-950/40 border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.15)] text-center space-y-5 sm:space-y-6">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">
            ÚNETE HOY MISMO
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Comienza a Generar Imágenes Ilimitadas para tus Videos Virales
          </h2>
          <p className="text-xs sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Deja atrás las herramientas limitantes y las facturas de APIs. Únete a nuestra comunidad de Skool por solo <strong className="text-white">${pricing.price} USD/mes</strong> y ten acceso total al software, academia y mentoría.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={pricing.skoolUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs sm:text-sm shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all inline-flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <span>UNIRSE POR $14/MES</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3.5 sm:py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acceso Miembros</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. LEGAL FOOTER */}
      <footer className="border-t border-white/[0.06] py-8 sm:py-10 px-4 sm:px-6 text-center text-xs text-slate-500 space-y-3">
        <p className="font-mono text-[11px]">
          BulkScene Studio • Desarrollado para la Comunidad IA Automatiza
        </p>
        <p className="text-[10px] sm:text-[11px] text-slate-600 max-w-md mx-auto">
          Este sitio web no es parte de Skool Inc., Google LLC, Meta Platforms ni TikTok. Es una academia privada independiente de producción audiovisual y automatización con inteligencia artificial.
        </p>
        <p className="text-[10px] text-slate-600">
          © {new Date().getFullYear()} BulkScene Studio. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
