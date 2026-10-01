import fs from 'fs';
let content = fs.readFileSync('components/LandingPage.tsx', 'utf8');

content = content.replace(/desc: 'Pega guiones enteros.*?editor\.',/, "desc: 'Genera lotes de imágenes en un ZIP numerado.',");
content = content.replace(/desc: 'Bloquea los rasgos biométricos.*?absoluta\.',/, "desc: 'Mantiene el mismo rostro y ropa en todas tus escenas.',");
content = content.replace(/desc: 'Pega tu idea o texto en bruto.*?aéreas\)\.',/, "desc: 'Calcula encuadres y estilos a partir de tu texto.',");
content = content.replace(/desc: 'Aplica universos visuales enteros.*?Documental\.',/, "desc: 'Aplica universos visuales con un solo clic.',");
content = content.replace(/desc: 'Escala cualquier escena.*?densidad\.',/, "desc: 'Escala cualquier escena a 4K sin perder calidad.',");
content = content.replace(/desc: 'Cada imagen generada se sincroniza.*?instante\.',/, "desc: 'Sincroniza imágenes con locución automáticamente.',");
content = content.replace(/desc: 'Guarda tus personajes más exitosos.*?velocidad\.',/, "desc: 'Guarda personajes y estilos en tu bóveda personal.',");

content = content.replace(/desc: 'El Director con IA analiza el texto completo.*?visuales\.'/g, "desc: 'Analiza tu guion y desglosa escenas automáticamente.'");
content = content.replace(/desc: 'Bloquea el rostro, edad y vestimenta.*?video\.'/g, "desc: 'Bloquea el rostro y aplica estilos consistentes.'");
content = content.replace(/desc: 'El motor genera imágenes ilimitadas.*?Premiere\.'/g, "desc: 'Genera imágenes y descarga un ZIP listo para editar.'");

content = content.replace(/a: '¡Sí, 100%! La mayor ventaja.*?generes\.'/g, "a: 'Sí, todo integrado. Sin pagos extras.'");
content = content.replace(/a: 'Tan pronto completas tu inscripción.*?inmediato\.'/g, "a: 'Inicia sesión con tu correo de Skool.'");
content = content.replace(/a: 'Nuestra plataforma se sincroniza.*?hoy\.'/g, "a: 'Tu precio queda congelado de por vida.'");
content = content.replace(/a: 'Sí\. El motor incluye el.*?rostro\.'/g, "a: 'Sí. El modo de consistencia mantiene el rostro.'");
content = content.replace(/a: 'No\. Todo el procesamiento neuronal.*?fluidez\.'/g, "a: 'No. Todo el procesamiento corre en la nube.'");
content = content.replace(/a: 'Totalmente\. No hay contratos.*?decidas\.'/g, "a: 'Sí. Puedes cancelar en cualquier momento.'");

fs.writeFileSync('components/LandingPage.tsx', content);
console.log('Done script');