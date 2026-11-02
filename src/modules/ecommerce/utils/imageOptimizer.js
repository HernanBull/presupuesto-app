/**
 * Utilidad de optimización y centrado automático de imágenes de tiendas.
 * 
 * - Para 'logo': Centra el contenido en un lienzo cuadrado (512x512) con margen de seguridad
 *   para que encaje perfecto en el avatar circular sin cortar bordes ni texto.
 * - Para 'cover' (portada/banner): Escala y centra a proporción panorámica (1200x500)
 *   evitando distorsión y descentrado vertical u horizontal.
 */

export async function optimizeStoreImage(file, type = 'logo') {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          if (type === 'logo') {
            // Lienzo cuadrado 512x512
            canvas.width = 512;
            canvas.height = 512;

            // Fondo blanco limpio por defecto
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);

            // Mantener margen de seguridad (10% en cada borde) para recorte circular
            const safePadding = 50;
            const maxW = 512 - safePadding * 2;
            const maxH = 512 - safePadding * 2;

            const scale = Math.min(maxW / img.width, maxH / img.height, 1.0);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const drawX = (512 - drawW) / 2;
            const drawY = (512 - drawH) / 2;

            ctx.drawImage(img, drawX, drawY, drawW, drawH);

            canvas.toBlob((blob) => {
              if (blob) {
                const optimizedFile = new File([blob], `optimized_${file.name.replace(/\.[^.]+$/, '')}.webp`, {
                  type: 'image/webp'
                });
                resolve(optimizedFile);
              } else {
                resolve(file);
              }
            }, 'image/webp', 0.92);

          } else if (type === 'cover') {
            // Portada panorámica estándar 1200x500 (2.4:1)
            canvas.width = 1200;
            canvas.height = 500;

            // Dibujar fondo suavemente desenfocado para evitar bordes vacíos si el ratio es vertical
            const bgScale = Math.max(1200 / img.width, 500 / img.height);
            const bgW = img.width * bgScale;
            const bgH = img.height * bgScale;
            const bgX = (1200 - bgW) / 2;
            const bgY = (500 - bgH) / 2;

            ctx.filter = 'blur(16px)';
            ctx.drawImage(img, bgX - 20, bgY - 20, bgW + 40, bgH + 40);
            ctx.filter = 'none';

            // Capa oscura suave sobre el desenfoque
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(0, 0, 1200, 500);

            // Dibujar imagen principal perfectamente centrada
            // Si la imagen es horizontal/panorámica la centramos cubriendo o conteniendo armónicamente
            const isWide = img.width / img.height >= 1.5;
            let mainScale, mainW, mainH, mainX, mainY;

            if (isWide) {
              mainScale = Math.max(1200 / img.width, 500 / img.height);
              mainW = img.width * mainScale;
              mainH = img.height * mainScale;
              mainX = (1200 - mainW) / 2;
              mainY = (500 - mainH) / 2;
            } else {
              // Si es vertical o cuadrada, la contenemos en altura y la centramos
              mainScale = 500 / img.height;
              mainW = img.width * mainScale;
              mainH = 500;
              mainX = (1200 - mainW) / 2;
              mainY = 0;
            }

            ctx.drawImage(img, mainX, mainY, mainW, mainH);

            canvas.toBlob((blob) => {
              if (blob) {
                const optimizedFile = new File([blob], `optimized_${file.name.replace(/\.[^.]+$/, '')}.webp`, {
                  type: 'image/webp'
                });
                resolve(optimizedFile);
              } else {
                resolve(file);
              }
            }, 'image/webp', 0.90);
          } else {
            resolve(file);
          }
        } catch (err) {
          console.warn("Fallo en optimización de imagen, usando original:", err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
