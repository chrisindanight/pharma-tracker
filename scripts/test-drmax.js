/**
 * Testează scraping Dr Max pentru produse specifice
 */

const cheerio = require('cheerio');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.replace(',', '.');
  const price = parseFloat(normalized);
  return isNaN(price) ? null : price;
}

function extractPrice(html, $, retailerName) {
  let price = null;
  let isInStock = true;

  // JSON-LD
  $('script[type="application/ld+json"]').each((i, el) => {
    if (price) return;
    try {
      const json = JSON.parse($(el).html());
      if (json.offers?.price) {
        price = parseFloat(json.offers.price);
        if (json.offers.availability?.includes('OutOfStock')) isInStock = false;
      }
    } catch (e) {}
  });

  // Meta tags
  if (!price) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content');
    if (metaPrice) price = parsePrice(metaPrice);
  }

  // Selectori
  if (!price) {
    const selectors = [
      '[data-price-amount]',
      '.product-price',
      '.price-box .price',
      '.special-price .price',
      '.price',
    ];
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length) {
        const attr = el.attr('content') || el.attr('data-price-amount');
        if (attr) { price = parsePrice(attr); if (price) break; }
        price = parsePrice(el.text());
        if (price) break;
      }
    }
  }

  // Stock check
  const text = html.toLowerCase();
  if (text.includes('indisponibil') || text.includes('stoc epuizat') || text.includes('out of stock')) {
    isInStock = false;
  }
  if (text.includes('in stoc') || text.includes('în stoc')) {
    isInStock = true;
  }

  return { price, isInStock };
}

async function testUrl(url, productName) {
  console.log('\n' + '='.repeat(60));
  console.log('Testing:', productName);
  console.log('URL:', url);

  if (!SCRAPER_API_KEY) {
    console.log('❌ SCRAPER_API_KEY lipsește');
    return;
  }

  const proxyUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&country_code=ro`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(proxyUrl, {
      headers: { 'Accept': 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    console.log('HTTP Status:', response.status);

    if (!response.ok) {
      console.log('❌ HTTP error');
      return;
    }

    const html = await response.text();
    console.log('HTML length:', html.length);

    const $ = cheerio.load(html);
    const { price, isInStock } = extractPrice(html, $, 'Dr Max');

    console.log('Price:', price);
    console.log('In Stock:', isInStock);

    // Verificăm NUXT payload
    const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(.+?)(?:<\/script>)/s);
    if (nuxtMatch) {
      console.log('\n__NUXT__ payload found, length:', nuxtMatch[1].length);
      // Căutăm prețul direct în text
      const priceMatches = nuxtMatch[1].match(/\d+\.\d{2}/g);
      if (priceMatches) {
        console.log('Prices in NUXT payload:', [...new Set(priceMatches)].slice(0, 10));
      }
    } else {
      console.log('\n⚠️  No __NUXT__ payload found');
      // Căutăm alte indicii de preț
      const titleTag = $('title').text();
      console.log('Page title:', titleTag);
      // Verificăm dacă e o pagină de redirect sau 404
      if (html.includes('404') || html.includes('not found') || html.includes('nu a fost')) {
        console.log('⚠️  Pagina pare a fi 404 / not found');
      }
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

async function main() {
  // Luăm URL-urile Dr Max care nu au prețuri
  const { data: urls } = await supabase
    .from('product_urls')
    .select('id, url, products(name, ean), retailers!inner(name)')
    .eq('retailers.name', 'Dr Max')
    .eq('is_active', true);

  // Testăm câteva URL-uri specifice
  const testProducts = ['Imodium Original 2mg 20', 'Imodium Original 2mg 6'];

  for (const search of testProducts) {
    const match = urls.find(u => u.products?.name?.includes(search));
    if (match) {
      await testUrl(match.url, match.products.name);
    } else {
      console.log('Nu am găsit:', search);
    }
  }
}

main().catch(console.error);
