"use client";

import { useEffect, useState } from 'react';
import { Restaurant } from '@/types';
import { isRestaurantOpenBasedOnHours } from '@/lib/utils/restaurantHours';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Restoranın çalışma saatlerine göre otomatik açık/kapalı durumunu yöneten hook
 * SADECE çalışma saatlerine göre otomatik açar, manuel kapanışları korur
 */
export function useAutoRestaurantStatus(restaurant: Restaurant | null) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!restaurant?.openingHours || !restaurant.id) return;

    const checkAndUpdateStatus = async () => {
      try {
        const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
        const todayHours = restaurant.openingHours![today as keyof typeof restaurant.openingHours];
        
        // ⚠️ KRİTİK: Eğer bugün kapatılmışsa (manuel veya ayarlardan), HİÇBİR ŞEY YAPMA
        // Bu hook SADECE geçici kapatmaları açar, kalıcı kapatmalara DOKUNMAZ
        if (todayHours?.isClosed) {
          console.log(`🔒 Hook: Bugün kapalı (manuel/ayarlardan) - Otomatik açılmayacak`);
          return;
        }

        // Çalışma saatlerine göre açık olup olmadığını kontrol et
        const shouldBeOpenBySchedule = isRestaurantOpenBasedOnHours(restaurant.openingHours!);
        
        console.log(`⏰ Hook: Çalışma saatleri kontrolü - Açık olmalı: ${shouldBeOpenBySchedule}`);

        // Bu hook SADECE kontrol eder, hiçbir değişiklik yapmaz
        // Değişiklikler sadece şu yollarla yapılmalı:
        // 1. Sidebar'dan manuel açma/kapama (RestaurantSidebar.tsx)
        // 2. Ayarlardan gün açma/kapama (restaurantDayManagement.ts)
        // 3. Geçici kapatma timer'ları

        if (shouldBeOpenBySchedule && !todayHours.isClosed) {
          console.log(`✅ Hook: Restoran şu an açık durumda (doğru)`);
        } else if (!shouldBeOpenBySchedule && !todayHours.isClosed) {
          console.log(`⏰ Hook: Çalışma saatleri dışında ama açık (normal)`);
        }
      } catch (error) {
        console.error('❌ Hook: Restoran durumu kontrolünde hata:', error);
      }
    };

    // İlk kontrol - hemen çalış
    checkAndUpdateStatus();

    // Her dakika kontrol et - sadece monitoring için
    const interval = setInterval(checkAndUpdateStatus, 60000); // 1 dakika

    return () => clearInterval(interval);
  }, [restaurant]); // Sadece restaurant değiştiğinde çalış

  return { isUpdating };
}

/**
 * Restoranın şu anda açık olup olmadığını kontrol eder
 * Hem manuel durumu hem de çalışma saatlerini dikkate alır
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

  const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
  const todayHours = restaurant.openingHours[today as keyof typeof restaurant.openingHours];

  // Eğer bugün manuel olarak kapatılmışsa
  if (todayHours?.isClosed) {
    return {
      isOpen: false,
      statusText: 'Manuel olarak kapatıldı'
    };
  }

  // Çalışma saatlerine göre kontrol et
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