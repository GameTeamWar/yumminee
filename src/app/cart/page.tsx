"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, AlertTriangle, UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { getRestaurant } from '@/lib/firebase/db';
import { Shop } from '@/types';

export default function CartPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const {
    cart,
    currentRestaurantId,
    currentRestaurantName,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice
  } = useCart();

  const [restaurant, setRestaurant] = useState<Shop | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(false);

  // Role check - restaurant owners cannot access cart
  useEffect(() => {
    if (userProfile?.role === 'restaurant') {
      toast.error('Restoran sahipleri müşteri olarak sepet kullanamaz');
      router.push('/restaurants');
      return;
    }
  }, [userProfile, router]);

  // Restaurant bilgilerini yükle
  useEffect(() => {
    const loadRestaurant = async () => {
      if (!currentRestaurantId) return;

      setIsLoadingRestaurant(true);
      try {
        const restaurantData = await getRestaurant(currentRestaurantId);
        setRestaurant(restaurantData);
      } catch (error) {
        console.error('Restaurant bilgileri yüklenirken hata:', error);
      } finally {
        setIsLoadingRestaurant(false);
      }
    };

    loadRestaurant();
  }, [currentRestaurantId]);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      toast.success('Ürün sepetten çıkarıldı');
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    removeFromCart(productId);
    toast.success(`${productName} sepetten çıkarıldı`);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-4">Sepetiniz Boş</h1>
            <p className="text-gray-600 mb-8">
              Sepetinizde henüz ürün bulunmuyor. Lezzetli yemekler keşfetmek için restoranlarımıza göz atın.
            </p>
            <Link href="/restaurants">
              <Button size="lg">
                Restoranları Keşfet
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/restaurants" className="inline-flex items-center text-gray-600 hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Restoranlara Dön
          </Link>
          <h1 className="text-3xl font-bold">Sepetim</h1>
          {currentRestaurantName && (
            <p className="text-gray-600 mt-2">
              {currentRestaurantName} restoranından
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <Card key={item.productId}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                        {/* Placeholder for product image */}
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-gray-500">Fotoğraf</span>
                        </div>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">
                        ₺{item.price} • Birim fiyat
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-3 py-1 text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.productId, item.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Kaldır
                        </Button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        ₺{(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Clear Cart Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={clearCart}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Sepeti Boşalt
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Sipariş Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Ara Toplam</span>
                    <span>₺{getTotalPrice()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Toplam</span>
                    <span>₺{getTotalPrice()}</span>
                  </div>
                  {restaurant?.minimumOrderAmount && getTotalPrice() < restaurant.minimumOrderAmount && (
                    <div className="flex items-center text-orange-600 text-sm mt-2">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      <span>Minimum sipariş tutarı: ₺{restaurant.minimumOrderAmount}</span>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={restaurant?.minimumOrderAmount ? getTotalPrice() < restaurant.minimumOrderAmount : false}
                >
                  <Link href="/checkout" className="w-full">
                    Siparişi Tamamla
                  </Link>
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Ödeme ve teslimat bilgileri sonraki adımda alınacaktır.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}