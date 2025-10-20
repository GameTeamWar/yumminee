"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getUserProfile, getUserOrders, getFavoriteRestaurants, getRestaurant, subscribeToUserFavorites, createUserProfile } from "@/lib/firebase/db";
import { UserProfile } from "@/lib/firebase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoriteContext";
import AddressManager from "@/components/forms/AddressManager";
import { OrderHistory } from "@/components/orders/OrderHistory";
import ProfileForm from "@/components/forms/ProfileForm";
import { PasswordResetForm } from "@/components/forms/PasswordResetForm";
import RestaurantCard from "@/components/RestaurantCard";
import {
  User as UserIcon,
  MapPin,
  ClipboardList,
  Lock,
  LogOut,
  Settings,
  CreditCard,
  Bell,
  Heart,
  Star,
  Package,
  Phone,
  Mail,
  Calendar,
  Award,
  TrendingUp,
  Search,
  Home,
  Info,
  Crown,
  Gem,
  Zap,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ProfilePage() {
  const { user, signOut, userProfile: authUserProfile, currentRole } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardHolder: ''
  });
  const [editingCard, setEditingCard] = useState<any>(null);
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [editCardForm, setEditCardForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardHolder: ''
  });
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<any[]>([]);

  // Üye seviye hesaplama fonksiyonu
  const calculateMembershipLevel = (totalOrders: number, totalSpent: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'vip' => {
    const orderLevel = 
      totalOrders >= 500 ? 'vip' :
      totalOrders >= 350 ? 'diamond' :
      totalOrders >= 200 ? 'platinum' :
      totalOrders >= 100 ? 'gold' :
      totalOrders >= 50 ? 'silver' :
      'bronze';

    const spendingLevel = 
      totalSpent >= 20000 ? 'vip' :
      totalSpent >= 10000 ? 'diamond' :
      totalSpent >= 5000 ? 'platinum' :
      totalSpent >= 2500 ? 'gold' :
      totalSpent >= 1000 ? 'silver' :
      'bronze';

    // En yüksek seviyeyi döndür
    const levels: ('bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'vip')[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'vip'];
    const orderIndex = levels.indexOf(orderLevel);
    const spendingIndex = levels.indexOf(spendingLevel);
    
    return levels[Math.max(orderIndex, spendingIndex)];
  };

  // URL parametresine göre aktif sekme belirleme
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'orders', 'addresses', 'favorites', 'payment', 'notifications', 'password'].includes(tab)) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  // Kullanıcı oturum açmamışsa giriş sayfasına yönlendir
  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Kullanıcı profil bilgilerini getir
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        let profile = await getUserProfile(user.uid);
        
        // Eğer profil bulunamadıysa, varsayılan bir profil oluştur
        if (!profile) {
          console.warn("Kullanıcı profili bulunamadı, varsayılan profil oluşturuluyor...");
          
          // Kullanıcı bilgilerini kullanarak varsayılan profil oluştur
          const defaultProfile = {
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            displayName: user.displayName || '',
            email: user.email || '',
            phoneNumber: '',
            address: '',
            dateOfBirth: '',
            membershipLevel: 'bronze' as const,
            loyaltyPoints: 0,
            totalOrders: 0,
            totalSpent: 0,
            averageRating: 0,
            isEmailVerified: user.emailVerified || false,
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
              theme: 'light' as const
            }
          };
          
          // Firestore'a varsayılan profili kaydet
          await createUserProfile(user.uid, defaultProfile);
          
          // Tekrar profil getir
          profile = await getUserProfile(user.uid);
          
          if (!profile) {
            toast.error("Profil oluşturulamadı. Lütfen tekrar giriş yapın.");
            return;
          }
          
          toast.success("Profiliniz başarıyla oluşturuldu!");
        }
        
        setUserProfile(profile as UserProfile);
        
        // Aktif sipariş sayısını hesapla
        const userOrders = await getUserOrders(user.uid);
        const activeOrders = userOrders.filter((order: any) => 
          !['delivered', 'canceled'].includes(order.status)
        );
        setActiveOrdersCount(activeOrders.length);
        
        // Üye seviyesini hesapla
        const calculatedLevel = calculateMembershipLevel(profile.totalOrders || 0, profile.totalSpent || 0);
        setUserProfile(prev => prev ? { ...prev, membershipLevel: calculatedLevel } : null);
        
      } catch (error) {
        console.error("Profil yüklenirken hata:", error);
        toast.error("Profil bilgileri yüklenemedi.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Favori restoranları gerçek zamanlı dinle
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToUserFavorites(user.uid, async (favoriteIds) => {
      if (favoriteIds.length === 0) {
        setFavoriteRestaurants([]);
        return;
      }
      
      // Her favori restoran için detayları getir
      const restaurants = await Promise.all(
        favoriteIds.map(async (id: string) => {
          try {
            return await getRestaurant(id);
          } catch (error) {
            console.error(`Restoran ${id} yüklenirken hata:`, error);
            return null;
          }
        })
      );
      
      // Null değerleri filtrele
      setFavoriteRestaurants(restaurants.filter((r: any) => r !== null));
    });

    return unsubscribe;
  }, [user]);

  const handleAddCard = () => {
    // Basit validasyon
    if (!cardForm.cardNumber || !cardForm.expiryMonth || !cardForm.expiryYear || !cardForm.cvv || !cardForm.cardHolder) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (cardForm.cardNumber.replace(/\s/g, '').length < 16) {
      toast.error('Geçersiz kart numarası');
      return;
    }

    if (cardForm.cvv.length < 3) {
      toast.error('Geçersiz CVV');
      return;
    }

    // Kart tipini belirle
    const cardNumber = cardForm.cardNumber.replace(/\s/g, '');
    let cardType = 'Unknown';
    if (cardNumber.startsWith('4')) cardType = 'Visa';
    else if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) cardType = 'Mastercard';
    else if (cardNumber.startsWith('3')) cardType = 'American Express';

    // Yeni kartı ekle
    const newCard = {
      lastFour: cardNumber.slice(-4),
      cardHolder: cardForm.cardHolder,
      type: cardType,
      expiryMonth: cardForm.expiryMonth,
      expiryYear: cardForm.expiryYear
    };

    setSavedCards(prev => [...prev, newCard]);
    setCardForm({
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardHolder: ''
    });
    setShowAddCardModal(false);
    toast.success('Kart başarıyla eklendi!');
  };

  const handleEditCard = (card: any, index: number) => {
    setEditingCard({ ...card, index });
    setEditCardForm({
      cardNumber: `**** **** **** ${card.lastFour}`,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cvv: '',
      cardHolder: card.cardHolder
    });
    setShowEditCardModal(true);
  };

  const handleUpdateCard = () => {
    // Basit validasyon
    if (!editCardForm.expiryMonth || !editCardForm.expiryYear || !editCardForm.cardHolder) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    // Eğer kart numarası değiştirildiyse validasyon yap
    if (editCardForm.cardNumber && !editCardForm.cardNumber.includes('****')) {
      if (editCardForm.cardNumber.replace(/\s/g, '').length < 16) {
        toast.error('Geçersiz kart numarası');
        return;
      }
    }

    // Kart tipini belirle (eğer kart numarası değiştirildiyse)
    let cardType = editingCard.type;
    if (editCardForm.cardNumber && !editCardForm.cardNumber.includes('****')) {
      const cardNumber = editCardForm.cardNumber.replace(/\s/g, '');
      if (cardNumber.startsWith('4')) cardType = 'Visa';
      else if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) cardType = 'Mastercard';
      else if (cardNumber.startsWith('3')) cardType = 'American Express';
    }

    // Kartı güncelle
    const updatedCard = {
      lastFour: editCardForm.cardNumber && !editCardForm.cardNumber.includes('****') 
        ? editCardForm.cardNumber.replace(/\s/g, '').slice(-4) 
        : editingCard.lastFour,
      cardHolder: editCardForm.cardHolder,
      type: cardType,
      expiryMonth: editCardForm.expiryMonth,
      expiryYear: editCardForm.expiryYear
    };

    setSavedCards(prev => prev.map((card, index) => 
      index === editingCard.index ? updatedCard : card
    ));

    setEditingCard(null);
    setEditCardForm({
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardHolder: ''
    });
    setShowEditCardModal(false);
    toast.success('Kart başarıyla güncellendi!');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
      toast.success("Başarıyla çıkış yapıldı.");
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
      toast.error("Çıkış yapılamadı. Lütfen tekrar deneyin.");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/restaurants?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/restaurants');
    }
  };

  // Sidebar menu items - role'a göre filtrelenmiş
  const menuItems = [
    {
      id: "profile",
      label: "Profil Bilgileri",
      icon: UserIcon,
      description: "Kişisel bilgilerinizi düzenleyin"
    },
    ...(userProfile?.role === 'shop' ? [
      {
        id: "restaurant-dashboard",
        label: "Restoran Paneli",
        icon: TrendingUp,
        description: "Restoran istatistikleri ve analitikler",
        badge: "Yeni"
      },
      {
        id: "restaurant-orders",
        label: "Sipariş Yönetimi",
        icon: ClipboardList,
        description: "Gelen siparişleri yönetin",
        badge: activeOrdersCount > 0 ? activeOrdersCount.toString() : undefined
      },
      {
        id: "restaurant-menu",
        label: "Menü Yönetimi",
        icon: Settings,
        description: "Menü ve ürünleri düzenleyin"
      },
      {
        id: "restaurant-analytics",
        label: "Analitikler",
        icon: BarChart3,
        description: "Satış raporları ve istatistikler"
      }
    ] : [
      {
        id: "orders",
        label: "Siparişlerim",
        icon: Package,
        description: "Aktif siparişlerinizi görüntüleyin",
        badge: activeOrdersCount > 0 ? activeOrdersCount.toString() : undefined
      },
      {
        id: "addresses",
        label: "Adreslerim",
        icon: MapPin,
        description: "Teslimat adreslerinizi yönetin"
      },
      {
        id: "favorites",
        label: "Favorilerim",
        icon: Heart,
        description: "Favori restoranlarınız"
      },
      {
        id: "payment",
        label: "Ödeme Yöntemleri",
        icon: CreditCard,
        description: "Kart bilgilerinizi yönetin"
      }
    ]),
    {
      id: "notifications",
      label: "Bildirimler",
      icon: Bell,
      description: "Bildirim tercihleriniz"
    },
    {
      id: "password",
      label: "Güvenlik",
      icon: Lock,
      description: "Şifre ve güvenlik ayarları"
    },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderContent = () => {
    // Restoran sahipleri için izin verilmeyen bölümler
    if (userProfile?.role === 'shop' && ['orders', 'addresses', 'favorites', 'payment'].includes(activeSection)) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <UserIcon className="h-16 w-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Bu bölüm size uygun değil</h3>
            <p className="text-gray-600">
              Restoran sahipleri olarak müşteri özelliklerine erişemezsiniz.
            </p>
          </CardContent>
        </Card>
      );
    }

    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            {/* Profil Özeti */}
            <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 opacity-50"></div>
              <CardHeader className="relative pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <UserIcon className="h-6 w-6 text-white" />
                  </div>
                  Profil Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 relative">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin animation-delay-300"></div>
                    </div>
                  </div>
                ) : (
                  <ProfileForm userProfile={userProfile} onUpdateSuccess={setUserProfile} />
                )}
              </CardContent>
            </Card>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-colors duration-300">
                      <Package className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-blue-100 text-sm font-medium mb-1">Toplam Sipariş</p>
                      <p className="text-3xl font-bold">{userProfile?.totalOrders || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-colors duration-300">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-green-100 text-sm font-medium mb-1">Toplam Harcama</p>
                      <p className="text-3xl font-bold">₺{userProfile?.totalSpent?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-colors duration-300">
                      <Star className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-yellow-100 text-sm font-medium mb-1">Ortalama Puan</p>
                      <p className="text-3xl font-bold">{userProfile?.averageRating?.toFixed(1) || '0.0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "orders":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Sipariş Geçmişim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderHistory />
            </CardContent>
          </Card>
        );

      case "addresses":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Teslimat Adreslerim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddressManager userId={user.uid} />
            </CardContent>
          </Card>
        );

      case "favorites":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Favori Restoranlarım
              </CardTitle>
            </CardHeader>
            <CardContent>
              {favoritesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : favoriteRestaurants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteRestaurants.map((restaurant: any) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Henüz favori restoranınız yok</h3>
                  <p className="text-gray-500 mb-4">Beğendiğiniz restoranları favorilere ekleyin</p>
                  <Button onClick={() => router.push('/restaurants')}>
                    Restoranları Keşfet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "payment":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ödeme Yöntemlerim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Kayıtlı Kartlar */}
                {savedCards.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">Kayıtlı Kartlarım</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedCards.map((card, index) => (
                        <div key={index} className="relative">
                          {/* Kart Tasarımı */}
                          <div className={`relative h-48 rounded-xl p-6 text-white overflow-hidden ${
                            card.type === 'Visa' ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                            card.type === 'Mastercard' ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                            card.type === 'American Express' ? 'bg-gradient-to-br from-green-600 to-green-800' :
                            'bg-gradient-to-br from-gray-600 to-gray-800'
                          }`}>
                        
                            
                            {/* Kart Tipi İkonu */}
                            <div className="absolute top-4 left-4">
                              {card.type === 'Visa' && (
                                <div className="text-3xl font-bold tracking-wider">VISA</div>
                              )}
                              {card.type === 'Mastercard' && (
                                <div className="text-3xl font-bold tracking-wider">MASTERCARD</div>
                              )}
                              {card.type === 'American Express' && (
                                <div className="text-3xl font-bold tracking-wider">AMEX</div>
                              )}
                              {card.type === 'Unknown' && (
                                <div className="text-3xl font-bold tracking-wider">CARD</div>
                              )}
                            </div>

                            {/* Kart Numarası */}
                            <div className="absolute bottom-16 left-6 right-6">
                              <div className="text-xl font-mono tracking-wider">
                                **** **** **** {card.lastFour}
                              </div>
                            </div>

                            {/* Kart Sahibi ve Tarih */}
                            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                              <div>
                                <div className="text-xs opacity-80 mb-1">KART SAHİBİ</div>
                                <div className="text-sm font-medium">{card.cardHolder}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs opacity-80 mb-1">SON KULLANMA</div>
                                <div className="text-sm font-medium">{card.expiryMonth}/{card.expiryYear.slice(-2)}</div>
                              </div>
                            </div>

                            {/* Düzenle/Sil Butonları */}
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 hover:text-blue-700 border border-blue-500/30"
                                onClick={() => handleEditCard(card, index)}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 hover:text-yellow-700 border border-yellow-500/30"
                                onClick={() => {
                                  setSavedCards(prev => prev.filter((_, i) => i !== index));
                                  toast.success('Kart silindi');
                                }}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Kayıtlı kart bulunmuyor</h3>
                    <p className="text-gray-500 mb-4">Hızlı ödeme için kartınızı kaydedin</p>
                  </div>
                )}

                {/* Kart Ekle Butonu */}
                <div className="flex justify-center pt-4">
                  <Button onClick={() => setShowAddCardModal(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Kart Ekle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "notifications":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Bildirim Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Sipariş Bildirimleri</h4>
                    <p className="text-sm text-gray-500">Sipariş durumu hakkında bilgi alın</p>
                  </div>
                  <Button variant="outline" size="sm">Açık</Button>
                </div>
                
                <hr className="my-4" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Promosyon Bildirimleri</h4>
                    <p className="text-sm text-gray-500">İndirim ve kampanya bilgileri</p>
                  </div>
                  <Button variant="outline" size="sm">Kapalı</Button>
                </div>
                
                <hr className="my-4" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">E-posta Bildirimleri</h4>
                    <p className="text-sm text-gray-500">E-posta ile bildirim almak</p>
                  </div>
                  <Button variant="outline" size="sm">Açık</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "restaurant-dashboard":
        return (
          <div className="space-y-6">
            {/* Restoran Özeti */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Bugünkü Siparişler</p>
                      <p className="text-3xl font-bold">24</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-full">
                      <Package className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Toplam Ciro</p>
                      <p className="text-3xl font-bold">₺2,450</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-full">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Ortalama Puan</p>
                      <p className="text-3xl font-bold">4.8</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-full">
                      <Star className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Aktif Siparişler</p>
                      <p className="text-3xl font-bold">3</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-full">
                      <Zap className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Son Siparişler */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                  Son Siparişler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((order) => (
                    <div key={order} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Sipariş #{1000 + order}</p>
                          <p className="text-sm text-gray-600">2 öğe • ₺45.00</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Hazırlanıyor
                        </Badge>
                        <Button size="sm" variant="outline" className="hover:bg-blue-50">
                          Detaylar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "restaurant-orders":
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ClipboardList className="h-6 w-6 text-blue-600" />
                Sipariş Yönetimi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 mb-6">
                  <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                    Tüm Siparişler
                  </Button>
                  <Button variant="outline">
                    Bekleyen
                  </Button>
                  <Button variant="outline">
                    Hazırlanıyor
                  </Button>
                  <Button variant="outline">
                    Hazır
                  </Button>
                </div>

                {[1, 2, 3, 4, 5].map((order) => (
                  <div key={order} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">Sipariş #{1000 + order}</h3>
                          <p className="text-gray-600">Ahmet Yılmaz • 15 dk önce</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">₺67.50</p>
                        <p className="text-sm text-gray-500">3 öğe</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Tavuk Döner:</span>
                        <span>1 adet</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Mercimek Çorbası:</span>
                        <span>1 adet</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Ayran:</span>
                        <span>1 adet</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Beklemede
                        </Badge>
                        <span className="text-sm text-gray-500">Tahmini teslimat: 25 dk</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="hover:bg-red-50 hover:text-red-600">
                          Reddet
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Kabul Et
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "restaurant-menu":
        return (
          <div className="space-y-6">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Settings className="h-6 w-6 text-blue-600" />
                  Menü Yönetimi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50">
                    <CardContent className="p-6 text-center">
                      <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Yeni Ürün Ekle</h3>
                      <p className="text-gray-600 text-sm">Menünüze yeni bir ürün ekleyin</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-dashed border-gray-300 hover:border-green-400 bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-6 text-center">
                      <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                        <Settings className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Kategorileri Düzenle</h3>
                      <p className="text-gray-600 text-sm">Ürün kategorilerini yönetin</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-dashed border-gray-300 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardContent className="p-6 text-center">
                      <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Fiyat Güncelle</h3>
                      <p className="text-gray-600 text-sm">Toplu fiyat güncellemesi yapın</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-8">
                  <h3 className="font-semibold text-lg mb-4">Mevcut Ürünler</h3>
                  <div className="space-y-4">
                    {[
                      { name: "Tavuk Döner", price: "25.00", category: "Ana Yemekler", status: "Aktif" },
                      { name: "Mercimek Çorbası", price: "12.00", category: "Çorbalar", status: "Aktif" },
                      { name: "Ayran", price: "5.00", category: "İçecekler", status: "Aktif" }
                    ].map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Package className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{product.name}</h4>
                            <p className="text-sm text-gray-600">{product.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-lg text-green-600">₺{product.price}</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {product.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            Düzenle
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "restaurant-analytics":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Haftalık Satış Grafiği
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => {
                      const height = [60, 80, 45, 90, 75, 85, 70][index];
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-2">
                          <div 
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-700"
                            style={{ height: `${height}%` }}
                          ></div>
                          <span className="text-xs text-gray-600 font-medium">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Popüler Ürünler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Tavuk Döner", orders: 45, revenue: "1,125₺" },
                      { name: "Mercimek Çorbası", orders: 32, revenue: "384₺" },
                      { name: "Ayran", orders: 28, revenue: "140₺" },
                      { name: "Kola", orders: 22, revenue: "110₺" }
                    ].map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-sm text-gray-600">{product.orders} sipariş</p>
                          </div>
                        </div>
                        <span className="font-bold text-green-600">{product.revenue}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Müşteri Yorumları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { customer: "Ahmet Y.", rating: 5, comment: "Yemekler çok lezzetli, servis hızlı!", date: "2 gün önce" },
                    { customer: "Ayşe K.", rating: 4, comment: "Çok memnun kaldım, tekrar geleceğim.", date: "3 gün önce" },
                    { customer: "Mehmet D.", rating: 5, comment: "Kesinlikle tavsiye ederim!", date: "5 gün önce" }
                  ].map((review, index) => (
                    <div key={index} className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{review.customer}</span>
                          <div className="flex">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      // case "settings":
      //   return (
      //     <Card>
      //       <CardHeader>
      //         <CardTitle className="flex items-center gap-2">
      //           <Settings className="h-5 w-5" />
      //           Genel Ayarlar
      //         </CardTitle>
      //       </CardHeader>
      //       <CardContent>
      //         <div className="space-y-4">
      //           <div className="flex items-center justify-between">
      //             <div>
      //               <h4 className="font-medium">Dil Seçimi</h4>
      //               <p className="text-sm text-gray-500">Uygulamanın görüntüleneceği dil</p>
      //             </div>
      //             <Button variant="outline" size="sm">Türkçe</Button>
      //           </div>
      //           
      //           <hr className="my-4" />
      //           
      //           <div className="flex items-center justify-between">
      //             <div>
      //               <h4 className="font-medium">Tema</h4>
      //               <p className="text-sm text-gray-500">Açık veya koyu tema seçin</p>
      //             </div>
      //             <Button variant="outline" size="sm">Açık</Button>
      //           </div>
      //         </div>
      //       </CardContent>
      //     </Card>
      //   );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-4 ring-gradient-to-r from-blue-400 to-purple-400 shadow-xl">
                  <AvatarImage src={userProfile?.profilePicture || user.photoURL || ""} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                {userProfile?.isEmailVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {user.displayName || "Kullanıcı"}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {user.email}
                  {currentRole === 'restaurant' && (
                    <>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Restoran Sahibi
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Arama Kutusu - Sadece müşteri rolü için göster */}
            {userProfile?.role !== 'shop' && (
              <div className="flex-1 max-w-md mx-8">
                <form onSubmit={handleSearch} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Restoran veya ürün ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-sm"
                  />
                </form>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Badge 
                variant="secondary" 
                className={`flex items-center gap-2 cursor-pointer hover:opacity-90 transition-all duration-200 px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  userProfile?.membershipLevel === 'vip' ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white border-0' :
                  userProfile?.membershipLevel === 'diamond' ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white border-0' :
                  userProfile?.membershipLevel === 'platinum' ? 'bg-gradient-to-r from-gray-700 to-gray-900 text-white border-0' :
                  userProfile?.membershipLevel === 'gold' ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white border-0' :
                  userProfile?.membershipLevel === 'silver' ? 'bg-gradient-to-r from-gray-400 to-gray-600 text-white border-0' :
                  'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-0'
                }`}
                onClick={() => setShowMembershipModal(true)}
              >
                <Crown className="h-4 w-4" />
                {userProfile?.membershipLevel === 'vip' ? 'VIP Üye' :
                 userProfile?.membershipLevel === 'diamond' ? 'Elmas Üye' :
                 userProfile?.membershipLevel === 'platinum' ? 'Platin Üye' :
                 userProfile?.membershipLevel === 'gold' ? 'Altın Üye' :
                 userProfile?.membershipLevel === 'silver' ? 'Gümüş Üye' :
                 'Bronz Üye'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-2 bg-white/50 backdrop-blur-sm border-2 border-gray-200 hover:border-blue-300 transition-all duration-200">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-gray-700">{userProfile?.loyaltyPoints || 0}</span>
                <span className="text-gray-600">Puan</span>
              </Badge>
              {/* Restoranlar butonu - Sadece müşteri rolü için göster */}
              {userProfile?.role !== 'shop' && (
                <Button 
                  onClick={() => router.push('/restaurants')} 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Restoranlar
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-2xl border-0 bg-white/90 backdrop-blur-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-50"></div>
              <CardContent className="p-6 relative">
                <nav className="space-y-3">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 text-left transform hover:scale-105 ${
                        activeSection === item.id
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl"
                          : "hover:bg-white/80 hover:shadow-lg border border-gray-200/50"
                      }`}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl transition-all duration-300 ${
                            activeSection === item.id 
                              ? "bg-white/20" 
                              : "bg-gradient-to-r from-blue-100 to-purple-100 group-hover:from-blue-200 group-hover:to-purple-200"
                          }`}>
                            <item.icon className={`h-5 w-5 transition-colors duration-300 ${
                              activeSection === item.id 
                                ? "text-white" 
                                : "text-blue-600 group-hover:text-purple-600"
                            }`} />
                          </div>
                          <div>
                            <p className={`font-semibold transition-colors duration-300 ${
                              activeSection === item.id 
                                ? "text-white" 
                                : "text-gray-800 group-hover:text-blue-600"
                            }`}>
                              {item.label}
                            </p>
                            <p className={`text-xs transition-colors duration-300 ${
                              activeSection === item.id 
                                ? "text-blue-100" 
                                : "text-gray-500 group-hover:text-purple-500"
                            }`}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                        {item.badge && (
                          <Badge 
                            variant={activeSection === item.id ? "secondary" : "default"}
                            className={`text-xs font-semibold transition-all duration-300 ${
                              activeSection === item.id 
                                ? "bg-white/20 text-white border-white/30" 
                                : "bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 hover:from-red-600 hover:to-pink-600"
                            }`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Hover effect background */}
                      <div className={`absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl ${
                        activeSection === item.id ? "opacity-0" : ""
                      }`}></div>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Üyelik Sistemi Modal */}
      <Dialog open={showMembershipModal} onOpenChange={setShowMembershipModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <DialogHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Üyelik Sistemi
            </DialogTitle>
            <DialogDescription className="text-lg text-gray-600 mt-2">
              Sipariş sayınız ve harcamalarınız doğrultusunda üye seviyeniz otomatik olarak yükselir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            {/* Mevcut Seviye */}
            <div className="bg-gradient-to-r from-white via-blue-50 to-purple-50 p-6 rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm">
              <h3 className="font-bold text-xl mb-4 text-center">Mevcut Üye Seviyeniz</h3>
              <div className="flex items-center justify-center gap-4">
                <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 ${
                  userProfile?.membershipLevel === 'vip' ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white' :
                  userProfile?.membershipLevel === 'diamond' ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white' :
                  userProfile?.membershipLevel === 'platinum' ? 'bg-gradient-to-r from-gray-700 to-gray-900 text-white' :
                  userProfile?.membershipLevel === 'gold' ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white' :
                  userProfile?.membershipLevel === 'silver' ? 'bg-gradient-to-r from-gray-400 to-gray-600 text-white' :
                  'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                }`}>
                  <Award className="h-6 w-6" />
                  <span className="text-xl font-bold">
                    {userProfile?.membershipLevel === 'vip' ? 'VIP Üye' :
                     userProfile?.membershipLevel === 'diamond' ? 'Elmas Üye' :
                     userProfile?.membershipLevel === 'platinum' ? 'Platin Üye' :
                     userProfile?.membershipLevel === 'gold' ? 'Altın Üye' :
                     userProfile?.membershipLevel === 'silver' ? 'Gümüş Üye' :
                     'Bronz Üye'}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl shadow-md">
                  <div className="text-sm text-gray-600 text-center">
                    <div className="font-semibold text-lg text-blue-600">{userProfile?.totalOrders || 0}</div>
                    <div>sipariş</div>
                  </div>
                  <div className="text-sm text-gray-600 text-center mt-2">
                    <div className="font-semibold text-lg text-green-600">₺{userProfile?.totalSpent?.toFixed(2) || '0.00'}</div>
                    <div>harcama</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Üye Seviyeleri Tablosu */}
            <div className="space-y-6">
              <h3 className="font-bold text-2xl text-center text-gray-800">Üye Seviyeleri</h3>
              
              <div className="grid gap-4">
                {/* Bronz Üye */}
                <div className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  userProfile?.membershipLevel === 'bronze' 
                    ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-amber-300'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl transition-all duration-300 ${
                        userProfile?.membershipLevel === 'bronze' 
                          ? 'bg-amber-500 text-white shadow-lg' 
                          : 'bg-amber-100 text-amber-600 group-hover:bg-amber-200'
                      }`}>
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">Bronz Üye</h4>
                        <p className="text-gray-600">Yeni başlayan üyeler</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-600">0-49 sipariş</div>
                      <div className="text-sm font-semibold text-gray-600">₺0-999 harcama</div>
                    </div>
                  </div>
                </div>

                {/* Gümüş Üye */}
                <div className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  userProfile?.membershipLevel === 'silver' 
                    ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-slate-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-400/10 to-slate-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl transition-all duration-300 ${
                        userProfile?.membershipLevel === 'silver' 
                          ? 'bg-gray-500 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }`}>
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">Gümüş Üye</h4>
                        <p className="text-gray-600">Düzenli müşteriler</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-600">50-99 sipariş</div>
                      <div className="text-sm font-semibold text-gray-600">₺1.000-2.499 harcama</div>
                    </div>
                  </div>
                </div>

                {/* Altın Üye */}
                <div className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  userProfile?.membershipLevel === 'gold' 
                    ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-yellow-400'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-amber-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl transition-all duration-300 ${
                        userProfile?.membershipLevel === 'gold' 
                          ? 'bg-yellow-500 text-white shadow-lg' 
                          : 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200'
                      }`}>
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">Altın Üye</h4>
                        <p className="text-gray-600">Sadık müşteriler</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-600">100-199 sipariş</div>
                      <div className="text-sm font-semibold text-gray-600">₺2.500-4.999 harcama</div>
                    </div>
                  </div>
                </div>

                {/* Platin Üye */}
                <div className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  userProfile?.membershipLevel === 'platinum' 
                    ? 'border-gray-800 bg-gradient-to-r from-gray-50 to-slate-100 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-gray-600'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600/10 to-slate-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl transition-all duration-300 ${
                        userProfile?.membershipLevel === 'platinum' 
                          ? 'bg-gray-800 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'
                      }`}>
                        <Gem className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">Platin Üye</h4>
                        <p className="text-gray-600">Premium üyeler</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-600">200-349 sipariş</div>
                      <div className="text-sm font-semibold text-gray-600">₺5.000-9.999 harcama</div>
                    </div>
                  </div>
                </div>

                {/* Elmas Üye */}
                <div className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  userProfile?.membershipLevel === 'diamond' 
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-blue-400'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl transition-all duration-300 ${
                        userProfile?.membershipLevel === 'diamond' 
                          ? 'bg-blue-500 text-white shadow-lg' 
                          : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                      }`}>
                        <Gem className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">Elmas Üye</h4>
                        <p className="text-gray-600">VIP müşteriler</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-600">350-499 sipariş</div>
                      <div className="text-sm font-semibold text-gray-600">₺10.000-19.999 harcama</div>
                    </div>
                  </div>
                </div>

                {/* VIP Üye */}
                <div className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  userProfile?.membershipLevel === 'vip' 
                    ? 'border-purple-500 bg-gradient-to-r from-purple-50 via-pink-50 to-red-50 shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-purple-400'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl transition-all duration-300 ${
                        userProfile?.membershipLevel === 'vip' 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                          : 'bg-purple-100 text-purple-600 group-hover:bg-purple-200'
                      }`}>
                        <Crown className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">VIP Üye</h4>
                        <p className="text-gray-600">En değerli müşteriler</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-600">500+ sipariş</div>
                      <div className="text-sm font-semibold text-gray-600">₺20.000+ harcama</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* İlerleme Durumu */}
            <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 p-6 rounded-2xl shadow-xl border border-green-200/50">
              <h3 className="font-bold text-xl mb-4 text-center text-gray-800">Sonraki Seviye</h3>
              {userProfile?.membershipLevel === 'vip' ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-green-700 font-bold text-xl">En yüksek seviyeye ulaştınız!</p>
                  <p className="text-gray-600 mt-2">Tebrikler, VIP üyesiniz!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-gray-700">Sipariş ilerlemesi</span>
                    <span className="text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                      {userProfile?.totalOrders || 0}/{
                        userProfile?.membershipLevel === 'bronze' ? '50' :
                        userProfile?.membershipLevel === 'silver' ? '100' :
                        userProfile?.membershipLevel === 'gold' ? '200' :
                        userProfile?.membershipLevel === 'platinum' ? '350' :
                        '500'
                      }
                    </span>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-1000 shadow-lg"
                        style={{
                          width: `${Math.min(100, ((userProfile?.totalOrders || 0) / (
                            userProfile?.membershipLevel === 'bronze' ? 50 :
                            userProfile?.membershipLevel === 'silver' ? 100 :
                            userProfile?.membershipLevel === 'gold' ? 200 :
                            userProfile?.membershipLevel === 'platinum' ? 350 :
                            500
                          )) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-sm drop-shadow-lg">
                        %{Math.round((userProfile?.totalOrders || 0) / (
                          userProfile?.membershipLevel === 'bronze' ? 50 :
                          userProfile?.membershipLevel === 'silver' ? 100 :
                          userProfile?.membershipLevel === 'gold' ? 200 :
                          userProfile?.membershipLevel === 'platinum' ? 350 :
                          500
                        ) * 100)}
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-gray-600 text-sm">
                    Sonraki seviye için {(
                      (userProfile?.membershipLevel === 'bronze' ? 50 :
                       userProfile?.membershipLevel === 'silver' ? 100 :
                       userProfile?.membershipLevel === 'gold' ? 200 :
                       userProfile?.membershipLevel === 'platinum' ? 350 :
                       500) - (userProfile?.totalOrders || 0)
                    )} sipariş daha gerekiyor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kart Ekleme Modal */}
      <Dialog open={showAddCardModal} onOpenChange={setShowAddCardModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Kart Ekle
            </DialogTitle>
            <DialogDescription>
              Ödeme bilgileriniz güvenli bir şekilde saklanacaktır.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kart Preview */}
            <div className="flex justify-center">
              <div className="relative h-48 w-80 rounded-xl p-6 text-white overflow-hidden shadow-lg">
                {/* Kart Arka Plan */}
                <div className={`absolute inset-0 rounded-xl ${
                  cardForm.cardNumber.startsWith('4') ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                  cardForm.cardNumber.startsWith('5') || cardForm.cardNumber.startsWith('2') ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                  cardForm.cardNumber.startsWith('3') ? 'bg-gradient-to-br from-green-600 to-green-800' :
                  'bg-gradient-to-br from-gray-600 to-gray-800'
                }`} />

                {/* Kart Tipi İkonu */}
                <div className="absolute top-4 left-4">
                  {cardForm.cardNumber.startsWith('4') && (
                    <div className="text-2xl font-bold tracking-wider">VISA</div>
                  )}
                  {(cardForm.cardNumber.startsWith('5') || cardForm.cardNumber.startsWith('2')) && (
                    <div className="text-2xl font-bold tracking-wider">MASTERCARD</div>
                  )}
                  {cardForm.cardNumber.startsWith('3') && (
                    <div className="text-2xl font-bold tracking-wider">AMEX</div>
                  )}
                  {!cardForm.cardNumber && (
                    <div className="text-2xl font-bold tracking-wider text-white/50">CARD</div>
                  )}
                </div>

                {/* Kart Numarası */}
                <div className="absolute bottom-16 left-6 right-6">
                  <div className="text-lg font-mono tracking-wider">
                    {cardForm.cardNumber || '**** **** **** ****'}
                  </div>
                </div>

                {/* Kart Sahibi ve Tarih */}
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div>
                    <div className="text-xs opacity-80 mb-1">KART SAHİBİ</div>
                    <div className="text-sm font-medium">{cardForm.cardHolder || 'AD SOYAD'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-80 mb-1">SON KULLANMA</div>
                    <div className="text-sm font-medium">
                      {cardForm.expiryMonth || 'MM'}/{cardForm.expiryYear ? cardForm.expiryYear.slice(-2) : 'YY'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Kart Numarası</label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardForm.cardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                    setCardForm(prev => ({ ...prev, cardNumber: value }));
                  }}
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Son Kullanma</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="AA"
                      value={cardForm.expiryMonth}
                      onChange={(e) => setCardForm(prev => ({ ...prev, expiryMonth: e.target.value }))}
                      maxLength={2}
                    />
                    <Input
                      placeholder="YYYY"
                      value={cardForm.expiryYear}
                      onChange={(e) => setCardForm(prev => ({ ...prev, expiryYear: e.target.value }))}
                      maxLength={4}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">CVV</label>
                  <Input
                    placeholder="123"
                    value={cardForm.cvv}
                    onChange={(e) => setCardForm(prev => ({ ...prev, cvv: e.target.value }))}
                    maxLength={4}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Kart Sahibi</label>
                <Input
                  placeholder="AD SOYAD"
                  value={cardForm.cardHolder}
                  onChange={(e) => setCardForm(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleAddCard} className="flex-1">
                  Kartı Kaydet
                </Button>
                <Button variant="outline" onClick={() => setShowAddCardModal(false)} className="flex-1">
                  İptal
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kart Düzenleme Modal */}
      <Dialog open={showEditCardModal} onOpenChange={setShowEditCardModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Kart Düzenle
            </DialogTitle>
            <DialogDescription>
              Kart bilgilerinizi güncelleyin. Güvenli bir şekilde saklanacaktır.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kart Preview */}
            <div className="flex justify-center">
              <div className="relative h-48 w-80 rounded-xl p-6 text-white overflow-hidden shadow-lg">
                {/* Kart Arka Plan */}
                <div className={`absolute inset-0 rounded-xl ${
                  editCardForm.cardNumber && !editCardForm.cardNumber.includes('****') && editCardForm.cardNumber.startsWith('4') ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                  editCardForm.cardNumber && !editCardForm.cardNumber.includes('****') && (editCardForm.cardNumber.startsWith('5') || editCardForm.cardNumber.startsWith('2')) ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                  editCardForm.cardNumber && !editCardForm.cardNumber.includes('****') && editCardForm.cardNumber.startsWith('3') ? 'bg-gradient-to-br from-green-600 to-green-800' :
                  editingCard?.type === 'Visa' ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                  editingCard?.type === 'Mastercard' ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                  editingCard?.type === 'American Express' ? 'bg-gradient-to-br from-green-600 to-green-800' :
                  'bg-gradient-to-br from-gray-600 to-gray-800'
                }`} />

                {/* Kart Tipi İkonu */}
                <div className="absolute top-4 left-4">
                  {editCardForm.cardNumber && !editCardForm.cardNumber.includes('****') && editCardForm.cardNumber.startsWith('4') && (
                    <div className="text-2xl font-bold tracking-wider">VISA</div>
                  )}
                  {editCardForm.cardNumber && !editCardForm.cardNumber.includes('****') && (editCardForm.cardNumber.startsWith('5') || editCardForm.cardNumber.startsWith('2')) && (
                    <div className="text-2xl font-bold tracking-wider">MASTERCARD</div>
                  )}
                  {editCardForm.cardNumber && !editCardForm.cardNumber.includes('****') && editCardForm.cardNumber.startsWith('3') && (
                    <div className="text-2xl font-bold tracking-wider">AMEX</div>
                  )}
                  {(!editCardForm.cardNumber || editCardForm.cardNumber.includes('****')) && editingCard?.type === 'Visa' && (
                    <div className="text-2xl font-bold tracking-wider">VISA</div>
                  )}
                  {(!editCardForm.cardNumber || editCardForm.cardNumber.includes('****')) && editingCard?.type === 'Mastercard' && (
                    <div className="text-2xl font-bold tracking-wider">MASTERCARD</div>
                  )}
                  {(!editCardForm.cardNumber || editCardForm.cardNumber.includes('****')) && editingCard?.type === 'American Express' && (
                    <div className="text-2xl font-bold tracking-wider">AMEX</div>
                  )}
                  {(!editCardForm.cardNumber || editCardForm.cardNumber.includes('****')) && !editingCard?.type && (
                    <div className="text-2xl font-bold tracking-wider text-white/50">CARD</div>
                  )}
                </div>

                {/* Kart Numarası */}
                <div className="absolute bottom-16 left-6 right-6">
                  <div className="text-lg font-mono tracking-wider">
                    {editCardForm.cardNumber && !editCardForm.cardNumber.includes('****') ? editCardForm.cardNumber :
                     editCardForm.cardNumber && editCardForm.cardNumber.includes('****') ? editCardForm.cardNumber :
                     `**** **** **** ${editingCard?.lastFour || '****'}`}
                  </div>
                </div>

                {/* Kart Sahibi ve Tarih */}
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div>
                    <div className="text-xs opacity-80 mb-1">KART SAHİBİ</div>
                    <div className="text-sm font-medium">{editCardForm.cardHolder || editingCard?.cardHolder || 'AD SOYAD'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-80 mb-1">SON KULLANMA</div>
                    <div className="text-sm font-medium">
                      {editCardForm.expiryMonth || editingCard?.expiryMonth || 'MM'}/{(editCardForm.expiryYear || editingCard?.expiryYear)?.slice(-2) || 'YY'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Kart Numarası</label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={editCardForm.cardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                    setEditCardForm(prev => ({ ...prev, cardNumber: value }));
                  }}
                  maxLength={19}
                />
                <p className="text-xs text-gray-500 mt-1">Değiştirmek istemiyorsanız boş bırakın</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Son Kullanma</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="AA"
                      value={editCardForm.expiryMonth}
                      onChange={(e) => setEditCardForm(prev => ({ ...prev, expiryMonth: e.target.value }))}
                      maxLength={2}
                    />
                    <Input
                      placeholder="YYYY"
                      value={editCardForm.expiryYear}
                      onChange={(e) => setEditCardForm(prev => ({ ...prev, expiryYear: e.target.value }))}
                      maxLength={4}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">CVV</label>
                  <Input
                    placeholder="123"
                    value={editCardForm.cvv}
                    onChange={(e) => setEditCardForm(prev => ({ ...prev, cvv: e.target.value }))}
                    maxLength={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">Değiştirmek için gerekli</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Kart Sahibi</label>
                <Input
                  placeholder="AD SOYAD"
                  value={editCardForm.cardHolder}
                  onChange={(e) => setEditCardForm(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleUpdateCard} className="flex-1">
                  Kartı Güncelle
                </Button>
                <Button variant="outline" onClick={() => setShowEditCardModal(false)} className="flex-1">
                  İptal
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfilePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>}>
      <ProfilePage />
    </Suspense>
  );
}

export default ProfilePageWrapper;