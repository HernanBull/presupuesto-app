@echo off
setlocal
echo ========================================================
echo  [AxonMarket] Actualizando repositorio a Cloudflare Pages
echo ========================================================

set "MSG=%~1"
if "%MSG%"=="" set "MSG=feat: sincronizacion rapida Cloudflare"

git add .
git commit -m "%MSG%"
if errorlevel 1 (
    echo No hay cambios nuevos para commitear.
)

echo Enviando a la rama main...
git push origin main

echo ========================================================
echo  [AxonMarket] Despliegue enviado a Cloudflare exitosamente!
echo ========================================================
