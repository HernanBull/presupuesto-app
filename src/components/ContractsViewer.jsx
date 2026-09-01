import React, { useState } from 'react';
import { FileText, Download, X, Scale, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Cargar todos los PDFs de la carpeta contratos
const pdfModules = import.meta.glob('../contratos/*.pdf', { eager: true, import: 'default' });

const contracts = Object.entries(pdfModules).map(([path, url]) => {
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
          Biblioteca de Contratos
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base max-w-2xl">
          Repositorio central de documentos legales. Visualiza o descarga los formatos en PDF para llenarlos utilizando tu editor favorito.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {contracts.map((contract) => (
          <div 
            key={contract.id}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
            
            <div className="bg-indigo-50 dark:bg-indigo-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight mb-2 flex-1">
              {contract.name}
            </h3>
            
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-2.5 rounded-xl transition-colors"
                onClick={() => setSelectedPdf(contract)}
              >
                <Eye size={16} />
                Visualizar
              </button>
              <a 
                href={contract.url}
                download={`${contract.name}.pdf`}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-center"
              >
                <Download size={16} />
                Descargar
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Visor de PDF Estático */}
      {selectedPdf && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="text-indigo-500" size={20} />
                {selectedPdf.name}
              </h3>
              <div className="flex items-center gap-3">
                <a 
                  href={selectedPdf.url}
                  download={`${selectedPdf.name}.pdf`}
                  className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">Descargar PDF</span>
                </a>
                <button 
                  onClick={() => setSelectedPdf(null)}
                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                  title="Cerrar"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden relative">
              <iframe 
                src={`${selectedPdf.url}#toolbar=0`} 
                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white absolute inset-0 sm:inset-4"
                title="Visor PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
