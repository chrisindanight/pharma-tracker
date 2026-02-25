'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { PriceTable } from '@/components/dashboard/PriceTable'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { startOfDay, endOfDay } from 'date-fns'

interface Retailer {
  id: string
  name: string
}

interface PriceData {
  productId: string
  ean: string | null
  productName: string
  retailerId: string
  retailerName: string
  price: number | null
  originalPrice: number | null
  promoPercentage: number | null
  isInStock: boolean
}

export default function DashboardPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  })

  // Ordinea preferată pentru retaileri
  const retailerOrder = [
    'Dr Max',
    'Farmacia Tei',
    'HelpNet',
    'Spring Farma',
    'Remedium Farm',
    'Biscuit Pharma',
    'Farmaciile DAV',
    'DucFarm',
    'Al Shefa Farm',
    'PFarma',
  ]

  const sortRetailers = (retailers: Retailer[]) => {
    return retailers.sort((a, b) => {
      const indexA = retailerOrder.indexOf(a.name)
      const indexB = retailerOrder.indexOf(b.name)
      // Dacă nu e în listă, pune la sfârșit
      const orderA = indexA === -1 ? 999 : indexA
      const orderB = indexB === -1 ? 999 : indexB
      return orderA - orderB
    })
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    try {
      // Fetch retailers
      const retailersRes = await fetch('/api/retailers')
      const retailersData = await retailersRes.json()
      const activeRetailers = retailersData.filter((r: Retailer & { is_active: boolean }) => r.is_active)
      setRetailers(sortRetailers(activeRetailers))

      // Fetch prices
      const pricesRes = await fetch(
        `/api/prices?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`
      )
      const pricesData = await pricesRes.json()
      setPriceData(Array.isArray(pricesData) ? pricesData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  const handleExport = async () => {
    const url = `/api/export?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`
    window.open(url, '_blank')
  }

  const handleRefresh = async () => {
    await fetchData()
  }

  const handleScrape = async () => {
    try {
      const response = await fetch('/api/cron/scrape', { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        alert(`Colectare completă!\n${result.successCount || 0} prețuri colectate, ${result.errorCount || 0} erori`)
        // Reîncărcăm datele
        await fetchData()
      } else {
        alert(`Eroare: ${result.error || 'Necunoscută'}`)
      }
    } catch (error) {
      alert(`Eroare la colectare: ${(error as Error).message}`)
    }
  }

  // Transformăm datele pentru tabel
  const tableData = priceData.reduce(
    (acc, item) => {
      let product = acc.find((p) => p.productId === item.productId)

      if (!product) {
        product = {
          productId: item.productId,
          ean: item.ean,
          productName: item.productName,
          prices: [],
        }
        acc.push(product)
      }

      product.prices.push({
        retailerId: item.retailerId,
        retailerName: item.retailerName,
        price: item.price,
        originalPrice: item.originalPrice,
        promoPercentage: item.promoPercentage,
        isInStock: item.isInStock,
      })

      return acc
    },
    [] as {
      productId: string
      ean: string | null
      productName: string
      prices: {
        retailerId: string
        retailerName: string
        price: number | null
        originalPrice: number | null
        promoPercentage: number | null
        isInStock: boolean
      }[]
    }[]
  )

  // Calculăm statistici
  const uniqueProducts = new Set(priceData.map((p) => p.productId)).size
  const outOfStockCount = priceData.filter((p) => !p.isInStock).length

  // Găsim câte prețuri sunt cele mai mici
  let lowestPricesCount = 0
  tableData.forEach((product) => {
    const validPrices = product.prices
      .filter((p) => p.price !== null && p.isInStock)
      .map((p) => p.price as number)

    if (validPrices.length > 1) {
      const minPrice = Math.min(...validPrices)
      lowestPricesCount += product.prices.filter(
        (p) => p.price === minPrice && p.isInStock
      ).length
    }
  })

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Monitorizare prețuri farmacii"
        showExport
        showRefresh
        showScrape
        onExport={handleExport}
        onRefresh={handleRefresh}
        onScrape={handleScrape}
      />

      <StatsCards
        totalProducts={uniqueProducts}
        totalRetailers={retailers.length}
        lowestPricesCount={lowestPricesCount}
        outOfStockCount={outOfStockCount}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Comparație Prețuri</CardTitle>
          <DateRangePicker onRangeChange={handleDateRangeChange} />
        </CardHeader>
        <CardContent>
          <PriceTable data={tableData} retailers={retailers} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
