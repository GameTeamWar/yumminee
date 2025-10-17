"use client";

// Harita yardımcı fonksiyonları
import { useState } from 'react';

// Google Maps Directions servisi için tip
declare global {
  interface Window {
    google: typeof google;
  }
}

// Konum arası mesafe hesaplama (metre cinsinden)
export const calculateDistance = (
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral
): number => {
  // SSR kontrolü - client-side'da değilsek 0 döndür
  if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.geometry) {
    console.warn('Google Maps API henüz yüklenmedi veya geometry kütüphanesi mevcut değil');
    return 0;
  }

  try {
    // Google Maps geometry kütüphanesiyle mesafe hesapla
    const originLatLng = new google.maps.LatLng(origin.lat, origin.lng);
    const destLatLng = new google.maps.LatLng(destination.lat, destination.lng);

    // Metre cinsinden mesafe
    return google.maps.geometry.spherical.computeDistanceBetween(originLatLng, destLatLng);
  } catch (error) {
    console.error('Mesafe hesaplama hatası:', error);
    return 0;
  }
};

// Konum arası kilometre hesaplama
export const calculateDistanceInKm = (
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral
): number => {
  const meters = calculateDistance(origin, destination);
  return parseFloat((meters / 1000).toFixed(2)); // km cinsinden, 2 ondalık basamak
};

// İki nokta arası rota hesaplama
export const calculateRoute = (
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
): Promise<google.maps.DirectionsResult> => {
  if (typeof window === 'undefined' || !window.google) {
    return Promise.reject('Google Maps API henüz yüklenmedi');
  }

  try {
    const directionsService = new google.maps.DirectionsService();

    return new Promise((resolve, reject) => {
      directionsService.route(
        {
          origin,
          destination,
          travelMode,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(`Yol tarifi hesaplama hatası: ${status}`);
          }
        }
      );
    });
  } catch (error) {
    console.error('Rota hesaplama hatası:', error);
    return Promise.reject(error);
  }
};

// Geocoding: Adres -> Koordinat dönüşümü
export const geocodeAddress = async (address: string): Promise<google.maps.LatLngLiteral | null> => {
  if (typeof window === 'undefined' || !window.google) {
    console.error('Google Maps API henüz yüklenmedi');
    return null;
  }

  try {
    const geocoder = new google.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({ lat: location.lat(), lng: location.lng() });
        } else {
          console.error(`Geocoding hatası: ${status}`);
          resolve(null); // Hata durumunda null döndür
        }
      });
    });
  } catch (error) {
    console.error('Geocoding hatası:', error);
    return null;
  }
};

// Reverse Geocoding: Koordinat -> Adres dönüşümü
export const reverseGeocode = async (
  latlng: google.maps.LatLngLiteral
): Promise<string | null> => {
  if (typeof window === 'undefined' || !window.google) {
    console.error('Google Maps API henüz yüklenmedi');
    return null;
  }

  try {
    const geocoder = new google.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          console.error(`Reverse geocoding hatası: ${status}`);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Reverse geocoding hatası:', error);
    return null;
  }
};

// Mevcut konumu alma kancası
export const useCurrentLocation = () => {
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Konum servisleri tarayıcınız tarafından desteklenmiyor');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(`Konum alma hatası: ${err.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  return { currentLocation, loading, error, getCurrentLocation };
};

// Konum izleme kancası
export const useLocationTracking = () => {
  const [trackingLocation, setTrackingLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setTrackingError('Konum servisleri tarayıcınız tarafından desteklenmiyor');
      return;
    }

    setIsTracking(true);
    setTrackingError(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setTrackingLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        setTrackingError(`Konum izleme hatası: ${err.message}`);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
    }
  };

  return {
    trackingLocation,
    isTracking,
    trackingError,
    startTracking,
    stopTracking,
  };
};