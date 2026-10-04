import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Loader2, CheckCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verificando tu sesión...');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let redirectTimer = null;

    const handleAuthCallback = async (session) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          if (isMounted) setStatus('Autenticación exitosa. Redirigiendo...');
          
          // Verificar si es un comerciante (Workspace)
          const { data: workspace } = await supabase.from('workspaces').select('id, store_slug').eq('id', user.id).maybeSingle();
          
          if (workspace) {
            localStorage.setItem('activeWorkspace', workspace.id);
            localStorage.setItem('storeSlug', workspace.store_slug || '');
            redirectTimer = setTimeout(() => { if(isMounted) navigate('/dashboard') }, 1500);
          } else {
            // Verificar si es cliente
            const { data: customer } = await supabase.from('ecommerce_customers').select('*').eq('id', user.id).maybeSingle();
            
            if (customer) {
              const mappedUser = { ...customer, docId: customer.doc_id, orders: [] };
              localStorage.setItem('ecommerce_current_customer', JSON.stringify(mappedUser));
              localStorage.removeItem('activeWorkspace');
              redirectTimer = setTimeout(() => { if(isMounted) navigate('/profile') }, 1500);
            } else {
              // Usuario nuevo sin registro completo, mandarlo al inicio
              redirectTimer = setTimeout(() => { if(isMounted) navigate('/') }, 1500);
            }
          }
        } else {
          if (isMounted) {
            setError('No se pudo verificar el usuario. Por favor, intenta iniciar sesión nuevamente.');
            redirectTimer = setTimeout(() => navigate('/'), 3000);
          }
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        if (isMounted) setError('Ocurrió un error en la verificación.');
      }
    };

    // Intentar obtener la sesión inicial
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        if (isMounted) setError('Enlace inválido o expirado.');
        return;
      }
      if (session) {
        handleAuthCallback(session);
      }
    });

    // Escuchar el evento de auth (el hash URL se procesa aquí)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        handleAuthCallback(session);
      }
    });

    return () => {
      isMounted = false;
      if (redirectTimer) clearTimeout(redirectTimer);
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Error de Verificación</h2>
            <p className="text-zinc-400 text-sm">{error}</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
               {status.includes('exitosa') ? <CheckCircle size={32} /> : <Loader2 size={32} className="animate-spin" />}
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Verificación de Correo</h2>
            <p className="text-zinc-400 text-sm">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
