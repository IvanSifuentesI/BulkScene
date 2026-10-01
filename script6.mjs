import fs from 'fs';
let content = fs.readFileSync('components/ScriptDisplay.tsx', 'utf8');

content = content.replace(/<p className="text-\[10px\] text-slate-400">Automatiza los movimientos de todas tus escenas<\/p>/g, '');
content = content.replace(/<p className="text-slate-400">Esto tomará solo un momento\.<\/p>/g, '');
content = content.replace(/<p className="text-slate-400">Usa la lista de prompts o la entrada JSON para empezar\.<\/p>/g, '');
content = content.replace(/<h4 className="text-lg font-bold text-white mb-2">Instrucciones:<\/h4>[\s\S]*?<\/ul>/g, '');
content = content.replace(/title="Genera videos y automáticamente verifica y repara errores hasta que quede perfecto"/g, '');

fs.writeFileSync('components/ScriptDisplay.tsx', content);
console.log('Done script ScriptDisplay');