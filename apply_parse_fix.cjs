const fs = require('fs');

const targetFile = 'src/modules/superadmin/pages/SuperAdminDashboard.jsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Add the safeParseConfig function near the top of the file, after imports
if (!content.includes('const safeParseConfig =')) {
  content = content.replace(
    'export default function SuperAdminDashboard({ superKey }) {',
    `const safeParseConfig = (configData) => {
  if (!configData) return {};
  if (typeof configData === 'object') return configData;
  try { return JSON.parse(configData); } catch (e) { return {}; }
};

export default function SuperAdminDashboard({ superKey }) {`
  );
}

// Replace the inline try-catch blocks for is_verified
content = content.replace(/\(\(\) => \{ try \{ return JSON\.parse\(item\.config \|\| '\{\}'\)\.is_verified; \} catch\(e\) \{ return false; \} \}\)\(\)/g, 'safeParseConfig(item.config).is_verified');

// Replace the inline try-catch blocks for adminEmail
content = content.replace(/\(\(\) => \{ try \{ return JSON\.parse\(item\.config \|\| '\{\}'\)\.adminEmail \|\| '-'; \} catch\(e\) \{ return '-'; \} \}\)\(\)/g, "(safeParseConfig(item.config).adminEmail || safeParseConfig(item.config).contact?.email || '-')");

// In fetch data:
content = content.replace(
  `const config = JSON.parse(w.config || '{}');`,
  `const config = safeParseConfig(w.config);`
);

content = content.replace(
  `try { configObj = typeof merchant.config === 'string' ? JSON.parse(merchant.config) : (merchant.config || {}); } catch(e){}`,
  `configObj = safeParseConfig(merchant.config);`
);

// In the modal:
content = content.replace(
  /let config = \{\};\s*try \{\s*config = JSON\.parse\(selectedDetails\.config \|\| '\{\}'\);\s*\} catch\(e\) \{\}/,
  `const config = safeParseConfig(selectedDetails.config);`
);

// In delivery bot
content = content.replace(
  `setDeliveryGroups(JSON.parse(savedGroups.value || '[]'));`,
  `try { setDeliveryGroups(JSON.parse(savedGroups.value || '[]')); } catch(e) { setDeliveryGroups([]); }`
);

fs.writeFileSync(targetFile, content);
console.log('Replacements complete');
