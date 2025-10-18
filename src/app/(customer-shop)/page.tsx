import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RestaurantCard from '@/components/RestaurantCard';
import { useState, useEffect } from 'react';
import { subscribeToAllRestaurants } from '@/lib/firebase/db';
import { Shop } from '@/types';

export default function Home() {
  const [restaurants, setRestaurants] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tüm restoranları gerçek zamanlı dinle
    const unsubscribe = subscribeToAllRestaurants((restaurantsData) => {
      // Sadece açık olan ve aktif restoranları göster
      const activeRestaurants = restaurantsData.filter(restaurant => 
        restaurant.isOpen && restaurant.ownerId
      );
      setRestaurants(activeRestaurants);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Popüler restoranlar (rating'e göre sırala)
  const popularRestaurants = restaurants
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8);

  // Kategorilere göre grupla
  const getRestaurantsByCategory = (category: string) => {
    return restaurants.filter(restaurant => 
      restaurant.cuisine && restaurant.cuisine.includes(category)
    );
  };

  const fastFoodRestaurants = getRestaurantsByCategory('Fast Food');
  const kebapRestaurants = getRestaurantsByCategory('Kebap');
  const pizzaRestaurants = getRestaurantsByCategory('Pizza');
  const burgerRestaurants = getRestaurantsByCategory('Burger');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Restoranlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center justify-between py-12 gap-8">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            En Sevdiğiniz Yemekler <span className="text-primary">Kapınıza Gelsin</span>
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            Birbirinden lezzetli yemekler, en sevdiğiniz restoranlar ve hızlı teslimat Yummine'de sizi bekliyor.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link href="/restaurants">
              <Button size="lg">
                Restoranları Keşfet
              </Button>
            </Link>
            <Link href="/restaurant-register">
              <Button size="lg" variant="outline">
                Restoran Ekle
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex-1 relative h-[300px] w-full">
          <div className="relative h-full w-full">
            <img
              src="/images/hero-food.jpg"
              alt="Yummine Yemek"
              className="w-full h-full object-cover rounded-2xl"
              onError={(e) => {
                // Görsel yüklenemezse gradient background göster
                (e.target as HTMLElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">Yummine Yemek</div>';
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Özellikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 bg-primary/10 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary h-8 w-8"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Hızlı Teslimat</h3>
              <p className="text-gray-600">
                Siparişlerinizi en kısa sürede kapınıza getiriyoruz. Sipariş takibiyle yemeğinizin nerede olduğunu anlık olarak görüntüleyin.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 bg-primary/10 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary h-8 w-8"><path d="M12 20V4"></path><path d="m5 11 7-7 7 7"></path></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Kaliteli Restoranlar</h3>
              <p className="text-gray-600">
                Şehrinizin en iyi restoranlarından seçkin lezzetlere ulaşın. Her damak zevkine uygun seçenekler sunuyoruz.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 bg-primary/10 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary h-8 w-8"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Kolay Sipariş</h3>
              <p className="text-gray-600">
                Kullanıcı dostu arayüzümüz ile saniyeler içinde siparişinizi verin. Önceki siparişlerinizi tek tıkla tekrarlayın.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kategoriler ve Restoranlar */}
      <div className="py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Popüler Restoranlar</h2>
          <Link href="/shops">
            <Button variant="ghost">Tümünü Gör</Button>
          </Link>
        </div>

        {restaurants.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Henüz restoran bulunmuyor
            </h3>
            <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
              Restoran sahipleri henüz sisteme kayıt olmamış. Daha sonra tekrar kontrol edin.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">Tümü ({restaurants.length})</TabsTrigger>
              <TabsTrigger value="fast-food">Fast Food ({fastFoodRestaurants.length})</TabsTrigger>
              <TabsTrigger value="kebap">Kebap ({kebapRestaurants.length})</TabsTrigger>
              <TabsTrigger value="pizza">Pizza ({pizzaRestaurants.length})</TabsTrigger>
              <TabsTrigger value="burger">Burger ({burgerRestaurants.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {popularRestaurants.map(restaurant => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="fast-food" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {fastFoodRestaurants.length > 0 ? (
                  fastFoodRestaurants.map(restaurant => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Bu kategoride restoran bulunmuyor.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="kebap" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {kebapRestaurants.length > 0 ? (
                  kebapRestaurants.map(restaurant => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Bu kategoride restoran bulunmuyor.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pizza" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pizzaRestaurants.length > 0 ? (
                  pizzaRestaurants.map(restaurant => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Bu kategoride restoran bulunmuyor.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="burger" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {burgerRestaurants.length > 0 ? (
                  burgerRestaurants.map(restaurant => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Bu kategoride restoran bulunmuyor.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Restoran ve Kurye Olarak Katılın */}
      <div className="py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="overflow-hidden">
            <div className="relative h-48">
              {/* Restoran görseli */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white h-16 w-16"><path d="M15 11h.01"></path><path d="M11 15h.01"></path><path d="M16 16h.01"></path><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"></path><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"></path></svg>
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Restoranınızı Ekleyin</h3>
              <p className="mb-4 text-gray-600">
                Yummine'de restoranınızı listeleyerek daha fazla müşteriye ulaşın. Siparişleri kolayca yönetin ve işletmenizi büyütün.
              </p>
              <Link href="/restaurant-register">
                <Button>Restoran Olarak Katılın</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="relative h-48">
              {/* Kurye görseli */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white h-16 w-16"><rect width="16" height="16" x="4" y="4" rx="2"></rect><path d="M4 13h16"></path><path d="M4 9h16"></path><path d="M4 17h16"></path></svg>
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Kurye Olarak Çalışın</h3>
              <p className="mb-4 text-gray-600">
                Kendi saatlerinizde çalışarak ek gelir elde edin. Yummine kurye ağına katılın ve esnek çalışma imkanından yararlanın.
              </p>
              <Link href="/courier-register">
                <Button>Kurye Olarak Katılın</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}