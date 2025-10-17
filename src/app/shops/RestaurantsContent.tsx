'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import RestaurantCard from '@/components/RestaurantCard';
import { Restaurant } from '@/types';
import { subscribeToAllRestaurants } from '@/lib/firebase/db';
import { Loader2, SortAsc, ChefHat, Clock, MapPin, Star, CreditCard, Gift, Award, Zap } from 'lucide-react';
import { getRestaurantStatus } from '@/lib/utils/restaurantHours';

export default function RestaurantsContent() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtreleme ve sıralama state'leri
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('recommended');
  const [minRating, setMinRating] = useState<string>('all');
  const [deliveryTime, setDeliveryTime] = useState<string>('all');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('all');
  const [distance, setDistance] = useState<string>('all');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [popularFilters, setPopularFilters] = useState<string[]>([]);
  const [showMoreCuisines, setShowMoreCuisines] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToAllRestaurants((fetchedRestaurants) => {
      setRestaurants(fetchedRestaurants);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Kategorilere göre restoranları filtrele ve sırala
  const getFilteredAndSortedRestaurants = () => {
    let filtered = restaurants;

    // Kategori filtresi
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(restaurant => 
        restaurant.categories?.some(cat => 
          selectedCategories.some(selectedCat => 
            cat.toLowerCase().includes(selectedCat.toLowerCase())
          )
        ) || 
        restaurant.cuisine?.some(cuisine => 
          selectedCategories.some(selectedCat => 
            cuisine.toLowerCase().includes(selectedCat.toLowerCase())
          )
        )
      );
    }

    // Rating filtresi
    if (minRating !== 'all') {
      const minRatingValue = parseFloat(minRating);
      filtered = filtered.filter(restaurant => restaurant.rating >= minRatingValue);
    }

    // Teslimat süresi filtresi
    if (deliveryTime !== 'all') {
      const maxTime = parseInt(deliveryTime);
      filtered = filtered.filter(restaurant => restaurant.deliveryTime <= maxTime);
    }

    // Minimum sipariş tutarı filtresi
    if (minOrderAmount !== 'all') {
      const maxAmount = parseInt(minOrderAmount);
      filtered = filtered.filter(restaurant => restaurant.minimumOrderAmount <= maxAmount);
    }

    // Mesafe filtresi
    if (distance !== 'all') {
      const maxDistance = parseFloat(distance);
      filtered = filtered.filter(restaurant => restaurant.serviceRadius <= maxDistance);
    }

    // Ödeme yöntemi filtresi
    if (paymentMethods.length > 0) {
      filtered = filtered.filter(restaurant => 
        restaurant.paymentMethods?.some(method => 
          paymentMethods.includes(method)
        )
      );
    }

    // Popüler filtreler
    if (popularFilters.includes('4-star-plus')) {
      filtered = filtered.filter(restaurant => restaurant.rating >= 4);
    }
    if (popularFilters.includes('open-only')) {
      filtered = filtered.filter(restaurant => getRestaurantStatus(restaurant).isOpen);
    }
    if (popularFilters.includes('loyalty-discount')) {
      filtered = filtered.filter(restaurant => restaurant.hasLoyaltyDiscount);
    }
    if (popularFilters.includes('neighborhood-star')) {
      filtered = filtered.filter(restaurant => restaurant.isNeighborhoodStar);
    }
    if (popularFilters.includes('go-delivery')) {
      filtered = filtered.filter(restaurant => restaurant.usesYummineDelivery);
    }

    // Sıralama
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recommended':
          return b.rating - a.rating; // Önerilen: yüksek puanlılar önce
        case 'rating':
          return b.rating - a.rating;
        case 'deliveryTime':
          return a.deliveryTime - b.deliveryTime;
        case 'minimumOrder':
          return a.minimumOrderAmount - b.minimumOrderAmount;
        case 'name':
          return a.name.localeCompare(b.name, 'tr');
        case 'distance':
          return a.serviceRadius - b.serviceRadius;
        case 'reviewCount':
          return b.reviewCount - a.reviewCount;
        default:
          return 0;
      }
    });

    return sorted;
  };

  // Kategori toggle fonksiyonu
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSelectedCategories([]);
    setSortBy('recommended');
    setMinRating('all');
    setDeliveryTime('all');
    setMinOrderAmount('all');
    setDistance('all');
    setPaymentMethods([]);
    setPopularFilters([]);
  };

  // Kategorilere göre restoranları filtrele
  const getRestaurantsByCategory = (category: string) => {
    if (category === 'all') return getFilteredAndSortedRestaurants();
    return getFilteredAndSortedRestaurants().filter(restaurant => 
      restaurant.categories?.some(cat => 
        cat.toLowerCase().includes(category.toLowerCase())
      ) || 
      restaurant.cuisine?.some(cuisine => 
        cuisine.toLowerCase().includes(category.toLowerCase())
      )
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Restoranlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Başlık */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Restoranlar</h1>
      </div>

      <div className="flex gap-8">
        {/* Sol Sidebar - Filtreler */}
        <div className="w-80 space-y-6 max-h-[calc(100vh-171px)] overflow-auto overscroll-contain">
          {/* Sırala Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SortAsc className="h-5 w-5" />
                Sırala
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={sortBy} onValueChange={setSortBy}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recommended" id="recommended" />
                  <Label htmlFor="recommended">Önerilen</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="name" id="name" />
                  <Label htmlFor="name">Alfabetik</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rating" id="rating" />
                  <Label htmlFor="rating">Puana Göre</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="distance" id="distance" />
                  <Label htmlFor="distance">Yakınlığa Göre</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reviewCount" id="reviewCount" />
                  <Label htmlFor="reviewCount">Değerlendirme Sayısına Göre</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Mutfaklar Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Mutfaklar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="cuisine-all"
                  checked={selectedCategories.length === 0}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedCategories([]);
                  }}
                />
                <Label htmlFor="cuisine-all" className="cursor-pointer">Tümü</Label>
              </div>
              
              {['Burger', 'Döner', 'Pizza', 'Sokak Lezzetleri', 'Çiğ Köfte'].map(cuisine => (
                <div key={cuisine} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`cuisine-${cuisine}`}
                    checked={selectedCategories.includes(cuisine)}
                    onCheckedChange={() => toggleCategory(cuisine)}
                  />
                  <Label htmlFor={`cuisine-${cuisine}`} className="cursor-pointer">{cuisine}</Label>
                </div>
              ))}
              
              {!showMoreCuisines && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowMoreCuisines(true)}
                  className="w-full justify-start p-0 h-auto text-primary hover:text-primary"
                >
                  Daha fazla göster
                </Button>
              )}
              
              {showMoreCuisines && (
                <>
                  {['Fast Food', 'Kebap', 'Türk Mutfağı', 'İtalyan', 'Japon'].map(cuisine => (
                    <div key={cuisine} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`cuisine-${cuisine}`}
                        checked={selectedCategories.includes(cuisine)}
                        onCheckedChange={() => toggleCategory(cuisine)}
                      />
                      <Label htmlFor={`cuisine-${cuisine}`} className="cursor-pointer">{cuisine}</Label>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Popüler Filtreler Kartı */}
          <Card>
            <CardHeader>
              <CardTitle>Popüler Filtreler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="loyalty-discount"
                  checked={popularFilters.includes('loyalty-discount')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPopularFilters(prev => [...prev, 'loyalty-discount']);
                    } else {
                      setPopularFilters(prev => prev.filter(f => f !== 'loyalty-discount'));
                    }
                  }}
                />
                <Label htmlFor="loyalty-discount" className="cursor-pointer flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Kampanyalı Restoranları
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="neighborhood-star"
                  checked={popularFilters.includes('neighborhood-star')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPopularFilters(prev => [...prev, 'neighborhood-star']);
                    } else {
                      setPopularFilters(prev => prev.filter(f => f !== 'neighborhood-star'));
                    }
                  }}
                />
                <Label htmlFor="neighborhood-star" className="cursor-pointer flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Yıldızı Yüksek Restoranlar
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="4-star-plus"
                  checked={popularFilters.includes('4-star-plus')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPopularFilters(prev => [...prev, '4-star-plus']);
                    } else {
                      setPopularFilters(prev => prev.filter(f => f !== '4-star-plus'));
                    }
                  }}
                />
                <Label htmlFor="4-star-plus" className="cursor-pointer flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  4 Puan ve Üzeri
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="go-delivery"
                  checked={popularFilters.includes('go-delivery')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPopularFilters(prev => [...prev, 'go-delivery']);
                    } else {
                      setPopularFilters(prev => prev.filter(f => f !== 'go-delivery'));
                    }
                  }}
                />
                <Label htmlFor="go-delivery" className="cursor-pointer flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Yummine ile Teslimat
                </Label>
              </div>

            

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="open-only"
                  checked={popularFilters.includes('open-only')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPopularFilters(prev => [...prev, 'open-only']);
                    } else {
                      setPopularFilters(prev => prev.filter(f => f !== 'open-only'));
                    }
                  }}
                />
                <Label htmlFor="open-only" className="cursor-pointer flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Açık Restoranlar
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Puan Ortalaması Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Puan Ortalaması
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={minRating} onValueChange={setMinRating}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="rating-all" />
                  <Label htmlFor="rating-all">Tümü</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4.5" id="rating-4.5" />
                  <Label htmlFor="rating-4.5">4.5 ve Üzeri</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="rating-4" />
                  <Label htmlFor="rating-4">4.0 ve Üzeri</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Ödeme Yöntemi Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ödeme Yöntemi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="payment-all"
                  checked={paymentMethods.length === 0}
                  onCheckedChange={(checked) => {
                    if (checked) setPaymentMethods([]);
                  }}
                />
                <Label htmlFor="payment-all" className="cursor-pointer">Tümü</Label>
              </div>
              
              {['Banka & Kredi Kartı', 'Multinet Online', 'Pluxee (Sodexo) Online', 'Edenred Ticket Restaurant Online', 'Setcard Online'].map(method => (
                <div key={method} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`payment-${method}`}
                    checked={paymentMethods.includes(method)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPaymentMethods(prev => [...prev, method]);
                      } else {
                        setPaymentMethods(prev => prev.filter(m => m !== method));
                      }
                    }}
                  />
                  <Label htmlFor={`payment-${method}`} className="cursor-pointer">{method}</Label>
                </div>
              ))}
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="payment-cash"
                  checked={paymentMethods.includes('Kapıda Ödeme')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPaymentMethods(prev => [...prev, 'Kapıda Ödeme']);
                    } else {
                      setPaymentMethods(prev => prev.filter(m => m !== 'Kapıda Ödeme'));
                    }
                  }}
                />
                <Label htmlFor="payment-cash" className="cursor-pointer">Kapıda Ödeme</Label>
              </div>
            </CardContent>
          </Card>

          {/* Minimum Sepet Tutarı Kartı */}
          <Card>
            <CardHeader>
              <CardTitle>Minimum Sepet Tutarı</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={minOrderAmount} onValueChange={setMinOrderAmount}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="order-all" />
                  <Label htmlFor="order-all">Tümü</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="200" id="order-200" />
                  <Label htmlFor="order-200">200 TL ve altı</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="300" id="order-300" />
                  <Label htmlFor="order-300">300 TL ve altı</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="400" id="order-400" />
                  <Label htmlFor="order-400">400 TL ve altı</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Teslimat Süresi Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Teslimat Süresi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={deliveryTime} onValueChange={setDeliveryTime}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="delivery-all" />
                  <Label htmlFor="delivery-all">Tümü</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="20" id="delivery-20" />
                  <Label htmlFor="delivery-20">20 dk ve altı</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30" id="delivery-30" />
                  <Label htmlFor="delivery-30">30 dk ve altı</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="40" id="delivery-40" />
                  <Label htmlFor="delivery-40">40 dk ve altı</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Restoran Uzaklığı Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Restoran Uzaklığı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={distance} onValueChange={setDistance}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="distance-all" />
                  <Label htmlFor="distance-all">Tümü</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="0.5" id="distance-0.5" />
                  <Label htmlFor="distance-0.5">0.5 km ve altı</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="distance-1" />
                  <Label htmlFor="distance-1">1 km ve altı</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="distance-2" />
                  <Label htmlFor="distance-2">2 km ve altı</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Filtreleri Temizle */}
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="w-full"
          >
            Filtreleri Temizle
          </Button>
        </div>

        {/* Sağ İçerik - Restoranlar */}
        <div className="flex-1">
          {/* Restoranlar */}
          {getFilteredAndSortedRestaurants().length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz restoran bulunmuyor</h3>
              <p className="text-gray-500 mb-4">Filtrelere uygun restoran bulunamadı</p>
              <Button onClick={clearFilters} variant="outline">
                Filtreleri Temizle
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getFilteredAndSortedRestaurants().map(restaurant => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
