const fs = require('fs');

// --- MarketplaceDirectory.jsx ---
const dirFile = 'src/modules/ecommerce/pages/MarketplaceDirectory.jsx';
let dirContent = fs.readFileSync(dirFile, 'utf8');

const step5Target = `      const newWorkspace = {
        id: authData.user.id,
        name: merchantForm.businessName,
        store_slug: generatedSlug,
        status: 'Pendiente',
        config: { is_verified: false }
      };`;
      
const step5Replacement = `      const initialConfig = {
        adminEmail: merchantForm.email,
        business_type: merchantForm.category,
        categories: [merchantForm.category],
        paymentProfile: {
          pmBank: merchantForm.pagoMovilBank,
          pmPhone: merchantForm.pagoMovilPhone,
          pmId: merchantForm.pagoMovilId || \`\${merchantForm.rifPrefix}-\${merchantForm.rifNumber}\`
        },
        expediente: {
          ownerName: merchantForm.ownerName || '',
          legalType: merchantForm.rifPrefix || 'V',
          rif: merchantForm.rifNumber ? \`\${merchantForm.rifPrefix}-\${merchantForm.rifNumber}\` : 'V-00000000-0',
          state: merchantForm.addressState || 'Por definir',
          city: merchantForm.addressCity || 'Por definir',
          address: merchantForm.addressLine || '',
          gps: merchantForm.gpsCoords,
          whatsapp: merchantForm.contactPhone || merchantForm.pagoMovilPhone || '',
        },
        contact: {
          phone: merchantForm.contactPhone,
          email: merchantForm.contactEmail
        },
        is_verified: false
      };

      const newWorkspace = {
        id: authData.user.id,
        name: merchantForm.businessName,
        store_slug: generatedSlug,
        status: 'Pendiente',
        config: initialConfig
      };`;

if (dirContent.includes(step5Target)) {
    dirContent = dirContent.replace(step5Target, step5Replacement);
    fs.writeFileSync(dirFile, dirContent);
    console.log("MarketplaceDirectory.jsx updated");
} else {
    console.log("MarketplaceDirectory target not found");
}

// --- SuperAdminDashboard.jsx ---
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

// We need to replace all `activeTab === 'merchants'` with `(activeTab === 'merchants' || activeTab === 'pending_merchants')`
// EXCEPT in the places where we literally just check for navigation or something.
// Actually, it's safer to only replace it where we render the tables.
const tableRenderTarget1 = `{(activeTab === 'merchants' ? filteredMerchants : filteredCustomers).map(item => (`;
const tableRenderReplacement1 = `{((activeTab === 'merchants' || activeTab === 'pending_merchants') ? filteredMerchants : filteredCustomers).map(item => (`;
adminContent = adminContent.replace(new RegExp(tableRenderTarget1.replace(/[-[\\]{}()*+?.,\\\\^$|#\\s]/g, '\\$&'), 'g'), tableRenderReplacement1);

const tableRenderTarget2 = `{(activeTab === 'merchants' ? filteredMerchants : filteredCustomers).length === 0 && (`;
const tableRenderReplacement2 = `{((activeTab === 'merchants' || activeTab === 'pending_merchants') ? filteredMerchants : filteredCustomers).length === 0 && (`;
adminContent = adminContent.replace(new RegExp(tableRenderTarget2.replace(/[-[\\]{}()*+?.,\\\\^$|#\\s]/g, '\\$&'), 'g'), tableRenderReplacement2);

const isMerch = `activeTab === 'merchants' &&`;
const isMerchRep = `(activeTab === 'merchants' || activeTab === 'pending_merchants') &&`;
adminContent = adminContent.replace(new RegExp(isMerch.replace(/[-[\\]{}()*+?.,\\\\^$|#\\s]/g, '\\$&'), 'g'), isMerchRep);

fs.writeFileSync(adminFile, adminContent);
console.log("SuperAdminDashboard.jsx updated");
