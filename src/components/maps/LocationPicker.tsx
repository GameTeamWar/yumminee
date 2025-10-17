"use client";

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapContainer, DEFAULT_CENTER } from '@/components/maps/MapContainer';
import { geocodeAddress, calculateRoute, calculateDistanceInKm } from '@/lib/maps/map-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GeoPoint } from 'firebase/firestore';

interface AddressDetails {
  buildingNumber: string;
  hasElevator: boolean;
  apartmentComplex: string;
  detailedAddress: string;
  floor: string;
  apartment: string;
  block?: string; // Blok bilgisi eklendi
  addressName?: string; // Adres ismi eklendi
}

interface LocationPickerProps {
  onLocationSelected?: (location: { 
    address: string; 
    geoPoint: GeoPoint;
    addressDetails: AddressDetails;
  }) => void;
  onLocationChange?: (location: google.maps.LatLngLiteral, address: string) => void;
  defaultAddress?: string;
  showAddressForm?: boolean; // Form gösterilsin mi?
  showSelectedAddressInfo?: boolean; // Seçilen adres bilgisini göster?
  showNextButton?: boolean; // İleri butonu gösterilsin mi?
  onNext?: () => void; // İleri butonu için callback
  showSearchControls?: boolean; // Arama kontrollerini göster?
}

export const LocationPicker = ({ onLocationSelected, onLocationChange, defaultAddress = '', showAddressForm = true, showSelectedAddressInfo = true, showNextButton = false, onNext, showSearchControls = true }: LocationPickerProps) => {
  const [address, setAddress] = useState(defaultAddress);
  const [location, setLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addressDetails, setAddressDetails] = useState<AddressDetails>({
    buildingNumber: '',
    hasElevator: false,
    apartmentComplex: '',
    detailedAddress: '',
    floor: '',
    apartment: '',
    block: '',
    addressName: ''
  });
  const [internalShowAddressForm, setInternalShowAddressForm] = useState(false);
  const [formErrors, setFormErrors] = useState({
    addressName: false,
    buildingNumber: false,
    apartment: false,
    detailedAddress: false
  });

  // Konum seçildiğinde adres formunu göster (sadece showAddressForm true ise)
  const handleLocationSelected = useCallback((selectedLocation: google.maps.LatLngLiteral, selectedAddressText: string) => {
    setLocation(selectedLocation);
    setSelectedAddress(selectedAddressText);
    setAddress(selectedAddressText);
    if (showAddressForm) {
      setInternalShowAddressForm(true);
    }
    // Konum değiştiğinde callback çağır
    if (onLocationChange) {
      onLocationChange(selectedLocation, selectedAddressText);
    }
  }, [showAddressForm, onLocationChange]);

  // Adres arama işlevi
  const handleSearch = useCallback(async () => {
    if (!address) return;

    try {
      const result = await geocodeAddress(address);
      if (result) {
        handleLocationSelected(result, address);
      }
    } catch (error) {
      console.error('Adres arama hatası:', error);
    }
  }, [address, handleLocationSelected]);

  // Haritada tıklama işlevi
  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const clickedLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      
      // Reverse geocoding ile adresi al
      try {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: clickedLocation }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const clickedAddress = results[0].formatted_address;
            handleLocationSelected(clickedLocation, clickedAddress);
          }
        });
      } catch (error) {
        console.error('Tıklanan konum için adres bulunamadı:', error);
      }
    }
  }, [handleLocationSelected]);

  // Marker drag sonu işlevi
  const handleMarkerDragEnd = useCallback((markerId: string, position: google.maps.LatLngLiteral) => {
    // Drag işlemi tamamlandı bildirimi
    console.log('Konum güncellendi:', position);

    // Reverse geocoding ile adresi al
    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const draggedAddress = results[0].formatted_address;
          handleLocationSelected(position, draggedAddress);
        }
      });
    } catch (error) {
      console.error('Sürüklenen konum için adres bulunamadı:', error);
    }
  }, [handleLocationSelected]);

  // Mevcut konumu kullan - sadece butona basıldığında
  const handleUseMyLocation = useCallback(async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      // Reverse geocoding ile adresi al
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: currentLocation }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const currentAddress = results[0].formatted_address;
          handleLocationSelected(currentLocation, currentAddress);
        }
      });
    } catch (error) {
      console.error('Konum alınamadı:', error);
    }
  }, [handleLocationSelected]);

  // Adres metnini bina numarası ile düzelt
  const adjustAddressWithBuildingNumber = useCallback((originalAddress: string, buildingNumber: string): string => {
    if (!buildingNumber || !originalAddress) return originalAddress;

    // "No:" veya "No " pattern'lerini ara
    const noPattern = /(No[:\s]*)(\d+)/i;
    const match = originalAddress.match(noPattern);

    if (match) {
      // Mevcut bina numarasını yeni ile değiştir
      return originalAddress.replace(match[0], `No:${buildingNumber}`);
    } else {
      // "No:" bulunamazsa, adres sonuna ekle
      return `${originalAddress}, No:${buildingNumber}`;
    }
  }, []);

  // Adres detayları formu submit
  const handleAddressFormSubmit = useCallback(() => {
    if (!location || !selectedAddress || !onLocationSelected) return;

    // Form hatalarını temizle
    setFormErrors({
      addressName: false,
      buildingNumber: false,
      apartment: false,
      detailedAddress: false
    });

    // Tüm gerekli alanları kontrol et
    const errors = {
      addressName: !addressDetails.addressName,
      buildingNumber: !addressDetails.buildingNumber,
      apartment: !addressDetails.apartment,
      detailedAddress: !addressDetails.detailedAddress
    };

    // Hata varsa state'i güncelle ve çık
    if (Object.values(errors).some(Boolean)) {
      setFormErrors(errors);
      return;
    }

    // Adres metnini bina numarası ile düzelt
    const adjustedAddress = adjustAddressWithBuildingNumber(selectedAddress, addressDetails.buildingNumber);

    onLocationSelected({
      address: adjustedAddress, // Düzeltilmiş adres
      geoPoint: new GeoPoint(location.lat, location.lng), // Sadece enlem boylam
      addressDetails
    });
  }, [location, selectedAddress, addressDetails, onLocationSelected, adjustAddressWithBuildingNumber]);

  // İşaretçiler - drag edilebilir yapalım
  const markers = location
    ? [
        {
          id: 'selected-location',
          position: location,
          title: 'Seçilen Konum - Kurye buraya gelecek (Sürükleyerek ayarlayın)',
          draggable: true, // Drag edilebilir yap
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#FF6B35" stroke="white" stroke-width="3"/>
                <circle cx="20" cy="20" r="8" fill="white"/>
                <circle cx="20" cy="20" r="4" fill="#FF6B35"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 40),
          },
        },
      ]
    : [];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="address" className="text-base font-medium">Adres Seçimi</Label>
              <div className="text-xs text-gray-500 flex items-center space-x-1">
                <span>🖱️</span>
                <span>Tıklayın veya sürükleyin</span>
              </div>
            </div>

          {showSearchControls && (
            <div className="flex space-x-2">
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onFocus={() => {
                  // Arama kutusuna odaklandığında seçili konumu temizle
                  // Bu sadece bir kez yapılır ve kullanıcı yazmaya başladığında konum kalıcı olarak temizlenir
                  if (location) {
                    setLocation(null);
                    setSelectedAddress(null);
                    setAddress(''); // Arama kutusunu da temizle
                    setAddressDetails({
                      buildingNumber: '',
                      hasElevator: false,
                      apartmentComplex: '',
                      detailedAddress: '',
                      floor: '',
                      apartment: '',
                      block: '',
                      addressName: ''
                    });
                    setInternalShowAddressForm(false);
                    // onLocationChange callback'ini çağır (konum temizlendi)
                    if (onLocationChange) {
                      onLocationChange({ lat: 0, lng: 0 }, '');
                    }
                  }
                }}
                placeholder="Adres girin veya haritadan seçin"
                className="flex-1"
              />
              <Button onClick={handleSearch} type="button" variant="default">
                🔍 Ara
              </Button>
              <Button onClick={handleUseMyLocation} variant="outline" type="button">
                📍 Konumum
              </Button>
            </div>
          )}
          </div>

          <MapContainer
            center={location || DEFAULT_CENTER}
            zoom={location ? 18 : 12} // Daha yüksek zoom seviyesi
            markers={markers}
            onClick={handleMapClick}
            onMarkerDragEnd={handleMarkerDragEnd}
            className="mt-4 rounded-md overflow-hidden border-2 border-orange-200"
            mapContainerStyle={{ height: '500px', width: '100%' }} // Daha büyük harita
          />

          {/* Harita Kontrolleri */}
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <span>�️</span>
                <span>Yakınlaştırmak için fare tekerleğini kullanın</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>📍</span>
                <span>Konum seçmek için tıklayın veya sürükleyin</span>
              </span>
            </div>
            {location && (
              <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                Zoom: {location ? 'Yüksek (Detaylı)' : 'Normal'}
              </div>
            )}
          </div>

          {/* İleri butonu */}
          {showNextButton && location && onNext && (
            <div className="flex justify-end mt-4">
              <Button onClick={onNext} className="flex items-center gap-2">
                İleri
                <span>→</span>
              </Button>
            </div>
          )}

          {showSelectedAddressInfo && selectedAddress && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📍</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Seçilen Konum Detayları</h4>
                  <p className="text-sm text-blue-800 mb-2">{selectedAddress}</p>

                  {!internalShowAddressForm ? (
                    <Button
                      onClick={() => setInternalShowAddressForm(true)}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      Adres Detaylarını Gir
                    </Button>
                  ) : (
                    <div className="mt-4 space-y-3 bg-white p-4 rounded-md border">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900">Teslimat Adresi Detayları</h5>
                        <Button
                          onClick={() => setInternalShowAddressForm(false)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </Button>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Adres İsmi *</Label>
                        <Input
                          value={addressDetails.addressName}
                          onChange={(e) => setAddressDetails(prev => ({ ...prev, addressName: e.target.value }))}
                          placeholder="örn: Ev, İş, Anne Evi"
                          className={`h-8 text-sm ${formErrors.addressName ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">Bina No *</Label>
                          <Input
                            value={addressDetails.buildingNumber}
                            onChange={(e) => {
                              const newBuildingNumber = e.target.value;
                              setAddressDetails(prev => ({ ...prev, buildingNumber: newBuildingNumber }));
                              // Bina numarası değiştiğinde adresi otomatik güncelle
                              if (selectedAddress) {
                                const adjustedAddress = adjustAddressWithBuildingNumber(selectedAddress, newBuildingNumber);
                                setSelectedAddress(adjustedAddress);
                                setAddress(adjustedAddress);
                              }
                            }}
                            placeholder="örn: 15"
                            className={`h-8 text-sm ${formErrors.buildingNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Kat</Label>
                          <Input
                            value={addressDetails.floor}
                            onChange={(e) => setAddressDetails(prev => ({ ...prev, floor: e.target.value }))}
                            placeholder="örn: 3"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">Daire No *</Label>
                          <Input
                            value={addressDetails.apartment}
                            onChange={(e) => setAddressDetails(prev => ({ ...prev, apartment: e.target.value }))}
                            placeholder="örn: 12"
                            className={`h-8 text-sm ${formErrors.apartment ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Asansör</Label>
                          <select
                            value={addressDetails.hasElevator ? 'yes' : 'no'}
                            onChange={(e) => setAddressDetails(prev => ({ ...prev, hasElevator: e.target.value === 'yes' }))}
                            className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="yes">Var</option>
                            <option value="no">Yok</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Apartman/Site Adı</Label>
                        <Input
                          value={addressDetails.apartmentComplex}
                          onChange={(e) => setAddressDetails(prev => ({ ...prev, apartmentComplex: e.target.value }))}
                          placeholder="örn: Güneş Apartmanı"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Blok</Label>
                        <Input
                          value={addressDetails.block}
                          onChange={(e) => setAddressDetails(prev => ({ ...prev, block: e.target.value }))}
                          placeholder="örn: A Blok"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Detaylı Adres Açıklaması *</Label>
                        <Textarea
                          value={addressDetails.detailedAddress}
                          onChange={(e) => setAddressDetails(prev => ({ ...prev, detailedAddress: e.target.value }))}
                          placeholder="örn: Kapı rengi kırmızı, zilde 'Ahmet' yazıyor"
                          className={`min-h-[60px] text-sm ${formErrors.detailedAddress ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => setInternalShowAddressForm(false)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          İptal
                        </Button>
                        <Button
                          onClick={handleAddressFormSubmit}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          Adresi Onayla
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


        </div>
      </CardContent>
    </Card>
  );
};

interface DeliveryRoutePlannerProps {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  originTitle?: string;
  destinationTitle?: string;
}

export const DeliveryRoutePlanner = ({
  origin,
  destination,
  originTitle = 'Başlangıç',
  destinationTitle = 'Varış',
}: DeliveryRoutePlannerProps) => {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateDirections = useCallback(async () => {
    setLoading(true);
    try {
      const result = await calculateRoute(origin, destination);
      setDirections(result);
      
      // Rota bilgilerini çıkar
      const route = result.routes[0];
      if (route && route.legs[0]) {
        setDistance(calculateDistanceInKm(origin, destination));
        setDuration(route.legs[0].duration?.text || null);
      }
    } catch (error) {
      console.error('Rota hesaplama hatası:', error);
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  // Marker oluştur
  const markers = [
    {
      id: 'origin',
      position: origin,
      title: originTitle,
      icon: '/images/restaurant-marker.png',
    },
    {
      id: 'destination',
      position: destination,
      title: destinationTitle,
      icon: '/images/delivery-marker.png',
    },
  ];

  // Haritanın ortalaması
  const center = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Teslimat Rotası</h3>
            <Button onClick={calculateDirections} disabled={loading}>
              {loading ? 'Hesaplanıyor...' : 'Rota Hesapla'}
            </Button>
          </div>

          <MapContainer
            center={center}
            zoom={12}
            markers={markers}
            directions={directions}
            className="h-[400px] w-full rounded-md overflow-hidden"
          />

          {distance && duration && (
            <div className="flex flex-col space-y-1 text-sm">
              <div>
                <strong>Mesafe:</strong> {distance} km
              </div>
              <div>
                <strong>Tahmini Süre:</strong> {duration}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};