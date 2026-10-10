const fs = require('fs');
const adminFile = 'src/modules/superadmin/pages/SuperAdminDashboard.jsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');

adminContent = adminContent.replace(
    `if (activeTab === 'merchants') {
        const { data } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
        setMerchants(data || []);
      } else if (activeTab === 'customers') {`,
    `if (activeTab === 'merchants' || activeTab === 'pending_merchants') {
        const { data } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
        setMerchants(data || []);
      } else if (activeTab === 'customers') {`
);

adminContent = adminContent.replace(
    `const filteredMerchants = merchants.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.store_slug && m.store_slug.toLowerCase().includes(searchTerm.toLowerCase()))
  );`,
    `const filteredMerchants = merchants.filter(m => {
    const matches = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m.store_slug && m.store_slug.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeTab === 'pending_merchants') {
      return matches && m.status === 'Pendiente';
    }
    return matches && m.status !== 'Pendiente';
  });`
);

adminContent = adminContent.replace(
    `<button 
            onClick={() => setActiveTab('merchants')}
            className={\`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap \${
              activeTab === 'merchants' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }\`}
          >
            <Store size={18} /> Tiendas
          </button>`,
    `<button 
            onClick={() => setActiveTab('pending_merchants')}
            className={\`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap \${
              activeTab === 'pending_merchants' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }\`}
          >
            <ShieldAlert size={18} /> Pre-registros
          </button>
          <button 
            onClick={() => setActiveTab('merchants')}
            className={\`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap \${
              activeTab === 'merchants' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }\`}
          >
            <Store size={18} /> Tiendas
          </button>`
);

// Instead of regex, simple replaceAll
adminContent = adminContent.split("activeTab === 'merchants' ? filteredMerchants").join("(activeTab === 'merchants' || activeTab === 'pending_merchants') ? filteredMerchants");
adminContent = adminContent.split("activeTab === 'merchants' &&").join("(activeTab === 'merchants' || activeTab === 'pending_merchants') &&");

// But wait, what if activeTab is used elsewhere?
// That's fine, the render logic requires it.

fs.writeFileSync(adminFile, adminContent);
console.log("SuperAdminDashboard.jsx updated");
