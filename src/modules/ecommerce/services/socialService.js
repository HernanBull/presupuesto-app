import { supabase } from '../../../supabaseClient';

/**
 * Servicio Centralizado de Interacciones Sociales (Axon Market Social Engine)
 * Maneja: Seguidores de Tienda, Me Gusta (Likes), Comentarios y Guardados en Favoritos.
 * Diseñado con persistencia universal en Supabase, compatibilidad de tipos (UUID/TEXT)
 * y sincronización en tiempo real entre múltiples cuentas y dispositivos.
 */

const LOCAL_STORAGE_PREFIX = 'axon_social_';

export const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || '').trim());

// Helper para convertir cualquier ID (incluso 'CUS-123456') a un UUID determinista v4 válido
export const toSocialUuid = (id) => {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  const str = String(id).trim();
  if (isUuid(str)) return str.toLowerCase();

  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const hex4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  const full = hex1 + hex2 + hex3 + hex4;

  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
};

// Helper para emitir cambios entre componentes
export const notifySocialUpdate = (eventType, detail) => {
  window.dispatchEvent(new CustomEvent('axon_social_updated', { detail: { eventType, ...detail } }));
};

// Comprobadores síncronos desde cache local (para evitar parpadeos y animaciones repetidas en la carga inicial)
export const isPostLikedLocally = (postId, customerId) => {
  if (!postId || !customerId) return false;
  try {
    const rawId = String(customerId);
    const uuidId = toSocialUuid(customerId);
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}likes_${postId}`);
    if (!raw) return false;
    const likes = JSON.parse(raw);
    return likes.includes(rawId) || likes.includes(uuidId);
  } catch (e) {
    return false;
  }
};

export const isStoreFollowedLocally = (workspaceId, customerId) => {
  if (!workspaceId || !customerId) return false;
  try {
    const rawId = String(customerId);
    const uuidId = toSocialUuid(customerId);
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}followers_${workspaceId}`);
    if (!raw) return false;
    const followers = JSON.parse(raw);
    return followers.includes(rawId) || followers.includes(uuidId);
  } catch (e) {
    return false;
  }
};

export const isPostSavedLocally = (postId, customerId) => {
  if (!postId || !customerId) return false;
  try {
    const rawId = String(customerId);
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}saves_${rawId}`);
    if (!raw) return false;
    const saves = JSON.parse(raw);
    return saves.includes(String(postId));
  } catch (e) {
    return false;
  }
};

/**
 * Consulta de coincidencia para customer_id segura para Postgres (evita error 22P02 si la columna es UUID)
 */
const findRecordByCustomer = async (tableName, matchField, matchValue, customerId) => {
  if (!customerId) return null;
  const rawId = String(customerId);
  const uuidId = toSocialUuid(customerId);

  if (isUuid(rawId)) {
    const { data } = await supabase.from(tableName).select('id').eq(matchField, String(matchValue)).eq('customer_id', rawId).maybeSingle();
    return data;
  }

  // 1. Intentar con uuidId primero (siempre compatible con columna UUID y TEXT)
  try {
    const { data: d1, error: err1 } = await supabase.from(tableName).select('id').eq(matchField, String(matchValue)).eq('customer_id', uuidId).maybeSingle();
    if (!err1 && d1) return d1;
  } catch (e) {}

  // 2. Si la columna fue migrada a TEXT, verificar también con rawId
  try {
    const { data: d2, error: err2 } = await supabase.from(tableName).select('id').eq(matchField, String(matchValue)).eq('customer_id', rawId).maybeSingle();
    if (!err2 && d2) return d2;
  } catch (e) {}

  return null;
};

/**
 * Inserción con fallback inteligente (usa rawId o uuidId según el tipo de columna en la BD)
 */
const insertWithCustomerFallback = async (tableName, record, customerId) => {
  const rawId = String(customerId);
  const uuidId = toSocialUuid(customerId);

  if (isUuid(rawId)) {
    const { data, error } = await supabase.from(tableName).insert([{ ...record, customer_id: rawId }]).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  // Si no es UUID nativo: intentamos con uuidId primero para garantizar compatibilidad con Postgres UUID
  const { data: dUuid, error: errUuid } = await supabase.from(tableName).insert([{ ...record, customer_id: uuidId }]).select().maybeSingle();
  if (!errUuid) return dUuid;

  // Si falló, intentar con rawId (si la columna ya es text)
  const { data: dRaw, error: errRaw } = await supabase.from(tableName).insert([{ ...record, customer_id: rawId }]).select().maybeSingle();
  if (errRaw) throw errRaw;
  return dRaw;
};

// Suscripción Realtime en Supabase para sincronización entre diferentes navegadores y cuentas
if (typeof window !== 'undefined' && supabase?.channel) {
  try {
    supabase.channel('axon_social_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ecommerce_post_likes' }, (payload) => {
        const postId = payload.new?.post_id || payload.old?.post_id;
        if (postId) {
          getPostLikeState(postId).then(res => {
            notifySocialUpdate('like', { postId, count: res.count, isLiked: res.isLiked });
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ecommerce_post_comments' }, (payload) => {
        if (payload.new) {
          notifySocialUpdate('comment_added', { postId: payload.new.post_id, comment: payload.new });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ecommerce_store_followers' }, (payload) => {
        const wsId = payload.new?.workspace_id || payload.old?.workspace_id;
        if (wsId) {
          getStoreFollowState(wsId).then(res => {
            notifySocialUpdate('follow', { workspaceId: wsId, count: res.count });
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ecommerce_post_saves' }, (payload) => {
        const postId = payload.new?.post_id || payload.old?.post_id;
        if (postId) {
          notifySocialUpdate('save_sync', { postId });
        }
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription skipped:', err);
  }
}

// ==========================================
// 1. SISTEMA DE SEGUIDORES (FOLLOW / UNFOLLOW)
// ==========================================

export const getStoreFollowState = async (workspaceId, customerId) => {
  if (!workspaceId) return { isFollowing: false, count: 0 };

  try {
    const { count, error: countErr } = await supabase
      .from('ecommerce_store_followers')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (countErr) throw countErr;

    let isFollowing = false;
    if (customerId) {
      const existing = await findRecordByCustomer('ecommerce_store_followers', 'workspace_id', workspaceId, customerId);
      if (existing) isFollowing = true;

      // Sincronizar cache local para cargas estáticas inmediatas
      const key = `${LOCAL_STORAGE_PREFIX}followers_${workspaceId}`;
      const raw = localStorage.getItem(key);
      let followers = raw ? JSON.parse(raw) : [];
      const rawId = String(customerId);
      if (isFollowing && !followers.includes(rawId)) {
        followers.push(rawId);
        localStorage.setItem(key, JSON.stringify(followers));
      } else if (!isFollowing && (followers.includes(rawId) || followers.includes(toSocialUuid(customerId)))) {
        followers = followers.filter(id => id !== rawId && id !== toSocialUuid(customerId));
        localStorage.setItem(key, JSON.stringify(followers));
      }
    }

    return { isFollowing, count: count || 0, followersCount: count || 0 };
  } catch (err) {
    const rawId = String(customerId || '');
    const uuidId = toSocialUuid(customerId);
    const key = `${LOCAL_STORAGE_PREFIX}followers_${workspaceId}`;
    const raw = localStorage.getItem(key);
    const followers = raw ? JSON.parse(raw) : [];
    const isFollowing = customerId ? (followers.includes(rawId) || followers.includes(uuidId)) : false;
    return { isFollowing, count: followers.length, followersCount: followers.length };
  }
};

export const toggleFollowStore = async (workspaceId, customerId) => {
  if (!workspaceId || !customerId) throw new Error('workspaceId y customerId son requeridos');

  const rawId = String(customerId);
  const uuidId = toSocialUuid(customerId);

  try {
    const existing = await findRecordByCustomer('ecommerce_store_followers', 'workspace_id', workspaceId, customerId);

    let isFollowing = false;
    if (existing) {
      await supabase
        .from('ecommerce_store_followers')
        .delete()
        .eq('id', existing.id);
      isFollowing = false;
    } else {
      await insertWithCustomerFallback('ecommerce_store_followers', { workspace_id: workspaceId }, customerId);
      isFollowing = true;
    }

    const { count } = await supabase
      .from('ecommerce_store_followers')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const finalCount = count || 0;
    notifySocialUpdate('follow', { workspaceId, customerId, isFollowing, count: finalCount });
    return { isFollowing, count: finalCount, followersCount: finalCount };
  } catch (err) {
    console.warn('Error en toggleFollowStore Supabase, usando respaldo local:', err);
    const key = `${LOCAL_STORAGE_PREFIX}followers_${workspaceId}`;
    const raw = localStorage.getItem(key);
    let followers = raw ? JSON.parse(raw) : [];

    let isFollowing = false;
    if (followers.includes(rawId) || followers.includes(uuidId)) {
      followers = followers.filter(id => id !== rawId && id !== uuidId);
      isFollowing = false;
    } else {
      followers.push(rawId);
      isFollowing = true;
    }
    localStorage.setItem(key, JSON.stringify(followers));
    notifySocialUpdate('follow', { workspaceId, customerId, isFollowing, count: followers.length });
    return { isFollowing, count: followers.length, followersCount: followers.length };
  }
};

// ==========================================
// 2. SISTEMA DE ME GUSTA (LIKES)
// ==========================================

export const getPostLikeState = async (postId, customerId) => {
  if (!postId) return { isLiked: false, count: 0, likesCount: 0 };

  try {
    const { count, error: countErr } = await supabase
      .from('ecommerce_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', String(postId));

    if (countErr) throw countErr;

    let isLiked = false;
    if (customerId) {
      const existing = await findRecordByCustomer('ecommerce_post_likes', 'post_id', postId, customerId);
      if (existing) isLiked = true;

      // Sincronizar cache local para cargas estáticas inmediatas
      const key = `${LOCAL_STORAGE_PREFIX}likes_${postId}`;
      const raw = localStorage.getItem(key);
      let likes = raw ? JSON.parse(raw) : [];
      const rawId = String(customerId);
      if (isLiked && !likes.includes(rawId)) {
        likes.push(rawId);
        localStorage.setItem(key, JSON.stringify(likes));
      } else if (!isLiked && (likes.includes(rawId) || likes.includes(toSocialUuid(customerId)))) {
        likes = likes.filter(id => id !== rawId && id !== toSocialUuid(customerId));
        localStorage.setItem(key, JSON.stringify(likes));
      }
    }

    const finalCount = count || 0;
    return { isLiked, count: finalCount, likesCount: finalCount };
  } catch (err) {
    const rawId = String(customerId || '');
    const uuidId = toSocialUuid(customerId);
    const key = `${LOCAL_STORAGE_PREFIX}likes_${postId}`;
    const raw = localStorage.getItem(key);
    const likes = raw ? JSON.parse(raw) : [];
    const isLiked = customerId ? (likes.includes(rawId) || likes.includes(uuidId)) : false;
    return { isLiked, count: likes.length, likesCount: likes.length };
  }
};

export const toggleLikePost = async (postId, workspaceId, customerId) => {
  if (!postId || !customerId) throw new Error('postId y customerId son requeridos');

  const rawId = String(customerId);
  const uuidId = toSocialUuid(customerId);

  try {
    const existing = await findRecordByCustomer('ecommerce_post_likes', 'post_id', postId, customerId);

    let isLiked = false;
    if (existing) {
      await supabase
        .from('ecommerce_post_likes')
        .delete()
        .eq('id', existing.id);
      isLiked = false;
    } else {
      await insertWithCustomerFallback('ecommerce_post_likes', {
        post_id: String(postId),
        workspace_id: workspaceId ? String(workspaceId) : null
      }, customerId);
      isLiked = true;
    }

    const { count } = await supabase
      .from('ecommerce_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', String(postId));

    const finalCount = count || 0;
    notifySocialUpdate('like', { postId, customerId, isLiked, count: finalCount });
    return { isLiked, count: finalCount };
  } catch (err) {
    console.warn('Error en toggleLikePost Supabase, usando respaldo local:', err);
    const key = `${LOCAL_STORAGE_PREFIX}likes_${postId}`;
    const raw = localStorage.getItem(key);
    let likes = raw ? JSON.parse(raw) : [];

    let isLiked = false;
    if (likes.includes(rawId) || likes.includes(uuidId)) {
      likes = likes.filter(id => id !== rawId && id !== uuidId);
      isLiked = false;
    } else {
      likes.push(rawId);
      isLiked = true;
    }
    localStorage.setItem(key, JSON.stringify(likes));
    notifySocialUpdate('like', { postId, customerId, isLiked, count: likes.length });
    return { isLiked, count: likes.length };
  }
};

// ==========================================
// 3. SISTEMA DE COMENTARIOS
// ==========================================

export const getPostComments = async (postId, workspaceId) => {
  if (!postId && !workspaceId) return [];

  try {
    let query = supabase
      .from('ecommerce_post_comments')
      .select('*')
      .order('created_at', { ascending: true });

    if (postId && postId !== 'all') {
      query = query.eq('post_id', String(postId));
    } else if (workspaceId) {
      query = query.eq('workspace_id', String(workspaceId));
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Error al obtener comentarios de Supabase, usando respaldo local:', err);
    const key = `${LOCAL_STORAGE_PREFIX}comments_${postId || workspaceId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }
};

export const addPostComment = async ({ postId, workspaceId, customerId, customerName, customerAvatar, content }) => {
  if (!postId || !customerId || !content?.trim()) {
    throw new Error('Datos de comentario incompletos');
  }

  const rawId = String(customerId);
  const uuidId = toSocialUuid(customerId);

  const baseRecord = {
    post_id: String(postId),
    workspace_id: workspaceId ? String(workspaceId) : null,
    customer_name: customerName || 'Cliente Axon',
    customer_avatar: customerAvatar || '',
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  try {
    const data = await insertWithCustomerFallback('ecommerce_post_comments', baseRecord, customerId);
    notifySocialUpdate('comment_added', { postId, comment: data });
    return data;
  } catch (err) {
    console.warn('Error en addPostComment Supabase, guardando respaldo local:', err);
    const key = `${LOCAL_STORAGE_PREFIX}comments_${postId}`;
    const raw = localStorage.getItem(key);
    const comments = raw ? JSON.parse(raw) : [];
    const localComment = { ...baseRecord, customer_id: rawId, id: `local_${Date.now()}` };
    comments.push(localComment);
    localStorage.setItem(key, JSON.stringify(comments));
    notifySocialUpdate('comment_added', { postId, comment: localComment });
    return localComment;
  }
};

// ==========================================
// 4. SISTEMA DE GUARDADOS EN FAVORITOS
// ==========================================

export const getPostSaveState = async (postId, customerId) => {
  if (!postId || !customerId) return { isSaved: false };

  const rawId = String(customerId);
  const key = `${LOCAL_STORAGE_PREFIX}saves_${rawId}`;

  try {
    const existing = await findRecordByCustomer('ecommerce_post_saves', 'post_id', postId, customerId);
    const isSaved = Boolean(existing);

    // Sincronizar cache local para lecturas síncronas instantáneas
    const raw = localStorage.getItem(key);
    let saves = raw ? JSON.parse(raw) : [];
    const strPostId = String(postId);
    if (isSaved && !saves.includes(strPostId)) {
      saves.push(strPostId);
      localStorage.setItem(key, JSON.stringify(saves));
    } else if (!isSaved && saves.includes(strPostId)) {
      saves = saves.filter(id => id !== strPostId);
      localStorage.setItem(key, JSON.stringify(saves));
    }

    return { isSaved };
  } catch (err) {
    const raw = localStorage.getItem(key);
    const saves = raw ? JSON.parse(raw) : [];
    return { isSaved: saves.includes(String(postId)) };
  }
};

export const toggleSavePost = async (postId, workspaceId, customerId, storeMeta = {}) => {
  if (!postId || !customerId) throw new Error('postId y customerId son requeridos');

  const rawId = String(customerId);
  const uuidId = toSocialUuid(customerId);

  let isSaved = false;

  try {
    const existing = await findRecordByCustomer('ecommerce_post_saves', 'post_id', postId, customerId);

    if (existing) {
      await supabase
        .from('ecommerce_post_saves')
        .delete()
        .eq('id', existing.id);
      isSaved = false;
    } else {
      await insertWithCustomerFallback('ecommerce_post_saves', {
        post_id: String(postId),
        workspace_id: workspaceId ? String(workspaceId) : null
      }, customerId);
      isSaved = true;
    }

    // Actualizar cache local síncrono
    const key = `${LOCAL_STORAGE_PREFIX}saves_${rawId}`;
    const raw = localStorage.getItem(key);
    let saves = raw ? JSON.parse(raw) : [];
    const strPostId = String(postId);
    if (isSaved) {
      if (!saves.includes(strPostId)) saves.push(strPostId);
    } else {
      saves = saves.filter(id => id !== strPostId);
    }
    localStorage.setItem(key, JSON.stringify(saves));
  } catch (err) {
    console.warn('Error en toggleSavePost Supabase:', err);
    const key = `${LOCAL_STORAGE_PREFIX}saves_${rawId}`;
    const raw = localStorage.getItem(key);
    let saves = raw ? JSON.parse(raw) : [];
    const strPostId = String(postId);

    if (saves.includes(strPostId)) {
      saves = saves.filter(id => id !== strPostId);
      isSaved = false;
    } else {
      saves.push(strPostId);
      isSaved = true;
    }
    localStorage.setItem(key, JSON.stringify(saves));
  }

  // Sincronizar también con customer.favorites guardando la PUBLICACIÓN individual (no la tienda completa)
  try {
    const savedCustomerStr = localStorage.getItem('ecommerce_current_customer');
    if (savedCustomerStr) {
      const customerObj = JSON.parse(savedCustomerStr);
      let currentFavs = Array.isArray(customerObj.favorites) ? [...customerObj.favorites] : [];
      const strPostId = String(postId);

      // Buscar si ya existe por el ID de la publicación
      const existsIdx = currentFavs.findIndex(f => (typeof f === 'object' && (String(f.id) === strPostId || String(f.postId) === strPostId)));
      if (isSaved && existsIdx === -1) {
        currentFavs.push({
          id: strPostId,
          postId: strPostId,
          type: 'post',
          title: storeMeta.title || storeMeta.name || 'Publicación Guardada',
          name: storeMeta.name || storeMeta.store_name || 'Publicación',
          caption: storeMeta.caption || storeMeta.content || '',
          cover: storeMeta.cover || storeMeta.image_url || '',
          image_url: storeMeta.cover || storeMeta.image_url || '',
          store_slug: storeMeta.store_slug || storeMeta.slug || '',
          store_name: storeMeta.store_name || storeMeta.name || '',
          workspace_id: workspaceId,
          savedAt: new Date().toISOString()
        });
      } else if (!isSaved && existsIdx >= 0) {
        currentFavs.splice(existsIdx, 1);
      }

      customerObj.favorites = currentFavs;
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(customerObj));

      // Guardar en Supabase ecommerce_customers
      await supabase
        .from('ecommerce_customers')
        .update({ favorites: currentFavs })
        .eq('id', customerId);
    }
  } catch (favErr) {
    console.warn('Error sincronizando favorites en customer:', favErr);
  }

  notifySocialUpdate('save', { postId, customerId, isSaved });
  return { isSaved };
};

export const getCustomerSavedPosts = async (customerId) => {
  if (!customerId) return [];
  const rawId = String(customerId);
  const uuidId = toSocialUuid(customerId);

  try {
    if (isUuid(rawId)) {
      const { data } = await supabase.from('ecommerce_post_saves').select('*').eq('customer_id', rawId).order('created_at', { ascending: false });
      return data || [];
    }

    const { data: uuidData, error: uuidErr } = await supabase.from('ecommerce_post_saves').select('*').eq('customer_id', uuidId).order('created_at', { ascending: false });
    if (!uuidErr && uuidData && uuidData.length > 0) return uuidData;

    try {
      const { data: rawData } = await supabase.from('ecommerce_post_saves').select('*').eq('customer_id', rawId).order('created_at', { ascending: false });
      if (rawData && rawData.length > 0) return rawData;
    } catch(e) {}

    return uuidData || [];
  } catch (err) {
    console.warn('Error fetching customer saved posts:', err);
    return [];
  }
};

export const getStoreRealMetrics = async (workspaceId, storeSlug) => {
  if (!workspaceId) return { followersCount: 0, likesCount: 0, commentsCount: 0, savesCount: 0 };

  try {
    // 1. Conteo real de seguidores
    const { count: followersCount } = await supabase
      .from('ecommerce_store_followers')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    // 2. Conteo real de me gusta (en la vitrina y sus publicaciones)
    let likesCount = 0;
    try {
      const targetSlug = storeSlug || workspaceId;
      const { count } = await supabase
        .from('ecommerce_post_likes')
        .select('*', { count: 'exact', head: true })
        .or(`workspace_id.eq.${workspaceId},post_id.eq.${targetSlug}`);
      likesCount = count || 0;
    } catch (e) {
      const { count: cFallback } = await supabase
        .from('ecommerce_post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      likesCount = cFallback || 0;
    }

    // 3. Conteo real de comentarios en el comercio y sus posts
    let commentsCount = 0;
    try {
      const { count } = await supabase
        .from('ecommerce_post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      commentsCount = count || 0;
    } catch (e) {
      commentsCount = 0;
    }

    // 4. Conteo real de guardados
    let savesCount = 0;
    try {
      const { count } = await supabase
        .from('ecommerce_post_saves')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      savesCount = count || 0;
    } catch (e) {
      savesCount = 0;
    }

    return {
      followersCount: followersCount || 0,
      likesCount: likesCount || 0,
      commentsCount: commentsCount || 0,
      savesCount: savesCount || 0
    };
  } catch (err) {
    console.warn('Error fetching store real metrics:', err);
    return { followersCount: 0, likesCount: 0, commentsCount: 0, savesCount: 0 };
  }
};

export const getStoreFollowersList = async (workspaceId) => {
  if (!workspaceId) return [];

  try {
    const { data: followers, error: fErr } = await supabase
      .from('ecommerce_store_followers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (fErr || !followers || followers.length === 0) return [];

    const customerIds = followers.map(f => f.customer_id).filter(Boolean);
    let customers = [];
    if (customerIds.length > 0) {
      const { data: custData } = await supabase
        .from('ecommerce_customers')
        .select('id, name, email, profile_pic, status');
      customers = custData || [];
    }

    const result = followers.map(f => {
      const found = customers.find(c => 
        String(c.id) === String(f.customer_id) || 
        toSocialUuid(c.id) === String(f.customer_id)
      );

      return {
        id: f.id,
        customerId: f.customer_id,
        name: found?.name || (found?.email ? found.email.split('@')[0] : 'Cliente Axon'),
        email: found?.email || '',
        profilePic: found?.profile_pic || null,
        created_at: f.created_at
      };
    });

    return result;
  } catch (err) {
    console.warn('Error fetching store followers list:', err);
    return [];
  }
};

export const getPostSavesCount = async (postId) => {
  if (!postId) return 0;
  try {
    const { count, error } = await supabase
      .from('ecommerce_post_saves')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', String(postId));
    if (error) throw error;
    return count || 0;
  } catch (err) {
    return 0;
  }
};

export const getPostLikesList = async (postId) => {
  if (!postId) return [];
  try {
    const { data: likes, error } = await supabase
      .from('ecommerce_post_likes')
      .select('*')
      .eq('post_id', String(postId))
      .order('created_at', { ascending: false });

    if (error || !likes || likes.length === 0) return [];

    const customerIds = likes.map(l => l.customer_id).filter(Boolean);
    let customers = [];
    if (customerIds.length > 0) {
      const { data: custData } = await supabase
        .from('ecommerce_customers')
        .select('id, name, email, profile_pic');
      customers = custData || [];
    }

    return likes.map(l => {
      const found = customers.find(c => 
        String(c.id) === String(l.customer_id) || 
        toSocialUuid(c.id) === String(l.customer_id)
      );
      return {
        id: l.id,
        customerId: l.customer_id,
        name: found?.name || (found?.email ? found.email.split('@')[0] : 'Cliente Axon'),
        email: found?.email || '',
        profilePic: found?.profile_pic || null,
        created_at: l.created_at
      };
    });
  } catch (err) {
    console.warn('Error fetching post likes list:', err);
    return [];
  }
};

export const getStoreLikesList = async (workspaceId) => {
  if (!workspaceId) return [];
  try {
    const { data: likes, error } = await supabase
      .from('ecommerce_post_likes')
      .select('*')
      .eq('workspace_id', String(workspaceId))
      .order('created_at', { ascending: false });

    if (error || !likes || likes.length === 0) return [];

    const customerIds = likes.map(l => l.customer_id).filter(Boolean);
    let customers = [];
    if (customerIds.length > 0) {
      const { data: custData } = await supabase
        .from('ecommerce_customers')
        .select('id, name, email, profile_pic');
      customers = custData || [];
    }

    return likes.map(l => {
      const found = customers.find(c => 
        String(c.id) === String(l.customer_id) || 
        toSocialUuid(c.id) === String(l.customer_id)
      );
      return {
        id: l.id,
        customerId: l.customer_id,
        postId: l.post_id,
        name: found?.name || (found?.email ? found.email.split('@')[0] : 'Cliente Axon'),
        email: found?.email || '',
        profilePic: found?.profile_pic || null,
        created_at: l.created_at
      };
    });
  } catch (err) {
    console.warn('Error fetching store likes list:', err);
    return [];
  }
};
