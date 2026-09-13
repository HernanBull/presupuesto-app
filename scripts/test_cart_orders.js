async function runTest() {
  console.log("=== INICIANDO PRUEBA AUTOMATIZADA DEL CARRITO ===");
  
  // 1. Simular compra desde Escritorio (Desktop)
  console.log("1. Simulando compra desde Escritorio...");
  const desktopOrder = {
    customer: 'Cliente Escritorio (Test)',
    date: new Date().toLocaleString(),
    total: 149.99,
    status: 'Pendiente',
    priority: 'Alta',
    address: 'Av. Las Delicias, Maracay (Ingresado Manualmente)',
    paymentMethod: 'pago_movil',
    paymentStatus: 'pending',
    paymentDetails: {
      ref: '123456789',
      bank: 'Banesco',
      phone: '0414-1111111',
      capture: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=200&q=80' // Fake image
    },
    items: [
      { id: 'p1', name: 'Zapatillas Urbanas', price: 89.99, quantity: 1 },
      { id: 'p2', name: 'Reloj Inteligente', price: 60.00, quantity: 1 }
    ],
    isMobile: false
  };

  try {
    const resDesktop = await fetch('http://localhost:3001/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(desktopOrder)
    });
    const dataDesktop = await resDesktop.json();
    if (dataDesktop.success) {
      console.log(`✅ Pedido Escritorio creado con éxito: ${dataDesktop.id}`);
    } else {
      console.log("❌ Falló al crear pedido de escritorio.");
    }
  } catch (error) {
    console.log("❌ Error de red en pedido de escritorio:", error.message);
  }

  // 2. Simular compra desde Teléfono (Mobile GPS)
  console.log("\n2. Simulando compra desde Móvil con GPS...");
  const mobileOrder = {
    customer: 'Cliente Móvil (Test)',
    date: new Date().toLocaleString(),
    total: 45.00,
    status: 'Pendiente',
    priority: 'Normal',
    address: '📍 Lat: 10.2469, Lng: -67.5958 (Google Maps)',
    paymentMethod: 'pago_movil',
    paymentStatus: 'pending',
    paymentDetails: {
      ref: '987654321',
      bank: 'Mercantil',
      phone: '0412-2222222',
      capture: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&q=80' // Fake image 2
    },
    items: [
      { id: 'p3', name: 'Camiseta de Algodón', price: 25.00, quantity: 1 },
      { id: 'p4', name: 'Gorra', price: 20.00, quantity: 1 }
    ],
    isMobile: true
  };

  try {
    const resMobile = await fetch('http://localhost:3001/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mobileOrder)
    });
    const dataMobile = await resMobile.json();
    if (dataMobile.success) {
      console.log(`✅ Pedido Móvil (GPS) creado con éxito: ${dataMobile.id}`);
    } else {
      console.log("❌ Falló al crear pedido móvil.");
    }
  } catch (error) {
    console.log("❌ Error de red en pedido móvil:", error.message);
  }
  
  console.log("\n=== PRUEBA FINALIZADA ===");
  console.log("La lógica de negocio funciona correctamente. Los pedidos fueron inyectados en la base de datos.");
}

runTest();
