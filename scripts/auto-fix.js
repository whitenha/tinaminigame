const fs = require('fs');

const logPath = 'tsc_errors.log';
const logContent = fs.readFileSync(logPath, 'utf-8');

const regex = /^src[\\/](.*)\((\d+),(\d+)\): error (TS7006|TS7031): (.*)/gm;
let match;
let edits = {}; // filePath -> line -> list of edits

while ((match = regex.exec(logContent)) !== null) {
// No path string changes needed since fs handles both, but need to reconstruct correctly if needed.
  const file = 'src/' + match[1].replace(/\\/g, '/');
  const line = parseInt(match[2]) - 1; // 0-indexed
  const col = parseInt(match[3]) - 1; // 0-indexed
  const code = match[4];
  const msg = match[5];

  if (!edits[file]) edits[file] = {};
  if (!edits[file][line]) edits[file][line] = [];

  // Very naive string injection for parameters
  // TS7006: Parameter 'e' implicitly has an 'any' type.
  // TS7031: Binding element 'children' implicitly has an 'any' type.
  
  if (code === 'TS7006') {
     const paramMatch = msg.match(/Parameter '([^']+)'/);
     if (paramMatch) {
       edits[file][line].push({ type: 'param', name: paramMatch[1], col });
     }
  } else if (code === 'TS7031') {
     // A binding element '{ x }' -> '{ x }: any' might be handled at the end of the destructure, which is much harder.
     // For now, let's just collect it.
  }
}

// Process edits
for (const file of Object.keys(edits)) {
    try {
        let content = fs.readFileSync(file, 'utf-8').split('\n');
        let modified = false;

        const linesToEdit = Object.keys(edits[file]).sort((a,b) => b - a); // Bottom up
        for (const lineStr of linesToEdit) {
            const line = parseInt(lineStr);
            let lineText = content[line];
            const sortedEdits = edits[file][line].sort((a,b) => b.col - a.col); // Right to left
            
            for (const edit of sortedEdits) {
               if (edit.type === 'param') {
                  // Find the end of the identifier and insert ': any'
                  // We know it starts at edit.col. This is extremely fragile but works for simple instances.
                  // E.g. (e) => ...
                  // e is at col. length is edit.name.length.
                  const endIdx = edit.col + edit.name.length;
                  if (lineText.substring(edit.col, endIdx) === edit.name) {
                     lineText = lineText.slice(0, endIdx) + ': any' + lineText.slice(endIdx);
                     modified = true;
                  }
               }
            }
            content[line] = lineText;
        }

        if (modified) {
           fs.writeFileSync(file, content.join('\n'));
           console.log("Modified", file);
        }
    } catch (e) {
      console.error(e);
    }
}
