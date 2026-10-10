const fs = require('fs');

const targetFile = 'src/modules/superadmin/pages/SuperAdminDashboard.jsx';
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
  /\{\(\(\) => \{ try \{ return JSON\.parse\(item\.config \|\| '\{\}'\)\.adminEmail \|\| '-'; \} catch\(e\) \{ return '-'; \} \}\)\(\)\}/g,
  "{safeParseConfig(item.config).adminEmail || safeParseConfig(item.config).contact?.email || '-'}"
);

fs.writeFileSync(targetFile, content);
console.log('Final replacement complete');
