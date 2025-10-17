"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  addFavoriteRestaurant,
  removeFavoriteRestaurant,
  isRestaurantFavorite,
  getFavoriteRestaurants
} from '@/lib/firebase/db';
import { toast } from 'sonner';

interface FavoriteContextType {
  favoriteRestaurantIds: string[];
  favorites: string[];
  isFavorite: (restaurantId: string) => boolean;
  addToFavorites: (restaurantId: string) => Promise<void>;
  removeFromFavorites: (restaurantId: string) => Promise<void>;
  toggleFavorite: (restaurantId: string) => Promise<void>;
  isLoading: boolean;
  loading: boolean;
  refreshFavorites: () => Promise<void>;
}

const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoriteContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoriteProvider');
  }
  return context;
};

interface FavoriteProviderProps {
  children: ReactNode;
}

export const FavoriteProvider: React.FC<FavoriteProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [favoriteRestaurantIds, setFavoriteRestaurantIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites when user changes
  useEffect(() => {
    if (user?.uid) {
      refreshFavorites();
    } else {
      setFavoriteRestaurantIds([]);
    }
  }, [user?.uid]);

  const refreshFavorites = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const favorites = await getFavoriteRestaurants(user.uid);
      setFavoriteRestaurantIds(favorites);
    } catch (error) {
      console.error('Favorileri yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFavorite = (restaurantId: string): boolean => {
    return favoriteRestaurantIds.includes(restaurantId);
  };

  const addToFavorites = async (restaurantId: string): Promise<void> => {
    if (!user?.uid) {
      toast.error('Favori eklemek için giriş yapmalısınız');
      return;
    }

    try {
      setIsLoading(true);
      await addFavoriteRestaurant(user.uid, restaurantId);
      setFavoriteRestaurantIds(prev => [...prev, restaurantId]);
      toast.success('Restoran favorilere eklendi');
    } catch (error) {
      console.error('Favori ekleme hatası:', error);
      toast.error('Favori eklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromFavorites = async (restaurantId: string): Promise<void> => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      await removeFavoriteRestaurant(user.uid, restaurantId);
      setFavoriteRestaurantIds(prev => prev.filter(id => id !== restaurantId));
      toast.success('Restoran favorilerden çıkarıldı');
    } catch (error) {
      console.error('Favori çıkarma hatası:', error);
      toast.error('Favori çıkarılırken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (restaurantId: string): Promise<void> => {
    if (isFavorite(restaurantId)) {
      await removeFromFavorites(restaurantId);
    } else {
      await addToFavorites(restaurantId);
    }
  };

  const value: FavoriteContextType = {
    favoriteRestaurantIds,
    favorites: favoriteRestaurantIds,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isLoading,
    loading: isLoading,
    refreshFavorites,
  };

  return (
    <FavoriteContext.Provider value={value}>
      {children}
    </FavoriteContext.Provider>
  );
};