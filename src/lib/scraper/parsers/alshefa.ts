import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser pentru Al Shefa Farm (al-shefafarm.ro)
 */
export const alshefaParser: RetailerParser = {
  name: 'Al Shefa Farm',
  baseUrl: 'https://al-shefafarm.ro',

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

      // Prețul
      let price: number | null = null

      // JSON-LD
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
          if (json['@graph']) {
            for (const item of json['@graph']) {
              if (item.offers?.price) {
                price = parseFloat(item.offers.price)
                break
              }
            }
          }
        } catch (e) {}
      })

      // Selectori CSS
      if (!price) {
        const priceSelectors = [
          '[data-price-amount]',
          'meta[property="product:price:amount"]',
          '.product-price',
          '.price-box .price',
          '.special-price .price',
          '[itemprop="price"]',
          '.price',
        ]

        for (const selector of priceSelectors) {
          const element = $(selector).first()
          if (element.length > 0) {
            const dataPrice = element.attr('data-price-amount')
            if (dataPrice) {
              price = parseFloat(dataPrice)
              if (price && price > 0) break
            }

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

      // Prețul original
      const originalPriceSelectors = [
        '.old-price .price',
        '.regular-price .price',
        'del .price',
        '.was-price',
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
