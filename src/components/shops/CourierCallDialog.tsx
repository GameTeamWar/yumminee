"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapContainer, DEFAULT_CENTER } from '@/components/maps/MapContainer';
import { getAvailableCouriers, assignCourierToOrder, getUserBalance, updateUserBalance, processCourierPayment } from '@/lib/firebase/firestore';
import { calculateRoute, calculateDistanceInKm } from '@/lib/maps/map-utils';
import { GeoPoint } from 'firebase/firestore';
import { toast } from 'sonner';
import { Courier, Restaurant, Order } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';

interface CourierCallDialogProps {
  order: Order;
  restaurant: Restaurant;
  onCourierAssigned: () => void;
}

export default function CourierCallDialog({ 
  order, 
  restaurant, 
  onCourierAssigned 
}: CourierCallDialogProps) {
  const [availableCouriers, setAvailableCouriers] = useState<Courier[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [restaurantBalance, setRestaurantBalance] = useState<number>(0);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  
  // Restoran konumu
  const restaurantLocation = restaurant.location 
    ? { lat: restaurant.location.latitude, lng: restaurant.location.longitude } 
    : DEFAULT_CENTER;
  
  // Teslimat konumu
  const deliveryLocation = order.location 
    ? { lat: order.location.latitude, lng: order.location.longitude } 
    : DEFAULT_CENTER;

  // Tüm aktif kuryeleri getir
  useEffect(() => {
    const fetchCouriers = async () => {
      setLoading(true);
      try {
        const couriers = await getAvailableCouriers(
          restaurant.location || new GeoPoint(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
        );
        setAvailableCouriers(couriers);
      } catch (error) {
        console.error('Kurye listesi getirme hatası:', error);
        toast.error('Kuryelere ulaşılamadı.');
      } finally {
        setLoading(false);
      }
    };
    
    const getRestaurantBalance = async () => {
      try {
        if (restaurant.id) {
          const balance = await getUserBalance(restaurant.id);
          setRestaurantBalance(balance);
        }
      } catch (error) {
        console.error('Bakiye getirme hatası:', error);
      }
    };

    fetchCouriers();
    getRestaurantBalance();
  }, [restaurant]);

  // Kurye seçildiğinde mesafe ve ücret hesapla
  useEffect(() => {
    const calculateDeliveryInfo = async () => {
      if (!selectedCourier || !selectedCourier.currentLocation) return;
      
      try {
        const courierLocation = {
          lat: selectedCourier.currentLocation.latitude,
          lng: selectedCourier.currentLocation.longitude
        };
        
        // Restorana olan mesafeyi hesapla
        const distanceToRestaurant = calculateDistanceInKm(courierLocation, restaurantLocation);
        
        // Restorandan teslimat adresine olan mesafeyi hesapla
        const distanceToDelivery = calculateDistanceInKm(restaurantLocation, deliveryLocation);
        
        // Toplam mesafe
        const totalDistance = distanceToRestaurant + distanceToDelivery;
        setDistance(parseFloat(totalDistance.toFixed(2)));
        
        // Teslimat ücreti hesapla
        const fee = totalDistance * 2.5; // Her km için 2.5 TL
        setDeliveryFee(parseFloat(fee.toFixed(2)));
        
        // Rota hesapla (kuryeden restorana, sonra müşteriye)
        const routeDirections = await calculateRoute(courierLocation, restaurantLocation);
        setDirections(routeDirections);
      } catch (error) {
        console.error('Mesafe hesaplama hatası:', error);
      }
    };

    if (selectedCourier) {
      calculateDeliveryInfo();
    } else {
      setDistance(null);
      setDeliveryFee(null);
      setDirections(null);
    }
  }, [selectedCourier, restaurantLocation, deliveryLocation]);

  const handleCourierCall = async () => {
    if (!selectedCourier) {
      toast.error('Lütfen bir kurye seçin');
      return;
    }
    
    if (!distance || !deliveryFee) {
      toast.error('Mesafe ve teslimat ücreti hesaplanamadı');
      return;
    }
    
    if (restaurantBalance < deliveryFee) {
      toast.error('Yetersiz bakiye. Lütfen hesabınıza para yükleyin.');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Siparişe kurye ata
      await assignCourierToOrder(order.id, selectedCourier.id);
      
      // 2. Restoran bakiyesinden teslimat ücretini düş
      await updateUserBalance(restaurant.id, deliveryFee, false);
      
      // 3. Kurye ödemesini işle
      await processCourierPayment(order.id, selectedCourier.id, distance);
      
      toast.success(`${selectedCourier.name} kurye çağırma başarılı!`);
      onCourierAssigned();
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Harita işaretleyicileri
  const mapMarkers = [
    {
      id: 'restaurant',
      position: restaurantLocation,
      title: 'Restoran',
      icon: '/images/restaurant-marker.png',
    },
    {
      id: 'delivery',
      position: deliveryLocation,
      title: 'Teslimat Adresi',
      icon: '/images/delivery-marker.png',
    },
  ];
  
  // Seçili kurye varsa ekle
  if (selectedCourier && selectedCourier.currentLocation) {
    mapMarkers.push({
      id: 'courier',
      position: {
        lat: selectedCourier.currentLocation.latitude,
        lng: selectedCourier.currentLocation.longitude
      },
      title: 'Kurye - ' + selectedCourier.name,
      icon: '/images/courier-marker.png',
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Kurye Çağır</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="map">Harita Görünümü</TabsTrigger>
            <TabsTrigger value="list">Kurye Listesi</TabsTrigger>
          </TabsList>
          
          <TabsContent value="map">
            <MapContainer
              center={restaurantLocation}
              zoom={13}
              markers={mapMarkers}
              directions={directions}
              className="h-[300px] w-full rounded-md overflow-hidden"
            />
            
            {selectedCourier && distance && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <h3 className="font-medium">Teslimat Bilgileri</h3>
                <div className="text-sm mt-1 space-y-1">
                  <p><strong>Kurye:</strong> {selectedCourier.name}</p>
                  <p><strong>Toplam Mesafe:</strong> {distance} km</p>
                  <p><strong>Tahmini Teslimat Ücreti:</strong> {deliveryFee} TL</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="list">
            <div className="space-y-2">
              <div className="flex justify-between mb-2">
                <div className="text-sm"><strong>Mevcut Bakiye:</strong> {restaurantBalance.toFixed(2)} TL</div>
                <Button variant="outline" size="sm">Para Yükle</Button>
              </div>
              
              {loading ? (
                <div className="py-8 text-center">Kuryeler yükleniyor...</div>
              ) : availableCouriers.length === 0 ? (
                <div className="py-8 text-center">Çevrede aktif kurye bulunamadı.</div>
              ) : (
                <RadioGroup 
                  value={selectedCourier?.id} 
                  onValueChange={(value) => {
                    const courier = availableCouriers.find(c => c.id === value);
                    setSelectedCourier(courier || null);
                  }}
                >
                  <div className="space-y-2">
                    {availableCouriers.map((courier) => (
                      <div key={courier.id} className="flex items-center space-x-2 border rounded-md p-3">
                        <RadioGroupItem value={courier.id} id={courier.id} />
                        <div className="flex-1">
                          <Label htmlFor={courier.id} className="font-medium">
                            {courier.name}
                          </Label>
                          <div className="text-sm text-muted-foreground">{courier.phoneNumber}</div>
                          <div className="flex items-center text-xs gap-2 mt-1">
                            <span className={`flex items-center gap-1 ${courier.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                              {courier.isOnline ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} 
                              {courier.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                            </span>
                            <span className={`flex items-center gap-1 ${courier.isAvailable ? 'text-green-600' : 'text-yellow-600'}`}>
                              {courier.isAvailable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {courier.isAvailable ? 'Müsait' : 'Meşgul'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="default"
            onClick={handleCourierCall}
            disabled={!selectedCourier || loading || !deliveryFee || restaurantBalance < (deliveryFee || 0)}
          >
            {loading ? 'İşleniyor...' : 'Kurye Çağır'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}