"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { CustomerAddress } from '@/types';
import { getUserSelectedAddress, setUserSelectedAddress, subscribeToUserAddresses } from '@/lib/firebase/db';
import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, MapPin, User, Search, ShoppingCart, Menu, Settings, ClipboardList } from 'lucide-react';
import { AddressSelectionModal } from './AddressSelectionModal';
import CartDrawer from './CartDrawer';

const Header = () => {
  const { user, signOut, userProfile, currentRole, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const { getTotalItems } = useCart();

  // Kullanıcının seçili adresini yükle ve dinle
  useEffect(() => {
    let unsubscribeSelectedAddress: (() => void) | undefined;

    const setupSubscriptions = async () => {
      if (user && currentRole === 'customer') {
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
        // Kullanıcı çıkış yaptıysa veya müşteri değilse seçili adresi temizle
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
    };
  }, [user, currentRole]);

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

  // Role göre header render
  const renderCustomerHeader = () => (
    <>
      {/* Sol Taraf - Logo */}
      <Link href="/" className="flex items-center flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">Y</span>
          </div>
          <span className="text-xl font-bold text-gray-900 hidden sm:block">Yummine</span>
        </div>
      </Link>

      {/* Orta Kısım - Arama Çubuğu */}
      <div className="flex-1 max-w-2xl mx-auto px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Restoran veya yemek ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3 w-full border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:border-orange-400 focus:ring-orange-400 bg-gray-50 hover:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Sağ Taraf - Konum, Hesabım, Sepetim */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        {/* Konum Seçici */}
        <div className="relative">
          <Button 
            variant="ghost" 
            onClick={() => setShowAddressModal(true)}
            className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors"
            disabled={!user}
          >
            <MapPin className="h-5 w-5 text-orange-500" />
            <div className="hidden md:flex flex-col items-start">
              <span className="text-xs text-gray-500">Teslimat Adresi</span>
              <span className="text-sm font-medium truncate max-w-40">
                {getDisplayAddress()}
              </span>
            </div>
            <span className="md:hidden text-sm font-medium truncate max-w-24">
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
              className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors"
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profil" 
                  className="h-8 w-8 rounded-full object-cover border-2 border-orange-200"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-200">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs text-gray-500">Merhaba</span>
                <span className="text-sm font-semibold text-gray-900">
                  {user.displayName || user.email?.split('@')[0] || 'Kullanıcı'}
                </span>
              </div>
            </Button>
            
            {/* Dropdown */}
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100 z-50">
              {/* Profil Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profil" 
                      className="h-10 w-10 rounded-full object-cover border-2 border-orange-200"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-200">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {user.displayName || user.email?.split('@')[0] || 'Kullanıcı'}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link href="/profile" className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <User className="h-4 w-4" />
                  <span>Profilim</span>
                </Link>
                <Link href="/orders" className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <ClipboardList className="h-4 w-4" />
                  <span>Siparişlerim</span>
                </Link>
              </div>

              <div className="border-t border-gray-100 my-1"></div>
              
              <button 
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (error) {
                    console.error('Çıkış yapılırken hata:', error);
                  }
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <div className="h-4 w-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link href="/login">
              <Button 
                variant="outline" 
                size="sm"
                className="text-orange-600 border-orange-500 hover:bg-orange-50 hover:border-orange-600 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Giriş Yap
              </Button>
            </Link>
            <Link href="/register">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                Kayıt Ol
              </Button>
            </Link>
          </div>
        )}

        {/* Sepetim */}
        <Button
          variant="ghost"
          onClick={() => setCartDrawerOpen(true)}
          className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors relative"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden sm:inline text-sm font-medium">Sepetim</span>
          {getTotalItems() > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-sm">
              {getTotalItems()}
            </span>
          )}
        </Button>

        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
      </div>
    </>
  );

  const renderRestaurantHeader = () => (
    <>
      {/* Sol Taraf - Logo */}
      <Link href="/" className="flex items-center flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">Y</span>
          </div>
          <span className="text-xl font-bold text-gray-900 hidden sm:block">Yummine</span>
        </div>
      </Link>

      {/* Orta Kısım - Arama Çubuğu */}
      <div className="flex-1 max-w-2xl mx-auto px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Ürün veya kategori ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3 w-full border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:border-orange-400 focus:ring-orange-400 bg-gray-50 hover:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Sağ Taraf - Profil, Siparişler, Ayarlar */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        {/* Hesabım */}
        {user ? (
          <div className="relative group">
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors"
            >
              {userProfile?.profilePicture ? (
                <img 
                  src={userProfile.profilePicture} 
                  alt="Restoran" 
                  className="h-8 w-8 rounded-full object-cover border-2 border-orange-200"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-200">
                  <Settings className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs text-gray-500">Restoran Sahibi</span>
                <span className="text-sm font-semibold text-gray-900">
                  {userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Restoran'}
                </span>
              </div>
            </Button>
            
            {/* Dropdown */}
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100 z-50">
              {/* Profil Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  {userProfile?.profilePicture ? (
                    <img 
                      src={userProfile.profilePicture} 
                      alt="Restoran" 
                      className="h-10 w-10 rounded-full object-cover border-2 border-orange-200"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-200">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Restoran'}
                    </div>
                    <div className="text-sm text-gray-500">Restoran Sahibi</div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link href="/profile" className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <User className="h-4 w-4" />
                  <span>Profilim</span>
                </Link>
                <Link href="/shop?panel=17607296269" className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <ClipboardList className="h-4 w-4" />
                  <span>Restoranım</span>
                </Link>
              </div>

              <div className="border-t border-gray-100 my-1"></div>
              
              <button 
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (error) {
                    console.error('Çıkış yapılırken hata:', error);
                  }
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <div className="h-4 w-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link href="/shops-login">
              <Button 
                variant="outline" 
                size="sm"
                className="text-orange-600 border-orange-500 hover:bg-orange-50 hover:border-orange-600 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Giriş Yap
              </Button>
            </Link>
            <Link href="/shops-register">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                Kayıt Ol
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
      </div>
    </>
  );

  const renderCourierHeader = () => (
    <>
      {/* Sol Taraf - Logo */}
      <Link href="/" className="flex items-center flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">Y</span>
          </div>
          <span className="text-xl font-bold text-gray-900 hidden sm:block">Yummine</span>
        </div>
      </Link>

      {/* Orta Kısım - Boş */}
      <div className="flex-1"></div>

      {/* Sağ Taraf - Profil, Dashboard */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        {/* Hesabım */}
        {user ? (
          <div className="relative group">
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors"
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profil" 
                  className="h-8 w-8 rounded-full object-cover border-2 border-orange-200"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-200">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs text-gray-500">Kurye</span>
                <span className="text-sm font-semibold text-gray-900">
                  {user.displayName || user.email?.split('@')[0] || 'Kurye'}
                </span>
              </div>
            </Button>
            
            {/* Dropdown */}
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100 z-50">
              {/* Profil Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profil" 
                      className="h-10 w-10 rounded-full object-cover border-2 border-orange-200"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-200">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {user.displayName || user.email?.split('@')[0] || 'Kurye'}
                    </div>
                    <div className="text-sm text-gray-500">Kurye</div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link href="/profile" className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <User className="h-4 w-4" />
                  <span>Profilim</span>
                </Link>
                <Link href="/courier/dashboard" className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <ClipboardList className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </div>

              <div className="border-t border-gray-100 my-1"></div>
              
              <button 
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (error) {
                    console.error('Çıkış yapılırken hata:', error);
                  }
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <div className="h-4 w-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link href="/courier-login">
              <Button 
                variant="outline" 
                size="sm"
                className="text-orange-600 border-orange-500 hover:bg-orange-50 hover:border-orange-600 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Giriş Yap
              </Button>
            </Link>
            <Link href="/courier-register">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                Kayıt Ol
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
      </div>
    </>
  );

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {loading ? (
            // Loading durumunda basit header
            <>
              <Link href="/" className="flex items-center flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Y</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 hidden sm:block">Yummine</span>
                </div>
              </Link>
              <div className="flex-1"></div>
              <div className="text-sm text-gray-500 animate-pulse">Yükleniyor...</div>
            </>
          ) : (
            <>
              {userProfile?.role === 'customer' && renderCustomerHeader()}
              {userProfile?.role === 'shop' && renderRestaurantHeader()}
              {userProfile?.role === 'courier' && renderCourierHeader()}
              {!userProfile?.role && renderCustomerHeader()} {/* Default to customer */}
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {!loading && mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-4 shadow-lg">
          <nav className="flex flex-col space-y-4">
            <Link href="/" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">
              Ana Sayfa
            </Link>
            <Link href="/shops" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">
              Restoranlar
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">
              Hakkımızda
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-orange-600 transition-colors font-medium">
              İletişim
            </Link>
            {!user && (
              <Link href="/register" className="sm:hidden text-gray-700 hover:text-orange-600 transition-colors font-medium">
                Kayıt Ol
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Cart Drawer - only for customer */}
      {!loading && userProfile?.role === 'customer' && (
        <CartDrawer
          isOpen={cartDrawerOpen}
          onClose={() => setCartDrawerOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;