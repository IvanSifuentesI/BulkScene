import fs from 'fs';
let content = fs.readFileSync('components/SettingsStage.tsx', 'utf8');

// Remove the description paragraph under LLM selector header
content = content.replace(/<p className="text-xs text-slate-400 mt-0\.5">\s*Selecciona libremente el motor que analizará y segmentará tus historias.*?\s*<\/p>/, '');

// Remove the description inside model selector cards
content = content.replace(/<p className="text-\[11px\] text-slate-400 leading-relaxed mb-2">\s*\{m\.description\}\s*<\/p>/g, '');

// Remove the description under STT shortcut
content = content.replace(/<p className="text-xs text-slate-400 mt-1 max-w-2xl">\s*Configura tus APIs de voz a texto.*?\s*<\/p>/, '');

// Remove description under NVIDIA category
content = content.replace(/<p className="text-xs text-slate-400 mt-0\.5">\s*FLUX\.1 Schnell, FLUX\.1 Dev, FLUX\.2 Klein, Kontext.*?\s*<\/p>/, '');

// Remove description under GROQ category
content = content.replace(/<p className="text-xs text-slate-400 mt-0\.5">\s*Whisper Large V3 Turbo.*?\s*<\/p>/, '');

// Remove description under GEMINI category (assuming it exists based on the others)
content = content.replace(/<p className="text-xs text-slate-400 mt-0\.5">\s*Motor Lógico Gemini Pro.*?\s*<\/p>/, ''); // Generic match
// Or just match any paragraph under an h3 inside a category card
content = content.replace(/<\/h3>\s*<p className="text-xs text-slate-400 mt-0\.5">[\s\S]*?<\/p>/g, '</h3>');

// Same for the STT section which might have other h3 descriptions
content = content.replace(/<\/h4>\s*<p className="text-xs text-slate-400 mt-1 max-w-2xl">[\s\S]*?<\/p>/g, '</h4>');

fs.writeFileSync('components/SettingsStage.tsx', content);
console.log('Done script SettingsStage');