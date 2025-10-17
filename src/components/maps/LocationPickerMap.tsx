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

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

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
    if (currentLocation && map) {
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
          }
        });
      }
    }
  }, [currentLocation, map, onLocationSelect]);

  // Haritaya tıklandığında
  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
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
        }
      });
    }
  }, [onLocationSelect]);

  // Arama yapıldığında (searchTrigger değiştiğinde)
  useEffect(() => {
    if (searchQuery && searchTrigger && searchTrigger > 0 && map) {
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
          <p className="text-red-600 font-medium">Harita yüklenemedi</p>
          <p className="text-sm text-red-500 mt-2">Google Maps API hatası</p>
          <p className="text-xs text-gray-500 mt-1">Lütfen internet bağlantınızı kontrol edin</p>
          <p className="text-xs text-gray-400 mt-2">Hata: {loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-500 font-medium">Harita yükleniyor...</p>
          <p className="text-xs text-gray-400 mt-1">Google Maps hazırlanıyor</p>
          {!apiKey && (
            <p className="text-xs text-red-500 mt-2">⚠️ API Key bulunamadı!</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Bu işlem birkaç saniye sürebilir
          </p>
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
