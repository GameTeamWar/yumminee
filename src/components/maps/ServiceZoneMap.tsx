"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2, Save, Edit2, DollarSign, Clock, Target, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMap, useJsApiLoader, Polygon, InfoWindow, Marker, Circle } from '@react-google-maps/api';
import { getRestaurantByOwnerId, subscribeToDeliveryZones, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone } from '@/lib/firebase/db';
import { useAuth } from '@/contexts/AuthContext';

const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8ED4', '#7DCFB6', '#F79D84', '#9D84B7', '#FFB6B9',
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'
];

interface DeliveryZone {
  id: string;
  name: string;
  minPrice: number;
  deliveryTime: number;
  color: string;
  hexagonIds: string[];
  restaurantId?: string;
}

interface Hexagon {
  id: string;
  paths: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number };
  zoneId: string | null;
}

interface ServiceZoneMapProps {
  restaurantId?: string;
}

interface RestaurantLocation {
  lat: number;
  lng: number;
  address: string;
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 41.0082,
  lng: 28.9784
};

const libraries: ("drawing" | "geometry")[] = ["drawing", "geometry"];

function generateHexagon(center: { lat: number; lng: number }, radius: number): Array<{ lat: number; lng: number }> {
  const coordinates: Array<{ lat: number; lng: number }> = [];
  const radiusLat = radius / 111320;
  const radiusLng = radius / (111320 * Math.cos(center.lat * Math.PI / 180));
  
  // Pointy-top hexagon (flat side on top/bottom)
  for (let i = 0; i < 6; i++) {
    const angle = (60 * i - 30) * Math.PI / 180;
    const lat = center.lat + radiusLat * Math.sin(angle);
    const lng = center.lng + radiusLng * Math.cos(angle);
    coordinates.push({ lat, lng });
  }
  
  return coordinates;
}

function clipPolygonToCircle(
  polygon: Array<{ lat: number; lng: number }>,
  circleCenter: { lat: number; lng: number },
  radius: number
): Array<{ lat: number; lng: number }> {
  const clipped: Array<{ lat: number; lng: number }> = [];
  
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    
    // Noktaların daireden uzaklığını hesapla
    const currentDist = Math.sqrt(
      Math.pow((current.lat - circleCenter.lat) * 111320, 2) +
      Math.pow((current.lng - circleCenter.lng) * 111320 * Math.cos(circleCenter.lat * Math.PI / 180), 2)
    );
    
    const nextDist = Math.sqrt(
      Math.pow((next.lat - circleCenter.lat) * 111320, 2) +
      Math.pow((next.lng - circleCenter.lng) * 111320 * Math.cos(circleCenter.lat * Math.PI / 180), 2)
    );
    
    const currentInside = currentDist <= radius;
    const nextInside = nextDist <= radius;
    
    if (currentInside) {
      clipped.push(current);
    }
    
    // Eğer bir nokta içeride diğeri dışarıdaysa, kesişim noktasını bul
    if (currentInside !== nextInside) {
      // Basit linear interpolation ile kesişim noktası
      const ratio = (radius - currentDist) / (nextDist - currentDist);
      const intersection = {
        lat: current.lat + (next.lat - current.lat) * ratio,
        lng: current.lng + (next.lng - current.lng) * ratio
      };
      clipped.push(intersection);
    }
  }
  
  return clipped;
}

function generateHexagonalGrid(center: { lat: number; lng: number }, serviceRadius: number): Hexagon[] {
  const hexagons: Hexagon[] = [];
  const hexagonRadius = 300;
  
  // Pointy-top hexagon için boyutlar
  const hexWidth = Math.sqrt(3) * hexagonRadius;
  const hexHeight = 2 * hexagonRadius;
  
  // Yatay ve dikey mesafeler
  const horizDistance = hexWidth;
  const vertDistance = hexHeight * 0.75;
  
  // Grid boyutu
  const rows = Math.ceil((serviceRadius * 2.5) / vertDistance);
  const cols = Math.ceil((serviceRadius * 2.5) / horizDistance);
  
  let hexId = 1;
  
  // Hexagonal grid oluştur
  for (let row = -rows; row <= rows; row++) {
    for (let col = -cols; col <= cols; col++) {
      // Tek satırlarda yatay offset
      const xOffset = col * horizDistance + ((row & 1) ? horizDistance / 2 : 0);
      const yOffset = row * vertDistance;
      
      // Metre cinsinden offset'leri lat/lng'ye çevir
      const latOffset = yOffset / 111320;
      const lngOffset = xOffset / (111320 * Math.cos(center.lat * Math.PI / 180));
      
      const hexCenter = {
        lat: center.lat + latOffset,
        lng: center.lng + lngOffset
      };
      
      // Merkezden uzaklığı hesapla
      const distance = Math.sqrt(
        Math.pow((hexCenter.lat - center.lat) * 111320, 2) +
        Math.pow((hexCenter.lng - center.lng) * 111320 * Math.cos(center.lat * Math.PI / 180), 2)
      );
      
      // Hexagonun en az bir köşesi daire içindeyse ekle
      if (distance <= serviceRadius + hexagonRadius) {
        const originalPaths = generateHexagon(hexCenter, hexagonRadius);
        
        // Hexagonu daireye göre kırp
        const clippedPaths = clipPolygonToCircle(originalPaths, center, serviceRadius);
        
        // En az 3 nokta varsa (geçerli bir polygon) ekle
        if (clippedPaths.length >= 3) {
          hexagons.push({
            id: `hex-${hexId}`,
            paths: clippedPaths,
            center: hexCenter,
            zoneId: null
          });
          hexId++;
        }
      }
    }
  }
  
  return hexagons;
}

export default function ServiceZoneMap({ restaurantId }: ServiceZoneMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { user } = useAuth();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: libraries
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hexagons, setHexagons] = useState<Hexagon[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [hoveredHexagon, setHoveredHexagon] = useState<Hexagon | null>(null);
  const [restaurantLocation, setRestaurantLocation] = useState<RestaurantLocation | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(true);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [usedColorIndices, setUsedColorIndices] = useState<Set<number>>(new Set());
  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  useEffect(() => {
    const loadRestaurantLocation = async () => {
      if (!user?.uid) return;
      try {
        setIsLoadingRestaurant(true);
        const restaurant = await getRestaurantByOwnerId(user.uid);
        if (restaurant && restaurant.location) {
          const location = {
            lat: restaurant.location.latitude,
            lng: restaurant.location.longitude,
            address: restaurant.address || ''
          };
          setRestaurantLocation(location);
          setMapCenter(location);
          toast.success('Restoran konumu yüklendi');
        } else {
          toast.warning('Restoran konumu bulunamadı');
        }
      } catch (error) {
        console.error('Restoran konumu hata:', error);
        toast.error('Restoran bilgileri yüklenemedi');
      } finally {
        setIsLoadingRestaurant(false);
      }
    };
    loadRestaurantLocation();
  }, [user?.uid]);

  // Teslimat bölgelerini gerçek zamanlı dinle
  useEffect(() => {
    if (!restaurantId) return;

    const unsubscribe = subscribeToDeliveryZones(restaurantId, (zones) => {
      console.log('Teslimat bölgeleri güncellendi:', zones);
      setZones(zones);
    });

    return unsubscribe;
  }, [restaurantId]);

  useEffect(() => {
    if (map && restaurantLocation && isLoaded) {
      try {
        const generatedHexagons = generateHexagonalGrid(restaurantLocation, 7000);
        setHexagons(generatedHexagons);
        toast.success(`${generatedHexagons.length} altıgen oluşturuldu`);
      } catch (error) {
        console.error('Altıgen hata:', error);
        toast.error('Altıgenler oluşturulamadı');
      }
    }
  }, [map, restaurantLocation, isLoaded]);

  const onLoad = (map: google.maps.Map) => setMap(map);

  const getNextColor = (): string => {
    const availableIndices = COLOR_PALETTE.map((_, idx) => idx).filter(idx => !usedColorIndices.has(idx));
    if (availableIndices.length === 0) {
      setUsedColorIndices(new Set());
      return COLOR_PALETTE[0];
    }
    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    setUsedColorIndices(prev => new Set(prev).add(randomIndex));
    return COLOR_PALETTE[randomIndex];
  };

  const handleCreateZone = async () => {
    if (!zoneName.trim() || !minPrice || !deliveryTime || !restaurantId) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }
    
    try {
      const newZoneData = {
        name: zoneName.trim(),
        minPrice: parseFloat(minPrice),
        deliveryTime: parseInt(deliveryTime),
        color: getNextColor(),
        hexagonIds: [],
        restaurantId: restaurantId,
        isActive: true,
        coordinates: [],
        deliveryFee: 0,
        minimumOrder: parseFloat(minPrice),
        estimatedTime: parseInt(deliveryTime)
      };

      const createdZone = await addDeliveryZone(restaurantId, newZoneData);
      setSelectedZone(createdZone);
      setZoneName('');
      setMinPrice('');
      setDeliveryTime('');
      setIsCreatingZone(false);
      toast.success(`${createdZone.name} oluşturuldu! Haritadan altıgenleri seçin.`);
    } catch (error) {
      console.error('Bölge oluşturma hatası:', error);
      toast.error('Bölge oluşturulamadı');
    }
  };

  const handleEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setZoneName(zone.name);
    setMinPrice(zone.minPrice.toString());
    setDeliveryTime(zone.deliveryTime.toString());
    setIsCreatingZone(true);
  };

  const handleUpdateZone = async () => {
    if (!editingZone || !zoneName.trim() || !minPrice || !deliveryTime) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }
    
    try {
      await updateDeliveryZone(editingZone.id, {
        name: zoneName.trim(),
        minPrice: parseFloat(minPrice),
        deliveryTime: parseInt(deliveryTime)
      });
      
      setZoneName('');
      setMinPrice('');
      setDeliveryTime('');
      setIsCreatingZone(false);
      setEditingZone(null);
      toast.success('Bölge güncellendi!');
    } catch (error) {
      console.error('Bölge güncelleme hatası:', error);
      toast.error('Bölge güncellenemedi');
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      // Önce altıgenleri temizle
      setHexagons(prev => prev.map(hex => hex.zoneId === zoneId ? { ...hex, zoneId: null } : hex));
      
      // Bölgeyi Firestore'dan sil
      await deleteDeliveryZone(zoneId);
      
      if (selectedZone?.id === zoneId) setSelectedZone(null);
      toast.success('Bölge silindi!');
    } catch (error) {
      console.error('Bölge silme hatası:', error);
      toast.error('Bölge silinemedi');
    }
  };

  const handleHexagonClick = async (hexagon: Hexagon) => {
    if (!selectedZone) {
      toast.warning('Lütfen önce bir bölge seçin');
      return;
    }
    
    try {
      const newZoneId = hexagon.zoneId === selectedZone.id ? null : selectedZone.id;
      
      // Local state'i güncelle
      setHexagons(prev => prev.map(hex => {
        if (hex.id === hexagon.id) {
          return { ...hex, zoneId: newZoneId };
        }
        return hex;
      }));
      
      // Firestore'da güncelle
      const updatedHexagonIds = newZoneId 
        ? [...selectedZone.hexagonIds, hexagon.id]
        : selectedZone.hexagonIds.filter(id => id !== hexagon.id);
      
      await updateDeliveryZone(selectedZone.id, {
        hexagonIds: updatedHexagonIds
      });
    } catch (error) {
      console.error('Altıgen güncelleme hatası:', error);
      toast.error('Altıgen güncellenemedi');
    }
  };

  const getZoneHexagonCount = (zoneId: string): number => hexagons.filter(h => h.zoneId === zoneId).length;

  if (loadError) {
    return <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg"><div className="text-center"><p className="text-red-600 font-medium">Harita yüklenemedi</p></div></div>;
  }

  if (!isLoaded || isLoadingRestaurant) {
    return <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div><p className="text-gray-600">{isLoadingRestaurant ? 'Restoran yükleniyor...' : 'Harita yükleniyor...'}</p></div></div>;
  }

  if (!restaurantLocation) {
    return <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg"><div className="text-center max-w-md"><MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">Restoran Konumu Bulunamadı</h3><Button onClick={() => window.location.href = '/shop/settings?tab=general'} className="bg-orange-500 hover:bg-orange-600">Genel Ayarlara Git</Button></div></div>;
  }

  return (
    <div className="flex h-[600px] gap-4">
      <div className="w-80 bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Layers className="h-5 w-5 text-orange-500" />Teslimat Bölgeleri</h3>
            <Badge variant="outline" className="text-xs">{hexagons.length} Altıgen</Badge>
          </div>
          {!isCreatingZone ? (
            <Button onClick={() => setIsCreatingZone(true)} className="w-full bg-orange-500 hover:bg-orange-600" size="sm"><Plus className="h-4 w-4 mr-2" />Yeni Bölge Aç</Button>
          ) : (
            <Card className="border-orange-200 bg-orange-50"><CardContent className="p-3 space-y-3">
              <div><Label htmlFor="zoneName" className="text-xs">Bölge İsmi</Label><Input id="zoneName" placeholder="Örn: Merkez Bölge" value={zoneName} onChange={(e) => setZoneName(e.target.value)} className="h-8 text-sm" /></div>
              <div><Label htmlFor="minPrice" className="text-xs">Minimum Ücret (₺)</Label><Input id="minPrice" type="number" placeholder="25" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-8 text-sm" /></div>
              <div><Label htmlFor="deliveryTime" className="text-xs">Teslimat Süresi (dk)</Label><Input id="deliveryTime" type="number" placeholder="30" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="h-8 text-sm" /></div>
              <div className="flex gap-2">
                <Button onClick={editingZone ? handleUpdateZone : handleCreateZone} size="sm" className="flex-1 bg-green-600 hover:bg-green-700"><Save className="h-3 w-3 mr-1" />{editingZone ? 'Güncelle' : 'Kaydet'}</Button>
                <Button onClick={() => { setIsCreatingZone(false); setEditingZone(null); setZoneName(''); setMinPrice(''); setDeliveryTime(''); }} size="sm" variant="outline">İptal</Button>
              </div>
            </CardContent></Card>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center mb-8">
                <p className="text-sm text-gray-700 font-medium mb-6 px-2">"Bölge Aç" butonuna tıklayın, ardından aşağıdaki adımları takip edin.</p>
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                      <span className="text-orange-600 font-bold text-lg">1</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center mb-2">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center px-4">Teslimat Bölgesini Belirleyin</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                      <span className="text-orange-600 font-bold text-lg">2</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center px-4">Minimum Sepet Tutarını Giriniz</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                      <span className="text-orange-600 font-bold text-lg">3</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center mb-2">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center px-4">Minimum ve Maksimum Teslimat Süresini Belirleyiniz</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            zones.map((zone) => (
              <Card key={zone.id} className={`cursor-pointer transition-all border-2 ${selectedZone?.id === zone.id ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:bg-gray-50'}`} onClick={() => setSelectedZone(zone)} style={{ borderLeftColor: zone.color, borderLeftWidth: '4px' }}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} /><span className="font-medium text-sm">{zone.name}</span></div>
                      <Badge variant="secondary" className="text-xs">{getZoneHexagonCount(zone.id)} altıgen</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditZone(zone); }} className="h-7 w-7 p-0 text-blue-500 hover:bg-blue-50"><Edit2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone.id); }} className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /><span>Min: ₺{zone.minPrice}</span></div>
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>Süre: {zone.deliveryTime} dk</span></div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        {zones.length > 0 && (
          <div className="p-4 border-t bg-white">
            <Button 
              onClick={() => {
                toast.success('Teslimat bölgeleri otomatik olarak kaydediliyor!');
              }} 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              <Save className="h-4 w-4 mr-2" />
              Otomatik Kaydediliyor
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 bg-white rounded-lg border shadow-sm overflow-hidden relative">
        <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={13} onLoad={onLoad} options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: true }}>
          {restaurantLocation && (<Marker position={{ lat: restaurantLocation.lat, lng: restaurantLocation.lng }} icon={{ url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iI2Y5NzMxNiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHRleHQgeD0iMjAiIHk9IjI2IiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+8J+PqjwvdGV4dD48L3N2Zz4=', scaledSize: new google.maps.Size(40, 40) }} title="Restoran" />)}
          {restaurantLocation && (<Circle center={{ lat: restaurantLocation.lat, lng: restaurantLocation.lng }} radius={7000} options={{ strokeColor: '#e5e7eb', strokeOpacity: 0.8, strokeWeight: 2, fillColor: 'transparent', fillOpacity: 0, clickable: false }} />)}
          {hexagons.map((hexagon) => {
            const zone = zones.find(z => z.id === hexagon.zoneId);
            const isSelected = zone?.id === selectedZone?.id;
            return (<Polygon key={hexagon.id} paths={hexagon.paths} options={{ strokeColor: zone ? zone.color : '#e5e7eb', strokeOpacity: 0.8, strokeWeight: zone ? (isSelected ? 2 : 1) : 1, fillColor: zone ? zone.color : 'transparent', fillOpacity: zone ? (isSelected ? 0.4 : 0.25) : 0, clickable: true }} onClick={() => handleHexagonClick(hexagon)} onMouseOver={() => setHoveredHexagon(hexagon)} onMouseOut={() => setHoveredHexagon(null)} />);
          })}
          {hoveredHexagon && hoveredHexagon.zoneId && (<InfoWindow position={hoveredHexagon.center} options={{ pixelOffset: new google.maps.Size(0, -10) }}><div className="p-2">{(() => { const zone = zones.find(z => z.id === hoveredHexagon.zoneId); return zone ? (<><h3 className="font-semibold text-sm flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />{zone.name}</h3><p className="text-xs text-gray-600">Min: ₺{zone.minPrice}</p><p className="text-xs text-gray-600">Süre: {zone.deliveryTime} dk</p></>) : null; })()}</div></InfoWindow>)}
        </GoogleMap>
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 max-w-xs"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-orange-500" />Hizmet Bölgesi</h4><div className="space-y-2 text-xs text-gray-600"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div><span>Restoran konumu</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-gray-300 rounded-full bg-transparent"></div><span>7 km alan</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-300 rounded"></div><span>Atanmamış altıgenler</span></div>{selectedZone && (<div className="flex items-center gap-2 pt-2 border-t"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedZone.color }} /><span className="font-medium">{selectedZone.name} seçili</span></div>)}</div></div>
        {!selectedZone && zones.length > 0 && (<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-orange-100 border border-orange-300 rounded-lg px-4 py-2 shadow-lg"><p className="text-sm text-orange-800 flex items-center gap-2"><Target className="h-4 w-4" />Sol taraftan bir bölge seçin ve haritadan altıgenleri tıklayın</p></div>)}
      </div>
    </div>
  );
}