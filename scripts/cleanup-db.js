/**
 * Curăță baza de date - păstrează doar produsele din Excel-ul curent
 * Dezactivează produse vechi și șterge URL-uri orfane
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('='.repeat(60));
  console.log('  CURĂȚARE BAZĂ DE DATE');
  console.log('='.repeat(60));

  // 1. Citim EAN-urile din Excel (sursa de adevăr)
  const workbook = XLSX.readFile('products-template.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  const excelEans = new Set(data.map(r => String(r.EAN || '').trim()).filter(Boolean));
  console.log('\n📖 Produse în Excel:', excelEans.size);

  // 2. Luăm toate produsele din DB
  const { data: allProducts } = await supabase
    .from('products')
    .select('id, name, ean, is_active, sort_order');

  console.log('📦 Produse în DB:', allProducts.length);

  const toKeep = [];
  const toRemove = [];

  for (const p of allProducts) {
    if (excelEans.has(p.ean)) {
      toKeep.push(p);
    } else {
      toRemove.push(p);
    }
  }

  console.log('\n✅ De păstrat (în Excel):', toKeep.length);
  console.log('❌ De eliminat (nu sunt în Excel):', toRemove.length);

  if (toRemove.length > 0) {
    console.log('\nProduse de eliminat:');
    for (const p of toRemove) {
      // Verificăm câte URL-uri și prețuri are
      const { data: urls } = await supabase
        .from('product_urls')
        .select('id')
        .eq('product_id', p.id);

      const urlIds = (urls || []).map(u => u.id);
      let priceCount = 0;
      if (urlIds.length > 0) {
        const { count } = await supabase
          .from('price_history')
          .select('*', { count: 'exact', head: true })
          .in('product_url_id', urlIds);
        priceCount = count || 0;
      }

      console.log('  ❌', p.name, '(EAN:', p.ean, ') -', urlIds.length, 'URLs,', priceCount, 'prețuri');
    }
  }

  // 3. Ștergem prețurile, URL-urile și produsele vechi
  console.log('\n🗑️  Șterg datele vechi...');

  for (const p of toRemove) {
    // Luăm URL-urile produsului
    const { data: urls } = await supabase
      .from('product_urls')
      .select('id')
      .eq('product_id', p.id);

    const urlIds = (urls || []).map(u => u.id);

    // Ștergem prețurile
    if (urlIds.length > 0) {
      const { error: priceError } = await supabase
        .from('price_history')
        .delete()
        .in('product_url_id', urlIds);
      if (priceError) console.log('    ⚠️  Eroare prețuri:', priceError.message);
    }

    // Ștergem URL-urile
    const { error: urlError } = await supabase
      .from('product_urls')
      .delete()
      .eq('product_id', p.id);
    if (urlError) console.log('    ⚠️  Eroare URLs:', urlError.message);

    // Ștergem produsul
    const { error: prodError } = await supabase
      .from('products')
      .delete()
      .eq('id', p.id);
    if (prodError) console.log('    ⚠️  Eroare produs:', prodError.message);
    else console.log('  🗑️  Șters:', p.name);
  }

  // 4. Statistici finale
  const { count: finalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  const { count: finalUrls } = await supabase
    .from('product_urls')
    .select('*', { count: 'exact', head: true });

  const { count: finalPrices } = await supabase
    .from('price_history')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(60));
  console.log('  REZULTAT FINAL');
  console.log('='.repeat(60));
  console.log('  📦 Produse:', finalProducts);
  console.log('  🔗 URL-uri:', finalUrls);
  console.log('  💰 Prețuri:', finalPrices);
  console.log('');
}

main().catch(console.error);
