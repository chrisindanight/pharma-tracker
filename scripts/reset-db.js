/**
 * Șterge TOATE datele din DB (prețuri, URL-uri, produse)
 * pentru a permite un import curat din Excel
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('='.repeat(60));
  console.log('  RESET BAZĂ DE DATE');
  console.log('='.repeat(60));

  // Statistici înainte
  const { count: oldPrices } = await supabase.from('price_history').select('*', { count: 'exact', head: true });
  const { count: oldUrls } = await supabase.from('product_urls').select('*', { count: 'exact', head: true });
  const { count: oldProducts } = await supabase.from('products').select('*', { count: 'exact', head: true });

  console.log('\nÎnainte:');
  console.log('  💰 Prețuri:', oldPrices);
  console.log('  🔗 URL-uri:', oldUrls);
  console.log('  📦 Produse:', oldProducts);

  // 1. Ștergem prețurile (depinde de product_urls)
  console.log('\n🗑️  Șterg price_history...');
  const { error: e1 } = await supabase.from('price_history').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  if (e1) console.log('  Eroare:', e1.message);
  else console.log('  ✅ Done');

  // 2. Ștergem URL-urile (depinde de products + retailers)
  console.log('🗑️  Șterg product_urls...');
  const { error: e2 } = await supabase.from('product_urls').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  if (e2) console.log('  Eroare:', e2.message);
  else console.log('  ✅ Done');

  // 3. Ștergem produsele
  console.log('🗑️  Șterg products...');
  const { error: e3 } = await supabase.from('products').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  if (e3) console.log('  Eroare:', e3.message);
  else console.log('  ✅ Done');

  // Statistici după
  const { count: newPrices } = await supabase.from('price_history').select('*', { count: 'exact', head: true });
  const { count: newUrls } = await supabase.from('product_urls').select('*', { count: 'exact', head: true });
  const { count: newProducts } = await supabase.from('products').select('*', { count: 'exact', head: true });

  console.log('\nDupă:');
  console.log('  💰 Prețuri:', newPrices);
  console.log('  🔗 URL-uri:', newUrls);
  console.log('  📦 Produse:', newProducts);
  console.log('\n✅ Baza de date e goală. Rulează: node scripts/import-all-urls.js');
}

main().catch(console.error);
