"use client";

import { Button } from '@/components/ui/button';
import { Plus, Minus, X } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { CartItem, ProductOption } from '@/types';

interface CartItemCardProps {
  item: CartItem;
}

const CartItemCard = ({ item }: CartItemCardProps) => {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  
  const handleIncreaseQuantity = () => {
    updateQuantity(item.productId, item.quantity + 1, item.options);
  };
  
  const handleDecreaseQuantity = () => {
    if (item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1, item.options);
    } else {
      removeItem(item.productId, item.options);
    }
  };
  
  const handleRemoveItem = () => {
    removeItem(item.productId, item.options);
  };
  
  // Seçeneklerin toplam fiyatını hesapla
  const optionsPrice = item.options ? 
    item.options.reduce((total, option) => total + option.price, 0) : 0;
  
  // Ürünün birim fiyatını hesapla (ürün + seçenekler)
  const unitPrice = item.price + optionsPrice;
  
  // Ürünün toplam fiyatını hesapla (birim fiyat * miktar)
  const totalPrice = unitPrice * item.quantity;

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <h3 className="font-medium">{item.name}</h3>
        
        {/* Seçenekler */}
        {item.options && item.options.length > 0 && (
          <div className="mt-1 text-sm text-gray-500">
            {item.options.map((option, index) => (
              <div key={option.id} className="flex justify-between">
                <span>{option.name}</span>
                <span>+{option.price.toFixed(2)} TL</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Fiyat */}
        <div className="mt-1">
          <span className="font-semibold">{totalPrice.toFixed(2)} TL</span>
          {item.quantity > 1 && (
            <span className="text-xs text-gray-500 ml-1">
              ({unitPrice.toFixed(2)} TL x {item.quantity})
            </span>
          )}
        </div>
      </div>
      
      {/* Miktar ve Sil Butonları */}
      <div className="flex flex-col items-end gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={handleRemoveItem}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleDecreaseQuantity}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center">{item.quantity}</span>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleIncreaseQuantity}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartItemCard;