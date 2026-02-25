'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Plus, Edit2, Trash2, Link as LinkIcon, ExternalLink } from 'lucide-react'

interface Retailer {
  id: string
  name: string
}

interface ProductUrl {
  id: string
  url: string
  is_active: boolean
  last_error: string | null
  error_count: number
  retailer: Retailer
}

interface Product {
  id: string
  name: string
  ean: string | null
  is_active: boolean
  product_urls: ProductUrl[]
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formEan, setFormEan] = useState('')
  const [formRetailerId, setFormRetailerId] = useState('')
  const [formUrl, setFormUrl] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [productsRes, retailersRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/retailers'),
      ])

      const productsData = await productsRes.json()
      const retailersData = await retailersRes.json()

      setProducts(Array.isArray(productsData) ? productsData : [])
      setRetailers(Array.isArray(retailersData) ? retailersData.filter((r: Retailer & { is_active: boolean }) => r.is_active) : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openAddModal = () => {
    setEditingProduct(null)
    setFormName('')
    setFormEan('')
    setIsModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormName(product.name)
    setFormEan(product.ean || '')
    setIsModalOpen(true)
  }

  const openUrlModal = (product: Product) => {
    setSelectedProduct(product)
    setFormRetailerId('')
    setFormUrl('')
    setIsUrlModalOpen(true)
  }

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProduct.id,
            name: formName,
            ean: formEan || null,
          }),
        })
      } else {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            ean: formEan || null,
          }),
        })
      }

      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Sigur vrei să dezactivezi acest produs?')) return

    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleAddUrl = async () => {
    if (!selectedProduct || !formRetailerId || !formUrl) return

    try {
      await fetch(`/api/products/${selectedProduct.id}/urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: formRetailerId,
          url: formUrl,
        }),
      })

      setIsUrlModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error adding URL:', error)
    }
  }

  const activeProducts = products.filter((p) => p.is_active)

  return (
    <div>
      <Header title="Produse" subtitle={`${activeProducts.length} produse active`} />

      <div className="mb-4">
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Adaugă Produs
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EAN</TableHead>
                  <TableHead>Nume Produs</TableHead>
                  <TableHead>URL-uri</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.ean || '-'}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.product_urls
                          ?.filter((u) => u.is_active)
                          .map((url) => (
                            <a
                              key={url.id}
                              href={url.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center"
                            >
                              <Badge
                                variant={url.error_count > 0 ? 'danger' : 'success'}
                                className="cursor-pointer hover:opacity-80"
                              >
                                {url.retailer?.name || 'Unknown'}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Badge>
                            </a>
                          ))}
                        {(!product.product_urls || product.product_urls.filter((u) => u.is_active).length === 0) && (
                          <span className="text-gray-500 text-sm">Fără URL-uri</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'success' : 'danger'}>
                        {product.is_active ? 'Activ' : 'Inactiv'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openUrlModal(product)}>
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(product)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal pentru adăugare/editare produs */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Editează Produs' : 'Adaugă Produs'}
      >
        <div className="space-y-4">
          <Input
            label="Nume Produs"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="ex: Paracetamol 500mg"
          />
          <Input
            label="EAN (opțional)"
            value={formEan}
            onChange={(e) => setFormEan(e.target.value)}
            placeholder="ex: 5941234567890"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSaveProduct} disabled={!formName}>
              {editingProduct ? 'Salvează' : 'Adaugă'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal pentru adăugare URL */}
      <Modal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        title={`Adaugă URL pentru ${selectedProduct?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Retailer</label>
            <select
              value={formRetailerId}
              onChange={(e) => setFormRetailerId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100"
            >
              <option value="">Selectează retailer</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="URL Produs"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://farmaciatei.ro/produs/..."
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsUrlModalOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleAddUrl} disabled={!formRetailerId || !formUrl}>
              Adaugă URL
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
