import * as cheerio from 'cheerio'
import { ParseResult, RetailerParser } from './types'
import { parsePrice, calculatePromoPercentage } from '../utils'

/**
 * Parser pentru DucFarm (ducfarm.ro)
 * Structură similară cu Remedium Farm
 */
export const ducfarmParser: RetailerParser = {
  name: 'DucFarm',
  baseUrl: 'https://www.ducfarm.ro',

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

      if (pageText.includes('in stoc') || pageText.includes('în stoc')) {
        isInStock = true
      }

      // Prețul - DucFarm folosește aceleași clase ca Remedium Farm
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
        } catch (e) {}
      })

      // Selectori specifici DucFarm (similar Remedium Farm)
      if (!price) {
        const priceSelectors = [
          '.product-summary__info--price-gross',
          '.product-summary__info--price-box',
          '.product-price',
          '[itemprop="price"]',
          '.price',
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

      // Prețul original
      const originalPriceSelectors = [
        '.product-summary__info--price-old',
        '.old-price',
        '.regular-price',
        'del .price',
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
