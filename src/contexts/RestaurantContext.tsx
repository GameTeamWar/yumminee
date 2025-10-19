"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { updateRestaurant } from '@/lib/firebase/db';
import { useAuth } from './AuthContext';

interface RestaurantContextType {
  getRemainingTime: (restaurantId: string) => number;
  updateRemainingTime: (restaurantId: string, endTime: number | null) => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

interface RestaurantProviderProps {
  children: ReactNode;
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const [remainingTimes, setRemainingTimes] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Geri sayımları güncelle - her restoran için ayrı
  useEffect(() => {
    // Mevcut intervals'ları temizle
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};

    // Aktif geri sayımlar için yeni intervals oluştur
    Object.entries(remainingTimes).forEach(([restaurantId, time]) => {
      if (time > 0) {
        intervalsRef.current[restaurantId] = setInterval(() => {
          setRemainingTimes(prev => {
            const currentTime = prev[restaurantId];
            if (!currentTime || currentTime <= 1) {
              // Süre doldu, otomatik aç - sadece veritabanını güncelle
              if (user?.uid) {
                updateRestaurant(user.uid, {
                  tempCloseEndTime: null,
                  tempCloseOption: null
                }).catch(console.error);
              }
              const updated = { ...prev };
              delete updated[restaurantId];
              return updated;
            }
            return { ...prev, [restaurantId]: currentTime - 1 };
          });
        }, 1000);
      }
    });

    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      intervalsRef.current = {};
    };
  }, [remainingTimes, user?.uid]);

  const getRemainingTime = (restaurantId: string): number => {
    return remainingTimes[restaurantId] || 0;
  };

  const updateRemainingTime = useCallback((restaurantId: string, endTime: number | null) => {
    if (endTime) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = endTime - now;
      setRemainingTimes(prev => ({
        ...prev,
        [restaurantId]: remaining > 0 ? remaining : 0
      }));
    } else {
      setRemainingTimes(prev => {
        const updated = { ...prev };
        delete updated[restaurantId];
        return updated;
      });
    }
  }, []);

  const value = {
    getRemainingTime,
    updateRemainingTime,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}