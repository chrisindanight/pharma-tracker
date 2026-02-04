import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser pentru DAV Farma (farmaciiledav.ro)
 */
export const davFarmaParser: RetailerParser = {
  name: 'DAV Farma',
  baseUrl: 'https://www.farmaciiledav.ro',

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

      // DAV Farma afișează "In stoc" sau "> X in stoc"
      if (pageText.includes('in stoc') || pageText.includes('în stoc')) {
        isInStock = true
      }

      // Prețul - DAV Farma
      let price: number | null = null

      // Încercăm JSON-LD
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

      // Selectori specifici DAV Farma
      if (!price) {
        const priceSelectors = [
          '.pr-price',
          '.product-price',
          '.price',
          '[itemprop="price"]',
        ]

        for (const selector of priceSelectors) {
          const element = $(selector).first()
          if (element.length > 0) {
            const content = element.attr('content')
            if (content) {
              price = parsePrice(content)
              if (price && price > 0) break
            }

            const text = element.text().trim()
            price = parsePrice(text)
            if (price && price > 0) break
          }
        }
      }

      // Prețul original (pentru promoții)
      const originalPriceSelectors = [
        '.old-price',
        '.regular-price',
        'del .price',
        '.was-price',
        '.price-old',
      ]

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
