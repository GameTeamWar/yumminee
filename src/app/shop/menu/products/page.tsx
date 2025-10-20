'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, where, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getRestaurantByOwnerId } from '@/lib/firebase/db'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Package,
  DollarSign,
  Filter,
  Edit
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  imageUrl?: string
  categoryIds?: string[]
  categoryNames?: string[]
  isAvailable: boolean
  preparationTime?: number
  allergens?: string[]
  options?: string[]
  optionNames?: string[]
  ingredients?: Ingredient[]
  restaurantId: string
  customId: string // 11-digit unique identifier
}

interface Ingredient {
  id: string
  name: string
  isRemovable: boolean
  isDefault: boolean
  price?: number
}

interface Category {
  id: string
  name: string
  isActive: boolean
  customId?: string // 11-digit unique identifier
}

export default function ProductsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceInputValue, setPriceInputValue] = useState('')

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    const loadRestaurantData = async () => {
      try {
        // Önce restoran sahibinin restoranını bul
        const restaurant = await getRestaurantByOwnerId(user.uid)
        if (!restaurant) {
          console.error('Restoran bulunamadı')
          setLoading(false)
          return
        }

        const restaurantId = restaurant.id

        // Ürünleri getir
        const productsQuery = query(
          collection(db, 'products'),
          where('restaurantId', '==', restaurantId),
          orderBy('name', 'asc')
        )

        const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
          const productsData: Product[] = []
          snapshot.forEach((doc) => {
            productsData.push({ id: doc.id, ...doc.data() } as Product)
          })
          setProducts(productsData)
          setLoading(false)
        })

        // Kategorileri getir
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('restaurantId', '==', restaurant.ownerId || restaurant.id),
          where('isActive', '==', true),
          orderBy('name', 'asc')
        );

        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
          const categoriesData: Category[] = []
          snapshot.forEach((doc) => {
            categoriesData.push({ id: doc.id, ...doc.data() } as Category)
          })
          setCategories(categoriesData.filter(cat => cat.isActive))
        })

        return () => {
          unsubscribeProducts()
          unsubscribeCategories()
        }
      } catch (error) {
        console.error('Restoran verileri yüklenirken hata:', error)
        setLoading(false)
      }
    }

    loadRestaurantData()
  }, [user?.uid])

  const handleDelete = async (productId: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      await deleteDoc(doc(db, 'products', productId))
      toast.success('Ürün silindi')
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Ürün silinirken hata oluştu')
    }
  }

  const handleToggleAvailability = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), {
        isAvailable: !product.isAvailable
      })
      toast.success(`Ürün ${!product.isAvailable ? 'aktif' : 'pasif'} yapıldı`)
    } catch (error) {
      console.error('Error toggling product status:', error)
      toast.error('Ürün durumu güncellenirken hata oluştu')
    }
  }

  const handlePriceEdit = (productId: string, currentPrice: number) => {
    setEditingPrice(productId)
    setPriceInputValue(currentPrice.toString())
  }

  const handlePriceSave = async (productId: string) => {
    const newPrice = parseFloat(priceInputValue)
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('Geçerli bir fiyat girin')
      return
    }

    try {
      const product = products.find(p => p.id === productId)
      if (!product) return

      // Eğer fiyat düşmüşse originalPrice'ı ayarla
      const updateData: any = { price: newPrice }
      if (newPrice < product.price) {
        updateData.originalPrice = product.price
      }

      await updateDoc(doc(db, 'products', productId), updateData)
      toast.success('Fiyat güncellendi')
      setEditingPrice(null)
      setPriceInputValue('')
    } catch (error) {
      console.error('Error updating price:', error)
      toast.error('Fiyat güncellenirken hata oluştu')
    }
  }

  const handlePriceCancel = () => {
    setEditingPrice(null)
    setPriceInputValue('')
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' ||
                           (selectedCategory === 'no-category' && (!product.categoryIds || product.categoryIds.length === 0)) ||
                           (product.categoryIds && product.categoryIds.includes(selectedCategory))
    const matchesAvailability = availabilityFilter === 'all' ||
                               (availabilityFilter === 'available' && product.isAvailable) ||
                               (availabilityFilter === 'unavailable' && !product.isAvailable)

    return matchesSearch && matchesCategory && matchesAvailability
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Ürünler yükleniyor...</p>
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
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Ürün Yönetimi</h1>
          <p className="text-muted-foreground text-lg">Menünüzdeki ürünleri yönetin ve düzenleyin</p>
        </div>
        <Button
          onClick={() => router.push('/shop/menu/add-product?panel=' + new URLSearchParams(window.location.search).get('panel'))}
          className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-lg font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Ürün Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-blue-900">{products.length}</p>
                <p className="text-sm font-medium text-blue-700">Toplam Ürün</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl shadow-sm">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-green-900">{products.filter(p => p.isAvailable).length}</p>
                <p className="text-sm font-medium text-green-700">Aktif Ürün</p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl shadow-sm">
                <Eye className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-orange-900">
                  ₺{(products.reduce((sum, p) => sum + p.price, 0) / Math.max(products.length, 1)).toFixed(2)}
                </p>
                <p className="text-sm font-medium text-orange-700">Ürünlerin Ortalama Fiyatı</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl shadow-sm">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-purple-900">{categories.length}</p>
                <p className="text-sm font-medium text-purple-700">Aktif Kategori</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl shadow-sm">
                <Filter className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Ürün adı veya açıklama ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base border-gray-200 focus:border-orange-300 focus:ring-orange-200 rounded-lg"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-56 h-12 border-gray-200 focus:border-orange-300 focus:ring-orange-200 rounded-lg">
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                <SelectItem value="no-category">Kategorisiz Ürünler</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.customId || category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Availability Filter */}
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-full lg:w-56 h-12 border-gray-200 focus:border-orange-300 focus:ring-orange-200 rounded-lg">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Ürünler</SelectItem>
                <SelectItem value="available">Mevcut Ürünler</SelectItem>
                <SelectItem value="unavailable">Mevcut Olmayanlar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">Ürünler</CardTitle>
          <CardDescription className="text-base">
            Toplam <span className="font-semibold text-orange-600">{filteredProducts.length}</span> ürün bulundu
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-200">
                  <TableHead className="w-20 py-4 px-6 font-semibold text-gray-700">Görsel</TableHead>
                  <TableHead className="min-w-[120px] py-4 px-6 font-semibold text-gray-700">İsim</TableHead>
                  <TableHead className="min-w-[140px] py-4 px-6 font-semibold text-gray-700">Hazırlama Süresi</TableHead>
                  <TableHead className="min-w-[120px] py-4 px-6 font-semibold text-gray-700">Fiyat</TableHead>
                  <TableHead className="min-w-[120px] py-4 px-6 font-semibold text-gray-700">Kategori</TableHead>
                  <TableHead className="min-w-[150px] py-4 px-6 font-semibold text-gray-700">Malzemeler</TableHead>
                  <TableHead className="min-w-[120px] py-4 px-6 font-semibold text-gray-700">Opsiyonlar</TableHead>
                  <TableHead className="min-w-[150px] py-4 px-6 font-semibold text-gray-700">Açıklama</TableHead>
                  <TableHead className="min-w-[120px] py-4 px-6 font-semibold text-gray-700">Durum</TableHead>
                  <TableHead className="min-w-[80px] py-4 px-6 font-semibold text-gray-700">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-orange-50/50 transition-colors duration-150 border-b border-gray-100">
                  <TableCell className="py-4 px-6">
                    {product.imageUrl ? (
                      <div className="relative group">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-14 h-14 object-cover rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-200"
                          onError={(e) => {
                            e.currentTarget.src = '/images/products/default.jpg'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                        <Package className="w-7 h-7 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span className="font-semibold text-gray-900 text-base capitalize leading-tight">{product.name}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    {product.preparationTime ? (
                      <Badge variant="outline" className="text-sm px-3 py-1 bg-orange-50 border-orange-200 text-orange-700 font-medium rounded-lg">
                        {product.preparationTime} dk
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-400 font-medium">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through font-medium">
                          ₺{product.originalPrice.toFixed(2)}
                        </span>
                      )}
                      {editingPrice === product.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={priceInputValue}
                            onChange={(e) => setPriceInputValue(e.target.value)}
                            className="w-24 h-9 text-sm border-gray-200 focus:border-orange-300 focus:ring-orange-200 rounded-md"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handlePriceSave(product.id)
                              } else if (e.key === 'Escape') {
                                handlePriceCancel()
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePriceSave(product.id)}
                            className="h-9 px-3 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 rounded-md"
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handlePriceCancel}
                            className="h-9 px-3 bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 rounded-md"
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="font-bold text-green-600 cursor-pointer hover:text-green-700 text-lg transition-colors duration-150"
                          onClick={() => handlePriceEdit(product.id, product.price)}
                        >
                          ₺{product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex flex-wrap gap-2">
                      {product.categoryNames && product.categoryNames.length > 0 ? (
                        product.categoryNames.map((name, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-2 py-1 bg-blue-50 border-blue-200 text-blue-700 font-medium rounded-md capitalize">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs px-2 py-1 bg-gray-50 border-gray-200 text-gray-500 font-medium rounded-md">
                          Kategorisiz
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex flex-wrap gap-2 max-w-xs">
                      {product.ingredients && product.ingredients.length > 0 ? (
                        <>
                          {product.ingredients.slice(0, 3).map((ingredient, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-1 bg-green-50 border-green-200 text-green-700 font-medium rounded-md capitalize">
                              {ingredient.name}
                            </Badge>
                          ))}
                          {product.ingredients.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2 py-1 bg-gray-50 border-gray-200 text-gray-600 font-medium rounded-md">
                              +{product.ingredients.length - 3}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium">Malzeme yok</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex flex-wrap gap-2 max-w-xs">
                      {product.optionNames && product.optionNames.length > 0 ? (
                        <>
                          {product.optionNames.slice(0, 2).map((option, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-1 bg-purple-50 border-purple-200 text-purple-700 font-medium rounded-md capitalize">
                              {option}
                            </Badge>
                          ))}
                          {product.optionNames.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-1 bg-gray-50 border-gray-200 text-gray-600 font-medium rounded-md">
                              +{product.optionNames.length - 2}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium">Opsiyon yok</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span
                      className="text-sm text-gray-600 block max-w-xs leading-relaxed"
                      title={product.description || 'Açıklama yok'}
                    >
                      {product.description || 'Açıklama yok'}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={product.isAvailable}
                        onCheckedChange={() => handleToggleAvailability(product)}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/shop/menu/edit-product?id=${product.id}&panel=${new URLSearchParams(window.location.search).get('panel')}`)}
                        className="h-9 w-9 p-0 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors duration-150"
                        title="Ürünü düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="h-9 w-9 p-0 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-150"
                        title="Ürünü sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mb-6">
                <Package className="h-12 w-12 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {searchTerm || selectedCategory !== 'all' || availabilityFilter !== 'all'
                  ? 'Arama kriterlerinize uygun ürün bulunamadı'
                  : 'Henüz ürün eklenmemiş'
                }
              </h3>
              <p className="text-muted-foreground text-base mb-6 max-w-md mx-auto">
                {searchTerm || selectedCategory !== 'all' || availabilityFilter !== 'all'
                  ? 'Filtrelerinizi değiştirerek farklı ürünler arayabilirsiniz.'
                  : 'İlk ürününüzü ekleyerek menünüzü oluşturmaya başlayın.'
                }
              </p>
              {(!searchTerm && selectedCategory === 'all' && availabilityFilter === 'all') && (
                <Button
                  onClick={() => router.push('/shop/menu/add-product?panel=' + new URLSearchParams(window.location.search).get('panel'))}
                  className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-lg font-medium"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  İlk Ürünü Ekle
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}