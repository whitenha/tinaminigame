const fs = require('fs');

const content = fs.readFileSync('lophoc_source_utf8.html', 'utf8');

// Find the line that starts with var _0x38e36d
const scriptMatch = content.match(/<script type="text\/javascript">\s*(var _0x38e36d=[\s\S]*?)<\/script>/);

if (scriptMatch) {
    let scriptContent = scriptMatch[1];
    
    let replaces = [];
    // Handle inputText=inputText['replace'](/.../g,'...')
    // Handle inputText=inputText[_0x...](/.../g,'...')
    const regex = /inputText\s*=\s*inputText.*?\((\/.*?\/g)\s*,\s*('.*?')\)/g;
    let match;
    while ((match = regex.exec(scriptContent)) !== null) {
        replaces.push([match[1], match[2]]);
    }
    
    let outJS = `// Auto-generated mapper port from HP001 font logic\n\n`;
    outJS += `export function convertToHandwriting(rawText) {\n`;
    
    // Protect English letters before doing any translation
    outJS += `    // 1. Protect w, f, j, z by replacing them with unique private use characters\n`;
    outJS += `    let text = rawText;\n`;
    outJS += `    text = text.replace(/w/g, '\\uE001').replace(/W/g, '\\uE002');\n`;
    outJS += `    text = text.replace(/f/g, '\\uE003').replace(/F/g, '\\uE004');\n`;
    outJS += `    text = text.replace(/j/g, '\\uE005').replace(/J/g, '\\uE006');\n`;
    outJS += `    text = text.replace(/z/g, '\\uE007').replace(/Z/g, '\\uE008');\n\n`;
    
    outJS += `    let inputText = ' ' + text + ' ';\n`;
    outJS += `    inputText = inputText.replace(/,/g, ' | ').replace(/\\|/g, ',');\n`;
    outJS += `    inputText = inputText.replace(/\\./g, '').replace(/\\|/g, '.');\n`;
    // More basic replacements found in the original
    outJS += `    inputText = inputText.replace(/!/g, '').replace(/\\|/g, '!');\n`;
    outJS += `    inputText = inputText.replace(/\\?/g, '').replace(/\\|/g, '?');\n`;
    outJS += `    inputText = inputText.replace(/;/g, '').replace(/\\|/g, ';');\n\n`;

    outJS += `    // 2. Original HP001 Font mappings\n`;
    for (let r of replaces) {
        // Some replacements in the source were broken or using variable names instead of strings, let's try to pass them directly
        outJS += `    inputText = inputText.replace(${r[0]}, ${r[1]});\n`;
    }
    
    // The second function kn9e had more replacements
    outJS += `\n    // kn9e replacements:\n`;
    outJS += `    inputText=inputText.replace(/eu/g,'\\u0384u');\n`;
    // We'll skip the exhaustive kn9e list for simplicity if we don't have it, but wait, the regex above captured ALL of them in the script because it just scans all inputText=inputText...
    
    outJS += `    \n    return inputText.trim();\n`;
    outJS += `}\n`;
    
    // A helper to recover the English letters after mapping (useful if we want to render them differently)
    outJS += `\nexport function renderTextWithEnglishCharacters(mappedText, React = null) {\n`;
    outJS += `    if (!React) return mappedText.replace(/\\uE001/g, 'w').replace(/\\uE005/g, 'j'); // Fallback string\n`;
    outJS += `    // For React, we could split it and return an array of elements\n`;
    outJS += `    return mappedText;\n`;
    outJS += `}\n`;

    fs.writeFileSync('src/lib/vietnameseHandwriting.js', outJS, 'utf8');
    console.log(`Ported mapper with ${replaces.length} rules.`);
}
