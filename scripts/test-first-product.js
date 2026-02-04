/**
 * Test scraper pe primul produs din Excel cu toate URL-urile completate
 */

const XLSX = require('xlsx');
const cheerio = require('cheerio');

const DELAY_MS = 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Funcție de parsare preț
function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.replace(',', '.');
  const price = parseFloat(normalized);
  return isNaN(price) ? null : price;
}

// Parser generic îmbunătățit
function extractPrice(html, $, pharmacyName) {
  let price = null;
  let isInStock = true;

  // 1. JSON-LD
  $('script[type="application/ld+json"]').each((i, el) => {
    if (price) return;
    try {
      const json = JSON.parse($(el).html());
      if (json.offers?.price) {
        price = parseFloat(json.offers.price);
        if (json.offers.availability?.includes('OutOfStock')) {
          isInStock = false;
        }
      }
      if (json['@graph']) {
        for (const item of json['@graph']) {
          if (item.offers?.price) {
            price = parseFloat(item.offers.price);
            break;
          }
        }
      }
    } catch (e) {}
  });

  // 2. Meta tag-uri (foarte fiabile pentru PFarma)
  if (!price) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content');
    if (metaPrice) {
      price = parsePrice(metaPrice);
    }
  }

  // 3. Selectori specifici per farmacie
  if (!price) {
    let selectors = [];

    switch (pharmacyName) {
      case 'Remedium Farm':
      case 'DucFarm':
        selectors = ['.product-summary__info--price-gross', '.product-summary__info--price-box'];
        break;
      case 'Farmaciile DAV':
        selectors = ['.pr-price', '.product-price'];
        break;
      case 'Al Shefa':
        selectors = ['.product-price', '.price', '[data-price]'];
        break;
      case 'PFarma':
        selectors = ['.price-section .price', '.product-price'];
        break;
      default:
        selectors = [
          '[data-price-amount]',
          '.product-price .price',
          '.price-wrapper .price',
          '.special-price .price',
          '.price-box .price',
          '.current-price',
          '.product-price',
          '.price',
          'span[itemprop="price"]',
        ];
    }

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length) {
        // Verificăm atribute
        const attrPrice = el.attr('content') || el.attr('data-price-amount') || el.attr('data-price');
        if (attrPrice) {
          price = parsePrice(attrPrice);
          if (price) break;
        }

        // Text
        const text = el.text().trim();
        price = parsePrice(text);
        if (price) break;
      }
    }
  }

  // Verificăm stocul
  const htmlLower = html.toLowerCase();
  if (htmlLower.includes('indisponibil') ||
      htmlLower.includes('stoc epuizat') ||
      htmlLower.includes('out of stock') ||
      htmlLower.includes('nu este disponibil')) {
    isInStock = false;
  }

  // DAV Farma afișează "in stoc"
  if (htmlLower.includes('in stoc') || htmlLower.includes('în stoc')) {
    isInStock = true;
  }

  return { price, isInStock };
}

async function scrapeUrl(name, url) {
  console.log(`\n${name.padEnd(20)}`);

  if (!url || url === 'N/A') {
    console.log(`⏭️  N/A - skip`);
    return { success: false, skipped: true };
  }

  console.log(`URL: ${url.substring(0, 70)}...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log(`Status: ${response.status}`);

    if (response.status === 403) {
      console.log(`❌ BLOCAT (403 Forbidden)`);
      return { success: false, blocked: true };
    }

    if (response.status === 404) {
      console.log(`❌ 404 - Produs negăsit`);
      return { success: false, notFound: true };
    }

    if (response.status !== 200) {
      console.log(`❌ Eroare HTTP ${response.status}`);
      return { success: false };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const { price, isInStock } = extractPrice(html, $, name);

    if (price) {
      console.log(`✅ Preț: ${price} Lei ${isInStock ? '(în stoc)' : '(indisponibil)'}`);
      return { success: true, price, isInStock };
    } else {
      console.log(`⚠️  Preț negăsit`);

      // Debug
      const priceElements = $('[class*="price"]').slice(0, 2);
      priceElements.each((i, el) => {
        const text = $(el).text().trim().substring(0, 50);
        if (text) console.log(`   [debug] ${text}`);
      });

      return { success: false, needsManualCheck: true };
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`❌ Timeout`);
    } else {
      console.log(`❌ Eroare: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  // Citim Excel-ul
  const workbook = XLSX.readFile('products-template.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  const firstProduct = data[0];

  console.log('='.repeat(70));
  console.log(`  TEST: ${firstProduct.Produs}`);
  console.log(`  EAN: ${firstProduct.EAN}`);
  console.log('='.repeat(70));

  const pharmacies = [
    { name: 'Farmacia Tei', key: 'Farmacia Tei' },
    { name: 'HelpNet', key: 'HelpNet' },
    { name: 'Remedium Farm', key: 'Remedium Farm' },
    { name: 'Spring Farma', key: 'Spring Farma' },
    { name: 'Biscuit Pharma', key: 'Biscuit Pharma' },
    { name: 'Farmaciile DAV', key: 'Farmaciile DAV' },
    { name: 'DucFarm', key: 'DucFarm' },
    { name: 'Al Shefa', key: 'Al Shefa' },
    { name: 'PFarma', key: 'PFarma' },
    { name: 'Dr Max', key: 'Dr Max' },
    { name: 'Catena', key: 'Catena' },
    { name: 'Myosotis', key: 'Myosotis' },
  ];

  const results = [];

  for (const pharmacy of pharmacies) {
    const url = firstProduct[pharmacy.key];
    const result = await scrapeUrl(pharmacy.name, url);
    results.push({ name: pharmacy.name, url, ...result });

    if (url && url !== 'N/A') {
      await sleep(DELAY_MS);
    }
  }

  // Sumar
  console.log('\n' + '='.repeat(70));
  console.log('  SUMAR');
  console.log('='.repeat(70));

  const working = results.filter(r => r.success);
  const blocked = results.filter(r => r.blocked);
  const notFound = results.filter(r => r.notFound);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => !r.success && !r.blocked && !r.skipped && !r.notFound);

  console.log('\n✅ FUNCȚIONEAZĂ (' + working.length + '):');
  working.forEach(r => console.log(`   ${r.name.padEnd(18)} ${r.price} Lei`));

  if (blocked.length > 0) {
    console.log('\n🚫 BLOCATE (' + blocked.length + '):');
    blocked.forEach(r => console.log(`   ${r.name}`));
  }

  if (notFound.length > 0) {
    console.log('\n❓ 404 NOT FOUND (' + notFound.length + '):');
    notFound.forEach(r => console.log(`   ${r.name}`));
  }

  if (skipped.length > 0) {
    console.log('\n⏭️  N/A (' + skipped.length + '):');
    skipped.forEach(r => console.log(`   ${r.name}`));
  }

  if (failed.length > 0) {
    console.log('\n⚠️  DE VERIFICAT (' + failed.length + '):');
    failed.forEach(r => console.log(`   ${r.name}`));
  }

  console.log('');
}

main().catch(console.error);
