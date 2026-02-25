/**
 * Testează extragerea prețurilor pe câte 1 URL per retailer
 * + testează toate URL-urile Dr Max (prin proxy)
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

  if (!price) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content');
    if (metaPrice) price = parsePrice(metaPrice);
  }

  if (!price) {
    let selectors = [];
    if (retailerName === 'Remedium Farm' || retailerName === 'DucFarm') {
      selectors = ['.product-summary__info--price-gross', '.product-summary__info--price-box'];
    } else if (retailerName === 'Farmaciile DAV') {
      selectors = ['.pr-price', '.product-price'];
    } else {
      selectors = ['[data-price-amount]', '.product-price', '.price-box .price', '.special-price .price', '.price'];
    }
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

  const text = html.toLowerCase();
  if (text.includes('indisponibil') || text.includes('stoc epuizat') || text.includes('out of stock')) isInStock = false;
  if (text.includes('in stoc') || text.includes('în stoc')) isInStock = true;

  return { price, isInStock };
}

async function testUrl(url, productName, retailerName) {
  try {
    let response;
    const controller = new AbortController();

    if (url.includes('drmax.ro')) {
      if (!SCRAPER_API_KEY) return { status: 'skip', reason: 'no API key' };
      const proxyUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&country_code=ro`;
      const timeout = setTimeout(() => controller.abort(), 60000);
      response = await fetch(proxyUrl, { headers: { 'Accept': 'text/html' }, signal: controller.signal });
      clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => controller.abort(), 15000);
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
    }

    if (!response.ok) return { status: 'error', reason: 'HTTP ' + response.status };

    const html = await response.text();
    const $ = cheerio.load(html);
    const { price, isInStock } = extractPrice(html, $, retailerName);

    return { status: price ? 'ok' : 'no_price', price, isInStock };
  } catch (e) {
    return { status: 'error', reason: e.name === 'AbortError' ? 'timeout' : e.message?.substring(0, 40) };
  }
}

async function main() {
  const { data: urls } = await supabase
    .from('product_urls')
    .select('id, url, products(name, ean), retailers!inner(name)')
    .eq('is_active', true);

  // Grupăm per retailer
  const groups = {};
  for (const u of urls) {
    const name = u.retailers?.name || 'Unknown';
    if (!groups[name]) groups[name] = [];
    groups[name].push(u);
  }

  console.log('Total URL-uri:', urls.length);
  console.log('Retaileri:', Object.keys(groups).length, '\n');

  // Testăm 2 URL-uri per retailer (non-DrMax)
  for (const [retailer, retailerUrls] of Object.entries(groups)) {
    if (retailer === 'Dr Max') continue; // testăm separat

    console.log(`\n🏪 ${retailer} (${retailerUrls.length} URLs)`);
    const sample = retailerUrls.slice(0, 2);

    for (const u of sample) {
      const result = await testUrl(u.url, u.products?.name, retailer);
      if (result.status === 'ok') {
        console.log(`  ✅ ${u.products?.name?.substring(0, 40)} → ${result.price} Lei`);
      } else if (result.status === 'no_price') {
        console.log(`  ⚠️  ${u.products?.name?.substring(0, 40)} → Preț negăsit`);
        // Debug: afișăm URL-ul
        console.log(`     URL: ${u.url}`);
      } else {
        console.log(`  ❌ ${u.products?.name?.substring(0, 40)} → ${result.reason}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Testăm 3 URL-uri Dr Max
  if (groups['Dr Max']) {
    console.log(`\n🏪 Dr Max (${groups['Dr Max'].length} URLs) - via proxy`);
    const sample = groups['Dr Max'].slice(0, 3);

    for (const u of sample) {
      const result = await testUrl(u.url, u.products?.name, 'Dr Max');
      if (result.status === 'ok') {
        console.log(`  ✅ ${u.products?.name?.substring(0, 40)} → ${result.price} Lei`);
      } else if (result.status === 'no_price') {
        console.log(`  ⚠️  ${u.products?.name?.substring(0, 40)} → Preț negăsit`);
        console.log(`     URL: ${u.url}`);
      } else {
        console.log(`  ❌ ${u.products?.name?.substring(0, 40)} → ${result.reason}`);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('\n✅ Test complet');
}

main().catch(console.error);
