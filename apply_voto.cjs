const fs = require('fs');

// --- 1. Modify OrdersManager.jsx ---
let ordersContent = fs.readFileSync('src/modules/ecommerce/pages/OrdersManager.jsx', 'utf8');

// Replace verifyPayment logic
ordersContent = ordersContent.replace(
  `  const verifyPayment = async (id, isApproved) => {
    const newPaymentStatus = isApproved ? 'approved' : 'rejected';
    const newStatus = isApproved ? 'Preparando' : undefined;
    const orderToMove = orders.find(o => o.id === id);
    if (!orderToMove) return;

    const previousStatus = orderToMove.status;
    const previousPaymentStatus = orderToMove.paymentStatus;

    let newDeliveryPin = orderToMove.deliveryPin;
    if (isApproved && !newDeliveryPin) {
      newDeliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
    }`,
  `  const verifyPayment = async (id, action) => {
    let newPaymentStatus;
    let newStatus = undefined;
    
    if (action === 'approve') {
      newPaymentStatus = 'approved';
      newStatus = 'Preparando';
    } else if (action === 'reject') {
      newPaymentStatus = 'rejected';
    } else if (action === 'review') {
      newPaymentStatus = 'review';
    } else if (action === 'fraud') {
      newPaymentStatus = 'fraud';
      newStatus = 'Pendiente'; // stays here, but marked fraud
    }

    const orderToMove = orders.find(o => o.id === id);
    if (!orderToMove) return;

    const previousStatus = orderToMove.status;
    const previousPaymentStatus = orderToMove.paymentStatus;

    let newDeliveryPin = orderToMove.deliveryPin;
    if (action === 'approve' && !newDeliveryPin) {
      newDeliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
    }`
);

// Replace Kanban card actions
ordersContent = ordersContent.replace(
  `                    {order.paymentMethod === 'pago_movil' && order.paymentStatus === 'pending' && (
                      <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Pago por verificar</span>
                        </div>
                        
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1 text-xs">
                            <p className="flex items-center gap-1"><span className="text-slate-500">Ref:</span> <span className="font-bold text-slate-800 dark:text-white">{order.paymentDetails?.ref || 'N/A'}</span>
                              {order.paymentDetails?.ref && (
                                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.paymentDetails.ref); alert('Copiado: ' + order.paymentDetails.ref); }} className="text-slate-400 hover:text-violet-500 transition-colors p-0.5 rounded" title="Copiar Referencia">
                                  <Copy size={12} />
                                </button>
                              )}
                            </p>
                            <p><span className="text-slate-500">Banco:</span> <span className="font-bold text-slate-800 dark:text-white">{order.paymentDetails?.bank || 'N/A'}</span></p>
                          </div>
                          
                          {order.paymentDetails?.capture && (
                            <a href={order.paymentDetails.capture} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 block hover:opacity-80 transition-opacity">
                              <img src={order.paymentDetails.capture} alt="Capture" className="w-full h-full object-cover" />
                            </a>
                          )}
                        </div>

                        <div className="flex gap-1.5 mt-2">
                           <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, true); }} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                             <Check size={14} /> Aprobar
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, false); }} className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                             <X size={14} /> Rechazar
                           </button>
                        </div>
                      </div>
                    )}`,
  `                    {order.paymentMethod === 'pago_movil' && (order.paymentStatus === 'pending' || order.paymentStatus === 'review' || order.paymentStatus === 'fraud') && (
                      <div className={\`mb-3 p-3 border rounded-xl flex flex-col gap-2 \${order.paymentStatus === 'review' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50' : order.paymentStatus === 'fraud' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}\`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {order.paymentStatus === 'review' ? (
                            <><AlertCircle size={14} className="text-orange-600 dark:text-orange-400" /><span className="text-xs font-bold text-orange-700 dark:text-orange-400">En Revisión (Tercero)</span></>
                          ) : order.paymentStatus === 'fraud' ? (
                            <><AlertCircle size={14} className="text-red-600 dark:text-red-400" /><span className="text-xs font-bold text-red-700 dark:text-red-400">Fraude Denunciado</span></>
                          ) : (
                            <><Clock size={14} className="text-amber-600 dark:text-amber-400" /><span className="text-xs font-bold text-amber-700 dark:text-amber-400">Pago por verificar</span></>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1 text-xs">
                            <p className="flex items-center gap-1"><span className="text-slate-500">Ref:</span> <span className="font-bold text-slate-800 dark:text-white">{order.paymentDetails?.ref || 'N/A'}</span>
                              {order.paymentDetails?.ref && (
                                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.paymentDetails.ref); alert('Copiado: ' + order.paymentDetails.ref); }} className="text-slate-400 hover:text-violet-500 transition-colors p-0.5 rounded" title="Copiar Referencia">
                                  <Copy size={12} />
                                </button>
                              )}
                            </p>
                            <p><span className="text-slate-500">Banco:</span> <span className="font-bold text-slate-800 dark:text-white">{order.paymentDetails?.bank || 'N/A'}</span></p>
                          </div>
                          
                          {order.paymentDetails?.capture && (
                            <a href={order.paymentDetails.capture} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 block hover:opacity-80 transition-opacity">
                              <img src={order.paymentDetails.capture} alt="Capture" className="w-full h-full object-cover" />
                            </a>
                          )}
                        </div>

                        {order.paymentStatus === 'pending' && (
                          <div className="flex gap-1.5 mt-2">
                             <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, 'approve'); }} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                               <Check size={12} /> Aprobar
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, 'review'); }} className="flex-1 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 py-1.5 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center transition-colors leading-none text-center" title="Marcar como dudoso/tercero">
                               <span>Revisión</span><span className="opacity-70">(Tercero)</span>
                             </button>
                          </div>
                        )}
                        {order.paymentStatus === 'review' && (
                          <div className="flex gap-1.5 mt-2">
                             <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, 'approve'); }} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                               <Check size={12} /> Válido
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, 'fraud'); }} className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors text-center" title="Denunciar Fraude">
                               <AlertCircle size={12} /> Fraude
                             </button>
                          </div>
                        )}
                      </div>
                    )}`
);

// Replace detail modal buttons
ordersContent = ordersContent.replace(
  `                          {selectedOrder.paymentStatus === 'pending' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1"><Clock size={14}/> Por Verificar</span>
                          ) : selectedOrder.paymentStatus === 'approved' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> Aprobado</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1"><X size={14}/> Rechazado</span>
                          )}`,
  `                          {selectedOrder.paymentStatus === 'pending' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1"><Clock size={14}/> Por Verificar</span>
                          ) : selectedOrder.paymentStatus === 'review' ? (
                            <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1"><AlertCircle size={14}/> En Revisión</span>
                          ) : selectedOrder.paymentStatus === 'fraud' ? (
                            <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1"><AlertCircle size={14}/> Fraude</span>
                          ) : selectedOrder.paymentStatus === 'approved' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> Aprobado</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1"><X size={14}/> Rechazado</span>
                          )}`
);

ordersContent = ordersContent.replace(
  `                  {selectedOrder.paymentStatus === 'pending' && (
                    <div className="mt-3 flex gap-2">
                       <button onClick={() => verifyPayment(selectedOrder.id, true)} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <Check size={16} /> Confirmar Pago
                       </button>
                       <button onClick={() => verifyPayment(selectedOrder.id, false)} className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <X size={16} /> Rechazar
                       </button>
                    </div>
                  )}`,
  `                  {selectedOrder.paymentStatus === 'pending' && (
                    <div className="mt-3 flex gap-2">
                       <button onClick={() => verifyPayment(selectedOrder.id, 'approve')} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <Check size={16} /> Confirmar Pago
                       </button>
                       <button onClick={() => verifyPayment(selectedOrder.id, 'review')} className="flex-1 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <AlertCircle size={16} /> Revisión (Tercero)
                       </button>
                    </div>
                  )}
                  {selectedOrder.paymentStatus === 'review' && (
                    <div className="mt-3 flex gap-2">
                       <button onClick={() => verifyPayment(selectedOrder.id, 'approve')} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <Check size={16} /> Marcar Válido
                       </button>
                       <button onClick={() => verifyPayment(selectedOrder.id, 'fraud')} className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <AlertCircle size={16} /> Denunciar Fraude
                       </button>
                    </div>
                  )}`
);
fs.writeFileSync('src/modules/ecommerce/pages/OrdersManager.jsx', ordersContent, 'utf8');

// --- 2. Modify CustomerProfile.jsx ---
let profileContent = fs.readFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', 'utf8');

profileContent = profileContent.replace(
  `                          <div className="space-y-3">
                            {order.items && order.items.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="font-medium text-zinc-300">{item.quantity}x {item.name}</span>
                                <span className="text-zinc-500">\${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>`,
  `                          <div className="space-y-3">
                            {order.items && order.items.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="font-medium text-zinc-300">{item.quantity}x {item.name}</span>
                                <span className="text-zinc-500">\${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {order.paymentStatus === 'review' && (
                            <div className="mt-6 border border-orange-500/30 bg-orange-500/10 rounded-xl p-4 flex gap-4 items-start">
                              <AlertCircle size={24} className="text-orange-500 shrink-0" />
                              <div>
                                <h4 className="font-bold text-orange-400 mb-1">Pago En Revisión por Tercero</h4>
                                <p className="text-sm text-orange-500/80 mb-3">El comercio ha detectado que el pago proviene de una cuenta no autorizada en tu perfil. Su orden está congelada.</p>
                                <div className="text-xs text-orange-300 font-medium p-3 bg-orange-950/50 rounded-lg">
                                  <strong>ACCIÓN REQUERIDA:</strong> Tienes 24 horas para comunicarte directamente con el comercio y proveer <strong>pruebas verificables</strong> (Cédula del titular, parentesco) de que el pago es legítimo. De lo contrario, los fondos no serán devueltos y se denunciará fraude.
                                </div>
                              </div>
                            </div>
                          )}
                          {order.paymentStatus === 'fraud' && (
                            <div className="mt-6 border border-red-500/30 bg-red-500/10 rounded-xl p-4 flex gap-4 items-start">
                              <AlertCircle size={24} className="text-red-500 shrink-0" />
                              <div>
                                <h4 className="font-bold text-red-400 mb-1">Orden Cancelada - Fraude Reportado</h4>
                                <p className="text-sm text-red-500/80 mb-3">No se pudo verificar la procedencia del pago. Se ha emitido un reporte de fraude a la plataforma y no hay derecho a reembolso.</p>
                              </div>
                            </div>
                          )}`
);

profileContent = profileContent.replace(
  `Los pagos de terceros (triangulación) serán rechazados automáticamente sin derecho a reembolso.</p>`,
  `Los pagos de terceros serán retenidos y estarán sujetos a un estricto proceso de verificación ("Voto de Confianza") con el comercio. De no poder probar la legitimidad del titular en 24 horas, los fondos no serán devueltos y se procederá a denuncia por estafa.</p>`
);

profileContent = profileContent.replace(
  `será considerado fraude, será rechazado automáticamente y los fondos NO me serán reembolsados por política de prevención de triangulación.`,
  `será retenido y sujeto a verificación. Si no puedo comprobar que el pago fue hecho por un familiar o bajo mi consentimiento legítimo en 24h, será considerado estafa y los fondos NO me serán reembolsados.`
);

fs.writeFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', profileContent, 'utf8');
console.log("Applied successfully!");
