"use client";

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

export interface LocationPickerMapProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  searchQuery?: string;
  searchTrigger?: number;
  currentLocation?: { lat: number; lng: number; address: string } | null;
}

const defaultCenter = {
  lat: 41.0082,
  lng: 28.9784
};

const containerStyle = {
  width: '100%',
  height: '100%'
};

const libraries: ("places")[] = ["places"];

const LocationPickerMap = ({ onLocationSelect, searchQuery, searchTrigger, currentLocation }: LocationPickerMapProps) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // Debug için
  useEffect(() => {
    console.log('Google Maps API Key:', apiKey ? 'Mevcut' : 'BULUNAMADI!');
    console.log('API Key uzunluğu:', apiKey.length);
  }, [apiKey]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: libraries
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(
    currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null
  );
  const [center, setCenter] = useState(
    currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : defaultCenter
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // CurrentLocation değiştiğinde haritayı güncelle ve reverse geocoding yap
  useEffect(() => {
    if (currentLocation && map && window.google && window.google.maps && window.google.maps.Geocoder) {
      const position = { lat: currentLocation.lat, lng: currentLocation.lng };
      setMarkerPosition(position);
      setCenter(position);
      map.panTo(position);
      map.setZoom(17);

      // Eğer adres "Konum alınıyor..." ise reverse geocoding yap
      if (currentLocation.address === 'Konum alınıyor...') {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: position }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            onLocationSelect({
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              address: results[0].formatted_address
            });
          } else {
            console.warn('Reverse geocoding başarısız:', status);
            // Geocoding başarısız olursa koordinatları göster
            const coordAddress = `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
            onLocationSelect({
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              address: coordAddress
            });
          }
        });
      }
    }
  }, [currentLocation, map, onLocationSelect]);

  // Haritaya tıklandığında
  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && window.google && window.google.maps && window.google.maps.Geocoder) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const position = { lat, lng };

      setMarkerPosition(position);

      // Reverse geocoding ile adresi al
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          onLocationSelect({
            lat,
            lng,
            address
          });
        } else {
          console.warn('Reverse geocoding başarısız:', status);
          // Geocoding başarısız olursa koordinatları göster
          const coordAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          onLocationSelect({
            lat,
            lng,
            address: coordAddress
          });
        }
      });
    }
  }, [onLocationSelect]);

  // Arama yapıldığında (searchTrigger değiştiğinde)
  useEffect(() => {
    if (searchQuery && searchTrigger && searchTrigger > 0 && map && window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          const position = { lat, lng };

          setMarkerPosition(position);
          setCenter(position);
          map.panTo(position);
          map.setZoom(17);

          onLocationSelect({
            lat,
            lng,
            address: results[0].formatted_address
          });
        } else {
          console.error('Arama sonucu bulunamadı:', status);
        }
      });
    }
  }, [searchTrigger, searchQuery, map, onLocationSelect]);

  // Debug için hata loglama
  useEffect(() => {
    if (loadError) {
      console.error('Google Maps yükleme hatası:', loadError);
    }
  }, [loadError]);

  useEffect(() => {
    console.log('Google Maps yükleme durumu:', { isLoaded, loadError: !!loadError });
  }, [isLoaded, loadError]);

  if (loadError) {
    return (
      <div className="h-full w-full bg-red-50 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium mb-2">Harita yüklenemedi</p>
          <p className="text-sm text-red-500 mb-2">Google Maps API hatası</p>
          <p className="text-xs text-gray-500 mb-4">Lütfen sayfayı yenileyin veya internet bağlantınızı kontrol edin</p>
          {!apiKey && (
            <p className="text-xs text-red-500 bg-red-100 p-2 rounded mb-2">
              ⚠️ Google Maps API anahtarı bulunamadı!
            </p>
          )}
          <p className="text-xs text-gray-400">
            Hata detayı: {loadError.message}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium mb-2">Harita yükleniyor...</p>
          <p className="text-sm text-gray-500 mb-4">Google Maps hazırlanıyor</p>
          {!apiKey && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-600 font-medium">⚠️ API Anahtarı Hatası</p>
              <p className="text-xs text-red-500 mt-1">
                Google Maps API anahtarı bulunamadı. Lütfen .env.local dosyasına NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ekleyin.
              </p>
            </div>
          )}
          <div className="space-y-2 text-xs text-gray-400">
            <p>• İnternet bağlantınız kontrol ediliyor</p>
            <p>• Google Maps API yükleniyor</p>
            <p>• Harita bileşenleri hazırlanıyor</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={onMapClick}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      }}
    >
      {markerPosition && (
        <Marker
          position={markerPosition}
          animation={google.maps.Animation.DROP}
          icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 40)
          }}
        />
      )}
    </GoogleMap>
  );
};

export default LocationPickerMap;
