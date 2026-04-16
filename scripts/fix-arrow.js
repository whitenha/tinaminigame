const fs = require('fs');
const glob = require('child_process').execSync('dir /s /b src\\*.ts src\\*.tsx').toString().split('\r\n').filter(Boolean);

for (const file of glob) {
   let content = fs.readFileSync(file, 'utf8');
   let modified = false;

   // Fix: e: any => ... to (e: any) => ...
   // Also check for multiple spaces:
   const newContent = content.replace(/\b([a-zA-Z0-9_]+)\s*:\s*any\s*=>/g, '($1: any) =>');
   if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Fixed syntax in', file);
   }
}
