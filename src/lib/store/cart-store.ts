"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, ProductOption } from '@/types';

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  addItem: (restaurantId: string, item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, options?: ProductOption[]) => void;
  updateQuantity: (productId: string, quantity: number, options?: ProductOption[]) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

// Öğelerin eşleşip eşleşmediğini kontrol et
const optionsMatch = (a?: ProductOption[], b?: ProductOption[]): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  // Her iki diziyi de ID'ye göre sırala
  const sortedA = [...a].sort((x, y) => x.id.localeCompare(y.id));
  const sortedB = [...b].sort((x, y) => x.id.localeCompare(y.id));

  // ID'ler ve fiyatlar aynı mı kontrol et
  return sortedA.every((option, i) => 
    option.id === sortedB[i].id && option.price === sortedB[i].price);
};

// Sepet store'u oluştur
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,

      // Sepete ürün ekle
      addItem: (restaurantId, item) => {
        const { items, restaurantId: currentRestaurantId } = get();
        
        // Eğer farklı bir restorandan ürün eklenmeye çalışılıyorsa, sepeti temizle
        if (currentRestaurantId && currentRestaurantId !== restaurantId) {
          if (window.confirm('Farklı bir restorandan ürün eklemek için sepetiniz temizlenecek. Devam etmek istiyor musunuz?')) {
            set({ items: [], restaurantId: null });
          } else {
            return;
          }
        }
        
        // Mevcut sepeti kontrol et
        const existingItemIndex = items.findIndex(
          (i) => i.productId === item.productId && optionsMatch(i.options, item.options)
        );
        
        if (existingItemIndex !== -1) {
          // Ürün zaten sepette varsa, miktarını artır
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += 1;
          set({ items: updatedItems, restaurantId });
        } else {
          // Yeni ürün ekle
          set({ 
            items: [...items, { ...item, quantity: 1 }],
            restaurantId: restaurantId 
          });
        }
      },
      
      // Sepetten ürün çıkar
      removeItem: (productId, options) => {
        const { items } = get();
        const updatedItems = items.filter(
          (item) => !(item.productId === productId && optionsMatch(item.options, options))
        );
        
        set({ 
          items: updatedItems,
          restaurantId: updatedItems.length > 0 ? get().restaurantId : null
        });
      },
      
      // Ürün miktarını güncelle
      updateQuantity: (productId, quantity, options) => {
        const { items } = get();
        const updatedItems = items.map((item) => {
          if (item.productId === productId && optionsMatch(item.options, options)) {
            return { ...item, quantity };
          }
          return item;
        }).filter((item) => item.quantity > 0);
        
        set({ 
          items: updatedItems,
          restaurantId: updatedItems.length > 0 ? get().restaurantId : null
        });
      },
      
      // Sepeti temizle
      clearCart: () => {
        set({ items: [], restaurantId: null });
      },
      
      // Toplam tutarı hesapla
      getTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          let itemTotal = item.price * item.quantity;
          
          // Seçeneklerin fiyatlarını ekle
          if (item.options && item.options.length > 0) {
            const optionsTotal = item.options.reduce(
              (sum, option) => sum + option.price, 0
            );
            itemTotal += optionsTotal * item.quantity;
          }
          
          return total + itemTotal;
        }, 0);
      },
      
      // Toplam ürün sayısını hesapla
      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'yummine-cart',
    }
  )
);