const fs = require('fs');
const glob = require('child_process').execSync('dir /s /b src\\*.ts src\\*.tsx').toString().split('\r\n').filter(Boolean);

let modifiedCount = 0;

for (const file of glob) {
   let content = fs.readFileSync(file, 'utf8');
   
   // useState(null) -> useState<any>(null)
   let newContent = content.replace(/useState\(null\)/g, 'useState<any>(null)');
   
   // useState([]) -> useState<any[]>([])
   newContent = newContent.replace(/useState\(\[\]\)/g, 'useState<any[]>([])');
   
   // useState({}) -> useState<any>({})
   newContent = newContent.replace(/useState\(\{\}\)/g, 'useState<any>({})');
   
   // useRef(null) -> useRef<any>(null)
   // Exclude lines where it already has <...> like useRef<HTMLDivElement>(null)
   newContent = newContent.replace(/useRef\(null\)/g, 'useRef<any>(null)');
   
   // useRef({}) -> useRef<any>({})
   newContent = newContent.replace(/useRef\(\{\}\)/g, 'useRef<any>({})');
   
   // useRef([]) -> useRef<any[]>([])
   newContent = newContent.replace(/useRef\(\[\]\)/g, 'useRef<any[]>([])');

   if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Fixed hook typings in', file);
      modifiedCount++;
   }
}
console.log('Modified', modifiedCount, 'files.');
