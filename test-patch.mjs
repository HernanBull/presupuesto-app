async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/ecommerce/products');
    const data = await res.json();
    if (!data.length) {
      console.log("No products found");
      return;
    }
    const product = data[0];
    console.log("Product to edit:", product.id);

    const updateRes = await fetch(`http://localhost:3001/api/ecommerce/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: 99.99,
        batchNumber: "TEST-BATCH-123",
        workspace_id: "test-workspace"
      })
    });
    
    const updateData = await updateRes.text();
    console.log("Update status:", updateRes.status);
    console.log("Update response:", updateData);
  } catch(e) {
    console.error(e);
  }
}

test();
