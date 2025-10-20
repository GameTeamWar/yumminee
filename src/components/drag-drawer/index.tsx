import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GoogleMap, Marker, Polygon } from '@react-google-maps/api';
import { MapPin, Plus, Trash2, Save, X } from 'lucide-react';
import { updateRestaurant } from '@/lib/firebase/db';
import { toast } from 'sonner';
import { DragDrawerProps } from './types';

export default function DragDrawer({
  isServiceAreaDrawerOpen,
  setIsServiceAreaDrawerOpen,
  regions,
  setRegions,
  restaurant,
  isLoaded,
  loadError,
  mapCenter
}: DragDrawerProps) {
  // Düzenleme state'i
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState({
    name: '',
    color: '',
    minOrderAmount: 0,
    deliveryTime: ''
  });

  // Otomatik renk paleti
  const colorPalette = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#A855F7', '#F43F5E',
    '#14B8A6', '#22C55E', '#EAB308', '#64748B', '#374151', '#1F2937', '#111827'
  ];

  // Yeni bölge ekleme fonksiyonu
  const addNewRegion = () => {
    const regionNumber = regions.length + 1;
    const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    
    const newRegion = {
      id: Date.now().toString(),
      name: `Bölge ${regionNumber}`,
      color: randomColor,
      minOrderAmount: 25,
      deliveryTime: '30-45 dk',
      isActive: true
    };
    
    setRegions(prev => [...prev, newRegion]);
  };

  // Düzenleme başlatma
  const startEditing = (region: any) => {
    setEditingRegionId(region.id);
    setEditingValues({
      name: region.name,
      color: region.color,
      minOrderAmount: region.minOrderAmount,
      deliveryTime: region.deliveryTime
    });
  };

  // Düzenleme kaydetme
  const saveEditing = () => {
    if (!editingRegionId) return;
    
    setRegions(prev => prev.map(r =>
      r.id === editingRegionId
        ? { ...r, ...editingValues }
        : r
    ));
    
    setEditingRegionId(null);
  };

  // Düzenleme iptal etme
  const cancelEditing = () => {
    setEditingRegionId(null);
  };
  return (
    <>
      {/* Full-screen Service Area Drawer */}
      <Sheet open={isServiceAreaDrawerOpen} onOpenChange={setIsServiceAreaDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-none p-0 m-0 border-0 bg-gray-50 h-full">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-gray-900 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">Hizmet Alanı Yönetimi</h2>
              <button
                onClick={() => setIsServiceAreaDrawerOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <SheetTitle className="sr-only">Hizmet Alanı Yönetimi</SheetTitle>

            {/* Ana İçerik */}
            <div className="flex flex-1 min-h-0">
              {/* Sol Sidebar */}
              <div className="w-72 bg-gray-900 border-r border-gray-700 p-6 flex flex-col min-h-0">
                <div className="flex-1 space-y-6">
                  <div>
                    <p className="text-sm text-gray-300">
                      Kuryemiz ile teslimat yaptığınızda bu ekranda seçtiğiniz bölgelere teslimat yaptırmanız beklenmektedir.
                    </p>
                  </div>

                {/* Bölge Ekle Butonu - İlk bölge eklendikten sonra görünür */}
                {regions.length > 0 && (
                  <button
                    onClick={addNewRegion}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Bölge Ekle
                  </button>
                )}

                {/* Bölgeler Listesi */}
                <div className="space-y-3">
                  {regions.map((region) => (
                    <div key={region.id} className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                      {editingRegionId === region.id ? (
                        // Düzenleme modu
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-300">Bölge Adı</Label>
                            <Input
                              value={editingValues.name}
                              onChange={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-300">Bölge Rengi</Label>
                            <div className="flex space-x-2 flex-wrap gap-2">
                              {colorPalette.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  className={`w-8 h-8 rounded-full border-2 ${
                                    editingValues.color === color ? 'border-white' : 'border-gray-500'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => setEditingValues(prev => ({ ...prev, color }))}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-300">Min. Sepet (₺)</Label>
                              <Input
                                type="number"
                                value={editingValues.minOrderAmount}
                                onChange={(e) => setEditingValues(prev => ({ ...prev, minOrderAmount: parseFloat(e.target.value) || 0 }))}
                                className="bg-gray-700 border-gray-600 text-white"
                                min="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-300">Teslimat Süresi</Label>
                              <Input
                                value={editingValues.deliveryTime}
                                onChange={(e) => setEditingValues(prev => ({ ...prev, deliveryTime: e.target.value }))}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              İptal
                            </button>
                            <button
                              onClick={saveEditing}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                            >
                              Kaydet
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Görüntüleme modu
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: region.color }}
                              ></div>
                              <span className="font-medium text-white">{region.name}</span>
                            </div>
                            <button
                              onClick={() => {
                                setRegions(prev => prev.filter(r => r.id !== region.id));
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Min. Sepet:</span>
                              <span className="text-white">₺{region.minOrderAmount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Teslimat:</span>
                              <span className="text-white">{region.deliveryTime}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-400">Durum</span>
                            <Switch
                              checked={region.isActive}
                              onCheckedChange={(checked) => {
                                setRegions(prev => prev.map(r =>
                                  r.id === region.id ? { ...r, isActive: checked } : r
                                ));
                              }}
                              className="data-[state=checked]:bg-green-500"
                            />
                          </div>
                          <button
                            onClick={() => startEditing(region)}
                            className="w-full mt-3 text-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Düzenle
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* İlk bölge ekleme butonu - hiç bölge yoksa görünür */}
                {regions.length === 0 && (
                  <div className="space-y-4">
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                      <h3 className="font-medium text-white mb-2">Adımlar:</h3>
                      <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                        <li>"Bölge Aç" butonuna tıklayın</li>
                        <li>Aşağıdaki adımları takip edin</li>
                      </ol>
                    </div>

                    <button
                      onClick={addNewRegion}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Bölge Aç
                    </button>
                  </div>
                )}
                </div>

                {/* Sabit Kaydet Butonu */}
                <div className="border-t border-gray-700 pt-4 flex-shrink-0">
                  <button
                    onClick={async () => {
                      if (!restaurant) return;

                      try {
                        // Sadece aktif bölgeleri kaydet
                        const activeRegions = regions.filter(r => r.isActive);
                        await updateRestaurant(restaurant.id, {
                          serviceArea: activeRegions
                        });

                        toast.success('Bölgeler başarıyla kaydedildi');
                      } catch (error) {
                        console.error('Bölgeler kaydedilirken hata:', error);
                        toast.error('Bölgeler kaydedilirken bir hata oluştu');
                      }
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2 inline" />
                    Kaydet
                  </button>
                </div>
              </div>

              {/* Ana İçerik Alanı */}
              <div className="flex-1 bg-gray-50 min-h-0">
                {loadError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">Harita yüklenirken hata oluştu</p>
                      <p className="text-sm mt-2">Lütfen sayfayı yenileyin</p>
                    </div>
                  </div>
                ) : !isLoaded ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-lg font-medium">Harita yükleniyor...</p>
                    </div>
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={{
                      width: '100%',
                      height: '100%'
                    }}
                    center={mapCenter}
                    zoom={13}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: false,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                      rotateControl: false,
                      scaleControl: false,
                    }}
                  >
                    {/* Restaurant Marker */}
                    <Marker
                      position={mapCenter}
                      icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="18" fill="#EF4444" stroke="white" stroke-width="4"/>
                            <path d="M20 10C15.5 10 12 13.5 12 18C12 24 20 30 20 30C20 30 28 24 28 18C28 13.5 24.5 10 20 10Z" fill="white"/>
                            <circle cx="20" cy="18" r="3" fill="#EF4444"/>
                          </svg>
                        `),
                        scaledSize: isLoaded ? new google.maps.Size(40, 40) : undefined,
                        anchor: isLoaded ? new google.maps.Point(20, 40) : undefined
                      }}
                    />

                    {/* Bölge Gösterimi */}
                    {regions.length > 0 ? (
                      regions.map((region) => (
                        region.isActive && (
                          <Polygon
                            key={region.id}
                            paths={region.coordinates || []}
                            options={{
                              fillColor: region.color,
                              fillOpacity: 0.3,
                              strokeColor: region.color,
                              strokeOpacity: 0.8,
                              strokeWeight: 2,
                            }}
                          />
                        )
                      ))
                    ) : null}
                  </GoogleMap>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bölge Ekleme/Düzenleme Modal'ı - Artık kullanılmıyor */}
      {/* <Dialog open={showAddRegionModal} onOpenChange={setShowAddRegionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRegion ? 'Bölge Düzenle' : 'Yeni Bölge Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regionName">Bölge Adı</Label>
              <Input
                id="regionName"
                placeholder="Örn: Merkez, Şube Çevresi"
                defaultValue={editingRegion?.name || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regionColor">Bölge Rengi</Label>
              <div className="flex space-x-2 flex-wrap gap-2">
                {[
                  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
                  '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#A855F7', '#F43F5E',
                  '#14B8A6', '#22C55E', '#EAB308', '#64748B', '#374151', '#1F2937', '#111827'
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      editingRegion?.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      if (editingRegion) {
                        setEditingRegion({ ...editingRegion, color });
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">Minimum Sepet Tutarı (₺)</Label>
              <Input
                id="minOrderAmount"
                type="number"
                placeholder="100"
                min="100"
                defaultValue={editingRegion?.minOrderAmount || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryTime">Teslimat Süresi</Label>
              <Input
                id="deliveryTime"
                placeholder="30-45 dk"
                defaultValue={editingRegion?.deliveryTime || ''}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddRegionModal(false);
                  setEditingRegion(null);
                }}
              >
                İptal
              </Button>
              <Button
                onClick={() => {
                  const name = (document.getElementById('regionName') as HTMLInputElement)?.value;
                  const minOrderAmount = parseFloat((document.getElementById('minOrderAmount') as HTMLInputElement)?.value || '0');
                  const deliveryTime = (document.getElementById('deliveryTime') as HTMLInputElement)?.value;
                  const color = editingRegion?.color || '#3B82F6';

                  if (!name || !deliveryTime) return;

                  if (editingRegion) {
                    // Düzenleme
                    setRegions(prev => prev.map(r =>
                      r.id === editingRegion.id
                        ? { ...r, name, color, minOrderAmount, deliveryTime }
                        : r
                    ));
                  } else {
                    // Yeni ekleme
                    const newRegion = {
                      id: Date.now().toString(),
                      name,
                      color,
                      minOrderAmount,
                      deliveryTime,
                      isActive: true
                    };
                    setRegions(prev => [...prev, newRegion]);
                  }

                  setShowAddRegionModal(false);
                  setEditingRegion(null);
                }}
              >
                {editingRegion ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog> */}
    </>
  );
}