#!/usr/bin/env python3
"""
Script utilitario para centrar y adaptar imágenes de tiendas (Logo y Portada)
Uso:
    python center_store_images.py --input /ruta/a/imagen.jpg --type logo --output /ruta/a/salida.webp
    python center_store_images.py --input /ruta/a/portada.jpg --type cover --output /ruta/a/salida_cover.webp
"""

import sys
import os
import argparse

try:
    from PIL import Image, ImageFilter
except ImportError:
    print("Se requiere Pillow: pip install Pillow")
    sys.exit(1)


def process_logo(img_path, output_path, size=512, safe_margin=0.12):
    """
    Centra el logotipo en un lienzo cuadrado (512x512) con margen de seguridad
    para que se vea completo y nunca recortado dentro de avatares circulares.
    """
    with Image.open(img_path) as im:
        im = im.convert("RGBA")
        w, h = im.size

        # Canvas cuadrado blanco o transparente
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))

        # Espacio útil dentro del margen circular
        max_dim = int(size * (1 - safe_margin * 2))
        scale = min(max_dim / w, max_dim / h, 1.0)

        new_w = int(w * scale)
        new_h = int(h * scale)

        resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

        pos_x = (size - new_w) // 2
        pos_y = (size - new_h) // 2

        canvas.paste(resized, (pos_x, pos_y), resized)

        # Guardar en WebP de alta calidad
        canvas.convert("RGB").save(output_path, "WEBP", quality=92)
        print(f"✅ Logo centrado y procesado exitosamente: {output_path} ({size}x{size})")


def process_cover(img_path, output_path, target_w=1200, target_h=500):
    """
    Centra la imagen de portada/banner panorámico (1200x500).
    Rellena los bordes con desenfoque suave para fotos que no sean panorámicas,
    evitando distorsión y descentrado visual.
    """
    with Image.open(img_path) as im:
        im = im.convert("RGB")
        w, h = im.size

        # Canvas base
        canvas = Image.new("RGB", (target_w, target_h))

        # Fondo desenfocado
        bg_scale = max(target_w / w, target_h / h)
        bg_w = int(w * bg_scale)
        bg_h = int(h * bg_scale)
        bg_im = im.resize((bg_w, bg_h), Image.Resampling.LANCZOS)
        bg_im = bg_im.filter(ImageFilter.GaussianBlur(18))

        bg_x = (target_w - bg_w) // 2
        bg_y = (target_h - bg_h) // 2
        canvas.paste(bg_im, (bg_x, bg_y))

        # Dibujar imagen centrada
        aspect = w / h
        if aspect >= 1.5:
            # Panorámica: centrar cubriendo
            scale = max(target_w / w, target_h / h)
            new_w = int(w * scale)
            new_h = int(h * scale)
            resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
            x = (target_w - new_w) // 2
            y = (target_h - new_h) // 2
            canvas.paste(resized, (x, y))
        else:
            # Vertical o cuadrada: contener altura y centrar horizontalmente
            scale = target_h / h
            new_w = int(w * scale)
            resized = im.resize((new_w, target_h), Image.Resampling.LANCZOS)
            x = (target_w - new_w) // 2
            canvas.paste(resized, (x, 0))

        canvas.save(output_path, "WEBP", quality=90)
        print(f"✅ Portada centrada y procesada exitosamente: {output_path} ({target_w}x{target_h})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Centrador y optimizador de imágenes de tiendas AxonMarket")
    parser.add_argument("--input", "-i", required=True, help="Ruta de la imagen de entrada")
    parser.add_argument("--type", "-t", choices=["logo", "cover"], default="logo", help="Tipo de imagen: logo o cover")
    parser.add_argument("--output", "-o", default=None, help="Ruta de salida (por defecto: input_centered.webp)")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"❌ Error: El archivo {args.input} no existe.")
        sys.exit(1)

    output = args.output
    if not output:
        base, _ = os.path.splitext(args.input)
        output = f"{base}_centered.webp"

    if args.type == "logo":
        process_logo(args.input, output)
    else:
        process_cover(args.input, output)
