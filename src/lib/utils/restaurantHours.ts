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