"use client";

import { useEffect, useState } from 'react';
import { Restaurant } from '@/types';
import { isRestaurantOpenBasedOnHours } from '@/lib/utils/restaurantHours';
import { updateRestaurant } from '@/lib/firebase/db';

/**
 * Restoranın geçici kapatma süresini takip eden ve otomatik açan hook
 */
export function useAutoRestaurantStatus(restaurant: Restaurant | null) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!restaurant?.id) return;

    // Geçici kapatma süresini kontrol et
    const checkTempClose = () => {
      if (!restaurant.tempCloseEndTime) return;

      const now = Math.floor(Date.now() / 1000);
      const remaining = restaurant.tempCloseEndTime - now;

      // Süre dolmuşsa otomatik aç
      if (remaining <= 0) {
        handleAutoOpen();
      }
    };

    // Otomatik açma fonksiyonu
    const handleAutoOpen = async () => {
      if (!restaurant?.id) return;

      try {
        setIsUpdating(true);

        const today = new Intl.DateTimeFormat('en', { weekday: 'long' })
          .format(new Date())
          .toLowerCase();
        
        const updatedHours = { ...restaurant.openingHours };
        if (updatedHours[today as keyof typeof updatedHours]) {
          updatedHours[today as keyof typeof updatedHours].isClosed = false;
        }

        await updateRestaurant(restaurant.id, {
          openingHours: updatedHours,
          tempCloseEndTime: null,
          tempCloseOption: null
        });

        console.log('✅ Geçici kapatma süresi doldu - restoran otomatik açıldı');
      } catch (error) {
        console.error('❌ Otomatik açma hatası:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    // İlk kontrol
    checkTempClose();

    // Her 5 saniyede bir kontrol et
    const interval = setInterval(checkTempClose, 5000);

    return () => clearInterval(interval);
  }, [restaurant]);

  return { isUpdating };
}

/**
 * Restoranın şu anda açık olup olmadığını kontrol eder
 */
export function getRestaurantStatus(restaurant: Restaurant): {
  isOpen: boolean;
  statusText: string;
  nextOpeningTime?: Date;
} {
  if (!restaurant.openingHours) {
    return {
      isOpen: true,
      statusText: 'Açık'
    };
  }

  // Geçici kapatma kontrolü
  if (restaurant.tempCloseEndTime) {
    const now = Math.floor(Date.now() / 1000);
    const remaining = restaurant.tempCloseEndTime - now;

    if (remaining > 0) {
      return {
        isOpen: false,
        statusText: 'Geçici kapalı'
      };
    }
  }

  const today = new Intl.DateTimeFormat('en', { weekday: 'long' })
    .format(new Date())
    .toLowerCase();
  const todayHours = restaurant.openingHours[today as keyof typeof restaurant.openingHours];

  // Manuel kapanış kontrolü
  if (todayHours?.isClosed) {
    return {
      isOpen: false,
      statusText: 'Manuel olarak kapatıldı'
    };
  }

  // Çalışma saatlerine göre kontrol
  const isOpenBySchedule = isRestaurantOpenBasedOnHours(restaurant.openingHours);

  if (isOpenBySchedule) {
    return {
      isOpen: true,
      statusText: 'Açık'
    };
  } else {
    return {
      isOpen: false,
      statusText: 'Çalışma saatleri dışında'
    };
  }
}