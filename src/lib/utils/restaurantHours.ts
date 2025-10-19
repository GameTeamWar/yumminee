// src/lib/utils/restaurantHours.ts

/**
 * Restoranın çalışma saatleri ile ilgili yardımcı fonksiyonlar
 */

export interface WorkingHours {
  monday: { open: string; close: string; isClosed: boolean };
  tuesday: { open: string; close: string; isClosed: boolean };
  wednesday: { open: string; close: string; isClosed: boolean };
  thursday: { open: string; close: string; isClosed: boolean };
  friday: { open: string; close: string; isClosed: boolean };
  saturday: { open: string; close: string; isClosed: boolean };
  sunday: { open: string; close: string; isClosed: boolean };
}

/**
 * Verilen saatin HH:mm formatında olup olmadığını kontrol eder
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Saat string'ini dakikaya çevirir (örn: "14:30" -> 870)
 */
function timeToMinutes(time: string): number {
  if (!isValidTimeFormat(time)) {
    console.warn(`Geçersiz saat formatı: ${time}`);
    return 0;
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Restoranın ŞU ANDA çalışma saatlerine göre açık olup olmadığını kontrol eder
 * Manuel kapanışları DIKKATE ALMAZ, sadece çalışma saatlerine bakar
 */
export function isRestaurantOpenBasedOnHours(workingHours: WorkingHours): boolean {
  const now = new Date();
  const currentDay = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(now).toLowerCase();
  const todayHours = workingHours[currentDay as keyof WorkingHours];

  // Eğer bugün için çalışma saati tanımlanmamışsa, kapalı kabul et
  if (!todayHours) {
    return false;
  }

  // Eğer bugün kapalıysa (isClosed = true), kapalı döndür
  // NOT: Bu manuel kapanışı da içerir, ama bu fonksiyon sadece çalışma saatlerine bakmalı
  // Manuel kapanış kontrolü çağıran tarafta yapılmalı
  if (todayHours.isClosed) {
    return false;
  }

  // Açılış ve kapanış saatlerini kontrol et
  if (!todayHours.open || !todayHours.close) {
    return false;
  }

  // Şu anki saati dakikaya çevir
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeToMinutes(todayHours.open);
  const closeMinutes = timeToMinutes(todayHours.close);

  // Gece yarısını geçen çalışma saatleri için özel durum
  if (closeMinutes < openMinutes) {
    // Örneğin: 22:00 - 02:00
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  // Normal çalışma saatleri
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Bir sonraki açılış zamanını hesaplar
 */
export function getNextOpeningTime(workingHours: WorkingHours): Date | null {
  const now = new Date();
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Bugünden başlayarak 7 gün kontrol et
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);
    
    const dayName = daysOfWeek[checkDate.getDay()];
    const dayHours = workingHours[dayName as keyof WorkingHours];
    
    if (!dayHours || dayHours.isClosed) {
      continue;
    }
    
    const [openHour, openMinute] = dayHours.open.split(':').map(Number);
    checkDate.setHours(openHour, openMinute, 0, 0);
    
    // Eğer bu zaman gelecekteyse, bu açılış zamanını döndür
    if (checkDate > now) {
      return checkDate;
    }
  }

  // Eğer 7 gün içinde hiçbir açılış bulunmadıysa null döndür
  return null;
}

/**
 * Restoranın durumunu döndürür (açık/kapalı, bir sonraki açılış zamanı vb.)
 */
export function getRestaurantStatus(restaurant: { openingHours?: WorkingHours; isOpen?: boolean }): {
  isOpen: boolean;
  nextOpeningTime?: Date;
  statusText: string;
} {
  // Eğer manuel olarak açık/kapalı durumu varsa onu kullan (genel toggle)
  if (restaurant.isOpen !== undefined) {
    // Genel olarak kapalıysa, çalışma saatlerini kontrol et
    if (!restaurant.isOpen) {
      // Çalışma saatlerine göre açık mı kontrol et
      if (restaurant.openingHours) {
        const isOpenByHours = isRestaurantOpenBasedOnHours(restaurant.openingHours);
        if (isOpenByHours) {
          // Saatlere göre açık, manuel kapatmaya rağmen açık kabul edelim
          return {
            isOpen: true,
            statusText: 'Açık'
          };
        }
      }
      return {
        isOpen: false,
        statusText: 'Kapalı'
      };
    }

    // Genel olarak açıksa, günlük kapanış durumunu kontrol et
    if (restaurant.openingHours) {
      const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
      const todayHours = restaurant.openingHours[today as keyof WorkingHours];

      // Eğer bugün manuel kapalıysa
      if (todayHours?.isClosed) {
        // Yarın kontrol et
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(tomorrow).toLowerCase();
        const tomorrowHours = restaurant.openingHours[tomorrowDay as keyof WorkingHours];

        if (tomorrowHours && !tomorrowHours.isClosed) {
          const nextOpening = new Date(tomorrow);
          const [openHour, openMinute] = tomorrowHours.open.split(':').map(Number);
          nextOpening.setHours(openHour, openMinute, 0, 0);

          return {
            isOpen: false,
            nextOpeningTime: nextOpening,
            statusText: 'Kapalı'
          };
        }

        return {
          isOpen: false,
          statusText: 'Kapalı'
        };
      }

      // Çalışma saatlerine göre kontrol et
      const isOpenByHours = isRestaurantOpenBasedOnHours(restaurant.openingHours);

      if (isOpenByHours) {
        return {
          isOpen: true,
          statusText: 'Açık'
        };
      }

      // Kapalıysa, bugün tekrar açılacak mı kontrol et
      if (todayHours && todayHours.open && todayHours.close) {
        const nextOpening = new Date();
        const [openHour, openMinute] = todayHours.open.split(':').map(Number);
        nextOpening.setHours(openHour, openMinute, 0, 0);

        // Eğer bugünkü açılış saati geçmişteyse, yarını kontrol et
        if (nextOpening <= new Date()) {
          nextOpening.setDate(nextOpening.getDate() + 1);
        }

        return {
          isOpen: false,
          nextOpeningTime: nextOpening,
          statusText: 'Kapalı'
        };
      }
    }

    // Genel olarak açık ve çalışma saatleri yoksa
    return {
      isOpen: true,
      statusText: 'Açık'
    };
  }

  // Eğer genel durum belirtilmemişse, çalışma saatlerine göre kontrol et
  if (!restaurant.openingHours) {
    return {
      isOpen: true,
      statusText: 'Açık'
    };
  }

  const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
  const todayHours = restaurant.openingHours[today as keyof WorkingHours];

  // Eğer bugün için çalışma saati tanımlanmamışsa, kapalı kabul et
  if (!todayHours) {
    return {
      isOpen: false,
      statusText: 'Kapalı'
    };
  }

  // Eğer bugün kapalıysa
  if (todayHours.isClosed) {
    return {
      isOpen: false,
      statusText: 'Kapalı'
    };
  }

  // Çalışma saatlerine göre kontrol et
  const isOpen = isRestaurantOpenBasedOnHours(restaurant.openingHours);

  if (isOpen) {
    return {
      isOpen: true,
      statusText: 'Açık'
    };
  }

  return {
    isOpen: false,
    statusText: 'Kapalı'
  };
}

/**
 * Çalışma saatlerini kısa formatta döndürür (örn: "09:00-22:00")
 */
export function formatWorkingHours(workingHours: WorkingHours): string {
  const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
  const todayHours = workingHours[today as keyof WorkingHours];

  // Kapalı yazma, sadece saat aralığını göster
  if (todayHours && todayHours.open && todayHours.close) {
    return `${todayHours.open}-${todayHours.close}`;
  }

  return '08:00-22:00';
}

/**
 * Tüm çalışma saatlerini detaylı formatta döndürür
 */
export function formatAllWorkingHours(workingHours: WorkingHours): string {
  const daysTr = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar'
  };

  const dayOrder: (keyof WorkingHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return dayOrder.map(day => {
    const dayHours = workingHours[day];
    const dayName = daysTr[day];

    if (dayHours.isClosed) {
      return `${dayName}: Kapalı`;
    }

    return `${dayName}: ${dayHours.open}-${dayHours.close}`;
  }).join('\n');
}