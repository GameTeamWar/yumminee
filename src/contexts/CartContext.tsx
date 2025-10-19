"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '@/types';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { subscribeToUserCart, addToCartFirestore as addToCartDB, removeFromCart as removeFromCartFirestore, updateCartItemQuantity, clearUserCart } from '@/lib/firebase/db';

interface CartContextType {
  cart: CartItem[];
  currentRestaurantId: string | null;
  currentRestaurantName: string | null;
  addToCart: (product: any, restaurantId: string, restaurantName: string) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  updateCartItemInfo: (productId: string, updates: Partial<CartItem>) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const [currentRestaurantName, setCurrentRestaurantName] = useState<string | null>(null);
  const { user } = useAuth();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedRestaurantId = localStorage.getItem('currentRestaurantId');
    const savedRestaurantName = localStorage.getItem('currentRestaurantName');

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing saved cart:', error);
      }
    }

    if (savedRestaurantId) {
      setCurrentRestaurantId(savedRestaurantId);
    }

    if (savedRestaurantName) {
      setCurrentRestaurantName(savedRestaurantName);
    }
  }, []);

  // Real-time cart sync with Firestore when user logs in
  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      unsubscribe = await subscribeToUserCart(user.uid, (cartItems) => {
        // Sync cart with Firestore
        if (cartItems.length > 0) {
          // Convert Firestore cart items to local cart format
          const firestoreCart = cartItems.map((item: any) => ({
            productId: item.productId,
            name: item.name || item.productName,
            price: Number(item.price) || Number(item.unitPrice) || 0,
            quantity: item.quantity,
            imageUrl: item.productImage || item.imageUrl,
            description: item.description || item.productDescription,
            options: item.options || []
          }));
          setCart(firestoreCart);
          setCurrentRestaurantId(cartItems[0]?.restaurantId || null);
          setCurrentRestaurantName(cartItems[0]?.restaurantName || null);
        }
      });
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('currentRestaurantId', currentRestaurantId || '');
    localStorage.setItem('currentRestaurantName', currentRestaurantName || '');
  }, [cart, currentRestaurantId, currentRestaurantName]);

  const addToCart = async (product: any, restaurantId: string, restaurantName: string) => {
    // Check if trying to add from different restaurant
    if (currentRestaurantId && currentRestaurantId !== restaurantId && cart.length > 0) {
      toast.error(`Sepetinizde ${currentRestaurantName} restoranından ürünler var. Farklı restorandan ürün eklemek için sepeti boşaltın.`, {
        duration: 5000,
        action: {
          label: 'Sepeti Boşalt',
          onClick: () => clearCart(),
        },
      });
      return;
    }

    // Set current restaurant if not set
    if (!currentRestaurantId) {
      setCurrentRestaurantId(restaurantId);
      setCurrentRestaurantName(restaurantName);
    }

    // Update local cart
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
        imageUrl: product.imageUrl,
        description: product.description,
        options: product.options,
        removedIngredients: product.removedIngredients
      }];
    });

    // Update Firestore if user is logged in
    if (user?.uid) {
      try {
        await addToCartDB(user.uid, product, restaurantId, restaurantName);
      } catch (error) {
        console.error('Firestore cart update failed:', error);
        // Don't show error to user, local cart is still updated
      }
    }

    toast.success(`${product.name} sepete eklendi`);
  };

  const removeFromCart = async (productId: string) => {
    // Update local cart
    setCart(prev => prev.filter(item => item.productId !== productId));

    // Clear restaurant info if cart becomes empty
    if (cart.length <= 1) {
      setCurrentRestaurantId(null);
      setCurrentRestaurantName(null);
    }

    // Update Firestore if user is logged in
    if (user?.uid) {
      try {
        await removeFromCartFirestore(user.uid, productId);
      } catch (error) {
        console.error('Firestore cart update failed:', error);
      }
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    // Update local cart
    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );

    // Update Firestore if user is logged in
    if (user?.uid) {
      try {
        await updateCartItemQuantity(`${user.uid}_${productId}`, quantity);
      } catch (error) {
        console.error('Firestore cart update failed:', error);
      }
    }
  };

  const clearCart = async () => {
    // Update local cart
    setCart([]);
    setCurrentRestaurantId(null);
    setCurrentRestaurantName(null);

    // Update Firestore if user is logged in
    if (user?.uid) {
      try {
        await clearUserCart(user.uid);
      } catch (error) {
        console.error('Firestore cart clear failed:', error);
      }
    }

    toast.success('Sepet boşaltıldı');
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const updateCartItemInfo = (productId: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, ...updates } : item
    ));
  };

  const getTotalPrice = () => cart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);

  const value: CartContextType = {
    cart,
    currentRestaurantId,
    currentRestaurantName,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    updateCartItemInfo,
    getTotalItems,
    getTotalPrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};