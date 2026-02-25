/**
 * Testează extragerea prețului pentru un produs specific la toți retailerii
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';
const PRODUCT_SEARCH = process.argv[2] || 'Anaftin Baby';

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

async function main() {
  const { data: urls } = await supabase
    .from('product_urls')
    .select('id, url, products!inner(name, ean), retailers!inner(name)')
    .eq('is_active', true)
    .ilike('products.name', `%${PRODUCT_SEARCH}%`);

  if (!urls || urls.length === 0) {
    console.log('Nu am găsit URL-uri pentru:', PRODUCT_SEARCH);
    return;
  }

  const productName = urls[0].products?.name;
  console.log(`\n🔍 Testez: ${productName}`);
  console.log(`   ${urls.length} retaileri cu URL\n`);

  for (const u of urls) {
    const retailer = u.retailers?.name;
    const isDrmax = u.url.includes('drmax.ro');

    process.stdout.write(`  ${retailer.padEnd(20)}`);

    try {
      let response;
      const controller = new AbortController();

      if (isDrmax) {
        if (!SCRAPER_API_KEY) { console.log('⏭️  Skip (no API key)'); continue; }
        const proxyUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(u.url)}&country_code=ro`;
        const timeout = setTimeout(() => controller.abort(), 60000);
        response = await fetch(proxyUrl, { headers: { 'Accept': 'text/html' }, signal: controller.signal });
        clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => controller.abort(), 15000);
        response = await fetch(u.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
      }

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const { price, isInStock } = extractPrice(html, $, retailer);

      if (price) {
        console.log(`✅ ${price} Lei${isInStock ? '' : ' (OOS)'}`);
      } else {
        console.log(`⚠️  Preț negăsit`);
        // Debug info
        const title = $('title').text().trim().substring(0, 60);
        console.log(`     Title: ${title}`);
        console.log(`     URL: ${u.url}`);
      }
    } catch (e) {
      console.log(`❌ ${e.name === 'AbortError' ? 'Timeout' : e.message?.substring(0, 50)}`);
    }

    await new Promise(r => setTimeout(r, isDrmax ? 3000 : 500));
  }

  console.log('\n✅ Done');
}

main().catch(console.error);
