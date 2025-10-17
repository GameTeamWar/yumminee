"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const { user } = useAuth();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true); // Restaurant açık/kapalı durumu
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedCloseOption, setSelectedCloseOption] = useState<string>('');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false); // Manuel kapatma flag'i

  // Otomatik restoran durumu hook'u
  useAutoRestaurantStatus(isManuallyClosed ? null : restaurant);

  // Restaurant verilerini real-time olarak yükle
  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!user?.uid) return;

      // Önce mevcut restaurant'ı bul
      const existingRestaurant = await getRestaurantByOwnerId(user.uid);
      let restaurantDocId = user.uid; // Default olarak user.uid kullan

      if (existingRestaurant) {
        restaurantDocId = existingRestaurant.id;
        console.log('Sidebar: Mevcut restaurant bulundu:', restaurantDocId);
      } else {
        console.log('Sidebar: Restaurant bulunamadı, user.uid ile dinleme yapılacak');
      }

      // Restaurant dokümanına real-time listener ekle
      const restaurantRef = doc(db, 'restaurants', restaurantDocId);
      const unsubscribe = onSnapshot(restaurantRef, (doc) => {
        if (doc.exists()) {
          const restaurantData = { id: doc.id, ...doc.data() } as Restaurant;
          console.log('Sidebar: Restaurant verisi güncellendi:', restaurantData);
          setRestaurant(restaurantData);
          setIsOpen(restaurantData.isOpen !== false);
          
          // Eğer manuel olarak kapatılmışsa flag'i set et
          if (restaurantData.isOpen === false) {
            setIsManuallyClosed(true);
          }
        } else {
          console.log('Sidebar: Restaurant bulunamadı');
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

  // Bugünkü çalışma saatlerini al
  const getTodaysHours = () => {
    // Eğer restoran genel olarak kapalıysa "Kapalı" göster
    if (!isOpen) return 'Kapalı';

    if (!restaurant?.workingHours) return '08:00 - 23:00';

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const todayKey = days[today] as keyof typeof restaurant.workingHours;

    const todayHours = restaurant.workingHours[todayKey];
    if (!todayHours.isOpen) return 'Kapalı';

    return `${todayHours.open} - ${todayHours.close}`;
  };

  const toggleMenu = (menuTitle: string) => {
    setExpandedMenu(expandedMenu === menuTitle ? null : menuTitle);
  };

  const handleToggleRestaurant = async (checked: boolean) => {
    if (!restaurant) {
      toast.error('Restoran bilgileri bulunamadı');
      return;
    }

    try {
      if (!checked) {
        // Kapatma modal'ını aç
        setIsCloseModalOpen(true);
      } else {
        // Aç - doğrudan Firebase'e kaydet
        await updateRestaurant(restaurant.id, { isOpen: true });
        setIsOpen(true);
        setIsManuallyClosed(false); // Manuel açıldığında otomatik sistemi tekrar aktif et
        toast.success('Restoran açıldı');
      }
    } catch (error) {
      console.error('Restoran durumu güncellenirken hata:', error);
      toast.error('Restoran durumu güncellenirken bir hata oluştu');
    }
  };

  const handleCloseRestaurant = async () => {
    if (!restaurant) {
      toast.error('Restoran bilgileri bulunamadı');
      return;
    }

    if (!selectedCloseOption) {
      toast.error('Lütfen bir kapatma seçeneği seçin');
      return;
    }

    try {
      // Firebase'e kapat durumu kaydet
      await updateRestaurant(restaurant.id, { isOpen: false });

      // Seçilen seçeneğe göre işlem yap
      switch (selectedCloseOption) {
        case '15min':
          toast.success('Restoran 15 dakika sonra otomatik açılacaktır');
          setIsManuallyClosed(false); // Otomatik açılmaya izin ver
          break;
        case '30min':
          toast.success('Restoran 30 dakika sonra otomatik açılacaktır');
          setIsManuallyClosed(false); // Otomatik açılmaya izin ver
          break;
        case '60min':
          toast.success('Restoran 60 dakika sonra otomatik açılacaktır');
          setIsManuallyClosed(false); // Otomatik açılmaya izin ver
          break;
        case 'next-day':
          toast.success('Restoran bir sonraki çalışma gününde otomatik açılacaktır');
          setIsManuallyClosed(false); // Otomatik açılmaya izin ver
          break;
        case 'auto-open':
          toast.success('Paneliniz sıradaki çalışma gün ve saatinizde otomatik açılacaktır');
          setIsManuallyClosed(false); // Otomatik açılmaya izin ver
          break;
        case 'manual-open':
          toast.success('Panelinizi tekrar manuel açana kadar kapalı kalacaktır');
          setIsManuallyClosed(true); // Manuel açılana kadar otomatik açma
          break;
        case 'seasonal':
          toast.success('Restoran dönemsel kapalı moda alındı');
          setIsManuallyClosed(true); // Manuel açılana kadar otomatik açma
          break;
        case 'vacation':
          toast.success('Restoran tatil moduna alındı');
          setIsManuallyClosed(true); // Manuel açılana kadar otomatik açma
          break;
      }

      setIsOpen(false);
      setIsCloseModalOpen(false);
      setSelectedCloseOption('');
    } catch (error) {
      console.error('Restoran kapatılırken hata:', error);
      toast.error('Restoran kapatılırken bir hata oluştu');
    }
  };

  return (
    <aside className="fixed top-0 left-0 w-64 bg-gray-900 text-white h-screen flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Link href="/shop" className="flex items-center space-x-2">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Store className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold">Restaurant Panel</span>
        </Link>
      </div>

      {/* Navigation */}
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
                            href={subItem.href}
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
                href={item.href}
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

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isOpen ? "bg-green-500" : "bg-red-500"
              )}></div>
              <span className="text-sm font-medium">
                {isOpen ? 'Restoran Açık' : 'Restoran Kapalı'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">
                {isOpen ? 'Açık' : 'Kapalı'}
              </span>
              <Switch
                checked={isOpen}
                onCheckedChange={handleToggleRestaurant}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => window.location.href = '/shop/settings?tab=hours'}>
            Bugün {getTodaysHours()}
          </p>
        </div>
      </div>

      {/* Restaurant Kapama Modal */}
      <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mağaza Kapatma</DialogTitle>
            <DialogDescription>
              Restoranınızı kapatmak için bir seçenek belirleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup value={selectedCloseOption} onValueChange={setSelectedCloseOption}>
              <div className="space-y-3">
                <div className="font-medium text-sm text-gray-700 mb-2">Belirli bir süre kapat</div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="15min" id="15min" />
                  <Label htmlFor="15min" className="flex-1 cursor-pointer">
                    <div className="font-medium">15 Dakika Kapat</div>
                    <div className="text-xs text-gray-500">Restoran 15 Dakika sonra otomatik açılacaktır</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30min" id="30min" />
                  <Label htmlFor="30min" className="flex-1 cursor-pointer">
                    <div className="font-medium">30 Dakika Kapat</div>
                    <div className="text-xs text-gray-500">Restoran 30 Dakika sonra otomatik açılacaktır</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="60min" id="60min" />
                  <Label htmlFor="60min" className="flex-1 cursor-pointer">
                    <div className="font-medium">60 Dakika Kapat</div>
                    <div className="text-xs text-gray-500">Restoran 60 Dakika sonra otomatik açılacaktır</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="next-day" id="next-day" />
                  <Label htmlFor="next-day" className="flex-1 cursor-pointer">
                    <div className="font-medium">Bir sonraki çalışma gününe kadar kapat</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto-open" id="auto-open" />
                  <Label htmlFor="auto-open" className="flex-1 cursor-pointer">
                    <div className="font-medium">Panelim otomatik açılsın</div>
                    <div className="text-xs text-gray-500">Paneliniz sıradaki çalışma gün ve saatinizde otomatik açılacaktır</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual-open" id="manual-open" />
                  <Label htmlFor="manual-open" className="flex-1 cursor-pointer">
                    <div className="font-medium">Paneli kendim açacağım</div>
                    <div className="text-xs text-gray-500">Panelinizi tekrar manuel açana kadar kapalı kalacaktır</div>
                  </Label>
                </div>

                <div className="font-medium text-sm text-gray-700 mb-2 mt-4">Belirli bir süre kapat</div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seasonal" id="seasonal" />
                  <Label htmlFor="seasonal" className="flex-1 cursor-pointer">
                    <div className="font-medium">Dönemsel Kapalı</div>
                    <div className="text-xs text-gray-500">Balık, dondurma gibi sezonsal faaliyet gösteren bir mutfak türüne sahipseniz ve uzun süre kapalı kalacaksanız seçebilirsiniz. Siz tekrar panelden açana kadar kapalı kalacaktır.</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vacation" id="vacation" />
                  <Label htmlFor="vacation" className="flex-1 cursor-pointer">
                    <div className="font-medium">Tatil Modu ile kapat</div>
                    <div className="text-xs text-gray-500">Geçici süreli tadilat, sağlık, tatil gibi sebepler için seçebilirsiniz. Tatil moduna aldıktan sonra panelinizi 15 saat geçtikten sonra açabilirsiniz. Bu özelliği haftada sadece 2 kez kullanabilirsiniz.</div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseModalOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleCloseRestaurant}
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
