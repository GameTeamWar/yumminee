"use client";

import { useEffect, useState } from 'react';
import { Restaurant } from '@/types';
import { isRestaurantOpenBasedOnHours, getNextOpeningTime } from '@/lib/utils/restaurantHours';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Restoranın çalışma saatlerine göre otomatik açık/kapalı durumunu yöneten hook
 * openingHours'a göre otomatik açar/kapar
 */
export function useAutoRestaurantStatus(restaurant: Restaurant | null) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!restaurant?.openingHours || !restaurant.id) return;

    const checkAndUpdateStatus = async () => {
      try {
        const shouldBeOpen = isRestaurantOpenBasedOnHours(restaurant.openingHours!);
        console.log(`Hook: Restoran şu an açık: ${restaurant.isOpen}, saatlere göre açık olmalı: ${shouldBeOpen}`);

        // Açma: Eğer saatlere göre açık olmalı ama şu an kapalıysa aç
        if (shouldBeOpen && !restaurant.isOpen) {
          setIsUpdating(true);

          const restaurantRef = doc(db, 'shops', restaurant.id);
          await updateDoc(restaurantRef, {
            isOpen: true,
            updatedAt: new Date()
          });

          console.log(`Restoran ${restaurant.name} saatlere göre otomatik olarak açıldı`);
        }

        // Kapanış: Eğer saatlere göre kapalı olmalı ama şu an açıksa kapat
        if (!shouldBeOpen && restaurant.isOpen) {
          setIsUpdating(true);

          const restaurantRef = doc(db, 'shops', restaurant.id);
          await updateDoc(restaurantRef, {
            isOpen: false,
            updatedAt: new Date()
          });

          console.log(`Restoran ${restaurant.name} saatlere göre otomatik olarak kapatıldı`);
        }
      } catch (error) {
        console.error('Restoran durumu güncellenirken hata:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    // İlk kontrol - hemen çalış
    checkAndUpdateStatus();

    // Her dakika kontrol et - kapanış saatinde kapatmak için
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