import React from 'react';
import { X } from 'lucide-react';

const MapSettingsModal = ({ isOpen, onClose, scanRadius, setScanRadius, showZones, setShowZones, onlyMalls, setOnlyMalls }) => {
  if (!isOpen) return null;

  // Local state for the slider to show immediate updates before applying
  const [localRadius, setLocalRadius] = React.useState(scanRadius);
  const [localShowZones, setLocalShowZones] = React.useState(showZones);
  const [localOnlyMalls, setLocalOnlyMalls] = React.useState(onlyMalls);

  React.useEffect(() => {
    if (isOpen) {
      setLocalRadius(scanRadius);
      setLocalShowZones(showZones);
      setLocalOnlyMalls(onlyMalls);
    }
  }, [isOpen, scanRadius, showZones, onlyMalls]);

  const handleApply = () => {
    setScanRadius(localRadius);
    setShowZones(localShowZones);
    setOnlyMalls(localOnlyMalls);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#111111] rounded-[32px] p-6 shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-8 tracking-tight">Ajustes del mapa</h2>

        {/* Mostrar Zonas */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 pr-4">
            <h3 className="text-base font-medium text-zinc-200">Mostrar zonas</h3>
            <p className="text-[13px] text-zinc-500 mt-1 leading-snug">Muestra en el mapa las zonas donde se concentran los restaurantes cercanos</p>
          </div>
          <button 
            onClick={() => setLocalShowZones(!localShowZones)}
            className={`w-12 h-7 rounded-full flex items-center transition-colors px-1 flex-shrink-0 ${localShowZones ? 'bg-amber-500' : 'bg-zinc-700'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${localShowZones ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Centros comerciales */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 pr-4">
            <h3 className="text-base font-medium text-zinc-200">Centros comerciales</h3>
            <p className="text-[13px] text-zinc-500 mt-1 leading-snug">Deja el mapa solo con los centros comerciales de la zona</p>
          </div>
          <button 
            onClick={() => setLocalOnlyMalls(!localOnlyMalls)}
            className={`w-12 h-7 rounded-full flex items-center transition-colors px-1 flex-shrink-0 ${localOnlyMalls ? 'bg-amber-500' : 'bg-zinc-700'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${localOnlyMalls ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Distancia analizada */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-medium text-zinc-200">Distancia analizada</h3>
            <span className="text-sm font-medium text-zinc-300">{localRadius} m</span>
          </div>
          
          <input 
            type="range" 
            min="500" 
            max="10000" 
            step="100"
            value={localRadius}
            onChange={(e) => setLocalRadius(parseInt(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #84ccb4; /* tealish indicator matching original img */
              cursor: pointer;
            }
          `}</style>
          
          <p className="text-[13px] text-zinc-500 mt-4 leading-snug text-center">Radio de búsqueda alrededor de tu ubicación</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 bg-zinc-800/80 hover:bg-zinc-700 text-white font-bold text-sm rounded-2xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 py-3.5 bg-white text-black hover:bg-zinc-200 font-bold text-sm rounded-2xl transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapSettingsModal;
