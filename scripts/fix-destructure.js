const fs = require('fs');
const glob = require('child_process').execSync('dir /s /b src\\*.ts src\\*.tsx').toString().split('\r\n').filter(Boolean);

let modifiedCount = 0;

for (const file of glob) {
   let content = fs.readFileSync(file, 'utf8');
   
   // E.g., export function MyComponent({ a, b }) -> export function MyComponent({ a, b }: any)
   // Also handle const MyComponent = ({ a, b }) => ...
   
   let newContent = content.replace(/(function\s+\w+\s*)\((\s*{[^}]+}\s*)\)/g, '$1($2: any)');
   
   newContent = newContent.replace(/(const\s+\w+\s*=\s*(?:async\s*)?)\((\s*{[^}]+}\s*)\)\s*=>/g, '$1($2: any) =>');

   if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Fixed destructured props in', file);
      modifiedCount++;
   }
}
console.log('Modified', modifiedCount, 'files.');
