"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getUserProfile, getUserOrders, getFavoriteRestaurants, getRestaurant, subscribeToUserFavorites } from "@/lib/firebase/db";
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
  Zap
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
  const { user, signOut } = useAuth();
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
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile as UserProfile);
        
        // Aktif sipariş sayısını hesapla
        const userOrders = await getUserOrders(user.uid);
        const activeOrders = userOrders.filter((order: any) => 
          !['delivered', 'canceled'].includes(order.status)
        );
        setActiveOrdersCount(activeOrders.length);
        
        // Üye seviyesini hesapla
        const calculatedLevel = calculateMembershipLevel((profile as UserProfile).totalOrders || 0, (profile as UserProfile).totalSpent || 0);
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
    ...(userProfile?.role !== 'restaurant' ? [
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
    ] : []),
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
    if (userProfile?.role === 'restaurant' && ['orders', 'addresses', 'favorites', 'payment'].includes(activeSection)) {
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Profil Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ProfileForm userProfile={userProfile} onUpdateSuccess={setUserProfile} />
                )}
              </CardContent>
            </Card>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                      <p className="text-2xl font-bold">{userProfile?.totalOrders || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Harcama</p>
                      <p className="text-2xl font-bold">₺{userProfile?.totalSpent?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Star className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ortalama Puan</p>
                      <p className="text-2xl font-bold">{userProfile?.averageRating?.toFixed(1) || '0.0'}</p>
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

      case "password":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Güvenlik Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PasswordResetForm />
            </CardContent>
          </Card>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={userProfile?.profilePicture || user.photoURL || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">
                  {user.displayName || "Kullanıcı"}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
              </div>
            </div>
            
            {/* Arama Kutusu */}
            <div className="flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Restoran veya ürün ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
              </form>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${
                  userProfile?.membershipLevel === 'vip' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' :
                  userProfile?.membershipLevel === 'diamond' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' :
                  userProfile?.membershipLevel === 'platinum' ? 'bg-gray-800 text-white' :
                  userProfile?.membershipLevel === 'gold' ? 'bg-yellow-500 text-white' :
                  userProfile?.membershipLevel === 'silver' ? 'bg-gray-400 text-white' :
                  'bg-amber-600 text-white'
                }`}
                onClick={() => setShowMembershipModal(true)}
              >
                <Award className="h-3 w-3" />
                {userProfile?.membershipLevel === 'vip' ? 'VIP Üye' :
                 userProfile?.membershipLevel === 'diamond' ? 'Elmas Üye' :
                 userProfile?.membershipLevel === 'platinum' ? 'Platin Üye' :
                 userProfile?.membershipLevel === 'gold' ? 'Altın Üye' :
                 userProfile?.membershipLevel === 'silver' ? 'Gümüş Üye' :
                 'Bronz Üye'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {userProfile?.loyaltyPoints || 0} Puan
              </Badge>
              <Button variant="outline" onClick={() => router.push('/restaurants')}>
                <Home className="h-4 w-4 mr-2" />
                Restoranlar
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
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
            <Card className="sticky top-8">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className={`text-xs ${
                            activeSection === item.id 
                              ? "text-primary-foreground/80" 
                              : "text-gray-500"
                          }`}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                      {item.badge && (
                        <Badge 
                          variant={activeSection === item.id ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Crown className="h-6 w-6 text-yellow-500" />
              Üyelik Sistemi
            </DialogTitle>
            <DialogDescription>
              Sipariş sayınız ve harcamalarınız doğrultusunda üye seviyeniz otomatik olarak yükselir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Mevcut Seviye */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Mevcut Üye Seviyeniz</h3>
              <div className="flex items-center gap-3">
                <Badge 
                  className={`flex items-center gap-2 text-lg px-4 py-2 ${
                    userProfile?.membershipLevel === 'vip' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' :
                    userProfile?.membershipLevel === 'diamond' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' :
                    userProfile?.membershipLevel === 'platinum' ? 'bg-gray-800 text-white' :
                    userProfile?.membershipLevel === 'gold' ? 'bg-yellow-500 text-white' :
                    userProfile?.membershipLevel === 'silver' ? 'bg-gray-400 text-white' :
                    'bg-amber-600 text-white'
                  }`}
                >
                  <Award className="h-5 w-5" />
                  {userProfile?.membershipLevel === 'vip' ? 'VIP Üye' :
                   userProfile?.membershipLevel === 'diamond' ? 'Elmas Üye' :
                   userProfile?.membershipLevel === 'platinum' ? 'Platin Üye' :
                   userProfile?.membershipLevel === 'gold' ? 'Altın Üye' :
                   userProfile?.membershipLevel === 'silver' ? 'Gümüş Üye' :
                   'Bronz Üye'}
                </Badge>
                <div className="text-sm text-gray-600">
                  {userProfile?.totalOrders || 0} sipariş • ₺{userProfile?.totalSpent?.toFixed(2) || '0.00'} harcama
                </div>
              </div>
            </div>

            {/* Üye Seviyeleri Tablosu */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Üye Seviyeleri</h3>
              
              <div className="grid gap-4">
                {/* Bronz Üye */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  userProfile?.membershipLevel === 'bronze' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-full">
                        <Award className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Bronz Üye</h4>
                        <p className="text-sm text-gray-600">Yeni başlayan üyeler</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>0-49 sipariş</p>
                      <p>₺0-999 harcama</p>
                    </div>
                  </div>
                </div>

                {/* Gümüş Üye */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  userProfile?.membershipLevel === 'silver' ? 'border-gray-400 bg-gray-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Award className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Gümüş Üye</h4>
                        <p className="text-sm text-gray-600">Düzenli müşteriler</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>50-99 sipariş</p>
                      <p>₺1.000-2.499 harcama</p>
                    </div>
                  </div>
                </div>

                {/* Altın Üye */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  userProfile?.membershipLevel === 'gold' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <Award className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Altın Üye</h4>
                        <p className="text-sm text-gray-600">Sadık müşteriler</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>100-199 sipariş</p>
                      <p>₺2.500-4.999 harcama</p>
                    </div>
                  </div>
                </div>

                {/* Platin Üye */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  userProfile?.membershipLevel === 'platinum' ? 'border-gray-800 bg-gray-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Gem className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Platin Üye</h4>
                        <p className="text-sm text-gray-600">Premium üyeler</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>200-349 sipariş</p>
                      <p>₺5.000-9.999 harcama</p>
                    </div>
                  </div>
                </div>

                {/* Elmas Üye */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  userProfile?.membershipLevel === 'diamond' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Gem className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Elmas Üye</h4>
                        <p className="text-sm text-gray-600">VIP müşteriler</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>350-499 sipariş</p>
                      <p>₺10.000-19.999 harcama</p>
                    </div>
                  </div>
                </div>

                {/* VIP Üye */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  userProfile?.membershipLevel === 'vip' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Crown className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">VIP Üye</h4>
                        <p className="text-sm text-gray-600">En değerli müşteriler</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>500+ sipariş</p>
                      <p>₺20.000+ harcama</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Avantajlar */}
            {/*
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Üye Avantajları
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Özel indirimler ve kampanyalar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Öncelikli müşteri desteği</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Hızlı teslimat garantisi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Doğum günü sürprizleri</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Ücretsiz teslimat fırsatları</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Özel menü önerileri</span>
                </div>
              </div>
            </div>
            */}

            {/* İlerleme Durumu */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Sonraki Seviye</h3>
              {userProfile?.membershipLevel === 'vip' ? (
                <p className="text-green-700 font-medium">🎉 En yüksek seviyeye ulaştınız!</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sipariş ilerlemesi</span>
                    <span>{userProfile?.totalOrders || 0}/{
                      userProfile?.membershipLevel === 'bronze' ? '50' :
                      userProfile?.membershipLevel === 'silver' ? '100' :
                      userProfile?.membershipLevel === 'gold' ? '200' :
                      userProfile?.membershipLevel === 'platinum' ? '350' :
                      '500'
                    }</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
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