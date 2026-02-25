'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PriceChart } from '@/components/dashboard/PriceChart'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { startOfDay, endOfDay, subDays } from 'date-fns'

interface Product {
  id: string
  name: string
  ean: string | null
}

interface Retailer {
  id: string
  name: string
}

interface ChartData {
  date: string
  [retailerName: string]: string | number | null
}

export default function HistoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  })

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productsRes, retailersRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/retailers'),
        ])

        const productsData = await productsRes.json()
        const retailersData = await retailersRes.json()

        const activeProducts = Array.isArray(productsData)
          ? productsData.filter((p: Product & { is_active: boolean }) => p.is_active)
          : []
        const activeRetailers = Array.isArray(retailersData)
          ? retailersData.filter((r: Retailer & { is_active: boolean }) => r.is_active)
          : []

        setProducts(activeProducts)
        setRetailers(activeRetailers)

        if (activeProducts.length > 0) {
          setSelectedProductId(activeProducts[0].id)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchInitialData()
  }, [])

  useEffect(() => {
    if (!selectedProductId) return

    const fetchHistory = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/prices/history?productId=${selectedProductId}&startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`
        )
        const data = await res.json()
        setChartData(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [selectedProductId, dateRange])

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  // Culori pentru grafic
  const retailersWithColors = retailers.map((r, index) => ({
    ...r,
    color: [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
      '#06B6D4',
      '#84CC16',
    ][index % 8],
  }))

  return (
    <div>
      <Header title="Istoric Prețuri" subtitle="Evoluția prețurilor în timp" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Produs</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 min-w-[300px]"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.ean ? `[${product.ean}] ` : ''}
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Perioadă</label>
          <DateRangePicker onRangeChange={handleDateRangeChange} defaultRange="30days" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedProduct
              ? `Evoluție preț: ${selectedProduct.name}`
              : 'Selectează un produs'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Nu există date pentru perioada selectată</p>
            </div>
          ) : (
            <PriceChart data={chartData} retailers={retailersWithColors} />
          )}
        </CardContent>
      </Card>

      {/* Legendă */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Legendă Retaileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {retailersWithColors.map((retailer) => (
              <div key={retailer.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: retailer.color }}
                />
                <span className="text-gray-300">{retailer.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
