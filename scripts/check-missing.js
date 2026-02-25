const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const workbook = XLSX.readFile('products-template.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log('Produse în Excel:', data.length);

  const { data: dbProducts } = await supabase.from('products').select('ean, name');
  const dbEans = new Set(dbProducts.map(p => p.ean));

  console.log('Produse în DB:', dbProducts.length);
  console.log('\nLipsesc din DB:');

  for (const row of data) {
    const ean = String(row.EAN || '').trim();
    const name = row.Produs;
    if (!ean) {
      console.log('  ⚠️  Rând fără EAN:', name);
      continue;
    }
    if (!dbEans.has(ean)) {
      console.log('  ❌', name, '(EAN:', ean, ')');
    }
  }

  // Verificăm și duplicate în Excel
  const excelEans = data.map(r => String(r.EAN || '').trim()).filter(Boolean);
  const seen = new Set();
  for (const ean of excelEans) {
    if (seen.has(ean)) {
      const name = data.find(r => String(r.EAN || '').trim() === ean)?.Produs;
      console.log('\n  ⚠️  EAN duplicat în Excel:', ean, '-', name);
    }
    seen.add(ean);
  }
}

main().catch(console.error);
