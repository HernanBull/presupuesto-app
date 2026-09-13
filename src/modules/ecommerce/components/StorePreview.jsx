import React, { useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export default function StorePreview({
  config,
  products = [],
  activePagePreview = 'home',
  previewMode = 'desktop'
}) {
  const {
    themeMode = 'light',
    primaryColor = '#7c3aed',
    typography = 'font-sans',
    baseFontSize = 'text-base',
    headingWeight = 'font-black',
    logoUrl,
    headerStyle = 'solid',
    heroUrl,
    heroLayout = 'centered',
    buttonStyle = 'rounded-full',
    cardStyle = 'elevated',
    catalogFilterStyle = 'sidebar',
    offersCountdown = true,
    discountBadgeColor = '#ef4444',
    texts = {}
  } = config;

  // Clases dinámicas derivadas
  const typoClass = typography === 'font-serif' ? 'font-serif' : typography === 'font-mono' ? 'font-mono' : 'font-sans';
  const baseBg = themeMode === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';
  const secondaryBg = themeMode === 'dark' ? 'bg-slate-800' : 'bg-slate-50';
  const cardBg = themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textColor = themeMode === 'dark' ? 'text-white' : 'text-slate-900';
  const mutedText = themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500';

  // Derivando datos reales de productos
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'Sin Categoría'));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const recentProducts = products.slice(0, 4);
  const offerProducts = products.filter(p => !!p.is_offer).slice(0, 8);

  const ProductCard = ({ product, showDiscount = false }) => {
    return (
      <div className={`flex flex-col group relative ${cardStyle === 'elevated' ? `shadow-md ${cardBg} p-2 rounded-xl` : cardStyle === 'outlined' ? `border ${cardBg} p-2 rounded-xl` : 'p-1'}`}>
        
        {/* Status Badges para Admin Preview */}
        {product.publish_status !== 'Publicado' && (
           <div className="absolute top-2 left-2 z-20 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90 border border-white/20">
             BORRADOR
           </div>
        )}
        {product.stock <= 0 && (
           <div className="absolute top-2 right-2 z-20 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90 border border-white/20">
             AGOTADO
           </div>
        )}
        
        {/* Etiqueta de Descuento (Solo en Ofertas) */}
        {showDiscount && product.is_offer && (
          <div className="absolute top-4 right-4 z-10 px-2 py-1 text-[10px] font-black text-white rounded-md shadow-sm" style={{ backgroundColor: discountBadgeColor }}>
            OFERTA
          </div>
        )}

        <div className={`w-full aspect-[4/5] mb-2 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden`}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={24} className="text-slate-400" />
          )}
        </div>
        <p className={`font-bold line-clamp-1 ${textColor} text-xs mt-1`}>{product.name}</p>
        
        {showDiscount && product.is_offer && product.discount_price ? (
          <div className="flex items-center gap-2 mt-1">
            <p className={`${headingWeight} text-sm`} style={{ color: discountBadgeColor }}>${Number(product.discount_price).toFixed(2)}</p>
            <p className={`text-[10px] line-through text-slate-400`}>${Number(product.price).toFixed(2)}</p>
          </div>
        ) : (
          <p className={`${headingWeight} text-sm mt-1`} style={{ color: primaryColor }}>${Number(product.price).toFixed(2)}</p>
        )}
      </div>
    );
  };

  return (
    <div className={`transition-all duration-500 ease-out mt-16 shadow-2xl relative overflow-hidden flex flex-col ${
      previewMode === 'mobile' ? 'w-[340px] h-[640px] rounded-[3rem] border-[10px] border-slate-800 mx-auto' : 'w-full h-full rounded-xl border border-slate-200'
    } ${baseBg}`}>
      
      <div className={`h-full w-full overflow-y-auto hide-scrollbar flex flex-col ${typoClass} ${baseFontSize} ${baseBg}`}>
        
        {/* Navbar Dinámica */}
        <div className={`flex items-center justify-between z-40 transition-all flex-shrink-0 ${
          headerStyle === 'transparent' && activePagePreview === 'home' ? 'absolute top-0 w-full bg-gradient-to-b from-black/50 to-transparent border-none' : 'relative border-b'
        } ${headerStyle === 'solid' || activePagePreview !== 'home' ? (themeMode === 'dark' ? 'border-slate-800' : 'border-slate-100') : ''} ${previewMode === 'mobile' ? 'p-4' : 'px-8 py-5'}`}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className={`${previewMode === 'mobile' ? 'h-6' : 'h-8'} object-contain`} />
          ) : (
            <span className={`${headingWeight} tracking-tighter ${headerStyle === 'transparent' && activePagePreview === 'home' ? 'text-white' : textColor} ${previewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>MI TIENDA</span>
          )}
          {previewMode === 'desktop' && (
            <div className={`hidden md:flex gap-6 font-bold ${headerStyle === 'transparent' && activePagePreview === 'home' ? 'text-white/90' : textColor}`}>
              <span className="cursor-pointer" style={{ color: activePagePreview === 'home' ? primaryColor : '' }}>{texts.nav1 || 'Inicio'}</span>
              <span className="cursor-pointer" style={{ color: activePagePreview === 'catalog' ? primaryColor : '' }}>{texts.nav2 || 'Catálogo'}</span>
              <span className="cursor-pointer" style={{ color: activePagePreview === 'offers' ? primaryColor : '' }}>{texts.nav3 || 'Ofertas'}</span>
            </div>
          )}
        </div>

        {/* CONTENIDO DINÁMICO POR PÁGINA */}
        
        {/* 1. INICIO (HOME) */}
        {activePagePreview === 'home' && (
          <>
            <div className={`relative overflow-hidden flex-shrink-0 ${previewMode === 'mobile' ? 'min-h-[300px]' : 'min-h-[400px]'} flex ${heroLayout === 'split' && previewMode === 'desktop' ? 'flex-row' : 'flex-col items-center justify-center text-center'} ${heroLayout === 'split' ? secondaryBg : 'bg-slate-900'}`}>
              {heroUrl ? (
                heroLayout === 'split' && previewMode === 'desktop' ? (
                  <div className="absolute right-0 top-0 bottom-0 w-1/2"><img src={heroUrl} alt="Cover" className="w-full h-full object-cover" /></div>
                ) : (
                  <div className="absolute inset-0 z-0"><img src={heroUrl} alt="Cover" className="w-full h-full object-cover opacity-60" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div></div>
                )
              ) : (
                <div className={`absolute inset-0 z-0 opacity-20 ${heroLayout === 'split' && previewMode === 'desktop' ? 'w-1/2 left-1/2 bg-slate-400' : 'bg-slate-400'}`}></div>
              )}
              <div className={`relative z-10 p-8 ${heroLayout === 'split' && previewMode === 'desktop' ? 'w-1/2 flex flex-col justify-center items-start text-left pl-12' : 'max-w-xl mx-auto space-y-4'}`}>
                <h1 className={`${headingWeight} leading-tight drop-shadow-sm ${previewMode === 'mobile' ? 'text-3xl' : 'text-5xl'} ${heroLayout === 'split' && previewMode === 'desktop' ? textColor : 'text-white'}`}>{texts.heroTitle}</h1>
                <p className={`mt-2 ${previewMode === 'mobile' ? 'opacity-90' : 'text-lg opacity-90'} ${heroLayout === 'split' && previewMode === 'desktop' ? mutedText : 'text-slate-200'}`}>{texts.heroSub}</p>
                <button className={`mt-6 text-white font-bold ${buttonStyle} ${previewMode === 'mobile' ? 'px-6 py-2' : 'px-8 py-3'}`} style={{ backgroundColor: primaryColor }}>{texts.heroBtn}</button>
              </div>
            </div>
            <div className={`flex-1 flex flex-col ${secondaryBg} ${previewMode === 'mobile' ? 'px-4 py-8' : 'px-8 py-12'}`}>
              <h2 className={`${headingWeight} ${textColor} mb-6 ${previewMode === 'mobile' ? 'text-xl' : 'text-3xl'}`}>{texts.sectionTitle}</h2>
              {recentProducts.length > 0 ? (
                <div className={`grid gap-4 ${previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                  {recentProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 opacity-50">
                   <p className="text-sm font-bold">No hay productos publicados aún</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* 2. CATÁLOGO */}
        {activePagePreview === 'catalog' && (
          <div className={`flex-1 flex flex-col ${secondaryBg}`}>
            <div className={`${baseBg} border-b ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'} py-6 px-6 text-center flex-shrink-0`}>
               <h1 className={`${headingWeight} text-2xl md:text-3xl`}>{texts.catalogTitle}</h1>
            </div>
            <div className={`flex flex-1 ${catalogFilterStyle === 'sidebar' && previewMode === 'desktop' ? 'flex-row' : 'flex-col'} px-4 md:px-8 py-6 gap-6`}>
               
               {/* Filtros */}
               <div className={`${catalogFilterStyle === 'sidebar' && previewMode === 'desktop' ? 'w-48 border-r pr-6' : 'w-full flex gap-2 overflow-x-auto pb-2 hide-scrollbar'} ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'} flex-shrink-0`}>
                  {catalogFilterStyle === 'sidebar' && previewMode === 'desktop' ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-bold mb-3">Categorías</h3>
                        <ul className="space-y-2 text-sm text-slate-500">
                          {categories.map((c, idx) => (
                             <li key={c} className={idx === 0 ? "font-bold text-slate-900 dark:text-white" : ""}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <>
                      {categories.map((c, idx) => (
                        <span key={c} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${idx === 0 ? 'bg-slate-200 dark:bg-slate-800' : 'border border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                          {c}
                        </span>
                      ))}
                    </>
                  )}
               </div>

               {/* Grid */}
               <div className="flex-1">
                  {products.length > 0 ? (
                    <div className={`grid gap-4 ${previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {products.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 opacity-50">
                       <p className="text-sm font-bold">Sin productos en el catálogo</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {/* 3. OFERTAS */}
        {activePagePreview === 'offers' && (
          <div className={`flex-1 flex flex-col ${secondaryBg}`}>
            <div className="bg-slate-900 text-white py-10 px-6 text-center relative overflow-hidden flex-shrink-0">
               {offersCountdown && (
                 <div className="absolute top-0 right-0 p-4">
                   <div className="bg-rose-500 px-3 py-1.5 rounded-lg font-mono text-xs font-bold animate-pulse shadow-lg flex items-center gap-1">
                     ⏳ Termina en 05:42:10
                   </div>
                 </div>
               )}
               <h1 className={`${headingWeight} text-4xl md:text-5xl drop-shadow-md text-amber-300 italic mb-2`}>{texts.offersTitle}</h1>
               <p className="opacity-90 max-w-md mx-auto text-sm">Productos con descuento. Cantidades limitadas.</p>
            </div>
            
            <div className="flex-1 px-4 md:px-8 py-8">
               {offerProducts.length > 0 ? (
                 <div className={`grid gap-5 ${previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                    {offerProducts.map(p => <ProductCard key={p.id} product={p} showDiscount={true} />)}
                 </div>
               ) : (
                 <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 opacity-50">
                    <p className="text-sm font-bold">No hay productos en oferta actualmente</p>
                 </div>
               )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
