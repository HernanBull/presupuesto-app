const fs = require('fs');

// --- MarketplaceDirectory.jsx ---
const directoryFile = 'src/modules/ecommerce/pages/MarketplaceDirectory.jsx';
let directoryContent = fs.readFileSync(directoryFile, 'utf8');

const importLucideDirectoryTarget = `CheckCircle } from 'lucide-react';`;
const importLucideDirectoryReplacement = `CheckCircle, ShieldCheck } from 'lucide-react';`;
directoryContent = directoryContent.replace(importLucideDirectoryTarget, importLucideDirectoryReplacement);

const cardTarget = `<div className="flex items-start justify-between gap-2">
                      <h4 className="text-white font-bold text-lg line-clamp-1 group-hover:text-amber-400 transition-colors">{store.name}</h4>
                    </div>`;
const cardReplacement = `<div className="flex items-start justify-between gap-2">
                      <h4 className="text-white font-bold text-lg line-clamp-1 group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                        {store.name}
                        {store.config?.is_verified && (
                          <div title="Comercio Verificado" className="inline-flex">
                            <ShieldCheck size={16} className="text-blue-500 fill-blue-500/20" />
                          </div>
                        )}
                      </h4>
                    </div>`;
// This could be present twice (desktop grid and mobile list maybe? Or just once?)
directoryContent = directoryContent.split(cardTarget).join(cardReplacement);

fs.writeFileSync(directoryFile, directoryContent);
console.log("MarketplaceDirectory.jsx updated");


// --- PublicStore.jsx ---
const storeFile = 'src/modules/ecommerce/pages/PublicStore.jsx';
let storeContent = fs.readFileSync(storeFile, 'utf8');

const navTarget = `<span className={\`text-2xl font-black tracking-tight text-white\`}>
              {config.business_name || 'MI TIENDA'}
            </span>`;
const navReplacement = `<span className={\`text-2xl font-black tracking-tight text-white flex items-center gap-2\`}>
              {config.business_name || 'MI TIENDA'}
              {config.is_verified && (
                <div title="Comercio Verificado" className="inline-flex mt-1">
                  <ShieldCheck size={20} className="text-blue-500 fill-blue-500/20" />
                </div>
              )}
            </span>`;
storeContent = storeContent.replace(navTarget, navReplacement);

const heroTarget = `<h1 className="text-lg md:text-2xl font-black text-white tracking-tight flex items-center gap-2 line-clamp-1">
                            {config.business_name || 'MI TIENDA'}
                          </h1>`;
const heroReplacement = `<h1 className="text-lg md:text-2xl font-black text-white tracking-tight flex items-center gap-2 line-clamp-1">
                            {config.business_name || 'MI TIENDA'}
                            {config.is_verified && (
                              <div title="Comercio Verificado" className="inline-flex">
                                <ShieldCheck size={22} className="text-blue-500 fill-blue-500/20" />
                              </div>
                            )}
                          </h1>`;
storeContent = storeContent.replace(heroTarget, heroReplacement);

fs.writeFileSync(storeFile, storeContent);
console.log("PublicStore.jsx updated");
