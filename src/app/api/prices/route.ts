import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET - Obține prețurile (cu opțiuni de filtrare)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const productId = searchParams.get('productId')

  // Dacă avem date specifice, obținem media prețurilor în acea perioadă
  if (startDate && endDate) {
    // Query pentru medii în perioada specificată
    let query = supabaseAdmin
      .from('price_history')
      .select(`
        product_url_id,
        price,
        original_price,
        promo_percentage,
        is_in_stock,
        scraped_at,
        product_urls!inner (
          id,
          url,
          product_id,
          retailer_id,
          products!inner (
            id,
            name,
            ean,
            is_active,
            sort_order
          ),
          retailers!inner (
            id,
            name,
            is_active
          )
        )
      `)
      .gte('scraped_at', startDate)
      .lte('scraped_at', endDate)
      .eq('product_urls.products.is_active', true)
      .eq('product_urls.retailers.is_active', true)

    if (productId) {
      query = query.eq('product_urls.product_id', productId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Procesăm datele pentru a calcula medii
    const aggregated = new Map<string, {
      productId: string
      ean: string | null
      productName: string
      sortOrder: number
      retailerId: string
      retailerName: string
      prices: number[]
      originalPrices: number[]
      promoPercentages: number[]
      stockStatuses: boolean[]
    }>()

    data?.forEach((item: Record<string, unknown>) => {
      const productUrls = item.product_urls as {
        product_id: string
        retailer_id: string
        products: { id: string; name: string; ean: string | null; sort_order: number | null }
        retailers: { id: string; name: string }
      }

      const key = `${productUrls.product_id}-${productUrls.retailer_id}`

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          productId: productUrls.products.id,
          ean: productUrls.products.ean,
          productName: productUrls.products.name,
          sortOrder: productUrls.products.sort_order ?? 9999,
          retailerId: productUrls.retailers.id,
          retailerName: productUrls.retailers.name,
          prices: [],
          originalPrices: [],
          promoPercentages: [],
          stockStatuses: [],
        })
      }

      const entry = aggregated.get(key)!
      if (item.price !== null) entry.prices.push(item.price as number)
      if (item.original_price !== null) entry.originalPrices.push(item.original_price as number)
      if (item.promo_percentage !== null) entry.promoPercentages.push(item.promo_percentage as number)
      entry.stockStatuses.push(item.is_in_stock as boolean)
    })

    // Calculăm mediile și sortăm după sort_order (ordinea din Excel)
    const result = Array.from(aggregated.values())
      .map((entry) => ({
        productId: entry.productId,
        ean: entry.ean,
        productName: entry.productName,
        sortOrder: entry.sortOrder,
        retailerId: entry.retailerId,
        retailerName: entry.retailerName,
        price: entry.prices.length > 0
          ? Math.round((entry.prices.reduce((a, b) => a + b, 0) / entry.prices.length) * 100) / 100
          : null,
        originalPrice: entry.originalPrices.length > 0
          ? Math.round((entry.originalPrices.reduce((a, b) => a + b, 0) / entry.originalPrices.length) * 100) / 100
          : null,
        promoPercentage: entry.promoPercentages.length > 0
          ? Math.round((entry.promoPercentages.reduce((a, b) => a + b, 0) / entry.promoPercentages.length) * 100) / 100
          : null,
        isInStock: entry.stockStatuses.some((s) => s), // În stoc dacă a fost în stoc cel puțin o dată
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)

    return NextResponse.json(result)
  }

  // Dacă nu avem date, folosim view-ul pentru ultimele prețuri
  // Luăm sort_order separat din products pentru sortare
  const [pricesResult, productsResult] = await Promise.all([
    supabaseAdmin.from('latest_prices').select('*'),
    supabaseAdmin.from('products').select('id, sort_order'),
  ])

  if (pricesResult.error) {
    return NextResponse.json({ error: pricesResult.error.message }, { status: 500 })
  }

  // Creăm un map de sort_order per product_id
  const sortOrderMap = new Map<string, number>()
  productsResult.data?.forEach((p: { id: string; sort_order: number | null }) => {
    sortOrderMap.set(p.id, p.sort_order ?? 9999)
  })

  // Sortăm rezultatele după sort_order (view-ul folosește product_id snake_case)
  const sortedData = (pricesResult.data || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const orderA = sortOrderMap.get(a.product_id as string) ?? 9999
    const orderB = sortOrderMap.get(b.product_id as string) ?? 9999
    return orderA - orderB
  })

  return NextResponse.json(sortedData)
}
