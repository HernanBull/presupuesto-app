import { supabase } from '../../../supabaseClient';

/**
 * Servicio Centralizado de Interacciones Sociales (Axon Market Social Engine)
 * Maneja: Seguidores, Likes, Comentarios y Guardados en Favoritos.
 * Diseñado con persistencia en Supabase y capa de fallback local ultra resiliente.
 */

const LOCAL_STORAGE_PREFIX = 'axon_social_';

// Helper para emitir cambios entre componentes
const notifySocialUpdate = (eventType, detail) => {
  window.dispatchEvent(new CustomEvent('axon_social_updated', { detail: { eventType, ...detail } }));
};

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
      const { data, error: userErr } = await supabase
        .from('ecommerce_store_followers')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (!userErr && data) isFollowing = true;
    }

    return { isFollowing, count: count || 0 };
  } catch (err) {
    // Fallback a almacenamiento local si la tabla aún no existe
    const key = `${LOCAL_STORAGE_PREFIX}followers_${workspaceId}`;
    const raw = localStorage.getItem(key);
    const followers = raw ? JSON.parse(raw) : [];
    const isFollowing = customerId ? followers.includes(String(customerId)) : false;
    return { isFollowing, count: followers.length };
  }
};

export const toggleFollowStore = async (workspaceId, customerId) => {
  if (!workspaceId || !customerId) throw new Error('workspaceId y customerId son requeridos');

  try {
    const { data: existing, error: checkErr } = await supabase
      .from('ecommerce_store_followers')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (checkErr) throw checkErr;

    let isFollowing = false;
    if (existing) {
      const { error: delErr } = await supabase
        .from('ecommerce_store_followers')
        .delete()
        .eq('id', existing.id);
      if (delErr) throw delErr;
      isFollowing = false;
    } else {
      const { error: insErr } = await supabase
        .from('ecommerce_store_followers')
        .insert([{ workspace_id: workspaceId, customer_id: customerId }]);
      if (insErr) throw insErr;
      isFollowing = true;
    }

    const { count } = await supabase
      .from('ecommerce_store_followers')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const finalCount = count || 0;
    notifySocialUpdate('follow', { workspaceId, customerId, isFollowing, count: finalCount });
    return { isFollowing, count: finalCount };
  } catch (err) {
    // Fallback local
    const key = `${LOCAL_STORAGE_PREFIX}followers_${workspaceId}`;
    const raw = localStorage.getItem(key);
    let followers = raw ? JSON.parse(raw) : [];
    const strCustId = String(customerId);

    let isFollowing = false;
    if (followers.includes(strCustId)) {
      followers = followers.filter(id => id !== strCustId);
      isFollowing = false;
    } else {
      followers.push(strCustId);
      isFollowing = true;
    }
    localStorage.setItem(key, JSON.stringify(followers));
    notifySocialUpdate('follow', { workspaceId, customerId, isFollowing, count: followers.length });
    return { isFollowing, count: followers.length };
  }
};

// ==========================================
// 2. SISTEMA DE ME GUSTA (LIKES)
// ==========================================

export const getPostLikeState = async (postId, customerId) => {
  if (!postId) return { isLiked: false, count: 0 };

  try {
    const { count, error: countErr } = await supabase
      .from('ecommerce_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', String(postId));

    if (countErr) throw countErr;

    let isLiked = false;
    if (customerId) {
      const { data, error: userErr } = await supabase
        .from('ecommerce_post_likes')
        .select('id')
        .eq('post_id', String(postId))
        .eq('customer_id', customerId)
        .maybeSingle();

      if (!userErr && data) isLiked = true;
    }

    return { isLiked, count: count || 0 };
  } catch (err) {
    const key = `${LOCAL_STORAGE_PREFIX}likes_${postId}`;
    const raw = localStorage.getItem(key);
    const likes = raw ? JSON.parse(raw) : [];
    const isLiked = customerId ? likes.includes(String(customerId)) : false;
    return { isLiked, count: likes.length };
  }
};

export const toggleLikePost = async (postId, workspaceId, customerId) => {
  if (!postId || !customerId) throw new Error('postId y customerId son requeridos');

  try {
    const { data: existing, error: checkErr } = await supabase
      .from('ecommerce_post_likes')
      .select('id')
      .eq('post_id', String(postId))
      .eq('customer_id', customerId)
      .maybeSingle();

    if (checkErr) throw checkErr;

    let isLiked = false;
    if (existing) {
      const { error: delErr } = await supabase
        .from('ecommerce_post_likes')
        .delete()
        .eq('id', existing.id);
      if (delErr) throw delErr;
      isLiked = false;
    } else {
      const { error: insErr } = await supabase
        .from('ecommerce_post_likes')
        .insert([{
          post_id: String(postId),
          workspace_id: workspaceId || null,
          customer_id: customerId
        }]);
      if (insErr) throw insErr;
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
    const key = `${LOCAL_STORAGE_PREFIX}likes_${postId}`;
    const raw = localStorage.getItem(key);
    let likes = raw ? JSON.parse(raw) : [];
    const strCustId = String(customerId);

    let isLiked = false;
    if (likes.includes(strCustId)) {
      likes = likes.filter(id => id !== strCustId);
      isLiked = false;
    } else {
      likes.push(strCustId);
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

export const getPostComments = async (postId) => {
  if (!postId) return [];

  try {
    const { data, error } = await supabase
      .from('ecommerce_post_comments')
      .select('*')
      .eq('post_id', String(postId))
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    const key = `${LOCAL_STORAGE_PREFIX}comments_${postId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }
};

export const addPostComment = async ({ postId, workspaceId, customerId, customerName, customerAvatar, content }) => {
  if (!postId || !customerId || !content?.trim()) {
    throw new Error('Datos de comentario incompletos');
  }

  const payload = {
    post_id: String(postId),
    workspace_id: workspaceId || null,
    customer_id: customerId,
    customer_name: customerName || 'Cliente Axon',
    customer_avatar: customerAvatar || '',
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('ecommerce_post_comments')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    notifySocialUpdate('comment_added', { postId, comment: data });
    return data;
  } catch (err) {
    const key = `${LOCAL_STORAGE_PREFIX}comments_${postId}`;
    const raw = localStorage.getItem(key);
    const comments = raw ? JSON.parse(raw) : [];
    const localComment = { ...payload, id: `local_${Date.now()}` };
    comments.push(localComment);
    localStorage.setItem(key, JSON.stringify(comments));
    notifySocialUpdate('comment_added', { postId, comment: localComment });
    return localComment;
  }
};

// ==========================================
// 4. SISTEMA DE GUARDADOS (BOOKMARKS / SAVES)
// ==========================================

export const getPostSaveState = async (postId, customerId) => {
  if (!postId || !customerId) return { isSaved: false };

  try {
    const { data, error } = await supabase
      .from('ecommerce_post_saves')
      .select('id')
      .eq('post_id', String(postId))
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) throw error;
    return { isSaved: Boolean(data) };
  } catch (err) {
    const key = `${LOCAL_STORAGE_PREFIX}saves_${customerId}`;
    const raw = localStorage.getItem(key);
    const saves = raw ? JSON.parse(raw) : [];
    return { isSaved: saves.includes(String(postId)) };
  }
};

export const toggleSavePost = async (postId, workspaceId, customerId) => {
  if (!postId || !customerId) throw new Error('postId y customerId son requeridos');

  try {
    const { data: existing, error: checkErr } = await supabase
      .from('ecommerce_post_saves')
      .select('id')
      .eq('post_id', String(postId))
      .eq('customer_id', customerId)
      .maybeSingle();

    if (checkErr) throw checkErr;

    let isSaved = false;
    if (existing) {
      const { error: delErr } = await supabase
        .from('ecommerce_post_saves')
        .delete()
        .eq('id', existing.id);
      if (delErr) throw delErr;
      isSaved = false;
    } else {
      const { error: insErr } = await supabase
        .from('ecommerce_post_saves')
        .insert([{
          post_id: String(postId),
          workspace_id: workspaceId || null,
          customer_id: customerId
        }]);
      if (insErr) throw insErr;
      isSaved = true;
    }

    notifySocialUpdate('save', { postId, customerId, isSaved });
    return { isSaved };
  } catch (err) {
    const key = `${LOCAL_STORAGE_PREFIX}saves_${customerId}`;
    const raw = localStorage.getItem(key);
    let saves = raw ? JSON.parse(raw) : [];
    const strPostId = String(postId);

    let isSaved = false;
    if (saves.includes(strPostId)) {
      saves = saves.filter(id => id !== strPostId);
      isSaved = false;
    } else {
      saves.push(strPostId);
      isSaved = true;
    }
    localStorage.setItem(key, JSON.stringify(saves));
    notifySocialUpdate('save', { postId, customerId, isSaved });
    return { isSaved };
  }
};
