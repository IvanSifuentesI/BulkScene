import fs from 'fs';
let content = fs.readFileSync('components/BulkSceneGenerator.tsx', 'utf8');

// Remove explanations inside cards
content = content.replace(/<p className="text-xs text-slate-400 mt-0\.5">[\s\S]*?<\/p>/g, '');
content = content.replace(/<p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">[\s\S]*?<\/p>/g, '');

fs.writeFileSync('components/BulkSceneGenerator.tsx', content);
console.log('Done script BulkSceneGenerator');