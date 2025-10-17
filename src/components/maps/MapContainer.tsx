"use client";

import { useRef, useEffect, useState, ReactNode } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
  InfoWindow,
  Circle
} from '@react-google-maps/api';

// Google Maps API anahtarı
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Harita genişliği ve yüksekliği
interface MapContainerProps {
  children?: ReactNode;
  center?: google.maps.LatLngLiteral;
  zoom?: number;
  markers?: MapMarker[];
  directions?: google.maps.DirectionsResult | null;
  circles?: MapCircle[];
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onLoad?: (map: google.maps.Map) => void;
  onMarkerDragEnd?: (markerId: string, position: google.maps.LatLngLiteral) => void;
  className?: string;
  mapContainerStyle?: React.CSSProperties;
}

// Harita işaretleyici tipi
export interface MapMarker {
  id: string;
  position: google.maps.LatLngLiteral;
  title?: string;
  icon?: string | google.maps.Icon | google.maps.Symbol;
  info?: ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  onDragEnd?: (position: google.maps.LatLngLiteral) => void;
}

// Harita daire tipi (servis alanı için)
export interface MapCircle {
  id: string;
  center: google.maps.LatLngLiteral;
  radius: number; // metre cinsinden
  options?: google.maps.CircleOptions;
}

// Varsayılan konum (İstanbul)
export const DEFAULT_CENTER = {
  lat: 41.0082,
  lng: 28.9784,
};

// Harita yükleme kancası
export const useGoogleMapsApi = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
    libraries: ['places', 'geometry', 'visualization'],
  });

  return { isLoaded, loadError };
};

// Harita bileşeni
export const MapContainer = ({
  children,
  center = DEFAULT_CENTER,
  zoom = 12,
  markers = [],
  directions = null,
  circles = [],
  onClick,
  onLoad,
  onMarkerDragEnd,
  className = '',
  mapContainerStyle = { width: '100%', height: '400px' },
}: MapContainerProps) => {
  const { isLoaded, loadError } = useGoogleMapsApi();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Harita yüklendiğinde
  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    setMapInstance(map);
    if (onLoad) onLoad(map);
  };

  // Harita yüklenemediğinde
  if (loadError) {
    return <div>Harita yüklenirken bir hata oluştu</div>;
  }

  // Harita yüklenene kadar bekle
  if (!isLoaded) {
    return <div>Harita yükleniyor...</div>;
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onClick={onClick}
        onLoad={handleMapLoad}
        options={{
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          scrollwheel: true,
          disableDoubleClickZoom: false,
        }}
      >
        {/* İşaretleyiciler */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            title={marker.title}
            icon={marker.icon}
            draggable={marker.draggable}
            onClick={() => {
              setSelectedMarker(marker);
              if (marker.onClick) marker.onClick();
            }}
            onDragEnd={(e) => {
              if (e.latLng && marker.onDragEnd) {
                const newPosition = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                };
                marker.onDragEnd(newPosition);
              }
              if (e.latLng && onMarkerDragEnd) {
                const newPosition = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                };
                onMarkerDragEnd(marker.id, newPosition);
              }
            }}
          />
        ))}

        {/* Seçili işaretleyici bilgi penceresi */}
        {selectedMarker && selectedMarker.info && (
          <InfoWindow
            position={selectedMarker.position}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div>{selectedMarker.info}</div>
          </InfoWindow>
        )}

        {/* Daireler (Servis alanları) */}
        {circles.map((circle) => (
          <Circle
            key={circle.id}
            center={circle.center}
            radius={circle.radius}
            options={{
              fillColor: '#FF9800',
              fillOpacity: 0.2,
              strokeColor: '#FF9800',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              ...circle.options,
            }}
          />
        ))}

        {/* Yol tarifi */}
        {directions && <DirectionsRenderer directions={directions} />}

        {/* Ek bileşenler */}
        {children}
      </GoogleMap>
    </div>
  );
};