import { WorkingHours, Restaurant } from '@/types';

/**
 * Çalışma saatlerine göre restoranın şu anda açık olup olmadığını kontrol eder
 * @param workingHours Restoranın çalışma saatleri
 * @returns boolean - Restoran açık mı?
 */
export function isRestaurantOpenBasedOnHours(workingHours: WorkingHours): boolean {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Dakika cinsinden

  // Gün isimlerini diziye çevir
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[currentDay] as keyof WorkingHours;

  const todayHours = workingHours[todayKey];

  // Eğer bugün kapalıysa veya veri yoksa false döndür
  if (!todayHours || todayHours.isClosed) {
    return false;
  }

  // Açılış ve kapanış saatlerini dakika cinsine çevir
  const [openHour, openMinute] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;

  // Eğer kapanış saati açılış saatinden küçükse (örn: 23:00 - 02:00), gece yarısını geçtiği varsayılır
  if (closeTime < openTime) {
    // Gece yarısını geçen durum (örn: 23:00 - 02:00)
    return currentTime >= openTime || currentTime < closeTime;
  } else {
    // Normal durum (örn: 09:00 - 22:00)
    return currentTime >= openTime && currentTime < closeTime;
  }
}

/**
 * Bir restoranın çalışma saatlerini formatlar
 * @param workingHours Restoranın çalışma saatleri
 * @returns string - Formatlanmış çalışma saatleri
 */
export function formatWorkingHours(workingHours: WorkingHours): string {
  const now = new Date();
  const currentDay = now.getDay();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[currentDay] as keyof WorkingHours;

  const todayHours = workingHours[todayKey];

  if (!todayHours || todayHours.isClosed) {
    return 'Bugün Kapalı';
  }

  return `${todayHours.open} - ${todayHours.close}`;
}

/**
 * Tüm haftanın çalışma saatlerini formatlar
 * @param workingHours Restoranın çalışma saatleri
 * @returns string - Tüm haftanın formatlanmış çalışma saatleri
 */
export function formatAllWorkingHours(workingHours: WorkingHours): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  const formattedHours: string[] = [];

  days.forEach((dayKey, index) => {
    const dayHours = workingHours[dayKey as keyof WorkingHours];
    const dayName = dayNames[index];

    if (!dayHours || dayHours.isClosed) {
      formattedHours.push(`${dayName}: Kapalı`);
    } else {
      formattedHours.push(`${dayName}: ${dayHours.open} - ${dayHours.close}`);
    }
  });

  return formattedHours.join('\n');
}

/**
 * Restoranın bir sonraki açılış saatini hesaplar
 * @param workingHours Restoranın çalışma saatleri
 * @returns Date | null - Bir sonraki açılış saati, null ise hiç açılmayacak
 */
export function getNextOpeningTime(workingHours: WorkingHours): Date | null {
  const now = new Date();
  const currentDay = now.getDay();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Önce bugünkü günü kontrol et
  const todayKey = days[currentDay] as keyof WorkingHours;
  const todayHours = workingHours[todayKey];

  if (todayHours && !todayHours.isClosed) {
    const [openHour, openMinute] = todayHours.open.split(':').map(Number);
    const openingTime = new Date(now);
    openingTime.setHours(openHour, openMinute, 0, 0);

    if (openingTime > now) {
      return openingTime;
    }
  }

  // Bugünden sonraki 7 günü kontrol et
  for (let i = 1; i <= 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const checkDayKey = days[checkDay] as keyof WorkingHours;
    const checkDayHours = workingHours[checkDayKey];

    if (checkDayHours && !checkDayHours.isClosed) {
      const [openHour, openMinute] = checkDayHours.open.split(':').map(Number);
      const openingTime = new Date(now);
      openingTime.setDate(now.getDate() + i);
      openingTime.setHours(openHour, openMinute, 0, 0);
      return openingTime;
    }
  }

  return null; // Hiç açılmayacak
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
  // Eğer manuel olarak açık ise, saatlere bakmadan açık
  if (restaurant.isOpen === true) {
    return {
      isOpen: true,
      statusText: 'Açık'
    };
  }

  // Eğer manuel olarak kapalıysa, saatlere bak
  if (restaurant.isOpen === false && restaurant.openingHours) {
    const isOpenBasedOnHours = isRestaurantOpenBasedOnHours(restaurant.openingHours);
    
    if (isOpenBasedOnHours) {
      // Manuel kapalı ama saatlere göre açık olmalı, açık göster
      return {
        isOpen: true,
        statusText: 'Açık'
      };
    } else {
      // Manuel kapalı ve saatlere göre de kapalı
      return {
        isOpen: false,
        statusText: 'Kapalı'
      };
    }
  }

  // Çalışma saati bilgisi yoksa varsayılan olarak açık kabul et
  return {
    isOpen: true,
    statusText: 'Açık'
  };
}