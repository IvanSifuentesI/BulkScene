import fs from 'fs';
let content = fs.readFileSync('components/MasterStudioStage.tsx', 'utf8');

// Remove narrative mode explanation paragraphs
content = content.replace(/<p className="text-\[11px\] text-slate-400 leading-relaxed">[\s\S]*?<\/p>/g, '');

// Shorten Cinematography section label
content = content.replace(/CINEMATOGRAFÍA Y LENTES \(DIRECTOR DE FOTOGRAFÍA\)/, 'CINEMATOGRAFÍA');

// Auto mode shouldn't explain itself - remove detectedStyleReason 
content = content.replace(/\{detectedStyleReason && \([\s\S]*?\}\)/, '');

// Save
fs.writeFileSync('components/MasterStudioStage.tsx', content);
console.log('Done script MasterStudioStage');