'use client'

import { useState, useEffect, useMemo } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Edit, Trash2, Save, X, Search, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { generateUniqueEntityId } from '@/lib/utils/idGenerator'
import { deleteOptionAndUpdateProducts } from '@/lib/firebase/db'

interface Option {
  id: string
  name: string
  type: 'single' | 'multiple' | 'text'
  required: boolean
  minSelections?: number
  maxSelections?: number
  values: OptionValue[]
  isActive: boolean
  sortOrder: number
  restaurantId: string
  customId: string // 11-digit unique identifier
}

interface OptionValue {
  id: string
  name: string
  price: number
  isDefault?: boolean
  isActive?: boolean
}

export default function OptionsPage() {
  const { user } = useAuth()
  const [options, setOptions] = useState<Option[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all')
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<Option | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'single' as 'single' | 'multiple' | 'text',
    required: false,
    minSelections: 0,
    maxSelections: 1,
    values: [] as OptionValue[],
    isActive: true,
    sortOrder: 0
  })

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'options'),
      where('restaurantId', '==', user.uid),
      orderBy('sortOrder', 'asc')
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const optionsData: Option[] = []
      querySnapshot.forEach((doc) => {
        optionsData.push({ id: doc.id, ...doc.data() } as Option)
      })
      setOptions(optionsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'single',
      required: false,
      minSelections: 0,
      maxSelections: 1,
      values: [],
      isActive: true,
      sortOrder: 0
    })
    setEditingOption(null)
  }

  const addOptionValue = () => {
    const newValue: OptionValue = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      isDefault: false,
      isActive: true
    }
    setFormData(prev => ({
      ...prev,
      values: [...prev.values, newValue]
    }))
  }

  const updateOptionValue = (index: number, field: keyof OptionValue, value: any) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values.map((val, i) =>
        i === index ? { ...val, [field]: value } : val
      )
    }))
  }

  const removeOptionValue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.uid) {
      toast.error('Restoran bilgisi bulunamadı')
      return
    }

    // Validate form
    if (!formData.name.trim()) {
      toast.error('Opsiyon adı zorunludur')
      return
    }

    if (formData.type !== 'text' && formData.values.length === 0) {
      toast.error('En az bir seçenek eklemelisiniz')
      return
    }

    try {
      let optionData: any = {
        ...formData,
        restaurantId: user.uid
      }

      if (editingOption) {
        // Güncelleme - customId'yi koru
        optionData.customId = editingOption.customId
        await updateDoc(doc(db, 'options', editingOption.id), optionData)
        toast.success('Opsiyon güncellendi')
      } else {
        // Yeni opsiyon - custom ID oluştur
        const customId = await generateUniqueEntityId('options', user.uid, db)
        optionData.customId = customId
        await addDoc(collection(db, 'options'), optionData)
        toast.success('Opsiyon eklendi')
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving option:', error)
      toast.error('Opsiyon kaydedilirken hata oluştu')
    }
  }

  const handleEdit = (option: Option) => {
    setEditingOption(option)
    setFormData({
      name: option.name,
      type: option.type,
      required: option.required,
      minSelections: option.minSelections || 0,
      maxSelections: option.maxSelections || 1,
      values: option.values?.map(value => ({
        ...value,
        isActive: value.isActive !== undefined ? value.isActive : true
      })) || [],
      isActive: option.isActive,
      sortOrder: option.sortOrder
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (optionId: string) => {
    if (!user?.uid) {
      toast.error('Restoran bilgisi bulunamadı');
      return;
    }

    if (!confirm('Bu opsiyonu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve bu opsiyonu kullanan ürünlerden çıkarılacaktır.')) return;

    try {
      await deleteOptionAndUpdateProducts(user.uid, optionId);
      toast.success('Opsiyon silindi ve ilgili ürünler güncellendi');
    } catch (error) {
      console.error('Error deleting option:', error);
      toast.error('Opsiyon silinirken hata oluştu');
    }
  }

  const toggleActive = async (option: Option) => {
    try {
      await updateDoc(doc(db, 'options', option.id), {
        isActive: !option.isActive
      })
      toast.success(`Opsiyon ${!option.isActive ? 'aktif' : 'pasif'} yapıldı`)
    } catch (error) {
      console.error('Error toggling option status:', error)
      toast.error('Opsiyon durumu güncellenirken hata oluştu')
    }
  }

  // Toggle a single option value's active flag and persist
  const toggleOptionValueActive = async (optionId: string, valueId: string, checked: boolean) => {
    try {
      const optionRef = doc(db, 'options', optionId)
      const snap = await getDoc(optionRef)
      if (!snap.exists()) throw new Error('Opsiyon bulunamadı')
      const data: any = snap.data()
      const values = (data.values || []).map((v: any) => v.id === valueId ? { ...v, isActive: checked } : v)
      await updateDoc(optionRef, { values, updatedAt: serverTimestamp() })
      toast.success('Seçenek durumu güncellendi')
    } catch (error) {
      console.error('Seçenek durumu güncellenirken hata:', error)
      toast.error('Seçenek durumu güncellenirken hata oluştu')
    }
  }

  // Remove a single option value from option document
  const deleteOptionValueFromOption = async (optionId: string, valueId: string) => {
    if (!confirm('Bu seçenek silinsin mi?')) return
    try {
      const optionRef = doc(db, 'options', optionId)
      const snap = await getDoc(optionRef)
      if (!snap.exists()) throw new Error('Opsiyon bulunamadı')
      const data: any = snap.data()
      const values = (data.values || []).filter((v: any) => v.id !== valueId)
      await updateDoc(optionRef, { values, updatedAt: serverTimestamp() })
      toast.success('Seçenek silindi')
    } catch (error) {
      console.error('Seçenek silinirken hata:', error)
      toast.error('Seçenek silinirken hata oluştu')
    }
  }

  // Filtered and paginated options
  const filteredOptions = useMemo(() => {
    let filtered = options

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(option => option.isActive)
    } else if (statusFilter === 'passive') {
      filtered = filtered.filter(option => !option.isActive)
    }

    return filtered
  }, [options, searchTerm, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredOptions.length / itemsPerPage)
  const paginatedOptions = filteredOptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Status counts
  const statusCounts = useMemo(() => {
    const all = options.length
    const active = options.filter(o => o.isActive).length
    const passive = options.filter(o => !o.isActive).length
    return { all, active, passive }
  }, [options])

  // Bulk operations
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOptions(new Set(paginatedOptions.map(o => o.id)))
    } else {
      setSelectedOptions(new Set())
    }
  }

  const handleSelectOption = (optionId: string, checked: boolean) => {
    const newSelected = new Set(selectedOptions)
    if (checked) {
      newSelected.add(optionId)
    } else {
      newSelected.delete(optionId)
    }
    setSelectedOptions(newSelected)
  }

  const handleBulkActivate = async () => {
    if (selectedOptions.size === 0) return
    try {
      const promises = Array.from(selectedOptions).map(optionId =>
        updateDoc(doc(db, 'options', optionId), { isActive: true })
      )
      await Promise.all(promises)
      toast.success(`${selectedOptions.size} opsiyon aktif yapıldı`)
      setSelectedOptions(new Set())
    } catch (error) {
      console.error('Bulk activate error:', error)
      toast.error('Opsiyonlar aktif yapılırken hata oluştu')
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedOptions.size === 0) return
    try {
      const promises = Array.from(selectedOptions).map(optionId =>
        updateDoc(doc(db, 'options', optionId), { isActive: false })
      )
      await Promise.all(promises)
      toast.success(`${selectedOptions.size} opsiyon pasif yapıldı`)
      setSelectedOptions(new Set())
    } catch (error) {
      console.error('Bulk deactivate error:', error)
      toast.error('Opsiyonlar pasif yapılırken hata oluştu')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedOptions.size === 0) return
    if (!confirm(`${selectedOptions.size} opsiyonu silmek istediğinizden emin misiniz?`)) return
    try {
      const promises = Array.from(selectedOptions).map(optionId =>
        deleteOptionAndUpdateProducts(user?.uid || '', optionId)
      )
      await Promise.all(promises)
      toast.success(`${selectedOptions.size} opsiyon silindi`)
      setSelectedOptions(new Set())
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Opsiyonlar silinirken hata oluştu')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Opsiyonlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user?.uid) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Restoran bilgisi bulunamadı</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="ml-6">
          <h1 className="text-3xl font-bold">Opsiyon Yönetimi</h1>
          <p className="text-muted-foreground">Ürün seçeneklerini yönetin</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Opsiyon
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOption ? 'Opsiyon Düzenle' : 'Yeni Opsiyon'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Opsiyon Adı *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Opsiyon Türü</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'single' | 'multiple' | 'text') =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Tek Seçim</SelectItem>
                      <SelectItem value="multiple">Çoklu Seçim</SelectItem>
                      <SelectItem value="text">Metin Girişi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sıralama</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {formData.type !== 'text' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="required">Zorunlu</Label>
                    <Switch
                      id="required"
                      checked={formData.required}
                      onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                    />
                  </div>

                  {formData.type === 'multiple' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minSelections">Min. Seçim</Label>
                        <Input
                          id="minSelections"
                          type="number"
                          value={formData.minSelections}
                          onChange={(e) => setFormData({ ...formData, minSelections: parseInt(e.target.value) || 0 })}
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxSelections">Max. Seçim</Label>
                        <Input
                          id="maxSelections"
                          type="number"
                          value={formData.maxSelections}
                          onChange={(e) => setFormData({ ...formData, maxSelections: parseInt(e.target.value) || 1 })}
                          min="1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Seçenekler</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addOptionValue}>
                        <Plus className="w-4 h-4 mr-2" />
                        Seçenek Ekle
                      </Button>
                    </div>

                    {formData.values.map((value, index) => (
                      <div key={value.id} className="flex items-center gap-2 p-2 border rounded">
                        <Input
                          placeholder="Seçenek adı"
                          value={value.name}
                          onChange={(e) => updateOptionValue(index, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Fiyat"
                          value={value.price}
                          onChange={(e) => updateOptionValue(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-24"
                          step="0.01"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Aktif</Label>
                          <Switch
                            checked={value.isActive !== undefined ? value.isActive : true}
                            onCheckedChange={(checked) => updateOptionValue(index, 'isActive', checked)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOptionValue(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Aktif/Pasif</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  İptal
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {editingOption ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Opsiyon ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'passive')}>
        <TabsList>
          <TabsTrigger value="all">Tüm Opsiyonlar ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="active">Aktif Opsiyonlar ({statusCounts.active})</TabsTrigger>
          <TabsTrigger value="passive">Pasif Opsiyonlar ({statusCounts.passive})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="space-y-4">
          {/* Bulk Operations */}
          {selectedOptions.size > 0 && (
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedOptions.size} opsiyon seçildi</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    İşlemler
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleBulkActivate}>
                    Aktif Yap
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkDeactivate}>
                    Pasif Yap
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                    Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={paginatedOptions.length > 0 && selectedOptions.size === paginatedOptions.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>İsim</TableHead>
                  <TableHead>Ürünler</TableHead>
                  <TableHead>İçerikler</TableHead>
                  <TableHead>Min-Max Sayısı</TableHead>
                  <TableHead className="w-32">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOptions.map((option) => (
                  <TableRow key={option.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOptions.has(option.id)}
                        onCheckedChange={(checked) => handleSelectOption(option.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{option.name}</span>
                        <Badge variant={option.isActive ? 'default' : 'secondary'}>
                          {option.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">-</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {option.type === 'text' ? (
                          'Metin girişi'
                        ) : (
                          <div className="space-y-1">
                            {(option.values || []).slice(0, 2).map(v => (
                              <div key={v.id} className="flex items-center gap-2">
                                <span>{v.name}</span>
                                <span className="text-muted-foreground">({v.price}₺)</span>
                              </div>
                            ))}
                            {(option.values || []).length > 2 && (
                              <span className="text-muted-foreground">+{(option.values || []).length - 2} daha</span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {option.type !== 'text' ? (
                        `${option.minSelections || 1} - ${option.maxSelections || 1}`
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={option.isActive}
                          onCheckedChange={() => toggleActive(option)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(option)}
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(option.id)}
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredOptions.length)} / {filteredOptions.length} opsiyon
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Önceki
                </Button>
                <span className="text-sm">
                  Sayfa {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sonraki
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {filteredOptions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Arama kriterlerinize uygun opsiyon bulunamadı'
                  : 'Henüz opsiyon bulunmuyor'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm || statusFilter !== 'all'
                  ? 'Farklı arama kriterleri deneyin'
                  : 'İlk opsiyonunuzu oluşturmak için "Yeni Opsiyon" butonuna tıklayın'
                }
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}