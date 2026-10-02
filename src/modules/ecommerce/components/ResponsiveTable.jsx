import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * ResponsiveTable:
 * Muestra una tabla normal en pantallas grandes (md:table)
 * Y usa tarjetas apiladas en móviles (md:hidden)
 * 
 * @param {Array} headers - { key: string, label: string, className?: string }
 * @param {Array} data - Array of objects
 * @param {Function} renderMobileCard - (row, index) => ReactNode (Custom render para móviles)
 * @param {Function} renderDesktopRow - (row, index) => ReactNode (Custom render para desktop TRs)
 * @param {String} emptyMessage - Mensaje cuando no hay data
 */
export default function ResponsiveTable({ 
  headers, 
  data, 
  renderMobileCard, 
  renderDesktopRow, 
  emptyMessage = "No hay datos disponibles" 
}) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-white/5">
        <p className="text-slate-500 dark:text-slate-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full font-sans">
      {/* Vista Móvil (< 768px): Lista de Tarjetas */}
      <div className="md:hidden flex flex-col gap-4">
        {data.map((row, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm"
          >
            {renderMobileCard ? renderMobileCard(row, index) : (
              // Default Mobile Render fallback
              <div className="space-y-3">
                {headers.map((header) => (
                  <div key={header.key} className="flex justify-between items-center text-sm border-b border-slate-50 dark:border-white/5 pb-2 last:border-0 last:pb-0">
                    <span className="font-bold text-slate-500 dark:text-slate-400">{header.label}</span>
                    <span className="text-slate-900 dark:text-white font-semibold text-right max-w-[60%] truncate">
                      {row[header.key]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Vista Desktop (>= 768px): Tabla Clásica */}
      <div className="hidden md:block w-full overflow-x-auto bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-white/5">
              {headers.map((header) => (
                <th 
                  key={header.key} 
                  className={cn("p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider", header.className)}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {data.map((row, index) => (
              renderDesktopRow ? renderDesktopRow(row, index) : (
                // Default Desktop Render fallback
                <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors group">
                  {headers.map((header) => (
                    <td key={header.key} className={cn("p-4 text-sm font-medium text-slate-700 dark:text-zinc-300", header.className)}>
                      {row[header.key]}
                    </td>
                  ))}
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
