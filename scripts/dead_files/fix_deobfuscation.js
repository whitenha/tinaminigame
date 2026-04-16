const fs = require('fs');

const arr = ['1075549nlRGQb','css','ǕΜ∆','379096rTokBu','exitFullscreen','1164ULBosh','includes','ǕΜ⁄','ǕΜ≈','ǕΜ;','substring','\\x20Θ≈','Ηˇc','Ηğc','ΗϜc','webkitRequestFullscreen','text','show','ǕΜ◊','tapviet1bold','\\x20π˙','ǕΜ˘','\\x20Θ◊','mozRequestFullScreen','\\x20Θ∆','Η˛c','#ddongke','\\x20πı','tapviet1normal','oph','tapviet5hang','#btnnetdam','remove','ǕΜ','\\x20Θˉ','\\x20πˉ','hostname','Thường','\\x20Ŕ\\x20','open','Đậm','4\\x20ô\\x20ly','html','\\x20Θł','#txtnetdam','\\x20π≈','menubbitem','.menu-line','ǕΜŃ','ready','tapviet4hang','\\x20πŃ','webkitExitFullscreen','#txt4oly','\\x20Θ˘','padding-top','ǕΜˉ','.menu-round','font-family','6095694NSKTEg','Β΄o','\\x20ΘŃ','mozCancelFullScreen','Η˝c','1147440DFTgKQ','\\x20Θı','\\x20π','click','11511243dviJRa','ΐêu\\x20','width','.btn-app','\\x20|\\x20','Η΄c','.menu-toggle','requestFullscreen','#btnfullscreen','\\x20Θ;','Ηİc','\\x20Θ','join','10BTsoMf','font-size','toLowerCase','#dkhung','dkhung','\\x20π∆','toggleClass','getElementById','round','href','line-height','Η˞c','ǕΜ','\\x20π⁄','ǕΜı','\\x20Θ⁄','\\x20π◊','sΝ\\x20','1209582PTxxER','&nbsp;','\\x20Ď\\x20','msRequestFullscreen','\\x20Θ','ǕΜ˙','77LpDpVm','Ηłc','msExitFullscreen','replace','ΗĞc','\\x20π˘','12392xlZYfq','#dvanban'];

// We need to decode the array since they have \x20 in them which are already literal escaped here for safety.
// Actually, string literals like '\x20|\x20' just translate to ' | ' in JS.
// For replacement code, we should wrap the evaluated string in single quotes and escape properly.

let jsCode = fs.readFileSync('src/lib/vietnameseHandwriting.js', 'utf8');

// The deobfuscator lookup
function getDeobfuscatedString(hexStr) {
    let index = parseInt(hexStr, 16) - 0x1d3;
    let str = arr[index];
    if (str === undefined) return '"UNKNOWN"';
    return "'" + str.replace(/'/g, "\\'") + "'"; 
}

// Replace _0x1c353d(0xXYZ)  ->  'string'
jsCode = jsCode.replace(/(_0x[a-f0-9]+)\((0x[a-f0-9]+)\)/gi, (match, prefix, hex) => {
    return getDeobfuscatedString(hex);
});

// Also fix some weird syntax that regex generated:
// inputText = inputText.replace(/\./g, '...'),inputText=inputText['replace'](/\|/g, '.');
// These commas are confusing and ugly. We can semi-colon them.
jsCode = jsCode.replace(/,inputText=inputText/g, ';\n    inputText = inputText');

fs.writeFileSync('src/lib/vietnameseHandwriting.js', jsCode, 'utf8');
console.log('Fixed obfuscated strings successfully!');
