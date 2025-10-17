"use client";

import { useEffect, useState } from 'react';
import { Restaurant } from '@/types';
import { isRestaurantOpenBasedOnHours, getNextOpeningTime } from '@/lib/utils/restaurantHours';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Restoranın çalışma saatlerine göre otomatik açık/kapalı durumunu yöneten hook
 * Sadece manuel olarak kapatılmamış restoranlar için çalışır
 */
export function useAutoRestaurantStatus(restaurant: Restaurant | null) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!restaurant?.workingHours || !restaurant.id) return;

    const checkAndUpdateStatus = async () => {
      try {
        // Eğer restoran manuel olarak kapatılmışsa (isOpen = false), otomatik açma
        if (restaurant.isOpen === false) {
          return;
        }

        // Çalışma saatleri varsa kontrol et
        if (!restaurant.workingHours) return;

        // Çalışma saatlerine göre açık olmalı mı kontrol et
        const shouldBeOpen = isRestaurantOpenBasedOnHours(restaurant.workingHours);

        // Durum farklıysa güncelle
        if (shouldBeOpen !== restaurant.isOpen) {
          setIsUpdating(true);

          const restaurantRef = doc(db, 'restaurants', restaurant.id);
          await updateDoc(restaurantRef, {
            isOpen: shouldBeOpen,
            updatedAt: new Date()
          });

          console.log(`Restoran ${restaurant.name} otomatik olarak ${shouldBeOpen ? 'açıldı' : 'kapandı'}`);
        }
      } catch (error) {
        console.error('Restoran durumu güncellenirken hata:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    // İlk kontrol
    checkAndUpdateStatus();

    // Her dakika kontrol et
    const interval = setInterval(checkAndUpdateStatus, 60000); // 1 dakika

    return () => clearInterval(interval);
  }, [restaurant]);

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
  // Eğer manuel olarak kapalıysa
  if (restaurant.isOpen === false) {
    return {
      isOpen: false,
      statusText: 'Kapalı'
    };
  }

  // Çalışma saatleri varsa kontrol et
  if (restaurant.workingHours) {
    const isOpenBasedOnHours = isRestaurantOpenBasedOnHours(restaurant.workingHours);

    if (isOpenBasedOnHours) {
      return {
        isOpen: true,
        statusText: 'Açık'
      };
    } else {
      // Kapalıysa bir sonraki açılış saatini hesapla
      const nextOpening = getNextOpeningTime(restaurant.workingHours);
      return {
        isOpen: false,
        statusText: 'Kapalı',
        nextOpeningTime: nextOpening || undefined
      };
    }
  }

  // Çalışma saati bilgisi yoksa varsayılan olarak açık kabul et
  return {
    isOpen: true,
    statusText: 'Açık'
  };
}