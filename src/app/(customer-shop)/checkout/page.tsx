"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCartStore } from '@/lib/store/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Truck, MapPin, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getRestaurant, createOrder } from '@/lib/firebase/db';
import { Shop } from '@/types';
import { Timestamp, GeoPoint } from 'firebase/firestore';

export default function CheckoutPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { items, getTotal, clearCart, restaurantId } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<Shop | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(false);

  // Kullanıcı giriş yapmadıysa login'e yönlendir
  useEffect(() => {
    if (!user) {
      router.push('/login?callbackUrl=/checkout');
      return;
    }

    // Restoran sahipleri checkout'a erişemez
    if (userProfile?.role === 'restaurant') {
      toast.error('Restoran sahipleri müşteri olarak ödeme yapamaz');
      router.push('/restaurants');
      return;
    }

    if (items.length === 0) {
      router.push('/cart');
      return;
    }
  }, [user, userProfile, items.length, router]);

  // Restaurant bilgilerini yükle
  useEffect(() => {
    const loadRestaurant = async () => {
      if (!restaurantId) return;

      setIsLoadingRestaurant(true);
      try {
        const restaurantData = await getRestaurant(restaurantId);
        setRestaurant(restaurantData);
      } catch (error) {
        console.error('Restaurant bilgileri yüklenirken hata:', error);
        toast.error('Restaurant bilgileri yüklenemedi');
      } finally {
        setIsLoadingRestaurant(false);
      }
    };

    loadRestaurant();
  }, [restaurantId]);

  const total = getTotal();

  const handlePlaceOrder = async () => {
    if (!user || !restaurant) return;

    // Minimum sipariş tutarı kontrolü
    if (restaurant.minimumOrderAmount && total < restaurant.minimumOrderAmount) {
      toast.error(`Bu restoranın minimum sipariş tutarı ${restaurant.minimumOrderAmount} TL'dir.`);
      return;
    }

    setIsLoading(true);
    try {
      // Sipariş oluşturma işlemi
      await createOrder({
        customerId: user.uid,
        shopId: restaurant.id,
        restaurantId: restaurant.id, // Legacy compatibility
        userId: user.uid, // Legacy compatibility
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedOptions: [] // Options will be handled separately
        })),
        subtotal: getTotal(),
        deliveryFee: 0, // Bu dinamik olmalı
        total: total,
        status: 'pending' as const,
        paymentMethod: 'card' as const,
        paymentStatus: 'pending' as const,
        deliveryAddress: {
          id: '', // Bu dinamik olmalı
          customerId: user.uid,
          title: 'Ev',
          address: 'İstanbul, Kadıköy', // Bu dinamik olmalı
          location: new GeoPoint(41.0082, 28.9784), // Bu dinamik olmalı
          geoPoint: new GeoPoint(41.0082, 28.9784), // Required field
          isDefault: true,
          isActive: true,
          userId: user.uid, // Legacy compatibility
          addressName: 'Ev', // Legacy compatibility
          addressDetails: {
            buildingNumber: '1',
            apartment: '1',
            hasElevator: false,
            detailedAddress: 'İstanbul, Kadıköy'
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        },
        deliveryLocation: new GeoPoint(41.0082, 28.9784), // Bu dinamik olmalı
        timeline: {
          orderedAt: Timestamp.now()
        }
      });

      toast.success('Siparişiniz başarıyla oluşturuldu!');
      clearCart();
      router.push('/orders');
    } catch (error) {
      console.error('Sipariş oluşturulurken hata:', error);
      toast.error('Sipariş oluşturulurken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || items.length === 0) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/cart')}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sepete Dön
        </Button>
        <h1 className="text-3xl font-bold">Ödeme</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sol Taraf - Sipariş Detayları */}
        <div className="space-y-6">
          {/* Teslimat Adresi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Teslimat Adresi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    placeholder="Teslimat adresinizi girin"
                    defaultValue="İstanbul, Kadıköy"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      placeholder="05XX XXX XX XX"
                      defaultValue="0555 123 45 67"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructions">Talimatlar</Label>
                    <Input
                      id="instructions"
                      placeholder="Kapıyı çalın, zili kullanmayın"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ödeme Yöntemi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Ödeme Yöntemi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup defaultValue="card">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card">Kredi Kartı</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash">Kapıda Nakit Ödeme</Label>
                </div>
              </RadioGroup>

              {/* Kredi Kartı Formu */}
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Kart Numarası</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Son Kullanma Tarihi</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardName">Kart Üzerindeki İsim</Label>
                  <Input
                    id="cardName"
                    placeholder="AD SOYAD"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Taraf - Sipariş Özeti */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Sipariş Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ürünler */}
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{(item.price * item.quantity).toFixed(2)} TL</span>
                  </div>
                ))}
              </div>

              <hr className="my-4" />

              {/* Toplamlar */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ara Toplam</span>
                  <span>{getTotal().toFixed(2)} TL</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Toplam</span>
                  <span>{total.toFixed(2)} TL</span>
                </div>
                {restaurant?.minimumOrderAmount && total < restaurant.minimumOrderAmount && (
                  <div className="flex items-center text-orange-600 text-sm mt-2">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span>Minimum sipariş tutarı: {restaurant.minimumOrderAmount} TL</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={isLoading || isLoadingRestaurant || (restaurant?.minimumOrderAmount ? total < restaurant.minimumOrderAmount : false)}
              >
                {isLoading ? 'Sipariş Oluşturuluyor...' : 
                 isLoadingRestaurant ? 'Restaurant Bilgileri Yükleniyor...' :
                 (restaurant?.minimumOrderAmount && total < restaurant.minimumOrderAmount) ? 
                 'Minimum Tutar Eksik' : 'Siparişi Onayla'}
              </Button>
            </CardFooter>
          </Card>

          {/* Teslimat Bilgisi */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center text-sm text-gray-600">
                <Truck className="h-4 w-4 mr-2" />
                <span>Tahmini teslimat süresi: 30-45 dakika</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}