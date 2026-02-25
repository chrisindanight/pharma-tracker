/**
 * Corectează EAN-ul pentru Faringosept Lamaie în Excel
 */

const XLSX = require('xlsx');

const workbook = XLSX.readFile('products-template.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Găsim header row
const headers = data[0];
const eanCol = headers.indexOf('EAN');
const produsCol = headers.indexOf('Produs');

console.log('Caut Faringosept Lamaie...');

let fixed = false;
for (let i = 1; i < data.length; i++) {
  const name = data[i][produsCol];
  const ean = String(data[i][eanCol] || '');

  if (name && name.includes('Faringosept Lamaie 10')) {
    console.log('  Rând', i + 1, ':', name, '| EAN vechi:', ean);
    data[i][eanCol] = 5944702001871;
    console.log('  → EAN nou: 5944702001871');
    fixed = true;
  }
}

if (fixed) {
  const newSheet = XLSX.utils.aoa_to_sheet(data);
  workbook.Sheets[workbook.SheetNames[0]] = newSheet;
  XLSX.writeFile(workbook, 'products-template.xlsx');
  console.log('\n✅ Excel salvat!');
} else {
  console.log('❌ Nu am găsit produsul');
}

// Verificăm că nu mai sunt duplicate
const updatedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
const eans = updatedData.map(r => String(r.EAN || '').trim());
const seen = new Set();
let dupes = false;
for (const ean of eans) {
  if (seen.has(ean)) {
    const prods = updatedData.filter(r => String(r.EAN || '').trim() === ean).map(r => r.Produs);
    console.log('⚠️  EAN duplicat:', ean, '-', prods.join(', '));
    dupes = true;
  }
  seen.add(ean);
}
if (!dupes) console.log('✅ Niciun EAN duplicat!');
console.log('Total produse:', updatedData.length);
