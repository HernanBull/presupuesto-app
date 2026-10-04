const fs = require('fs');

let code = fs.readFileSync('server/index.js', 'utf8');

code = code.replace("import db from './db.js';", "import { supabase } from './supabaseClient.js';");
code = code.replace("startTelegramEngine(db, io);", "startTelegramEngine(supabase, io);");

code = code.split("const setting = (await db.execute({ sql: \"SELECT value FROM platform_settings WHERE key = 'delivery_master_group_id'\", args: [] })).rows[0];")
  .join("const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();");

code = code.split("await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET delivery_pin = ? WHERE id = ?', args: [deliveryPin, orderId] });")
  .join("await supabase.from('ecommerce_orders_v2').update({ delivery_pin: deliveryPin }).eq('id', orderId);");

code = code.split("await db.execute({ sql: 'INSERT INTO delivery_pending_trips (order_id, customer_data, delivery_pin) VALUES (?, ?, ?)', args: [\n      orderId, JSON.stringify(customerData), deliveryPin] });")
  .join("await supabase.from('delivery_pending_trips').insert([{ order_id: orderId, customer_data: JSON.stringify(customerData), delivery_pin: deliveryPin }]);");

fs.writeFileSync('server/index.js', code);
console.log("Done");
