const fs = require('fs');

const content = fs.readFileSync('lophoc_source_utf8.html', 'utf8');

// Find the script blocks
const regexMatch = /<script type="text\/javascript">\s*var _0x38e36d=([\s\S]*?)<\/script>/;
const match = content.match(regexMatch);

if (match) {
    let scriptCode = match[1];
    
    // We will build a Sandbox environment to run the code
    scriptCode = "var _0x38e36d=" + scriptCode;
    
    // The script starts with $(document)['ready']... which we don't need. 
    // It also binds click handlers.
    // What we DO want are the cv0l and kn9e functions.
    // Let's mock $, document, window, screen, etc.
    const mockDOM = `
        var ReplaceLog = [];
        var OriginalStringReplace = String.prototype.replace;
        
        var document = { on: function(){}, getElementById: function(){ return {style:{}, innerHTML:''}; } };
        var location = { hostname: 'lophoc.net' };
        var screen = { width: 1920 };
        function $(sel) { 
            return {
                on: function(){},
                css: function(){},
                width: function(){return 1000;},
                text: function(){return '';},
                html: function(){return '';},
                val: function(){return '';},
                ready: function(cb){}, 
                toggleClass: function(){},
                append: function(){},
                remove: function(){}
            }
        };
        var window = { location: location };
        var l1 = "lophoc";
        
        // This runs the script definitions
        ${scriptCode}
        
        // Now cv0l and kn9e are defined!
        // We can hook String.prototype.replace to capture what arguments are passed.
        String.prototype.replace = function(search, replacement) {
            ReplaceLog.push({ search: search.toString(), replacement: replacement.toString() });
            return OriginalStringReplace.call(this, search, replacement);
        };
        
        cv0l("");
        kn9e("");
        
        // Restore
        String.prototype.replace = OriginalStringReplace;
    `;

    try {
        const vm = require('vm');
        const context = {};
        vm.createContext(context);
        vm.runInContext(mockDOM, context);
        
        let outJS = `// Auto-generated perfectly deobfuscated mapper from HP001 font logic\n\n`;
        outJS += `export function convertToHandwriting(rawText) {\n`;
        outJS += `    let text = rawText;\n`;
        outJS += `    text = text.replace(/w/g, '\\uE001').replace(/W/g, '\\uE002');\n`;
        outJS += `    text = text.replace(/f/g, '\\uE003').replace(/F/g, '\\uE004');\n`;
        outJS += `    text = text.replace(/j/g, '\\uE005').replace(/J/g, '\\uE006');\n`;
        outJS += `    text = text.replace(/z/g, '\\uE007').replace(/Z/g, '\\uE008');\n\n`;
        outJS += `    let inputText = ' ' + text + ' ';\n`;
        
        // Generate replacements from context.ReplaceLog
        const logs = context.ReplaceLog;
        for (let rule of logs) {
            let repl = rule.replacement;
            // Escape literal backslashes and quotes
            repl = repl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            outJS += `    inputText = inputText.replace(${rule.search}, '${repl}');\n`;
        }
        
        outJS += `    return inputText.trim();\n`;
        outJS += `}\n`;
        
        fs.writeFileSync('src/lib/vietnameseHandwriting.js', outJS, 'utf8');
        console.log("Successfully extracted " + logs.length + " perfectly deobfuscated rules!");
    } catch (err) {
        console.error("Failed to run sandbox:", err);
    }
} else {
    console.log("Could not find script block");
}
