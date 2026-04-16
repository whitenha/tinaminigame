const fs = require('fs');
const glob = require('child_process').execSync('dir /s /b src\\*.ts src\\*.tsx').toString().split('\r\n').filter(Boolean);

let modifiedCount = 0;

for (const file of glob) {
   let content = fs.readFileSync(file, 'utf8');
   let initialContent = content;
   
   // Fix catch (err) -> catch (err: any)
   content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)/g, 'catch ($1: any)');
   
   // Fix e.target.value -> (e.target as any).value
   // E.target.select() -> (e.target as any).select()
   // Will be a bit conservative to avoid breaking
   content = content.replace(/\b(e\.target|event\.target)\b\.([a-zA-Z0-9_]+)/g, '($1 as any).$2');

   if (content !== initialContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed catch/target in', file);
      modifiedCount++;
   }
}
console.log('Modified', modifiedCount, 'files.');
