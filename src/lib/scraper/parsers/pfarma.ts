import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser pentru PFarma (pfarma.ro)
 */
export const pfarmaParser: RetailerParser = {
  name: 'PFarma',
  baseUrl: 'https://www.pfarma.ro',

  parse(html: string, url: string): ParseResult {
    try {
      const $ = cheerio.load(html)

      // Verificăm stocul
      let isInStock = true
      const pageText = $('body').text().toLowerCase()

      if (
        pageText.includes('stoc epuizat') ||
        pageText.includes('indisponibil') ||
        pageText.includes('out of stock') ||
        pageText.includes('nu este disponibil')
      ) {
        isInStock = false
      }

      // Prețul - PFarma folosește meta tag-uri Open Graph
      let price: number | null = null

      // 1. Meta tag product:price:amount (cel mai precis)
      const metaPrice = $('meta[property="product:price:amount"]').attr('content')
      if (metaPrice) {
        price = parsePrice(metaPrice)
      }

      // 2. JSON-LD
      if (!price) {
        $('script[type="application/ld+json"]').each((i, el) => {
          if (price) return
          try {
            const json = JSON.parse($(el).html() || '{}')
            if (json.offers?.price) {
              price = parseFloat(json.offers.price)
              if (json.offers.availability?.includes('OutOfStock')) {
                isInStock = false
              }
            }
          } catch (e) {}
        })
      }

      // 3. Selectori CSS (backup)
      if (!price) {
        const priceSelectors = [
          '.price-section .price',
          '.price-product',
          '.product-price',
          '[itemprop="price"]',
        ]

        for (const selector of priceSelectors) {
          const element = $(selector).first()
          if (element.length > 0) {
            const content = element.attr('content')
            if (content) {
              price = parsePrice(content)
              if (price && price > 0 && price < 1000) break // Ignorăm prețuri foarte mari (bug afișare)
            }

            const text = element.text().trim()
            const parsed = parsePrice(text)
            // PFarma afișează prețul fără punct zecimal (1730 în loc de 17.30)
            // Verificăm dacă prețul e rezonabil
            if (parsed && parsed > 0 && parsed < 1000) {
              price = parsed
              break
            }
          }
        }
      }

      // Prețul original
      const originalPriceSelectors = ['.old-price', '.regular-price', 'del .price']

      let originalPrice: number | null = null
      for (const selector of originalPriceSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          const text = element.text().trim()
          const parsed = parsePrice(text)
          if (parsed && parsed > 0 && (!price || parsed > price)) {
            originalPrice = parsed
            break
          }
        }
      }

      const promoPercentage = calculatePromoPercentage(price, originalPrice)

      return {
        price,
        originalPrice,
        promoPercentage,
        isInStock,
      }
    } catch (error) {
      return {
        price: null,
        originalPrice: null,
        promoPercentage: null,
        isInStock: false,
        error: `Parse error: ${(error as Error).message}`,
      }
    }
  },
}
