const fs = require('fs');

const content = fs.readFileSync('lophoc_source_utf8.html', 'utf8');

// Find the line that starts with var _0x38e36d
const scriptMatch = content.match(/<script type="text\/javascript">\s*(var _0x38e36d=[\s\S]*?)<\/script>/);

if (scriptMatch) {
    let scriptContent = scriptMatch[1];
    
    // Create a mock environment to evaluate the array
    const vm = require('vm');
    const context = {
        window: {},
        document: {
             getElementById: () => ({ style: {} }),
             on: () => {}
        },
        $: () => ({ on: () => {}, css: () => {}, val: () => '', text: () => '', html: () => '' }),
        location: { hostname: 'lophoc.net' },
        screen: { width: 1920 }
    };
    
    // Redefine window so $ can attach to it, or mock jQuery fully.
    context.$ = function () { 
        return { 
            on: function(){}, 
            css: function(){},
            val: function(){},
            text: function(){},
            html: function(){},
            width: function(){return 1000;}
        }; 
    };
    context.document = { on: function(){}, getElementById: function(){ return { style:{} }; } };

    // Let's just extract the raw regex replace pairs manually
    // The pattern is: inputText=inputText['replace'](/pattern/g,'replacement')
    // or inputText=inputText[_0xSomething(0xHex)](/pattern/g,'replacement')
    
    let replaces = [];
    const regex = /inputText\s*=\s*inputText.*?\((\/.*?\/g)\s*,\s*('.*?')\)/g;
    let match;
    while ((match = regex.exec(scriptContent)) !== null) {
        replaces.push([match[1], match[2]]);
    }
    
    // There are two functions: cv0l and kn9e. We don't care, just get all replaces in order.
    let outJS = `export function convertToHandwriting(inputText) {\n`;
    outJS += `    inputText = ' ' + inputText + ' ';\n`;
    outJS += `    inputText = inputText.replace(/,/g, ' | ').replace(/\\|/g, ',');\n`;
    outJS += `    inputText = inputText.replace(/\\./g, '').replace(/\\|/g, '.');\n`; // This part in original is weird, we'll fix it.
    outJS += `    // Replaces:\n`;
    for (let r of replaces) {
        outJS += `    inputText = inputText.replace(${r[0]}, ${r[1]});\n`;
    }
    outJS += `    return inputText.trim();\n`;
    outJS += `}\n`;
    
    fs.writeFileSync('src/lib/vietnameseHandwriting.js', outJS, 'utf8');
    console.log(`Extracted ${replaces.length} replacements.`);
}
