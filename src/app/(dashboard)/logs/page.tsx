'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface ScrapeLog {
  id: string
  started_at: string
  finished_at: string | null
  total_products: number
  successful: number
  failed: number
  errors: Array<{ url: string; error: string }>
}

interface ErrorUrl {
  id: string
  url: string
  last_error: string | null
  error_count: number
  is_active: boolean
  last_scraped_at: string | null
  products: {
    id: string
    name: string
    ean: string | null
  }
  retailers: {
    id: string
    name: string
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ScrapeLog[]>([])
  const [errors, setErrors] = useState<ErrorUrl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [logsRes, errorsRes] = await Promise.all([
        fetch('/api/logs?limit=10'),
        fetch('/api/errors'),
      ])

      const logsData = await logsRes.json()
      const errorsData = await errorsRes.json()

      setLogs(Array.isArray(logsData) ? logsData : [])
      setErrors(Array.isArray(errorsData) ? errorsData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRunScraper = async () => {
    if (!confirm('Vrei să rulezi scraper-ul manual acum?')) return

    setIsRunning(true)
    try {
      const res = await fetch('/api/cron/scrape', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'pharmacy-tracker-secret-2024'}`,
        },
      })

      const result = await res.json()

      if (result.success) {
        alert(`Scraping finalizat!\n\nTotal: ${result.total}\nReușite: ${result.successful}\nEșuate: ${result.failed}`)
      } else {
        alert(`Eroare: ${result.error}`)
      }

      fetchData()
    } catch (error) {
      console.error('Error running scraper:', error)
      alert('Eroare la rularea scraper-ului')
    } finally {
      setIsRunning(false)
    }
  }

  const handleReactivateUrl = async (urlId: string) => {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlId }),
      })
      fetchData()
    } catch (error) {
      console.error('Error reactivating URL:', error)
    }
  }

  return (
    <div>
      <Header title="Loguri & Erori" subtitle="Monitorizare scraping" />

      <div className="mb-6 flex gap-4">
        <Button onClick={handleRunScraper} disabled={isRunning}>
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Se rulează...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Rulează Scraper Manual
            </>
          )}
        </Button>
        <Button variant="secondary" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reîmprospătează
        </Button>
      </div>

      {/* URL-uri cu erori */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            URL-uri cu Erori ({errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {errors.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nu există URL-uri cu erori
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produs</TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Erori</TableHead>
                  <TableHead>Ultima Eroare</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((err) => (
                  <TableRow key={err.id}>
                    <TableCell className="font-medium">
                      {err.products?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{err.retailers?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant={err.error_count >= 3 ? 'danger' : 'warning'}>
                        {err.error_count} erori
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-gray-400">
                      {err.last_error || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={err.is_active ? 'success' : 'danger'}>
                        {err.is_active ? 'Activ' : 'Dezactivat'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!err.is_active && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleReactivateUrl(err.id)}
                        >
                          Reactivează
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Istoric rulări */}
      <Card>
        <CardHeader>
          <CardTitle>Istoric Rulări Scraper</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nu există rulări înregistrate
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Durată</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Reușite</TableHead>
                  <TableHead>Eșuate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const startTime = new Date(log.started_at)
                  const endTime = log.finished_at ? new Date(log.finished_at) : null
                  const duration = endTime
                    ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
                    : null

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(startTime, 'dd MMM yyyy HH:mm', { locale: ro })}
                      </TableCell>
                      <TableCell>
                        {duration !== null ? `${duration}s` : 'În curs...'}
                      </TableCell>
                      <TableCell>{log.total_products}</TableCell>
                      <TableCell className="text-green-400">{log.successful}</TableCell>
                      <TableCell className="text-red-400">{log.failed}</TableCell>
                      <TableCell>
                        {log.finished_at ? (
                          log.failed === 0 ? (
                            <Badge variant="success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complet
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Cu erori
                            </Badge>
                          )
                        ) : (
                          <Badge variant="default">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            În curs
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
