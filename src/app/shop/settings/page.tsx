"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Store,
  Clock,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Bell,
  Shield,
  Save,
  Upload,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantByOwnerId, updateRestaurant, uploadRestaurantLogo } from '@/lib/firebase/db';
import { Shop, WorkingHours } from '@/types';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [restaurant, setRestaurant] = useState<Shop | null>(null);
  
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    cuisine: '',
    deliveryTime: 30,
    minimumOrderAmount: 25
  });

  const [businessHours, setBusinessHours] = useState<WorkingHours>({
    monday: { open: '09:00', close: '22:00', isOpen: true },
    tuesday: { open: '09:00', close: '22:00', isOpen: true },
    wednesday: { open: '09:00', close: '22:00', isOpen: true },
    thursday: { open: '09:00', close: '22:00', isOpen: true },
    friday: { open: '09:00', close: '23:00', isOpen: true },
    saturday: { open: '10:00', close: '23:00', isOpen: true },
    sunday: { open: '10:00', close: '22:00', isOpen: true }
  });

  const [notifications, setNotifications] = useState({
    newOrders: true,
    orderUpdates: true,
    customerMessages: true,
    reviews: true,
    marketingEmails: false
  });

  const [paymentSettings, setPaymentSettings] = useState({
    acceptCash: true,
    acceptCard: true,
    acceptOnline: true,
    deliveryFee: 5.00,
    freeDeliveryThreshold: 50.00
  });

  // Restoran verilerini yükle
  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);
        const restaurantData = await getRestaurantByOwnerId(user.uid);
        
        if (restaurantData) {
          setRestaurant(restaurantData);
          
          // Form state'lerini güncelle
          setRestaurantInfo({
            name: restaurantData.name || '',
            description: restaurantData.description || '',
            phone: restaurantData.phoneNumber || restaurantData.phone || '',
            email: restaurantData.email || '',
            address: restaurantData.address || '',
            cuisine: restaurantData.cuisine?.[0] || '',
            deliveryTime: restaurantData.deliveryTime || 30,
            minimumOrderAmount: restaurantData.minimumOrderAmount || 25
          });

          // Çalışma saatlerini güncelle
          if (restaurantData.workingHours) {
            setBusinessHours(restaurantData.workingHours);
          }

          // Ödeme ayarlarını güncelle
          setPaymentSettings({
            acceptCash: restaurantData.paymentMethods?.includes('Kapıda Ödeme') || true,
            acceptCard: restaurantData.paymentMethods?.includes('Banka & Kredi Kartı') || true,
            acceptOnline: restaurantData.paymentMethods?.includes('Online Ödeme') || true,
            deliveryFee: 5.00, // Bu alan henüz yok, varsayılan değer
            freeDeliveryThreshold: 50.00 // Bu alan henüz yok, varsayılan değer
          });
        }
      } catch (error) {
        console.error('Restoran verileri yüklenirken hata:', error);
        toast.error('Restoran bilgileri yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadRestaurantData();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!restaurant) {
      toast.error('Restoran bilgileri bulunamadı');
      return;
    }

    try {
      setIsSaving(true);

      // Ödeme yöntemlerini array'e çevir
      const paymentMethods: string[] = [];
      if (paymentSettings.acceptCash) paymentMethods.push('Kapıda Ödeme');
      if (paymentSettings.acceptCard) paymentMethods.push('Banka & Kredi Kartı');
      if (paymentSettings.acceptOnline) paymentMethods.push('Online Ödeme');

      // Güncellenecek veriler
      const updateData = {
        name: restaurantInfo.name,
        description: restaurantInfo.description,
        phoneNumber: restaurantInfo.phone,
        phone: restaurantInfo.phone,
        email: restaurantInfo.email,
        address: restaurantInfo.address,
        cuisine: restaurantInfo.cuisine ? [restaurantInfo.cuisine] : [],
        deliveryTime: restaurantInfo.deliveryTime,
        minimumOrderAmount: restaurantInfo.minimumOrderAmount,
        workingHours: businessHours,
        paymentMethods: paymentMethods
        // updatedAt Firebase tarafından otomatik olarak eklenecek
      };

      await updateRestaurant(restaurant.id, updateData);
      
      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      toast.error('Ayarlar kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBusinessHoursChange = (day: keyof typeof businessHours, field: string, value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant) return;

    try {
      setIsUploadingLogo(true);
      const downloadURL = await uploadRestaurantLogo(restaurant.id, file);
      
      // Restaurant state'ini güncelle
      setRestaurant((prev: Shop | null) => prev ? { ...prev, image: downloadURL } : null);
      
      toast.success('Logo başarıyla yüklendi');
    } catch (error) {
      console.error('Logo yüklenirken hata:', error);
      toast.error('Logo yüklenirken bir hata oluştu');
    } finally {
      setIsUploadingLogo(false);
      // File input'u resetle
      event.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    if (!restaurant?.image) return;

    try {
      setIsUploadingLogo(true);
      
      // Firebase'de image alanını null yap
      await updateRestaurant(restaurant.id, { image: undefined });
      
      // Restaurant state'ini güncelle
      setRestaurant((prev: Shop | null) => prev ? { ...prev, image: undefined } : null);
      
      toast.success('Logo başarıyla silindi');
    } catch (error) {
      console.error('Logo silinirken hata:', error);
      toast.error('Logo silinirken bir hata oluştu');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="ml-6">
          <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
          <p className="text-gray-600">Restoran ayarlarınızı yönetin</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Kaydet
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="hours">Çalışma Saatleri</TabsTrigger>
          <TabsTrigger value="payment">Ödeme</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
          <TabsTrigger value="security">Güvenlik</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="h-5 w-5 mr-2" />
                Restoran Bilgileri
              </CardTitle>
              <CardDescription>
                Müşterilerinizin göreceği temel bilgiler
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restoran Adı</Label>
                  <Input
                    id="name"
                    value={restaurantInfo.name}
                    onChange={(e) => setRestaurantInfo(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Mutfak Türü</Label>
                  <Select value={restaurantInfo.cuisine} onValueChange={(value) => setRestaurantInfo(prev => ({ ...prev, cuisine: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Türk Mutfağı">Türk Mutfağı</SelectItem>
                      <SelectItem value="İtalyan">İtalyan</SelectItem>
                      <SelectItem value="Fast Food">Fast Food</SelectItem>
                      <SelectItem value="Kebap">Kebap</SelectItem>
                      <SelectItem value="Deniz Ürünleri">Deniz Ürünleri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={restaurantInfo.description}
                  onChange={(e) => setRestaurantInfo(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={restaurantInfo.phone}
                    onChange={(e) => setRestaurantInfo(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={restaurantInfo.email}
                    onChange={(e) => setRestaurantInfo(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  value={restaurantInfo.address}
                  onChange={(e) => setRestaurantInfo(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Teslimat Süresi (dk)</Label>
                  <Input
                    id="deliveryTime"
                    type="number"
                    value={restaurantInfo.deliveryTime}
                    onChange={(e) => setRestaurantInfo(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) || 30 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumOrder">Minimum Sipariş (₺)</Label>
                  <Input
                    id="minimumOrder"
                    type="number"
                    value={restaurantInfo.minimumOrderAmount}
                    onChange={(e) => setRestaurantInfo(prev => ({ ...prev, minimumOrderAmount: parseFloat(e.target.value) || 25 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Restoran Logosu</Label>
                  <div className="space-y-3">
                    {/* Mevcut Logo Önizleme */}
                    {restaurant?.image && (
                      <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                        <img
                          src={restaurant.image}
                          alt="Restoran Logosu"
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Mevcut Logo</p>
                          <p className="text-xs text-gray-500">Logo müşterilerinize gösteriliyor</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLogoDelete}
                          disabled={isUploadingLogo}
                          className="text-red-600 hover:text-red-700"
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Sil'
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Yükleme Alanı */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                        disabled={isUploadingLogo}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {restaurant?.image ? 'Logo Değiştir' : 'Logo Yükle'}
                      </Button>
                      <span className="text-sm text-gray-500">PNG, JPG (max 2MB)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Çalışma Saatleri
              </CardTitle>
              <CardDescription>
                Restoranınızın açık olduğu saatleri ayarlayın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-24">
                    <Label className="capitalize">{day === 'monday' ? 'Pazartesi' :
                                                  day === 'tuesday' ? 'Salı' :
                                                  day === 'wednesday' ? 'Çarşamba' :
                                                  day === 'thursday' ? 'Perşembe' :
                                                  day === 'friday' ? 'Cuma' :
                                                  day === 'saturday' ? 'Cumartesi' : 'Pazar'}</Label>
                  </div>
                  <Switch
                    checked={!hours.closed}
                    onCheckedChange={(checked) => handleBusinessHoursChange(day as keyof typeof businessHours, 'closed', !checked)}
                  />
                  {!hours.closed && (
                    <>
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => handleBusinessHoursChange(day as keyof typeof businessHours, 'open', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => handleBusinessHoursChange(day as keyof typeof businessHours, 'close', e.target.value)}
                        className="w-32"
                      />
                    </>
                  )}
                  {hours.closed && (
                    <span className="text-gray-500 text-sm">Kapalı</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Ödeme Ayarları
              </CardTitle>
              <CardDescription>
                Ödeme yöntemleri ve teslimat ücretlerini yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Kabul Edilen Ödeme Yöntemleri</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cash">Nakit Ödeme</Label>
                    <Switch
                      id="cash"
                      checked={paymentSettings.acceptCash}
                      onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, acceptCash: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="card">Kart ile Ödeme</Label>
                    <Switch
                      id="card"
                      checked={paymentSettings.acceptCard}
                      onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, acceptCard: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="online">Online Ödeme</Label>
                    <Switch
                      id="online"
                      checked={paymentSettings.acceptOnline}
                      onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, acceptOnline: checked }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">Teslimat Ücreti (₺)</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    step="0.01"
                    value={paymentSettings.deliveryFee}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freeDelivery">Ücretsiz Teslimat Eşiği (₺)</Label>
                  <Input
                    id="freeDelivery"
                    type="number"
                    step="0.01"
                    value={paymentSettings.freeDeliveryThreshold}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, freeDeliveryThreshold: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Bildirim Ayarları
              </CardTitle>
              <CardDescription>
                Hangi bildirimleri almak istediğinizi seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="newOrders">Yeni Sipariş Bildirimleri</Label>
                    <p className="text-sm text-gray-600">Yeni sipariş geldiğinde bildirim alın</p>
                  </div>
                  <Switch
                    id="newOrders"
                    checked={notifications.newOrders}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newOrders: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="orderUpdates">Sipariş Güncellemeleri</Label>
                    <p className="text-sm text-gray-600">Sipariş durumu değişikliklerinde bildirim alın</p>
                  </div>
                  <Switch
                    id="orderUpdates"
                    checked={notifications.orderUpdates}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, orderUpdates: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="customerMessages">Müşteri Mesajları</Label>
                    <p className="text-sm text-gray-600">Müşterilerden gelen mesajlarda bildirim alın</p>
                  </div>
                  <Switch
                    id="customerMessages"
                    checked={notifications.customerMessages}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, customerMessages: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reviews">Yeni Yorumlar</Label>
                    <p className="text-sm text-gray-600">Yeni müşteri yorumlarında bildirim alın</p>
                  </div>
                  <Switch
                    id="reviews"
                    checked={notifications.reviews}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, reviews: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketing">Pazarlama E-postaları</Label>
                    <p className="text-sm text-gray-600">Promosyon ve kampanya bildirimleri alın</p>
                  </div>
                  <Switch
                    id="marketing"
                    checked={notifications.marketingEmails}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketingEmails: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Güvenlik Ayarları
              </CardTitle>
              <CardDescription>
                Hesap güvenliğinizi yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Şifre Değiştir</h4>
                <div className="grid grid-cols-1 gap-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Yeni Şifre</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button>Şifre Değiştir</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">İki Faktörlü Doğrulama</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>İki Faktörlü Doğrulama</Label>
                    <p className="text-sm text-gray-600">Hesabınızı daha güvenli hale getirin</p>
                  </div>
                  <Button variant="outline">Etkinleştir</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-red-600">Tehlikeli Bölge</h4>
                <div className="space-y-3">
                  <Button variant="destructive" className="w-full max-w-md">
                    Hesabı Sil
                  </Button>
                  <p className="text-sm text-gray-600 max-w-md">
                    Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecektir.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}