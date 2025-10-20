"use client";

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getUserAddresses, 
  addUserAddress, 
  updateUserAddress, 
  deleteUserAddress,
  setDefaultAddress
} from '@/lib/firebase/db';
import { 
  Home, 
  Building, 
  Building2, 
  MapPin, 
  Loader2, 
  PenSquare, 
  Trash2,
  CheckCircle2,
  Plus,
  X,
  Search,
  Target
} from 'lucide-react';
import { GeoPoint } from 'firebase/firestore';
import dynamic from 'next/dynamic';

// LocationPickerMap'i dinamik olarak yükle (SSR'dan kaçınmak için)
const LocationPickerMap = dynamic<any>(
  () => import('@/components/maps/LocationPickerMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Harita yükleniyor...</p>
        </div>
      </div>
    )
  }
);

// Adres şeması
const addressSchema = z.object({
  title: z.string().min(2, 'Adres başlığı en az 2 karakter olmalıdır'),
  address: z.string().optional(), // Haritadan gelen adresi kullanacağız
  district: z.string().min(2, 'İlçe bilgisi gereklidir'),
  city: z.string().min(2, 'İl bilgisi gereklidir'),
  postalCode: z.string().optional(),
  location: z.any().optional(),
  type: z.enum(['home', 'work', 'other']),
  isDefault: z.boolean(),
  buildingNo: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressManagerProps {
  userId: string;
}

export default function AddressManager({ userId }: AddressManagerProps) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<any | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  
  // Form hook'u
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      title: '',
      address: '',
      district: '',
      city: '',
      postalCode: '',
      location: undefined,
      type: 'home',
      isDefault: false,
      buildingNo: '',
      floor: '',
      apartment: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
  });
  
  // Kullanıcı adreslerini getir
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const userAddresses = await getUserAddresses(userId);
        setAddresses(userAddresses);
      } catch (error) {
        console.error("Adresler yüklenirken hata:", error);
        toast.error("Adresleriniz yüklenemedi");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAddresses();
  }, [userId]);
  
  // Dialog açıldığında form değerlerini ayarla
  useEffect(() => {
    if (selectedAddress) {
      form.reset({
        title: selectedAddress.title,
        address: selectedAddress.address,
        district: selectedAddress.district,
        city: selectedAddress.city,
        postalCode: selectedAddress.postalCode || '',
        location: selectedAddress.location || undefined,
        type: selectedAddress.type || 'home',
        isDefault: selectedAddress.isDefault || false,
        buildingNo: selectedAddress.buildingNo || '',
        floor: selectedAddress.floor || '',
        apartment: selectedAddress.apartment || '',
        firstName: selectedAddress.firstName || '',
        lastName: selectedAddress.lastName || '',
        phone: selectedAddress.phone || '',
      });
    } else {
      form.reset({
        title: '',
        address: '',
        district: '',
        city: '',
        postalCode: '',
        location: undefined,
        type: 'home',
        isDefault: false,
        buildingNo: '',
        floor: '',
        apartment: '',
        firstName: '',
        lastName: '',
        phone: '',
      });
    }
  }, [selectedAddress, form]);
  
  // Konum seçme işlemi (haritada tıklandığında)
  const handleMapLocationSelect = (location: {lat: number, lng: number, address: string}) => {
    setSelectedLocation(location);
  };

  // Konum onaylama işlemi (Bu Konumu Kullan butonuna basıldığında)
  const handleLocationConfirm = () => {
    if (!selectedLocation) {
      toast.error('Lütfen haritadan bir konum seçin');
      return;
    }

    setIsLocationPickerOpen(false);
    setIsAddressFormOpen(true);
    
    // Sadece koordinatları set et, adres bilgilerini kullanıcı form'da dolduracak
    form.setValue('location', new GeoPoint(selectedLocation.lat, selectedLocation.lng));
    
    // Form'daki diğer alanları temizle (özellikle kat/daire gibi yapı bilgileri)
    // Kullanıcı bunları manuel olarak dolduracak
  };

  const handleAddressSubmit = async (data: AddressFormValues) => {
    console.log('🚀 Form submit başladı');
    console.log('Form verisi:', data);
    console.log('selectedLocation:', selectedLocation);
    console.log('isLoading:', isLoading);

    try {
      setIsLoading(true);
      console.log('✅ Loading state set edildi');

      // Form verilerini kontrol et
      if (!data.title || data.title.length < 2) {
        console.log('❌ Başlık validation hatası');
        toast.error('Adres başlığı en az 2 karakter olmalıdır');
        return;
      }

      if (!data.district || data.district.length < 2) {
        console.log('❌ İlçe validation hatası');
        toast.error('İlçe bilgisi gereklidir');
        return;
      }

      if (!data.city || data.city.length < 2) {
        console.log('❌ İl validation hatası');
        toast.error('İl bilgisi gereklidir');
        return;
      }

      if (!selectedLocation) {
        console.log('❌ Konum seçilmemiş');
        toast.error('Lütfen önce haritadan konum seçin');
        return;
      }

      console.log('✅ Tüm validation geçildi');

      // Firebase'e gönderilecek veriyi hazırla
      const addressData = {
        title: data.title,
        address: selectedLocation.address, // Haritadan gelen tam adres
        district: data.district,
        city: data.city,
        postalCode: data.postalCode || '',
        geoPoint: new GeoPoint(selectedLocation.lat, selectedLocation.lng),
        location: new GeoPoint(selectedLocation.lat, selectedLocation.lng), // Legacy compatibility
        type: data.type,
        isDefault: data.isDefault,
        isActive: true,
        buildingNo: data.buildingNo || '',
        floor: data.floor || '',
        apartment: data.apartment || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        userId: userId, // Legacy compatibility
        addressName: data.title, // Legacy compatibility
        addressDetails: {
          buildingNumber: data.buildingNo || '',
          floor: data.floor || '',
          apartment: data.apartment || '',
          hasElevator: false, // Default to false since not in form
          detailedAddress: data.postalCode || '', // Using postalCode as detailed address
        },
      };

      console.log('📦 Firebase\'e gönderilecek veri:', addressData);

      if (selectedAddress) {
        // Adresi güncelle
        console.log('🔄 Adres güncelleniyor:', selectedAddress.id);
        await updateUserAddress(userId, selectedAddress.id, addressData);
        toast.success("Adres güncellendi");
      } else {
        // Yeni adres ekle
        console.log('➕ Yeni adres ekleniyor');
        await addUserAddress(userId, addressData);
        toast.success("Yeni adres eklendi");
      }

      console.log('✅ Firebase işlemi tamamlandı');

      // Adresleri yeniden yükle
      const userAddresses = await getUserAddresses(userId);
      setAddresses(userAddresses);

      console.log('✅ Adresler yeniden yüklendi');

      // Dialog'u kapat
      setIsAddressFormOpen(false);
      setSelectedAddress(null);
      form.reset();

      console.log('✅ Form reset edildi ve dialog kapatıldı');

    } catch (error) {
      console.error("❌ Adres kaydetme hatası:", error);
      toast.error(`Adres kaydedilemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
      console.log('🔄 Loading state reset edildi');
    }
  };
  
  const handleDeleteAddress = async () => {
    if (!selectedAddress) return;
    
    try {
      setIsLoading(true);
      await deleteUserAddress(selectedAddress.id);
      
      // Adresleri yeniden yükle
      const userAddresses = await getUserAddresses(userId);
      setAddresses(userAddresses);
      
      toast.success("Adres silindi");
      setIsDeleteConfirmOpen(false);
      setIsAddressFormOpen(false);
      setSelectedAddress(null);
    } catch (error) {
      console.error("Adres silme hatası:", error);
      toast.error("Adres silinemedi");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      setIsLoading(true);
      await setDefaultAddress(addressId);
      
      // Adresleri yeniden yükle
      const userAddresses = await getUserAddresses(userId);
      setAddresses(userAddresses);
      
      toast.success("Varsayılan adres ayarlandı");
    } catch (error) {
      console.error("Varsayılan adres ayarlama hatası:", error);
      toast.error("Varsayılan adres ayarlanamadı");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditAddress = (address: any) => {
    setSelectedAddress(address);
    form.reset({
      title: address.title,
      address: address.address,
      district: address.district,
      city: address.city,
      postalCode: address.postalCode || '',
      location: address.location || undefined,
      type: address.type || 'home',
      isDefault: address.isDefault || false,
      buildingNo: address.buildingNo || '',
      floor: address.floor || '',
      apartment: address.apartment || '',
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      phone: address.phone || '',
    });
    setIsAddressFormOpen(true);
  };

  const getAddressIcon = (title: string) => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('ev') || titleLower.includes('home')) {
      return <Home className="h-5 w-5" />;
    } else if (titleLower.includes('iş') || titleLower.includes('work') || titleLower.includes('ofis')) {
      return <Building className="h-5 w-5" />;
    } else if (titleLower.includes('apart') || titleLower.includes('residence')) {
      return <Building2 className="h-5 w-5" />;
    } else {
      return <MapPin className="h-5 w-5" />;
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.loading('Konumunuz alınıyor...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Konum alınıyor...'
          };
          
          // Önce konumu set et (harita güncellensin ve reverse geocoding yapsın)
          setSelectedLocation(location);
          
          // Reverse geocoding ile adresi al ve input'a doldur
          if (window.google && window.google.maps && window.google.maps.Geocoder) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat: location.lat, lng: location.lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                setSearchQuery(address); // Input'a adresi doldur
                setSelectedLocation({ ...location, address }); // Location'ı güncelle
              } else {
                // Geocoding başarısız olursa, koordinatları göster
                const coordAddress = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
                setSearchQuery(coordAddress);
                setSelectedLocation({ ...location, address: coordAddress });
                console.warn('Reverse geocoding başarısız:', status);
              }
            });
          } else {
            // Google Maps yüklenmemişse koordinatları göster
            const coordAddress = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
            setSearchQuery(coordAddress);
            setSelectedLocation({ ...location, address: coordAddress });
            console.warn('Google Maps API henüz yüklenmedi veya Geocoder mevcut değil');
          }
          
          toast.dismiss();
          toast.success('Konumunuz bulundu!');
        },
        (error) => {
          toast.dismiss();

          // Better error logging with available details
          const errorDetails = {
            code: error.code,
            message: error.message
          };
          console.error('Konum alınamadı:', errorDetails);

          if (error.code === error.PERMISSION_DENIED) {
            toast.error('Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini açın.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            toast.error('Konum bilgisi alınamıyor. Lütfen GPS\'inizi açın veya farklı bir konum deneyin.');
          } else if (error.code === error.TIMEOUT) {
            toast.error('Konum alma zaman aşımına uğradı. Lütfen tekrar deneyin.');
          } else {
            toast.error('Konum bilgisi alınamadı. Lütfen manuel olarak adres girin.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast.error('Tarayıcınız konum özelliğini desteklemiyor');
    }
  };

  return (
    <div className="space-y-4">
      {isLoading && addresses.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 mx-auto text-gray-300" />
          <p className="mt-4 text-gray-500">Henüz kaydedilmiş adresiniz bulunmuyor.</p>
          <p className="text-sm text-gray-400">Teslimat için adres ekleyin.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <div 
              key={address.id} 
              className={`border rounded-lg p-4 ${address.isDefault ? 'border-orange-500 bg-orange-50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 text-orange-500">
                  {getAddressIcon(address.title)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{address.title}</h3>
                    {address.isDefault && (
                      <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
                        Varsayılan
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-gray-600">{address.address}</p>
                  {address.district && address.city && (
                    <p className="mt-1 text-sm text-gray-500">{address.district}, {address.city}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleEditAddress(address)}
                  >
                    <PenSquare className="h-4 w-4" />
                  </Button>
                  
                  {!address.isDefault && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleSetDefaultAddress(address.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Yeni Adres Ekle Butonu */}
      <Button 
        variant="outline" 
        className="w-full mt-4 border-orange-500 text-orange-600 hover:bg-orange-50"
        onClick={() => setIsLocationPickerOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Yeni Adres Ekle
      </Button>

      {/* Teslimat Adresi Seç Modal */}
      <Dialog open={isLocationPickerOpen} onOpenChange={setIsLocationPickerOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle className="text-lg font-semibold">Teslimat Adresi Seç</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              Harita üzerinde bina girişini seçtiğinden emin ol. Bina girişini doğru seçmediğin 
              durumlarda siparişinin teslimatıyla ilgili sorun yaşayabilirsin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6">
            {/* Arama Kutusu */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Mahalle, sokak veya cadde ara"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      e.preventDefault();
                      setSearchTrigger(prev => prev + 1); // Arama tetikle
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={getCurrentLocation}
                className="text-orange-600 border-orange-500 hover:bg-orange-50 whitespace-nowrap"
              >
                <Target className="h-4 w-4 mr-2" />
                Konumumu Bul
              </Button>
            </div>
          </div>

          {/* Harita Alanı */}
          <div className="h-[450px] mx-6 rounded-lg overflow-hidden border border-gray-200">
            <LocationPickerMap 
              onLocationSelect={handleMapLocationSelect}
              searchQuery={searchQuery}
              searchTrigger={searchTrigger}
              currentLocation={selectedLocation}
            />
          </div>

          <div className="p-6 pt-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLocationPickerOpen(false);
                  setSelectedLocation(null);
                }}
                className="flex-1"
              >
                Geri Dön
              </Button>
              <Button
                onClick={handleLocationConfirm}
                disabled={!selectedLocation}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300"
              >
                Bu Konumu Kullan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adres Ekle Modal */}
      <Dialog open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAddress ? 'Adresi Düzenle' : 'Adres Ekle'}
            </DialogTitle>
            <DialogDescription>
              Adres bilgilerini doldurun ve kaydedin.
            </DialogDescription>
          </DialogHeader>
          
          {/* Harita Önizleme */}
          {selectedLocation && (
            <div className="h-[200px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mb-4">
              <LocationPickerMap 
                onLocationSelect={() => {}}
                searchQuery=""
                searchTrigger={0}
                currentLocation={selectedLocation}
              />
            </div>
          )}

          {selectedLocation && (
            <div className="bg-orange-50 p-3 rounded-lg mb-4">
              <h4 className="font-medium text-orange-800 flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" />
                Adres ve İletişim Bilgileri
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700">
                  {(() => {
                    const binaNo = form.watch('buildingNo');
                    if (binaNo && binaNo.trim()) {
                      // Adresteki "No:XX" veya "No:XX," kısmını yeni numara ile değiştir
                      return selectedLocation.address.replace(/No:\s*\d+/i, `No:${binaNo}`);
                    }
                    return selectedLocation.address;
                  })()}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                  onClick={() => {
                    setIsAddressFormOpen(false);
                    setIsLocationPickerOpen(true);
                  }}
                >
                  <PenSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full mb-4 border-orange-200 text-orange-600 hover:bg-orange-50"
                size="sm"
              >
                <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center mr-2">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                Teslimat Uyarısı
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-600">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                  Teslimat Uyarısı
                </DialogTitle>
                <DialogDescription>
                  Teslimatınız haritada seçtiğiniz noktaya yapılacaktır. 
                  Aşağıdaki adres bilgileri (Bina No, Kat, Daire, vb.) sadece 
                  kuryemizin adresi daha kolay bulması içindir.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mt-3">
                  Lütfen harita üzerinde tam olarak bina girişini işaretlediğinizden emin olun.
                </p>
              </div>
              <DialogFooter>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  Anladım
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(handleAddressSubmit)} 
              className="space-y-4"
              onSubmitCapture={(e) => console.log('📝 Form onSubmitCapture tetiklendi')}
            >
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="buildingNo"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Input 
                          placeholder="Bina No" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Kat" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apartment"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Daire" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="Adres Başlığı" 
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">Adres Tarifi</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Opsiyonel" 
                        className="resize-none h-20"
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="İlçe" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="İl" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Adınız" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Soyadınız" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">Cep Telefonu</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0(___) ___-__-__" 
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex gap-2 flex-col sm:flex-row pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddressFormOpen(false);
                    setSelectedAddress(null);
                    form.reset({
                      title: '',
                      address: '',
                      district: '',
                      city: '',
                      postalCode: '',
                      location: undefined,
                      type: 'home',
                      isDefault: false,
                      buildingNo: '',
                      floor: '',
                      apartment: '',
                      firstName: '',
                      lastName: '',
                      phone: '',
                    });
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Geri Dön
                </Button>
                
                {selectedAddress && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Sil
                  </Button>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={() => console.log('🔘 Kaydet butonuna tıklandı, isLoading:', isLoading)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : 'Kaydet'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Silme Onay Dialog'u */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adresi Sil</DialogTitle>
            <DialogDescription>
              Bu adresi silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAddress}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : 'Evet, Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}