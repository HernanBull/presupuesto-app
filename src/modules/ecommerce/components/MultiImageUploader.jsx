import React, { useRef, useState } from 'react';
import { UploadCloud, X, Star, Loader2, Image as ImageIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

/**
 * MultiImageUploader
 * Componente modular de alto nivel para gestionar múltiples imágenes por publicación.
 * - Soporta selección múltiple y Drag & Drop.
 * - Sube a Supabase Storage con compresión/ruta única: `ecommerce/${folder}/${workspaceId}/${timestamp}_${index}.${ext}`
 * - Permite elegir la foto de "Portada" (primera imagen).
 * - Permite reordenar y eliminar imágenes.
 */
export default function MultiImageUploader({
  images = [],
  onChange,
  maxImages = 8,
  folder = 'products',
  title = 'Galería de Imágenes',
  subtitle = 'Sube fotos en buena resolución. La primera imagen será la portada de tu publicación.'
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const workspaceId = localStorage.getItem('activeWorkspace') || 'general';

  // Subir archivos a Supabase Storage
  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      alert(`Has alcanzado el límite máximo de ${maxImages} imágenes.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);
    setUploadProgress(`Subiendo 1 de ${filesToUpload.length}...`);

    const newUploadedUrls = [];

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(`Subiendo ${i + 1} de ${filesToUpload.length}...`);

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const filePath = `${folder}/${workspaceId}/${cleanName}`;

        const { error: upErr } = await supabase.storage
          .from('ecommerce')
          .upload(filePath, file, { upsert: true });

        if (!upErr) {
          const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
          if (data?.publicUrl) {
            newUploadedUrls.push(data.publicUrl);
          }
        } else {
          console.warn('Fallo en Supabase Storage, recurriendo a base64 local temporal:', upErr);
          const base64 = await fileToBase64(file);
          newUploadedUrls.push(base64);
        }
      }

      if (newUploadedUrls.length > 0) {
        const updated = [...images, ...newUploadedUrls];
        onChange(updated);
      }
    } catch (err) {
      console.error('Error al subir imágenes:', err);
      alert('Ocurrió un detalle al procesar una o más imágenes.');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  // Acciones en la galería
  const setAsCover = (index) => {
    if (index === 0) return;
    const item = images[index];
    const rest = images.filter((_, i) => i !== index);
    onChange([item, ...rest]);
  };

  const moveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  };

  const removeImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ImageIcon size={16} className="text-amber-500" />
            {title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle} ({images.length}/{maxImages})
          </p>
        </div>
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= maxImages}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 disabled:opacity-40"
          >
            + Añadir más
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />

      {/* Grid de Imágenes Cargadas */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((url, idx) => {
            const isCover = idx === 0;
            return (
              <div
                key={`${url}-${idx}`}
                className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all bg-slate-100 dark:bg-slate-800 ${
                  isCover
                    ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                }`}
              >
                <img
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover select-none"
                />

                {/* Badge de Portada */}
                {isCover ? (
                  <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                    <Star size={11} fill="currentColor" /> PORTADA
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAsCover(idx)}
                    title="Establecer como foto de portada"
                    className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm backdrop-blur-xs"
                  >
                    <Star size={10} /> Portada
                  </button>
                )}

                {/* Botón de Eliminar */}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  title="Eliminar foto"
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={13} />
                </button>

                {/* Controles de orden hacia izquierda / derecha */}
                <div className="absolute bottom-2 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx > 0 ? (
                    <button
                      type="button"
                      onClick={() => moveImage(idx, idx - 1)}
                      title="Mover adelante"
                      className="w-6 h-6 rounded-lg bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs"
                    >
                      <ArrowLeft size={12} />
                    </button>
                  ) : <div />}

                  {idx < images.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => moveImage(idx, idx + 1)}
                      title="Mover atrás"
                      className="w-6 h-6 rounded-lg bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs"
                    >
                      <ArrowRight size={12} />
                    </button>
                  ) : <div />}
                </div>
              </div>
            );
          })}

          {/* Slot para agregar más dentro del grid si no ha llegado al tope */}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-500/5 transition-all flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-500"
            >
              <UploadCloud size={22} />
              <span className="text-[11px] font-bold">Agregar</span>
            </button>
          )}
        </div>
      )}

      {/* Zona Drag & Drop cuando no hay imágenes cargadas */}
      {images.length === 0 && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center gap-3 transition-all ${
            dragActive
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-amber-500/5'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
            {uploading ? (
              <Loader2 size={26} className="animate-spin text-amber-500" />
            ) : (
              <UploadCloud size={28} />
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {uploading ? uploadProgress : 'Haz clic o arrastra fotos aquí'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Puedes subir varias fotos a la vez (PNG, JPG, WEBP). Hasta {maxImages} fotos por publicación.
            </p>
          </div>

          {!uploading && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              Seleccionar Archivos
            </button>
          )}
        </div>
      )}

      {/* Indicador de subida activa en caso de fotos adicionales */}
      {uploading && images.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400">
          <Loader2 size={16} className="animate-spin" />
          <span>{uploadProgress || 'Subiendo imágenes a la nube...'}</span>
        </div>
      )}
    </div>
  );
}
