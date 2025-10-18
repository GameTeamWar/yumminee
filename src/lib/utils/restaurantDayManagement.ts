// src/lib/utils/restaurantDayManagement.ts

/**
 * AYARLARDAN GÜN KAPATMA/AÇMA SİSTEMİ
 * Bu fonksiyonlar SADECE ayarlar sayfasından kullanılmalıdır
 */

import { updateRestaurant } from '@/lib/firebase/db';
import { WorkingHours } from './restaurantHours';

/**
 * Ayarlardan bir günü tamamen kapatır
 * Bu işlem kalıcıdır ve otomatik açılma sistemi bu günü açmaz
 */
export async function closeDayFromSettings(
  restaurantId: string,
  day: keyof WorkingHours,
  currentHours: WorkingHours
): Promise<void> {
  try {
    const updatedHours = { ...currentHours };

    // İlgili günü kapat
    updatedHours[day] = {
      ...updatedHours[day],
      isClosed: true
    };

    // Firebase'e kaydet
    await updateRestaurant(restaurantId, {
      openingHours: updatedHours
    });

    console.log(`✅ ${day} günü ayarlardan kapatıldı (Kalıcı)`);
  } catch (error) {
    console.error(`❌ ${day} günü kapatılırken hata:`, error);
    throw error;
  }
}

/**
 * Ayarlardan bir günü açar
 */
export async function openDayFromSettings(
  restaurantId: string,
  day: keyof WorkingHours,
  currentHours: WorkingHours
): Promise<void> {
  try {
    const updatedHours = { ...currentHours };

    // İlgili günü aç
    updatedHours[day] = {
      ...updatedHours[day],
      isClosed: false
    };

    // Firebase'e kaydet
    await updateRestaurant(restaurantId, {
      openingHours: updatedHours
    });

    console.log(`✅ ${day} günü ayarlardan açıldı`);
  } catch (error) {
    console.error(`❌ ${day} günü açılırken hata:`, error);
    throw error;
  }
}

/**
 * Bir günün çalışma saatlerini günceller
 */
export async function updateDayWorkingHours(
  restaurantId: string,
  day: keyof WorkingHours,
  open: string,
  close: string,
  isClosed: boolean,
  currentHours: WorkingHours
): Promise<void> {
  try {
    const updatedHours = { ...currentHours };

    // İlgili günü güncelle
    updatedHours[day] = {
      open,
      close,
      isClosed
    };

    // Firebase'e kaydet
    await updateRestaurant(restaurantId, {
      openingHours: updatedHours
    });

    console.log(`✅ ${day} günü çalışma saatleri güncellendi: ${open}-${close}, Kapalı: ${isClosed}`);
  } catch (error) {
    console.error(`❌ ${day} günü güncellenirken hata:`, error);
    throw error;
  }
}

/**
 * Tüm haftanın çalışma saatlerini günceller
 */
export async function updateAllWeekWorkingHours(
  restaurantId: string,
  newHours: WorkingHours
): Promise<void> {
  try {
    // Firebase'e kaydet
    await updateRestaurant(restaurantId, {
      openingHours: newHours as any
    });

    console.log(`✅ Tüm hafta çalışma saatleri güncellendi`);
  } catch (error) {
    console.error(`❌ Hafta çalışma saatleri güncellenirken hata:`, error);
    throw error;
  }
}

/**
 * Tüm günleri aynı çalışma saatlerine ayarlar
 */
export async function setUniformHoursForAllDays(
  restaurantId: string,
  open: string,
  close: string,
  exceptDays: (keyof WorkingHours)[] = []
): Promise<void> {
  try {
    const days: (keyof WorkingHours)[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];

    const newHours = {} as WorkingHours;

    days.forEach(day => {
      newHours[day] = {
        open,
        close,
        isClosed: exceptDays.includes(day)
      };
    });

    // Firebase'e kaydet
    await updateRestaurant(restaurantId, {
      openingHours: newHours as any
    });

    console.log(`✅ Tüm günler ${open}-${close} saatlerine ayarlandı`);
  } catch (error) {
    console.error(`❌ Tüm günler ayarlanırken hata:`, error);
    throw error;
  }
}

/**
 * Bir günü geçici olarak kapatır (sadece bugün için)
 * Bu sidebar'dan kullanılır, yarın otomatik açılır
 */
export async function closeDayTemporarily(
  restaurantId: string,
  day: keyof WorkingHours,
  currentHours: WorkingHours,
  minutesUntilReopen?: number
): Promise<void> {
  try {
    const updatedHours = { ...currentHours };

    // İlgili günü geçici olarak kapat
    updatedHours[day] = {
      ...updatedHours[day],
      isClosed: true
    };

    // Firebase'e kaydet
    await updateRestaurant(restaurantId, {
      openingHours: updatedHours
    });

    console.log(`✅ ${day} günü geçici olarak kapatıldı${minutesUntilReopen ? ` (${minutesUntilReopen} dakika)` : ''}`);

    // Eğer süre belirtilmişse, otomatik açma timer'ı kur
    if (minutesUntilReopen) {
      setTimeout(async () => {
        await openDayFromSettings(restaurantId, day, updatedHours);
      }, minutesUntilReopen * 60 * 1000);
    }
  } catch (error) {
    console.error(`❌ ${day} günü geçici kapatılırken hata:`, error);
    throw error;
  }
}

/**
 * Bir günün durumunu toggle eder (aç/kapat)
 */
export async function toggleDayStatus(
  restaurantId: string,
  day: keyof WorkingHours,
  currentHours: WorkingHours
): Promise<boolean> {
  try {
    const currentStatus = currentHours[day]?.isClosed || false;
    const newStatus = !currentStatus;

    if (newStatus) {
      await closeDayFromSettings(restaurantId, day, currentHours);
    } else {
      await openDayFromSettings(restaurantId, day, currentHours);
    }

    return newStatus;
  } catch (error) {
    console.error(`❌ ${day} günü toggle edilirken hata:`, error);
    throw error;
  }
}

/**
 * Hafta içi günleri belirli saatlere ayarlar (Pazartesi-Cuma)
 */
export async function setWeekdayHours(
  restaurantId: string,
  open: string,
  close: string,
  currentHours: WorkingHours
): Promise<void> {
  try {
    const updatedHours = { ...currentHours };
    const weekdays: (keyof WorkingHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    weekdays.forEach(day => {
      updatedHours[day] = {
        open,
        close,
        isClosed: updatedHours[day]?.isClosed || false
      };
    });

    await updateRestaurant(restaurantId, {
      openingHours: updatedHours
    });

    console.log(`✅ Hafta içi saatleri ${open}-${close} olarak güncellendi`);
  } catch (error) {
    console.error('❌ Hafta içi saatleri güncellenirken hata:', error);
    throw error;
  }
}

/**
 * Hafta sonu günleri belirli saatlere ayarlar (Cumartesi-Pazar)
 */
export async function setWeekendHours(
  restaurantId: string,
  open: string,
  close: string,
  currentHours: WorkingHours
): Promise<void> {
  try {
    const updatedHours = { ...currentHours };
    const weekendDays: (keyof WorkingHours)[] = ['saturday', 'sunday'];

    weekendDays.forEach(day => {
      updatedHours[day] = {
        open,
        close,
        isClosed: updatedHours[day]?.isClosed || false
      };
    });

    await updateRestaurant(restaurantId, {
      openingHours: updatedHours
    });

    console.log(`✅ Hafta sonu saatleri ${open}-${close} olarak güncellendi`);
  } catch (error) {
    console.error('❌ Hafta sonu saatleri güncellenirken hata:', error);
    throw error;
  }
}