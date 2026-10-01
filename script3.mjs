import fs from 'fs';
let content = fs.readFileSync('components/SettingsStage.tsx', 'utf8');

content = content.replace(/<p className="text-xs text-slate-400 mt-0\.5">\s*[\s\S]*?\s*<\/p>/g, '');
content = content.replace(/<p className="text-xs text-slate-400 mt-1 max-w-2xl">\s*[\s\S]*?\s*<\/p>/g, '');

fs.writeFileSync('components/SettingsStage.tsx', content);
console.log('Done script SettingsStage 2');