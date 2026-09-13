$ErrorActionPreference = "Stop"

$vaultPath = "F:\memoria\contexto presupuesto\Presupuesto"
$pluginDir = "$vaultPath\.obsidian\plugins\obsidian-local-rest-api"

Write-Host "Creando directorio del plugin..."
New-Item -Path $pluginDir -ItemType Directory -Force | Out-Null

Write-Host "Obteniendo la última versión de GitHub..."
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/coddingtonbear/obsidian-local-rest-api/releases/latest"

$mainJsAsset = $release.assets | Where-Object { $_.name -eq 'main.js' }
$manifestAsset = $release.assets | Where-Object { $_.name -eq 'manifest.json' }
$stylesAsset = $release.assets | Where-Object { $_.name -eq 'styles.css' }

Write-Host "Descargando archivos..."
Invoke-WebRequest -Uri $mainJsAsset.browser_download_url -OutFile "$pluginDir\main.js"
Invoke-WebRequest -Uri $manifestAsset.browser_download_url -OutFile "$pluginDir\manifest.json"

if ($stylesAsset) {
    Invoke-WebRequest -Uri $stylesAsset.browser_download_url -OutFile "$pluginDir\styles.css"
}

Write-Host "Habilitando el plugin en community-plugins.json..."
$communityPluginsPath = "$vaultPath\.obsidian\community-plugins.json"
$plugins = @()

if (Test-Path $communityPluginsPath) {
    $content = Get-Content $communityPluginsPath -Raw
    if (![string]::IsNullOrWhiteSpace($content)) {
        $plugins = $content | ConvertFrom-Json
    }
}

if ("obsidian-local-rest-api" -notin $plugins) {
    $plugins += "obsidian-local-rest-api"
    $plugins | ConvertTo-Json | Set-Content $communityPluginsPath
}

Write-Host "¡Plugin instalado y habilitado exitosamente!"
