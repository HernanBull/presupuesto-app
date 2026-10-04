const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else {
            if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walkDir(srcDir);
let changedFiles = 0;

files.forEach(file => {
    const originalContent = fs.readFileSync(file, 'utf8');
    let content = originalContent;

    // We changed:
    // 'https://axonmarket-api.onrender.com' -> `${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}`
    // Let's replace `${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}` back to https://axonmarket-api.onrender.com
    
    // Reverse the template literal ones:
    // "`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api...`" 
    // This is hard to regex exactly, but we can do a global replace of the expression.
    
    // Let's just find exactly `${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}` and replace with `https://axonmarket-api.onrender.com`
    content = content.replace(/\$\{import\.meta\.env\.VITE_API_URL \|\| 'https:\/\/axomarket\.pagina\.dev'\}/g, "https://axonmarket-api.onrender.com");
    
    // Now we might have `https://axonmarket-api.onrender.com`
    // Which means if it was `${...}` it is now `https://axonmarket-api.onrender.com` (inside backticks).
    // If it was meant to be single quotes, it might still be in backticks. That's actually fine (template literals are valid JS).
    // Let's leave them as backticks, it won't break anything.

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
        console.log(`Reverted URL in: ${file}`);
    }
});

console.log(`\nSuccess! Reverted ${changedFiles} files.`);
