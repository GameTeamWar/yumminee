import { db } from './config';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

// Örnek restoran verileri
const sampleRestaurants = [
  {
    id: '1',
    name: 'Köşebaşı Kebap',
    email: 'info@kosebasikebap.com',
    phoneNumber: '+90 216 555 0001',
    phone: '+90 216 555 0001',
    address: 'Kadıköy, İstanbul',
    coverImage: '/images/restaurants/kebap.jpg',
    image: '/images/restaurants/kebap.jpg',
    description: 'En lezzetli kebaplar burada! 25 yıldır hizmetinizde.',
    cuisine: 'Türk Mutfağı',
    categories: ['Kebap', 'Türk Mutfağı'],
    rating: 4.8,
    reviewCount: 1250,
    serviceRadius: 5,
    deliveryTime: 35,
    deliveryFee: 5,
    isOpen: true,
    createdAt: Timestamp.now()
  },
  {
    id: '2',
    name: 'Pizza Roma',
    email: 'info@pizzaroma.com',
    phoneNumber: '+90 216 555 0002',
    phone: '+90 216 555 0002',
    address: 'Beşiktaş, İstanbul',
    coverImage: '/images/restaurants/pizza.jpg',
    image: '/images/restaurants/pizza.jpg',
    description: 'Orijinal İtalyan pizzaları ile hizmetinizde.',
    cuisine: 'İtalyan',
    categories: ['İtalyan', 'Pizza'],
    rating: 4.6,
    reviewCount: 890,
    serviceRadius: 5,
    deliveryTime: 30,
    deliveryFee: 8,
    isOpen: true,
    createdAt: Timestamp.now()
  },
  {
    id: '3',
    name: 'Sushi Master',
    email: 'info@sushimaster.com',
    phoneNumber: '+90 216 555 0003',
    phone: '+90 216 555 0003',
    address: 'Şişli, İstanbul',
    coverImage: '/images/restaurants/sushi.jpg',
    image: '/images/restaurants/sushi.jpg',
    description: 'Taze balıklarla hazırlanan sushi çeşitleri.',
    cuisine: 'Japon',
    categories: ['Japon', 'Sushi'],
    rating: 4.7,
    reviewCount: 650,
    serviceRadius: 5,
    deliveryTime: 40,
    deliveryFee: 12,
    isOpen: false,
    createdAt: Timestamp.now()
  },
  {
    id: '4',
    name: 'Burger House',
    email: 'info@burgerhouse.com',
    phoneNumber: '+90 216 555 0004',
    phone: '+90 216 555 0004',
    address: 'Üsküdar, İstanbul',
    coverImage: '/images/restaurants/burger.jpg',
    image: '/images/restaurants/burger.jpg',
    description: 'En iyi burgerler burada! Kaliteli malzemeler.',
    cuisine: 'Amerikan',
    categories: ['Burger', 'Fast Food'],
    rating: 4.5,
    reviewCount: 1100,
    serviceRadius: 5,
    deliveryTime: 25,
    deliveryFee: 6,
    isOpen: true,
    createdAt: Timestamp.now()
  },
  {
    id: '5',
    name: 'Çiğköfteci Ali Usta',
    email: 'info@cigkofteci.com',
    phoneNumber: '+90 216 555 0005',
    phone: '+90 216 555 0005',
    address: 'Fatih, İstanbul',
    coverImage: '/images/restaurants/cigkofte.jpg',
    image: '/images/restaurants/cigkofte.jpg',
    description: 'Geleneksel çiğköfte tarifleri.',
    cuisine: 'Türk Mutfağı',
    categories: ['Çiğköfte', 'Fast Food'],
    rating: 4.3,
    reviewCount: 780,
    serviceRadius: 5,
    deliveryTime: 20,
    deliveryFee: 4,
    isOpen: true,
    createdAt: Timestamp.now()
  },
  {
    id: '6',
    name: 'Café Istanbul',
    email: 'info@cafeistanbul.com',
    phoneNumber: '+90 216 555 0006',
    phone: '+90 216 555 0006',
    address: 'Beşiktaş, İstanbul',
    coverImage: '/images/restaurants/cafe.jpg',
    image: '/images/restaurants/cafe.jpg',
    description: 'Özenle seçilmiş kahveler, taze pasta ve tatlılar.',
    cuisine: 'Kahve/İçecek',
    categories: ['Kahve/İçecek', 'Tatlı'],
    rating: 4.6,
    reviewCount: 450,
    serviceRadius: 3,
    deliveryTime: 15,
    deliveryFee: 3,
    isOpen: true,
    createdAt: Timestamp.now()
  }
];

// Örnek menü verileri
const sampleMenus = {
  '1': [
    {
      id: '1_1',
      product: {
        id: 'p1',
        name: 'Adana Kebap',
        description: 'Acılı kıyma kebabı, pilav ve yoğurt ile',
        price: 85,
        image: '/images/food/adana.jpg',
        category: 'Ana Yemekler',
        preparationTime: 20,
        isAvailable: true,
        createdAt: Timestamp.now()
      },
      category: 'Ana Yemekler'
    },
    {
      id: '1_2',
      product: {
        id: 'p2',
        name: 'Urfa Kebap',
        description: 'Acısız kıyma kebabı, pilav ve yoğurt ile',
        price: 85,
        image: '/images/food/urfa.jpg',
        category: 'Ana Yemekler',
        preparationTime: 20,
        isAvailable: true
      },
      category: 'Ana Yemekler'
    },
    {
      id: '1_3',
      product: {
        id: 'p3',
        name: 'Mercimek Çorbası',
        description: 'Geleneksel mercimek çorbası',
        price: 25,
        image: '/images/food/mercimek.jpg',
        category: 'Çorbalar',
        preparationTime: 10,
        isAvailable: true
      },
      category: 'Çorbalar'
    },
    {
      id: '1_4',
      product: {
        id: 'p4',
        name: 'Baklava',
        description: 'Antep fıstıklı baklava',
        price: 45,
        image: '/images/food/baklava.jpg',
        category: 'Tatlılar',
        preparationTime: 5,
        isAvailable: true
      },
      category: 'Tatlılar'
    }
  ],
  '2': [
    {
      id: '2_1',
      product: {
        id: 'p5',
        name: 'Margherita Pizza',
        description: 'Domates, mozzarella, fesleğen',
        price: 65,
        image: '/images/food/margherita.jpg',
        category: 'Pizzalar',
        preparationTime: 15,
        isAvailable: true
      },
      category: 'Pizzalar'
    },
    {
      id: '2_2',
      product: {
        id: 'p6',
        name: 'Pepperoni Pizza',
        description: 'Pepperoni sosis, mozzarella',
        price: 75,
        image: '/images/food/pepperoni.jpg',
        category: 'Pizzalar',
        preparationTime: 15,
        isAvailable: true
      },
      category: 'Pizzalar'
    },
    {
      id: '2_3',
      product: {
        id: 'p7',
        name: 'Tiramisu',
        description: 'Geleneksel İtalyan tatlısı',
        price: 35,
        image: '/images/food/tiramisu.jpg',
        category: 'Tatlılar',
        preparationTime: 5,
        isAvailable: true
      },
      category: 'Tatlılar'
    }
  ],
  '3': [
    {
      id: '3_1',
      product: {
        id: 'p8',
        name: 'California Roll',
        description: 'Kaliforniya usulü sushi',
        price: 45,
        image: '/images/food/california.jpg',
        category: 'Sushi',
        preparationTime: 10,
        isAvailable: true
      },
      category: 'Sushi'
    },
    {
      id: '3_2',
      product: {
        id: 'p9',
        name: 'Yeşil Çay',
        description: 'Geleneksel yeşil çay',
        price: 15,
        image: '/images/food/green-tea.jpg',
        category: 'İçecekler',
        preparationTime: 2,
        isAvailable: true
      },
      category: 'İçecekler'
    }
  ],
  '4': [
    {
      id: '4_1',
      product: {
        id: 'p10',
        name: 'Cheeseburger',
        description: 'Dana eti, cheddar peyniri, marul, domates',
        price: 55,
        image: '/images/food/cheeseburger.jpg',
        category: 'Burgerler',
        preparationTime: 12,
        isAvailable: true
      },
      category: 'Burgerler'
    },
    {
      id: '4_2',
      product: {
        id: 'p11',
        name: 'Milkshake',
        description: 'Çilekli milkshake',
        price: 22,
        image: '/images/food/milkshake.jpg',
        category: 'İçecekler',
        preparationTime: 5,
        isAvailable: true
      },
      category: 'İçecekler'
    }
  ],
  '5': [
    {
      id: '5_1',
      product: {
        id: 'p12',
        name: 'Çiğ Köfte',
        description: 'Geleneksel çiğköfte',
        price: 35,
        image: '/images/food/cigkofte.jpg',
        category: 'Ana Yemekler',
        preparationTime: 10,
        isAvailable: true
      },
      category: 'Ana Yemekler'
    }
  ],
  '6': [
    {
      id: '6_1',
      product: {
        id: 'p13',
        name: 'Türk Kahvesi',
        description: 'Geleneksel Türk kahvesi',
        price: 18,
        image: '/images/food/turk-kahvesi.jpg',
        category: 'Sıcak İçecekler',
        preparationTime: 8,
        isAvailable: true
      },
      category: 'Sıcak İçecekler'
    },
    {
      id: '6_2',
      product: {
        id: 'p14',
        name: 'Cappuccino',
        description: 'Özel harman espresso üzerine süt köpüğü',
        price: 25,
        image: '/images/food/cappuccino.jpg',
        category: 'Sıcak İçecekler',
        preparationTime: 5,
        isAvailable: true
      },
      category: 'Sıcak İçecekler'
    },
    {
      id: '6_3',
      product: {
        id: 'p15',
        name: 'Latte',
        description: 'Espresso ve buharlanmış süt',
        price: 28,
        image: '/images/food/latte.jpg',
        category: 'Sıcak İçecekler',
        preparationTime: 5,
        isAvailable: true
      },
      category: 'Sıcak İçecekler'
    },
    {
      id: '6_4',
      product: {
        id: 'p16',
        name: 'Iced Coffee',
        description: 'Buzlu kahve',
        price: 22,
        image: '/images/food/iced-coffee.jpg',
        category: 'Soğuk İçecekler',
        preparationTime: 3,
        isAvailable: true
      },
      category: 'Soğuk İçecekler'
    },
    {
      id: '6_5',
      product: {
        id: 'p17',
        name: 'Cheesecake',
        description: 'Klasik New York cheesecake',
        price: 35,
        image: '/images/food/cheesecake.jpg',
        category: 'Tatlılar',
        preparationTime: 2,
        isAvailable: true
      },
      category: 'Tatlılar'
    },
    {
      id: '6_6',
      product: {
        id: 'p18',
        name: 'Croissant',
        description: 'Taze çıkarılmış croissant',
        price: 15,
        image: '/images/food/croissant.jpg',
        category: 'Kahvaltı',
        preparationTime: 3,
        isAvailable: true
      },
      category: 'Kahvaltı'
    }
  ]
};

// Firebase'e örnek verileri ekleme fonksiyonu
export const seedSampleData = async () => {
  try {
    console.log('Örnek veriler ekleniyor...');

    // Restoranları ekle
    for (const restaurant of sampleRestaurants) {
      const restaurantRef = doc(db, 'restaurants', restaurant.id);
      await setDoc(restaurantRef, restaurant);
      console.log(`Restoran eklendi: ${restaurant.name}`);
    }

    // Menüleri ekle
    for (const [restaurantId, menus] of Object.entries(sampleMenus)) {
      for (const menuItem of menus) {
        const menuRef = doc(db, 'restaurants', restaurantId, 'menu', menuItem.id);
        await setDoc(menuRef, menuItem);
        console.log(`Menü öğesi eklendi: ${menuItem.product.name} (${restaurantId})`);
      }
    }

    console.log('Tüm örnek veriler başarıyla eklendi!');
    return true;
  } catch (error) {
    console.error('Örnek veriler eklenirken hata:', error);
    throw error;
  }
};