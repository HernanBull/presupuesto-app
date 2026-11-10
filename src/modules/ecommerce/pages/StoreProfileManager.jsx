import React, { useState, useEffect } from 'react';
import { Save, Store, Calculator, CreditCard, Smartphone as PhoneIcon, Truck, Clock, DollarSign, Building2, RefreshCw, Lock, User, Mail, MailWarning, ShieldCheck, Image as ImageIcon, Zap, Link, Eye, EyeOff, Users, UserPlus, Trash2, KeyRound, Check, Database, Shield, Palette, CheckCircle2, RotateCcw, MapPin, FileText } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import BackupManagerModal from '../components/admin/BackupManagerModal';
import UserManagementModal from '../components/admin/UserManagementModal';
import { optimizeStoreImage } from '../utils/imageOptimizer';
import { offlineDb } from '../services/offlineSyncService';
import { MARKETPLACE_CATEGORIES } from '../../../config/marketplaceCategories';
import { 
  STOREFRONT_COLOR_PRESETS, 
  DEFAULT_STOREFRONT_COLOR, 
  normalizeHex, 
  getContrastTextColor, 
  hexToRgba, 
  isValidHex 
} from '../utils/storefrontThemeUtils';

export default function StoreProfileManager() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Modales de Administración (AxonPOS ➔ AxonMarket)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  
  // Auth User Info
  const [adminEmail, setAdminEmail] = useState('');
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  const [authProvider, setAuthProvider] = useState('email');
  const [isResending, setIsResending] = useState(false);
  const [isRefreshingAuth, setIsRefreshingAuth] = useState(false);

  const handleRefreshAuthStatus = async () => {
    setIsRefreshingAuth(true);
    try {
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsEmailConfirmed(!!user.email_confirmed_at);
        if (!!user.email_confirmed_at) {
          alert('¡Tu correo ha sido verificado con éxito!');
        } else {
          alert('Tu correo aún no aparece como verificado. Si ya hiciste clic en el enlace, intenta nuevamente en unos segundos.');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingAuth(false);
    }
  };
  
  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: adminEmail,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      alert('Correo de confirmación reenviado. Revisa tu bandeja de entrada.');
    } catch (err) {
      console.error(err);
      alert('Error al reenviar el correo: ' + err.message);
    } finally {
      setIsResending(false);
    }
  };
  
  // Perfil
  const [storeName, setStoreName] = useState('Mi Tienda Online');
  const [ownerName, setOwnerName] = useState('');
  const [rif, setRif] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [storeCategories, setStoreCategories] = useState(['Víveres']);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_STOREFRONT_COLOR);
  const [customHexInput, setCustomHexInput] = useState(DEFAULT_STOREFRONT_COLOR);
  
  // Cambio de contraseña
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // BCV
  const [bcvRate, setBcvRate] = useState(36.50);
  const [manualBcv, setManualBcv] = useState(false);
  const [isFetchingBcv, setIsFetchingBcv] = useState(false);

  const fetchBcvRate = async () => {
    setIsFetchingBcv(true);
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/bcv`);
      const data = await res.json();
      if (res.ok && data.rate) {
        setBcvRate(data.rate);
      } else if (data.fallbackRate) {
        setBcvRate(data.fallbackRate);
      }
    } catch (error) {
      console.error("Error al obtener la tasa del BCV:", error);
    } finally {
      setIsFetchingBcv(false);
    }
  };

  useEffect(() => {
    if (!manualBcv) {
      fetchBcvRate();
    }
  }, [manualBcv]);
  
  // Pago Móvil
  const [paymentMobile, setPaymentMobile] = useState(true);
  const [pmBank, setPmBank] = useState('');
  const [pmPhone, setPmPhone] = useState('');
  const [pmId, setPmId] = useState('');
  
  // Zelle
  const [zelleActive, setZelleActive] = useState(false);
  const [zelleEmail, setZelleEmail] = useState('');
  const [zelleName, setZelleName] = useState('');

  // Efectivo en Tienda / Delivery
  const [cashActive, setCashActive] = useState(false);

  // Envíos
  const [flatRate, setFlatRate] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);
  const [hasEnminutosAlliance, setHasEnminutosAlliance] = useState(false);

  // Horarios de Atención
  const [scheduleActive, setScheduleActive] = useState(false);
  const [workDays, setWorkDays] = useState({
    lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false
  });
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [closeWarningMinutes, setCloseWarningMinutes] = useState(30);
  
  const [socialLinks, setSocialLinks] = useState({ instagram: '', facebook: '', tiktok: '', whatsapp: '' });
  
  // Personal y PINs de Acceso (Picking & AxonPOS)
  const [staffList, setStaffList] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('PICKER'); // PICKER | CASHIER | SUPERVISOR
  const [staffStatusMsg, setStaffStatusMsg] = useState({ type: '', msg: '' });
  const [isStaffSaving, setIsStaffSaving] = useState(false);
  const [showStaffPins, setShowStaffPins] = useState({});

  const [workspaceId, setWorkspaceId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlWs = params.get('workspace') || params.get('workspace_id') || params.get('ws') || params.get('storeId') || params.get('store');
      if (urlWs && urlWs !== 'null' && urlWs !== 'undefined' && urlWs !== 'default') {
        localStorage.setItem('activeWorkspace', urlWs);
        return urlWs;
      }
    } catch (e) {}
    return localStorage.getItem('activeWorkspace') || 'default_workspace';
  });

  const handleImageUpload = async (e, type) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;
    
    setIsSaving(true);
    try {
      // Centrado y optimización automática en canvas (512x512 logo seguro, 1200x500 portada)
      const file = await optimizeStoreImage(rawFile, type);
      const fileExt = file.name ? file.name.split('.').pop() : 'webp';
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `store_assets/${workspaceId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, file, {
        contentType: file.type || 'image/webp',
        upsert: true
      });
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
      if (data && data.publicUrl) {
        if (type === 'logo') setLogoUrl(data.publicUrl);
        if (type === 'cover') setCoverUrl(data.publicUrl);
      }
    } catch (err) {
      console.error(err);
      alert('Error subiendo imagen. Verifica tu conexión a internet.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setAdminEmail(session.user.email);
        setIsEmailConfirmed(!!session.user.email_confirmed_at);
        setAuthProvider(session.user.app_metadata?.provider || 'email');
      }
    });

    const fetchWorkspace = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAdminEmail(user.email);
          setIsEmailConfirmed(!!user.email_confirmed_at);
          setAuthProvider(user.app_metadata?.provider || 'email');
        }

        const { data: ws, error } = await supabase.from('workspaces').select('*').eq('id', workspaceId).single();
        if (ws) {
          const cfg = typeof ws.config === 'object' && ws.config !== null 
            ? ws.config 
            : (typeof ws.config === 'string' ? JSON.parse(ws.config || '{}') : {});

          // Nombre de la Tienda
          const resolvedStoreName = ws.name || cfg.onboarding?.business_name || cfg.business_name || cfg.name || 'Mi Tienda Online';
          setStoreName(resolvedStoreName);

          // Nombre del Propietario / Encargado
          const resolvedOwnerName = cfg.expediente?.ownerName || cfg.contact?.ownerName || cfg.onboarding?.owner_name || cfg.ownerName || '';
          setOwnerName(resolvedOwnerName);

          // Cédula o RIF Fiscal
          const resolvedRif = cfg.expediente?.rif || cfg.rif || '';
          setRif(resolvedRif);

          // Dirección física y mapa
          const resolvedAddress = ws.map_address || cfg.address || cfg.expediente?.address || cfg.location?.address || '';
          setAddress(resolvedAddress);

          // WhatsApp comercial / Teléfono de contacto
          const resolvedWhatsapp = cfg.socialLinks?.whatsapp || cfg.contact?.phone || cfg.expediente?.whatsapp || '';
          if (resolvedWhatsapp) {
            setSocialLinks(prev => ({
              ...prev,
              ...(cfg.socialLinks || {}),
              whatsapp: resolvedWhatsapp
            }));
          } else if (cfg.socialLinks) {
            setSocialLinks(cfg.socialLinks);
          }

          if (cfg) {
            const currentPass = cfg.generatedPassword || cfg.adminPassword || cfg.adminPin || '';
            if (currentPass) setGeneratedPassword(currentPass);
            if (cfg.currency) setCurrency(cfg.currency);
            if (cfg.description) setDescription(cfg.description);
            if (cfg.adminPin) setAdminPin(cfg.adminPin);
            if (cfg.logoUrl) setLogoUrl(cfg.logoUrl);
            if (cfg.coverUrl) setCoverUrl(cfg.coverUrl);
            const loadedColor = cfg.primaryColor || cfg.themeColor || cfg.storefront?.primaryColor || DEFAULT_STOREFRONT_COLOR;
            const normalizedColor = normalizeHex(loadedColor);
            setPrimaryColor(normalizedColor);
            setCustomHexInput(normalizedColor);
            if (Array.isArray(cfg.marketplaceCategories) && cfg.marketplaceCategories.length > 0) {
              setStoreCategories(cfg.marketplaceCategories);
            } else if (Array.isArray(cfg.categories) && cfg.categories.length > 0) {
              setStoreCategories(cfg.categories);
            } else if (cfg.category) {
              setStoreCategories([cfg.category]);
            } else if (cfg.rubro) {
              setStoreCategories([cfg.rubro]);
            } else if (ws.business_type) {
              setStoreCategories([ws.business_type]);
            }
            if (cfg.bcvRate) setBcvRate(cfg.bcvRate);
            if (cfg.manualBcv !== undefined) {
              setManualBcv(cfg.manualBcv);
            } else if (cfg.autoBcv !== undefined) {
              setManualBcv(!cfg.autoBcv); // Migrate from old config
            }
            
            if (cfg.paymentProfile) {
              setPaymentMobile(cfg.paymentProfile.paymentMobile !== false);
              setPmBank(cfg.paymentProfile.pmBank || '0102 - Banco de Venezuela');
              setPmPhone(cfg.paymentProfile.pmPhone || resolvedWhatsapp || '');
              setPmId(cfg.paymentProfile.pmId || resolvedRif || '');
              setZelleActive(cfg.paymentProfile.zelleActive || false);
              setZelleEmail(cfg.paymentProfile.zelleEmail || '');
              setZelleName(cfg.paymentProfile.zelleName || '');
              setCashActive(cfg.paymentProfile.cashActive || false);
            } else {
              if (resolvedWhatsapp) setPmPhone(resolvedWhatsapp);
              if (resolvedRif) setPmId(resolvedRif);
            }
            if (cfg.shippingProfile) {
              setFlatRate(cfg.shippingProfile.flatRate || 0);
              setFreeShipping(cfg.shippingProfile.freeShipping || false);
            }
            if (cfg.has_enminutos_alliance !== undefined) {
              setHasEnminutosAlliance(cfg.has_enminutos_alliance);
            }
            if (cfg.scheduleProfile) {
              setScheduleActive(cfg.scheduleProfile.scheduleActive || false);
              if (cfg.scheduleProfile.workDays) setWorkDays(cfg.scheduleProfile.workDays);
              if (cfg.scheduleProfile.openTime) setOpenTime(cfg.scheduleProfile.openTime);
              if (cfg.scheduleProfile.closeTime) setCloseTime(cfg.scheduleProfile.closeTime);
              if (cfg.scheduleProfile.closeWarningMinutes !== undefined) setCloseWarningMinutes(cfg.scheduleProfile.closeWarningMinutes);
            }

            // Sincronizar Personal & PINs desde config de este comercio exclusivamente (Aislamiento Multi-Tenant)
            let storeStaff = [];
            if (cfg.staff && Array.isArray(cfg.staff)) {
              storeStaff = [...cfg.staff];
            } else {
              try {
                const local = JSON.parse(localStorage.getItem('axon_staff_' + workspaceId) || '[]');
                if (Array.isArray(local) && local.length > 0) storeStaff = local;
              } catch (e) {}
            }
            setStaffList(storeStaff);
            try {
              localStorage.setItem('axon_staff_' + workspaceId, JSON.stringify(storeStaff));
            } catch (e) {}
          }
        }
        setIsLoaded(true);
      } catch (err) {
        console.error(err);
        setIsLoaded(true);
      }
    };
    fetchWorkspace();
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [workspaceId]);

  const toggleShowPin = (workerId) => {
    setShowStaffPins(prev => ({ ...prev, [workerId]: !prev[workerId] }));
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffStatusMsg({ type: '', msg: '' });
    const cleanName = newStaffName.trim();
    const cleanPin = newStaffPin.trim();

    if (!cleanName) {
      setStaffStatusMsg({ type: 'error', msg: 'Por favor, ingresa el nombre del trabajador.' });
      return;
    }
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setStaffStatusMsg({ type: 'error', msg: 'El PIN debe contener exactamente 4 dígitos numéricos (ej. 1234).' });
      return;
    }
    if (staffList.some(s => (s.pin_code || s.pinCode) === cleanPin)) {
      setStaffStatusMsg({ type: 'error', msg: `El PIN ${cleanPin} ya está asignado a otro miembro del personal.` });
      return;
    }

    setIsStaffSaving(true);
    const workerId = 'usr-picker-' + Date.now();
    const newWorker = {
      id: workerId,
      full_name: cleanName,
      pin_code: cleanPin,
      role: newStaffRole,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const updatedList = [newWorker, ...staffList];
    setStaffList(updatedList);

    // 1. Guardar en workspace config en Supabase (Aislado 100% por comercio)
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      await supabase.from('workspaces').update({
        config: {
          ...currentConfig,
          staff: updatedList
        }
      }).eq('id', workspaceId);
    } catch (wsErr) {
      console.warn('Error actualizando workspace config:', wsErr);
    }

    // 2. Respaldo local y offline aislado por comercio
    try {
      localStorage.setItem('axon_staff_' + workspaceId, JSON.stringify(updatedList));
      try {
        await offlineDb.users.put({
          id: workerId,
          username: cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          fullName: cleanName,
          role: newStaffRole,
          pinCode: cleanPin,
          isActive: true,
          workspace_id: workspaceId,
          createdAt: newWorker.created_at
        });
      } catch (e) {}
    } catch (e) {}

    setIsStaffSaving(false);
    setNewStaffName('');
    setNewStaffPin('');
    setStaffStatusMsg({ type: 'success', msg: `¡${cleanName} registrado con éxito! PIN: ${cleanPin}` });
    setTimeout(() => setStaffStatusMsg({ type: '', msg: '' }), 4000);
  };

  const handleRemoveStaff = async (workerId, pinCode, workerName) => {
    if (!window.confirm(`¿Estás seguro de revocar el acceso a "${workerName}" (PIN: ${pinCode})?`)) return;

    const updatedList = staffList.filter(s => s.id !== workerId && (s.pin_code || s.pinCode) !== pinCode);
    setStaffList(updatedList);

    // 1. Actualizar workspace config (Aislado 100%)
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      await supabase.from('workspaces').update({
        config: {
          ...currentConfig,
          staff: updatedList
        }
      }).eq('id', workspaceId);
    } catch (e) {
      console.warn('Error actualizando config:', e);
    }

    // 2. Respaldo local y offline aislado por comercio
    try {
      localStorage.setItem('axon_staff_' + workspaceId, JSON.stringify(updatedList));
      try {
        await offlineDb.users.delete(workerId);
      } catch (e) {}
    } catch (e) {}
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', msg: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', msg: 'Las contraseñas nuevas no coinciden' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus({ type: '', msg: '' });

    try {
      const { data: ws, error: fetchErr } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      
      if (fetchErr || !ws) {
        setPasswordStatus({ type: 'error', msg: 'Error de conexión' });
        setIsChangingPassword(false);
        return;
      }
      
      
      const currentStored = ws.config?.generatedPassword || ws.config?.adminPassword || ws.config?.adminPin;
      if (currentStored && currentStored !== currentPassword) {
        setPasswordStatus({ type: 'error', msg: 'Contraseña actual incorrecta' });
        setIsChangingPassword(false);
        return;
      }

      // Actualizar en Supabase Auth si hay sesión activa
      try {
        await supabase.auth.updateUser({
          password: newPassword
        });
      } catch (authErr) {
        console.warn('Notice actualizando Supabase Auth:', authErr?.message);
      }

      // Actualizar en la DB
      const updatedConfig = { 
        ...ws.config, 
        generatedPassword: newPassword,
        adminPassword: newPassword,
        adminPin: newPassword
      };

      const { error: updateErr } = await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);

      if (!updateErr) {
        setPasswordStatus({ type: 'success', msg: 'Contraseña cambiada exitosamente' });
        setGeneratedPassword(newPassword);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setAdminPin(newPassword);
      } else {
        setPasswordStatus({ type: 'error', msg: updateErr.message || 'Error al cambiar la contraseña' });
      }
    } catch (err) {
      console.error(err);
      setPasswordStatus({ type: 'error', msg: 'Error de conexión' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: ws, error: fetchErr } = await supabase.from('workspaces').select('*').eq('id', workspaceId).single();
      if (fetchErr) throw fetchErr;
      
      const prevCfg = typeof ws?.config === 'object' && ws?.config !== null 
        ? ws.config 
        : (typeof ws?.config === 'string' ? JSON.parse(ws?.config || '{}') : {});

      const primaryCat = storeCategories[0] || 'Víveres';
      const cleanPhone = (socialLinks?.whatsapp || pmPhone || '').trim();

      const cleanSlug = storeName
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'mi-tienda';
      
      const effectiveAdminEmail = (adminEmail || prevCfg.adminEmail || '').trim();
      const effectiveAdminPassword = prevCfg.adminPassword || prevCfg.generatedPassword || prevCfg.adminPin || '';

      const newConfig = {
        ...prevCfg,
        name: storeName.trim(),
        business_name: storeName.trim(),
        marketplaceCategories: storeCategories,
        categories: storeCategories,
        category: primaryCat,
        business_type: primaryCat,
        currency,
        description,
        adminPin,
        ...(effectiveAdminEmail ? { adminEmail: effectiveAdminEmail } : {}),
        ...(effectiveAdminPassword ? { adminPassword: effectiveAdminPassword, generatedPassword: effectiveAdminPassword } : {}),
        logoUrl,
        coverUrl,
        heroUrl: coverUrl,
        primaryColor,
        themeColor: primaryColor,
        storefront: {
          ...(prevCfg.storefront || {}),
          logoUrl,
          coverUrl,
          heroUrl: coverUrl,
          primaryColor,
          themeColor: primaryColor
        },
        bcvRate,
        manualBcv,
        autoBcv: !manualBcv, // Keep for backward compatibility
        has_enminutos_alliance: hasEnminutosAlliance,
        socialLinks: {
          ...(socialLinks || {}),
          whatsapp: cleanPhone
        },
        staff: staffList,
        paymentProfile: {
          paymentMobile,
          pmBank,
          pmPhone: pmPhone || cleanPhone,
          pmId: pmId || rif,
          zelleActive,
          zelleEmail,
          zelleName,
          cashActive
        },
        shippingProfile: {
          flatRate,
          freeShipping
        },
        scheduleProfile: {
          scheduleActive,
          workDays,
          openTime,
          closeTime,
          closeWarningMinutes
        },
        address: address.trim(),
        expediente: {
          ...(prevCfg.expediente || {}),
          ownerName: ownerName.trim(),
          rif: rif.trim(),
          address: address.trim(),
          whatsapp: cleanPhone
        },
        contact: {
          ...(prevCfg.contact || {}),
          ownerName: ownerName.trim(),
          phone: cleanPhone
        },
        onboarding: {
          ...(prevCfg.onboarding || {}),
          owner_name: ownerName.trim(),
          business_name: storeName.trim(),
          marketplaceCategories: storeCategories,
          categories: storeCategories
        }
      };

      const { error: updateErr } = await supabase.from('workspaces').update({ 
        name: storeName.trim(),
        store_slug: ws.store_slug || cleanSlug,
        map_address: address.trim(),
        config: newConfig 
      }).eq('id', workspaceId);
      if (updateErr) throw updateErr;

      try {
        await supabase.from('merchant_contacts').upsert([{
          id: workspaceId,
          full_name: ownerName.trim(),
          phone: cleanPhone,
          ...(adminEmail ? { email: adminEmail } : {})
        }]);
      } catch (_) {}

      localStorage.setItem('activeWorkspaceName', storeName.trim());
      
      if (logoUrl) {
        localStorage.setItem('merchant_store_logo', logoUrl);
        window.dispatchEvent(new CustomEvent('axon_store_logo_updated', { detail: logoUrl }));
      }
      if (primaryColor) {
        localStorage.setItem('axon_storefront_color_' + workspaceId, primaryColor);
        window.dispatchEvent(new CustomEvent('axon_storefront_color_updated', { detail: primaryColor }));
      }

      setTimeout(() => {
        setIsSaving(false);
        alert('¡Perfil de la tienda y datos del comerciante guardados exitosamente!');
      }, 300);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
      setIsSaving(false);
      alert('Error al guardar el perfil: ' + (err.message || 'Error de conexión'));
    }
  };

  if (!isLoaded) return <div className="p-8 text-center font-bold text-slate-500">Cargando perfil...</div>;

  const getStoreScheduleStatus = () => {
    if (!openTime) return { status: 'unknown', message: 'Horario no especificado' };
    
    const currentDayIdx = new Date().getDay();
    const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayName = daysMap[currentDayIdx];
    
    if (!workDays[currentDayName]) return { status: 'closed', message: `Cerrado (Hoy ${currentDayName} no laborable)` };
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const currentMins = currentHour * 60 + currentMin;
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    
    let isClosed = false;
    let minsToClose = 0;

    if (closeMins < openMins) {
      if (currentMins < openMins && currentMins >= closeMins) isClosed = true;
      else {
        minsToClose = (currentMins >= openMins) ? ((1440 - currentMins) + closeMins) : (closeMins - currentMins);
      }
    } else {
      if (currentMins < openMins || currentMins >= closeMins) isClosed = true;
      else {
        minsToClose = closeMins - currentMins;
      }
    }
    
    if (isClosed) return { status: 'closed', message: `Cerrado (Abre a las ${openTime})` };
    
    if (minsToClose <= closeWarningMinutes) {
      return { status: 'closing', message: `Cierra en ${minsToClose} min` };
    }
    
    return { status: 'open', message: `Abierto (Cierra a las ${closeTime})` };
  };

  const scheduleStatusPreview = getStoreScheduleStatus();

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Perfil de la Tienda</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura los datos públicos, respaldos ACID y métodos de cobro.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-orange-500/20 cursor-pointer">
          <Save size={18} />
          {isSaving ? 'Guardando...' : 'Guardar Perfil'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Centro de Respaldos & Disaster Recovery ACID v4.0 (AxonPOS Módulo 2) */}
        <section className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white dark:to-zinc-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 shadow-xs p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <Database size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Centro de Respaldos & Disaster Recovery
                  </h3>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ACID v4.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Genera respaldos locales criptográficos (.axonbak), restaura datos ante contingencias o sincroniza con Supabase.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <Database size={15} /> Abrir Respaldos (.axonbak)
            </button>
          </div>
        </section>

        {/* Cuenta y Seguridad */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <User size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Cuenta del Administrador</h3>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center">
                {authProvider === 'google' ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                ) : (
                  <Mail className="text-slate-500" size={24} />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{adminEmail || 'Cargando...'}</p>
                <p className="text-xs font-medium text-slate-500">
                  Registrado vía {authProvider === 'google' ? 'Google' : 'Correo Electrónico'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
              {isEmailConfirmed ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                  <ShieldCheck size={16} />
                  <span className="text-xs font-bold">Cuenta Verificada</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                      <MailWarning size={16} />
                      <span className="text-xs font-bold flex-1">Pendiente de Verificación</span>
                      <button 
                        onClick={handleRefreshAuthStatus} 
                        disabled={isRefreshingAuth}
                        className="ml-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 disabled:opacity-50 transition-colors bg-amber-100/50 dark:bg-amber-800/30 p-1 rounded-md border border-amber-200 dark:border-amber-700/50"
                        title="Actualizar estado si ya verificaste"
                      >
                        <RefreshCw size={14} className={isRefreshingAuth ? 'animate-spin' : ''} />
                      </button>
                    </div>
                    <button 
                      onClick={handleResendConfirmation} 
                      disabled={isResending || !adminEmail}
                      className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline disabled:opacity-50 text-right w-full block"
                    >
                      {isResending ? 'Enviando...' : 'Reenviar enlace de confirmación'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Contraseña / Key */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-lg">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Cambio de Contraseña</h3>
              <p className="text-xs text-slate-500 mt-1">Administra tu contraseña para iniciar sesión con correo electrónico.</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 mb-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Contraseña generada (Key):</p>
              <p className="text-lg font-mono mt-1 text-slate-600 dark:text-slate-300">
                {showKey ? (generatedPassword || 'No definida') : '••••••••••••'}
              </p>
            </div>
            <button type="button" onClick={() => setShowKey(!showKey)} className="px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-lg transition-colors">
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="flex flex-col gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-800 dark:text-white mb-1 block">Contraseña Actual</label>
                  <div className="relative">
                    <input 
                      type={showCurrentPass ? "text" : "password"} 
                      value={currentPassword} 
                      onChange={e => setCurrentPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors"
                      title={showCurrentPass ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-800 dark:text-white mb-1 block">Nueva Contraseña</label>
                  <div className="relative">
                    <input 
                      type={showNewPass ? "text" : "password"} 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors"
                      title={showNewPass ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-800 dark:text-white mb-1 block">Confirmar Nueva</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPass ? "text" : "password"} 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors"
                      title={showConfirmPass ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {passwordStatus.msg && (
                <div className={`p-3 rounded-lg text-sm font-medium ${passwordStatus.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                  {passwordStatus.msg}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={isChangingPassword} className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-70">
                  {isChangingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
              </div>

            </div>
          </form>
        </section>

        {/* Info de Tienda */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
              <Store size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Información de la Tienda</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Store size={16} className="text-orange-500" />
                Nombre Comercial de la Tienda
              </label>
              <input 
                type="text" 
                value={storeName} 
                onChange={e => setStoreName(e.target.value)} 
                placeholder="Ej. Mi Tienda Online" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" 
              />
              <p className="text-[11px] text-slate-400">Es el nombre público en el directorio y vitrina virtual.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User size={16} className="text-blue-500" />
                Nombre del Propietario / Encargado
              </label>
              <input 
                type="text" 
                value={ownerName} 
                onChange={e => setOwnerName(e.target.value)} 
                placeholder="Ej. Hernán Pérez" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" 
              />
              <p className="text-[11px] text-slate-400">Representante registrado en el perfil y contacto del comercio.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText size={16} className="text-emerald-500" />
                Cédula o RIF Fiscal
              </label>
              <input 
                type="text" 
                value={rif} 
                onChange={e => setRif(e.target.value)} 
                placeholder="Ej. J-12345678-0 ó V-18234567" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" 
              />
              <p className="text-[11px] text-slate-400">Identificación fiscal del comercio para pagos y notas.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin size={16} className="text-red-500" />
                Dirección Física del Local / Negocio
              </label>
              <input 
                type="text" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Ej. Cagua, Calle Bolívar cruce con San Juan, Local #3" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" 
              />
              <p className="text-[11px] text-slate-400">Dirección visible para clientes en el mapa y pedidos.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Moneda Principal</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="COP">COP ($)</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción Breve</label>
              <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Vendemos los mejores productos del mercado..." className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"></textarea>
            </div>

            <div className="space-y-2 md:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Categorías en el Marketplace de AxonMarket
                </label>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  {storeCategories.length} {storeCategories.length === 1 ? 'categoría seleccionada' : 'categorías seleccionadas'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Selecciona los departamentos donde los clientes encontrarán tu tienda al usar los filtros de búsqueda en AxonMarket:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-2">
                {MARKETPLACE_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = storeCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (storeCategories.length > 1) {
                            setStoreCategories(storeCategories.filter(c => c !== cat.id));
                          }
                        } else {
                          setStoreCategories([...storeCategories, cat.id]);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/90 border-2 border-orange-500 text-orange-950 shadow-xs ring-2 ring-orange-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform ${
                        isSelected ? 'bg-orange-500 text-white shadow-xs' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <span className="text-xs font-bold leading-tight line-clamp-1">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Redes Sociales */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Link size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Redes Sociales</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Instagram</label>
              <input type="text" value={socialLinks?.instagram || ''} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} placeholder="@usuario o link" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">TikTok</label>
              <input type="text" value={socialLinks?.tiktok || ''} onChange={e => setSocialLinks({...socialLinks, tiktok: e.target.value})} placeholder="@usuario o link" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Facebook</label>
              <input type="text" value={socialLinks?.facebook || ''} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} placeholder="Enlace de perfil o página" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp</label>
              <input type="text" value={socialLinks?.whatsapp || ''} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} placeholder="Número con código de país (Ej: +58414...)" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            </div>
          </div>
        </section>

        {/* Imágenes de Tienda */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-lg">
              <ImageIcon size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Imágenes y Diseño</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Logotipo de la Tienda</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950/50">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} className="text-slate-400" />}
                </div>
                <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium cursor-pointer transition-colors">
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} disabled={isSaving} />
                  Subir Logo
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Imagen de Portada (Fondo)</label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950/50">
                  {coverUrl ? <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-slate-400" />}
                </div>
                <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium cursor-pointer transition-colors">
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'cover')} disabled={isSaving} />
                  Subir Portada
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Color de Marca de la Vitrina */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                <Palette size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Color de Marca para tu Vitrina</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Elige el color que combine con tu marca. Se aplica <strong>únicamente en tu vitrina pública</strong> (botones, badges, catálogo y carrito), sin alterar el panel de control ni el POS.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto bg-slate-50 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Color activo:</span>
              <span className="w-5 h-5 rounded-full border border-black/15 shadow-xs" style={{ backgroundColor: primaryColor }} />
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{primaryColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Swatches Circulares Elegantes de Color */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 block">
                Paleta de Colores Comerciales (Toca para seleccionar)
              </label>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                {STOREFRONT_COLOR_PRESETS.map((preset) => {
                  const isSelected = (primaryColor || '').toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(preset.hex);
                        setCustomHexInput(preset.hex);
                      }}
                      className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-3 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-md z-10'
                          : 'hover:scale-105 border border-black/15 shadow-2xs hover:shadow-xs'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={`${preset.name}: ${preset.description}`}
                    >
                      {isSelected && (
                        <CheckCircle2
                          size={18}
                          style={{ color: getContrastTextColor(preset.hex) }}
                          className="drop-shadow-xs"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta Dinámica de Rubro y Color Seleccionado */}
            {(() => {
              const currentPreset = STOREFRONT_COLOR_PRESETS.find(p => p.hex.toLowerCase() === (primaryColor || '').toLowerCase());
              return (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full border border-black/20 shrink-0 shadow-xs" style={{ backgroundColor: primaryColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentPreset ? currentPreset.name : 'Color Personalizado'}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {primaryColor.toUpperCase()}
                      </span>
                      {currentPreset?.badge && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {currentPreset.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {currentPreset ? currentPreset.description : 'Código HEX configurado a la medida de tu identidad de marca'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Selector Libre / Color Personalizado */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  A la medida:
                </span>
                <input
                  type="color"
                  value={isValidHex(primaryColor) ? primaryColor : DEFAULT_STOREFRONT_COLOR}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPrimaryColor(val);
                    setCustomHexInput(val);
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 overflow-hidden"
                  title="Seleccionar en la rueda de colores"
                />
                <input
                  type="text"
                  value={customHexInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomHexInput(val);
                    if (isValidHex(val)) setPrimaryColor(val);
                  }}
                  placeholder="#HEX"
                  maxLength={7}
                  className="w-24 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryColor(DEFAULT_STOREFRONT_COLOR);
                    setCustomHexInput(DEFAULT_STOREFRONT_COLOR);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Restablecer al Ámbar Axon oficial"
                >
                  <RotateCcw size={12} />
                  <span>Original</span>
                </button>
              </div>

              {/* Vista Previa en Vivo (Miniatura de Vitrina) */}
              <div className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:justify-start gap-3">
                <span className="text-[11px] font-medium text-slate-500 shrink-0">
                  Vista Previa:
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs"
                    style={{
                      backgroundColor: primaryColor,
                      color: getContrastTextColor(primaryColor)
                    }}
                  >
                    Categoría
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                    style={{
                      backgroundColor: hexToRgba(primaryColor, 0.12),
                      color: primaryColor,
                      borderColor: hexToRgba(primaryColor, 0.3)
                    }}
                  >
                    -20%
                  </span>
                  <button
                    type="button"
                    className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-xs cursor-default"
                    style={{
                      backgroundColor: primaryColor,
                      color: getContrastTextColor(primaryColor)
                    }}
                  >
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tasa BCV */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg">
              <Calculator size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tasa de Cambio (BCV)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tasa de Cambio Actual (Bs por $)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-2.5 text-slate-400 font-bold">Bs.</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={bcvRate} 
                    onChange={e => setBcvRate(Number(e.target.value))} 
                    disabled={!manualBcv}
                    className={`w-full pl-12 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors ${!manualBcv ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white'}`} 
                  />
                </div>
                {!manualBcv && (
                  <button 
                    onClick={fetchBcvRate} 
                    disabled={isFetchingBcv}
                    title="Sincronizar ahora"
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={18} className={isFetchingBcv ? "animate-spin text-violet-500" : ""} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center pt-6">
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={manualBcv} onChange={e => setManualBcv(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Actualizar de forma manual (Respaldo)</span>
                </label>
            </div>
          </div>
        </section>

        {/* Pago Móvil */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Datos de Pago Móvil</h3>
              <p className="text-xs text-slate-500 mt-1">Estos datos se le mostrarán al cliente al hacer checkout.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <PhoneIcon size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Aceptar Pago Móvil</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={paymentMobile} onChange={e => setPaymentMobile(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              
              {paymentMobile && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Banco Emisor</label>
                    <input type="text" value={pmBank} onChange={e => setPmBank(e.target.value)} placeholder="Ej. Banesco (0134)" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Teléfono</label>
                    <input type="text" value={pmPhone} onChange={e => setPmPhone(e.target.value)} placeholder="Ej. 04141234567" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Cédula / RIF</label>
                    <input type="text" value={pmId} onChange={e => setPmId(e.target.value)} placeholder="Ej. V20123456" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
            {/* Zelle */}
            <div className="flex flex-col gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Zelle</p>
                    <p className="text-xs text-slate-500">Recibe pagos en dólares.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={zelleActive} onChange={e => setZelleActive(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              
              {zelleActive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Correo de Zelle</label>
                    <input type="email" value={zelleEmail} onChange={e => setZelleEmail(e.target.value)} placeholder="Ej. pagos@mitienda.com" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del Titular</label>
                    <input type="text" value={zelleName} onChange={e => setZelleName(e.target.value)} placeholder="Ej. Juan Perez" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Efectivo */}
            <div className="flex items-start justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-slate-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Efectivo en Tienda / Delivery</p>
                  <p className="text-xs text-slate-500">El cliente paga en efectivo al recibir.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={cashActive} onChange={e => setCashActive(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Envíos */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Configuración de Envío</h3>
              <p className="text-xs text-slate-500 mt-1">Reglas para el cobro del delivery.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Tarifa Plana</p>
                <p className="text-xs text-slate-500">Cobra un valor fijo por cualquier envío.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 dark:text-white font-bold">$</span>
                <input type="number" step="0.01" value={flatRate} onChange={e => setFlatRate(Number(e.target.value))} className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Envío Gratis</p>
                <p className="text-xs text-slate-500">No cobrar delivery en ningún caso.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={freeShipping} onChange={e => setFreeShipping(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-amber-200 dark:border-amber-900/30 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/10 shadow-sm shrink-0">
                  <div className="flex items-center font-black tracking-tighter">
                    <span className="text-red-600 text-[10px]">E</span>
                    <span className="text-red-600 text-[10px]">M</span>
                    <Zap size={10} className="fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Alianza con "En Minutos"</p>
                  <p className="text-xs text-slate-500">Muestra la insignia de delivery premium oficial en tu perfil público.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={hasEnminutosAlliance} onChange={e => setHasEnminutosAlliance(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Horarios de Atención */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Horarios de Atención</h3>
              <p className="text-xs text-slate-500 mt-1">Configura si tu tienda tiene horario de recepción de pedidos.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Activar Restricción de Horario</p>
                  <p className="text-xs text-slate-500">Bloquea el carrito cuando estés cerrado.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={scheduleActive} onChange={e => setScheduleActive(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {scheduleActive && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Hora Apertura</label>
                      <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Hora Cierre</label>
                      <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Margen de Cierre (Amarillo)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="120" value={closeWarningMinutes} onChange={e => setCloseWarningMinutes(Number(e.target.value))} className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                        <span className="text-xs text-slate-500">minutos antes del cierre se bloquearán las compras.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl border flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Vista previa del semáforo actual:</p>
                      <p className="text-xs text-slate-500 mt-0.5">Así ve el estado el cliente en este momento exacto.</p>
                    </div>
                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm tracking-wide ${
                      scheduleStatusPreview.status === 'open' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      scheduleStatusPreview.status === 'closing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        scheduleStatusPreview.status === 'open' ? 'bg-emerald-500' :
                        scheduleStatusPreview.status === 'closing' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></div>
                      {scheduleStatusPreview.message}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Días Laborables</label>
                    <div className="flex flex-wrap gap-2">
                      {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                        <button 
                          key={dia}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setWorkDays(prev => ({ ...prev, [dia]: !prev[dia] }));
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                            workDays[dia] 
                            ? 'bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-300' 
                            : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {dia.charAt(0).toUpperCase() + dia.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Seguridad y Acceso (PIN) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Seguridad y Acceso</h3>
              <p className="text-xs text-slate-500 mt-1">Bloquea rutas sensibles para tus empleados usando un PIN.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <label className="text-sm font-bold text-slate-800 dark:text-white mb-1 block">PIN Administrativo (4 dígitos)</label>
                <p className="text-xs text-slate-500 mb-3">Si dejas este campo vacío, cualquier empleado podrá entrar al Dashboard, Analítica y Perfil.</p>
                <input 
                  type="password" 
                  maxLength={4}
                  value={adminPin} 
                  onChange={e => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                  placeholder="Ej: 1234"
                  className="w-full max-w-[200px] px-4 py-2 text-center tracking-[0.5em] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:border-red-500" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Personal y PINs de Acceso (Picking & AxonPOS) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Personal y PINs de Acceso (Picking & AxonPOS)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Crea y asigna un PIN de 4 dígitos a cada miembro de tu equipo. Este PIN funciona como su cédula digital para identificarse al empacar pedidos en Picking y para acceder a AxonPOS.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Formulario de Alta de Trabajador */}
            <form onSubmit={handleAddStaff} className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                <UserPlus size={16} className="text-orange-600" />
                <span>Registrar Nuevo Personal</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                    Nombre del Trabajador
                  </label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Ej. Carlos Gómez"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                    Rol / Cargo
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-orange-500 font-medium"
                  >
                    <option value="PICKER">Empacador (Picking)</option>
                    <option value="CASHIER">Cajero (AxonPOS)</option>
                    <option value="SUPERVISOR">Supervisor / Almacén</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                    PIN Asignado (4 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newStaffPin}
                    onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-center tracking-[0.4em] font-mono font-black text-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {staffStatusMsg.msg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    staffStatusMsg.type === 'error'
                      ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
                  }`}
                >
                  {staffStatusMsg.type === 'error' ? '⚠️ ' : '✓ '}
                  {staffStatusMsg.msg}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isStaffSaving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-600/20"
                >
                  <Check size={15} />
                  <span>{isStaffSaving ? 'Guardando...' : 'Guardar y Asignar PIN'}</span>
                </button>
              </div>
            </form>

            {/* Listado de Personal Registrado */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Personal Autorizado ({staffList.length})
                </span>
              </div>

              {staffList.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30">
                  <KeyRound size={28} className="mx-auto text-slate-400 mb-2 opacity-50" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No hay trabajadores con PIN registrados todavía
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Agrega el primer miembro de tu equipo usando el formulario superior.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {staffList.map((worker) => {
                    const pin = worker.pin_code || worker.pinCode || '----';
                    const isPinVisible = !!showStaffPins[worker.id];
                    const roleLabel =
                      worker.role === 'CASHIER'
                        ? 'Cajero'
                        : worker.role === 'SUPERVISOR'
                        ? 'Supervisor'
                        : 'Empacador';

                    return (
                      <div
                        key={worker.id || pin}
                        className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-black text-sm shrink-0 border border-orange-200 dark:border-orange-900/40">
                            {(worker.full_name || worker.fullName || 'T').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                              {worker.full_name || worker.fullName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {roleLabel}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                PIN: {isPinVisible ? pin : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleShowPin(worker.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title={isPinVisible ? 'Ocultar PIN' : 'Ver PIN'}
                              >
                                {isPinVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStaff(worker.id, pin, worker.full_name || worker.fullName)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0"
                          title="Revocar acceso"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Modales de Administración (AxonPOS ➔ AxonMarket) */}
      <BackupManagerModal 
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      <UserManagementModal 
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
      />

    </div>
  );
}
