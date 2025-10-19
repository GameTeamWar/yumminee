"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Minus, Plus, Trash2, ShoppingBag, AlertTriangle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Shop } from '@/types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { userProfile } = useAuth();
  const router = useRouter();
  const {
    cart,
    currentRestaurantId,
    currentRestaurantName,
    updateQuantity,
    removeFromCart,
    clearCart,
    updateCartItemInfo,
    getTotalPrice
  } = useCart();

  const [restaurant, setRestaurant] = useState<Shop | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(false);
  const [productPrices, setProductPrices] = useState<Map<string, number>>(new Map());
  const [productDetails, setProductDetails] = useState<Map<string, {name: string, description: string}>>(new Map());

  // Role check - restaurant owners cannot access cart
  useEffect(() => {
    if (userProfile?.role === 'shop') {
      toast.error('Restoran sahipleri müşteri olarak sepet kullanamaz');
      onClose();
      return;
    }
  }, [userProfile, onClose]);

  // Restaurant bilgilerini gerçek zamanlı dinle
  useEffect(() => {
    if (!currentRestaurantId) {
      setRestaurant(null);
      setIsLoadingRestaurant(false);
      return;
    }

    setIsLoadingRestaurant(true);

    const restaurantRef = doc(db, 'shops', currentRestaurantId);
    const unsubscribe = onSnapshot(restaurantRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setRestaurant({ id: docSnapshot.id, ...data } as Shop);
      } else {
        setRestaurant(null);
      }
      setIsLoadingRestaurant(false);
    }, (error) => {
      console.error('Restaurant bilgileri dinleme hatası:', error);
      setIsLoadingRestaurant(false);
    });

    return () => unsubscribe();
  }, [currentRestaurantId]);

  // Product prices real-time sync
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    cart.forEach((item) => {
      const productRef = doc(db, 'menus', item.productId);
      const unsubscribe = onSnapshot(productRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const newPrice = Number(data.price) || 0;
          const newName = data.name || item.name;
          const newDescription = data.description || item.description || '';

          setProductPrices(prev => new Map(prev.set(item.productId, newPrice)));
          setProductDetails(prev => new Map(prev.set(item.productId, {
            name: newName,
            description: newDescription
          })));

          // Update cart item in context
          updateCartItemInfo(item.productId, {
            name: newName,
            price: newPrice,
            description: newDescription
          });
        }
      }, (error) => {
        console.error('Ürün bilgi dinleme hatası:', error);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [cart]);

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

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  if (cart.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:w-[400px] [&>button]:hidden">
          <SheetHeader>
            <SheetTitle>Sepetim</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sepetiniz Boş</h3>
            <p className="text-gray-600 text-sm mb-6">
              Sepetinizde henüz ürün bulunmuyor.
            </p>
            <Button onClick={onClose} variant="outline">
              Alışverişe Devam Et
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
              <SheetContent side="right" className="w-full sm:w-[400px] [&>button]:hidden">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Sepetim</SheetTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              >
                <Trash2 className="h-[1em] w-[1em]" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-[1em] w-[1em]" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Restaurant Info */}
        {restaurant && (
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {restaurant.image ? (
                  <Image
                    src={restaurant.image}
                    alt={restaurant.name || 'Restoran görseli'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs text-gray-500">Foto</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{restaurant.name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{restaurant.cuisine?.join(', ') || 'Yemek'}</span>
                  {restaurant.rating > 0 && (
                    <>
                      <span>•</span>
                      <span>⭐ {restaurant.rating.toFixed(1)}</span>
                      {restaurant.reviewCount > 0 && (
                        <>
                          <span>•</span>
                          <span>({restaurant.reviewCount} yorum)</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.productId} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name || 'Ürün görseli'}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">Foto</span>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {productDetails.get(item.productId)?.name || item.name}
                  </h4>
                  <p className="text-xs text-gray-600 break-words">
                    {productDetails.get(item.productId)?.description || item.description || ''}
                  </p>
                  {/* Rating display */}
                  <div className="flex items-center gap-1 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 16 16" className="text-xs text-green-600">
                      <path fill="currentColor" d="M1.334 6h2v8h-2a.667.667 0 0 1-.667-.667V6.667c0-.369.298-.667.667-.667m3.528-.862L9.13.871a.33.33 0 0 1 .436-.03l.568.425a1 1 0 0 1 .37 1.047l-.77 3.02H14c.737 0 1.334.597 1.334 1.334V8.07c0 .174-.034.346-.1.507l-2.064 5.01a.67.67 0 0 1-.616.413h-7.22a.667.667 0 0 1-.667-.667V5.61c0-.176.07-.346.195-.471"></path>
                    </svg>
                    <span className="text-xs font-medium text-green-600">%76 Beğenildi</span>
                    <span className="text-xs font-medium text-gray-600">(25 Değerlendirme)</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-semibold text-sm text-orange-600">
                      ₺{(productPrices.get(item.productId) || Number(item.price) || 0) * item.quantity}
                    </span>

                    {/* Quantity Controls and Delete */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="h-6 w-6 p-0 rounded-full border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-semibold text-sm text-gray-900 min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        className="h-6 w-6 p-0 rounded-full border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.productId, item.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0 ml-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary & Checkout */}
        <SheetFooter className="border-t pt-4">
          <div className="w-full space-y-4">
            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ara Toplam</span>
                <span>₺{getTotalPrice()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Toplam</span>
                <span>₺{getTotalPrice()}</span>
              </div>
              {restaurant?.minimumOrderAmount && getTotalPrice() < restaurant.minimumOrderAmount && (
                <div className="flex items-center text-orange-600 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  <span>Min. sipariş: ₺{restaurant.minimumOrderAmount}</span>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={restaurant?.minimumOrderAmount ? getTotalPrice() < restaurant.minimumOrderAmount : false}
            >
              Siparişi Tamamla
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Ödeme bilgileri sonraki adımda alınacaktır.
            </p>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}