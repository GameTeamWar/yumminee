'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  MapPin,
  Phone,
  CreditCard,
  Truck,
  Star,
  Filter,
  ChefHat,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { updateRestaurant } from '@/lib/firebase/db'

interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl?: string
  categoryId: string
  categoryName: string
  isAvailable: boolean
  preparationTime?: number
  categoryIds?: string[]
}

interface Category {
  id: string
  name: string
  description: string
  imageUrl?: string
  isActive: boolean
  sortOrder: number
  customId?: string
}

interface CartItem {
  product: Product
  quantity: number
  notes?: string
}

interface Restaurant {
  id: string
  name: string
  description: string
  address: string
  phone: string
  minimumOrderAmount: number
  deliveryFee: number
  deliveryTime: number
  isOpen: boolean
  tempCloseEndTime?: number
  tempCloseOption?: string
  openingHours?: any
}

export default function CustomerShopPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [orderForm, setOrderForm] = useState({
    deliveryType: 'delivery',
    paymentMethod: 'cash',
    notes: '',
    address: userProfile?.address || '',
    phone: userProfile?.phoneNumber || ''
  })

  const restaurantId = '17607296269'

  // Geçici kapanma süresini hesapla
  const remainingTime = useMemo(() => {
    if (!restaurant?.tempCloseEndTime) return 0
    const endTime = restaurant.tempCloseEndTime
    const now = Math.floor(Date.now() / 1000)
    const remaining = endTime - now
    return remaining > 0 ? remaining : 0
  }, [restaurant?.tempCloseEndTime])

  // Geri sayımı güncelle
  useEffect(() => {
    if (remainingTime > 0) {
      const interval = setInterval(() => {
        const currentRemaining = (() => {
          if (!restaurant?.tempCloseEndTime) return 0
          const endTime = restaurant.tempCloseEndTime
          const now = Math.floor(Date.now() / 1000)
          const remaining = endTime - now
          return remaining > 0 ? remaining : 0
        })()
        
        if (currentRemaining <= 1 && restaurant?.tempCloseEndTime) {
          updateRestaurant(restaurant.id, {
            tempCloseEndTime: null,
            tempCloseOption: null
          }).catch(console.error)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [remainingTime, restaurant?.id, restaurant?.tempCloseEndTime])

  // Süreyi formatla
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours} saat ${minutes} dk`
    } else if (minutes > 0) {
      return `${minutes} dk ${remainingSeconds} sn`
    } else {
      return `${remainingSeconds} sn`
    }
  }

  // Geçici kapanma durumu
  const isTempClosed = remainingTime > 0

  useEffect(() => {
    if (!restaurantId) return

    const loadRestaurant = async () => {
      try {
        const demoRestaurant: Restaurant = {
          id: restaurantId,
          name: 'Lezzet Durağı',
          description: 'En kaliteli malzemelerle hazırlanan ev yemekleri',
          address: 'Kadıköy, İstanbul',
          phone: '0216 123 45 67',
          minimumOrderAmount: 50,
          deliveryFee: 10,
          deliveryTime: 30,
          isOpen: true
        }
        setRestaurant(demoRestaurant)
      } catch (error) {
        console.error('Restaurant loading error:', error)
        toast.error('Restoran bilgileri yüklenirken hata oluştu')
      }
    }

    const categoriesQuery = query(
      collection(db, 'categories'),
      where('restaurantId', '==', restaurantId)
    )

    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const categoriesData: Category[] = []
      snapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() } as Category)
      })
      const processedCategories = categoriesData
        .filter(cat => cat.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(cat => ({
          ...cat,
          displayId: cat.customId || cat.id
        }))
      setCategories(processedCategories)
    })

    const productsQuery = query(
      collection(db, 'products'),
      where('restaurantId', '==', restaurantId)
    )

    const unsubscribeProducts = onSnapshot(productsQuery, async (snapshot) => {
      const productsData: Product[] = []
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product)
      })

      const activeCategoryIds = categories.map(cat => cat.customId || cat.id)
      const filteredProducts = productsData.filter(product =>
        product.isAvailable && (!product.categoryId || activeCategoryIds.includes(product.categoryId))
      )

      setProducts(filteredProducts)
      setLoading(false)
    })

    loadRestaurant()

    return () => {
      unsubscribeCategories()
      unsubscribeProducts()
    }
  }, [restaurantId])

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' ||
                           (!product.categoryId && selectedCategory === 'uncategorized') ||
                           (product.categoryId === selectedCategory) ||
                           (product.categoryIds && product.categoryIds.includes(selectedCategory))
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addToCart = (product: Product) => {
    if (isTempClosed) {
      toast.error('Restoran yoğunluk nedeniyle geçici olarak kapalı')
      return
    }

    const existingItem = cart.find(item => item.product.id === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
    toast.success(`${product.name} sepete eklendi`)
  }

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId))
    } else {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId))
    toast.success('Ürün sepetten çıkarıldı')
  }

  const getCartTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    const deliveryFee = orderForm.deliveryType === 'delivery' ? (restaurant?.deliveryFee || 0) : 0
    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee
    }
  }

  const handleOrderSubmit = async () => {
    if (isTempClosed) {
      toast.error('Restoran yoğunluk nedeniyle geçici olarak kapalı')
      return
    }

    if (!user || !restaurant) {
      toast.error('Sipariş verebilmek için giriş yapmanız gerekir')
      return
    }

    const { total } = getCartTotal()
    if (total < (restaurant.minimumOrderAmount || 0)) {
      toast.error(`Minimum sipariş tutarı ₺${restaurant.minimumOrderAmount} olmalıdır`)
      return
    }

    try {
      const orderData = {
        customerId: user.uid,
        customerName: userProfile?.displayName || user.email || 'Bilinmeyen Müşteri',
        customerPhone: orderForm.phone,
        customerAddress: orderForm.address,
        restaurantId: restaurant.id,
        items: cart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          notes: item.notes
        })),
        totalAmount: total,
        status: 'pending',
        paymentMethod: orderForm.paymentMethod,
        paymentStatus: 'pending',
        deliveryType: orderForm.deliveryType,
        notes: orderForm.notes,
        createdAt: new Date()
      }

      await addDoc(collection(db, 'orders'), orderData)

      toast.success('Siparişiniz başarıyla alındı!')
      setCart([])
      setIsOrderDialogOpen(false)
      setOrderForm({
        deliveryType: 'delivery',
        paymentMethod: 'cash',
        notes: '',
        address: userProfile?.address || '',
        phone: userProfile?.phoneNumber || ''
      })
    } catch (error) {
      console.error('Order submission error:', error)
      toast.error('Sipariş gönderilirken hata oluştu')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Restoran yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Restoran bulunamadı</p>
        </div>
      </div>
    )
  }

  const { subtotal, deliveryFee, total } = getCartTotal()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Restaurant Header */}
      <div className={`bg-white shadow-sm border-b ${isTempClosed ? 'opacity-80' : ''}`}>
        <div className="container mx-auto px-4 py-6">
          {/* Geçici Kapanma Uyarısı */}
          {isTempClosed && (
            <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-900 mb-1">
                    🔥 Yoğunluk Nedeniyle Geçici Kapandı
                  </h3>
                  <p className="text-sm text-orange-800 font-semibold mb-2">
                    Restoran şu anda çok yoğun olduğu için geçici olarak sipariş almayı durdurdu
                  </p>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-700" />
                    <p className="text-base font-bold text-orange-900">
                      {formatTime(remainingTime)} içinde tekrar açılacak
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
                {isTempClosed && (
                  <Badge className="bg-orange-600 text-white px-3 py-1 text-sm font-bold">
                    GEÇİCİ KAPALI
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">{restaurant.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {restaurant.address}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {restaurant.phone}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {restaurant.deliveryTime} dk
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Minimum Sipariş</div>
              <div className="text-lg font-bold text-green-600">₺{restaurant.minimumOrderAmount}</div>
              <div className="text-sm text-gray-500">Teslimat Ücreti</div>
              <div className="text-lg font-bold">₺{restaurant.deliveryFee}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={isTempClosed}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isTempClosed}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    <SelectItem value="uncategorized">Kategorisiz</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.customId || category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className="whitespace-nowrap"
                disabled={isTempClosed}
              >
                Tümü
              </Button>
              <Button
                variant={selectedCategory === 'uncategorized' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('uncategorized')}
                className="whitespace-nowrap"
                disabled={isTempClosed}
              >
                Kategorisiz
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === (category.customId || category.id) ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.customId || category.id)}
                  className="whitespace-nowrap"
                  disabled={isTempClosed}
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Products */}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredProducts.map((product) => (
                <Card key={product.id} className={`hover:shadow-md transition-shadow ${isTempClosed ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    {product.imageUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-40 object-cover"
                          style={{ filter: isTempClosed ? 'grayscale(100%) brightness(0.8)' : 'none' }}
                        />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                        {product.preparationTime && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <ChefHat className="h-3 w-3" />
                            {product.preparationTime} dk hazırlık
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-green-600">
                          ₺{product.price.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => addToCart(product)}
                      className="w-full"
                      disabled={isTempClosed}
                    >
                      {isTempClosed ? (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Geçici Kapalı
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Sepete Ekle
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Bu kategoride ürün bulunamadı</p>
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Sepetim ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Sepetiniz boş</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-3 p-2 border rounded">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.product.name}</h4>
                            <p className="text-sm text-green-600">₺{item.product.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                              disabled={isTempClosed}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                              disabled={isTempClosed}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-500 hover:text-red-700"
                            disabled={isTempClosed}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Ara Toplam:</span>
                        <span>₺{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Teslimat Ücreti:</span>
                        <span>₺{deliveryFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Toplam:</span>
                        <span>₺{total.toFixed(2)}</span>
                      </div>
                    </div>

                    {isTempClosed && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-orange-800">
                            Restoran geçici olarak kapalı. {formatTime(remainingTime)} sonra sipariş verebilirsiniz.
                          </p>
                        </div>
                      </div>
                    )}

                    <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full"
                          disabled={isTempClosed || total < (restaurant.minimumOrderAmount || 0)}
                        >
                          {isTempClosed ? 'Geçici Kapalı' : 'Sipariş Ver'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Sipariş Bilgileri</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="deliveryType">Teslimat Türü</Label>
                            <Select
                              value={orderForm.deliveryType}
                              onValueChange={(value) => setOrderForm({ ...orderForm, deliveryType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="delivery">Adrese Teslimat</SelectItem>
                                <SelectItem value="pickup">Gel Al</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {orderForm.deliveryType === 'delivery' && (
                            <div className="space-y-2">
                              <Label htmlFor="address">Teslimat Adresi</Label>
                              <Textarea
                                id="address"
                                value={orderForm.address}
                                onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                                placeholder="Teslimat adresinizi girin"
                                rows={3}
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="phone">Telefon Numarası</Label>
                            <Input
                              id="phone"
                              value={orderForm.phone}
                              onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                              placeholder="05XX XXX XX XX"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="paymentMethod">Ödeme Yöntemi</Label>
                            <Select
                              value={orderForm.paymentMethod}
                              onValueChange={(value) => setOrderForm({ ...orderForm, paymentMethod: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Nakit</SelectItem>
                                <SelectItem value="card">Kart</SelectItem>
                                <SelectItem value="online">Online Ödeme</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="notes">Sipariş Notu (İsteğe bağlı)</Label>
                            <Textarea
                              id="notes"
                              value={orderForm.notes}
                              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                              placeholder="Özel istekleriniz..."
                              rows={2}
                            />
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span>Ara Toplam:</span>
                              <span>₺{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Teslimat Ücreti:</span>
                              <span>₺{deliveryFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                              <span>Toplam:</span>
                              <span>₺{total.toFixed(2)}</span>
                            </div>
                          </div>

                          <Button
                            onClick={handleOrderSubmit}
                            className="w-full"
                            disabled={!user}
                          >
                            {!user ? 'Giriş Yapın' : 'Siparişi Onayla'}
                          </Button>

                          {!user && (
                            <p className="text-sm text-center text-muted-foreground">
                              Sipariş verebilmek için giriş yapmanız gerekir
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}