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
  PowerOff
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
import { getRestaurantByOwnerId, updateRestaurant } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/config';
import { Restaurant } from '@/types';
import { toast } from 'sonner';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAutoRestaurantStatus } from '@/hooks/useAutoRestaurantStatus';
import { isRestaurantOpenBasedOnHours } from '@/lib/utils/restaurantHours';

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
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Otomatik restoran durumu hook'u
  useAutoRestaurantStatus(restaurant);

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

  // Toggle switch'in durumu: Hem manuel kapanış hem de çalışma saatlerini kontrol et
  const isToggleChecked = () => {
    if (!restaurant) return false;
    // Eğer bugün manuel olarak kapatılmışsa, toggle kapalı olmalı
    if (isTodayManuallyClosed()) return false;
    // Eğer çalışma saatlerine göre açıksa ve manuel kapanış yoksa, toggle açık olmalı
    return isTodayOpenBySchedule();
  };

  // Durum metni
  const getStatusText = () => {
    if (!restaurant) return 'Yükleniyor';
    
    if (isTodayManuallyClosed()) {
      return 'Bugün manuel olarak kapatıldı';
    }
    
    if (isTodayOpenBySchedule()) {
      return 'Çalışma saatlerine göre açık';
    }
    
    if (remainingTime > 0) {
      return `${Math.ceil(remainingTime / 60)} dk sonra otomatik açılır`;
    }
    
    return 'Çalışma saatleri dışında';
  };

  // Component unmount olduğunda timer'ı temizle
  useEffect(() => {
    return () => {
      if (temporaryCloseTimer) {
        clearTimeout(temporaryCloseTimer);
      }
    };
  }, [temporaryCloseTimer]);

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

  const handleToggleRestaurant = async (checked: boolean) => {
    if (!restaurant) {
      toast.error('Restoran bilgileri bulunamadı');
      return;
    }

    try {
      const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();

      if (!checked) {
        // Kapatma modal'ını aç
        setIsCloseModalOpen(true);
      } else {
        // Aç - bugünün isClosed = false yap
        const updatedHours = { ...restaurant.openingHours };
        if (updatedHours[today]) {
          updatedHours[today].isClosed = false;
        }
        
        await updateRestaurant(restaurant.id, { 
          openingHours: updatedHours 
        });
        
        toast.success('Restoran bugün için açıldı');
      }
    } catch (error) {
      console.error('Restoran durumu güncellenirken hata:', error);
      toast.error('Restoran durumu güncellenirken bir hata oluştu');
    }
  };

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

        const updatedHours = { ...restaurant.openingHours };
        if (updatedHours[today]) {
          updatedHours[today].isClosed = true;
        }
        
        await updateRestaurant(restaurant.id, { 
          openingHours: updatedHours 
        });
        
        setRemainingTime(totalSeconds);

        // Otomatik açılma için timer ayarla
        const timer = setTimeout(async () => {
          await handleAutoOpenRestaurant();
        }, totalSeconds * 1000);

        setTemporaryCloseTimer(timer);

        toast.success(`${minutes} dakika sonra bugün otomatik açılacak`);
      } else if (selectedCloseOption === 'manual-close') {
        // Manuel kapat: sadece bugünü kapat
        const updatedHours = { ...restaurant.openingHours };
        if (updatedHours[today]) {
          updatedHours[today].isClosed = true;
        }
        
        await updateRestaurant(restaurant.id, { 
          openingHours: updatedHours 
        });
        
        toast.success('Bugün manuel olarak kapatıldı. Yarın çalışma saatlerinize göre otomatik açılacak.');
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
          openingHours: updatedHours 
        });
        
        setTemporaryCloseTimer(null);
        setRemainingTime(0);
        toast.success('Bugün otomatik olarak açıldı');
      }
    } catch (error) {
      console.error('Restoran açılırken hata:', error);
      toast.error('Restoran açılırken bir hata oluştu');
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
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                restaurant && isToggleChecked() ? "bg-green-500" : "bg-red-500"
              )}></div>
              <span className="text-sm font-medium">
                {restaurant ? (isToggleChecked() ? 'Hizmet Veriyor' : 'Kapalı') : 'Yükleniyor...'}
              </span>
            </div>
            <Switch
              checked={isToggleChecked()}
              onCheckedChange={handleToggleRestaurant}
              disabled={!restaurant}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
            />
          </div>
          <p className="text-xs text-gray-400">
            {getStatusText()}
          </p>
        </div>
      </div>

      <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mağaza Kapatma</DialogTitle>
            <DialogDescription>
              Restoranınızı bugün için kapatmak istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900">Kısa Süreli Kapama</h4>
              <RadioGroup value={selectedCloseOption} onValueChange={setSelectedCloseOption}>
                <div className="grid grid-cols-2 gap-3">
                  {[5, 10, 15, 20, 25, 30].map((minutes) => (
                    <div key={`temp-${minutes}`} className="flex items-center space-x-2">
                      <RadioGroupItem value={`temp-${minutes}`} id={`temp-${minutes}`} />
                      <Label htmlFor={`temp-${minutes}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{minutes} dakika</div>
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
    </aside>
  );
}