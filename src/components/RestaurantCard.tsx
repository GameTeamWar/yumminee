import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Star, Clock, MapPin } from 'lucide-react';
import { Restaurant } from '@/types';
import { isRestaurantOpenBasedOnHours } from '@/lib/utils/restaurantHours';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard = ({ restaurant }: RestaurantCardProps) => {
  // Kampanya/promosyon varsa göster
  const hasPromotion = restaurant.rating >= 4.5;
  
  // Restoranın açık olup olmadığını kontrol et
  const checkIfOpen = (): boolean => {
    if (!restaurant.openingHours) return true;
    
    const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
    const todayHours = restaurant.openingHours[today as keyof typeof restaurant.openingHours];
    
    // Manuel kapalıysa
    if (todayHours?.isClosed) return false;
    
    // Çalışma saatlerine göre kontrol et
    return isRestaurantOpenBasedOnHours(restaurant.openingHours);
  };
  
  const isOpen = checkIfOpen();
  
  // Bir sonraki açılış zamanını hesapla
  const getNextOpeningInfo = (): string | null => {
    if (!restaurant.openingHours || isOpen) return null;
    
    const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
    const todayHours = restaurant.openingHours[today as keyof typeof restaurant.openingHours];
    
    if (todayHours?.isClosed) {
      // Bugün manuel kapalı - yarın kontrol et
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(tomorrow).toLowerCase();
      const tomorrowHours = restaurant.openingHours[tomorrowDay as keyof typeof restaurant.openingHours];
      
      if (tomorrowHours && !tomorrowHours.isClosed) {
        return `Yarın ${tomorrowHours.open}'de açılır`;
      }
      return 'Kapalı';
    }
    
    // Bugün çalışma saatleri dışında
    if (todayHours) {
      return `Bugün ${todayHours.open}'de açılır`;
    }
    
    return 'Kapalı';
  };
  
  const renderWorkingHours = (openingHours?: typeof restaurant.openingHours) => {
    if (!openingHours) return '08:00-22:00';
    const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date()).toLowerCase();
    const todayHours = openingHours[today as keyof typeof openingHours];
    if (todayHours?.isClosed) return 'Kapalı';
    if (todayHours && todayHours.open && todayHours.close) return `${todayHours.open}-${todayHours.close}`;
    return '08:00-22:00';
  };

  const nextOpeningInfo = getNextOpeningInfo();

  return (
    <Link href={`/shops/${restaurant.id}`} className={`block h-full ${!isOpen ? 'pointer-events-none' : ''}`}>
      <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100 rounded-2xl group h-full p-0 ${!isOpen ? 'opacity-70' : ''}`}>
        <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-2xl">
          {/* Kapalı Badge */}
          {!isOpen && (
            <div className="absolute top-3 left-3 z-30">
              <div className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg">
                KAPALI
                {nextOpeningInfo && (
                  <div className="text-xs opacity-90 mt-1">
                    {nextOpeningInfo}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Promosyon Banner */}
          {hasPromotion && isOpen && (
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-center px-4">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-xl backdrop-blur-sm flex items-center space-x-2">
                <span>🔥</span>
                <span>Belirli Ürünlerde %5 İndirim</span>
              </div>
            </div>
          )}

          {/* Restoran görseli */}
          {restaurant.image ? (
            <>
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/restaurants/default.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
                <span className="text-orange-600 font-bold text-3xl">{restaurant.name[0]}</span>
              </div>
            </div>
          )}

          {/* Rating Badge */}
          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-green-600 text-white px-4 py-2 rounded-xl shadow-xl backdrop-blur-sm flex items-center space-x-1.5 group-hover:bg-green-700 transition-colors duration-300">
              <Star className="h-4 w-4 fill-white" />
              <span className="text-base font-bold">{restaurant.rating}</span>
              <span className="text-sm opacity-90">(750+)</span>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-5 bg-white">
          {/* Restoran Adı */}
          <h3 className="font-bold text-lg truncate mb-2">{restaurant.name}</h3>
          
          {/* Kategoriler */}
          <div className="text-sm text-gray-500 mb-4">
            {restaurant.cuisine && restaurant.cuisine.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {restaurant.cuisine.map((cuisine, index) => (
                  <span key={index} className="inline-block">
                    {cuisine}
                    {index < restaurant.cuisine.length - 1 && <span className="mx-1">•</span>}
                  </span>
                ))}
              </div>
            ) : restaurant.categories && restaurant.categories.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {restaurant.categories.map((category, index) => (
                  <span key={index} className="inline-block">
                    {category}
                    {index < restaurant.categories.length - 1 && <span className="mx-1">•</span>}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mb-3"></div>

          {/* Alt Bilgiler */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-600">
              {/* Teslimat Süresi */}
              <div className="flex items-center space-x-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{typeof restaurant.deliveryTime === 'number' ? `${restaurant.deliveryTime}-${restaurant.deliveryTime + 10}` : restaurant.deliveryTime} dk</span>
              </div>
              
              {/* Mesafe */}
              {restaurant.serviceRadius && (
                <span className={`text-xs font-medium ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {restaurant.openingHours ? renderWorkingHours(restaurant.openingHours) : '08:00-22:00'}
                </span>
              )}
            </div>

            {/* Minimum Sipariş */}
            {restaurant.minimumOrderAmount !== undefined && restaurant.minimumOrderAmount > 0 && isOpen && (
              <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg font-semibold text-sm">
                Min. {restaurant.minimumOrderAmount} TL
              </div>
            )}
          </div>

          {/* Kapalı Butonu */}
          {!isOpen && (
            <div className="mt-3">
              <button 
                disabled 
                className="w-full bg-gray-300 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm cursor-not-allowed"
              >
                Kapalı
              </button>
            </div>
          )}
          
          {/* Minimum sipariş yok mesajı */}
          {isOpen && restaurant.minimumOrderAmount === 0 && (
            <div className="mt-3 flex items-center space-x-1 text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg w-fit">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Minimum sipariş yok</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
};

export default RestaurantCard;