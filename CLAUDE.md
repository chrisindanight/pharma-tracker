# Pharmacy Price Tracker

## Overview
Aplicație de monitorizare a prețurilor pentru farmacii online din România. Colectează și compară prețuri pentru produse farmaceutice de la multiple retaileri.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + React + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Scraping**: Cheerio (HTML parsing)
- **Excel**: xlsx library
- **Icons**: Lucide React
- **Hosting**: Vercel

## Project Structure
```
pharmacy-tracker/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard principal
│   │   └── api/
│   │       ├── prices/           # API pentru prețuri
│   │       ├── retailers/        # API pentru retaileri
│   │       ├── products/         # API pentru produse
│   │       ├── export/           # Export Excel
│   │       └── cron/scrape/      # Endpoint scraping (Vercel Cron)
│   ├── components/
│   │   ├── ui/                   # Button, Card, Badge, DateRangePicker
│   │   ├── layout/               # Header
│   │   └── dashboard/            # StatsCards, PriceTable
│   └── lib/
│       ├── supabase/             # Supabase client
│       └── scraper/
│           ├── index.ts          # Main scraper logic
│           └── parsers/          # Parsere per retailer
├── scripts/
│   ├── run-scrape.js             # Script manual pentru scraping
│   └── import-all-urls.js        # Import URLs din Excel
├── products-template.xlsx        # Template pentru import produse/URLs
└── vercel.json                   # Cron config (Sunday 23:00)
```

## Retaileri Suportați
| Retailer | Status | Parser |
|----------|--------|--------|
| Dr Max | ✅ Funcțional (via ScraperAPI proxy) | drmax.ts |
| Farmacia Tei | ✅ Funcțional | farmacia-tei.ts |
| HelpNet | ✅ Funcțional | helpnet.ts |
| Spring Farma | ✅ Funcțional | spring-farma.ts |
| Remedium Farm | ✅ Funcțional | remedium-farm.ts |
| Biscuit Pharma | ✅ Funcțional | biscuit-pharma.ts |
| Farmaciile DAV | ✅ Funcțional | dav-farma.ts |
| DucFarm | ✅ Funcțional | ducfarm.ts |
| Al Shefa Farm | ✅ Funcțional | alshefa.ts |
| PFarma | ✅ Funcțional | pfarma.ts |

## Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run scraper manually
node scripts/run-scrape.js

# Import URLs from Excel
node scripts/import-all-urls.js
```

## Database Schema (Supabase)
- `products` - Produse (id, name, ean, is_active)
- `retailers` - Farmacii (id, name, base_url, is_active)
- `product_urls` - URLs pentru scraping (id, product_id, retailer_id, url)
- `price_history` - Istoric prețuri (id, product_url_id, price, original_price, promo_percentage, is_in_stock, scraped_at)
- `latest_prices` - View pentru ultimele prețuri

## Workflow pentru adăugare produse noi
1. Deschide `products-template.xlsx`
2. Adaugă produse noi cu EAN și nume
3. Adaugă URL-uri pentru fiecare farmacie în coloanele corespunzătoare
4. Rulează: `node scripts/import-all-urls.js`
5. Colectează prețuri din dashboard sau: `node scripts/run-scrape.js`

## Cron Schedule
- **Când**: Duminica la 23:00 (UTC+2 = 21:00 UTC)
- **Config**: `vercel.json` - `"schedule": "0 21 * * 0"`
- **Endpoint**: `/api/cron/scrape`

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=              # Pentru autentificare Vercel Cron
SCRAPER_API_KEY=          # ScraperAPI proxy pentru Dr Max (gratuit: 5000 credite/lună)
```

## Coding Standards
- TypeScript strict mode
- Server Components by default, Client Components când e nevoie
- Comentarii în română pentru logica de business
- Parsere separate per retailer în `src/lib/scraper/parsers/`
