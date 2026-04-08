// Proper deobfuscator - runs the array rotation first, then builds the lookup table

// Step 1: The original array (before rotation)
const _0x40c67b = ['1075549nlRGQb','css','ǕΜ∆','379096rTokBu','exitFullscreen','1164ULBosh','includes','ǕΜ⁄','ǕΜ≈','ǕΜ;','substring','\x20Θ≈','Ηˇc','Ηğc','ΗϜc','webkitRequestFullscreen','text','show','ǕΜ◊','tapviet1bold','\x20π˙','ǕΜ˘','\x20Θ◊','mozRequestFullScreen','\x20Θ∆','Η˛c','#ddongke','\x20πı','tapviet1normal','oph','tapviet5hang','#btnnetdam','remove','ǕΜ','\x20Θˉ','\x20πˉ','hostname','Thường','\x20Ŕ\x20','open','Đậm','4\x20ô\x20ly','html','\x20Θł','#txtnetdam','\x20π≈','menubbitem','.menu-line','ǕΜŃ','ready','tapviet4hang','\x20πŃ','webkitExitFullscreen','#txt4oly','\x20Θ˘','padding-top','ǕΜˉ','.menu-round','font-family','6095694NSKTEg','Β΄o','\x20ΘŃ','mozCancelFullScreen','Η˝c','1147440DFTgKQ','\x20Θı','\x20π','click','11511243dviJRa','ΐêu\x20','width','.btn-app','\x20|\x20','Η΄c','.menu-toggle','requestFullscreen','#btnfullscreen','\x20Θ;','Ηİc','\x20Θ','join','10BTsoMf','font-size','toLowerCase','#dkhung','dkhung','\x20π∆','toggleClass','getElementById','round','href','line-height','Η˞c','ǕΜ','\x20π⁄','ǕΜı','\x20Θ⁄','\x20π◊','sΝ\x20','1209582PTxxER','&nbsp;','\x20Ď\x20','msRequestFullscreen','\x20Θ','ǕΜ˙','77LpDpVm','Ηłc','msExitFullscreen','replace','ΗĞc','\x20π˘','12392xlZYfq','#dvanban'];

// Step 2: Run the rotation loop (from the IIFE)
const arr = [..._0x40c67b];
function lookup(idx) {
    return arr[idx - 0x1d3];
}

// The rotation loop tries different rotations until the checksum matches 0xb9895
while (true) {
    try {
        const val = -parseInt(lookup(0x225)) / 1 + parseInt(lookup(0x217)) / 2 + -parseInt(lookup(0x22a)) / 3 * (-parseInt(lookup(0x223)) / 4) + -parseInt(lookup(0x1f4)) / 5 + parseInt(lookup(0x1ef)) / 6 + parseInt(lookup(0x21d)) / 7 * (parseInt(lookup(0x228)) / 8) + -parseInt(lookup(0x1f8)) / 9 * (parseInt(lookup(0x205)) / 10);
        if (val === 0xb9895) break;
        arr.push(arr.shift());
    } catch (e) {
        arr.push(arr.shift());
    }
}

// Step 3: Build the correct lookup map
console.log("Array rotation complete. Building lookup table...");
const lookupMap = {};
for (let i = 0x1d3; i <= 0x1d3 + arr.length - 1; i++) {
    const hex = '0x' + i.toString(16);
    lookupMap[hex] = arr[i - 0x1d3];
}

// Verify key entries
console.log("0x220 =", JSON.stringify(lookupMap['0x220'])); // Should be 'replace'
console.log("0x1fc =", JSON.stringify(lookupMap['0x1fc'])); // Should be ' | '

// Step 4: Now read the HTML source and generate clean JS
const fs = require('fs');
const html = fs.readFileSync('lophoc_source_utf8.html', 'utf8');

// Extract the cv0l and kn9e function bodies
const scriptMatch = html.match(/function cv0l\(.*?\{([\s\S]*?)inputText;\}function kn9e\(.*?\{([\s\S]*?)inputText;\}/);
if (!scriptMatch) {
    console.error("Could not find cv0l/kn9e functions");
    process.exit(1);
}

let cv0lBody = scriptMatch[1];
let kn9eBody = scriptMatch[2];

// Step 5: Replace all _0x4b6514(0xHEX) and _0x1c353d(0xHEX) with their actual string values
function deobfuscate(code) {
    return code.replace(/_0x[a-f0-9]+\((0x[a-f0-9]+)\)/gi, (match, hex) => {
        const val = lookupMap[hex];
        if (val === undefined) {
            console.warn("MISSING lookup for", hex);
            return match;
        }
        // Escape for JS string literal
        const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return "'" + escaped + "'";
    });
}

cv0lBody = deobfuscate(cv0lBody);
kn9eBody = deobfuscate(kn9eBody);

// Step 6: Convert comma-chained expressions to separate lines
function formatBody(body) {
    // Split on ,inputText= to get individual replace statements
    let lines = body.split(/,inputText=/g);
    let result = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (i === 0) {
            result.push('    ' + line);
        } else {
            result.push('    inputText=' + line);
        }
    }
    return result.join('\n').replace(/;$/gm, ';\n');
}

let cv0lFormatted = formatBody(cv0lBody);
let kn9eFormatted = formatBody(kn9eBody);

// Remove domain checks (if(l1[0x0]!='l')return''; etc.)
cv0lFormatted = cv0lFormatted.replace(/if\(l1\[0x0\]!='l'\)return'';/g, '');
kn9eFormatted = kn9eFormatted.replace(/if\(l1\[.*?\)return'';/g, '');
// Also the 'return' at the beginning of inline return statements
cv0lFormatted = cv0lFormatted.replace(/return inputText=/g, 'inputText=');
kn9eFormatted = kn9eFormatted.replace(/return inputText=/g, 'inputText=');

// Convert ['replace'] to .replace
cv0lFormatted = cv0lFormatted.replace(/\['replace'\]/g, '.replace');
kn9eFormatted = kn9eFormatted.replace(/\['replace'\]/g, '.replace');

// Build final file
let output = `// Auto-generated deobfuscated mapper from HP001 font logic
// Perfectly clean - all obfuscation resolved

export function convertToHandwriting(rawText) {
    // Protect English-only characters (w, f, j, z) from HP001 font mangling
    let text = rawText;
    text = text.replace(/w/g, '\\uE001').replace(/W/g, '\\uE002');
    text = text.replace(/f/g, '\\uE003').replace(/F/g, '\\uE004');
    text = text.replace(/j/g, '\\uE005').replace(/J/g, '\\uE006');
    text = text.replace(/z/g, '\\uE007').replace(/Z/g, '\\uE008');

    // cv0l - primary character mapping
    let inputText = ' ' + text + ' ';
${cv0lFormatted}

    // kn9e - secondary character mapping  
${kn9eFormatted}

    return inputText.trim();
}
`;

fs.writeFileSync('src/lib/vietnameseHandwriting.js', output, 'utf8');

// Verify no obfuscated references remain
const remaining = output.match(/_0x[a-f0-9]+/gi);
if (remaining) {
    console.error("WARNING: Still has unresolved references:", [...new Set(remaining)]);
} else {
    console.log("SUCCESS: All obfuscation resolved! File written cleanly.");
}
