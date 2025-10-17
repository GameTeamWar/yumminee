"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  MapContainer, 
  DEFAULT_CENTER,
  MapMarker 
} from '@/components/maps/MapContainer';
import { useCurrentLocation } from '@/lib/maps/map-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateCourierStatus } from '@/lib/firebase/db';
import { toast } from 'sonner';
import { Order } from '@/types';
import { GeoPoint } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CourierDashboardProps {
  courierId: string;
  activeOrders: Order[];
  completedOrders: Order[];
}

export default function CourierDashboard({
  courierId,
  activeOrders = [],
  completedOrders = []
}: CourierDashboardProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const { currentLocation, loading, getCurrentLocation } = useCurrentLocation();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const params = useParams();

  // Courier statüsünü güncelle
  const updateStatus = async () => {
    try {
      // currentLocation'ı GeoPoint'e dönüştür
      const locationGeoPoint = currentLocation 
        ? new GeoPoint(currentLocation.lat, currentLocation.lng) 
        : undefined;
      
      await updateCourierStatus(
        courierId,
        isOnline,
        isAvailable,
        locationGeoPoint
      );
      toast.success('Durum başarıyla güncellendi');
    } catch (error) {
      toast.error('Durum güncellenirken hata oluştu');
    }
  };

  // Sipariş detaylarını görüntüle
  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  // Harita işaretleyicileri
  const mapMarkers: MapMarker[] = [];

  // Kurye konumunu ekle
  if (currentLocation) {
    mapMarkers.push({
      id: 'courier-location',
      position: currentLocation,
      title: 'Benim Konumum',
      icon: '/images/courier-marker.png',
    });
  }

  // Aktif siparişleri ekle
  activeOrders.forEach(order => {
    if (order.location) {
      // Teslimat adresi işaretleyicisi
      mapMarkers.push({
        id: `delivery-${order.id}`,
        position: {
          lat: order.location.latitude,
          lng: order.location.longitude
        },
        title: 'Teslimat Adresi',
        icon: '/images/delivery-marker.png',
        onClick: () => viewOrderDetails(order),
      });
      
      // Not: Restoran işaretleyicisi için restoran bilgisini getirmek gerekiyor
      // Bu kısım için getRestaurantById gibi bir fonksiyon kullanılmalı
      // Şimdilik restoran işaretleyicisini kaldırdık
    }
  });

  // Sipariş kartı
  const OrderCard = ({ order }: { order: Order }) => {
    const isActive = order.id === selectedOrder?.id;
    
    return (
      <div 
        className={`border rounded-lg p-4 mb-3 cursor-pointer transition ${
          isActive ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
        }`}
        onClick={() => viewOrderDetails(order)}
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Sipariş #{order.id.substring(0, 8)}</h4>
          <span className={`text-xs px-2 py-1 rounded-full ${
            order.status === 'ready' ? 'bg-yellow-100 text-yellow-800' : 
            order.status === 'delivering' ? 'bg-blue-100 text-blue-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {order.status === 'ready' ? 'Hazır' : 
             order.status === 'delivering' ? 'Teslimatta' : order.status}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          {new Date(order.createdAt.seconds * 1000).toLocaleString()}
        </p>
        <p className="font-medium">{order.total.toFixed(2)} TL</p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sol Panel */}
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Harita Görünümü</CardTitle>
          </CardHeader>
          <CardContent>
            <MapContainer
              center={currentLocation || DEFAULT_CENTER}
              zoom={currentLocation ? 15 : 12}
              markers={mapMarkers}
              directions={directions}
              className="h-[400px] w-full rounded-md overflow-hidden"
            />
            
            <div className="mt-4 flex items-center gap-4">
              <Button 
                onClick={getCurrentLocation} 
                disabled={loading}
              >
                {loading ? 'Konum alınıyor...' : 'Konumumu Güncelle'}
              </Button>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="online" 
                  checked={isOnline}
                  onCheckedChange={(value) => setIsOnline(!!value)}
                />
                <Label htmlFor="online">Çevrimiçi</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="available" 
                  checked={isAvailable}
                  disabled={!isOnline}
                  onCheckedChange={(value) => setIsAvailable(!!value)}
                />
                <Label htmlFor="available">Müsaitim</Label>
              </div>
              
              <Button 
                variant="outline" 
                onClick={updateStatus}
                disabled={loading}
              >
                Durumu Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sağ Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Siparişler</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="active" className="flex-1">Aktif ({activeOrders.length})</TabsTrigger>
                <TabsTrigger value="completed" className="flex-1">Tamamlanan ({completedOrders.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="active">
                <div className="max-h-96 overflow-y-auto pr-2">
                  {activeOrders.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">Aktif sipariş bulunmuyor</p>
                  ) : (
                    activeOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="completed">
                <div className="max-h-96 overflow-y-auto pr-2">
                  {completedOrders.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">Tamamlanmış sipariş bulunmuyor</p>
                  ) : (
                    completedOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {selectedOrder && (
          <Card>
            <CardHeader>
              <CardTitle>Sipariş Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Sipariş No:</span>
                  <span>#{selectedOrder.id.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Tarih:</span>
                  <span>{new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Tutar:</span>
                  <span>{selectedOrder.total.toFixed(2)} TL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Adres:</span>
                  <span className="text-right max-w-[70%]">{selectedOrder.address}</span>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      // Burada rota hesaplama ve navigasyon başlatma kodu yer alacak
                    }}
                  >
                    Navigasyonu Başlat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}