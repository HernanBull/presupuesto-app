import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import MapSettingsModal from '../components/MapSettingsModal';
import MapFiltersModal from '../components/MapFiltersModal';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Search, 
  SlidersHorizontal, 
  Settings, 
  Crosshair, 
  X, 
  Store, 
  Navigation, 
  ShoppingBag, 
  MapPin, 
  ArrowLeft, 
  MessageCircle,
  ExternalLink,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
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
      map.flyTo([targetLocation.lat, targetLocation.lng], 16, { duration: 1.2 });
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

// Icono del punto central de búsqueda
const searchLocationIcon = new L.DivIcon({
  className: 'custom-search-location-icon',
  html: renderToStaticMarkup(
    <div className="relative mt-2" style={{ filter: 'drop-shadow(0px 8px 12px rgba(0, 0, 0, 0.4))' }}>
      <svg width="34" height="45" viewBox="0 0 44 58" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -translate-y-1/2">
        <defs>
          <linearGradient id="searchPinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path d="M22 2C10.954 2 2 10.954 2 22C2 37 22 56 22 56C22 56 42 37 42 22C42 10.954 33.046 2 22 2Z" fill="url(#searchPinGrad)" stroke="white" strokeWidth="3"/>
        <path d="M22 4C11.5 4 4 11.5 4 22C4 32 18 48 22 52C26 48 40 32 40 22C40 11.5 32.5 4 22 4Z" fill="white" fillOpacity="0.15" />
        <g transform="translate(12, 11) scale(0.85)">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 6h18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 10a4 4 0 0 1-8 0" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </svg>
    </div>
  ),
  iconSize: [34, 45],
  iconAnchor: [17, 45]
});

// Icono personalizado para los pines de las tiendas en el mapa
const createStoreMarkerIcon = (isSelected, store) => {
  const logo = resolveImageUrl(store.logoUrl);
  return new L.DivIcon({
    className: 'custom-store-pin',
    html: renderToStaticMarkup(
      <div className={`relative flex items-center justify-center transition-transform ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}`}>
        <div className={`w-11 h-11 rounded-2xl p-0.5 shadow-2xl flex items-center justify-center transition-all ${
          isSelected 
            ? 'bg-amber-500 ring-4 ring-amber-400/50 shadow-amber-500/50' 
            : 'bg-zinc-900 border-2 border-amber-400 shadow-black/80'
        }`}>
          {logo ? (
            <img src={logo} alt="" className="w-full h-full object-cover rounded-[14px] bg-white" />
          ) : (
            <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 font-black">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                <path d="M2 7h20"/>
              </svg>
            </div>
          )}
        </div>
        <div className="absolute -bottom-1 w-2.5 h-2.5 bg-amber-500 rotate-45 rounded-[2px] shadow-sm"></div>
      </div>
    ),
    iconSize: [44, 48],
    iconAnchor: [22, 46],
    popupAnchor: [0, -46]
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
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ ofertas: [], categorias: [], abiertoAhora: false });
  
  // Snap Points del Bottom Sheet: 'collapsed' (~115px), 'half' (~52vh), 'expanded' (~88vh)
  const [sheetSnap, setSheetSnap] = useState('half');
  
  const [scanRadius, setScanRadius] = useState(1000);
  const [showZones, setShowZones] = useState(false);
  const [onlyMalls, setOnlyMalls] = useState(false);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isScanning, setIsScanning] = useState(true);

  // Coordenadas fallback (Caracas, Venezuela)
  const defaultLocation = [10.4806, -66.9036]; 

  useEffect(() => {
    // 1. Obtener ubicación GPS una sola vez al montar
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter({ lat: coords[0], lng: coords[1] });
          setActiveSearchLocation({ lat: coords[0], lng: coords[1] });
          fetchStores(coords);
        },
        (error) => {
          console.error("Error obtaining location", error);
          setUserLocation(defaultLocation);
          setMapCenter({ lat: defaultLocation[0], lng: defaultLocation[1] });
          setActiveSearchLocation({ lat: defaultLocation[0], lng: defaultLocation[1] });
          fetchStores(defaultLocation);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setUserLocation(defaultLocation);
      setMapCenter({ lat: defaultLocation[0], lng: defaultLocation[1] });
      setActiveSearchLocation({ lat: defaultLocation[0], lng: defaultLocation[1] });
      fetchStores(defaultLocation);
    }
  }, []);

  // 2. Re-consultar cuando cambien filtros o radio
  useEffect(() => {
    if (activeSearchLocation) {
      fetchStores([activeSearchLocation.lat, activeSearchLocation.lng]);
    } else if (mapCenter) {
      fetchStores([mapCenter.lat, mapCenter.lng]);
    }
  }, [scanRadius, onlyMalls, activeFilters]);

  const fetchStores = async (location) => {
    try {
      setIsScanning(true);
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

        return {
          ...store,
          latitude: (lat !== undefined && lat !== null && !isNaN(Number(lat))) ? Number(lat) : null,
          longitude: (lng !== undefined && lng !== null && !isNaN(Number(lng))) ? Number(lng) : null,
          logoUrl,
          coverUrl,
          category,
          address,
          phone,
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
        
        if (onlyMalls) {
          finalStores = finalStores.filter(store => store.config?.location_type === 'mall' || store.config?.is_mall === true || store.config?.business_type === 'Centro Comercial');
        }

        if (activeFilters.abiertoAhora) {
          finalStores = finalStores.filter(store => store.isOpen);
        }

        if (activeFilters.categorias && activeFilters.categorias.length > 0) {
          finalStores = finalStores.filter(store => activeFilters.categorias.includes(store.category));
        }
      }
      
      setStores(finalStores);
      
      setTimeout(() => {
        setIsScanning(false);
      }, 700);

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

  // Manejador de arrastre táctil para el Bottom Sheet
  const handleSheetDragEnd = (event, info) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;
    
    if (offset < -45 || velocity < -200) {
      // Arrastrado hacia arriba -> Expandir
      if (sheetSnap === 'collapsed') setSheetSnap('half');
      else if (sheetSnap === 'half') setSheetSnap('expanded');
    } else if (offset > 45 || velocity > 200) {
      // Arrastrado hacia abajo -> Colapsar
      if (sheetSnap === 'expanded') setSheetSnap('half');
      else if (sheetSnap === 'half') setSheetSnap('collapsed');
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
          >
            <ChangeView center={userLocation} zoom={14} />
            <MapFlyController targetLocation={targetMapLocation} />
            
            {/* Dark themed map using OSM with CSS filter */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              className="map-tiles"
            />

            {/* Active Search Area Circle and Marker */}
            {activeSearchLocation && (
              <>
                <Circle 
                  center={{ lat: activeSearchLocation.lat, lng: activeSearchLocation.lng }} 
                  radius={scanRadius} 
                  pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.1, weight: 1.5 }} 
                />
                <Marker 
                  position={[activeSearchLocation.lat, activeSearchLocation.lng]} 
                  icon={searchLocationIcon} 
                  zIndexOffset={900}
                />
              </>
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
                        <h4 className="font-extrabold text-sm truncate text-zinc-900 leading-tight">{store.name}</h4>
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
          <div className="relative mt-2 animate-[pulse_3s_ease-in-out_infinite] opacity-60 pointer-events-none" style={{ filter: 'drop-shadow(0px 10px 15px rgba(0, 0, 0, 0.5))' }}>
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

      {/* TOP FLOATING HEADER (BUSCADOR REACTIVO) */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 safe-area-pt">
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="flex-shrink-0 w-11 h-11 bg-white/95 backdrop-blur-xl rounded-2xl flex items-center justify-center text-zinc-800 border border-zinc-200/80 shadow-lg hover:bg-white transition-colors"
            title="Volver"
          >
            <X size={20} />
          </button>
          
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={18} className="text-zinc-500" />
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tiendas o categorías..." 
              className="w-full bg-white/95 backdrop-blur-xl border border-zinc-200/80 rounded-2xl py-3 pl-10 pr-9 text-zinc-800 text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-lg placeholder:text-zinc-400 font-medium"
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

      {/* Botón Buscar en esta Zona (Aparece tras arrastrar el mapa) */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex justify-center w-full">
        <AnimatePresence>
          {isMapMoved && (
            <motion.button 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => {
                setIsMapMoved(false);
                setActiveSearchLocation({ lat: mapCenter.lat, lng: mapCenter.lng });
                fetchStores([mapCenter.lat, mapCenter.lng]);
              }}
              className="pointer-events-auto px-4 py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-full shadow-2xl border border-zinc-700 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
              <Search size={14} className="text-amber-400" /> Buscar en esta zona
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* FLOATING GPS BUTTON ÚNICO (DESPEJANDO EL MAPA) */}
      <div className="absolute top-20 right-4 z-40">
        <button 
          onClick={centerOnUser} 
          className="w-11 h-11 bg-white/95 backdrop-blur-xl rounded-2xl flex items-center justify-center text-zinc-700 border border-zinc-200/80 shadow-md hover:bg-white active:scale-95 transition-all"
          title="Centrar en mi ubicación"
        >
          <Crosshair size={20} className="text-amber-600" />
        </button>
      </div>

      <MapSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        scanRadius={scanRadius} 
        setScanRadius={setScanRadius}
        showZones={showZones}
        setShowZones={setShowZones}
        onlyMalls={onlyMalls}
        setOnlyMalls={setOnlyMalls}
      />

      <MapFiltersModal 
        isOpen={isFiltersModalOpen} 
        onClose={() => setIsFiltersModalOpen(false)} 
        filters={activeFilters} 
        setFilters={setActiveFilters} 
      />

      {/* BOTTOM SHEET DESLIZABLE CON EL DEDO (TOUCH & DRAG SWIPEABLE) */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
        <div className="relative pointer-events-auto w-full">
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={handleSheetDragEnd}
            animate={{
              height: sheetSnap === 'expanded' ? '88vh' : sheetSnap === 'half' ? '52vh' : '112px'
            }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="bg-white rounded-t-[2.5rem] border-t border-zinc-200/90 shadow-[0_-12px_45px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col w-full"
          >
            {/* Barra superior de arrastre táctil (Drag Handle) */}
            <div 
              onClick={toggleSheetSnap}
              className="w-full flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none"
              title="Desliza hacia arriba o abajo"
            >
              <div className="w-12 h-1.5 bg-zinc-300 rounded-full hover:bg-zinc-400 transition-colors"></div>
            </div>

            {/* CABECERA INTEGRADA CON BOTONES DE AJUSTES Y FILTRO */}
            <div className="px-5 pt-1 pb-3 flex items-center justify-between border-b border-zinc-100 gap-2 select-none">
              <div 
                onClick={toggleSheetSnap}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Store size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-zinc-900 font-black text-sm sm:text-base leading-tight truncate">
                    {displayedStores.length} {displayedStores.length === 1 ? 'comercio encontrado' : 'comercios encontrados'}
                  </h3>
                  <p className="text-zinc-500 text-[10px] sm:text-[11px] truncate font-medium">
                    {sheetSnap === 'collapsed' ? 'Toca o desliza hacia arriba para ver tiendas' : `Radio de búsqueda: ${(scanRadius / 1000).toFixed(1)} km`}
                  </p>
                </div>
              </div>

              {/* BOTONES INTEGRADOS AL LADO DE LA CANTIDAD DE TIENDAS */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Botón de Ajustes de Radio */}
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsSettingsOpen(true); 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all border border-zinc-200/80 shadow-sm active:scale-95"
                  title="Ajustar radio de búsqueda"
                >
                  <Settings size={14} className="text-zinc-600" />
                  <span>{(scanRadius / 1000).toFixed(1)} km</span>
                </button>

                {/* Botón de Filtros */}
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsFiltersModalOpen(true); 
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm active:scale-95 ${
                    (activeFilters.categorias?.length > 0 || activeFilters.abiertoAhora || activeFilters.ofertas?.length > 0)
                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200/80'
                  }`}
                  title="Filtrar comercios"
                >
                  <SlidersHorizontal size={14} />
                  <span>Filtros</span>
                  {(activeFilters.categorias?.length > 0 || activeFilters.abiertoAhora) && (
                    <span className="w-2 h-2 rounded-full bg-zinc-950 animate-pulse"></span>
                  )}
                </button>

                {/* Botón de alternancia de altura */}
                <button
                  type="button"
                  onClick={toggleSheetSnap}
                  className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors border border-zinc-200/80"
                  title={sheetSnap === 'expanded' ? 'Reducir' : 'Expandir'}
                >
                  {sheetSnap === 'expanded' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>
            
            {/* CUERPO DEL BOTTOM SHEET (VISIBLE EN POSICIONES HALF Y EXPANDED) */}
            <div className={`px-5 pt-3 pb-8 flex-1 overflow-y-auto hide-scrollbar ${sheetSnap === 'collapsed' ? 'hidden' : 'block'}`}>
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
                      <div className="relative h-32 sm:h-36 w-full bg-slate-900 overflow-hidden">
                        {selectedStore.coverUrl ? (
                          <img 
                            src={resolveImageUrl(selectedStore.coverUrl)} 
                            alt={selectedStore.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-slate-800 to-zinc-900 flex items-center justify-center">
                            <Store size={36} className="text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        
                        {/* Badges superiores sobre portada (Letras blancas forzadas) */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                          <span 
                            style={{ color: '#ffffff' }}
                            className="text-xs font-black text-white bg-black/75 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/30 shadow-md tracking-wide"
                          >
                            {selectedStore.category}
                          </span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5 ${
                            selectedStore.isOpen 
                              ? 'bg-emerald-500/90 text-white border-emerald-400/30' 
                              : 'bg-zinc-800/90 text-zinc-300 border-white/10'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${selectedStore.isOpen ? 'bg-white animate-pulse' : 'bg-zinc-400'}`}></span>
                            {selectedStore.isOpen ? 'Abierto' : 'Cerrado'}
                          </span>
                        </div>

                        {/* Logotipo Circular Superpuesto */}
                        <div className="absolute -bottom-4 left-4 z-20">
                          <div className="w-16 h-16 rounded-2xl border-3 border-white shadow-lg bg-white overflow-hidden flex items-center justify-center">
                            {selectedStore.logoUrl ? (
                              <img src={resolveImageUrl(selectedStore.logoUrl)} alt="" className="w-full h-full object-cover" />
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
                            <h2 className="text-zinc-900 font-black text-xl leading-tight">
                              {selectedStore.name}
                            </h2>
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
                  /* CASO B: LISTA DE COMERCIOS ENCONTRADOS (MOSTRADOS POR SEPARADO) */
                  <div>
                    {isScanning ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="w-12 h-12 rounded-full border-4 border-zinc-200 border-t-amber-500 animate-spin mb-3"></div>
                        <p className="text-zinc-900 font-bold text-base">Escaneando zona...</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Buscando comercios cercanos a tu ubicación</p>
                      </div>
                    ) : displayedStores.length > 0 ? (
                      <div className="space-y-3.5">
                        {/* LISTA DE TARJETAS INDIVIDUALES POR SEPARADO */}
                        <div className="space-y-3 pr-1 pb-2">
                          {displayedStores.map((store) => (
                            <div 
                              key={store.id}
                              className="group bg-white rounded-2xl border border-zinc-200/90 shadow-sm hover:shadow-md hover:border-amber-400/80 transition-all overflow-hidden"
                            >
                              {/* BANNER / PORTADA MINIATURA */}
                              <div className="relative h-24 w-full bg-slate-900 overflow-hidden">
                                {store.coverUrl ? (
                                  <img 
                                    src={resolveImageUrl(store.coverUrl)} 
                                    alt={store.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-slate-800 to-zinc-900 flex items-center justify-center">
                                    <Store size={28} className="text-zinc-700" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                                {/* Badges superiores sobre la portada (Letras blancas forzadas) */}
                                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                                  <span 
                                    style={{ color: '#ffffff' }}
                                    className="text-[11px] font-black text-white bg-black/75 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/30 shadow-md tracking-wide"
                                  >
                                    {store.category}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md border flex items-center gap-1 ${
                                    store.isOpen 
                                      ? 'bg-emerald-500/90 text-white border-emerald-400/30' 
                                      : 'bg-zinc-800/90 text-zinc-300 border-white/10'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${store.isOpen ? 'bg-white animate-pulse' : 'bg-zinc-400'}`}></span>
                                    {store.isOpen ? 'Abierto' : 'Cerrado'}
                                  </span>
                                </div>

                                {/* LOGO SUPERPUESTO */}
                                <div className="absolute -bottom-3 left-4 z-20">
                                  <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md bg-white overflow-hidden flex items-center justify-center">
                                    {store.logoUrl ? (
                                      <img src={resolveImageUrl(store.logoUrl)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Store size={20} className="text-amber-500" />
                                    )}
                                  </div>
                                </div>

                                {/* Distancia flotante */}
                                <div className="absolute bottom-2 right-3 z-10">
                                  <span className="text-[11px] font-bold text-amber-300 drop-shadow flex items-center gap-1">
                                    <Navigation size={11} /> {store.distanceKm} km
                                  </span>
                                </div>
                              </div>

                              {/* CUERPO DE LA TARJETA */}
                              <div className="pt-4 px-4 pb-3.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="pl-14">
                                    <h4 className="font-extrabold text-zinc-900 text-base leading-tight tracking-tight">
                                      {store.name}
                                    </h4>
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
                                    className="col-span-2 sm:col-span-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs py-2.5 px-3 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 uppercase tracking-wider"
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
          </motion.div>
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
          background: #0f172a;
        }
        .map-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
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
