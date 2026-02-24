# Pharmacy Price Tracker - Documentație Tehnică

## 1. Descriere Generală

**Pharmacy Price Tracker** este o aplicație de monitorizare a prețurilor pentru produse farmaceutice din România. Aplicația colectează automat prețuri de la farmaciile online, le stochează într-o bază de date și oferă un dashboard pentru vizualizare și comparație.

### Funcționalități Principale
- Monitorizare automată a prețurilor (cron săptămânal)
- Dashboard cu vizualizare comparativă între farmacii
- Export date în format Excel cu filtrare pe perioadă
- Import produse și URL-uri din Excel
- Indicator OOS (Out of Stock) pentru produse indisponibile
- Buton pentru colectare manuală a prețurilor

---

## 2. Tech Stack

### Frontend
| Tehnologie | Versiune | Descriere |
|------------|----------|-----------|
| Next.js | 16.1.6 | Framework React cu App Router |
| React | 19.2.3 | Bibliotecă UI |
| TypeScript | ^5 | Tipizare statică |
| Tailwind CSS | ^4 | Styling utility-first |
| Lucide React | ^0.563.0 | Iconuri SVG |
| Recharts | ^3.7.0 | Grafice și vizualizări |

### Backend & Database
| Tehnologie | Descriere |
|------------|-----------|
| Next.js API Routes | Endpoints REST |
| Supabase | PostgreSQL managed + Auth |
| Vercel | Hosting + Cron Jobs |

### Scraping & Utilitare
| Tehnologie | Versiune | Descriere |
|------------|----------|-----------|
| Cheerio | ^1.2.0 | HTML parsing pentru scraping |
| xlsx | ^0.18.5 | Import/Export Excel |
| date-fns | ^4.1.0 | Manipulare date |
| dotenv | ^17.2.3 | Environment variables |

---

## 3. Arhitectură

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Dashboard  │  │   Header    │  │     PriceTable          │ │
│  │  (page.tsx) │  │             │  │  (comparație prețuri)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API ROUTES                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ /prices  │ │/products │ │/retailers│ │ /export  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ /api/cron/scrape  (Vercel Cron - Duminica 23:00)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SCRAPER ENGINE                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Parser Registry                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │   │
│  │  │Farmacia Tei │ │   HelpNet   │ │ Spring Farma│  ...    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌───────────────┐   │
│  │ products │ │retailers │ │product_urls │ │ price_history │   │
│  └──────────┘ └──────────┘ └─────────────┘ └───────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    latest_prices (VIEW)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Structura Proiectului

```
pharmacy-tracker/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard principal
│   │   ├── layout.tsx                  # Layout cu metadata
│   │   ├── globals.css                 # Stiluri globale
│   │   ├── favicon.ico
│   │   └── api/
│   │       ├── cron/scrape/route.ts    # Cron endpoint
│   │       ├── prices/route.ts         # CRUD prețuri
│   │       ├── products/route.ts       # CRUD produse
│   │       ├── retailers/route.ts      # Lista retaileri
│   │       ├── export/route.ts         # Export Excel
│   │       ├── errors/route.ts         # Logging erori
│   │       └── logs/route.ts           # Logging general
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx              # Variante: default, success
│   │   │   ├── Card.tsx                # Container cu shadow
│   │   │   ├── Badge.tsx               # Variante: default, error (OOS)
│   │   │   └── DateRangePicker.tsx     # Selector perioadă
│   │   ├── layout/
│   │   │   └── Header.tsx              # Header cu buton scrape
│   │   └── dashboard/
│   │       ├── StatsCards.tsx          # Statistici sumare
│   │       └── PriceTable.tsx          # Tabel comparativ prețuri
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts               # Supabase client config
│   │   └── scraper/
│   │       ├── index.ts                # Main scraper logic
│   │       └── parsers/
│   │           ├── index.ts            # Parser registry
│   │           ├── types.ts            # TypeScript interfaces
│   │           ├── generic.ts          # Parser generic/fallback
│   │           ├── farmacia-tei.ts     # ✅ Funcțional
│   │           ├── helpnet.ts          # ✅ Funcțional
│   │           ├── drmax.ts            # ✅ Funcțional (via proxy)
│   │           ├── spring-farma.ts     # ✅ Funcțional
│   │           ├── remedium-farm.ts    # ✅ Funcțional
│   │           ├── biscuit-pharma.ts   # ✅ Funcțional
│   │           ├── dav-farma.ts        # ✅ Funcțional
│   │           ├── ducfarm.ts          # ✅ Funcțional
│   │           ├── alshefa.ts          # ✅ Funcțional
│   │           ├── pfarma.ts           # ✅ Funcțional
│   │           └── catena.ts           # ❌ Nefuncțional
│   │
│   └── types/
│       └── index.ts                    # TypeScript types
│
├── scripts/
│   ├── run-scrape.js                   # Scraping manual
│   ├── import-all-urls.js              # Import din Excel
│   ├── test-all-pharmacies.js          # Test toate farmaciile
│   ├── test-scraper.js                 # Test scraper individual
│   └── ... (alte scripturi de test)
│
├── products-template.xlsx              # Template import produse
├── vercel.json                         # Cron config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── CLAUDE.md                           # Context pentru Claude Code
```

---

## 5. Schema Bazei de Date

### Tabele

#### `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  ean VARCHAR(13),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `retailers`
```sql
CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  base_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `product_urls`
```sql
CREATE TABLE product_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  retailer_id UUID REFERENCES retailers(id),
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, retailer_id)
);
```

#### `price_history`
```sql
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_url_id UUID REFERENCES product_urls(id),
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  promo_percentage INTEGER,
  is_in_stock BOOLEAN DEFAULT true,
  scraped_at TIMESTAMP DEFAULT NOW()
);
```

### View

#### `latest_prices`
```sql
CREATE VIEW latest_prices AS
SELECT DISTINCT ON (product_url_id)
  *
FROM price_history
ORDER BY product_url_id, scraped_at DESC;
```

---

## 6. Mentenanță

### 6.1 Comenzi Uzuale

```bash
# Pornire server development
npm run dev

# Build pentru producție
npm run build

# Colectare manuală prețuri
node scripts/run-scrape.js

# Import produse/URLs din Excel
node scripts/import-all-urls.js

# Test toate farmaciile
node scripts/test-all-pharmacies.js
```

### 6.2 Adăugare Produse Noi

1. Deschide `products-template.xlsx`
2. Adaugă rând nou cu:
   - Coloana A: Nume produs
   - Coloana B: EAN (opțional)
   - Coloanele C-M: URL-uri pentru fiecare farmacie
3. Salvează fișierul
4. Rulează: `node scripts/import-all-urls.js`
5. Verifică în dashboard sau rulează scraper manual

### 6.3 Adăugare Retailer Nou

1. Creează parser în `src/lib/scraper/parsers/[nume-retailer].ts`:
```typescript
import * as cheerio from 'cheerio';
import type { RetailerParser, ParsedPrice } from './types';

export const numeRetailerParser: RetailerParser = {
  name: 'Nume Retailer',

  async parsePrice(html: string, url: string): Promise<ParsedPrice> {
    const $ = cheerio.load(html);

    // Extrage prețul din HTML
    const priceText = $('.price-selector').text();
    const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));

    return {
      price: isNaN(price) ? null : price,
      originalPrice: null,
      promoPercentage: null,
      isInStock: true,
    };
  }
};
```

2. Înregistrează în `src/lib/scraper/parsers/index.ts`:
```typescript
import { numeRetailerParser } from './nume-retailer';

const parserRegistry: Record<string, RetailerParser> = {
  // ... alte parsere
  'nume-retailer.ro': numeRetailerParser,
};
```

3. Adaugă retailer în Supabase (tabel `retailers`)
4. Adaugă coloană în `products-template.xlsx`

### 6.4 Debugging Scraper

```bash
# Test un produs specific
node scripts/test-scraper.js "https://farmaciatei.ro/produs/..."

# Verifică output pentru toate farmaciile
node scripts/test-all-pharmacies.js
```

### 6.5 Verificare Cron Job

- **Schedule**: Duminica la 23:00 (ora României)
- **Config**: `vercel.json` → `"schedule": "0 21 * * 0"` (21:00 UTC = 23:00 UTC+2)
- **Logs**: Vercel Dashboard → Logs → Filter by `/api/cron/scrape`

### 6.6 Modificare Frecvență Scraping

Editează `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 21 * * 0"  // Cron syntax
    }
  ]
}
```

Exemple:
- Zilnic la 23:00: `"0 21 * * *"`
- Săptămânal (duminica): `"0 21 * * 0"`
- Luni și Joi: `"0 21 * * 1,4"`

---

## 7. Environment Variables

### Variabile Necesare

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Vercel Cron (opțional, pentru securitate)
CRON_SECRET=secret-random-string

# ScraperAPI proxy pentru Dr Max (gratuit: 5000 credite/lună)
SCRAPER_API_KEY=your-scraper-api-key
```

### Unde se configurează

- **Local**: `.env.local` (nu se commit în git)
- **Producție**: Vercel Dashboard → Settings → Environment Variables

---

## 8. Troubleshooting

### Problemă: Parser nu extrage prețul

**Cauză**: Structura HTML s-a schimbat
**Soluție**:
1. Deschide URL-ul în browser
2. Inspectează elementul prețului (F12)
3. Actualizează selectorul în parser

### Problemă: Eroare 403 Forbidden

**Cauză**: Site-ul blochează requesturile automate (Dr Max)
**Soluție**:
- Dr Max este rutat automat prin ScraperAPI proxy
- Necesită `SCRAPER_API_KEY` în `.env.local` și pe Vercel
- Cont gratuit: https://www.scraperapi.com (5000 credite/lună)

### Problemă: Cron nu rulează

**Cauză**: Vercel Cron necesită deploy pe Vercel
**Soluție**:
- Verifică că `vercel.json` este corect
- Deploy pe Vercel (cron nu funcționează local)

### Problemă: Prețuri duplicate

**Cauză**: Scraper rulat de mai multe ori în aceeași zi
**Soluție**: Verifică în `price_history` după `scraped_at`

---

## 9. Backup & Recovery

### Export Date

- Folosește butonul "Export Excel" din dashboard
- Sau direct din Supabase: Table Editor → Export

### Restore Date

1. Import produse: `node scripts/import-all-urls.js`
2. Rulează scraper: `node scripts/run-scrape.js`

---

## 10. Performanță

### Rate Limiting

- Scraper-ul are delay între requesturi pentru a evita blocarea
- Dr Max blochează activ (403) - necesită proxy

### Optimizări Recomandate

- Indexuri pe `price_history.product_url_id` și `price_history.scraped_at`
- View `latest_prices` pentru query-uri rapide
- Paginare pentru tabele mari (neimplementat încă)

---

## 11. Roadmap Viitor

- [ ] Grafice trend prețuri per produs
- [ ] Alerte email când prețul scade
- [x] Suport Dr Max via proxy (ScraperAPI)
- [ ] API public pentru integrări
- [ ] Dark mode
- [ ] Paginare tabel prețuri
