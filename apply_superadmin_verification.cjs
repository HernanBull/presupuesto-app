const fs = require('fs');

const adminFile = 'src/modules/superadmin/pages/SuperAdminDashboard.jsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');

// 1. Add handleToggleVerification
const suspendTarget = `  const handleToggleSuspend = async (merchant) => {`;
const verificationFunc = `  const handleToggleVerification = async (merchant) => {
    setIsActionLoading(true);
    try {
      let configObj = {};
      try { configObj = typeof merchant.config === 'string' ? JSON.parse(merchant.config) : (merchant.config || {}); } catch(e){}
      
      const newVerifiedStatus = !configObj.is_verified;
      configObj.is_verified = newVerifiedStatus;
      
      const { error } = await supabase.from('workspaces').update({ config: configObj }).eq('id', merchant.id);
      if (!error) {
        fetchData();
      } else {
        alert('Error al cambiar verificación: ' + error.message);
      }
    } catch(e) {
      alert('Error de conexión');
    }
    setIsActionLoading(false);
  };

  const handleToggleSuspend = async (merchant) => {`;
adminContent = adminContent.replace(suspendTarget, verificationFunc);


// 2. Add button in mobile view
const mobileButtonTarget = `                            <button 
                              onClick={() => handleToggleSuspend(item)}
                              disabled={isActionLoading}
                              className={\`p-2 rounded-lg border \${
                                item.status === 'Suspendido' 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              }\`}
                            >
                              {item.status === 'Suspendido' ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>`;
const mobileButtonReplacement = `                            <button 
                              onClick={() => handleToggleVerification(item)}
                              disabled={isActionLoading}
                              className={\`p-2 rounded-lg border \${
                                (() => { try { return JSON.parse(item.config || '{}').is_verified; } catch(e) { return false; } })()
                                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-white'
                              }\`}
                              title={(() => { try { return JSON.parse(item.config || '{}').is_verified; } catch(e) { return false; } })() ? "Quitar Verificación" : "Marcar como Verificada"}
                            >
                              {(() => { try { return JSON.parse(item.config || '{}').is_verified; } catch(e) { return false; } })() ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                            </button>
                            <button 
                              onClick={() => handleToggleSuspend(item)}
                              disabled={isActionLoading}
                              className={\`p-2 rounded-lg border \${
                                item.status === 'Suspendido' 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              }\`}
                            >
                              {item.status === 'Suspendido' ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>`;
adminContent = adminContent.replace(mobileButtonTarget, mobileButtonReplacement);


// 3. Add column to desktop table header
const headerTarget = `{activeTab === 'merchants' && <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Estado</th>}`;
const headerReplacement = `{activeTab === 'merchants' && <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Estado</th>}
                        {activeTab === 'merchants' && <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Verificación</th>}`;
adminContent = adminContent.replace(headerTarget, headerReplacement);


// 4. Add column to desktop table row
const rowTarget = `                          {activeTab === 'merchants' && (
                            <td className="py-4 px-4 text-sm">
                              <span className={\`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider \${
                                item.status === 'Suspendido' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }\`}>
                                {item.status || 'Activo'}
                              </span>
                            </td>
                          )}`;
const rowReplacement = `                          {activeTab === 'merchants' && (
                            <td className="py-4 px-4 text-sm">
                              <span className={\`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider \${
                                item.status === 'Suspendido' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }\`}>
                                {item.status || 'Activo'}
                              </span>
                            </td>
                          )}
                          {activeTab === 'merchants' && (
                            <td className="py-4 px-4 text-center">
                              <span className={\`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider \${
                                (() => { try { return JSON.parse(item.config || '{}').is_verified; } catch(e) { return false; } })() ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-zinc-800 text-zinc-500'
                              }\`}>
                                {(() => { try { return JSON.parse(item.config || '{}').is_verified; } catch(e) { return false; } })() ? 'Verificada' : 'No'}
                              </span>
                            </td>
                          )}`;
adminContent = adminContent.replace(rowTarget, rowReplacement);


// 5. Add action button to desktop row
const desktopActionTarget = `                                  <button 
                                    onClick={() => handleToggleSuspend(item)}
                                    disabled={isActionLoading}
                                    className={\`p-2 rounded-lg transition-colors border \${
                                      item.status === 'Suspendido' 
                                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500 hover:text-white'
                                    }\`}
                                    title={item.status === 'Suspendido' ? "Reactivar Tienda" : "Suspender Tienda (Ocultar)"}
                                  >
                                    {item.status === 'Suspendido' ? <Eye size={18} /> : <EyeOff size={18} />}
                                  </button>`;
const desktopActionReplacement = `                                  <button 
                                    onClick={() => handleToggleVerification(item)}
                                    disabled={isActionLoading}
                                    className={\`p-2 rounded-lg transition-colors border \${
                                      (() => { try { return JSON.parse(item.config || '{}').is_verified; } catch(e) { return false; } })()
                                      ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30 hover:bg-indigo-500 hover:text-white'
                                      : 'bg-zinc-800 text-zinc-400 border-white/5 hover:bg-zinc-700 hover:text-white'
                                    }\`}
                                    title={(() => { try { return JSON.parse(item.config || '{}').is_verified; } catch(e) { return false; } })() ? "Quitar Verificación" : "Marcar como Verificada"}
                                  >
                                    {(() => { try { return JSON.parse(item.config || '{}').is_verified; } catch(e) { return false; } })() ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                                  </button>
                                  <button 
                                    onClick={() => handleToggleSuspend(item)}
                                    disabled={isActionLoading}
                                    className={\`p-2 rounded-lg transition-colors border \${
                                      item.status === 'Suspendido' 
                                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500 hover:text-white'
                                    }\`}
                                    title={item.status === 'Suspendido' ? "Reactivar Tienda" : "Suspender Tienda (Ocultar)"}
                                  >
                                    {item.status === 'Suspendido' ? <Eye size={18} /> : <EyeOff size={18} />}
                                  </button>`;
adminContent = adminContent.replace(desktopActionTarget, desktopActionReplacement);


fs.writeFileSync(adminFile, adminContent);
console.log("SuperAdminDashboard.jsx updated");
