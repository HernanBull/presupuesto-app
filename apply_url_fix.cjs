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

    // 1. Replace single quoted strings
    content = content.replace(/'https:\/\/axonmarket-api\.onrender\.com([^']*)'/g, "`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}$1`");

    // 2. Replace double quoted strings
    content = content.replace(/"https:\/\/axonmarket-api\.onrender\.com([^"]*)"/g, "`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}$1`");

    // 3. Replace remaining inside template literals
    content = content.replace(/https:\/\/axonmarket-api\.onrender\.com/g, "${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}");

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
        console.log(`Updated: ${file}`);
    }
});

console.log(`\nSuccess! Updated ${changedFiles} files.`);
