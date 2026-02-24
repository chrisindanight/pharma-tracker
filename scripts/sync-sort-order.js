/**
 * Sincronizează ordinea produselor din Excel în baza de date
 * Adaugă coloana sort_order dacă nu există și setează valorile
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('📊 Sincronizez ordinea produselor din Excel...\n');

  // 1. Adăugăm coloana sort_order dacă nu există
  const { error: alterError } = await supabase.rpc('exec_sql', {
    query: `ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 9999;`
  });

  // Dacă rpc nu merge, continuăm - coloana poate exista deja
  if (alterError) {
    console.log('⚠️  Nu am putut rula ALTER TABLE via RPC. Rulează manual în Supabase SQL Editor:');
    console.log('   ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 9999;');
    console.log('   Apoi rulează din nou acest script.\n');
  }

  // 2. Citim Excel-ul
  const workbook = XLSX.readFile('products-template.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log('Produse în Excel:', data.length, '\n');

  // 3. Actualizăm sort_order pentru fiecare produs
  let updated = 0;
  let notFound = 0;

  for (let i = 0; i < data.length; i++) {
    const ean = String(data[i].EAN || '').trim();
    const name = data[i].Produs?.trim();
    const sortOrder = i + 1; // 1-based

    if (!ean) continue;

    const { error } = await supabase
      .from('products')
      .update({ sort_order: sortOrder })
      .eq('ean', ean);

    if (error) {
      console.log('  ❌', name, '-', error.message);
      notFound++;
    } else {
      console.log('  ' + String(sortOrder).padStart(3) + '.', name);
      updated++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('DONE:', updated, 'actualizate,', notFound, 'erori');
}

main().catch(console.error);
