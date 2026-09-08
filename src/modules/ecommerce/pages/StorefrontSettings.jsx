import React, { useState, useRef, useEffect } from 'react';
import { LayoutTemplate, Image as ImageIcon, Type, Save, Globe, UploadCloud, X, ShoppingCart, Smartphone, Monitor, MousePointer2, ImagePlus, Link, Palette, LayoutGrid, Type as TypeIcon, AlignLeft, Tag, Filter } from 'lucide-react';

export default function StorefrontSettings() {
  const savedConfig = JSON.parse(localStorage.getItem('storefrontConfig') || '{}');

  // 1. Colores y Tema
  const [themeMode, setThemeMode] = useState(savedConfig.themeMode || 'light');
  const [primaryColor, setPrimaryColor] = useState(savedConfig.primaryColor || '#7c3aed');
  
  // 2. Textos y Tipografía
  const [typography, setTypography] = useState(savedConfig.typography || 'font-sans');
  const [baseFontSize, setBaseFontSize] = useState(savedConfig.baseFontSize || 'text-base'); 
  const [headingWeight, setHeadingWeight] = useState(savedConfig.headingWeight || 'font-black'); 
  
  // 3. Cabecera
  const [logoUrl, setLogoUrl] = useState(savedConfig.logoUrl || null);
  const [headerStyle, setHeaderStyle] = useState(savedConfig.headerStyle || 'solid'); 
  const [showBanner, setShowBanner] = useState(savedConfig.showBanner !== undefined ? savedConfig.showBanner : true);
  
  // 4. Estructuras (Hero, Catálogo, Ofertas)
  const [heroUrl, setHeroUrl] = useState(savedConfig.heroUrl || null);
  const [heroLayout, setHeroLayout] = useState(savedConfig.heroLayout || 'centered'); 
  const [buttonStyle, setButtonStyle] = useState(savedConfig.buttonStyle || 'rounded-full'); 
  const [cardStyle, setCardStyle] = useState(savedConfig.cardStyle || 'elevated'); 
  
  // Novedades para Catálogo y Ofertas
  const [catalogFilterStyle, setCatalogFilterStyle] = useState(savedConfig.catalogFilterStyle || 'sidebar'); // sidebar, top
  const [offersCountdown, setOffersCountdown] = useState(savedConfig.offersCountdown !== undefined ? savedConfig.offersCountdown : true);
  const [discountBadgeColor, setDiscountBadgeColor] = useState(savedConfig.discountBadgeColor || '#ef4444'); // Rojo por defecto
  
  // 5. Contenido Textual
  const [texts, setTexts] = useState(savedConfig.texts || {
    banner: '¡Envíos gratis en compras mayores a $100!',
    nav1: 'Inicio',
    nav2: 'Catálogo',
    nav3: 'Ofertas',
    heroTitle: 'Descubre la nueva colección',
    heroSub: 'Productos exclusivos diseñados para ti.',
    heroBtn: 'Comprar Ahora',
    sectionTitle: 'Novedades',
    catalogTitle: 'Todo nuestro catálogo',
    offersTitle: 'Ofertas Flash',
    footerText: '© 2026 Todos los derechos reservados.'
  });

  const [socials, setSocials] = useState(savedConfig.socials || { instagram: true, whatsapp: true, facebook: false });

  // UI State interno (No se guarda en config de cliente)
  const [previewMode, setPreviewMode] = useState('desktop'); 
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pages'); // pages (nueva), typography, content, theme, header
  const [activePagePreview, setActivePagePreview] = useState('home'); // home, catalog, offers

  const logoInputRef = useRef(null);
  const heroInputRef = useRef(null);

  const handleFileUpload = (e, setUrl) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleTextChange = (key, value) => {
    setTexts(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    const configToSave = {
      themeMode, primaryColor, typography, baseFontSize, headingWeight,
      logoUrl, headerStyle, showBanner, heroUrl, heroLayout,
      buttonStyle, cardStyle, catalogFilterStyle, offersCountdown, discountBadgeColor, texts, socials
    };
    localStorage.setItem('storefrontConfig', JSON.stringify(configToSave));

    setTimeout(() => {
      setIsSaving(false);
      alert('Tema actualizado. Haz clic en "Visitar Tienda" para probar la navegación.');
    }, 800);
  };

  // Clases dinámicas derivadas
  const typoClass = typography === 'font-serif' ? 'font-serif' : typography === 'font-mono' ? 'font-mono' : 'font-sans';
  const baseBg = themeMode === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';
  const secondaryBg = themeMode === 'dark' ? 'bg-slate-800' : 'bg-slate-50';
  const cardBg = themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textColor = themeMode === 'dark' ? 'text-white' : 'text-slate-900';
  const mutedText = themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="p-6 md:p-8 max-w-[1800px] mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Constructor Visual <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Multi-Página</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Modifica el inicio, el catálogo y las ofertas.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.open('/ecommerce/live', '_blank')} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Globe size={18} />
            Visitar Tienda
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg">
            {isSaving ? 'Guardando...' : 'Publicar Tienda'}
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 h-[800px]">
        {/* PANEL IZQUIERDO: CONTROLES */}
        <div className="w-full xl:w-[450px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-shrink-0">
          
          <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
            <button onClick={() => setActiveTab('pages')} className={`flex items-center gap-2 px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'pages' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              <LayoutGrid size={14} /> Páginas
            </button>
            <button onClick={() => setActiveTab('content')} className={`flex items-center gap-2 px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'content' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              <AlignLeft size={14} /> Textos
            </button>
            <button onClick={() => setActiveTab('typography')} className={`flex items-center gap-2 px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'typography' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              <TypeIcon size={14} /> Estilos
            </button>
            <button onClick={() => setActiveTab('theme')} className={`flex items-center gap-2 px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'theme' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              <Palette size={14} /> Colores
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* TABS CONTENIDO: PÁGINAS Y ESTRUCTURA */}
            {activeTab === 'pages' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-xl border border-violet-100 dark:border-violet-900/50 mb-4">
                  <p className="text-xs text-violet-700 dark:text-violet-400 font-medium leading-relaxed">
                    Personaliza la estructura específica para la página de Inicio, el Catálogo completo y la sección de Ofertas.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-violet-500 flex items-center gap-2"><ImagePlus size={14} /> Diseño de Inicio (Hero)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setHeroLayout('centered')} className={`p-3 border-2 rounded-xl flex flex-col items-center gap-3 transition-all ${heroLayout === 'centered' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Centrado Clásico</span>
                    </button>
                    <button onClick={() => setHeroLayout('split')} className={`p-3 border-2 rounded-xl flex flex-col items-center gap-3 transition-all ${heroLayout === 'split' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Lado a Lado</span>
                    </button>
                  </div>
                  <input type="file" ref={heroInputRef} onChange={(e) => handleFileUpload(e, setHeroUrl)} accept="image/*" className="hidden" />
                  <button onClick={() => heroInputRef.current.click()} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 rounded-xl flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-950 text-slate-600 transition-colors text-xs font-bold">
                    {heroUrl ? 'Cambiar Imagen de Portada' : 'Subir Imagen de Portada'}
                  </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-black uppercase tracking-widest text-violet-500 flex items-center gap-2"><Filter size={14} /> Diseño de Catálogo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatalogFilterStyle('sidebar')} className={`p-3 border-2 rounded-xl flex flex-col items-center gap-3 transition-all ${catalogFilterStyle === 'sidebar' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Filtros Laterales</span>
                    </button>
                    <button onClick={() => setCatalogFilterStyle('top')} className={`p-3 border-2 rounded-xl flex flex-col items-center gap-3 transition-all ${catalogFilterStyle === 'top' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Filtros Superiores</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-black uppercase tracking-widest text-violet-500 flex items-center gap-2"><Tag size={14} /> Diseño de Ofertas</label>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mostrar Reloj Contador (Flash Sale)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={offersCountdown} onChange={() => setOffersCountdown(!offersCountdown)} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 flex-1">Color de Etiqueta (Descuento)</span>
                    <input type="color" value={discountBadgeColor} onChange={(e) => setDiscountBadgeColor(e.target.value)} className="h-8 w-16 rounded cursor-pointer border border-slate-200 dark:border-slate-700" />
                  </div>
                </div>

              </div>
            )}

            {/* TEXTOS (AMPLIADO) */}
            {activeTab === 'content' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Menú Superior</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={texts.nav1} onChange={(e) => handleTextChange('nav1', e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-center dark:text-white" />
                    <input type="text" value={texts.nav2} onChange={(e) => handleTextChange('nav2', e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-center dark:text-white" />
                    <input type="text" value={texts.nav3} onChange={(e) => handleTextChange('nav3', e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-center dark:text-white" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Textos Inicio</label>
                  <div className="space-y-3">
                    <input type="text" value={texts.heroTitle} onChange={(e) => handleTextChange('heroTitle', e.target.value)} placeholder="Título Principal" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white" />
                    <textarea rows="2" value={texts.heroSub} onChange={(e) => handleTextChange('heroSub', e.target.value)} placeholder="Subtexto descriptivo" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white resize-none" />
                    <input type="text" value={texts.sectionTitle} onChange={(e) => handleTextChange('sectionTitle', e.target.value)} placeholder="Ej: Novedades" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Títulos de Páginas</label>
                  <div className="space-y-3">
                    <input type="text" value={texts.catalogTitle} onChange={(e) => handleTextChange('catalogTitle', e.target.value)} placeholder="Ej: Catálogo Completo" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white" />
                    <input type="text" value={texts.offersTitle} onChange={(e) => handleTextChange('offersTitle', e.target.value)} placeholder="Ej: Ofertas Flash" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* ESTILOS (BOTONES, TARJETAS, FUENTES) */}
            {activeTab === 'typography' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Fuente / Tipo de Letra</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setTypography('font-sans')} className={`py-2 text-xs font-bold border-2 rounded-lg ${typography === 'font-sans' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 dark:border-slate-700'}`}>Moderna</button>
                    <button onClick={() => setTypography('font-serif')} className={`py-2 text-xs font-serif border-2 rounded-lg ${typography === 'font-serif' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 dark:border-slate-700'}`}>Clásica</button>
                    <button onClick={() => setTypography('font-mono')} className={`py-2 text-xs font-mono border-2 rounded-lg ${typography === 'font-mono' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 dark:border-slate-700'}`}>Técnica</button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Forma de Botones</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setButtonStyle('rounded-none')} className={`py-2 px-1 text-[11px] font-black tracking-wider uppercase border-2 rounded-none ${buttonStyle === 'rounded-none' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 dark:border-slate-700'}`}>Cuadrado</button>
                    <button onClick={() => setButtonStyle('rounded-xl')} className={`py-2 px-1 text-[11px] font-black tracking-wider uppercase border-2 rounded-xl ${buttonStyle === 'rounded-xl' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 dark:border-slate-700'}`}>Suave</button>
                    <button onClick={() => setButtonStyle('rounded-full')} className={`py-2 px-1 text-[11px] font-black tracking-wider uppercase border-2 rounded-full ${buttonStyle === 'rounded-full' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 dark:border-slate-700'}`}>Píldora</button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Estilo de Tarjetas de Producto</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setCardStyle('elevated')} className={`p-2 border-2 rounded-xl transition-all ${cardStyle === 'elevated' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block text-center">Sombra</span>
                    </button>
                    <button onClick={() => setCardStyle('outlined')} className={`p-2 border-2 rounded-xl transition-all ${cardStyle === 'outlined' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block text-center">Con Borde</span>
                    </button>
                    <button onClick={() => setCardStyle('minimalist')} className={`p-2 border-2 rounded-xl transition-all ${cardStyle === 'minimalist' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block text-center">Minimalista</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* COLORES Y LOGO */}
            {activeTab === 'theme' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Modo de Color Base</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setThemeMode('light')} className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${themeMode === 'light' ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}`}>
                      <span className="text-xs font-bold text-slate-700">Claro (Light)</span>
                    </button>
                    <button onClick={() => setThemeMode('dark')} className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${themeMode === 'dark' ? 'border-violet-500 bg-violet-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Oscuro (Dark)</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Color Primario (Acentos)</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-14 w-14 rounded-xl cursor-pointer border-2 border-white dark:border-slate-800 shadow-sm appearance-none bg-transparent" />
                    <input type="text" value={primaryColor.toUpperCase()} onChange={(e) => setPrimaryColor(e.target.value)} className="bg-transparent font-mono text-sm font-bold focus:outline-none dark:text-white uppercase flex-1 px-2" />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Logotipo</label>
                  <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, setLogoUrl)} accept="image/*" className="hidden" />
                  <button onClick={() => logoInputRef.current.click()} className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 rounded-xl flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-950 text-slate-600 transition-colors text-xs font-bold">
                    {logoUrl ? 'Cambiar Logo' : 'Subir Logotipo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: VISTA PREVIA MULTI-PÁGINA */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 rounded-2xl p-4 flex flex-col items-center justify-start border border-slate-200 dark:border-slate-800 relative overflow-hidden h-full">
          
          {/* Top Controls: Page Selector & Device Toggle */}
          <div className="absolute top-4 inset-x-0 z-50 flex justify-between px-8">
            {/* Page Navigator */}
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-1.5 rounded-full border border-slate-200 dark:border-slate-700 flex gap-1 shadow-md">
              <button onClick={() => setActivePagePreview('home')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${activePagePreview === 'home' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Inicio</button>
              <button onClick={() => setActivePagePreview('catalog')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${activePagePreview === 'catalog' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Catálogo</button>
              <button onClick={() => setActivePagePreview('offers')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${activePagePreview === 'offers' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Ofertas</button>
            </div>

            {/* Device Toggle */}
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-2 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 flex gap-1 shadow-md">
              <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-full transition-colors ${previewMode === 'mobile' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}><Smartphone size={16} /></button>
              <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-full transition-colors ${previewMode === 'desktop' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}><Monitor size={16} /></button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className={`transition-all duration-500 ease-out mt-16 shadow-2xl relative overflow-hidden flex flex-col ${
            previewMode === 'mobile' ? 'w-[340px] h-[640px] rounded-[3rem] border-[10px] border-slate-800' : 'w-full h-full rounded-xl border border-slate-200'
          } ${baseBg}`}>
            
            <div className={`h-full w-full overflow-y-auto hide-scrollbar flex flex-col ${typoClass} ${baseFontSize} ${baseBg}`}>
              
              {/* Navbar Dinámica - Común para todas las páginas */}
              <div className={`flex items-center justify-between z-40 transition-all ${
                headerStyle === 'transparent' && activePagePreview === 'home' ? 'absolute top-0 w-full bg-gradient-to-b from-black/50 to-transparent border-none' : 'relative border-b'
              } ${headerStyle === 'solid' || activePagePreview !== 'home' ? (themeMode === 'dark' ? 'border-slate-800' : 'border-slate-100') : ''} ${previewMode === 'mobile' ? 'p-4' : 'px-8 py-5'}`}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className={`${previewMode === 'mobile' ? 'h-6' : 'h-8'} object-contain`} />
                ) : (
                  <span className={`${headingWeight} tracking-tighter ${headerStyle === 'transparent' && activePagePreview === 'home' ? 'text-white' : textColor} ${previewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>MI TIENDA</span>
                )}
                {previewMode === 'desktop' && (
                  <div className={`hidden md:flex gap-6 font-bold ${headerStyle === 'transparent' && activePagePreview === 'home' ? 'text-white/90' : textColor}`}>
                    <span onClick={() => setActivePagePreview('home')} className="cursor-pointer" style={{ color: activePagePreview === 'home' ? primaryColor : '' }}>{texts.nav1}</span>
                    <span onClick={() => setActivePagePreview('catalog')} className="cursor-pointer" style={{ color: activePagePreview === 'catalog' ? primaryColor : '' }}>{texts.nav2}</span>
                    <span onClick={() => setActivePagePreview('offers')} className="cursor-pointer" style={{ color: activePagePreview === 'offers' ? primaryColor : '' }}>{texts.nav3}</span>
                  </div>
                )}
              </div>

              {/* CONTENIDO DINÁMICO POR PÁGINA */}
              
              {/* 1. INICIO (HOME) */}
              {activePagePreview === 'home' && (
                <>
                  <div className={`relative overflow-hidden ${previewMode === 'mobile' ? 'min-h-[300px]' : 'min-h-[400px]'} flex ${heroLayout === 'split' && previewMode === 'desktop' ? 'flex-row' : 'flex-col items-center justify-center text-center'} ${heroLayout === 'split' ? secondaryBg : 'bg-slate-900'}`}>
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
                  <div className={`flex-1 ${secondaryBg} ${previewMode === 'mobile' ? 'px-4 py-8' : 'px-8 py-12'}`}>
                    <h2 className={`${headingWeight} ${textColor} mb-6 ${previewMode === 'mobile' ? 'text-xl' : 'text-3xl'}`}>{texts.sectionTitle}</h2>
                    <div className={`grid gap-4 ${previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`flex flex-col group ${cardStyle === 'elevated' ? `shadow-md ${cardBg} p-2 rounded-xl` : cardStyle === 'outlined' ? `border ${cardBg} p-2 rounded-xl` : 'p-1'}`}>
                          <div className={`w-full aspect-square mb-2 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center`}>
                            <ImageIcon size={24} className="text-slate-400" />
                          </div>
                          <p className={`font-bold line-clamp-1 ${textColor} text-xs`}>Producto Novedad {i}</p>
                          <p className={`${headingWeight} text-sm`} style={{ color: primaryColor }}>$29.99</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 2. CATÁLOGO */}
              {activePagePreview === 'catalog' && (
                <div className={`flex-1 flex flex-col ${secondaryBg}`}>
                  <div className={`${baseBg} border-b ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'} py-6 px-6 text-center`}>
                     <h1 className={`${headingWeight} text-2xl md:text-3xl`}>{texts.catalogTitle}</h1>
                  </div>
                  <div className={`flex flex-1 ${catalogFilterStyle === 'sidebar' && previewMode === 'desktop' ? 'flex-row' : 'flex-col'} px-4 md:px-8 py-6 gap-6`}>
                     
                     {/* Filtros */}
                     <div className={`${catalogFilterStyle === 'sidebar' && previewMode === 'desktop' ? 'w-48 border-r pr-6' : 'w-full flex gap-2 overflow-x-auto pb-2'} ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                        {catalogFilterStyle === 'sidebar' && previewMode === 'desktop' ? (
                          <div className="space-y-6">
                            <div>
                              <h3 className="font-bold mb-2">Categorías</h3>
                              <ul className="space-y-2 text-sm text-slate-500">
                                <li className="font-bold text-slate-900 dark:text-white">Todas (120)</li>
                                <li>Ropa (45)</li>
                                <li>Accesorios (30)</li>
                              </ul>
                            </div>
                            <div>
                              <h3 className="font-bold mb-2">Precio</h3>
                              <input type="range" className="w-full" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-full text-xs font-bold whitespace-nowrap">Todas</span>
                            <span className="px-4 py-1.5 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-bold whitespace-nowrap text-slate-500">Ropa</span>
                            <span className="px-4 py-1.5 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-bold whitespace-nowrap text-slate-500">Precio: Menor a Mayor</span>
                          </>
                        )}
                     </div>

                     {/* Grid */}
                     <div className="flex-1">
                        <div className={`grid gap-4 ${previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className={`flex flex-col group ${cardStyle === 'elevated' ? `shadow-md ${cardBg} p-2 rounded-xl` : cardStyle === 'outlined' ? `border ${cardBg} p-2 rounded-xl` : 'p-1'}`}>
                              <div className={`w-full aspect-[3/4] mb-2 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center`}>
                                <ImageIcon size={24} className="text-slate-400" />
                              </div>
                              <p className={`font-bold line-clamp-1 ${textColor} text-xs`}>Producto Catálogo {i}</p>
                              <p className={`${headingWeight} text-sm`} style={{ color: primaryColor }}>$39.99</p>
                            </div>
                          ))}
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {/* 3. OFERTAS */}
              {activePagePreview === 'offers' && (
                <div className={`flex-1 flex flex-col ${secondaryBg}`}>
                  
                  <div className="bg-slate-900 text-white py-10 px-6 text-center relative overflow-hidden">
                     {offersCountdown && (
                       <div className="absolute top-0 right-0 p-4">
                         <div className="bg-rose-500 px-3 py-1.5 rounded-lg font-mono text-xs font-bold animate-pulse shadow-lg flex items-center gap-1">
                           ⏳ Termina en 05:42:10
                         </div>
                       </div>
                     )}
                     <h1 className={`${headingWeight} text-4xl md:text-5xl drop-shadow-md text-amber-300 italic mb-2`}>{texts.offersTitle}</h1>
                     <p className="opacity-90 max-w-md mx-auto text-sm">Hasta 70% de descuento en artículos seleccionados. Cantidades limitadas.</p>
                  </div>
                  
                  <div className="flex-1 px-4 md:px-8 py-8">
                     <div className={`grid gap-5 ${previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`flex flex-col group relative ${cardStyle === 'elevated' ? `shadow-md ${cardBg} p-2 rounded-xl` : cardStyle === 'outlined' ? `border ${cardBg} p-2 rounded-xl` : 'p-1'}`}>
                            
                            {/* Etiqueta de Descuento */}
                            <div className="absolute top-4 right-4 z-10 px-2 py-1 text-[10px] font-black text-white rounded-md shadow-sm" style={{ backgroundColor: discountBadgeColor }}>
                              -30% OFF
                            </div>

                            <div className={`w-full aspect-square mb-2 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden`}>
                              <ImageIcon size={24} className="text-slate-400" />
                            </div>
                            <p className={`font-bold line-clamp-1 ${textColor} text-xs`}>Producto en Oferta {i}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className={`${headingWeight} text-sm`} style={{ color: discountBadgeColor }}>$19.99</p>
                              <p className={`text-[10px] line-through text-slate-400`}>$29.99</p>
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
