const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.html')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    const prefixesToReplace = [
      '/ecommerce/live/',
      '/ecommerce/live',
      '/ecommerce/legal/',
      '/ecommerce/pricing',
      '/ecommerce/product-studio',
      '/ecommerce/products',
      '/ecommerce/picking',
      '/ecommerce/storefront',
      '/ecommerce/location',
      '/ecommerce/analytics',
      '/ecommerce/store-profile',
      '/ecommerce/orders',
      '/ecommerce/support',
      '/ecommerce/preparation',
      '/ecommerce/reviews',
      '/ecommerce/promotions',
      '/ecommerce/offers',
      '/ecommerce/notifications',
      '/ecommerce/cart-settings'
    ];

    prefixesToReplace.forEach(prefix => {
      // Regex con lookbehind para evitar cambiar rutas de API como /api/ecommerce/...
      const regex = new RegExp(`(?<!api)(?<!api/)${prefix}`, 'g');
      
      let newPrefix = prefix.replace('/ecommerce/live', '').replace('/ecommerce', '');
      if (newPrefix === '') newPrefix = '/';
      
      content = content.replace(regex, newPrefix);
    });
    
    // Arreglar posibles dobles barras
    content = content.replace(/navigate\('\/\/'\)/g, "navigate('/')");
    content = content.replace(/navigate\(`\/\/([^`]+)`\)/g, "navigate(`/$1`)");
    content = content.replace(/href="\/\/"/g, 'href="/"');
    content = content.replace(/to="\/\/"/g, 'to="/"');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated: ' + filePath);
    }
  }
});
