"use client";

import { useState } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateUserProfile, uploadProfilePicture, deleteProfilePicture } from '@/lib/firebase/db';
import { Loader2, Camera, X, Upload } from 'lucide-react';

// Profil şeması
const profileSchema = z.object({
  displayName: z.string().min(2, 'İsim en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz').optional(),
  phoneNumber: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  userProfile: any;
  onUpdateSuccess: (profile: any) => void;
}

export default function ProfileForm({ userProfile, onUpdateSuccess }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Resim seçme fonksiyonu
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Dosya tipini kontrol et
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Sadece JPEG, PNG ve WebP formatları desteklenir.');
      return;
    }

    // Dosya boyutunu kontrol et (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Dosya boyutu 5MB\'dan büyük olamaz.');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Resim yükleme fonksiyonu
  const handleImageUpload = async () => {
    if (!selectedImage) return;

    try {
      setIsUploadingImage(true);
      console.log('Resim yükleme başlatıldı:', selectedImage.name);

      const imageUrl = await uploadProfilePicture(userProfile.uid, selectedImage);
      console.log('Resim başarıyla yüklendi:', imageUrl);

      // Profil bilgilerini yeniden yükle (güncel veriyi almak için)
      const updatedProfile = { ...userProfile, profilePicture: imageUrl };
      console.log('Profil güncellendi:', updatedProfile);

      toast.success('Profil resmi başarıyla güncellendi.');
      onUpdateSuccess(updatedProfile);

      // State'leri temizle
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error: any) {
      console.error('Resim yükleme hatası:', error);
      toast.error(error.message || 'Resim yüklenirken bir hata oluştu.');
    } finally {
      setIsUploadingImage(false);
    }
  };  // Resim silme fonksiyonu
  const handleImageDelete = async () => {
    try {
      setIsUploadingImage(true);
      await deleteProfilePicture(userProfile.uid);
      
      // Profil bilgilerini güncelle
      const updatedProfile = await updateUserProfile(userProfile.id, { profilePicture: undefined });
      
      toast.success('Profil resmi başarıyla silindi.');
      onUpdateSuccess(updatedProfile);
    } catch (error: any) {
      console.error('Resim silme hatası:', error);
      toast.error(error.message || 'Resim silinirken bir hata oluştu.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Seçilen resmi iptal etme
  const handleCancelImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Form hook'u
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userProfile?.displayName || '',
      email: userProfile?.email || '',
      phoneNumber: userProfile?.phoneNumber || '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsLoading(true);
      
      // Email'i formdan çıkar (auth üzerinden yönetiliyor)
      const { email, ...profileData } = data;
      
      // Profili güncelle
      const updatedProfile = await updateUserProfile(userProfile.id, profileData);
      
      toast.success('Profil başarıyla güncellendi');
      onUpdateSuccess(updatedProfile);
    } catch (error: any) {
      console.error('Profil güncelleme hatası:', error);
      toast.error('Profil güncellenemedi: ' + (error.message || 'Bir hata oluştu'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Profil Resmi Bölümü */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={imagePreview || userProfile?.profilePicture || ""} 
                alt="Profil Resmi" 
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {userProfile?.displayName?.charAt(0) || userProfile?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            
            {/* Resim yükleme butonu */}
            <label className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isUploadingImage}
              />
            </label>
          </div>

          {/* Resim yükleme kontrolleri */}
          {selectedImage && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleImageUpload}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Yükle
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCancelImage}
                disabled={isUploadingImage}
              >
                <X className="h-4 w-4 mr-2" />
                İptal
              </Button>
            </div>
          )}

          {/* Mevcut resim varsa silme butonu */}
          {userProfile?.profilePicture && !selectedImage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleImageDelete}
              disabled={isUploadingImage}
              className="text-red-600 hover:text-red-700"
            >
              {isUploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Resmi Sil
                </>
              )}
            </Button>
          )}
        </div>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ad Soyad</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ad Soyad" 
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
                  disabled={true} // E-posta değiştirilemez
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

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : 'Kaydet'}
        </Button>
      </form>
    </Form>
  );
}