const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: urls } = await supabase
    .from('product_urls')
    .select('id, url, products(name), retailers(name)')
    .eq('is_active', true);

  const { data: prices } = await supabase
    .from('price_history')
    .select('product_url_id');

  const urlsWithPrices = new Set(prices.map(p => p.product_url_id));

  const missing = urls.filter(u => !urlsWithPrices.has(u.id));

  console.log('URL-uri fără preț colectat:', missing.length);
  missing.forEach(u => {
    console.log('  ❌', u.retailers?.name?.padEnd(20), '-', u.products?.name);
    console.log('     ', u.url);
  });
}
main().catch(console.error);
