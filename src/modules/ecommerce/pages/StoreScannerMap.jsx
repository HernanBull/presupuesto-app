import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import MapSettingsModal from '../components/MapSettingsModal';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, SlidersHorizontal, Clock, Settings, Crosshair, X, Store, Navigation } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for default Leaflet markers not showing in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Store Icon
const storeIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2809/2809854.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

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

import { renderToStaticMarkup } from 'react-dom/server';
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

const searchLocationIcon = new L.DivIcon({
  className: 'custom-search-location-icon',
  html: renderToStaticMarkup(
    <div className="relative mt-2" style={{ filter: 'drop-shadow(0px 10px 15px rgba(0, 0, 0, 0.5))' }}>
      <svg width="44" height="58" viewBox="0 0 44 58" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -translate-y-1/2">
        <defs>
          <linearGradient id="searchPinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
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
  iconSize: [44, 58],
  iconAnchor: [22, 56]
});

export default function StoreScannerMap() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [activeSearchLocation, setActiveSearchLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [isMapMoved, setIsMapMoved] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scanRadius, setScanRadius] = useState(1000);
  const [showZones, setShowZones] = useState(false);
  const [onlyMalls, setOnlyMalls] = useState(false);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isScanning, setIsScanning] = useState(true);

  // Caracas coordinates as default fallback
  const defaultLocation = [10.4806, -66.9036]; 

  useEffect(() => {
    // 1. Get user location ONLY ONCE on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
          setActiveSearchLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          fetchStores([position.coords.latitude, position.coords.longitude]);
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
  }, []); // Empty dependency array ensures GPS is only asked once

  // 2. Re-fetch when filters change, keeping the same active search location
  useEffect(() => {
    if (activeSearchLocation) {
      fetchStores([activeSearchLocation.lat, activeSearchLocation.lng]);
    } else if (mapCenter) {
      fetchStores([mapCenter.lat, mapCenter.lng]);
    }
  }, [scanRadius, onlyMalls]);

  const fetchStores = async (location) => {
    try {
      setIsScanning(true);
      // Query stores that have lat & lng
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      
      let finalStores = data || [];
      if (location && location.length === 2) {
        const [lat, lng] = location;
        
        finalStores = finalStores.filter(store => {
          const dist = calculateDistance(lat, lng, store.latitude, store.longitude);
          store.distanceToUser = dist; // Guardamos la distancia
          return dist <= scanRadius; // Filtro de radio Haversine
        });
        
        if (onlyMalls) {
          finalStores = finalStores.filter(store => store.config?.location_type === 'mall' || store.config?.is_mall === true || store.config?.business_type === 'Centro Comercial');
        }
      }
      
      setStores(finalStores);
      
      // Simulate scan time
      setTimeout(() => {
        setIsScanning(false);
      }, 2000);

    } catch (error) {
      console.error("Error fetching stores for map:", error);
      setIsScanning(false);
    }
  };

  const centerOnUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        fetchStores([position.coords.latitude, position.coords.longitude]);
        setIsMapMoved(false);
      });
    }
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
            
            {/* Dark themed map using OSM with CSS filter */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              className="map-tiles"
            />
            
            {/* Radar Circle Animation around user */}
            <div className="leaflet-overlay-pane">
               {/* This is handled visually with CSS below, but we can put a marker */}
            </div>

            {/* Active Search Area Circle and Marker */}
            {activeSearchLocation && (
              <>
                <Circle 
                  center={{ lat: activeSearchLocation.lat, lng: activeSearchLocation.lng }} 
                  radius={scanRadius} 
                  pathOptions={{ color: '#000000', fillColor: '#000000', fillOpacity: 0.15, weight: 1.5 }} 
                />
                <Marker 
                  position={[activeSearchLocation.lat, activeSearchLocation.lng]} 
                  icon={searchLocationIcon} 
                  zIndexOffset={900}
                />
              </>
            )}

            {/* User Location Marker */}
            <MapEventsHandler setMapCenter={setMapCenter} setIsMapMoved={setIsMapMoved} />

            {/* Store Pins */}
            {stores.map((store) => (
              <Marker 
                key={store.id} 
                position={[store.latitude, store.longitude]}
                icon={storeIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedStore(store);
                  },
                }}
              >
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* Fixed Central Pin & Search Button Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-[50]">
        
        

        {/* Central Pin (Fixed) */}
        <div className="relative mt-2 animate-[pulse_3s_ease-in-out_infinite] opacity-60 pointer-events-none" style={{ filter: 'drop-shadow(0px 10px 15px rgba(0, 0, 0, 0.5))' }}>
          <svg width="44" height="58" viewBox="0 0 44 58" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -translate-y-1/2">
            <defs>
              <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <path d="M22 2C10.954 2 2 10.954 2 22C2 37 22 56 22 56C22 56 42 37 42 22C42 10.954 33.046 2 22 2Z" fill="url(#pinGrad)" stroke="white" strokeWidth="3"/>
            {/* Soft inner glow/highlight */}
            <path d="M22 4C11.5 4 4 11.5 4 22C4 32 18 48 22 52C26 48 40 32 40 22C40 11.5 32.5 4 22 4Z" fill="white" fillOpacity="0.15" />
            
            <g transform="translate(12, 11) scale(0.85)">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 6h18" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 10a4 4 0 0 1-8 0" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </svg>
          
          
        </div>
      </div>

      {/* Radar Effect CSS Overlay centered on user */}
        </div>

      {/* TOP FLOATING HEADER */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 safe-area-pt">
        <div className="flex gap-2 items-start">
          
          <button onClick={() => navigate(-1)} className="mt-1 flex-shrink-0 w-10 h-10 bg-white/95 backdrop-blur-xl rounded-xl flex items-center justify-center text-zinc-800 border border-zinc-200/60 shadow-lg">
             <X size={20} />
          </button>
          
          <div className="flex-1 space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-zinc-500" />
              </div>
              <input 
                type="text" 
                placeholder="Buscar tiendas..." 
                className="w-full bg-white/95 backdrop-blur-xl border border-zinc-200/60 rounded-2xl py-3 pl-10 pr-4 text-zinc-800 text-sm focus:outline-none focus:border-teal-500 transition-colors shadow-lg"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl border border-zinc-200/60 px-3 py-1.5 rounded-xl text-zinc-800 text-xs font-medium flex items-center gap-1">
                <SlidersHorizontal size={14} /> Filtros
              </button>
              <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl border border-zinc-200/60 px-3 py-1.5 rounded-xl text-zinc-800 text-xs font-medium flex items-center gap-1">
                <Store size={14} /> Ofertas
              </button>
              <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl border border-zinc-200/60 px-3 py-1.5 rounded-xl text-zinc-800 text-xs font-medium flex items-center gap-1">
                <Clock size={14} /> Abierto ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Buscar Aquí Button Repositioned */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex justify-center w-full">
        <AnimatePresence>
          {isMapMoved && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => {
                setIsMapMoved(false);
                setActiveSearchLocation({ lat: mapCenter.lat, lng: mapCenter.lng });
                fetchStores([mapCenter.lat, mapCenter.lng]);
              }}
              className="pointer-events-auto px-6 py-2.5 bg-amber-500 text-zinc-900 font-bold text-sm rounded-full shadow-[0_4px_20px_rgba(245,158,11,0.4)] border-2 border-white flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
              <Search size={16} /> Buscar en esta zona
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* FLOATING ACTION BUTTONS (RIGHT) */}
      <div className="absolute top-32 right-4 z-40 flex flex-col gap-3">
        <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-xl flex items-center justify-center text-zinc-800 border border-zinc-200/60 shadow-lg">
          <Settings size={20} />
        </button>
        <button onClick={centerOnUser} className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-xl flex items-center justify-center text-zinc-800 border border-zinc-200/60 shadow-lg">
          <Crosshair size={20} />
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

      {/* BOTTOM SHEET / STORE PREVIEW */}
      <AnimatePresence>
        {selectedStore ? (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl border-t border-zinc-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-6 pb-8"
          >
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6"></div>
            
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {selectedStore.config?.logoUrl || selectedStore.config?.storefront?.logoUrl ? (
                  <img src={selectedStore.config?.logoUrl || selectedStore.config?.storefront?.logoUrl} alt={selectedStore.name} className="w-full h-full object-cover" />
                ) : (
                  <Store size={24} className="text-zinc-500" />
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-zinc-800 font-bold text-lg leading-tight">{selectedStore.name}</h2>
                <p className="text-zinc-500 text-sm mt-1">{selectedStore.config?.business_type || 'Tienda'}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="flex items-center gap-1 text-amber-600 text-xs font-medium bg-amber-500/10 px-2 py-1 rounded-md">
                    <Navigation size={12} /> {selectedStore.distanceToUser ? (selectedStore.distanceToUser / 1000).toFixed(1) : (Math.random() * 5 + 0.5).toFixed(1)} km
                  </span>
                  <span className="text-zinc-500 text-xs">Aprox 15 min</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => navigate(`/store/${selectedStore.store_slug || selectedStore.id}`)}
              className="w-full bg-amber-500 text-white hover:bg-amber-600 font-black text-sm uppercase tracking-widest py-4 rounded-2xl mt-6 hover:bg-zinc-200 transition-colors"
            >
              Visitar Tienda
            </button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl border-t border-zinc-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-6 pb-8"
          >
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6"></div>
            <div className="flex flex-col items-center justify-center py-4">
              {isScanning ? (
                <>
                  <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-amber-500 animate-spin mb-4"></div>
                  <p className="text-zinc-800 font-bold">Escaneando zona...</p>
                  <p className="text-zinc-500 text-sm mt-1">Buscando comercios cercanos</p>
                </>
              ) : stores.length > 0 ? (
                <>
                  <Store size={32} className="text-amber-500 mb-3" />
                  <p className="text-zinc-800 font-bold text-lg">{stores.length} comercios encontrados</p>
                  <p className="text-zinc-500 text-sm mt-1">Toca un pin para ver detalles</p>
                </>
              ) : (
                <>
                  <Store size={32} className="text-zinc-600 mb-3" />
                  <p className="text-zinc-800 font-bold text-lg">No hay comercios</p>
                  <p className="text-zinc-500 text-sm mt-1">Intenta ampliar tu radio de búsqueda</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* Make sure Leaflet maps don't inherit z-index issues from Tailwind */
        .leaflet-container {
          z-index: 10;
          background: #0f172a; /* bg-slate-900 */
        }
        /* CSS Trick to make OSM tiles dark theme */
        .map-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>
    </div>
  );
}
