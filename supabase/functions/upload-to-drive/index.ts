import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Función auxiliar para obtener o crear una carpeta en Google Drive
async function getOrCreateFolder(folderName: string, parentId: string, accessToken: string) {
  // 1. Buscar la carpeta
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!searchRes.ok) {
    throw new Error(`Error buscando carpeta ${folderName}: ${await searchRes.text()}`);
  }
  
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    // Si existe, retornamos el ID de la primera coincidencia
    return searchData.files[0].id;
  }

  // 2. Si no existe, crear la carpeta
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });

  if (!createRes.ok) {
    throw new Error(`Error creando carpeta ${folderName}: ${await createRes.text()}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    // Nuevo: El nombre del servicio para estructurar carpetas
    let serviceName = formData.get('serviceName');
    
    if (!serviceName || typeof serviceName !== 'string' || serviceName.trim() === '') {
      serviceName = 'Servicios sin Clasificar';
    }

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No se envió un archivo válido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
    const rootFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");

    if (!clientId || !clientSecret || !refreshToken || !rootFolderId) {
       throw new Error("Faltan variables de entorno de Google OAuth o Folder ID.");
    }

    // 1. Obtener Access Token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
       console.error("Error al obtener access token:", tokenData);
       throw new Error(`Google Auth Error: ${JSON.stringify(tokenData)}`);
    }
    const accessToken = tokenData.access_token;

    // 2. Estructura de Carpetas Dinámica
    // Root -> "Catalogo" -> "Nombre del Servicio"
    const catalogFolderId = await getOrCreateFolder('Catalogo', rootFolderId, accessToken);
    const serviceFolderId = await getOrCreateFolder(serviceName, catalogFolderId, accessToken);

    // 3. Iniciar subida "resumable" en la carpeta del servicio
    const metadata = {
      name: `${Date.now()}_${file.name}`,
      parents: [serviceFolderId]
    };

    const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type || 'application/octet-stream'
      },
      body: JSON.stringify(metadata)
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      console.error("Error iniciando subida:", err);
      throw new Error(`Error iniciando subida a Google Drive: ${err}`);
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      throw new Error("Google Drive no devolvió URL de subida resumible.");
    }

    // 4. Subir el archivo real
    const fileBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': fileBuffer.byteLength.toString(),
      },
      body: fileBuffer
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      console.error("Error en subida de archivo:", uploadData);
      throw new Error(`Google Drive API Error (Subida): ${JSON.stringify(uploadData)}`);
    }

    // 5. Configurar permisos (hacer público)
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });

    // 6. Obtener link
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}?fields=webViewLink,webContentLink`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const fileData = await fileRes.json();

    return new Response(
      JSON.stringify({
        id: uploadData.id,
        originalName: file.name,
        url: fileData.webViewLink,
        mimetype: file.type,
        size: file.size
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Error general:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
