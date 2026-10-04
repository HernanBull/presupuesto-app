const fs = require('fs');

let code = fs.readFileSync('server/telegramBot.js', 'utf8');

code = code.replace('export const startTelegramEngine = (db, io) => {', 'export const startTelegramEngine = (supabase, io) => {');

code = code.split('const setting = (await db.execute({ sql: "SELECT value FROM platform_settings WHERE key = \'delivery_master_group_id\'", args: [] })).rows[0];')
  .join('const { data: setting } = await supabase.from(\'platform_settings\').select(\'value\').eq(\'key\', \'delivery_master_group_id\').single();');

code = code.split('let driverData = (await db.execute({ sql: \'SELECT * FROM delivery_drivers WHERE id = ?\', args: [chatId] })).rows[0];')
  .join('let { data: driverData } = await supabase.from(\'delivery_drivers\').select(\'*\').eq(\'id\', chatId).single();');

code = code.split('await db.execute({ sql: `INSERT INTO delivery_drivers (id, driver_code, name, cedula, telefono, age, moto, placa, agencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [\n                  chatId, driverCode, state.fullName, \'\', state.telefono, \'\', state.moto, \'\', state.agencia] });')
  .join('await supabase.from(\'delivery_drivers\').insert([{ id: chatId, driver_code: driverCode, name: state.fullName, cedula: \'\', telefono: state.telefono, age: \'\', moto: state.moto, placa: \'\', agencia: state.agencia }]);');

code = code.split('await db.execute({ sql: `UPDATE delivery_drivers SET driver_code=?, name=?, telefono=?, moto=?, agencia=? WHERE id=?`, args: [\n                  driverCode, state.fullName, state.telefono, state.moto, state.agencia, chatId] });')
  .join('await supabase.from(\'delivery_drivers\').update({ driver_code: driverCode, name: state.fullName, telefono: state.telefono, moto: state.moto, agencia: state.agencia }).eq(\'id\', chatId);');

code = code.split('const pendingOrder = (await db.execute({ sql: \'SELECT * FROM delivery_pending_trips WHERE order_id = ?\', args: [orderId] })).rows[0];')
  .join('const { data: pendingOrder } = await supabase.from(\'delivery_pending_trips\').select(\'*\').eq(\'order_id\', orderId).single();');

code = code.split('await db.execute({ sql: \'DELETE FROM delivery_pending_trips WHERE order_id = ?\', args: [orderId] });')
  .join('await supabase.from(\'delivery_pending_trips\').delete().eq(\'order_id\', orderId);');

code = code.split('await db.execute({ sql: \'INSERT INTO delivery_active_trips (order_id, driver_id, pin, customer_name, customer_data, start_time) VALUES (?, ?, ?, ?, ?, ?)\', args: [\n              orderId, chatId, pendingOrder.delivery_pin, customerData.name, pendingOrder.customer_data, new Date().toISOString()] });')
  .join('await supabase.from(\'delivery_active_trips\').insert([{ order_id: orderId, driver_id: chatId, pin: pendingOrder.delivery_pin, customer_name: customerData.name, customer_data: pendingOrder.customer_data, start_time: new Date().toISOString() }]);');

code = code.split('await db.execute({ sql: \'UPDATE ecommerce_orders_v2 SET driver_confirmed = 1 WHERE id = ?\', args: [orderId] });')
  .join('await supabase.from(\'ecommerce_orders_v2\').update({ driver_confirmed: 1 }).eq(\'id\', orderId);');

code = code.split('const order = (await db.execute({ sql: \'SELECT customer_confirmed FROM ecommerce_orders_v2 WHERE id = ?\', args: [orderId] })).rows[0];')
  .join('const { data: order } = await supabase.from(\'ecommerce_orders_v2\').select(\'customer_confirmed\').eq(\'id\', orderId).single();');

code = code.split('await db.execute({ sql: \'DELETE FROM delivery_active_trips WHERE order_id = ?\', args: [orderId] });')
  .join('await supabase.from(\'delivery_active_trips\').delete().eq(\'order_id\', orderId);');

code = code.split('await db.execute({ sql: "UPDATE ecommerce_orders_v2 SET status = \'Entregado\' WHERE id = ?", args: [orderId] });')
  .join('await supabase.from(\'ecommerce_orders_v2\').update({ status: \'Entregado\' }).eq(\'id\', orderId);');

code = code.split('const active = (await db.execute({ sql: \'SELECT * FROM delivery_active_trips WHERE order_id = ?\', args: [orderId] })).rows[0];')
  .join('const { data: active } = await supabase.from(\'delivery_active_trips\').select(\'*\').eq(\'order_id\', orderId).single();');

code = code.split('await db.execute({ sql: \'INSERT INTO delivery_pending_trips (order_id, customer_data, delivery_pin) VALUES (?, ?, ?)\', args: [\n              active.order_id, active.customer_data, active.pin] });')
  .join('await supabase.from(\'delivery_pending_trips\').insert([{ order_id: active.order_id, customer_data: active.customer_data, delivery_pin: active.pin }]);');

fs.writeFileSync('server/telegramBot.js', code);
console.log("Done");
