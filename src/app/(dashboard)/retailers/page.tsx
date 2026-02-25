'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react'

interface Retailer {
  id: string
  name: string
  base_url: string | null
  is_active: boolean
  created_at: string
}

export default function RetailersPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formBaseUrl, setFormBaseUrl] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/retailers')
      const data = await res.json()
      setRetailers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching retailers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openAddModal = () => {
    setEditingRetailer(null)
    setFormName('')
    setFormBaseUrl('')
    setIsModalOpen(true)
  }

  const openEditModal = (retailer: Retailer) => {
    setEditingRetailer(retailer)
    setFormName(retailer.name)
    setFormBaseUrl(retailer.base_url || '')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingRetailer) {
        await fetch('/api/retailers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRetailer.id,
            name: formName,
            base_url: formBaseUrl || null,
          }),
        })
      } else {
        await fetch('/api/retailers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            base_url: formBaseUrl || null,
          }),
        })
      }

      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving retailer:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur vrei să dezactivezi acest retailer?')) return

    try {
      await fetch(`/api/retailers?id=${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting retailer:', error)
    }
  }

  const activeRetailers = retailers.filter((r) => r.is_active)

  return (
    <div>
      <Header title="Retaileri" subtitle={`${activeRetailers.length} farmacii active`} />

      <div className="mb-4">
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Adaugă Retailer
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
                  <TableHead>Nume</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRetailers.map((retailer) => (
                  <TableRow key={retailer.id}>
                    <TableCell className="font-medium">{retailer.name}</TableCell>
                    <TableCell>
                      {retailer.base_url ? (
                        <a
                          href={retailer.base_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                        >
                          {retailer.base_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={retailer.is_active ? 'success' : 'danger'}>
                        {retailer.is_active ? 'Activ' : 'Inactiv'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(retailer)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(retailer.id)}>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRetailer ? 'Editează Retailer' : 'Adaugă Retailer'}
      >
        <div className="space-y-4">
          <Input
            label="Nume Farmacie"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="ex: Farmacia Tei"
          />
          <Input
            label="Website (opțional)"
            value={formBaseUrl}
            onChange={(e) => setFormBaseUrl(e.target.value)}
            placeholder="ex: https://www.farmaciatei.ro"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={!formName}>
              {editingRetailer ? 'Salvează' : 'Adaugă'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
