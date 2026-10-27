import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import MapSettingsModal from '../components/MapSettingsModal';
import OfflineMapModal from '../components/OfflineMapModal';
import { autoCacheZoneIfNeeded } from '../utils/offlineMapService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Search, 
  Settings, 
  Crosshair, 
  X, 
  Store, 
  Navigation, 
  ShoppingBag, 
  MapPin, 
  ArrowLeft, 
  MessageCircle,
  ChevronUp,
  ChevronDown,
  HardDrive,
  Sun,
  Moon,
  Zap
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default Leaflet markers not showing in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Resolver URLs de imágenes (Supabase Storage / local)
const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  return `https://axonmarket-api.onrender.com${url}`;
};

// Evaluar si una tienda está abierta o cerrada en vivo según scheduleProfile
const checkIfStoreIsOpen = (scheduleProfile) => {
  if (!scheduleProfile) return { isOpen: true, label: 'Abierto' };
  if (scheduleProfile.scheduleActive === false) return { isOpen: true, label: 'Abierto' };
  
  const now = new Date();
  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const currentDay = dayNames[now.getDay()];
  
  const workDays = scheduleProfile.workDays || {};
  if (workDays[currentDay] === false) {
    return { isOpen: false, label: 'Cerrado hoy' };
  }
  
  const openTime = scheduleProfile.openTime || '08:00';
  const closeTime = scheduleProfile.closeTime || '18:00';
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = (openTime || '08:00').split(':').map(Number);
  const [closeH, closeM] = (closeTime || '18:00').split(':').map(Number);
  
  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);
  
  if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
    return { isOpen: true, label: `Abierto · Cierra a las ${closeTime}` };
  } else {
    return { isOpen: false, label: `Cerrado · Abre a las ${openTime}` };
  }
};

// Haversine distance formula (returns distance in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Component to dynamically change map view
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Controller to fly to target coordinates smoothly
function MapFlyController({ targetLocation }) {
  const map = useMap();
  useEffect(() => {
    if (targetLocation) {
      map.flyTo([targetLocation.lat, targetLocation.lng], 16, { duration: 1.0 });
    }
  }, [targetLocation, map]);
  return null;
}

// Component to listen to map drag/pan events
function MapEventsHandler({ setMapCenter, setIsMapMoved }) {
  const map = useMapEvents({
    moveend: () => {
      setMapCenter(map.getCenter());
      setIsMapMoved(true);
    },
  });
  return null;
}

// Icono elegante GPS para la ubicación del usuario (Punto azul estático con halo suave, cero bucles de animación)
const userLocationMarkerIcon = new L.DivIcon({
  className: 'custom-user-gps-pin',
  html: renderToStaticMarkup(
    <div className="relative flex items-center justify-center">
      <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-md z-10"></div>
      <div className="absolute w-6 h-6 rounded-full bg-blue-500/25 border border-blue-400/40 pointer-events-none"></div>
    </div>
  ),
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Pincito minimalista y profesional para los comercios en el mapa (28x34px)
const createStoreMarkerIcon = (isSelected, store) => {
  const logo = resolveImageUrl(store.logoUrl);
  return new L.DivIcon({
    className: 'custom-store-pin',
    html: renderToStaticMarkup(
      <div className={`relative flex flex-col items-center cursor-pointer transition-transform ${isSelected ? 'scale-115 z-50' : 'hover:scale-105'}`}>
        <div className={`w-7 h-7 rounded-full p-0.5 shadow-lg flex items-center justify-center transition-all ${
          isSelected 
            ? 'bg-amber-500 ring-2 ring-amber-400 shadow-amber-500/50' 
            : 'bg-zinc-900 border border-amber-400/90 shadow-black/80'
        }`}>
          {logo ? (
            <img src={logo} alt="" className="w-full h-full object-cover rounded-full bg-white" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#09090b' : '#f59e0b'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
            </svg>
          )}
        </div>
        {/* Punta afilada del pin */}
        <div className={`w-2 h-2 -mt-1 rotate-45 rounded-[1px] ${isSelected ? 'bg-amber-500' : 'bg-zinc-900 border-r border-b border-amber-400/90'}`}></div>
      </div>
    ),
    iconSize: [28, 34],
    iconAnchor: [14, 34],
    popupAnchor: [0, -34]
  });
};

export default function StoreScannerMap() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [activeSearchLocation, setActiveSearchLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [targetMapLocation, setTargetMapLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMapMoved, setIsMapMoved] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('axon_map_theme') || 'light');
  
  const handleExitMap = () => {
    // Si viene navegando desde la vitrina o explorador, volver atrás; sino ir al feed de comercios
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/explorar');
    }
  };

  // Snap Points del Bottom Sheet: 'collapsed' (105px), 'half' (52vh), 'expanded' (88vh)
  const [sheetSnap, setSheetSnap] = useState('half');
  const touchStartY = useRef(null);
  
  const [scanRadius, setScanRadius] = useState(1000);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [autoCacheStatus, setAutoCacheStatus] = useState(null);

  // Coordenadas fallback (Cagua, Estado Aragua, Venezuela)
  const defaultLocation = [10.1864, -67.4594]; 

  const triggerAutoCache = async (lat, lng) => {
    try {
      const res = await autoCacheZoneIfNeeded(lat, lng, (prog) => {
        setAutoCacheStatus({ done: false, percent: prog.percent });
      });
      if (res) {
        if (res.alreadyCached) {
          setAutoCacheStatus(null);
        } else {
          setAutoCacheStatus({ done: true, percent: 100 });
          setTimeout(() => setAutoCacheStatus(null), 3500);
        }
      }
    } catch (err) {
      console.warn("Auto-cache background error:", err);
      setAutoCacheStatus(null);
    }
  };

  useEffect(() => {
    // 1. Obtener ubicación GPS una sola vez al montar y descargar mapa en caché local automáticamente
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter({ lat: coords[0], lng: coords[1] });
          setActiveSearchLocation({ lat: coords[0], lng: coords[1] });
          setIsScanning(false);
          triggerAutoCache(coords[0], coords[1]);
          fetchStores(coords);
        },
        (error) => {
          console.warn("GPS no disponible o denegado (modo escáner activo):", error.message);
          setUserLocation(defaultLocation);
          setMapCenter({ lat: defaultLocation[0], lng: defaultLocation[1] });
          setActiveSearchLocation({ lat: defaultLocation[0], lng: defaultLocation[1] });
          setIsScanning(false);
          triggerAutoCache(defaultLocation[0], defaultLocation[1]);
          fetchStores(defaultLocation);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setUserLocation(defaultLocation);
      setMapCenter({ lat: defaultLocation[0], lng: defaultLocation[1] });
      setActiveSearchLocation({ lat: defaultLocation[0], lng: defaultLocation[1] });
      setIsScanning(false);
      triggerAutoCache(defaultLocation[0], defaultLocation[1]);
      fetchStores(defaultLocation);
    }
  }, []);

  // 2. Re-consultar cuando cambie el radio (solo si el usuario ya ha iniciado una búsqueda)
  useEffect(() => {
    if (hasScanned) {
      if (activeSearchLocation) {
        fetchStores([activeSearchLocation.lat, activeSearchLocation.lng]);
      } else if (mapCenter) {
        fetchStores([mapCenter.lat, mapCenter.lng]);
      }
    }
  }, [scanRadius]);

  const fetchStores = async (location) => {
    try {
      setIsScanning(true);
      setHasScanned(true);
      const { data, error } = await supabase
        .from('workspaces')
        .select('*');

      if (error) throw error;
      
      let finalStores = (data || []).map(store => {
        const lat = store.latitude || store.config?.location?.lat || store.config?.expediente?.gps?.lat;
        const lng = store.longitude || store.config?.location?.lng || store.config?.expediente?.gps?.lng;
        const logoUrl = store.config?.logoUrl || store.config?.storefront?.logoUrl || null;
        const coverUrl = store.config?.coverUrl || store.config?.heroUrl || store.config?.storefront?.heroUrl || null;
        const category = store.config?.business_type || 'Comercio';
        const address = store.map_address || store.config?.address || store.config?.location?.address || 'Ubicación física disponible';
        const phone = store.config?.expediente?.whatsapp || store.config?.contact?.phone || store.config?.paymentProfile?.pmPhone || '';
        const schedule = store.config?.scheduleProfile || null;
        const status = checkIfStoreIsOpen(schedule);
        const hasEnminutosAlliance = Boolean(store.config?.has_enminutos_alliance || store.config?.hasEnminutosAlliance);

        return {
          ...store,
          latitude: (lat !== undefined && lat !== null && !isNaN(Number(lat))) ? Number(lat) : null,
          longitude: (lng !== undefined && lng !== null && !isNaN(Number(lng))) ? Number(lng) : null,
          logoUrl,
          coverUrl,
          category,
          address,
          phone,
          hasEnminutosAlliance,
          isOpen: status.isOpen,
          scheduleLabel: status.label,
          slug: store.store_slug || store.id
        };
      }).filter(s => s.latitude !== null && s.longitude !== null);

      if (location && location.length === 2) {
        const [lat, lng] = location;
        
        finalStores = finalStores.filter(store => {
          const dist = calculateDistance(lat, lng, store.latitude, store.longitude);
          store.distanceToUser = dist;
          store.distanceKm = (dist / 1000).toFixed(1);
          return dist <= scanRadius;
        });

        // Ordenar comercios del más cercano al más lejano
        finalStores.sort((a, b) => (a.distanceToUser || 0) - (b.distanceToUser || 0));
      }
      
      setStores(finalStores);
      setIsScanning(false);

    } catch (error) {
      console.error("Error fetching stores for map:", error);
      setIsScanning(false);
    }
  };

  const centerOnUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setMapCenter({ lat: coords[0], lng: coords[1] });
        setActiveSearchLocation({ lat: coords[0], lng: coords[1] });
        fetchStores(coords);
        setIsMapMoved(false);
      });
    }
  };

  // Filtrado reactivo en vivo por término de búsqueda (nombre, categoría o dirección)
  const displayedStores = stores.filter(store => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      store.name?.toLowerCase().includes(term) ||
      store.category?.toLowerCase().includes(term) ||
      store.address?.toLowerCase().includes(term)
    );
  });

  // Gestos táctiles nativos ultra-ligeros (Cero Lag)
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    
    if (diff < -35) {
      // Swipe UP
      setSheetSnap(prev => (prev === 'collapsed' ? 'half' : 'expanded'));
    } else if (diff > 35) {
      // Swipe DOWN
      setSheetSnap(prev => (prev === 'expanded' ? 'half' : 'collapsed'));
    }
  };

  const toggleSheetSnap = () => {
    if (sheetSnap === 'collapsed') setSheetSnap('half');
    else if (sheetSnap === 'half') setSheetSnap('expanded');
    else setSheetSnap('collapsed');
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans">
      
      {/* MAP LAYER */}
      <div className="absolute inset-0 z-0">
        {userLocation && (
          <MapContainer 
            center={userLocation} 
            zoom={14} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            preferCanvas={true}
            keepBuffer={3}
            fadeAnimation={false}
          >
            <ChangeView center={userLocation} zoom={14} />
            <MapFlyController targetLocation={targetMapLocation} />
            
            {/* Mapa OpenStreetMap con selector dinámico de Modo Claro / Modo Oscuro */}
            <TileLayer
              key={mapTheme}
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              className={mapTheme === 'dark' ? "dark-map-tiles" : "light-map-tiles"}
            />

            {/* Marcador GPS discreto del usuario (Punto azul pulsante) */}
            <Marker 
              position={userLocation} 
              icon={userLocationMarkerIcon} 
              zIndexOffset={1000}
            />

            {/* Círculo de radio de búsqueda (se dibuja únicamente cuando el usuario escanea) */}
            {hasScanned && activeSearchLocation && (
              <Circle 
                center={{ lat: activeSearchLocation.lat, lng: activeSearchLocation.lng }} 
                radius={scanRadius} 
                pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.08, weight: 1.5, dashArray: '4, 4' }} 
              />
            )}

            {/* User Location Event Handler */}
            <MapEventsHandler setMapCenter={setMapCenter} setIsMapMoved={setIsMapMoved} />

            {/* Store Pins con Popups interactivos */}
            {displayedStores.map((store) => (
              <Marker 
                key={store.id} 
                position={[store.latitude, store.longitude]}
                icon={createStoreMarkerIcon(selectedStore?.id === store.id, store)}
                eventHandlers={{
                  click: () => {
                    setSelectedStore(store);
                    setTargetMapLocation({ lat: store.latitude, lng: store.longitude });
                    if (sheetSnap === 'collapsed') setSheetSnap('half');
                  },
                }}
              >
                <Popup className="custom-store-popup" closeButton={false}>
                  <div 
                    className="p-3 min-w-[200px] text-zinc-900 font-sans cursor-pointer"
                    onClick={() => {
                      setSelectedStore(store);
                      if (sheetSnap === 'collapsed') setSheetSnap('half');
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 flex items-center justify-center border border-zinc-200">
                        {store.logoUrl ? (
                          <img src={resolveImageUrl(store.logoUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Store size={20} className="text-amber-600" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-sm truncate text-zinc-900 leading-tight">{store.name}</h4>
                          {store.hasEnminutosAlliance && (
                            <span 
                              className="inline-flex items-center gap-0.5 bg-slate-950 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 border border-white/20"
                              style={{ color: '#ffffff' }}
                            >
                              <span className="text-red-500">EM</span>
                              <Zap size={8} className="fill-yellow-400 text-yellow-400" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500 truncate block">{store.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px]">
                      <span className={`font-bold flex items-center gap-1 ${store.isOpen ? 'text-emerald-600' : 'text-zinc-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${store.isOpen ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                        {store.isOpen ? 'Abierto' : 'Cerrado'}
                      </span>
                      <span className="text-amber-600 font-bold">{store.distanceKm} km</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/${store.slug}`);
                      }}
                      className="w-full mt-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-[11px] uppercase tracking-wider py-1.5 rounded-lg text-center shadow-sm"
                    >
                      Ver Vitrina
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* Fixed Central Pin Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-[50]">
          <div className="relative mt-2 opacity-60 pointer-events-none" style={{ filter: 'drop-shadow(0px 10px 15px rgba(0, 0, 0, 0.5))' }}>
            <svg width="44" height="58" viewBox="0 0 44 58" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -translate-y-1/2">
              <defs>
                <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <path d="M22 2C10.954 2 2 10.954 2 22C2 37 22 56 22 56C22 56 42 37 42 22C42 10.954 33.046 2 22 2Z" fill="url(#pinGrad)" stroke="white" strokeWidth="3"/>
              <path d="M22 4C11.5 4 4 11.5 4 22C4 32 18 48 22 52C26 48 40 32 40 22C40 11.5 32.5 4 22 4Z" fill="white" fillOpacity="0.15" />
              <g transform="translate(12, 11) scale(0.85)">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 6h18" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 10a4 4 0 0 1-8 0" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* TOP FLOATING HEADER (BUSCADOR REACTIVO SÓLIDO) */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 safe-area-pt">
        <div className="flex gap-2 items-center max-w-4xl mx-auto">
          <button 
            onClick={handleExitMap} 
            className="flex-shrink-0 px-3.5 h-11 bg-white hover:bg-zinc-50 rounded-2xl flex items-center gap-2 text-zinc-800 border border-zinc-200 shadow-md text-xs font-bold transition-all cursor-pointer"
            title="Volver a los comercios"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Comercios</span>
          </button>

          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur-md rounded-2xl border border-zinc-200 text-xs font-bold text-zinc-700 shadow-sm shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Modo Escáner
          </span>
          
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={18} className="text-zinc-500" />
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tiendas o categorías..." 
              className="w-full bg-white border border-zinc-200 rounded-2xl py-3 pl-10 pr-9 text-zinc-800 text-sm focus:outline-none focus:border-amber-500 shadow-md placeholder:text-zinc-400 font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicador sutil de autoguardado de mapa en caché local */}
      {autoCacheStatus && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
          <div className="bg-zinc-900 border border-amber-500/40 text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2">
            {autoCacheStatus.done ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-zinc-200">Mapa guardado en el teléfono (0 datos)</span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
                <span className="text-zinc-200">Guardando mapa local en segundo plano ({autoCacheStatus.percent}%)...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Botón Buscar en esta Zona (Si aún no ha escaneado O si arrastró el mapa) */}
      {(!hasScanned || isMapMoved) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex justify-center w-full pointer-events-auto">
          <button 
            onClick={() => {
              setIsMapMoved(false);
              const target = mapCenter || (userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null);
              if (target) {
                setActiveSearchLocation(target);
                fetchStores([target.lat, target.lng]);
              }
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-full shadow-2xl flex items-center gap-2 border border-amber-300"
          >
            <Search size={14} className="text-zinc-950" /> Buscar en esta zona
          </button>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS: GPS, MODO CLARO/OSCURO Y DESCARGA OFFLINE */}
      <div className="absolute top-20 right-4 z-40 flex flex-col gap-2">
        <button 
          onClick={centerOnUser} 
          className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-zinc-700 border border-zinc-200 shadow-md hover:bg-zinc-50 transition-all cursor-pointer"
          title="Centrar en mi ubicación"
        >
          <Crosshair size={20} className="text-amber-600" />
        </button>

        <button 
          onClick={() => {
            const nextTheme = mapTheme === 'dark' ? 'light' : 'dark';
            setMapTheme(nextTheme);
            localStorage.setItem('axon_map_theme', nextTheme);
          }} 
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-all border cursor-pointer ${
            mapTheme === 'dark' 
              ? 'bg-zinc-900 text-amber-400 border-zinc-800 hover:bg-zinc-800' 
              : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50'
          }`}
          title={mapTheme === 'dark' ? "Cambiar a Modo Claro (Día)" : "Cambiar a Modo Oscuro (Noche)"}
        >
          {mapTheme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
        </button>

        <button 
          onClick={() => setIsOfflineModalOpen(true)} 
          className="w-11 h-11 bg-zinc-900 rounded-2xl flex items-center justify-center text-amber-400 border border-zinc-800 shadow-md hover:bg-zinc-800 transition-all cursor-pointer"
          title="Descargar mapa offline en teléfono (Cero datos)"
        >
          <HardDrive size={18} />
        </button>
      </div>

      <MapSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        scanRadius={scanRadius} 
        setScanRadius={setScanRadius}
      />

      <OfflineMapModal 
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        currentCenter={mapCenter || (userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null)}
      />

      {/* BOTTOM SHEET DESLIZABLE NATIVO ULTRA FLUIDO (CERO LAG, CERO ANIMACIONES PESADAS) */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
        <div className="relative pointer-events-auto w-full">
          <div 
            className={`bg-white rounded-t-[2.5rem] border-t border-zinc-200 shadow-[0_-12px_45px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col w-full ${
              sheetSnap === 'expanded' ? 'h-[88vh]' : sheetSnap === 'half' ? 'h-[52vh]' : 'h-[105px]'
            }`}
          >
            {/* Barra superior de arrastre táctil (Drag Handle) con listeners nativos */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={toggleSheetSnap}
              className="w-full flex flex-col items-center pt-3 pb-1 cursor-pointer select-none"
              title="Desliza hacia arriba o abajo"
            >
              <div className="w-12 h-1.5 bg-zinc-300 rounded-full"></div>
            </div>

            {/* CABECERA: TEXTO CON MÁXIMO ESPACIO PARA NO TRUNCAR NUNCA EN MÓVIL */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="px-5 pt-1 pb-3 flex items-center justify-between border-b border-zinc-100 gap-3 select-none"
            >
              <div 
                onClick={toggleSheetSnap}
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Store size={19} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-zinc-900 font-black text-sm sm:text-base leading-tight">
                    {!hasScanned 
                      ? 'Explorar comercios' 
                      : `${displayedStores.length} ${displayedStores.length === 1 ? 'comercio encontrado' : 'comercios encontrados'}`
                    }
                  </h3>
                  <p className="text-zinc-500 text-[11px] font-medium mt-0.5">
                    {!hasScanned 
                      ? 'Toca para buscar en tu zona' 
                      : (sheetSnap === 'collapsed' ? 'Toca para ver comercios' : `Radio de búsqueda: ${(scanRadius / 1000).toFixed(1)} km`)
                    }
                  </p>
                </div>
              </div>

              {/* Botón único de Ajustes de Radio a la derecha */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsSettingsOpen(true); 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold border border-zinc-200"
                  title="Ajustar radio de búsqueda"
                >
                  <Settings size={14} className="text-zinc-600" />
                  <span>{(scanRadius / 1000).toFixed(1)} km</span>
                </button>

                <button
                  type="button"
                  onClick={toggleSheetSnap}
                  className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center border border-zinc-200"
                  title={sheetSnap === 'expanded' ? 'Reducir' : 'Expandir'}
                >
                  {sheetSnap === 'expanded' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>
            
            {/* CUERPO DEL BOTTOM SHEET CON SCROLL NATIVO ULTRA FLUIDO AISLADO EN GPU */}
            <div 
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', transform: 'translateZ(0)' }}
              className={`px-5 pt-3 pb-8 flex-1 overflow-y-auto hide-scrollbar ${sheetSnap === 'collapsed' ? 'hidden' : 'block'}`}
            >
              <div>
                {/* CASO A: COMERCIO SELECCIONADO (FICHA COMPLETA DEL PERFIL) */}
                {selectedStore ? (
                  <div className="flex flex-col">
                    {/* Botón para regresar a la lista de comercios */}
                    <button 
                      onClick={() => setSelectedStore(null)}
                      className="self-start mb-3 text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200/60"
                    >
                      <ArrowLeft size={14} />
                      <span>Ver todas las tiendas encontradas ({displayedStores.length})</span>
                    </button>

                    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                      {/* Portada HD de la tienda */}
                      <div className="relative h-44 sm:h-52 w-full bg-slate-900 overflow-hidden">
                        {selectedStore.coverUrl ? (
                          <img 
                            src={resolveImageUrl(selectedStore.coverUrl)} 
                            alt={selectedStore.name} 
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover object-center" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-slate-800 to-zinc-900 flex items-center justify-center">
                            <Store size={36} className="text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />
                        
                        {/* Badges superiores sobre portada - Blanco sólido de alto contraste y alianza EM */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none flex-wrap gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-white px-3.5 py-1 rounded-full border border-zinc-200 shadow-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="text-xs font-black text-zinc-950 uppercase tracking-wide">
                                {selectedStore.category}
                              </span>
                            </div>
                            {selectedStore.hasEnminutosAlliance && (
                              <div 
                                className="inline-flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/30 shadow-md"
                                style={{ color: '#ffffff' }}
                              >
                                <div className="flex items-center font-black tracking-tighter text-[11px]">
                                  <span className="text-red-500 font-black">E</span>
                                  <span className="text-red-500 font-black">M</span>
                                  <Zap size={11} className="fill-yellow-400 text-yellow-400 ml-0.5" />
                                </div>
                                <span className="text-[10px] font-black text-white tracking-wide whitespace-nowrap">en minutos</span>
                              </div>
                            )}
                          </div>
                          <div className={`text-xs font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-md ${
                            selectedStore.isOpen 
                              ? 'bg-emerald-600 border-emerald-500 text-white' 
                              : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${selectedStore.isOpen ? 'bg-white' : 'bg-zinc-400'}`}></span>
                            <span className="uppercase tracking-wider">{selectedStore.isOpen ? 'Abierto' : 'Cerrado'}</span>
                          </div>
                        </div>

                        {/* Logotipo Circular Superpuesto */}
                        <div className="absolute -bottom-4 left-4 z-20">
                          <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg bg-white overflow-hidden flex items-center justify-center">
                            {selectedStore.logoUrl ? (
                              <img 
                                src={resolveImageUrl(selectedStore.logoUrl)} 
                                alt="" 
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <Store size={26} className="text-amber-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info del Comercio */}
                      <div className="pt-6 px-4 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-zinc-900 font-black text-xl leading-tight">
                                {selectedStore.name}
                              </h2>
                              {selectedStore.hasEnminutosAlliance && (
                                <span 
                                  className="inline-flex items-center gap-1 bg-slate-950 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs border border-white/20"
                                  style={{ color: '#ffffff' }}
                                >
                                  <span className="text-red-500">EM</span>
                                  <Zap size={10} className="fill-yellow-400 text-yellow-400" />
                                  <span className="text-white">en minutos</span>
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5 font-medium">
                              {selectedStore.scheduleLabel}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <Navigation size={12} /> {selectedStore.distanceKm || '0.5'} km
                            </span>
                          </div>
                        </div>

                        {selectedStore.address && (
                          <p className="text-zinc-600 text-xs mt-3 flex items-start gap-1.5 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                            <MapPin size={14} className="text-zinc-400 flex-shrink-0 mt-0.5" />
                            <span>{selectedStore.address}</span>
                          </p>
                        )}

                        {/* Botones de Acción */}
                        <div className="space-y-2 mt-4">
                          {/* Botón Principal: Visitar Tienda */}
                          <button 
                            onClick={() => navigate(`/${selectedStore.slug}`)}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                          >
                            <ShoppingBag size={18} />
                            <span>Visitar Tienda / Catálogo</span>
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Cómo llegar (Google Maps GPS) */}
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.latitude},${selectedStore.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-center"
                            >
                              <Navigation size={14} className="text-amber-400" />
                              <span>Cómo Llegar (GPS)</span>
                            </a>

                            {/* WhatsApp o Centrar Mapa */}
                            {selectedStore.phone ? (
                              <a 
                                href={`https://wa.me/${selectedStore.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi tu tienda ${selectedStore.name} en AxonMarket y quisiera información.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-center"
                              >
                                <MessageCircle size={14} />
                                <span>WhatsApp</span>
                              </a>
                            ) : (
                              <button 
                                onClick={() => {
                                  setTargetMapLocation({ lat: selectedStore.latitude, lng: selectedStore.longitude });
                                }}
                                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                              >
                                <Crosshair size={14} />
                                <span>Centrar Mapa</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CASO B: LISTA DE COMERCIOS ENCONTRADOS */
                  <div>
                    {!hasScanned ? (
                      <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3.5 shadow-sm">
                          <Search size={26} />
                        </div>
                        <h4 className="text-zinc-900 font-extrabold text-base">Encuentra tiendas a tu alrededor</h4>
                        <p className="text-zinc-500 text-xs mt-1 max-w-xs leading-relaxed">
                          Explora comercios, promociones y catálogos en esta zona tocando el botón a continuación.
                        </p>
                        
                        <button
                          onClick={() => {
                            const target = mapCenter || (userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null);
                            if (target) {
                              setActiveSearchLocation(target);
                              fetchStores([target.lat, target.lng]);
                            }
                          }}
                          className="mt-4 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                        >
                          <Search size={15} />
                          <span>Buscar en esta zona</span>
                        </button>

                        <button
                          onClick={() => setIsOfflineModalOpen(true)}
                          className="mt-3.5 text-zinc-500 hover:text-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-colors py-1.5 px-3 rounded-lg hover:bg-zinc-100"
                        >
                          <HardDrive size={13} className="text-amber-500" />
                          <span>Guardar mapa offline (Ahorra memoria y datos)</span>
                        </button>
                      </div>
                    ) : isScanning ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="w-10 h-10 rounded-full border-4 border-zinc-200 border-t-amber-500 animate-spin mb-3"></div>
                        <p className="text-zinc-900 font-bold text-base">Escaneando zona...</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Buscando comercios cercanos a tu ubicación</p>
                      </div>
                    ) : displayedStores.length > 0 ? (
                      <div className="space-y-3">
                        {displayedStores.map((store) => (
                          <div 
                            key={store.id}
                            className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
                          >
                            {/* PORTADA Y LOGO SIN CORTAR */}
                            <div className="relative">
                              {/* BANNER / PORTADA COMPLETA */}
                              <div className="relative h-40 sm:h-48 w-full bg-slate-900 overflow-hidden rounded-t-2xl">
                                {store.coverUrl ? (
                                  <img 
                                    src={resolveImageUrl(store.coverUrl)} 
                                    alt={store.name} 
                                    className="w-full h-full object-cover object-center" 
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-slate-800 to-zinc-900 flex items-center justify-center">
                                    <Store size={28} className="text-zinc-700" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />

                                {/* Badges superiores sobre la portada - Alto contraste y alianza EM */}
                                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none flex-wrap gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-zinc-200 shadow-md">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      <span className="text-[11px] font-black text-zinc-950 uppercase tracking-wider">
                                        {store.category}
                                      </span>
                                    </div>
                                    {store.hasEnminutosAlliance && (
                                      <div 
                                        className="inline-flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/30 shadow-md"
                                        style={{ color: '#ffffff' }}
                                      >
                                        <div className="flex items-center font-black tracking-tighter text-[11px]">
                                          <span className="text-red-500 font-black">E</span>
                                          <span className="text-red-500 font-black">M</span>
                                          <Zap size={11} className="fill-yellow-400 text-yellow-400 ml-0.5" />
                                        </div>
                                        <span className="text-[10px] font-black text-white tracking-wide whitespace-nowrap">en minutos</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 shadow-md ${
                                    store.isOpen 
                                      ? 'bg-emerald-600 border-emerald-500 text-white' 
                                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${store.isOpen ? 'bg-white' : 'bg-zinc-400'}`}></span>
                                    <span className="uppercase tracking-wider">{store.isOpen ? 'Abierto' : 'Cerrado'}</span>
                                  </div>
                                </div>

                                {/* Distancia flotante sólida */}
                                <div className="absolute bottom-2 right-3 z-10">
                                  <span className="text-[11px] font-black text-amber-300 flex items-center gap-1 bg-black/85 px-2.5 py-0.5 rounded-full border border-white/20 shadow-sm">
                                    <Navigation size={11} className="text-amber-400" /> {store.distanceKm} km
                                  </span>
                                </div>
                              </div>

                              {/* LOGO SUPERPUESTO (fuera del contenedor overflow-hidden para que NO se corte en la mitad) */}
                              <div className="absolute -bottom-5 left-4 z-20">
                                <div className="w-14 h-14 rounded-2xl border-2 border-white shadow-lg bg-white overflow-hidden flex items-center justify-center ring-2 ring-black/10">
                                  {store.logoUrl ? (
                                    <img 
                                      src={resolveImageUrl(store.logoUrl)} 
                                      alt={store.name} 
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <Store size={24} className="text-amber-500" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* CUERPO DE LA TARJETA */}
                            <div className="pt-6 px-4 pb-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="pl-16">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-extrabold text-zinc-900 text-base leading-tight tracking-tight">
                                      {store.name}
                                    </h4>
                                    {store.hasEnminutosAlliance && (
                                      <span 
                                        className="inline-flex items-center gap-1 bg-slate-950 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs border border-white/20"
                                        style={{ color: '#ffffff' }}
                                      >
                                        <span className="text-red-500">EM</span>
                                        <Zap size={10} className="fill-yellow-400 text-yellow-400" />
                                        <span className="text-white">en minutos</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-zinc-500 text-[11px] mt-0.5 font-medium line-clamp-1">
                                    {store.scheduleLabel}
                                  </p>
                                </div>
                              </div>

                              {store.address && (
                                <p className="text-zinc-600 text-xs mt-2.5 flex items-center gap-1.5 line-clamp-1">
                                  <MapPin size={12} className="text-zinc-400 flex-shrink-0" />
                                  <span className="truncate">{store.address}</span>
                                </p>
                              )}

                              {/* BOTONES DE ACCIÓN INDIVIDUALES */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-zinc-100">
                                {/* Botón: Visitar Tienda */}
                                <button 
                                  onClick={() => navigate(`/${store.slug}`)}
                                  className="col-span-2 sm:col-span-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
                                >
                                  <ShoppingBag size={14} />
                                  <span>Visitar Tienda</span>
                                </button>

                                {/* Botón: Ver en Mapa */}
                                <button 
                                  onClick={() => {
                                    setTargetMapLocation({ lat: store.latitude, lng: store.longitude });
                                    setSelectedStore(store);
                                    if (sheetSnap === 'collapsed') setSheetSnap('half');
                                  }}
                                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                  title="Ubicar en el mapa"
                                >
                                  <Crosshair size={13} className="text-zinc-600" />
                                  <span>Ver en Mapa</span>
                                </button>

                                {/* Botón: Cómo llegar (Google Maps GPS) */}
                                <a 
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="col-span-2 sm:col-span-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-center"
                                  title="Trazar ruta con Google Maps"
                                >
                                  <Navigation size={13} className="text-amber-400" />
                                  <span>Cómo Llegar</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Store size={36} className="text-zinc-400 mb-2" />
                        <p className="text-zinc-800 font-bold text-base">No hay comercios en este radio</p>
                        <p className="text-zinc-500 text-xs mt-1 max-w-xs">
                          Intenta ampliar la distancia en los ajustes del mapa o moverte a otra zona.
                        </p>
                        <button 
                          onClick={() => setIsSettingsOpen(true)}
                          className="mt-3.5 px-4 py-2 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-sm hover:bg-amber-400 transition-colors"
                        >
                          Ajustar Radio de Búsqueda
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .leaflet-container {
          z-index: 10;
          background: ${mapTheme === 'dark' ? '#0f172a' : '#f1f5f9'};
        }
        .dark-map-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%);
          transform: translate3d(0, 0, 0);
          will-change: transform;
        }
        .light-map-tiles {
          filter: brightness(98%) contrast(102%);
          transform: translate3d(0, 0, 0);
          will-change: transform;
        }
        .custom-user-gps-pin {
          background: transparent !important;
          border: none !important;
        }
        .custom-store-pin {
          background: transparent !important;
          border: none !important;
        }
        .custom-store-popup .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          padding: 0;
          border: 1px solid rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }
        .custom-store-popup .leaflet-popup-content {
          margin: 0;
          line-height: 1.4;
        }
        .custom-store-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
    </div>
  );
}
