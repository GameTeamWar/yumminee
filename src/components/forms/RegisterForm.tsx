"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { createUserProfile, checkPhoneExistsForRole, createRestaurant } from '@/lib/firebase/db';
import { LocationPicker } from '@/components/maps/LocationPicker';
import ImageCropModal from '@/components/ImageCropModal';
import { uploadImage } from '@/lib/firebase/storage';
import { Upload, MapPin, FileText, Clock, Globe, Phone, Mail } from 'lucide-react';
import { GeoPoint } from 'firebase/firestore';

// Kayıt şeması
const registerSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  phoneNumber: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
  address: z.string().min(5, 'Adres en az 5 karakter olmalıdır'),
  // Restaurant özel alanlar
  description: z.string().optional(),
  website: z.string().url('Geçerli bir website adresi giriniz').optional().or(z.literal('')),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  tradeRegistryNumber: z.string().optional(),
  kepAddress: z.string().email('Geçerli bir KEP adresi giriniz').optional().or(z.literal('')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Image fields
  restaurantImage: z.string().optional(),
  bannerImage: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  role: UserRole;
  accountMode?: 'flexible' | 'strict';
}

export default function RegisterForm({ role, accountMode = 'flexible' }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [taxDocumentFile, setTaxDocumentFile] = useState<File | null>(null);
  const [licenseDocumentFile, setLicenseDocumentFile] = useState<File | null>(null);
  // Image states
  const [restaurantImageFile, setRestaurantImageFile] = useState<File | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [restaurantImagePreview, setRestaurantImagePreview] = useState<string>('');
  const [bannerImagePreview, setBannerImagePreview] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropType, setCropType] = useState<'restaurant' | 'banner'>('restaurant');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const router = useRouter();
  const { signUp, checkEmailAvailabilityForRole } = useAuth();

  // Form hook'u
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phoneNumber: '',
      address: '',
      description: '',
      website: '',
      instagram: '',
      facebook: '',
      taxNumber: '',
      taxOffice: '',
      tradeRegistryNumber: '',
      kepAddress: '',
      latitude: undefined,
      longitude: undefined,
      restaurantImage: '',
      bannerImage: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true);

      // Email ve telefon numarası kontrolü
      const [emailAvailable, phoneExistsForRole] = await Promise.all([
        checkEmailAvailabilityForRole(data.email, role),
        checkPhoneExistsForRole(data.phoneNumber, role)
      ]);

      if (accountMode === 'strict' && !emailAvailable) {
        toast.error(`Bu e-posta adresi zaten başka bir rolde kullanılıyor. Katı sistemde her rol için ayrı email hesabı zorunludur.`);
        return;
      }

      if (accountMode === 'flexible' && !emailAvailable) {
        // Esnek sistemde aynı email'i kullanmaya izin ver ama uyarı ver
        toast.warning(`Bu e-posta adresi başka bir rolde kullanılıyor. Devam etmek istediğinizden emin misiniz?`);
      }

      if (phoneExistsForRole) {
        const roleText = role === 'shop' ? 'restoran sahibi' : role === 'courier' ? 'kurye' : 'müşteri';
        toast.error(`Bu telefon numarası ile zaten bir ${roleText} hesabı bulunuyor. Lütfen farklı bir telefon numarası deneyin.`);
        return;
      }

      if (phoneExistsForRole) {
        const roleText = role === 'shop' ? 'restoran sahibi' : 'müşteri';
        toast.error(`Bu telefon numarası ile zaten bir ${roleText} hesabı bulunuyor. Lütfen farklı bir telefon numarası deneyin.`);
        return;
      }

      // Firebase Authentication üzerinden kullanıcı oluştur
      const user = await signUp(data.email, data.password, data.name);

      // Firestore'a kullanıcı profilini kaydet
      await createUserProfile(user.uid, {
        firstName: data.name.split(' ')[0] || '',
        lastName: data.name.split(' ').slice(1).join(' ') || '',
        displayName: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        address: data.address,
        dateOfBirth: '',
        membershipLevel: 'bronze',
        loyaltyPoints: 0,
        totalOrders: 0,
        totalSpent: 0,
        averageRating: 0,
        isEmailVerified: false,
        isPhoneVerified: false,
        isActive: true,
        preferences: {
          notifications: {
            orders: true,
            promotions: true,
            email: true,
            sms: true
          },
          language: 'tr',
          theme: 'light'
        }
      });

      // Shop rolü için shop oluştur
      let shopId = null;
      if (role === 'shop') {
        // Dosyaları yükle
        let taxDocumentUrl = '';
        let licenseDocumentUrl = '';

        if (taxDocumentFile) {
          // TODO: Implement file upload to Firebase Storage
          taxDocumentUrl = '/documents/tax-placeholder.jpg'; // Placeholder
        }

        if (licenseDocumentFile) {
          // TODO: Implement file upload to Firebase Storage
          licenseDocumentUrl = '/documents/license-placeholder.jpg'; // Placeholder
        }

        const shop = await createRestaurant(user.uid, {
          name: data.name,
          email: data.email,
          phoneNumber: data.phoneNumber,
          phone: data.phoneNumber,
          address: data.address,
          image: data.restaurantImage || '/images/restaurants/default.jpg',
          description: data.description || '',
          cuisine: [],
          categories: [],
          rating: 0,
          reviewCount: 0,
          serviceRadius: 5,
          deliveryTime: 30,
          minimumOrderAmount: 25,
          isOpen: true,
          isActive: true,
          openingHours: {
            monday: { open: '09:00', close: '23:00', isClosed: false },
            tuesday: { open: '09:00', close: '23:00', isClosed: false },
            wednesday: { open: '09:00', close: '23:00', isClosed: false },
            thursday: { open: '09:00', close: '23:00', isClosed: false },
            friday: { open: '09:00', close: '23:00', isClosed: false },
            saturday: { open: '09:00', close: '23:00', isClosed: false },
            sunday: { open: '09:00', close: '23:00', isClosed: false },
          },
          deliveryFee: 5,
          estimatedDeliveryTime: 30,
          totalReviews: 0,
          location: selectedLocation ? new GeoPoint(selectedLocation.lat, selectedLocation.lng) : new GeoPoint(41.0082, 28.9784), // Default to Istanbul if not selected
        });
        shopId = shop.id;

        // Shop ID'yi localStorage'a kaydet
        if (typeof window !== 'undefined') {
          localStorage.setItem('shopId', shopId);
        }
      }

      toast.success('Kayıt başarılı!');

      // Rol bazlı yönlendirme
      if (role === 'shop') {
        router.push('/shop');
      } else if (role === 'courier') {
        router.push('/courier/dashboard');
      } else {
        router.push('/shops');
      }

      router.refresh();
    } catch (error: any) {
      console.error('Kayıt hatası:', error);

      // Özel hata mesajları
      let errorMessage = 'Kayıt yapılamadı. Lütfen tekrar deneyin.';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        // Firebase error code'ları için özel mesajlar
        switch (error.code) {
          case 'permission-denied':
            errorMessage = 'Veritabanı erişim hatası. Lütfen daha sonra tekrar deneyin.';
            break;
          case 'unavailable':
            errorMessage = 'Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
            break;
          default:
            errorMessage = 'Bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Rol bazlı etiketleri ayarla
  const roleLabels = {
    customer: {
      name: 'Ad Soyad',
      addressLabel: 'Adres',
      submitText: 'Kayıt Ol',
    },
    shop: {
      name: 'Restoran Adı',
      addressLabel: 'Restoran Adresi',
      submitText: 'Restoran Kaydı Oluştur',
    },
    courier: {
      name: 'Ad Soyad',
      addressLabel: 'Şehir',
      submitText: 'Kurye Olarak Kaydol',
    },
    admin: {
      name: 'Ad Soyad',
      addressLabel: 'Adres',
      submitText: 'Kayıt Ol',
    },
  };

  // Dosya yükleme fonksiyonları
  const handleTaxDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Dosya boyutu 5MB\'dan büyük olamaz');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
        toast.error('Sadece JPEG, PNG veya PDF dosyaları kabul edilir');
        return;
      }
      setTaxDocumentFile(file);
      toast.success('Vergi levhası başarıyla seçildi');
    }
  };

  const handleLicenseDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Dosya boyutu 5MB\'dan büyük olamaz');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
        toast.error('Sadece JPEG, PNG veya PDF dosyaları kabul edilir');
        return;
      }
      setLicenseDocumentFile(file);
      toast.success('Çalışma ruhsatı başarıyla seçildi');
    }
  };

  // Image upload handlers
  const handleRestaurantImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Resim boyutu 5MB\'dan büyük olamaz');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error('Sadece JPEG veya PNG dosyaları kabul edilir');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropType('restaurant');
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Resim boyutu 5MB\'dan büyük olamaz');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error('Sadece JPEG veya PNG dosyaları kabul edilir');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropType('banner');
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setIsUploadingImage(true);
    try {
      // Create a File from the Blob
      const file = new File([croppedImageBlob], `cropped-${cropType}.jpg`, { type: 'image/jpeg' });

      // Upload to Firebase Storage
      const imageUrl = await uploadImage(file, 'restaurant', 'temp', (progress) => {
        console.log(`${cropType} upload progress: ${progress}%`);
      });

      if (cropType === 'restaurant') {
        setRestaurantImageFile(file);
        setRestaurantImagePreview(imageUrl);
        form.setValue('restaurantImage', imageUrl);
        toast.success('Restoran görseli başarıyla yüklendi');
      } else {
        setBannerImageFile(file);
        setBannerImagePreview(imageUrl);
        form.setValue('bannerImage', imageUrl);
        toast.success('Banner görseli başarıyla yüklendi');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Resim yüklenirken bir hata oluştu');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLocationSelect = (location: { address: string; geoPoint: GeoPoint }) => {
    setSelectedLocation({ lat: location.geoPoint.latitude, lng: location.geoPoint.longitude });
    form.setValue('latitude', location.geoPoint.latitude);
    form.setValue('longitude', location.geoPoint.longitude);

    // Sadece koordinatları set et, adresi set etme - kullanıcı manuel düzenleyebilsin
    // Eğer adres boşsa, önerilen adresi placeholder olarak kullan
    if (!form.getValues('address')) {
      form.setValue('address', location.address);
    }

    toast.success('Konum başarıyla seçildi');
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {role === 'shop' ? (
        // Restaurant için gelişmiş kayıt formu
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
            <TabsTrigger value="location">Konum</TabsTrigger>
            <TabsTrigger value="business">İş Bilgileri</TabsTrigger>
            <TabsTrigger value="documents">Belgeler</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Temel Bilgiler */}
              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Temel Bilgiler
                    </CardTitle>
                    <CardDescription>
                      Restoranınızın temel bilgilerini girin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restoran Adı</FormLabel>
                          <FormControl>
                            <Input placeholder="Lezzet Restaurant" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açıklama</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Restoranınız hakkında kısa bir açıklama..."
                              rows={4}
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Restaurant Image Upload */}
                    <div className="space-y-2">
                      <Label>Restoran Görseli</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            id="restaurant-image"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={handleRestaurantImageUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="restaurant-image"
                            className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 transition-colors"
                          >
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">
                                {restaurantImagePreview ? 'Görsel seçildi' : 'Restoran görseli yüklemek için tıklayın'}
                              </p>
                              <p className="text-xs text-gray-500">JPEG, PNG (max 5MB)</p>
                            </div>
                          </label>
                        </div>
                        {restaurantImagePreview && (
                          <div className="w-32 h-32 border rounded-lg overflow-hidden">
                            <img
                              src={restaurantImagePreview}
                              alt="Restaurant preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Banner Image Upload */}
                    <div className="space-y-2">
                      <Label>Banner Görseli</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            id="banner-image"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={handleBannerImageUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="banner-image"
                            className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 transition-colors"
                          >
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">
                                {bannerImagePreview ? 'Banner seçildi' : 'Banner görseli yüklemek için tıklayın'}
                              </p>
                              <p className="text-xs text-gray-500">JPEG, PNG (max 5MB) - Önerilen: 1200x400px</p>
                            </div>
                          </label>
                        </div>
                        {bannerImagePreview && (
                          <div className="w-48 h-20 border rounded-lg overflow-hidden">
                            <img
                              src={bannerImagePreview}
                              alt="Banner preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-posta</FormLabel>
                            <FormControl>
                              <Input placeholder="info@restaurant.com" type="email" disabled={isLoading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input placeholder="05XX XXX XX XX" disabled={isLoading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şifre</FormLabel>
                          <FormControl>
                            <Input placeholder="******" type="password" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website (İsteğe bağlı)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://restaurant.com" disabled={isLoading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram (İsteğe bağlı)</FormLabel>
                            <FormControl>
                              <Input placeholder="@restaurant" disabled={isLoading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Konum */}
              <TabsContent value="location" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Konum Bilgileri
                    </CardTitle>
                    <CardDescription>
                      Restoranınızın konumunu harita üzerinde işaretleyin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Önce haritadan konum seçin, sonra adresi düzenleyebilirsiniz (örn: Zümrütevler, Candan Sokağı No:27, 34852 Maltepe/İstanbul, Türkiye)"
                              rows={4}
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-gray-500 mt-1">
                            💡 Haritadan konum seçtikten sonra adresi düzenleyebilirsiniz (kapı numarası, detaylar vb.)
                          </p>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Konum Seçimi</Label>
                      <div className="h-96 border rounded-lg overflow-hidden">
                        <LocationPicker onLocationSelected={handleLocationSelect} />
                      </div>
                      {selectedLocation && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800 font-medium">
                            ✓ Konum seçildi: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Artık yukarıdaki adres kutusunda detayları düzenleyebilirsiniz.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* İş Bilgileri */}
              <TabsContent value="business" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      İş Bilgileri
                    </CardTitle>
                    <CardDescription>
                      Vergi ve ticaret bilgilerinizi girin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="taxNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vergi Numarası</FormLabel>
                            <FormControl>
                              <Input placeholder="1234567890" disabled={isLoading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxOffice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vergi Dairesi</FormLabel>
                            <FormControl>
                              <Input placeholder="Kadıköy Vergi Dairesi" disabled={isLoading} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="tradeRegistryNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ticaret Sicil Numarası</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="kepAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>KEP Adresi (İsteğe bağlı)</FormLabel>
                          <FormControl>
                            <Input placeholder="restaurant@kep.tr" type="email" disabled={isLoading} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Belgeler */}
              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Gerekli Belgeler
                    </CardTitle>
                    <CardDescription>
                      Vergi levhası ve çalışma ruhsatı belgelerinizi yükleyin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="tax-document">Vergi Levhası</Label>
                        <div className="mt-2">
                          <input
                            type="file"
                            id="tax-document"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                            onChange={handleTaxDocumentUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="tax-document"
                            className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 transition-colors"
                          >
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">
                                {taxDocumentFile ? taxDocumentFile.name : 'Vergi levhası yüklemek için tıklayın'}
                              </p>
                              <p className="text-xs text-gray-500">JPEG, PNG veya PDF (max 5MB)</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="license-document">Çalışma Ruhsatı</Label>
                        <div className="mt-2">
                          <input
                            type="file"
                            id="license-document"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                            onChange={handleLicenseDocumentUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="license-document"
                            className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 transition-colors"
                          >
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">
                                {licenseDocumentFile ? licenseDocumentFile.name : 'Çalışma ruhsatı yüklemek için tıklayın'}
                              </p>
                              <p className="text-xs text-gray-500">JPEG, PNG veya PDF (max 5MB)</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Bilgilendirme</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Belgeleriniz onay sürecinden geçecektir</li>
                        <li>• Onay süresi genellikle 1-2 iş günü sürer</li>
                        <li>• Belgeleriniz güvenli bir şekilde saklanır</li>
                        <li>• Herhangi bir sorun yaşarsanız destek ekibimizle iletişime geçin</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Submit Button */}
              <div className="flex justify-end pt-6">
                <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Restoran Kaydı Oluştur
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      ) : (
        // Diğer roller için basit form
        (() => {
          const currentLabels = roleLabels[role];
          return (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentLabels.name}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={role === 'courier' ? 'Ahmet Yılmaz' : 'Lezzet Restaurant'} 
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ornek@mail.com" 
                          type="email" 
                          autoComplete="email"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şifre</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="******" 
                          type="password" 
                          autoComplete="new-password"
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
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon Numarası</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="05XX XXX XX XX" 
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
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentLabels.addressLabel}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={role === 'courier' ? 'Örn: İstanbul' : 'Örn: Bağdat Cad. No:123, Kadıköy/İstanbul'} 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                  {isLoading ? 'Kaydediliyor...' : currentLabels.submitText}
                </Button>
              </form>
            </Form>
          );
        })()
      )}

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspect={cropType === 'banner' ? 3 : 1} // Banner için 3:1, restaurant için 1:1
        title={cropType === 'banner' ? 'Banner Görselini Kırp' : 'Restoran Görselini Kırp'}
      />
    </div>
  );
}