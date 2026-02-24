/**
 * Rulează scraping-ul și salvează prețurile în baza de date
 * Procesare paralelă per retailer (5 simultan) cu rate limiting per domeniu
 */

const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';
const CONCURRENCY = 5;       // Retaileri procesați simultan
const DELAY_NORMAL = 800;    // ms între requesturi la același retailer
const DELAY_DRMAX = 3000;    // ms între requesturi Dr Max (proxy)

function isDrmaxUrl(url) {
  return url.includes('drmax.ro');
}

// Funcție parsare preț
function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.replace(',', '.');
  const price = parseFloat(normalized);
  return isNaN(price) ? null : price;
}

// Extrage prețul din HTML
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

  // Selectori specifici per retailer
  if (!price) {
    let selectors = [];

    if (retailerName === 'Remedium Farm' || retailerName === 'DucFarm') {
      selectors = ['.product-summary__info--price-gross', '.product-summary__info--price-box'];
    } else if (retailerName === 'Farmaciile DAV') {
      selectors = ['.pr-price', '.product-price'];
    } else {
      selectors = [
        '[data-price-amount]',
        '.product-price',
        '.price-box .price',
        '.special-price .price',
        '.price',
      ];
    }

    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length) {
        const attr = el.attr('content') || el.attr('data-price-amount');
        if (attr) {
          price = parsePrice(attr);
          if (price) break;
        }
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

// Procesează toate URL-urile unui singur retailer (secvențial)
async function scrapeRetailer(retailerName, urls, progress) {
  let success = 0, failed = 0;
  const isDrmax = isDrmaxUrl(urls[0]?.url || '');
  const delay = isDrmax ? DELAY_DRMAX : DELAY_NORMAL;

  for (const urlData of urls) {
    const { url } = urlData;
    const productName = urlData.products?.name || 'Unknown';

    progress.done++;
    const pct = Math.round((progress.done / progress.total) * 100);
    process.stdout.write(`[${pct}%] ${productName.substring(0, 30).padEnd(32)} @ ${retailerName.padEnd(18)}`);

    try {
      // Dr Max fără API key → skip
      if (isDrmax && !SCRAPER_API_KEY) {
        console.log('⏭️  Skip (SCRAPER_API_KEY lipsește)');
        failed++;
        continue;
      }

      const controller = new AbortController();
      let response;

      if (isDrmax) {
        const proxyUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&country_code=ro`;
        const timeout = setTimeout(() => controller.abort(), 60000);
        response = await fetch(proxyUrl, {
          headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => controller.abort(), 15000);
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
      }

      if (!response.ok) {
        console.log('❌ HTTP', response.status);
        failed++;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const { price, isInStock } = extractPrice(html, $, retailerName);

      if (price) {
        const { error: insertError } = await supabase
          .from('price_history')
          .insert({
            product_url_id: urlData.id,
            price,
            is_in_stock: isInStock,
            scraped_at: new Date().toISOString(),
          });

        if (insertError) {
          console.log('❌ DB:', insertError.message.substring(0, 40));
          failed++;
        } else {
          console.log('✅', price, 'Lei', isInStock ? '' : '(indisponibil)');
          success++;
        }
      } else {
        console.log('⚠️  Preț negăsit');
        failed++;
      }

      await new Promise(r => setTimeout(r, delay));

    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('❌ Timeout');
      } else {
        console.log('❌', e.message?.substring(0, 40) || 'Error');
      }
      failed++;
    }
  }

  return { retailerName, success, failed, total: urls.length };
}

// Rulează funcții cu limită de concurrency
async function runWithConcurrency(tasks, limit) {
  const results = [];
  const running = new Set();

  for (const task of tasks) {
    const promise = task().then(result => {
      running.delete(promise);
      return result;
    });
    running.add(promise);
    results.push(promise);

    if (running.size >= limit) {
      await Promise.race(running);
    }
  }

  return Promise.all(results);
}

async function scrape() {
  const startTime = Date.now();
  console.log('🚀 Pornesc scraping-ul (paralel)...\n');

  // Luăm URL-urile active
  const { data: urls, error } = await supabase
    .from('product_urls')
    .select(`
      id,
      url,
      product_id,
      retailer_id,
      products(name, ean),
      retailers(name)
    `)
    .eq('is_active', true);

  if (error) {
    console.error('Eroare:', error);
    return;
  }

  // Grupăm per retailer
  const groups = {};
  for (const u of urls) {
    const name = u.retailers?.name || 'Unknown';
    if (!groups[name]) groups[name] = [];
    groups[name].push(u);
  }

  const retailerNames = Object.keys(groups);
  const drmaxCount = groups['Dr Max']?.length || 0;

  console.log('URL-uri de procesat:', urls.length);
  console.log('Retaileri:', retailerNames.length, '(paralel:', CONCURRENCY, 'simultan)');
  if (drmaxCount > 0) {
    console.log('Dr Max:', drmaxCount, SCRAPER_API_KEY ? '(via proxy)' : '(⚠️  SCRAPER_API_KEY lipsește)');
  }
  console.log('');

  // Progres shared între toate thread-urile
  const progress = { done: 0, total: urls.length };

  // Creăm task-uri per retailer
  const tasks = retailerNames.map(name => () => scrapeRetailer(name, groups[name], progress));

  // Rulăm cu concurrency limit
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  // Sumar
  const totalSuccess = results.reduce((s, r) => s + r.success, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log('\n' + '='.repeat(60));
  console.log('DONE în ' + elapsed + 's: ' + totalSuccess + ' reușite, ' + totalFailed + ' eșuate');
  console.log('');

  // Detalii per retailer
  for (const r of results.sort((a, b) => b.success - a.success)) {
    const status = r.failed === 0 ? '✅' : '⚠️';
    console.log('  ' + status + ' ' + r.retailerName.padEnd(20) + r.success + '/' + r.total);
  }

  console.log('\nPoți vedea datele pe: https://pharma-tracker-sandy.vercel.app/');
}

scrape();
