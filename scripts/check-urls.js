/**
 * Verifică toate URL-urile din baza de date - returnează status HTTP
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUrls() {
  const { data: urls, error } = await supabase
    .from('product_urls')
    .select(`
      id,
      url,
      products(name),
      retailers(name)
    `)
    .eq('is_active', true);

  if (error) {
    console.error('Eroare:', error);
    return;
  }

  console.log('Verificare', urls.length, 'URL-uri...\n');

  const results = { ok: [], broken: [], error: [] };

  for (const u of urls) {
    const product = (u.products?.name || 'Unknown').substring(0, 35).padEnd(37);
    const retailer = (u.retailers?.name || 'Unknown').padEnd(18);

    process.stdout.write(product + ' @ ' + retailer);

    // Skip Dr Max (blocat fara proxy)
    if (u.url.includes('drmax.ro')) {
      console.log('⏭️  Skip (Dr Max)');
      continue;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(u.url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (response.ok) {
        console.log('✅ ' + response.status);
        results.ok.push(u);
      } else {
        console.log('❌ ' + response.status);
        results.broken.push({ ...u, status: response.status });
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('❌ Timeout');
        results.error.push({ ...u, status: 'Timeout' });
      } else {
        console.log('❌ ' + (e.message || '').substring(0, 30));
        results.error.push({ ...u, status: e.message });
      }
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('REZULTATE: ' + results.ok.length + ' OK | ' + results.broken.length + ' broken | ' + results.error.length + ' erori');

  if (results.broken.length > 0 || results.error.length > 0) {
    console.log('\n❌ URL-uri cu probleme:');
    for (const u of [...results.broken, ...results.error]) {
      console.log('  [' + u.status + '] ' + u.retailers?.name + ' - ' + u.products?.name);
      console.log('    ' + u.url);
    }
  }
}

checkUrls();
