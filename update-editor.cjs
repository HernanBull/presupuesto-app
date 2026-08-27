const fs = require('fs');

let content = fs.readFileSync('src/components/ServiceEditor.jsx', 'utf8');

// 1. Estados
content = content.replace(
  "const [isUploading, setIsUploading] = React.useState(false);\n  const [uploadProgress, setUploadProgress] = React.useState(0);",
  "const [isSaving, setIsSaving] = React.useState(false);\n  const [uploadProgress, setUploadProgress] = React.useState(0);\n  const [pendingFiles, setPendingFiles] = React.useState([]);"
);

// 2. Funciones de archivo
const oldHandleFileUpload = `  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("El archivo supera el límite de 50MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(1); // Para mostrar la barra al 1% inmediatamente
    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', \`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-drive\`, true);
      xhr.setRequestHeader('Authorization', \`Bearer \${import.meta.env.VITE_SUPABASE_ANON_KEY}\`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        setUploadProgress(0);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          const newAttachment = {
            id: Date.now().toString(),
            originalName: data.originalName,
            url: data.url,
            mimetype: data.mimetype,
            size: data.size
          };
          updateLogbook('attachments', [...(logbook.attachments || []), newAttachment]);
        } else {
          let errorMsg = 'Desconocido';
          try {
            errorMsg = JSON.parse(xhr.responseText).error || errorMsg;
          } catch (e) {}
          alert("Error al subir: " + errorMsg);
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setUploadProgress(0);
        alert("Error de conexión al subir el archivo.");
      };

      xhr.send(formData);
    } catch (err) {
      console.error(err);
      alert("Error de conexión al subir el archivo.");
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      // Resetear el input file
      e.target.value = '';
    }
  };`;

const newHandleFileUpload = `  const uploadFileToDrive = (file, serviceName, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('serviceName', serviceName);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', \`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-drive\`, true);
      xhr.setRequestHeader('Authorization', \`Bearer \${import.meta.env.VITE_SUPABASE_ANON_KEY}\`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            reject(JSON.parse(xhr.responseText).error || 'Error desconocido');
          } catch (e) {
            reject('Error desconocido');
          }
        }
      };

      xhr.onerror = () => reject('Error de red');
      xhr.send(formData);
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("El archivo supera el límite de 50MB");
      return;
    }

    setPendingFiles(prev => [...prev, { file, id: Date.now().toString(), originalName: file.name, size: file.size }]);
    e.target.value = '';
  };

  const removePendingFile = (id) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    if (pendingFiles.length === 0) {
      onSave();
      return;
    }

    setIsSaving(true);
    let successfullyUploaded = [];
    let hasError = false;

    for (let i = 0; i < pendingFiles.length; i++) {
      const pending = pendingFiles[i];
      try {
        const data = await uploadFileToDrive(pending.file, service.name, (loaded, total) => {
           const baseProgress = (i / pendingFiles.length) * 100;
           const currentProgress = (loaded / total) * (100 / pendingFiles.length);
           setUploadProgress(Math.round(baseProgress + currentProgress));
        });

        successfullyUploaded.push({
          id: Date.now().toString() + i,
          originalName: data.originalName,
          url: data.url,
          mimetype: data.mimetype,
          size: data.size
        });
      } catch (err) {
        alert(\`Error al subir \${pending.originalName}: \${err}\`);
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      const finalAttachments = [...(logbook.attachments || []), ...successfullyUploaded];
      onChange({ ...service, logbook: { ...logbook, attachments: finalAttachments } });
      
      setTimeout(() => {
         setPendingFiles([]);
         setIsSaving(false);
         setUploadProgress(0);
         onSave();
      }, 100);
    } else {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };`;

content = content.replace(oldHandleFileUpload, newHandleFileUpload);

// 3. Botón de guardado
content = content.replace(
  `        <button \n          onClick={onSave}\n          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] w-full sm:w-auto justify-center"\n        >\n          <Save size={18} />\n          Guardar Servicio y Bitácora\n        </button>`,
  `        <button \n          onClick={handleSave}\n          disabled={isSaving}\n          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"\n        >\n          <Save size={18} />\n          Guardar Servicio y Bitácora\n        </button>`
);

// 4. Input UI
const oldInputUI = `<div className="relative rounded-lg overflow-hidden group bg-rose-50 dark:bg-rose-900/20 transition-all border border-rose-100 dark:border-rose-900/30">
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={isUploading}
                    />
                    
                    {/* Fondo de progreso que se va llenando */}
                    {isUploading && (
                      <div 
                        className="absolute top-0 left-0 h-full bg-rose-200 dark:bg-rose-800/80 transition-all duration-300 ease-out z-0"
                        style={{ width: \`\${uploadProgress}%\` }}
                      >
                        {/* Brillo animado interno */}
                        <div className="absolute inset-0 bg-white/30 dark:bg-white/10 animate-pulse"></div>
                      </div>
                    )}

                    <label 
                      htmlFor="file-upload"
                      className={cn(
                        "text-xs font-bold px-4 py-2.5 transition-all flex items-center justify-center gap-2 cursor-pointer relative z-10 select-none",
                        isUploading 
                          ? "text-rose-800 dark:text-rose-100 cursor-not-allowed" 
                          : "text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/50"
                      )}
                    >
                      {isUploading ? (
                        <>
                          <div className="relative flex items-center justify-center w-4 h-4">
                            {/* Icono saltando */}
                            <Upload size={14} className="absolute animate-bounce text-rose-700 dark:text-rose-200 drop-shadow-md" />
                          </div>
                          <span className="w-24 text-left font-extrabold tracking-wide drop-shadow-sm">Subiendo {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload size={15} className="group-hover:-translate-y-0.5 transition-transform" />
                          <span>Subir Archivo</span>
                        </>
                      )}
                    </label>
                  </div>`;

const newInputUI = `<div className="relative rounded-lg overflow-hidden group bg-rose-50 dark:bg-rose-900/20 transition-all border border-rose-100 dark:border-rose-900/30">
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                    <label 
                      htmlFor="file-upload"
                      className="text-xs font-bold px-4 py-2.5 transition-all flex items-center justify-center gap-2 cursor-pointer text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/50 select-none"
                    >
                      <Upload size={15} className="group-hover:-translate-y-0.5 transition-transform" />
                      <span>Añadir Archivo</span>
                    </label>
                  </div>`;

content = content.replace(oldInputUI, newInputUI);

// 5. Lista de archivos adjuntos (añadiendo pendingFiles)
const oldAttachmentsList = `{(!logbook.attachments || logbook.attachments.length === 0) ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No hay archivos adjuntos (PDFs, Word, Imágenes).</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {logbook.attachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl hover:border-rose-300 dark:hover:border-rose-500/50 transition-colors shadow-sm group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-500 p-2 rounded-lg shrink-0">
                            <FileText size={18} />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ver archivo"
                          >
                            <BookOpen size={16} />
                          </a>
                          <button 
                            onClick={() => removeAttachment(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar archivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}`;

const newAttachmentsList = `{(!logbook.attachments || logbook.attachments.length === 0) && pendingFiles.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No hay archivos adjuntos (PDFs, Word, Imágenes).</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Archivos ya subidos */}
                    {(logbook.attachments || []).map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl hover:border-rose-300 dark:hover:border-rose-500/50 transition-colors shadow-sm group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-500 p-2 rounded-lg shrink-0">
                            <FileText size={18} />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ver archivo"
                          >
                            <BookOpen size={16} />
                          </a>
                          <button 
                            onClick={() => removeAttachment(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar archivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Archivos pendientes de subir */}
                    {pendingFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 p-3 rounded-xl hover:border-orange-300 transition-colors shadow-sm group relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaTThgMTAgMExwMCAxMFoiIHN0cm9rZT0iI2ZiOTIzYyIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLW9wYWNpdHk9IjEiIHN0cm9rZS1vcGFjaXR5PSIwLjEiPjwvcGF0aD4KPC9zdmc+')] opacity-50"></div>
                        <div className="flex items-center gap-3 overflow-hidden relative z-10">
                          <div className="bg-orange-100 dark:bg-orange-900/40 text-orange-500 p-2 rounded-lg shrink-0">
                            <Clock size={18} />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-[10px] text-orange-500 font-semibold">
                              Pendiente • {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 relative z-10">
                          <button 
                            onClick={() => removePendingFile(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Quitar archivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}`;

content = content.replace(oldAttachmentsList, newAttachmentsList);

// 6. Añadir el Loading Overlay General
const returnStatement = `  return (\n    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4">`;
const overlayCode = `  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Overlay de Carga General al Guardar */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
             <div className="relative flex items-center justify-center w-16 h-16 mb-4">
               <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
               <Upload size={20} className="text-blue-500 animate-pulse" />
             </div>
             <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">Guardando Servicio...</h3>
             <p className="text-sm font-medium text-slate-500 mb-6 text-center">Creando carpetas y subiendo archivos a Google Drive.</p>
             
             {pendingFiles.length > 0 && (
               <div className="w-full">
                 <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                   <span>Progreso Total</span>
                   <span className="text-blue-500">{uploadProgress}%</span>
                 </div>
                 <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner relative">
                   <div className="absolute inset-0 bg-blue-500 transition-all duration-300 ease-out" style={{ width: \`\${uploadProgress}%\` }}>
                     <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
                   </div>
                 </div>
               </div>
             )}
          </div>
        </div>
      )}`;

content = content.replace(returnStatement, overlayCode);

fs.writeFileSync('src/components/ServiceEditor.jsx', content);
console.log("Updated ServiceEditor.jsx successfully.");
