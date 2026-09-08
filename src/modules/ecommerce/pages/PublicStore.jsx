import React, { useEffect, useState } from 'react';
import { ShoppingCart, LayoutTemplate, Image as ImageIcon } from 'lucide-react';

export default function PublicStore() {
  const [config, setConfig] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); // home, catalog, offers

  useEffect(() => {
    const loadConfig = () => {
      const saved = localStorage.getItem('storefrontConfig');
      if (saved) {
        setConfig(JSON.parse(saved));
      } else {
        setConfig({
          themeMode: 'light', primaryColor: '#7c3aed', typography: 'font-sans', baseFontSize: 'text-base', headingWeight: 'font-black',
          logoUrl: null, headerStyle: 'solid', showBanner: true, heroUrl: null, heroLayout: 'centered',
          buttonStyle: 'rounded-full', cardStyle: 'elevated', catalogFilterStyle: 'sidebar', offersCountdown: true, discountBadgeColor: '#ef4444',
          texts: {
            banner: '¡Envíos gratis en compras mayores a $100!', nav1: 'Inicio', nav2: 'Catálogo', nav3: 'Ofertas',
            heroTitle: 'Descubre la nueva colección', heroSub: 'Productos exclusivos diseñados para ti.', heroBtn: 'Comprar Ahora',
            sectionTitle: 'Novedades', catalogTitle: 'Todo nuestro catálogo', offersTitle: 'Ofertas Flash', footerText: '© 2026 Todos los derechos reservados.'
          }
        });
      }
    };
    loadConfig();
    window.addEventListener('storage', loadConfig);
    return () => window.removeEventListener('storage', loadConfig);
  }, []);

  if (!config) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold">Cargando tienda...</div>;

  const {
    themeMode, primaryColor, typography, baseFontSize, headingWeight,
    logoUrl, headerStyle, showBanner, heroUrl, heroLayout,
    buttonStyle, cardStyle, catalogFilterStyle, offersCountdown, discountBadgeColor, texts
  } = config;

  // Clases dinámicas
  const typoClass = typography === 'font-serif' ? 'font-serif' : typography === 'font-mono' ? 'font-mono' : 'font-sans';
  const baseBg = themeMode === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';
  const secondaryBg = themeMode === 'dark' ? 'bg-slate-800' : 'bg-slate-50';
  const cardBg = themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textColor = themeMode === 'dark' ? 'text-white' : 'text-slate-900';
  const mutedText = themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen w-full flex flex-col ${typoClass} ${baseFontSize} ${baseBg}`}>
      
      {/* Banner */}
      {showBanner && (
        <div className="w-full text-center text-white font-bold py-2.5 px-6 z-50 relative shadow-sm" style={{ backgroundColor: primaryColor }}>
          {texts.banner}
        </div>
      )}

      {/* Navbar */}
      <div className={`flex items-center justify-between z-40 transition-all px-6 md:px-16 py-5 ${
        headerStyle === 'transparent' && currentPage === 'home' ? 'absolute w-full bg-gradient-to-b from-black/60 to-transparent border-none' : 'relative border-b'
      } ${headerStyle === 'solid' || currentPage !== 'home' ? (themeMode === 'dark' ? 'border-slate-800' : 'border-slate-100') : ''}`}
        style={headerStyle === 'transparent' && showBanner && currentPage === 'home' ? { top: '44px' } : {}}
      >
        {logoUrl ? (
          <img onClick={() => setCurrentPage('home')} src={logoUrl} alt="Logo" className="h-8 md:h-10 object-contain cursor-pointer" />
        ) : (
          <span onClick={() => setCurrentPage('home')} className={`${headingWeight} tracking-tighter cursor-pointer ${headerStyle === 'transparent' && currentPage === 'home' ? 'text-white' : textColor} text-2xl md:text-3xl`}>
            MI TIENDA
          </span>
        )}
        
        <div className={`hidden md:flex gap-10 font-bold ${headerStyle === 'transparent' && currentPage === 'home' ? 'text-white/90' : textColor}`}>
          <span onClick={() => setCurrentPage('home')} className="cursor-pointer transition-colors" style={{ color: currentPage === 'home' && headerStyle !== 'transparent' ? primaryColor : (currentPage === 'home' && headerStyle === 'transparent' ? 'white' : '') }}>{texts.nav1}</span>
          <span onClick={() => setCurrentPage('catalog')} className="hover:opacity-70 cursor-pointer transition-colors" style={{ color: currentPage === 'catalog' ? primaryColor : '' }}>{texts.nav2}</span>
          <span onClick={() => setCurrentPage('offers')} className="hover:opacity-70 cursor-pointer transition-colors" style={{ color: currentPage === 'offers' ? primaryColor : '' }}>{texts.nav3}</span>
        </div>
        
        <div className="relative cursor-pointer hover:scale-110 transition-transform">
          <ShoppingCart size={28} className={headerStyle === 'transparent' && currentPage === 'home' ? 'text-white' : textColor} />
          <span className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: primaryColor }}>2</span>
        </div>
      </div>

      {/* PÁGINAS */}
      
      {/* 1. INICIO */}
      {currentPage === 'home' && (
        <>
          {/* Hero Section */}
          <div className={`relative overflow-hidden min-h-[500px] md:min-h-[700px] flex ${heroLayout === 'split' ? 'flex-col md:flex-row' : 'flex-col items-center justify-center text-center'} ${heroLayout === 'split' ? secondaryBg : 'bg-slate-900'}`}>
            {heroUrl ? (
                heroLayout === 'split' ? (
                  <div className="md:absolute right-0 top-0 bottom-0 w-full md:w-1/2 h-[300px] md:h-full order-1 md:order-2">
                    <img src={heroUrl} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="absolute inset-0 z-0">
                    <img src={heroUrl} alt="Cover" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                  </div>
                )
            ) : (
                <div className={`absolute inset-0 z-0 opacity-20 ${heroLayout === 'split' ? 'md:w-1/2 md:left-1/2 bg-slate-400' : 'bg-slate-400'}`}></div>
            )}
            
            <div className={`relative z-10 p-8 md:p-16 order-2 md:order-1 ${heroLayout === 'split' ? 'w-full md:w-1/2 flex flex-col justify-center items-start text-left' : 'max-w-4xl mx-auto space-y-6'}`}>
              <h1 className={`${headingWeight} leading-tight drop-shadow-sm text-4xl md:text-6xl lg:text-7xl ${heroLayout === 'split' ? textColor : 'text-white'}`}>{texts.heroTitle}</h1>
              <p className={`mt-6 text-lg md:text-xl opacity-90 max-w-2xl ${heroLayout === 'split' ? mutedText : 'text-slate-200'}`}>{texts.heroSub}</p>
              <button className={`mt-10 text-white font-bold transition-all hover:scale-105 shadow-xl hover:shadow-2xl ${buttonStyle} px-12 py-5 text-lg`} style={{ backgroundColor: primaryColor }}>{texts.heroBtn}</button>
            </div>
          </div>

          {/* Featured Section */}
          <div className={`flex-1 ${secondaryBg} px-6 md:px-16 py-20`}>
            <div className="max-w-7xl mx-auto w-full">
              <h2 className={`${headingWeight} ${textColor} mb-12 text-3xl md:text-5xl`}>{texts.sectionTitle}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className={`flex flex-col group cursor-pointer overflow-hidden transition-all duration-300 ${cardStyle === 'elevated' ? `shadow-lg hover:shadow-2xl ${cardBg} p-4 rounded-3xl -translate-y-0 hover:-translate-y-2` : cardStyle === 'outlined' ? `border-2 ${cardBg} p-4 rounded-3xl hover:border-violet-400` : 'p-2 bg-transparent'}`}>
                    <div className={`w-full aspect-square mb-6 flex items-center justify-center relative overflow-hidden ${cardStyle === 'minimalist' ? 'bg-slate-200 dark:bg-slate-800 rounded-3xl' : 'bg-slate-100 dark:bg-slate-900 rounded-2xl'}`}>
                      <ImageIcon size={48} className="text-slate-300 dark:text-slate-600 transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <button className={`py-3 px-8 text-sm font-bold text-white shadow-2xl transition-transform hover:scale-105 ${buttonStyle}`} style={{ backgroundColor: primaryColor }}>Ver Detalles</button>
                      </div>
                    </div>
                    <div className="px-2">
                      <p className={`font-bold line-clamp-1 ${textColor} text-base md:text-lg`}>Producto Destacado {i}</p>
                      <p className={`${headingWeight} mt-2 text-xl md:text-2xl`} style={{ color: primaryColor }}>$49.99</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. CATÁLOGO */}
      {currentPage === 'catalog' && (
        <div className={`flex-1 flex flex-col ${secondaryBg}`}>
          <div className={`${baseBg} border-b ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'} py-12 px-6 md:px-16 text-center shadow-sm`}>
             <h1 className={`${headingWeight} text-4xl md:text-5xl`}>{texts.catalogTitle}</h1>
          </div>
          
          <div className={`max-w-7xl mx-auto w-full flex flex-1 ${catalogFilterStyle === 'sidebar' ? 'flex-col md:flex-row' : 'flex-col'} px-6 md:px-16 py-12 gap-10`}>
             
             {/* Filtros */}
             <div className={`${catalogFilterStyle === 'sidebar' ? 'w-full md:w-64 border-b md:border-b-0 md:border-r pb-6 md:pb-0 md:pr-10' : 'w-full flex gap-3 overflow-x-auto pb-4'} ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                {catalogFilterStyle === 'sidebar' ? (
                  <div className="space-y-10">
                    <div>
                      <h3 className="font-bold text-lg mb-4">Categorías</h3>
                      <ul className="space-y-3 text-base text-slate-500">
                        <li className="font-bold cursor-pointer" style={{ color: primaryColor }}>Todas (120)</li>
                        <li className="hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors">Ropa (45)</li>
                        <li className="hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors">Accesorios (30)</li>
                        <li className="hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors">Calzado (25)</li>
                        <li className="hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors">Hogar (20)</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-4">Rango de Precio</h3>
                      <input type="range" className="w-full accent-violet-600" />
                      <div className="flex justify-between mt-2 text-sm font-bold text-slate-400">
                        <span>$0</span>
                        <span>$500+</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <button className="px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap text-white shadow-md transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>Todas las Categorías</button>
                    <button className={`px-6 py-2.5 border rounded-full text-sm font-bold whitespace-nowrap transition-colors hover:border-violet-500 ${themeMode === 'dark' ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-600'}`}>Ropa (45)</button>
                    <button className={`px-6 py-2.5 border rounded-full text-sm font-bold whitespace-nowrap transition-colors hover:border-violet-500 ${themeMode === 'dark' ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-600'}`}>Accesorios (30)</button>
                    <button className={`px-6 py-2.5 border rounded-full text-sm font-bold whitespace-nowrap transition-colors hover:border-violet-500 ml-auto ${themeMode === 'dark' ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-600'}`}>Ordenar por: Precio</button>
                  </>
                )}
             </div>

             {/* Grid */}
             <div className="flex-1">
                <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3`}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                    <div key={i} className={`flex flex-col group cursor-pointer overflow-hidden transition-all duration-300 ${cardStyle === 'elevated' ? `shadow-md hover:shadow-xl ${cardBg} p-3 rounded-2xl` : cardStyle === 'outlined' ? `border-2 ${cardBg} p-3 rounded-2xl hover:border-violet-400` : 'p-2 bg-transparent'}`}>
                      <div className={`w-full aspect-[4/5] mb-4 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden`}>
                        <ImageIcon size={32} className="text-slate-400 transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                           <button className={`py-2 px-6 text-sm font-bold text-white shadow-lg ${buttonStyle}`} style={{ backgroundColor: primaryColor }}>Ver</button>
                        </div>
                      </div>
                      <div className="px-1">
                        <p className={`font-bold line-clamp-1 ${textColor} text-base`}>Producto Catálogo {i}</p>
                        <p className={`${headingWeight} text-lg mt-1`} style={{ color: primaryColor }}>$39.99</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Paginación */}
                <div className="flex justify-center mt-12 gap-2">
                  <button className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-white shadow-md`} style={{ backgroundColor: primaryColor }}>1</button>
                  <button className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold border ${themeMode === 'dark' ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}>2</button>
                  <button className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold border ${themeMode === 'dark' ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}>3</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 3. OFERTAS */}
      {currentPage === 'offers' && (
        <div className={`flex-1 flex flex-col ${secondaryBg}`}>
          
          <div className="bg-slate-900 text-white py-16 md:py-24 px-6 text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 z-0"></div>
             
             <div className="relative z-10 max-w-3xl mx-auto">
               {offersCountdown && (
                 <div className="inline-flex flex-col items-center mb-8">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Las ofertas terminan en</span>
                   <div className="flex gap-4">
                     <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 flex flex-col items-center"><span className="text-3xl font-black text-white">05</span><span className="text-[10px] uppercase text-white/50">Horas</span></div>
                     <span className="text-3xl font-black text-white/50 py-2">:</span>
                     <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 flex flex-col items-center"><span className="text-3xl font-black text-white">42</span><span className="text-[10px] uppercase text-white/50">Minutos</span></div>
                     <span className="text-3xl font-black text-white/50 py-2">:</span>
                     <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 flex flex-col items-center"><span className="text-3xl font-black text-rose-400 animate-pulse">10</span><span className="text-[10px] uppercase text-white/50">Segundos</span></div>
                   </div>
                 </div>
               )}
               <h1 className={`${headingWeight} text-5xl md:text-7xl drop-shadow-2xl text-amber-300 mb-6 italic`}>{texts.offersTitle}</h1>
               <p className="opacity-90 text-lg md:text-xl font-medium">Hasta 70% de descuento en artículos seleccionados. ¡No te quedes sin el tuyo, cantidades limitadas!</p>
             </div>
          </div>
          
          <div className="flex-1 px-6 md:px-16 py-16 max-w-7xl mx-auto w-full">
             <div className={`grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className={`flex flex-col group relative cursor-pointer ${cardStyle === 'elevated' ? `shadow-lg hover:shadow-2xl ${cardBg} p-3 rounded-2xl -translate-y-0 hover:-translate-y-2 transition-all duration-300` : cardStyle === 'outlined' ? `border-2 ${cardBg} p-3 rounded-2xl hover:border-rose-400 transition-colors` : 'p-2'}`}>
                    
                    {/* Etiqueta de Descuento */}
                    <div className="absolute top-6 right-6 z-10 px-3 py-1.5 text-xs font-black text-white rounded-lg shadow-lg rotate-3" style={{ backgroundColor: discountBadgeColor }}>
                      -30% OFF
                    </div>

                    <div className={`w-full aspect-square mb-4 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden`}>
                      <ImageIcon size={40} className="text-slate-400 transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                         <button className={`py-3 px-8 text-sm font-bold text-white shadow-2xl transition-transform hover:scale-105 ${buttonStyle}`} style={{ backgroundColor: discountBadgeColor }}>Aprovechar Oferta</button>
                      </div>
                    </div>
                    
                    <div className="px-2">
                      <p className={`font-bold line-clamp-1 ${textColor} text-base`}>Súper Oferta Exclusiva {i}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className={`${headingWeight} text-2xl`} style={{ color: discountBadgeColor }}>$19.99</p>
                        <p className={`text-sm font-bold line-through text-slate-400`}>$29.99</p>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Footer (Siempre Visible) */}
      <div className="bg-slate-950 p-16 flex flex-col items-center text-center gap-8 text-white mt-auto border-t border-slate-900">
          {logoUrl ? <img src={logoUrl} alt="Store Logo" className="h-10 object-contain grayscale opacity-50" /> : <span className={`font-black text-2xl opacity-50 tracking-widest ${headingWeight}`}>MI TIENDA</span>}
          
          <div className="flex gap-8">
            <div className="p-4 bg-slate-900 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all hover:scale-110 cursor-pointer"><LayoutTemplate size={24} /></div>
            <div className="p-4 bg-slate-900 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all hover:scale-110 cursor-pointer"><LayoutTemplate size={24} /></div>
            <div className="p-4 bg-slate-900 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all hover:scale-110 cursor-pointer"><LayoutTemplate size={24} /></div>
          </div>
          
          <div className="w-32 h-px bg-slate-800 my-4"></div>
          
          <p className="text-sm text-slate-500 font-medium tracking-wide">{texts.footerText}</p>
      </div>

    </div>
  );
}
