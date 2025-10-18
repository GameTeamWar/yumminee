'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, where, updateDoc, deleteDoc, doc } from 'firebase/firestore'
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
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Package,
  DollarSign,
  MoreHorizontal,
  Filter,
  Edit
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl?: string
  categoryIds?: string[]
  categoryNames?: string[]
  isAvailable: boolean
  preparationTime?: number
  allergens?: string[]
  options?: string[]
  optionNames?: string[]
  restaurantId: string
  customId: string // 11-digit unique identifier
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
          collection(db, 'restaurants', restaurantId, 'categories'),
          orderBy('name', 'asc')
        )

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

  const getAvailabilityBadge = (isAvailable: boolean) => {
    return (
      <Badge variant={isAvailable ? "default" : "secondary"} className={isAvailable ? "bg-green-100 text-green-800" : ""}>
        {isAvailable ? 'Mevcut' : 'Mevcut Değil'}
      </Badge>
    )
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="ml-6">
          <h1 className="text-3xl font-bold">Ürün Yönetimi</h1>
          <p className="text-muted-foreground">Menünüzdeki ürünleri yönetin</p>
        </div>
        <Button onClick={() => router.push('/shop/menu/add-product')}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Ürün
        </Button>

      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Ürün adı veya açıklama ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
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
      <Card>
        <CardHeader>
          <CardTitle>Ürünler</CardTitle>
          <CardDescription>
            Toplam {filteredProducts.length} ürün bulundu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Görsel</TableHead>
                  <TableHead className="min-w-[200px]">İsim</TableHead>
                  <TableHead className="w-24">Fiyat</TableHead>
                  <TableHead className="min-w-[120px]">Kategori</TableHead>
                  <TableHead className="min-w-[200px]">Malzemeler</TableHead>
                  <TableHead className="min-w-[120px]">Opsiyonlar</TableHead>
                  <TableHead className="w-20">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = '/images/products/default.jpg'
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <span className="font-medium text-sm">{product.name}</span>
                      <div className="flex items-center gap-1">
                        {getAvailabilityBadge(product.isAvailable)}
                        {product.preparationTime && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {product.preparationTime} dk
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-600">
                      ₺{product.price.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {product.categoryNames && product.categoryNames.length > 0 ? (
                        product.categoryNames.map((name, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          Kategorisiz
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      className="text-sm text-gray-600 block max-w-xs truncate" 
                      title={product.description || 'Malzeme bilgisi yok'}
                    >
                      {product.description || 'Malzeme bilgisi yok'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {product.optionNames && product.optionNames.length > 0 ? (
                        <>
                          {product.optionNames.slice(0, 2).map((option, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                              {option}
                            </Badge>
                          ))}
                          {product.optionNames.length > 2 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              +{product.optionNames.length - 2}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">Opsiyon yok</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/shop/menu/edit-product?id=${product.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleAvailability(product)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {product.isAvailable ? 'Gizle' : 'Göster'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || selectedCategory !== 'all' || availabilityFilter !== 'all'
                  ? 'Arama kriterlerinize uygun ürün bulunamadı'
                  : 'Henüz ürün eklenmemiş'
                }
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' || availabilityFilter !== 'all'
                  ? 'Filtrelerinizi değiştirerek farklı ürünler arayabilirsiniz.'
                  : 'İlk ürününüzü ekleyerek menünüzü oluşturmaya başlayın.'
                }
              </p>
              {(!searchTerm && selectedCategory === 'all' && availabilityFilter === 'all') && (
                <Button onClick={() => router.push('/shop/menu/add-product')}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Ürünü Ekle
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-muted-foreground">Toplam Ürün</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{products.filter(p => p.isAvailable).length}</p>
                <p className="text-sm text-muted-foreground">Aktif Ürün</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  ₺{(products.reduce((sum, p) => sum + p.price, 0) / Math.max(products.length, 1)).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Ortalama Fiyat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Filter className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Aktif Kategori</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}