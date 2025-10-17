"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Star, Trash2, Edit, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { UserAddress } from '@/types';
import { getUserAddresses, setDefaultUserAddress, deleteUserAddress, CustomerAddress } from '@/lib/firebase/db';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddressSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelected: (address: CustomerAddress) => void;
  currentLocation?: google.maps.LatLngLiteral;
  selectedAddress?: CustomerAddress | null;
  onAddressDeleted?: () => void;
}

export const AddressSelectionModal = ({
  isOpen,
  onClose,
  onAddressSelected,
  currentLocation,
  selectedAddress,
  onAddressDeleted
}: AddressSelectionModalProps) => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<CustomerAddress | null>(null);

  // İki aşamalı modal için yeni state'ler
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    geoPoint: any;
    addressDetails: any;
  } | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    addressName: '',
    buildingNumber: '',
    apartment: '',
    block: '',
    apartmentComplex: '',
    hasElevator: false
  });

  // Modal açıldığında state'leri sıfırla
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSelectedLocation(null);
      setAddressFormData({
        addressName: '',
        buildingNumber: '',
        apartment: '',
        block: '',
        apartmentComplex: '',
        hasElevator: false
      });
    }
  }, [isOpen]);

  // Adresleri yükle
  useEffect(() => {
    if (isOpen && user) {
      loadAddresses();
    }
  }, [isOpen, user]);

  const loadAddresses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userAddresses = await getUserAddresses(user.uid);
      setAddresses(userAddresses);
    } catch (error) {
      console.error('Adresler yüklenirken hata:', error);
      toast.error('Adresler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Varsayılan adres yap
  const handleSetDefault = async (addressId: string) => {
    if (!user) return;

    try {
      await setDefaultUserAddress(user.uid, addressId);
      await loadAddresses(); // Listeyi yenile
      toast.success('Varsayılan adres güncellendi');
    } catch (error) {
      console.error('Varsayılan adres ayarlama hatası:', error);
      toast.error('Varsayılan adres ayarlanırken hata oluştu');
    }
  };

  // Adres sil
  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;

    const address = addresses.find(addr => addr.id === addressId);
    if (address) {
      setAddressToDelete(address);
      setShowDeleteModal(true);
    }
  };

  // Adres silmeyi onayla
  const confirmDeleteAddress = async () => {
    if (!user || !addressToDelete) return;

    try {
      await deleteUserAddress(addressToDelete.id);
      await loadAddresses(); // Listeyi yenile
      toast.success('Adres silindi');

      // Eğer silinen adres seçili adresten ise callback'i çağır
      if (selectedAddress?.id === addressToDelete.id && onAddressDeleted) {
        onAddressDeleted();
      }

      setShowDeleteModal(false);
      setAddressToDelete(null);
    } catch (error) {
      console.error('Adres silme hatası:', error);
      toast.error('Adres silinirken hata oluştu');
    }
  };

  // Adres silmeyi iptal et
  const cancelDeleteAddress = () => {
    setShowDeleteModal(false);
    setAddressToDelete(null);
  };

  // Konum seçildiğinde çağrılır (İlk aşama)
  const handleLocationSelected = (locationData: {
    address: string;
    geoPoint: any;
    addressDetails: any;
  }) => {
    setSelectedLocation(locationData);
    // Otomatik olarak form verilerini doldur
    setAddressFormData({
      addressName: locationData.addressDetails?.addressName || '',
      buildingNumber: locationData.addressDetails?.buildingNumber || '',
      apartment: locationData.addressDetails?.apartment || '',
      block: locationData.addressDetails?.block || '',
      apartmentComplex: locationData.addressDetails?.apartmentComplex || '',
      hasElevator: locationData.addressDetails?.hasElevator || false
    });
    setCurrentStep(2); // İkinci aşamaya geç
  };

  // İkinci aşamadan geri dön
  const handleGoBack = () => {
    setCurrentStep(1);
    setSelectedLocation(null);
    setAddressFormData({
      addressName: '',
      buildingNumber: '',
      apartment: '',
      block: '',
      apartmentComplex: '',
      hasElevator: false
    });
  };

  // Adresi kaydet (İkinci aşama)
  const handleSaveAddress = async () => {
    if (!user || !selectedLocation) return;

    try {
      const { addUserAddress } = await import('@/lib/firebase/db');

      const newAddress: Omit<CustomerAddress, 'id' | 'customerId' | 'createdAt' | 'updatedAt'> = {
        title: addressFormData.addressName || selectedLocation.address,
        address: selectedLocation.address,
        location: selectedLocation.geoPoint,
        phoneNumber: '',
        instructions: '',
        isDefault: addresses.length === 0, // İlk adres ise varsayılan yap
        isActive: true,
        userId: user.uid, // Legacy compatibility
        addressName: addressFormData.addressName || selectedLocation.address, // Legacy compatibility
        geoPoint: selectedLocation.geoPoint, // Legacy compatibility
        addressDetails: {
          ...selectedLocation.addressDetails,
          ...addressFormData
        }
      };

      await addUserAddress(user.uid, newAddress);
      await loadAddresses(); // Listeyi yenile
      setShowLocationPicker(false);
      setCurrentStep(1);
      setSelectedLocation(null);
      setAddressFormData({
        addressName: '',
        buildingNumber: '',
        apartment: '',
        block: '',
        apartmentComplex: '',
        hasElevator: false
      });
      toast.success('Adres başarıyla eklendi');
    } catch (error) {
      console.error('Adres ekleme hatası:', error);
      toast.error('Adres eklenirken hata oluştu');
    }
  };

  // Adres seçildiğinde
  const handleAddressSelect = (address: CustomerAddress) => {
    onAddressSelected(address);
    onClose();
  };

  // Konuma göre en yakın adresi öner
  const getSuggestedAddress = (): CustomerAddress | null => {
    if (!currentLocation || addresses.length === 0) return null;

    let nearestAddress: UserAddress | null = null;
    let minDistance = Infinity;

    addresses.forEach(address => {
      const distance = calculateDistance(
        currentLocation,
        { lat: address.geoPoint.latitude, lng: address.geoPoint.longitude }
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestAddress = address;
      }
    });

    return nearestAddress;
  };

  // Mesafe hesaplama yardımcı fonksiyonu
  const calculateDistance = (pos1: google.maps.LatLngLiteral, pos2: google.maps.LatLngLiteral): number => {
    // SSR kontrolü
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      return 0;
    }

    try {
      const R = 6371; // Dünya yarıçapı (km)
      const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
      const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
      const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    } catch (error) {
      console.error('Mesafe hesaplama hatası:', error);
      return 0;
    }
  };

  const suggestedAddress = getSuggestedAddress();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Teslimat Adresi Seçin
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Önerilen adres */}
            {suggestedAddress && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Önerilen Adres</span>
                </div>
                <Card
                  className={`cursor-pointer hover:shadow-md transition-shadow border-blue-200 ${
                    selectedAddress?.id === suggestedAddress.id 
                      ? 'ring-2 ring-orange-500 bg-orange-50 border-orange-300' 
                      : ''
                  }`}
                  onClick={() => handleAddressSelect(suggestedAddress)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{suggestedAddress.addressName}</h4>
                          {suggestedAddress.isDefault && (
                            <Badge variant="secondary" className="text-xs">Varsayılan</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{suggestedAddress.address}</p>
                        <div className="text-xs text-gray-500">
                          Bina: {suggestedAddress.addressDetails.buildingNumber}
                          {suggestedAddress.addressDetails.apartment && ` • Daire: ${suggestedAddress.addressDetails.apartment}`}
                          {suggestedAddress.addressDetails.block && ` • Blok: ${suggestedAddress.addressDetails.block}`}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(suggestedAddress.id);
                          }}
                          disabled={suggestedAddress.isDefault}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAddress(suggestedAddress.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Kayıtlı adresler */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">Kayıtlı Adresleriniz</h3>
                <Button
                  onClick={() => setShowLocationPicker(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Adres Ekle
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  <p className="text-gray-600">Adresler yükleniyor...</p>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz adres eklenmemiş</h4>
                  <p className="text-gray-600 mb-4">Teslimat için adres ekleyin</p>
                  <Button onClick={() => setShowLocationPicker(true)}>
                    İlk Adresinizi Ekleyin
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <Card
                      key={address.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        selectedAddress?.id === address.id 
                          ? 'ring-2 ring-orange-500 bg-orange-50 border-orange-300' 
                          : ''
                      }`}
                      onClick={() => handleAddressSelect(address)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{address.addressName}</h4>
                              {address.isDefault && (
                                <Badge variant="secondary" className="text-xs">Varsayılan</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{address.address}</p>
                            <div className="text-xs text-gray-500">
                              Bina: {address.addressDetails.buildingNumber}
                              {address.addressDetails.apartment && ` • Daire: ${address.addressDetails.apartment}`}
                              {address.addressDetails.block && ` • Blok: ${address.addressDetails.block}`}
                              {address.addressDetails.apartmentComplex && ` • ${address.addressDetails.apartmentComplex}`}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(address.id);
                              }}
                              disabled={address.isDefault}
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAddress(address.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Picker Modal */}
      <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentStep === 1 ? 'Konum Seçin' : 'Adres Bilgilerini Düzenleyin'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {currentStep === 1 ? (
              // İlk aşama: Konum seçimi
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Haritadan teslimat adresinizi seçin. Konum seçildikten sonra adres bilgilerini düzenleyebilirsiniz.
                </p>
                <LocationPicker 
                  onLocationSelected={handleLocationSelected} 
                  onLocationChange={(location, address) => {
                    setSelectedLocation({
                      address,
                      geoPoint: { latitude: location.lat, longitude: location.lng },
                      addressDetails: {}
                    });
                  }}
                  showAddressForm={false}
                  showSelectedAddressInfo={false}
                  showNextButton={true}
                  onNext={() => setCurrentStep(2)}
                  showSearchControls={true}
                />
              </div>
            ) : (
              // İkinci aşama: Adres bilgileri
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoBack}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Geri
                  </Button>
                  <span className="text-sm text-gray-600">Adres bilgilerini düzenleyin</span>
                </div>

                {/* Konum doğruluğu uyarı mesajı */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">⚠️</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-900 mb-1">Konum Doğruluğunu Kontrol Ediniz</h4>
                      <p className="text-sm text-amber-800">
                        Haritadan seçtiğiniz konumun adres bilgileri otomatik olarak doldurulmuştur. 
                        Eğer konum yanlış ise lütfen <span className="font-semibold underline text-amber-900">Geri</span> butonuna tıklayarak bir adım geri gidiniz ve manuel olarak düzenleyiniz. 
                        Teslimat adresiniz konumda belirtilen adres yapılacaktır.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seçilen konum bilgileri */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Seçilen Konum:</h4>
                  <p className="text-sm text-gray-700">{selectedLocation?.address}</p>
                </div>

                {/* Adres formu */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addressName">Adres Adı *</Label>
                    <Input
                      id="addressName"
                      placeholder="Örn: Ev, İş, Anneanne Evi"
                      value={addressFormData.addressName}
                      onChange={(e) => setAddressFormData(prev => ({ ...prev, addressName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buildingNumber">Bina No</Label>
                    <Input
                      id="buildingNumber"
                      placeholder="Örn: 15"
                      value={addressFormData.buildingNumber}
                      onChange={(e) => setAddressFormData(prev => ({ ...prev, buildingNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apartment">Daire No</Label>
                    <Input
                      id="apartment"
                      placeholder="Örn: 5"
                      value={addressFormData.apartment}
                      onChange={(e) => setAddressFormData(prev => ({ ...prev, apartment: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hasElevator">Asansör</Label>
                    <select
                      id="hasElevator"
                      value={addressFormData.hasElevator ? 'yes' : 'no'}
                      onChange={(e) => setAddressFormData(prev => ({ ...prev, hasElevator: e.target.value === 'yes' }))}
                      className="w-full h-10 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="yes">Var</option>
                      <option value="no">Yok</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="block">Blok</Label>
                    <Input
                      id="block"
                      placeholder="Örn: A"
                      value={addressFormData.block}
                      onChange={(e) => setAddressFormData(prev => ({ ...prev, block: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="apartmentComplex">Site/Adres</Label>
                    <Input
                      id="apartmentComplex"
                      placeholder="Örn: Güneş Sitesi, Bahçeşehir"
                      value={addressFormData.apartmentComplex}
                      onChange={(e) => setAddressFormData(prev => ({ ...prev, apartmentComplex: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={handleGoBack}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Geri
                  </Button>
                  <Button
                    onClick={handleSaveAddress}
                    disabled={!addressFormData.addressName.trim()}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Adresi Kaydet
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Adres Silme Onay Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Adresi Sil
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              <strong>"{addressToDelete?.addressName}"</strong> adresini silmek istediğinizden emin misiniz?
            </p>
            <p className="text-sm text-gray-500">
              Bu işlem geri alınamaz.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={cancelDeleteAddress}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAddress}
              className="bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Sil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};