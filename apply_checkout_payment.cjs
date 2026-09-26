const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'ecommerce', 'pages', 'PublicStore.jsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useMemo')) {
  content = content.replace(/import React, \{ useEffect, useState, useRef \} from 'react';/, "import React, { useEffect, useState, useRef, useMemo } from 'react';");
}

// 1. Add selectedPaymentProfileIdx state
if (!content.includes('selectedPaymentProfileIdx')) {
  content = content.replace(
    /const \[paymentBank, setPaymentBank\] = useState\(''\);/,
    `const [paymentBank, setPaymentBank] = useState('');
  const [selectedPaymentProfileIdx, setSelectedPaymentProfileIdx] = useState('');`
  );
}

// 2. Add customerPaymentProfiles memo near the other state definitions, maybe right below selectedPaymentProfileIdx
if (!content.includes('customerPaymentProfiles')) {
  content = content.replace(
    /const \[selectedPaymentProfileIdx, setSelectedPaymentProfileIdx\] = useState\(''\);/,
    `const [selectedPaymentProfileIdx, setSelectedPaymentProfileIdx] = useState('');
  
  const customerPaymentProfiles = useMemo(() => {
    if (!currentCustomer?.payment_profile) return [];
    let p = currentCustomer.payment_profile;
    if (typeof p === 'string') {
      try { p = JSON.parse(p); } catch(e) { return []; }
    }
    if (p && !Array.isArray(p)) return [p];
    return p || [];
  }, [currentCustomer]);`
  );
}

// 3. Update the select dropdown in Checkout
// The original looks like this:
// <select value={paymentBank} onChange={e => setPaymentBank(e.target.value)} className="w-full px-3 py-3 border border-white/10 rounded-lg text-sm bg-black/50 focus:outline-none focus:border-white/30 text-white">
//   <option value="" disabled hidden>Banco desde donde transferiste</option>
//   <option value="0102 - Banco de Venezuela">...

content = content.replace(
  /<select value=\{paymentBank\} onChange=\{e => setPaymentBank\(e\.target\.value\)\}([\s\S]*?)<\/select>/,
  `<select value={selectedPaymentProfileIdx} onChange={e => {
                                    const val = e.target.value;
                                    setSelectedPaymentProfileIdx(val);
                                    if (val !== '') {
                                      const profile = customerPaymentProfiles[Number(val)];
                                      if (profile) setPaymentBank(profile.bank);
                                    } else {
                                      setPaymentBank('');
                                    }
                                  }} className="w-full px-3 py-3 border border-white/10 rounded-lg text-sm bg-black/50 focus:outline-none focus:border-white/30 text-white">
                                    <option value="" disabled hidden>¿Desde qué Pago Móvil enviarás el dinero?</option>
                                    {customerPaymentProfiles.map((p, idx) => (
                                      <option key={idx} value={idx}>{p.bank} - {p.phone} ({p.titular})</option>
                                    ))}
                                    {customerPaymentProfiles.length === 0 && (
                                      <option value="" disabled>No tienes cuentas registradas. Actualiza tu perfil.</option>
                                    )}
                                  </select>`
);

// 4. Update the orderData payload in handlePlaceOrder
content = content.replace(
  /payment_details: \{\n        capture: receiptUrl,\n        ref: paymentReference,\n        bank: selectedPaymentMethod === 'zelle' \? 'Zelle' : paymentBank,\n        phone: currentCustomer\.phone \|\| '',\n        docId: currentCustomer\.docId \|\| '',\n        address: checkoutAddress\n      \},/,
  `payment_details: {
        capture: receiptUrl,
        ref: paymentReference,
        bank: selectedPaymentMethod === 'zelle' ? 'Zelle' : paymentBank,
        phone: selectedPaymentMethod === 'pago_movil' && selectedPaymentProfileIdx !== '' && customerPaymentProfiles[selectedPaymentProfileIdx] ? customerPaymentProfiles[selectedPaymentProfileIdx].phone : (currentCustomer.phone || ''),
        docId: selectedPaymentMethod === 'pago_movil' && selectedPaymentProfileIdx !== '' && customerPaymentProfiles[selectedPaymentProfileIdx] ? customerPaymentProfiles[selectedPaymentProfileIdx].cedula : (currentCustomer.docId || ''),
        titular: selectedPaymentMethod === 'pago_movil' && selectedPaymentProfileIdx !== '' && customerPaymentProfiles[selectedPaymentProfileIdx] ? customerPaymentProfiles[selectedPaymentProfileIdx].titular : currentCustomer.name,
        address: checkoutAddress
      },`
);

fs.writeFileSync(filePath, content);
console.log('PublicStore checkout updated successfully!');
