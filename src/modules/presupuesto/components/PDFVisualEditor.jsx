import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { X, ChevronLeft, ChevronRight, Download, Type, PenTool, ZoomIn, ZoomOut, CheckCircle, Palette, MousePointer2 } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Subcomponente para firma a mano alzada
const SignaturePad = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevenir scroll en móviles
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a'; // Slate 900
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    // Chequear si el canvas está vacío de forma sencilla (opcional)
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <PenTool size={20} className="text-indigo-600" />
          Dibuja tu Firma
        </h3>
        <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative overflow-hidden mb-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full h-[200px] cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <div className="flex justify-between items-center gap-3">
          <button onClick={clear} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
            Limpiar
          </button>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              Cancelar
            </button>
            <button onClick={save} className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function PDFVisualEditor({ contractUrl, contractName, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [annotations, setAnnotations] = useState([]); // { id, type: 'text'|'signature', pageNum, text, dataUrl, percentX, percentY, fontSize, color }
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [tool, setTool] = useState('text'); // 'pointer', 'text', 'signature'
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  
  // Opciones globales para nuevos textos
  const [activeColor, setActiveColor] = useState('#0f172a'); // slate-900 (Negro)
  const [activeFontSize, setActiveFontSize] = useState(12);

  // Drag state
  const [draggingAnnId, setDraggingAnnId] = useState(null);
  const containerRef = useRef(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const handlePageClick = (e) => {
    if (tool !== 'text') return;
    if (e.target.tagName.toLowerCase() === 'input' || e.target.closest('.annotation-item')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = x / rect.width;
    const percentY = y / rect.height;

    setAnnotations([
      ...annotations,
      {
        id: Date.now().toString(),
        type: 'text',
        pageNum: pageNumber,
        text: '',
        percentX,
        percentY,
        fontSize: activeFontSize,
        color: activeColor,
      }
    ]);
  };

  const handleAddSignature = (dataUrl) => {
    setShowSignaturePad(false);
    // Colocar la firma en el centro de la página actual
    setAnnotations([
      ...annotations,
      {
        id: Date.now().toString(),
        type: 'signature',
        pageNum: pageNumber,
        dataUrl,
        percentX: 0.4,
        percentY: 0.5,
        width: 150, // width de renderizado en px relativos
        height: 75,
      }
    ]);
    setTool('pointer');
  };

  const handleUpdateAnnotation = (id, updates) => {
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, ...updates } : ann
    ));
  };

  const handleDeleteAnnotation = (id) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
  };

  // Lógica Drag & Drop
  const handlePointerDown = (e, id) => {
    if (tool !== 'pointer') return;
    e.stopPropagation();
    setDraggingAnnId(id);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!draggingAnnId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    // Limitar dentro del contenedor
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    const percentX = x / rect.width;
    const percentY = y / rect.height;

    handleUpdateAnnotation(draggingAnnId, { percentX, percentY });
  };

  const handlePointerUp = (e) => {
    if (draggingAnnId) {
      setDraggingAnnId(null);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  const hexToRgbLib = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? rgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ) : rgb(0,0,0);
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(contractUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const ann of annotations) {
        if (ann.type === 'text' && !ann.text.trim()) continue;

        const page = pdfDoc.getPage(ann.pageNum - 1);
        const { width, height } = page.getSize();
        
        const pdfX = ann.percentX * width;
        const pdfY = height - (ann.percentY * height); 

        if (ann.type === 'text') {
          // Ajuste fino para la línea base de la fuente
          const adjustedY = pdfY - (ann.fontSize * 0.8);
          page.drawText(ann.text, {
            x: pdfX,
            y: adjustedY,
            size: ann.fontSize,
            font: font,
            color: hexToRgbLib(ann.color),
          });
        } else if (ann.type === 'signature') {
          const pngImage = await pdfDoc.embedPng(ann.dataUrl);
          const pngDims = pngImage.scale(0.5); // Escalar la firma
          
          page.drawImage(pngImage, {
            x: pdfX,
            y: pdfY - pngDims.height, // Ajuste para que se dibuje hacia abajo
            width: pngDims.width,
            height: pngDims.height,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrato_Editado_${contractName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("¡PDF generado y descargado correctamente!");
      onClose();
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      {/* Modales Secundarios */}
      {showSignaturePad && (
        <SignaturePad 
          onSave={handleAddSignature} 
          onCancel={() => setShowSignaturePad(false)} 
        />
      )}

      {/* Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
            title="Cerrar sin guardar"
          >
            <X size={24} />
          </button>
          <div className="hidden sm:block">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Type className="text-indigo-500" size={18} />
              Editor Premium
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
              {contractName}
            </p>
          </div>
        </div>

        {/* Herramientas Centrales */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setTool('pointer')}
            className={cn("p-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all", tool === 'pointer' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
            title="Seleccionar y Arrastrar"
          >
            <MousePointer2 size={18} />
            <span className="hidden md:inline">Mover</span>
          </button>
          <button
            onClick={() => setTool('text')}
            className={cn("p-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all", tool === 'text' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
            title="Añadir Texto"
          >
            <Type size={18} />
            <span className="hidden md:inline">Texto</span>
          </button>
          <button
            onClick={() => { setTool('signature'); setShowSignaturePad(true); }}
            className={cn("p-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all", tool === 'signature' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
            title="Añadir Firma"
          >
            <PenTool size={18} />
            <span className="hidden md:inline">Firma</span>
          </button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          
          {/* Controles de Formato Rápido (Aplica a nuevas anotaciones) */}
          <div className="flex items-center gap-1">
            <select 
              value={activeFontSize} 
              onChange={(e) => setActiveFontSize(Number(e.target.value))}
              className="bg-transparent text-sm text-slate-700 dark:text-slate-300 font-medium outline-none cursor-pointer p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
              title="Tamaño de letra"
            >
              {[10, 11, 12, 14, 16, 18, 24].map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
            <div className="flex items-center gap-1 px-1">
              <button onClick={() => setActiveColor('#0f172a')} className={cn("w-5 h-5 rounded-full border-2", activeColor === '#0f172a' ? "border-indigo-500 scale-110" : "border-transparent hover:scale-110")} style={{backgroundColor: '#0f172a'}} title="Negro"></button>
              <button onClick={() => setActiveColor('#1d4ed8')} className={cn("w-5 h-5 rounded-full border-2", activeColor === '#1d4ed8' ? "border-indigo-500 scale-110" : "border-transparent hover:scale-110")} style={{backgroundColor: '#1d4ed8'}} title="Azul"></button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ZoomOut size={18} />
            </button>
            <span className="text-xs font-bold text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ZoomIn size={18} />
            </button>
          </div>

          <button 
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="px-4 sm:px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Download size={18} />
            )}
            <span className="hidden sm:inline">Guardar PDF</span>
          </button>
        </div>
      </div>

      {/* Paginador Inferior Flotante */}
      {numPages && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-slate-200/50 dark:border-slate-700/50 transition-all">
          <button 
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 text-slate-700 dark:text-slate-200 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-sm font-bold text-slate-800 dark:text-white min-w-[70px] text-center">
            Pág {pageNumber} / {numPages}
          </span>
          <button 
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="p-1.5 text-slate-700 dark:text-slate-200 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {/* Visor PDF y Canvas de Edición */}
      <div 
        className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-12 flex justify-center custom-scrollbar"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div 
          className="relative shadow-2xl transition-transform duration-200 origin-top" 
          style={{ transform: `scale(${zoom})` }}
        >
          <Document
            file={contractUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-20 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                Cargando formato de alta calidad...
              </div>
            }
          >
            <div 
              className={cn("relative bg-white transition-colors", tool === 'text' ? 'cursor-text' : tool === 'pointer' ? 'cursor-default' : 'cursor-crosshair')}
              onClick={handlePageClick}
              ref={containerRef}
            >
              <Page 
                pageNumber={pageNumber} 
                width={850} // Aumentamos la resolución base para mejor legibilidad
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="pointer-events-none select-none" 
              />
              
              {/* Capa de Anotaciones */}
              {annotations.filter(ann => ann.pageNum === pageNumber).map((ann) => (
                <div 
                  key={ann.id}
                  className={cn(
                    "annotation-item absolute group flex flex-col items-start origin-top-left",
                    tool === 'pointer' && "cursor-move",
                    draggingAnnId === ann.id && "z-50 opacity-80"
                  )}
                  style={{
                    left: `${ann.percentX * 100}%`,
                    top: `${ann.percentY * 100}%`,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, ann.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Handle para mover si estamos en modo pointer */}
                  {tool === 'pointer' && (
                    <div className="absolute -top-3 -left-3 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md scale-75 cursor-move">
                      <MousePointer2 size={12} />
                    </div>
                  )}

                  {ann.type === 'text' ? (
                    <input
                      autoFocus={!draggingAnnId}
                      type="text"
                      value={ann.text}
                      readOnly={tool === 'pointer'}
                      onChange={(e) => handleUpdateAnnotation(ann.id, { text: e.target.value })}
                      placeholder="Escribe aquí..."
                      className={cn(
                        "bg-transparent text-transparent px-1 py-0.5 outline-none font-sans leading-none min-w-[20px] transition-all",
                        tool === 'pointer' ? "pointer-events-none" : "border border-dashed border-indigo-300 focus:border-indigo-500 focus:bg-indigo-50/50 shadow-sm backdrop-blur-sm"
                      )}
                      style={{ 
                        fontSize: `${ann.fontSize * (850 / 595.28)}px`, // Escalar fuente relativo al canvas (595 es A4 real)
                        color: ann.color,
                        caretColor: ann.color,
                        // Hack para mostrar color pero permitir background en edición
                        WebkitTextFillColor: ann.color 
                      }}
                    />
                  ) : (
                    <div className="relative border-2 border-dashed border-transparent group-hover:border-indigo-300 rounded p-1 transition-colors">
                      <img 
                        src={ann.dataUrl} 
                        alt="Firma" 
                        style={{ width: `${ann.width}px`, height: `${ann.height}px` }}
                        className={cn(tool === 'pointer' ? "pointer-events-none" : "")}
                        draggable={false}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteAnnotation(ann.id)}
                    className="absolute -right-3 -top-3 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-10"
                    title="Eliminar"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
}
