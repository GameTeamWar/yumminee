"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ChefHat,
  ClipboardList,
  BarChart3,
  Star,
  Settings,
  HelpCircle,
  Store,
  Clock,
  Users,
  Package,
  ChevronDown,
  Power,
  PowerOff,
  AlertTriangle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantByOwnerId, updateRestaurant, getProductsByShop } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/config';
import { Restaurant } from '@/types';
import type { Product } from '@/lib/firebase/db';
import { toast } from 'sonner';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAutoRestaurantStatus } from '@/hooks/useAutoRestaurantStatus';
import { isRestaurantOpenBasedOnHours } from '@/lib/utils/restaurantHours';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useMemo, useCallback } from 'react';

const menuItems = [
  {
    title: 'Siparişler',
    icon: ClipboardList,
    href: '/shop/orders',
    badge: null
  },
  {
    title: 'Menü Yönetimi',
    icon: Store,
    href: '/shop/menu',
    badge: null,
    hasSubmenu: true,
    submenu: [
      { title: 'Tüm Ürünler', href: '/shop/menu/products' },
      { title: 'Yeni Ürün Ekle', href: '/shop/menu/add-product' },
      { title: 'Kategori Yönetimi', href: '/shop/menu/categories' },
      { title: 'Opsiyon Yönetimi', href: '/shop/menu/options' }
    ]
  },
  {
    title: 'Raporlar',
    icon: BarChart3,
    href: '/shop/reports',
    badge: null
  },
  {
    title: 'Yorumlar',
    icon: Star,
    href: '/shop/reviews',
    badge: null
  },
  {
    title: 'Müşteriler',
    icon: Users,
    href: '/shop/customers',
    badge: null
  },
  {
    title: 'Ayarlar',
    icon: Settings,
    href: '/shop/settings',
    badge: null
  },
  {
    title: 'Destek',
    icon: HelpCircle,
    href: '/shop/support',
    badge: null
  }
];

export default function RestaurantSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const panelId = searchParams.get('panel');

  const createLink = (href: string) => {
    if (panelId) {
      return `${href}?panel=${panelId}`;
    }
    return href;
  };

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedCloseOption, setSelectedCloseOption] = useState<string>('');
  const [temporaryCloseTimer, setTemporaryCloseTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [isCancelTimerModalOpen, setIsCancelTimerModalOpen] = useState(false);
  const [systemClosedReason, setSystemClosedReason] = useState<string>('');

  // Otomatik restoran durumu hook'u
  useAutoRestaurantStatus(restaurant);

  // Global restaurant context
  const { getRemainingTime, updateRemainingTime } = useRestaurant();
  const remainingTime = restaurant?.id ? getRemainingTime(restaurant.id) : 0;

  // Ürün kontrolü - Aktif ve mevcut ürün var mı? (Real-time)
  useEffect(() => {
    if (!restaurant?.id) return;

    const productsQuery = query(
      collection(db, 'products'),
      where('restaurantId', '==', restaurant.id),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const activeAndAvailableProducts = products.filter(p => p.isAvailable);

      console.log('🔍 Ürün kontrolü (Real-time):', {
        restaurantId: restaurant.id,
        totalProducts: products.length,
        availableProducts: activeAndAvailableProducts.length,
        products: products.map(p => ({ id: p.id, name: p.name, isAvailable: p.isAvailable }))
      });
      
      // Detaylı ürün listesi
      console.table(products.map(p => ({ 
        'Ürün Adı': p.name, 
        'Mevcut': p.isAvailable ? '✅' : '❌',
        'ID': p.id.substring(0, 8) + '...'
      })));

      if (activeAndAvailableProducts.length === 0) {
        // Ürün yoksa veya hepsi pasifse, tüm günleri kapat
        const updatedHours = { ...restaurant.openingHours };
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        daysOfWeek.forEach(day => {
          if (updatedHours[day]) {
            updatedHours[day].isClosed = true;
          }
        });

        updateRestaurant(restaurant.id, {
          openingHours: updatedHours,
          isOpen: false
        }).catch(console.error);

        setSystemClosedReason('Mevcut ürün bulunmadığından sistem tarafından kapatılmıştır');
        toast.warning('Mevcut ürün bulunmadığından restoran sistem tarafından kapatılmıştır', {
          duration: 10000
        });
      } else if (systemClosedReason) {
        // Ürünler eklendiğinde sistem kapatma nedenini temizle
        setSystemClosedReason('');
      }
    }, (error) => {
      console.error('Ürün kontrolü hatası:', error);
    });

    return unsubscribe;
  }, [restaurant?.id]);

  // Kalan süreyi gerçek zamanlı güncelle - kaldırıldı, artık context'te yönetiliyor

  // Bugünün çalışma saatlerine göre açık olup olmadığını kontrol et
  const isTodayOpenBySchedule = () => {
    if (!restaurant?.openingHours) return false;
    return isRestaurantOpenBasedOnHours(restaurant.openingHours);
  };

  // Bugünün manuel olarak kapatılıp kapatılmadığını kontrol et
  const isTodayManuallyClosed = () => {
    if (!restaurant?.openingHours) return false;
    const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
    const todayHours = restaurant.openingHours[today as keyof typeof restaurant.openingHours];
    return todayHours?.isClosed || false;
  };

  // Tüm günlerin dönemsel olarak kapatılıp kapatılmadığını kontrol et
  const isSeasonallyClosed = () => {
    if (!restaurant?.openingHours) return false;
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return daysOfWeek.every(day => {
      const dayHours = restaurant.openingHours![day as keyof typeof restaurant.openingHours];
      return dayHours?.isClosed || false;
    });
  };

  // Toggle switch'in durumu - memoized
  const isToggleChecked = useMemo(() => {
    if (!restaurant) return false;
    if (systemClosedReason) return false; // Sistem tarafından kapatıldıysa toggle kapalı
    if (isSeasonallyClosed()) return false;
    if (isTodayManuallyClosed()) return false;
    return isTodayOpenBySchedule();
  }, [restaurant, systemClosedReason]);

  // Switch disabled durumu - memoized
  const isSwitchDisabled = useMemo(() => {
    return !restaurant || remainingTime > 0 || !!systemClosedReason;
  }, [restaurant, remainingTime, systemClosedReason]);

  // Süreyi formatla
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}s ${minutes}dk ${remainingSeconds}sn`;
    } else if (minutes > 0) {
      return `${minutes}dk ${remainingSeconds}sn`;
    } else {
      return `${remainingSeconds}sn`;
    }
  };

  // Durum metni
  const getStatusText = () => {
    if (!restaurant) return 'Yükleniyor';

    // Sistem tarafından kapatılmışsa
    if (systemClosedReason) {
      return systemClosedReason;
    }

    if (remainingTime > 0) {
      return `${formatTime(remainingTime)} sonra açılır`;
    }

    if (isSeasonallyClosed()) {
      return 'Dönemsel/tatil sebebiyle kapatıldı';
    }

    if (isTodayManuallyClosed()) {
      return 'Bugün manuel olarak kapatıldı';
    }

    if (isTodayOpenBySchedule()) {
      return 'Çalışma saatlerine göre açık';
    }

    return 'Çalışma saatleri dışında';
  };

  // Component mount olduğunda veya restaurant değiştiğinde kalan süreyi yükle
  useEffect(() => {
    if (restaurant?.tempCloseEndTime) {
      updateRemainingTime(restaurant.id, restaurant.tempCloseEndTime);
    } else {
      updateRemainingTime(restaurant?.id || '', null);
    }
  }, [restaurant?.id, restaurant?.tempCloseEndTime]);

  // Component unmount olduğunda timer'ları temizle
  useEffect(() => {
    return () => {
      if (temporaryCloseTimer) {
        clearTimeout(temporaryCloseTimer);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [temporaryCloseTimer, countdownInterval]);

  // Restaurant verilerini real-time olarak yükle
  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!user?.uid) return;

      const existingRestaurant = await getRestaurantByOwnerId(user.uid);
      let restaurantDocId = user.uid;

      if (existingRestaurant) {
        restaurantDocId = existingRestaurant.id;
      }

      const restaurantRef = doc(db, 'shops', restaurantDocId);
      const unsubscribe = onSnapshot(restaurantRef, (doc) => {
        if (doc.exists()) {
          const restaurantData = { id: doc.id, ...doc.data() } as Restaurant;
          setRestaurant(restaurantData);
        }
      }, (error) => {
        console.error('Sidebar: Restoran bilgileri yüklenirken hata:', error);
      });

      return unsubscribe;
    };

    const unsubscribePromise = loadRestaurantData();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [user?.uid]);

  const toggleMenu = (menuTitle: string) => {
    setExpandedMenu(expandedMenu === menuTitle ? null : menuTitle);
  };

  const handleToggleRestaurant = useCallback(async (checked: boolean) => {
    if (!restaurant) {
      toast.error('Restoran bilgileri bulunamadı');
      return;
    }

    // Sistem tarafından kapatıldıysa açma izni verme
    if (systemClosedReason && checked) {
      toast.error('Önce menüye mevcut ürün eklemeniz gerekiyor', {
        duration: 5000
      });
      return;
    }

    try {
      const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();

      if (!checked) {
        // Kapatma modal'ını aç
        setIsCloseModalOpen(true);
      } else {
        // Aç - eğer dönemsel kapatılmışsa tüm günleri aç, değilse sadece bugünü aç
        const updatedHours = { ...restaurant.openingHours };
        
        if (isSeasonallyClosed()) {
          // Dönemsel kapatılmış, tüm günleri aç
          const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          daysOfWeek.forEach(day => {
            if (updatedHours[day]) {
              updatedHours[day].isClosed = false;
            }
          });
          toast.success('Dönemsel kapatmadan çıkarıldı - tüm günler açıldı');
        } else {
          // Sadece bugünü aç
          if (updatedHours[today]) {
            updatedHours[today].isClosed = false;
          }
          toast.success('Restoran bugün için açıldı');
        }
        
        await updateRestaurant(restaurant.id, { 
          openingHours: updatedHours 
        });
      }
    } catch (error) {
      console.error('Restoran durumu güncellenirken hata:', error);
      toast.error('Restoran durumu güncellenirken bir hata oluştu');
    }
  }, [restaurant, systemClosedReason]);

  const handleCloseRestaurant = async () => {
    try {
      if (!restaurant) {
        toast.error('Restoran bilgileri bulunamadı');
        return;
      }

      const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();

      if (selectedCloseOption.startsWith('temp-')) {
        // Kısa süreli kapatma - sadece bugünü kapat
        const minutes = parseInt(selectedCloseOption.split('-')[1]);
        const totalSeconds = minutes * 60;
        const endTime = Math.floor(Date.now() / 1000) + totalSeconds;

        const updatedHours = { ...restaurant.openingHours };
        if (updatedHours[today]) {
          updatedHours[today].isClosed = true;
        }

        await updateRestaurant(restaurant.id, {
          openingHours: updatedHours,
          tempCloseEndTime: endTime,
          tempCloseOption: selectedCloseOption
        });

        updateRemainingTime(restaurant.id, endTime);

        toast.success(`${minutes} dakika sonra bugün otomatik açılacak`);
      } else if (selectedCloseOption === 'manual-close') {
        // Manuel kapat: sadece bugünü kapat
        const updatedHours = { ...restaurant.openingHours };
        if (updatedHours[today]) {
          updatedHours[today].isClosed = true;
        }
        
        await updateRestaurant(restaurant.id, { 
          openingHours: updatedHours,
          tempCloseEndTime: null,
          tempCloseOption: null
        });
        
        toast.success('Bugün manuel olarak kapatıldı. Yarın çalışma saatlerinize göre otomatik açılacak.');
      } else if (selectedCloseOption === 'seasonal-close') {
        // Dönemsel/tatil kapat: tüm günleri kapat
        const updatedHours = { ...restaurant.openingHours };
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        daysOfWeek.forEach(day => {
          if (updatedHours[day]) {
            updatedHours[day].isClosed = true;
          }
        });
        
        await updateRestaurant(restaurant.id, { 
          openingHours: updatedHours,
          tempCloseEndTime: null,
          tempCloseOption: null
        });
        
        toast.success('Dönemsel/tatil sebebiyle tüm günler kapatıldı. Açmak için manuel olarak açmanız gerekir.');
      }

      setIsCloseModalOpen(false);
      setSelectedCloseOption('');
    } catch (error) {
      console.error('Restoran kapatılırken hata:', error);
      toast.error('Restoran kapatılırken bir hata oluştu');
    }
  };

  const handleAutoOpenRestaurant = async () => {
    try {
      if (restaurant) {
        const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
        const updatedHours = { ...restaurant.openingHours };
        if (updatedHours[today]) {
          updatedHours[today].isClosed = false;
        }

        await updateRestaurant(restaurant.id, {
          openingHours: updatedHours,
          tempCloseEndTime: null,
          tempCloseOption: null
        });

        setTemporaryCloseTimer(null);
        updateRemainingTime(restaurant.id, null);
        toast.success('Bugün otomatik olarak açıldı');
      }
    } catch (error) {
      console.error('Restoran açılırken hata:', error);
      toast.error('Restoran açılırken bir hata oluştu');
    }
  };

  const handleCancelTimer = async () => {
    try {
      if (restaurant) {
        // Timer'ı temizle
        if (temporaryCloseTimer) {
          clearTimeout(temporaryCloseTimer);
          setTemporaryCloseTimer(null);
        }
        if (countdownInterval) {
          clearInterval(countdownInterval);
          setCountdownInterval(null);
        }

        // Süreyi sıfırla
        updateRemainingTime(restaurant.id, null);

        // Restoranı aç
        const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
        const updatedHours = { ...restaurant.openingHours };
        if (updatedHours[today]) {
          updatedHours[today].isClosed = false;
        }

        await updateRestaurant(restaurant.id, {
          openingHours: updatedHours,
          tempCloseEndTime: null,
          tempCloseOption: null
        });

        toast.success('Otomatik açılma süresi iptal edildi - restoran açıldı');
        setIsCancelTimerModalOpen(false);
      }
    } catch (error) {
      console.error('Süre iptal edilirken hata:', error);
      toast.error('Süre iptal edilirken bir hata oluştu');
    }
  };

  return (
    <aside className="fixed top-0 left-0 w-64 bg-gray-900 text-white h-screen flex flex-col z-50">
      <div className="p-6 border-b border-gray-800">
        <Link href={createLink("/shop")} className="flex items-center space-x-2">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Store className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold">Restaurant Panel</span>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            
            if (item.hasSubmenu) {
              const isExpanded = expandedMenu === item.title;
              return (
                <div key={item.href}>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-orange-500 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded ? "rotate-180" : ""
                    )} />
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.submenu.map((subItem) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.href}
                            href={createLink(subItem.href)}
                            className={cn(
                              "flex items-center px-4 py-2 rounded-lg transition-colors text-sm",
                              isSubActive
                                ? "bg-orange-500 text-white"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            )}
                          >
                            {subItem.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={createLink(item.href)}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-orange-500 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className={cn(
          "rounded-lg p-3",
          systemClosedReason ? "bg-red-900/50 border border-red-700" :
          remainingTime > 0 ? "bg-orange-900/50 border border-orange-700" : "bg-gray-800"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                systemClosedReason ? "bg-red-500 animate-pulse" :
                remainingTime > 0 ? "bg-orange-500 animate-pulse" :
                restaurant && isToggleChecked ? "bg-green-500 animate-pulse" : "bg-red-500 animate-pulse"
              )}></div>
              <span className="text-sm font-medium">
                {systemClosedReason ? 'Sistem Kapalı' :
                 remainingTime > 0 ? 'Geçici Kapalı' :
                 restaurant ? (isToggleChecked ? 'Hizmet Veriyor' : 'Kapalı') : 'Yükleniyor...'}
              </span>
            </div>
            <button
              onClick={() => handleToggleRestaurant(!isToggleChecked)}
              disabled={isSwitchDisabled}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                isToggleChecked ? "bg-green-500" : "bg-red-500"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform",
                  isToggleChecked ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
          
          {/* Durum açıklaması */}
          <p className={cn(
            "text-xs mb-2",
            systemClosedReason ? "text-red-300" : "text-gray-400"
          )}>
            {getStatusText()}
          </p>

          {/* Sistem tarafından kapatılma uyarısı */}
          {systemClosedReason && (
            <div className="mt-2 flex items-start space-x-2 p-2 bg-red-800/30 rounded">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                Restoranı açmak için menüye mevcut ürün eklemeniz gerekiyor.
              </p>
            </div>
          )}

          {/* Geri sayım göstergesi */}
          {remainingTime > 0 && (
            <div 
              className="mt-2 flex items-center space-x-2 cursor-pointer hover:bg-orange-800/30 p-1 rounded transition-colors"
              onClick={() => setIsCancelTimerModalOpen(true)}
            >
              <Clock className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-orange-300 font-medium">
                Otomatik açılma: {formatTime(remainingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kapatma Modal */}
      <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mağaza Kapatma Seçenekleri</DialogTitle>
            <DialogDescription>
              Restoranınızı kapatmak istediğiniz süreyi seçin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900">Kısa Süreli Kapama</h4>
              <RadioGroup value={selectedCloseOption} onValueChange={setSelectedCloseOption}>
                <div className="grid grid-cols-2 gap-3">
                  {[5, 10, 15, 20, 25, 30, 45, 60, 75, 90, 105, 120].map((minutes) => (
                    <div key={`temp-${minutes}`} className="flex items-center space-x-2">
                      <RadioGroupItem value={`temp-${minutes}`} id={`temp-${minutes}`} />
                      <Label htmlFor={`temp-${minutes}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">
                          {minutes < 60 ? `${minutes} dk` : `${Math.floor(minutes / 60)}s ${minutes % 60}dk`}
                        </div>
                        <div className="text-xs text-gray-500">Otomatik açılır</div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="border-t pt-3">
              <h4 className="font-medium text-sm text-gray-900 mb-3">Diğer Seçenekler</h4>
              <RadioGroup value={selectedCloseOption} onValueChange={setSelectedCloseOption}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual-close" id="manual-close" />
                    <Label htmlFor="manual-close" className="flex-1 cursor-pointer">
                      <div className="font-medium">Bugün İçin Kapat</div>
                      <div className="text-xs text-gray-500">Yarın çalışma saatlerine göre otomatik açılır</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="seasonal-close" id="seasonal-close" />
                    <Label htmlFor="seasonal-close" className="flex-1 cursor-pointer">
                      <div className="font-medium">Dönemsel/Tatil Kapat</div>
                      <div className="text-xs text-gray-500">Tüm günler kapatılır - manuel açılana kadar</div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseModalOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleCloseRestaurant}
              disabled={!selectedCloseOption}
              className="bg-red-600 hover:bg-red-700"
            >
              Restoranı Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Süre İptal Modal */}
      <Dialog open={isCancelTimerModalOpen} onOpenChange={setIsCancelTimerModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Süre İptal Edilsin Mi?</DialogTitle>
            <DialogDescription>
              Otomatik açılma süresini iptal etmek istediğinizden emin misiniz? 
              Restoranınız hemen açılacaktır.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-800">
              Kalan süre: {formatTime(remainingTime)}
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelTimerModalOpen(false)}>
              Hayır, Devam Et
            </Button>
            <Button
              onClick={handleCancelTimer}
              className="bg-green-600 hover:bg-green-700"
            >
              Evet, Süreyi İptal Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}