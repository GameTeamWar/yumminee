"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Star,
  Clock,
  MapPin,
  ShoppingCart,
  Plus,
  Minus,
  CreditCard
} from 'lucide-react';
import { getRestaurant, getRestaurantMenu, subscribeToUserAddresses, getRestaurantCategories } from '@/lib/firebase/db';
import { Shop, Product, CustomerAddress, UserAddress } from '@/types';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Basit kategori interface'i
interface SimpleCategory {
  id: string;
  name: string;
}
import { getRestaurantStatus, formatWorkingHours, formatAllWorkingHours } from '@/lib/utils/restaurantHours';
import { calculateDistanceInKm } from '@/lib/maps/map-utils';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { AddressSelectionModal } from '@/components/AddressSelectionModal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ProductDetailModal from '@/components/ProductDetailModal';
import { useCart } from '@/contexts/CartContext';

const Header = dynamic(() => import('@/components/Header'), {
  ssr: false
});

export default function RestaurantDetailPage() {
  const params = useParams();
  const restaurantId = params.id as string;
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState<Shop | null>(null);
  const [menu, setMenu] = useState<Product[]>([]);
  const [categories, setCategories] = useState<SimpleCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);

  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!restaurantId) return;

      try {
        setLoading(true);

        // Restoran bilgilerini al
        const restaurantData = await getRestaurant(restaurantId);
        if (!restaurantData) {
          toast.error('Restoran bulunamadı');
          return;
        }
        setRestaurant(restaurantData);

        // Menü bilgilerini al - gerçek zamanlı
        const menuQuery = query(
          collection(db, 'products'),
          where('restaurantId', '==', restaurantId),
          where('isActive', '==', true),
          orderBy('name', 'asc')
        );

        const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
          const menuData: Product[] = [];
          snapshot.forEach((doc) => {
            menuData.push({ id: doc.id, ...doc.data() } as Product);
          });
          setMenu(menuData);
        });

        // Kategorileri gerçek zamanlı dinle - ANA KATEGORİLER KOLEKSİYONUNDAN
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('restaurantId', '==', restaurantId),
          where('isActive', '==', true),
          orderBy('name', 'asc')
        );

        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
          const categoriesData: SimpleCategory[] = [];
          snapshot.forEach((doc) => {
            categoriesData.push({ id: doc.id, name: doc.data().name });
          });
          setCategories(categoriesData);
        });

        return () => {
          unsubscribeCategories();
          unsubscribeMenu();
        };

      } catch (error) {
        console.error('Restoran verileri yüklenirken hata:', error);
        toast.error('Restoran bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurantData();
  }, [restaurantId]);

  // Konum bilgisini yükle ve adresleri dinle
  useEffect(() => {
    let unsubscribeAddresses: (() => void) | undefined;

    const setupAddressSubscription = async () => {
      if (user) {
        try {
          // Adresleri gerçek zamanlı dinle
          unsubscribeAddresses = await subscribeToUserAddresses(user.uid, (addresses: CustomerAddress[]) => {
            // Adresler değiştiğinde, seçili adres hala mevcut mu kontrol et
            if (selectedAddress) {
              const addressStillExists = addresses.find(addr => addr.id === selectedAddress.id);
              if (!addressStillExists) {
                // Seçili adres silinmiş, temizle
                setSelectedAddress(null);
                setUserLocation(null);
                localStorage.removeItem('selectedAddress');
                toast.info('Seçili adres silindi');
              }
            }
          });
        } catch (error) {
          console.error('Adres dinleme kurulurken hata:', error);
        }
      }

      // İlk yükleme için localStorage'dan adres bilgisini al
      const savedAddress = localStorage.getItem('selectedAddress');
      if (savedAddress) {
        try {
          const address = JSON.parse(savedAddress);
          setSelectedAddress(address);
          setUserLocation({ lat: address.geoPoint.latitude, lng: address.geoPoint.longitude });
        } catch (error) {
          console.error('Adres bilgisi yüklenirken hata:', error);
          // Adres bilgisi bozuksa modal aç
          if (user) {
            setShowAddressModal(true);
          }
        }
      } else {
        // Adres bilgisi yoksa ve kullanıcı giriş yaptıysa modal aç
        if (user) {
          setShowAddressModal(true);
        }
      }
    };

    setupAddressSubscription();

    // Cleanup function
    return () => {
      if (unsubscribeAddresses) {
        unsubscribeAddresses();
      }
    };
  }, [user]);

  const filteredMenu = selectedCategory === ''
    ? menu
    : menu.filter(item => item.categoryIds && item.categoryIds.includes(selectedCategory));

  // Sadece ürünleri olan kategorileri filtrele
  const categoriesWithProducts = categories.filter(category =>
    menu.some(product => product.categoryIds && product.categoryIds.includes(category.id))
  );

  // Ürünleri kategoriye göre grupla
  const productsByCategory = categoriesWithProducts.reduce((acc: Record<string, { category: SimpleCategory; products: Product[] }>, category: SimpleCategory) => {
    const categoryProducts = menu.filter(product =>
      product.categoryIds && product.categoryIds.includes(category.id)
    );
    if (categoryProducts.length > 0) {
      acc[category.id] = {
        category,
        products: categoryProducts
      };
    }
    return acc;
  }, {});

  // Scroll to category function
  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId]--;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const getTotalItems = (): number => {
    return Object.values(cart).reduce((sum, qty) => (sum as number) + (qty as number), 0);
  };

  // Mesafe hesapla
  const calculateDistance = () => {
    // Client-side kontrolü
    if (typeof window === 'undefined') return null;

    if (!userLocation || !restaurant?.location) return null;

    try {
      const distance = calculateDistanceInKm(
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: restaurant.location.latitude, lng: restaurant.location.longitude }
      );
      return distance;
    } catch (error) {
      console.error('Mesafe hesaplama hatası:', error);
      return null;
    }
  };

  // Adres seçildiğinde
  const handleAddressSelected = (address: CustomerAddress) => {
    setSelectedAddress(address);
    setUserLocation({ lat: address.geoPoint.latitude, lng: address.geoPoint.longitude });
    localStorage.setItem('selectedAddress', JSON.stringify(address));
    setShowAddressModal(false);
    toast.success(`"${address.addressName}" adresi seçildi`);
  };

  // Ürün tıklandığında
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  // Adres seçimi için modal aç
  const handleAddressSelectClick = () => {
    setShowAddressModal(true);
  };

  // Adres silindiğinde
  const handleAddressDeleted = () => {
    setSelectedAddress(null);
    setUserLocation(null);
    localStorage.removeItem('selectedAddress');
    toast.info('Seçili adres silindi');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Restoran yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restoran Bulunamadı</h1>
          <p className="text-gray-600 mb-4">Aradığınız restoran mevcut değil.</p>
        </div>
      </div>
    );
  }

  const { isOpen, statusText } = getRestaurantStatus(restaurant);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Ana Header */}
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <Header />
      </Suspense>

      {/* Adres seçilmemişse uyarı banner */}
      {!selectedAddress && (
        <div className="bg-yellow-50 py-3 border-b border-yellow-200">
          <div className="container mx-auto flex gap-2 items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" className="text-yellow-600 text-16">
              <path fill="currentColor" fillRule="evenodd" d="M14.03 22.735a31 31 0 0 0 3.196-2.922C20.198 16.676 22 13.372 22 10c0-5.523-4.477-10-10-10S2 4.477 2 10c0 3.372 1.802 6.676 4.774 9.813a31 31 0 0 0 4.254 3.726c.195.141.337.24.417.293a1 1 0 0 0 1.11 0c.08-.054.222-.152.417-.293.32-.23.675-.5 1.057-.804M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8" clipRule="evenodd"></path>
            </svg>
            <span className="text-sm">Sipariş verebilmek için lütfen <button type="button" className="text-orange-600 underline hover:no-underline font-medium" onClick={() => setShowAddressModal(true)}>adres ekleyin.</button></span>
          </div>
        </div>
      )}

      {/* Hero Header - Restoran Bilgileri */}
      <div className="relative">
        {/* Büyük Cover Image */}
        {(restaurant.coverImage || restaurant.banner) && (
          <div className="w-full h-64 md:h-80 lg:h-96 relative overflow-hidden">
            <img
              src={restaurant.coverImage || restaurant.banner}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          </div>
        )}

        {/* Restoran Bilgileri Overlay */}
        <div className="relative container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Restoran Görseli - Daha Büyük */}
            <div className="flex-shrink-0">
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden bg-white shadow-xl border-4 border-white relative z-10">
                {restaurant.image ? (
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Görsel yüklenemezse varsayılan görsele geç
                      (e.target as HTMLImageElement).src = '/images/restaurants/default.jpg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-5xl md:text-6xl">
                      {restaurant.name[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Restoran Bilgileri - Daha Detaylı */}
            <div className="flex-1 text-center md:text-left">
              {/* Başlık ve Aksiyon Butonları */}
              <div className="flex flex-wrap items-center justify-between mb-3">
                <h1 className="text-3xl md:text-4xl font-bold text-white md:text-gray-900">
                  {restaurant.name}
                </h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 py-2 h-auto border-white text-white hover:bg-white hover:text-gray-900 md:border-gray-300 md:text-gray-700 md:hover:bg-gray-50"
                    title="Bildir"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M23.646 18.046 14.851 2.63c-.868-1.54-2.93-2.091-4.45-1.21-.543.33-.977.77-1.194 1.21L.413 18.046c-.868 1.54-.325 3.633 1.195 4.514a3.03 3.03 0 0 0 1.628.44h17.477c1.846 0 3.257-1.541 3.257-3.303.109-.66-.108-1.211-.326-1.651m-11.616.55c-.651 0-1.086-.44-1.086-1.101 0-.66.435-1.101 1.086-1.101s1.086.44 1.086 1.101c0 .66-.435 1.101-1.086 1.101m1.086-5.505c0 .66-.435 1.101-1.086 1.101s-1.086-.44-1.086-1.101V8.687c0-.66.435-1.101 1.086-1.101s1.086.44 1.086 1.101z"/>
                    </svg>
                    <span className="ml-1 hidden md:inline">Bildir</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 py-2 h-auto border-white text-white hover:bg-white hover:text-gray-900 md:border-gray-300 md:text-gray-700 md:hover:bg-gray-50"
                    title="Hakkında"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path fill="currentColor" fillRule="evenodd" d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0m-.003 6a1 1 0 1 1 .005 2 1 1 0 0 1-.005-2M13 10a1 1 0 1 0-2 0v7a1 1 0 1 0 2 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="ml-1 hidden md:inline">Hakkında</span>
                  </Button>
                </div>
              </div>

              {/* Mesafe ve Restoran Türü Bilgileri */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-white md:text-gray-600">
                <span>📍 {selectedAddress ? `${calculateDistance()} km` : 'Adres seçmediniz'}</span>
                {restaurant.cuisine && restaurant.cuisine.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{restaurant.cuisine.join(', ')}</span>
                  </>
                )}
              </div>

              {/* Açıklama kısmı kaldırıldı - restaurant.description */}
              {/* <p className="text-white md:text-gray-700 text-lg mb-6 max-w-2xl">
                {restaurant.description}
              </p> */}

              {/* Ana Bilgiler */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                <div className="bg-green-500 text-white px-3 py-2 rounded-lg flex items-center gap-2">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-semibold">{restaurant.rating}</span>
                  <span className="text-sm">({restaurant.reviewCount || 0})</span>
                </div>

                <Button
                  variant="outline"
                  className="px-4 py-2 h-auto border-white text-white hover:bg-white hover:text-gray-900 md:border-orange-500 md:text-orange-600 md:hover:bg-orange-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path fill="#F27A1A" d="M14.4 3.352c.933.34 1.6 1.217 1.6 2.248v5.6c0 1.326-1.1 2.4-2.456 2.4v1.6a.8.8 0 0 1-.45.712.833.833 0 0 1-.86-.072L9.181 13.6H5.458L7.6 12h4c1.49 0 2.8-1.509 2.8-3zM10.4 0a2.4 2.4 0 0 1 2.4 2.4V8a2.4 2.4 0 0 1-2.4 2.4H6.664L4.96 11.68l-1.28.96A.8.8 0 0 1 2.4 12v-1.6A2.4 2.4 0 0 1 0 8V2.4A2.4 2.4 0 0 1 2.4 0z"/>
                  </svg>
                  <span className="ml-2">Yorumlar ({restaurant.reviewCount || 0})</span>
                </Button>
              </div>

              {/* Detaylı Bilgiler */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Çalışma Saatleri */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-white md:text-gray-600">Çalışma Saatleri</span>
                  <button 
                    onClick={() => setShowHoursModal(true)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
                  >
                    <Clock className="h-4 w-4 text-white md:text-gray-500" />
                    <div className="flex flex-col">
                      <span className="font-medium text-white md:text-gray-900">
                        {restaurant.openingHours ? formatWorkingHours(restaurant.openingHours) : '08:00-22:00'}
                      </span>
                      {/* Açık/Kapalı Durumu */}
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-xs font-medium ${isOpen ? 'text-green-400 md:text-green-600' : 'text-red-400 md:text-red-600'}`}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Minimum Tutar */}
                {restaurant.minimumOrderAmount > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-white md:text-gray-600">Min. Tutar</span>
                    <span className="font-medium text-white md:text-gray-900">₺{restaurant.minimumOrderAmount}</span>
                  </div>
                )}

                {/* Teslimat Süresi */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-white md:text-gray-600">Teslimat</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white md:text-gray-900">{restaurant.deliveryTime} dk</span>
                  </div>
                </div>

                {/* Ödeme Yöntemleri */}
                {restaurant.paymentMethods && restaurant.paymentMethods.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-white md:text-gray-600">Ödeme</span>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-white md:text-gray-500" />
                      <span className="font-medium text-white md:text-gray-900">
                        {restaurant.paymentMethods.join(', ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sol Sidebar - Kategoriler */}
          <div className="w-72 flex-shrink-0">
            <Card className="sticky top-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900">Kategoriler</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2 p-6">
                    {categoriesWithProducts.map((category: SimpleCategory) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'ghost'}
                        className="w-full justify-start h-12 text-left font-medium"
                        onClick={() => {
                          setSelectedCategory(category.id);
                          scrollToCategory(category.id);
                        }}
                      >
                        <span className="mr-2">📋</span>
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sağ İçerik - Menü */}
          <div className="flex-1">
            {/* Tüm Ürünler Görünümü */}
            {selectedCategory === '' && (
              <>
                {/* Tüm ürünleri kategorilere göre grupla */}
                {Object.values(productsByCategory).map(({ category, products }) => (
                  <div key={category.id} id={`category-${category.id}`} className="mb-12">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                      {category.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-md:divide-y divide-neutral-lighter md:gap-4">
                      {products.map((product) => (
                        <div key={product.id} role="button" tabIndex={0} className="hover:cursor-pointer hover:shadow-sticky flex gap-2 p-3 bg-white md:rounded-12 min-h-[108px] items-stretch" onClick={() => handleProductClick(product)}>
                          <img
                            alt="menu"
                            loading="lazy"
                            width="110"
                            height="110"
                            decoding="async"
                            className="rounded-8 object-cover h-[110px]"
                            src={product.imageUrl || '/images/products/default.jpg'}
                            onError={(e) => {
                              // Görsel yüklenemezse varsayılan ürürn görseline geç
                              (e.target as HTMLImageElement).src = '/images/products/default.jpg';
                            }}
                            style={{color: 'transparent'}}
                          />
                          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                            <div className="flex flex-col gap-1">
                              <h6 className="title-3-medium truncate line-clamp-1">{product.name}</h6>
                              <p className="body-3-regular text-neutral-dark break-words line-clamp-2">{product.description || ''}</p>
                              {/* Rating display - placeholder for now */}
                              <div className="flex items-center gap-1 mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 16 16" className="text-16 text-success">
                                  <path fill="currentColor" d="M1.334 6h2v8h-2a.667.667 0 0 1-.667-.667V6.667c0-.369.298-.667.667-.667m3.528-.862L9.13.871a.33.33 0 0 1 .436-.03l.568.425a1 1 0 0 1 .37 1.047l-.77 3.02H14c.737 0 1.334.597 1.334 1.334V8.07c0 .174-.034.346-.1.507l-2.064 5.01a.67.67 0 0 1-.616.413h-7.22a.667.667 0 0 1-.667-.667V5.61c0-.176.07-.346.195-.471"></path>
                                </svg>
                                <span className="body-3-medium text-success">%76 Beğenildi</span>
                                <span className="body-3-medium text-neutral-dark">(25 Değerlendirme)</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 flex-1 justify-end h-full">
                              <div className="flex justify-between items-end gap-1">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="title-3-semibold text-primary">{product.price} TL</span>
                                  </div>
                                </div>
                                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill border disabled:cursor-not-allowed disabled:!text-neutral-light disabled:bg-neutral-lightest disabled:border-neutral-lightest hover:text-white text-primary border-primary bg-transparent hover:bg-primary-highlight hover:border-primary-highlight px-2 h-6 min-w-6 title-4-bold outline-none no-underline">
                                  Sepete Ekle
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Tek Kategori Görünümü */}
            {selectedCategory !== '' && (
              <>
                {/* Üst Kategori Başlığı */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {categoriesWithProducts.find(cat => cat.id === selectedCategory)?.name || 'Kategori'}
                  </h2>
                  <p className="text-gray-600 text-lg">
                    {filteredMenu.length} ürün bulundu
                  </p>
                </div>

                {/* Menü Öğeleri - Yeni Tasarım */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-md:divide-y divide-neutral-lighter md:gap-4">
                  {filteredMenu.map((product) => (
                    <div key={product.id} role="button" tabIndex={0} className="hover:cursor-pointer hover:shadow-sticky flex gap-2 p-3 bg-white md:rounded-12 min-h-[108px] items-stretch" onClick={() => handleProductClick(product)}>
                      <img
                        alt="menu"
                        loading="lazy"
                        width="110"
                        height="110"
                        decoding="async"
                        className="rounded-8 object-cover h-[110px]"
                        src={product.imageUrl || '/placeholder-food.jpg'}
                        style={{color: 'transparent'}}
                      />
                      <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                        <div className="flex flex-col gap-1">
                          <h6 className="title-3-medium truncate line-clamp-1">{product.name}</h6>
                          <p className="body-3-regular text-neutral-dark break-words line-clamp-2">{product.description || ''}</p>
                          {/* Rating display - placeholder for now */}
                          <div className="flex items-center gap-1 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 16 16" className="text-16 text-success">
                              <path fill="currentColor" d="M1.334 6h2v8h-2a.667.667 0 0 1-.667-.667V6.667c0-.369.298-.667.667-.667m3.528-.862L9.13.871a.33.33 0 0 1 .436-.03l.568.425a1 1 0 0 1 .37 1.047l-.77 3.02H14c.737 0 1.334.597 1.334 1.334V8.07c0 .174-.034.346-.1.507l-2.064 5.01a.67.67 0 0 1-.616.413h-7.22a.667.667 0 0 1-.667-.667V5.61c0-.176.07-.346.195-.471"></path>
                            </svg>
                            <span className="body-3-medium text-success">%76 Beğenildi</span>
                            <span className="body-3-medium text-neutral-dark">(25 Değerlendirme)</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-1 justify-end h-full">
                          <div className="flex justify-between items-end gap-1">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <span className="title-3-semibold text-primary">{product.price} TL</span>
                              </div>
                            </div>
                            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill border disabled:cursor-not-allowed disabled:!text-neutral-light disabled:bg-neutral-lightest disabled:border-neutral-lightest hover:text-white text-primary border-primary bg-transparent hover:bg-primary-highlight hover:border-primary-highlight px-2 h-6 min-w-6 title-4-bold outline-none no-underline">
                              Sepete Ekle
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {filteredMenu.length === 0 && selectedCategory !== '' && (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Bu kategoride ürün bulunmuyor
                </h3>
                <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
                  Başka bir kategori seçmeyi deneyin veya daha sonra tekrar kontrol edin.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSelectedCategory('')}
                  className="px-6 py-3"
                >
                  Tüm Ürünleri Göster
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sabit Sepet Butonu */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-8 right-8 z-50">
          <Button
            size="lg"
            className="shadow-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 h-auto rounded-2xl border-4 border-white"
          >
            <ShoppingCart className="h-6 w-6 mr-3" />
            <span className="text-lg">Sepet ({getTotalItems()})</span>
          </Button>
        </div>
      )}

      {/* Ürün Detay Modal */}
      <ProductDetailModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        product={selectedProduct}
        restaurant={restaurant}
        selectedAddress={selectedAddress as CustomerAddress}
        onAddressSelect={handleAddressSelectClick}
      />

      {/* Çalışma Saatleri Modal */}
      <Dialog open={showHoursModal} onOpenChange={setShowHoursModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Çalışma Saatleri
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {restaurant?.openingHours ? (
              <div className="space-y-2">
                {formatAllWorkingHours(restaurant.openingHours).split('\n').map((line, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="font-medium text-gray-900">{line.split(': ')[0]}</span>
                    <span className={`text-sm ${line.includes('Kapalı') ? 'text-red-600' : 'text-green-600'}`}>
                      {line.split(': ')[1]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Çalışma saatleri bilgisi bulunmuyor</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Adres Seçimi Modal */}
      <AddressSelectionModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onAddressSelected={handleAddressSelected}
        currentLocation={userLocation || undefined}
        selectedAddress={selectedAddress}
        onAddressDeleted={handleAddressDeleted}
      />
    </div>
  );
}