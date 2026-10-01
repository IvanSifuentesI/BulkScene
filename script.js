
const fs = require('fs');
let content = fs.readFileSync('components/LandingPage.tsx', 'utf8');

content = content.replace(/const \[timeLeft, setTimeLeft\] = useState.*?;\s*/, '');
content = content.replace(/\/\/ Evergreen 15-Minute Countdown Timer[\s\S]*?return \(\) => clearInterval\(interval\);\s*}, \[\]\);/, '}, []);');
content = content.replace(/\{\/\* 1\. TOP URGENCY 15-MINUTE DISCOUNT COUNTDOWN.*?\*\/\}[\s\S]*?<\/aside>/, '');
content = content.replace(/Produce escenas cinematográficas con <strong>consistencia facial<\/strong> de tus personajes, estilos visuales de alta retención y descarga ordenada lista para CapCut o Premiere\. <strong className=\	ext-slate-200\>Sin pagos de tokens ni facturas de APIs\.<\/strong>/, 'Crea videos consistentes y listos para edición. Sin pagos de tokens ni facturas de APIs.');
content = content.replace(/<p className=\	ext-\[11px\] text-slate-400 font-medium\>[\s\S]*?<\/p>/, '<p className=\	ext-xs text-slate-400\>✓ Acceso Inmediato</p>');
content = content.replace(/<div className=\mt-3 flex items-center justify-center gap-3 sm:gap-4 text-\[10px\] sm:text-\[11px\] text-slate-400 flex-wrap\>[\s\S]*?<\/div>\s*<\/div>/, '</div>');
content = content.replace(/<div className=\inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500\/10 border border-emerald-500\/25 text-emerald-400 text-\[10px\] font-extrabold uppercase tracking-widest\>[\s\S]*?<\/div>/, '');

content = content.replace(/desc: 'Pega guiones enteros de 10, 50 o cientos de tomas\\..*?listo para arrastrar a tu editor\\.',/, desc: 'Genera lotes de imágenes empaquetadas en un ZIP numerado.',);
content = content.replace(/desc: 'Bloquea los rasgos biométricos.*?continuidad absoluta\\.',/, desc: 'Mantiene el mismo rostro y ropa en todas tus escenas.',);
content = content.replace(/desc: 'Pega tu idea o texto en bruto.*?tomas aéreas\\)\\.',/, desc: 'Calcula encuadres y estilos a partir de tu texto.',);
content = content.replace(/desc: 'Aplica universos visuales enteros con un solo clic:.*?Realismo Documental\\.',/, desc: 'Aplica universos visuales con un solo clic.',);
content = content.replace(/desc: 'Escala cualquier escena a ultra alta resolución.*?alta densidad\\.',/, desc: 'Escala cualquier escena a 4K sin perder calidad.',);
content = content.replace(/desc: 'Cada imagen generada se sincroniza al milisegundo.*?casi al instante\\.',/, desc: 'Sincroniza imágenes con locución automáticamente.',);
content = content.replace(/desc: 'Guarda tus personajes más exitosos.*?máxima velocidad\\.',/, desc: 'Guarda personajes y estilos en tu bóveda personal.',);

content = content.replace(/a: '¡Sí, 100%! La mayor ventaja.*?cada imagen que generes\\.'/g, : 'Sí, todo está integrado. No necesitas comprar tokens ni APIs.');
content = content.replace(/a: 'Tan pronto completas tu inscripción.*?total e inmediato\\.'/g, : 'Inicia sesión con tu correo de Skool para acceder.');
content = content.replace(/a: 'Nuestra plataforma se sincroniza.*?valor con el que ingresaste hoy\\.'/g, : 'Tu precio mensual queda congelado de por vida.');
content = content.replace(/a: 'Sí\\. El motor incluye el.*?jamás cambie de rostro\\.'/g, : 'Sí. El modo de consistencia facial mantiene el rostro fijo.');
content = content.replace(/a: 'No\\. Todo el procesamiento neuronal.*?total fluidez\\.'/g, : 'No. Todo el procesamiento corre en la nube.');
content = content.replace(/a: 'Totalmente\\. No hay contratos.*?cuando tú lo decidas\\.'/g, : 'Sí. Puedes cancelar tu suscripción en cualquier momento.');

fs.writeFileSync('components/LandingPage.tsx', content);

