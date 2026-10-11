import React from 'react';

const MapSettingsModal = ({ isOpen, onClose, scanRadius, setScanRadius }) => {
  if (!isOpen) return null;

  const [localRadius, setLocalRadius] = React.useState(scanRadius);

  React.useEffect(() => {
    if (isOpen) {
      setLocalRadius(scanRadius);
    }
  }, [isOpen, scanRadius]);

  const handleApply = () => {
    setScanRadius(localRadius);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#111111] rounded-[32px] p-6 shadow-2xl border border-white/10 relative overflow-hidden">
        
        {/* Title */}
        <h2 className="text-xl font-bold text-zinc-100 text-center mb-6 tracking-tight">Radio de búsqueda</h2>

        {/* Distancia analizada */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-zinc-200">Distancia analizada</h3>
            <span className="text-sm font-bold text-amber-500">
              {(localRadius / 1000).toFixed(1)} km <span className="text-xs text-zinc-500">({localRadius} m)</span>
            </span>
          </div>
          
          <input 
            type="range" 
            min="500" 
            max="10000" 
            step="100"
            value={localRadius}
            onChange={(e) => setLocalRadius(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #f59e0b;
              cursor: pointer;
              box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
            }
          `}</style>
          
          <p className="text-[12px] text-zinc-400 mt-3 leading-snug text-center">
            Define la distancia máxima alrededor de tu ubicación para detectar comercios.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm rounded-2xl transition-colors border border-zinc-700"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleApply}
            className="flex-1 py-3 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold text-sm rounded-2xl transition-colors shadow-lg"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapSettingsModal;
