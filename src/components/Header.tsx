"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useMultiTabAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { UserAddress, CustomerAddress } from '@/types';
import { getUserAddresses, setDefaultUserAddress, deleteUserAddress, setUserSelectedAddress, getUserSelectedAddress, subscribeToUserAddresses } from '@/lib/firebase/db';
import MultiTabHelpModal from './MultiTabHelpModal';
import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, MapPin, User, Search, ShoppingCart, Menu } from 'lucide-react';
import { AddressSelectionModal } from './AddressSelectionModal';

const Header = () => {
  const { user, signOut, userProfile, currentRole, switchRole } = useAuth();
  const { activeTabs } = useMultiTabAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const { getTotalItems } = useCart();
  const { getAvailableRoles: fetchAvailableRoles } = useAuth();

  const handleRoleSwitch = async (newRole: string) => {
    try {
      await switchRole(newRole);
      setRoleDropdownOpen(false);
      
      // Role göre yönlendirme
      if (newRole === 'restaurant') {
        router.push('/shop');
      } else if (newRole === 'courier') {
        router.push('/courier/dashboard');
      } else {
        router.push('/shops');
      }
      
      toast.success(`${newRole === 'restaurant' ? 'Restoran sahibi' : newRole === 'courier' ? 'Kurye' : 'Müşteri'} hesabına geçildi`);
    } catch (error: any) {
      toast.error(error.message || 'Hesap değiştirilemedi');
    }
  };

  // Kullanıcının seçili adresini yükle ve dinle
  useEffect(() => {
    let unsubscribeSelectedAddress: (() => void) | undefined;
    let unsubscribeAddresses: (() => void) | undefined;

    const setupSubscriptions = async () => {
      if (user) {
        try {
          // Seçili adresi dinle
          unsubscribeSelectedAddress = await subscribeToUserAddresses(user.uid, (addresses: CustomerAddress[]) => {
            // Adresler değiştiğinde, seçili adres hala mevcut mu kontrol et
            if (selectedAddress) {
              const addressStillExists = addresses.find(addr => addr.id === selectedAddress.id);
              if (!addressStillExists) {
                // Seçili adres silinmiş, temizle
                setSelectedAddress(null);
                localStorage.removeItem('selectedAddress');
                toast.info('Seçili adres silindi');
              }
            }
          });

          // İlk yükleme için seçili adresi getir
          const savedAddress = await getUserSelectedAddress(user.uid);
          if (savedAddress) {
            setSelectedAddress(savedAddress);
            localStorage.setItem('selectedAddress', JSON.stringify(savedAddress));
          } else {
            // Firebase'de yoksa localStorage'dan dene
            const localAddress = localStorage.getItem('selectedAddress');
            if (localAddress) {
              const parsedAddress = JSON.parse(localAddress);
              setSelectedAddress(parsedAddress);
              // localStorage'dakini Firebase'e kaydet
              await setUserSelectedAddress(user.uid, parsedAddress.id);
            }
          }
        } catch (error) {
          console.error('Seçili adres yüklenirken hata:', error);
          // Hata durumunda localStorage'dan yükle
          const localAddress = localStorage.getItem('selectedAddress');
          if (localAddress) {
            setSelectedAddress(JSON.parse(localAddress));
          }
        }
      } else {
        // Kullanıcı çıkış yaptıysa seçili adresi temizle
        setSelectedAddress(null);
        localStorage.removeItem('selectedAddress');
      }
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      if (unsubscribeSelectedAddress) {
        unsubscribeSelectedAddress();
      }
      if (unsubscribeAddresses) {
        unsubscribeAddresses();
      }
    };
  }, [user]);

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.role-dropdown')) {
          setRoleDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [roleDropdownOpen]);

  // Arama sorgusu değiştiğinde URL'i güncelle
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }
    
    const newUrl = `${pathname}${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, pathname, router]);

  // URL'deki search parametresi değiştiğinde searchQuery'yi güncelle
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    setSearchQuery(currentSearch);
  }, [searchParams]);

  const handleAddressSelect = async (address: CustomerAddress) => {
    try {
      setSelectedAddress(address);
      localStorage.setItem('selectedAddress', JSON.stringify(address));
      
      // Firebase'e de kaydet
      if (user) {
        await setUserSelectedAddress(user.uid, address.id);
      }
      
      setShowAddressModal(false);
      toast.success('Adres seçildi');
    } catch (error) {
      console.error('Adres seçilirken hata:', error);
      toast.error('Adres seçilemedi');
    }
  };

  const handleAddressDeleted = () => {
    setSelectedAddress(null);
    localStorage.removeItem('selectedAddress');
    toast.info('Seçili adres silindi');
  };

  const getDisplayAddress = () => {
    if (!user) return 'Giriş yapın';
    if (!selectedAddress) return 'Adres seçin';
    return selectedAddress.addressName || 'Adres seçin';
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Sol Taraf - Logo (Mobile'da gizli) */}
          <Link href="/" className="hidden lg:flex items-center flex-shrink-0">
            <span className="text-2xl font-bold text-orange-600">Yummine</span>
          </Link>

          {/* Orta Kısım - Arama Çubuğu */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Restoran ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border-gray-300 rounded-lg text-sm placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Sağ Taraf - Konum, Hesabım, Sepetim */}
          <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
            {/* Konum Seçici */}
            <div className="relative">
              <Button 
                variant="ghost" 
                onClick={() => setShowAddressModal(true)}
                className="flex items-center space-x-1 text-gray-700 hover:text-orange-600 px-2 lg:px-3"
                disabled={!user}
              >
                <MapPin className="h-4 w-4 text-orange-600" />
                <span className="hidden sm:inline text-sm font-medium truncate max-w-32">
                  {getDisplayAddress()}
                </span>
              </Button>

              {/* Address Selection Modal */}
              <AddressSelectionModal
                isOpen={showAddressModal}
                onClose={() => setShowAddressModal(false)}
                onAddressSelected={handleAddressSelect}
                selectedAddress={selectedAddress}
                onAddressDeleted={handleAddressDeleted}
              />
            </div>

            {/* Hesabım */}
            {user ? (
              <div className="relative group">
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 px-2 lg:px-3"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profil" 
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-orange-600" />
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium">
                    {user.displayName || user.email?.split('@')[0] || 'Kullanıcı'}
                  </span>
                </Button>
                
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-200">
                  {/* Çoklu Sekme Bilgilendirmesi */}
                  {activeTabs > 1 && (
                    <div className="px-4 py-2 border-b border-gray-200 bg-blue-50">
                      <div className="text-xs text-blue-700 flex items-center justify-between">
                        <span>ℹ️ {activeTabs} sekme aktif - Farklı roller için ayrı sekmeler kullanın</span>
                        <MultiTabHelpModal />
                      </div>
                    </div>
                  )}
                  {/* Aktif Rol Göstergesi */}
                  {userProfile && (
                    <>
                      <div className="px-4 py-2 border-b border-gray-200">
                        <div className="text-xs text-gray-500">Aktif Hesap</div>
                        <div className="text-sm font-medium text-gray-900">
                          {currentRole === 'restaurant' ? '🏪 Restoran Sahibi' : 
                           currentRole === 'courier' ? '🚚 Kurye' : 
                           '👤 Müşteri'}
                        </div>

                      </div>
                      <div className="px-4 py-2 border-b border-gray-200">
                        <div className="text-xs text-gray-500 mb-2">Hesap Değiştir</div>
                        <div className="space-y-1">
                          {availableRoles.includes('customer') && currentRole !== 'customer' && (
                            <button
                              onClick={() => handleRoleSwitch('customer')}
                              className="w-full text-left text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded"
                            >
                              👤 Müşteri Hesabı
                            </button>
                          )}
                          {availableRoles.includes('restaurant') && currentRole !== 'restaurant' && (
                            <button
                              onClick={() => handleRoleSwitch('restaurant')}
                              className="w-full text-left text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded"
                            >
                              🏪 Restoran Hesabı
                            </button>
                          )}
                          {availableRoles.includes('courier') && currentRole !== 'courier' && (
                            <button
                              onClick={() => handleRoleSwitch('courier')}
                              className="w-full text-left text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded"
                            >
                              🚚 Kurye Hesabı
                            </button>
                          )}
                          {availableRoles.length === 0 && (
                            <div className="text-xs text-gray-500 px-2 py-1">
                              Başka hesap bulunamadı
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Profilim
                  </Link>
                  {currentRole === 'customer' && (
                    <>
                      <Link href="/profile?tab=orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Siparişlerim
                      </Link>
                      <Link href="/profile?tab=favorites" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Favorilerim
                      </Link>
                    </>
                  )}
                  <div className="border-t border-gray-200 my-1"></div>
                  <button 
                    onClick={async () => {
                      try {
                        await signOut();
                      } catch (error) {
                        console.error('Çıkış yapılırken hata:', error);
                      }
                    }}
                    className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Çıkış Yap
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    Giriş Yap
                  </Button>
                </Link>
                <Link href="/register">
                  <Button 
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Kayıt Ol
                  </Button>
                </Link>
              </div>
            )}

            {/* Sepetim */}
            <Link href="/cart">
              <Button 
                variant="ghost" 
                className="flex items-center space-x-1 text-gray-700 hover:text-orange-600 px-2 lg:px-3 relative"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">Sepetim</span>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {getTotalItems()}
                  </span>
                )}
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-3">
          <nav className="flex flex-col space-y-3">
            <Link href="/" className="text-gray-700 hover:text-primary transition">
              Ana Sayfa
            </Link>
            <Link href="/shops" className="text-gray-700 hover:text-primary transition">
              Restoranlar
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-primary transition">
              Hakkımızda
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-primary transition">
              İletişim
            </Link>
            {!user && (
              <Link href="/register" className="sm:hidden text-gray-700 hover:text-primary transition">
                Kayıt Ol
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;