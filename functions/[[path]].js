// Cloudflare Pages Function — Dynamic Open Graph Tags for Social Link Previews (Telegram, WhatsApp, etc.)
export async function onRequest(context) {
  const { request, next } = context;
  const userAgent = request.headers.get('user-agent') || '';

  // Detect social crawlers looking for link preview metadata
  const isSocialCrawler = /facebookexternalhit|Facebot|Twitterbot|TelegramBot|WhatsApp|LinkedInBot|Slackbot|Discordbot|Applebot|bingbot|Googlebot/i.test(userAgent);

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/|\/$/g, '');

  // Pass through directly if not a crawler, or if requesting static assets / APIs
  if (!isSocialCrawler || path.includes('.') || path.startsWith('api/') || path.startsWith('assets/')) {
    return next();
  }

  const reservedPaths = [
    'dashboard', 'pos', 'inventory', 'orders', 'more', 'setup', 
    'superadmin', 'merchant', 'notifications', 'prices', 'offers', 
    'combos', 'customers', 'caja', 'facturacion', 'invoicing', 'shifts'
  ];

  let slug = path;
  if (slug.startsWith('c/')) slug = slug.replace(/^c\//, '');

  // Get standard static response
  const response = await next();
  
  if (slug && !reservedPaths.includes(slug.toLowerCase())) {
    try {
      let html = await response.text();
      const storeName = slug
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const title = `${storeName} — Catálogo & Vitrina Oficial`;
      const description = `Tus precios y stock real en vivo. Armá tu pedido directo desde el catálogo oficial en AxonMarket.`;
      const canonicalUrl = `https://axonmarket.vip/${slug}`;
      const ogBanner = `https://axonmarket.vip/axonmarket-og-banner.jpg`;

      // Replace Open Graph and Twitter tags dynamically
      html = html
        .replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`)
        .replace(/<meta property="og:title"[^>]*>/gi, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta property="og:description"[^>]*>/gi, `<meta property="og:description" content="${description}" />`)
        .replace(/<meta property="og:url"[^>]*>/gi, `<meta property="og:url" content="${canonicalUrl}" />`)
        .replace(/<meta property="og:image"[^>]*>/gi, `<meta property="og:image" content="${ogBanner}" />`)
        .replace(/<meta name="twitter:title"[^>]*>/gi, `<meta name="twitter:title" content="${title}" />`)
        .replace(/<meta name="twitter:description"[^>]*>/gi, `<meta name="twitter:description" content="${description}" />`)
        .replace(/<meta name="twitter:image"[^>]*>/gi, `<meta name="twitter:image" content="${ogBanner}" />`);

      return new Response(html, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          'content-type': 'text/html; charset=utf-8'
        }
      });
    } catch (e) {
      console.warn('Error rewriting crawler response:', e);
    }
  }

  return response;
}
