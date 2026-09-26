const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

const newStatsEndpoint = `
app.get('/api/superadmin/stats', requireSuperAdmin, async (req, res) => {
  try {
    const { count: totalMerchants } = await supabase.from('workspaces').select('*', { count: 'exact', head: true });
    const { count: totalCustomers } = await supabase.from('ecommerce_customers').select('*', { count: 'exact', head: true });
    const { count: totalProducts } = await supabase.from('ecommerce_products').select('*', { count: 'exact', head: true });

    const { data: ordersData, error } = await supabase.from('ecommerce_orders_v2').select('total, status, paymentMethod, date, workspace_id, items');
    
    let totalGMV = 0;
    let totalOrders = 0;
    const pmMap = {};
    const statusMap = {};
    const chartMap = {};
    const merchantMap = {};
    const productMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      chartMap[d.toISOString().substring(0, 10)] = 0;
    }

    if (ordersData) {
      ordersData.forEach((o) => {
        const statusLabel = o.status || 'Desconocido';
        if (!statusMap[statusLabel]) statusMap[statusLabel] = 0;
        statusMap[statusLabel]++;

        if (statusLabel !== 'Cancelado' && statusLabel !== 'Perdido') {
          totalGMV += Number(o.total || 0);
          totalOrders++;

          const pmLabel = o.paymentMethod || 'Otro';
          if (!pmMap[pmLabel]) pmMap[pmLabel] = 0;
          pmMap[pmLabel]++;

          const dateObj = new Date(o.date);
          const dateKey = dateObj.toISOString().substring(0, 10);
          if (chartMap[dateKey] !== undefined) {
            chartMap[dateKey] += Number(o.total || 0);
          }

          if (o.workspace_id) {
            if (!merchantMap[o.workspace_id]) merchantMap[o.workspace_id] = { name: o.workspace_id, sales: 0 };
            merchantMap[o.workspace_id].sales += Number(o.total || 0);
          }

          if (o.items) {
            try {
              let itemsArray = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
              itemsArray.forEach(item => {
                if (!productMap[item.name]) productMap[item.name] = 0;
                productMap[item.name] += Number(item.quantity || 1);
              });
            } catch(e) {}
          }
        }
      });
    }

    const aov = totalOrders > 0 ? totalGMV / totalOrders : 0;
    const paymentMethodsChart = Object.keys(pmMap).map((name) => ({ name, value: pmMap[name] }));
    const orderStatusesChart = Object.keys(statusMap).map((name) => ({ name, value: statusMap[name] }));
    const salesChartData = Object.keys(chartMap).map((date) => ({ date, sales: chartMap[date] }));

    // Fetch workspace names
    const workspaceIds = Object.keys(merchantMap);
    if (workspaceIds.length > 0) {
      const { data: workspaces } = await supabase.from('workspaces').select('id, name').in('id', workspaceIds);
      if (workspaces) {
        workspaces.forEach(w => {
          if (merchantMap[w.id]) merchantMap[w.id].name = w.name;
        });
      }
    }

    const topMerchants = Object.values(merchantMap).sort((a, b) => b.sales - a.sales).slice(0, 5);
    const topProducts = Object.keys(productMap).map((name) => ({ name, qty: productMap[name] })).sort((a, b) => b.qty - a.qty).slice(0, 5);

    res.json({
      totalMerchants: totalMerchants || 0,
      totalCustomers: totalCustomers || 0,
      totalOrders,
      totalGMV,
      aov,
      totalProducts: totalProducts || 0,
      salesChartData,
      topMerchants,
      topProducts,
      paymentMethodsChart,
      orderStatusesChart
    });
  } catch (err) {
    console.error("SuperAdmin Stats Error:", err);
    res.status(500).json({ error: err.message });
  }
});
`;

content = content.replace(
  /app\.get\('\/api\/superadmin\/stats', requireSuperAdmin, async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\n  \}\n\}\);/,
  newStatsEndpoint.trim()
);

// We also need to fix /api/superadmin/monitor if it uses db.execute
const newMonitorEndpoint = `
app.get('/api/superadmin/monitor', requireSuperAdmin, async (req, res) => {
  try {
    const { data: ordersData } = await supabase.from('ecommerce_orders_v2').select('*').order('date', { ascending: false }).limit(50);
    if (!ordersData) return res.json([]);

    const workspaceIds = [...new Set(ordersData.map(o => o.workspace_id).filter(Boolean))];
    const merchantMap = {};
    if (workspaceIds.length > 0) {
      const { data: workspaces } = await supabase.from('workspaces').select('id, name').in('id', workspaceIds);
      if (workspaces) {
        workspaces.forEach(w => merchantMap[w.id] = w.name);
      }
    }

    const formattedOrders = ordersData.map(o => {
      let cName = 'Desconocido';
      if (o.customer_data) {
        try {
          const c = typeof o.customer_data === 'string' ? JSON.parse(o.customer_data) : o.customer_data;
          cName = c.name || cName;
        } catch(e) {}
      }
      return {
        id: o.id,
        date: o.date,
        workspace_name: merchantMap[o.workspace_id] || 'Desconocido',
        customer: cName,
        total: o.total,
        status: o.status
      };
    });
    
    res.json(formattedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (content.includes("app.get('/api/superadmin/monitor', requireSuperAdmin, async (req, res) => {")) {
  content = content.replace(
    /app\.get\('\/api\/superadmin\/monitor', requireSuperAdmin, async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\n  \}\n\}\);/,
    newMonitorEndpoint.trim()
  );
}

fs.writeFileSync(filePath, content);
console.log("Stats and monitor endpoints migrated to Supabase!");
