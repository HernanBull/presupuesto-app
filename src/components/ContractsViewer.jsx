import React, { useState } from 'react';
import { FileText, Download, Eye, X, Scale } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Cargar todos los PDFs de la carpeta contratos
const pdfModules = import.meta.glob('../contratos/*.pdf', { eager: true, import: 'default' });

const contracts = Object.entries(pdfModules).map(([path, url]) => {
  // Extraer el nombre del archivo sin la extensión y reemplazar guiones bajos por espacios
  const fileName = path.split('/').pop().replace('.pdf', '');
  const displayName = fileName.replace(/_/g, ' ');
  
  return {
    id: fileName,
    name: displayName,
    url: url
  };
});

export function ContractsViewer() {
  const [selectedPdf, setSelectedPdf] = useState(null);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <Scale className="text-indigo-600 dark:text-indigo-400" size={32} />
          Contratos Legales
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base max-w-2xl">
          Documentos y formatos legales listos para visualizar y descargar. Selecciona un documento para verlo en detalle.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {contracts.map((contract) => (
          <div 
            key={contract.id}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 flex flex-col h-full cursor-pointer relative overflow-hidden"
            onClick={() => setSelectedPdf(contract.url)}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
            
            <div className="bg-indigo-50 dark:bg-indigo-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight mb-2 flex-1">
              {contract.name}
            </h3>
            
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 py-2 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPdf(contract.url);
                }}
              >
                <Eye size={16} />
                Ver
              </button>
              <a 
                href={contract.url}
                download={`${contract.name}.pdf`}
                className="flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Descargar PDF"
              >
                <Download size={20} />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Visor de PDF */}
      {selectedPdf && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="text-indigo-500" size={20} />
                Visor de Documento
              </h3>
              <div className="flex items-center gap-2">
                <a 
                  href={selectedPdf}
                  download
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Descargar</span>
                </a>
                <button 
                  onClick={() => setSelectedPdf(null)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden">
              <iframe 
                src={`${selectedPdf}#toolbar=0`} 
                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white"
                title="Visor PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
