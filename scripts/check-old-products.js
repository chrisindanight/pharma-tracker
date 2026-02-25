const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const oldEans = ['4013054002407','5054563259080','5944704002289','5944702001864','5944702001871','7612797418048','3574661472508'];

  for (const ean of oldEans) {
    const { data: product } = await supabase.from('products').select('id, name').eq('ean', ean).single();
    if (!product) continue;

    const { data: urls } = await supabase.from('product_urls').select('id, url, retailers(name)').eq('product_id', product.id);
    const urlIds = (urls || []).map(u => u.id);

    let priceCount = 0;
    if (urlIds.length > 0) {
      const { count } = await supabase.from('price_history').select('*', { count: 'exact', head: true }).in('product_url_id', urlIds);
      priceCount = count || 0;
    }

    console.log(product.name, '(EAN:', ean, ')');
    console.log('  URL-uri:', urls?.length || 0, '| Prețuri:', priceCount);
    if (urls) urls.forEach(u => console.log('   ', u.retailers?.name, '-', u.url?.substring(0, 60)));
    console.log('');
  }
}
check();
