import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Save, Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../../../supabaseClient';

// Fix for default Leaflet marker icon
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

export default function StoreLocationManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(null);
  
  const [position, setPosition] = useState(null); // {lat, lng}
  const [addressText, setAddressText] = useState('');
  
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  useEffect(() => {
    const wsId = localStorage.getItem('activeWorkspace');
    if (wsId) {
      setWorkspaceId(wsId);
      fetchConfig(wsId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchConfig = async (id) => {
    try {
      const { data: ws, error } = await supabase.from('workspaces').select('config').eq('id', id).single();
      if (ws && ws.config && ws.config.location) {
        setPosition({ lat: ws.config.location.lat, lng: ws.config.location.lng });
        setAddressText(ws.config.location.address || '');
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!position) return alert('Debes marcar una ubicación en el mapa primero.');
    
    setSaving(true);
    try {
      const { data: ws, error: fetchErr } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      if (fetchErr) throw fetchErr;
      
      const newConfig = {
        ...(ws?.config || {}),
        location: {
          lat: position.lat,
          lng: position.lng,
          address: addressText
        }
      };

      const { error: updateErr } = await supabase.from('workspaces').update({ config: newConfig }).eq('id', workspaceId);
      if (updateErr) throw updateErr;
      
      alert('Ubicación guardada con éxito.');
    } catch (e) {
      console.error(e);
      alert('Error al guardar la ubicación.');
    }
    setSaving(false);
  };

  const getLocationFromGPS = () => {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError('No se pudo obtener la ubicación. Por favor, asegúrate de haber dado los permisos en tu navegador/teléfono.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
      },
    });
    return null;
  }

  // Coordenadas por defecto si no hay ninguna (centro de Caracas, por ej.)
  const defaultCenter = { lat: 10.4806, lng: -66.9036 };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <MapPin className="text-amber-500" />
            Ubicación del Negocio
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Configura el punto exacto para que tus clientes lleguen por Google Maps.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !position}
          className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Guardar Cambios
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-white/5 space-y-6">
        
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex gap-3 text-blue-700 dark:text-blue-400 text-sm">
          <Info size={20} className="shrink-0 mt-0.5" />
          <div>
            <strong>Instrucciones:</strong> Presiona el botón de "Usar mi ubicación actual" estando físicamente en tu local (desde tu teléfono), o toca directamente sobre el mapa para fijar tu posición manualmente.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              Punto GPS
            </label>
            <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
               {position ? (
                 <span className="font-mono text-sm text-slate-600 dark:text-zinc-400">
                   {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                 </span>
               ) : (
                 <span className="text-sm text-slate-400 dark:text-zinc-600 italic">Ubicación no configurada</span>
               )}
            </div>
          </div>
          <button 
            onClick={getLocationFromGPS}
            disabled={gpsLoading}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {gpsLoading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
            Usar mi ubicación GPS
          </button>
        </div>

        {gpsError && <p className="text-red-500 text-xs font-bold">{gpsError}</p>}

        <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative z-0">
          <MapContainer 
            center={position || defaultCenter} 
            zoom={position ? 16 : 12} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {position && (
               <Marker position={position} />
            )}
            <MapClickHandler />
          </MapContainer>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
            Dirección Escrita (Opcional)
          </label>
          <input
            type="text"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder="Ej: Centro Comercial El Dorado, Piso 2, Local 25..."
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

      </div>
    </div>
  );
}
