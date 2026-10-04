const fs = require('fs');
const dbPath = 'server/database.sqlite';

// 1. Fix server/index.js
let serverIndex = fs.readFileSync('server/index.js', 'utf8');

serverIndex = serverIndex.replace(
  `      favorites ? JSON.stringify(favorites) : '[]', \n      wishlist ? JSON.stringify(wishlist) : '[]',\n      addresses ? JSON.stringify(addresses) : '[]',`,
  `      typeof favorites === 'string' ? favorites : (favorites ? JSON.stringify(favorites) : '[]'),
      typeof wishlist === 'string' ? wishlist : (wishlist ? JSON.stringify(wishlist) : '[]'),
      typeof addresses === 'string' ? addresses : (addresses ? JSON.stringify(addresses) : '[]'),`
);
fs.writeFileSync('server/index.js', serverIndex, 'utf8');

// 2. Fix Database entries directly using sqlite (removing extra stringifications)
const Database = require('better-sqlite3');
const db = new Database(dbPath);

const customers = db.prepare('SELECT id, favorites, wishlist, addresses FROM ecommerce_customers').all();
const updateCustomer = db.prepare('UPDATE ecommerce_customers SET favorites = ?, wishlist = ?, addresses = ? WHERE id = ?');

for (const c of customers) {
  let fav = c.favorites || '[]';
  let wish = c.wishlist || '[]';
  let addr = c.addresses || '[]';

  try {
    let parsedFav = JSON.parse(fav);
    if (typeof parsedFav === 'string') {
      fav = parsedFav; // Unwrap one layer
      // Check if it's double wrapped again
      let parsedFav2 = JSON.parse(fav);
      if (typeof parsedFav2 === 'string') fav = parsedFav2;
    }
  } catch(e) {}
  
  try {
    let parsedWish = JSON.parse(wish);
    if (typeof parsedWish === 'string') {
      wish = parsedWish;
      let parsedWish2 = JSON.parse(wish);
      if (typeof parsedWish2 === 'string') wish = parsedWish2;
    }
  } catch(e) {}

  try {
    let parsedAddr = JSON.parse(addr);
    if (typeof parsedAddr === 'string') {
      addr = parsedAddr;
      let parsedAddr2 = JSON.parse(addr);
      if (typeof parsedAddr2 === 'string') addr = parsedAddr2;
    }
  } catch(e) {}

  updateCustomer.run(fav, wish, addr, c.id);
}
db.close();

// 3. Fix CustomerProfile.jsx
let profile = fs.readFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', 'utf8');

profile = profile.replace(
  `      setCurrentCustomer(parsed);`,
  `      parsed.favorites = Array.isArray(parsed.favorites) ? parsed.favorites : (typeof parsed.favorites === 'string' ? JSON.parse(parsed.favorites || '[]') : []);
      parsed.wishlist = Array.isArray(parsed.wishlist) ? parsed.wishlist : (typeof parsed.wishlist === 'string' ? JSON.parse(parsed.wishlist || '[]') : []);
      parsed.addresses = Array.isArray(parsed.addresses) ? parsed.addresses : (typeof parsed.addresses === 'string' ? JSON.parse(parsed.addresses || '[]') : []);
      setCurrentCustomer(parsed);`
);

profile = profile.replace(
  `    const favorites = Array.isArray(currentCustomer.favorites) ? currentCustomer.favorites : (\n      typeof currentCustomer.favorites === 'string' ? JSON.parse(currentCustomer.favorites || '[]') : []\n    );`,
  `    const favorites = currentCustomer.favorites || [];`
);

profile = profile.replace(
  `    const wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (\n      typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []\n    );`,
  `    const wishlist = currentCustomer.wishlist || [];`
);

profile = profile.replace(
  `  const parsedFavorites = Array.isArray(currentCustomer.favorites) ? currentCustomer.favorites : (\n    typeof currentCustomer.favorites === 'string' ? JSON.parse(currentCustomer.favorites || '[]') : []\n  );`,
  `  const parsedFavorites = currentCustomer.favorites || [];`
);

profile = profile.replace(
  `  const parsedWishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (\n    typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []\n  );`,
  `  const parsedWishlist = currentCustomer.wishlist || [];`
);

profile = profile.replace(
  `  const parsedAddresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (\n    typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []\n  );`,
  `  const parsedAddresses = currentCustomer.addresses || [];`
);
fs.writeFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', profile, 'utf8');

// 4. Fix PublicStore.jsx
let publicStore = fs.readFileSync('src/modules/ecommerce/pages/PublicStore.jsx', 'utf8');

publicStore = publicStore.replace(
  `      const raw = currentCustomer.wishlist;\n      const wishlist = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');`,
  `      const wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []);`
);

publicStore = publicStore.replace(
  `    let wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (\n      typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []\n    );`,
  `    let wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []);`
);
fs.writeFileSync('src/modules/ecommerce/pages/PublicStore.jsx', publicStore, 'utf8');

// 5. Fix MarketplaceDirectory.jsx
let mkt = fs.readFileSync('src/modules/ecommerce/pages/MarketplaceDirectory.jsx', 'utf8');

mkt = mkt.replace(
  `      const raw = currentCustomer.favorites;\n      const favorites = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');`,
  `      const favorites = Array.isArray(currentCustomer.favorites) ? currentCustomer.favorites : (typeof currentCustomer.favorites === 'string' ? JSON.parse(currentCustomer.favorites || '[]') : []);`
);
fs.writeFileSync('src/modules/ecommerce/pages/MarketplaceDirectory.jsx', mkt, 'utf8');

console.log('Fixed successfully!');
