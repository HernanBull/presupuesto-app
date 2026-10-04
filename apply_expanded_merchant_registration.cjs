const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'ecommerce', 'pages', 'MarketplaceDirectory.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update state variables to add the new ones, and a loadingText index
const stateRegex = /const \[merchantForm, setMerchantForm\] = useState\(\{\s*businessName:\s*'',\s*email:\s*'',\s*password:\s*''\s*\}\);/;
const newState = `const [merchantForm, setMerchantForm] = useState({ 
    businessName: '', 
    email: '', 
    password: '',
    category: 'Viveres',
    scheduleOpen: '08:00',
    scheduleClose: '18:00',
    workingDays: 'Lunes a Viernes',
    rif: '',
    pagoMovilPhone: '',
    pagoMovilBank: '',
    pagoMovilId: '',
    addressState: '',
    addressCity: '',
    addressLine: '',
    gpsCoords: null
  });
  
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const loadingTexts = ["Configurando tu base de datos...", "Asociando métodos de pago...", "Desplegando tu vitrina..."];
  
  useEffect(() => {
    if (merchantRegStep === 7) {
      const interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev < loadingTexts.length - 1 ? prev + 1 : prev));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [merchantRegStep]);
`;
content = content.replace(stateRegex, newState);

// 2. Replace the handlers (from handleMerchantRegisterStep1 to handleMerchantVerify2FA)
const handlersRegex = /const handleMerchantRegisterStep1 = \(e\) => \{[\s\S]*?const handleMerchantVerify2FA = async \(e\) => \{[\s\S]*?\} catch \(err\) \{\s*console\.error\(err\);\s*alert\(err\.message \|\| 'Error de verificación'\);\s*setMerchantLoading\(false\);\s*\}\s*\};/m;

const newHandlers = `const handleMerchantRegisterStep1 = (e) => {
    e.preventDefault();
    if (merchantForm.email && merchantForm.password) setMerchantRegStep(2);
  };

  const handleMerchantRegisterStep2 = (e) => {
    e.preventDefault();
    if (merchantForm.businessName) setMerchantRegStep(3);
  };

  const handleMerchantRegisterStep3 = (e) => {
    e.preventDefault();
    setMerchantRegStep(4);
  };

  const handleMerchantRegisterStep4 = (e) => {
    e.preventDefault();
    if (merchantForm.rif && merchantForm.pagoMovilPhone && merchantForm.pagoMovilBank) setMerchantRegStep(5);
  };

  const handleMerchantRegisterStep5 = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: merchantForm.businessName })
      });
      if (!res.ok) throw new Error('Error al crear la tienda virtual');
      const data = await res.json();
      
      const generatedSlug = merchantForm.businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      // Generar 2FA
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: 'Axon Market',
        label: merchantForm.businessName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });
      setMerchantMfaSecret(secret.base32);
      setMerchantMfaUrl(totp.toString());
      setTempWorkspace({ id: data.id, slug: generatedSlug });
      setMerchantRegStep(6);
      setMerchantLoading(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error de conexión');
      setMerchantLoading(false);
    }
  };

  const handleDetectGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMerchantForm(prev => ({
            ...prev,
            gpsCoords: { lat: position.coords.latitude, lng: position.coords.longitude }
          }));
          alert("¡Ubicación detectada exitosamente!");
        },
        (error) => {
          alert("No se pudo detectar la ubicación. Por favor, ingrésala manualmente.");
        }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
    }
  };

  const handleMerchantVerify2FA = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'Axon Market',
        label: merchantForm.businessName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(merchantMfaSecret)
      });
      
      const delta = totp.validate({ token: merchantMfaCode, window: 10 });
      if (delta === null) throw new Error('Código 2FA inválido');

      const configRes = await fetch(\`http://localhost:3001/api/workspaces/\${tempWorkspace.id}/config\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store_slug: tempWorkspace.slug,
          config: {
            business_type: merchantForm.category,
            modules: ['orders', 'inventory', 'analytics', 'product_studio'],
            categories: [merchantForm.category],
            expediente: {
              legalType: merchantForm.rif?.charAt(0) || 'V',
              rif: merchantForm.rif || 'V-00000000-0',
              state: merchantForm.addressState || 'Por definir',
              city: merchantForm.addressCity || 'Por definir',
              address: merchantForm.addressLine || '',
              gps: merchantForm.gpsCoords,
              whatsapp: merchantForm.pagoMovilPhone || '',
              instagram: '',
              pagoMovil: {
                 phone: merchantForm.pagoMovilPhone,
                 bank: merchantForm.pagoMovilBank,
                 id: merchantForm.pagoMovilId || merchantForm.rif
              },
              schedule: {
                 open: merchantForm.scheduleOpen,
                 close: merchantForm.scheduleClose,
                 days: merchantForm.workingDays
              }
            },
            adminEmail: merchantForm.email,
            adminPassword: merchantForm.password,
            mfaSecret: merchantMfaSecret,
            mfaEnabled: true
          }
        })
      });

      if (!configRes.ok) throw new Error('Error al configurar los módulos');

      localStorage.setItem('activeWorkspace', tempWorkspace.id);
      localStorage.setItem('storeSlug', tempWorkspace.slug);
      
      setMerchantRegStep(7);
      setMerchantLoading(false);

      setTimeout(() => {
        navigate('/ecommerce');
      }, 3500);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error de verificación');
      setMerchantLoading(false);
    }
  };`;
content = content.replace(handlersRegex, newHandlers);

// 3. Update the form logic for the steps
// Wait, replacing the form content might be a bit tricky because of nested JSX. Let's do a targeted replace for the form block.
const formRegex = /<form onSubmit=\{merchantAuthMode === 'register' \? \(merchantRegStep === 1 \? handleMerchantRegisterStep1 : merchantRegStep === 2 \? handleMerchantRegisterStep2 : handleMerchantVerify2FA\) : handleMerchantLogin\} className="p-8 pt-4 space-y-5">[\s\S]*?<\/form>/;

const newForm = \`<form onSubmit={merchantAuthMode === 'register' ? (
                  merchantRegStep === 1 ? handleMerchantRegisterStep1 : 
                  merchantRegStep === 2 ? handleMerchantRegisterStep2 : 
                  merchantRegStep === 3 ? handleMerchantRegisterStep3 : 
                  merchantRegStep === 4 ? handleMerchantRegisterStep4 : 
                  merchantRegStep === 5 ? handleMerchantRegisterStep5 : 
                  handleMerchantVerify2FA
                ) : handleMerchantLogin} className="p-8 pt-4 space-y-5">
                  {merchantAuthMode === 'register' ? (
                    merchantRegStep === 7 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center space-y-6 py-12">
                        <Loader2 className="animate-spin text-amber-500" size={64} />
                        <motion.h3 
                          key={loadingTextIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-lg font-bold text-white text-center"
                        >
                          {loadingTexts[loadingTextIndex]}
                        </motion.h3>
                      </motion.div>
                    ) : (
                    <>
                      {merchantRegStep === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                            <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" autoFocus />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                            <div className="relative">
                              <input type={showMerchantPassword ? "text" : "password"} required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                              <button type="button" onClick={() => setShowMerchantPassword(!showMerchantPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                                {showMerchantPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>

                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                              <span className="bg-zinc-950 px-2 text-zinc-500">o continúa con</span>
                            </div>
                          </div>

                          <div className="flex justify-center w-full [&>div]:w-full [&>div>div]:!w-full [&_iframe]:!w-full">
                            <GoogleLogin
                              onSuccess={handleGoogleMerchantSuccess}
                              onError={() => { console.log('Login Failed'); }}
                              theme="filled_black"
                              shape="pill"
                              size="large"
                              width="100%"
                            />
                          </div>
                        </motion.div>
                      )}
                      
                      {merchantRegStep === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nombre del Negocio</label>
                            <input type="text" required value={merchantForm.businessName} onChange={e => setMerchantForm({...merchantForm, businessName: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="Ej. Inversiones San José" autoFocus />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Tipo de Productos</label>
                            <select required value={merchantForm.category} onChange={e => setMerchantForm({...merchantForm, category: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light appearance-none">
                              <option value="Viveres">Víveres / Automercado</option>
                              <option value="Ropa">Ropa y Accesorios</option>
                              <option value="Comida Rapida">Comida Rápida / Restaurante</option>
                              <option value="Tecnologia">Tecnología / Electrónica</option>
                              <option value="Servicios">Servicios</option>
                              <option value="General">Otro / Variedades</option>
                            </select>
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Horarios de Atención</label>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="block text-xs text-zinc-500 mb-1">Apertura</label>
                              <input type="time" required value={merchantForm.scheduleOpen} onChange={e => setMerchantForm({...merchantForm, scheduleOpen: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-zinc-500 mb-1">Cierre</label>
                              <input type="time" required value={merchantForm.scheduleClose} onChange={e => setMerchantForm({...merchantForm, scheduleClose: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Días Laborales</label>
                            <select required value={merchantForm.workingDays} onChange={e => setMerchantForm({...merchantForm, workingDays: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light appearance-none">
                              <option value="Lunes a Viernes">Lunes a Viernes</option>
                              <option value="Lunes a Sábado">Lunes a Sábado</option>
                              <option value="Todos los días">Todos los días</option>
                            </select>
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 4 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">RIF (Jurídico o Personal)</label>
                            <input type="text" required value={merchantForm.rif} onChange={e => setMerchantForm({...merchantForm, rif: e.target.value.toUpperCase()})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="J-12345678-9 o V-12345678" />
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl space-y-3">
                            <p className="text-xs text-amber-500 font-bold tracking-wider">DATOS PARA RECIBIR PAGO MÓVIL</p>
                            <input type="text" required value={merchantForm.pagoMovilPhone} onChange={e => setMerchantForm({...merchantForm, pagoMovilPhone: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm placeholder-zinc-600" placeholder="Teléfono (Ej. 04141234567)" />
                            <select required value={merchantForm.pagoMovilBank} onChange={e => setMerchantForm({...merchantForm, pagoMovilBank: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm appearance-none">
                              <option value="">Selecciona tu Banco</option>
                              <option value="Banesco">Banesco</option>
                              <option value="Mercantil">Mercantil</option>
                              <option value="Provincial">Provincial</option>
                              <option value="Venezuela">Venezuela</option>
                              <option value="BNC">BNC</option>
                            </select>
                            <input type="text" required value={merchantForm.pagoMovilId} onChange={e => setMerchantForm({...merchantForm, pagoMovilId: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm placeholder-zinc-600" placeholder="Cédula / RIF asociado" />
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 5 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          {isMobile ? (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-center space-y-3">
                              <p className="text-sm text-amber-500">Vemos que estás desde tu teléfono. Autoriza el acceso para detectar tu ubicación exacta mediante GPS.</p>
                              <button type="button" onClick={handleDetectGPS} className="w-full bg-amber-500 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-400">
                                <MapPin size={18} /> Obtener mi ubicación actual
                              </button>
                              {merchantForm.gpsCoords && <p className="text-xs text-emerald-500 font-bold">¡Ubicación GPS Guardada!</p>}
                            </div>
                          ) : (
                            <div className="bg-zinc-800/50 p-4 rounded-2xl text-center space-y-2 mb-2">
                              <p className="text-xs text-zinc-400">Como estás desde una computadora, ingresa tu dirección manualmente.</p>
                              <button type="button" onClick={handleDetectGPS} className="text-amber-500 text-xs hover:underline flex items-center justify-center gap-1 mx-auto">
                                <MapPin size={12} /> Intentar usar GPS de todas formas
                              </button>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input type="text" required value={merchantForm.addressState} onChange={e => setMerchantForm({...merchantForm, addressState: e.target.value})} className="w-1/2 bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm" placeholder="Estado (Ej. Miranda)" />
                            <input type="text" required value={merchantForm.addressCity} onChange={e => setMerchantForm({...merchantForm, addressCity: e.target.value})} className="w-1/2 bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm" placeholder="Ciudad (Ej. Caracas)" />
                          </div>
                          <textarea required value={merchantForm.addressLine} onChange={e => setMerchantForm({...merchantForm, addressLine: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm min-h-[80px]" placeholder="Dirección detallada (Calle, Edificio, Local...)"></textarea>
                        </motion.div>
                      )}

                      {merchantRegStep === 6 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center space-y-4">
                          <p className="text-center text-sm text-zinc-400">Escanea este código QR en tu app de Google Authenticator para asegurar tu cuenta de comercio.</p>
                          <div className="bg-white p-4 rounded-xl shadow-lg border border-white/20">
                            <QRCodeSVG value={merchantMfaUrl} size={180} />
                          </div>
                          <p className="text-xs text-zinc-600">Clave manual: <span className="font-mono text-amber-500">{merchantMfaSecret}</span></p>
                          
                          <div className="w-full mt-4">
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest text-center">Código de 6 dígitos</label>
                            <input type="text" required maxLength={6} value={merchantMfaCode} onChange={e => setMerchantMfaCode(e.target.value.replace(/\\D/g, ''))} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-mono text-center tracking-[0.5em] text-lg" placeholder="123456" autoFocus />
                          </div>
                        </motion.div>
                      )}

                      <button 
                        type="submit" 
                        disabled={
                          merchantLoading || 
                          (merchantRegStep === 1 && (!merchantForm.email || !merchantForm.password)) || 
                          (merchantRegStep === 2 && (!merchantForm.businessName || !merchantForm.category)) || 
                          (merchantRegStep === 3 && (!merchantForm.scheduleOpen || !merchantForm.scheduleClose)) || 
                          (merchantRegStep === 4 && (!merchantForm.rif || !merchantForm.pagoMovilPhone || !merchantForm.pagoMovilBank || !merchantForm.pagoMovilId)) ||
                          (merchantRegStep === 5 && (!merchantForm.addressState || !merchantForm.addressCity || !merchantForm.addressLine)) ||
                          (merchantRegStep === 6 && merchantMfaCode.length < 6)
                        }
                        className="w-full bg-amber-500 text-black rounded-full py-4 mt-6 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {merchantLoading ? (
                          <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                        ) : (
                          <>{merchantRegStep < 6 ? 'Continuar' : 'Verificar y Acceder'} <ArrowRight size={16} /></>
                        )}
                      </button>
                    </>
                    )
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                        <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                        <div className="relative">
                          <input type={showMerchantPassword ? "text" : "password"} required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                          <button type="button" onClick={() => setShowMerchantPassword(!showMerchantPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                            {showMerchantPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end mt-2">
                        <button type="button" onClick={() => setMerchantAuthMode('recover')} className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider transition-colors">
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>

                      <button 
                        type="submit" 
                        disabled={merchantLoading || !merchantForm.email}
                        className="w-full bg-amber-500 text-black rounded-full py-4 mt-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {merchantLoading ? (
                          <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                        ) : (
                          <>Acceder al ERP <ArrowRight size={16} /></>
                        )}
                      </button>
                    </>
                  )}
                </form>\`;

content = content.replace(formRegex, newForm);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully expanded merchant registration process');
