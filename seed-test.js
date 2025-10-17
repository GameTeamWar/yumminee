import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVrI9ztYsj6SAfMWSi7M9OJCN78uCunAc",
  authDomain: "yumini-be273.firebaseapp.com",
  projectId: "yumini-be273",
  storageBucket: "yumini-be273.firebasestorage.app",
  messagingSenderId: "1052179014181",
  appId: "1:1052179014181:web:a878088b6fc8d9b2a195cc",
  measurementId: "G-SXDGRP6C0Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    cuisine: ['Türk Mutfağı'],
    categories: ['Kebap', 'Türk Mutfağı'],
    rating: 4.8,
    reviewCount: 1250,
    serviceRadius: 5,
    deliveryTime: 35,
    minimumOrderAmount: 50,
    isOpen: true,
    ownerId: 'test_restaurant_owner_1',
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
    cuisine: ['İtalyan'],
    categories: ['İtalyan', 'Pizza'],
    rating: 4.6,
    reviewCount: 890,
    serviceRadius: 5,
    deliveryTime: 30,
    minimumOrderAmount: 60,
    isOpen: true,
    ownerId: 'test_restaurant_owner_2',
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
    cuisine: ['Japon'],
    categories: ['Japon', 'Sushi'],
    rating: 4.7,
    reviewCount: 650,
    serviceRadius: 5,
    deliveryTime: 40,
    minimumOrderAmount: 80,
    isOpen: false,
    ownerId: 'test_restaurant_owner_3',
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
    cuisine: ['Amerikan'],
    categories: ['Burger', 'Fast Food'],
    rating: 4.5,
    reviewCount: 1100,
    serviceRadius: 5,
    deliveryTime: 25,
    minimumOrderAmount: 45,
    isOpen: true,
    ownerId: 'test_restaurant_owner_4',
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
    cuisine: ['Türk Mutfağı'],
    categories: ['Çiğköfte', 'Fast Food'],
    rating: 4.3,
    reviewCount: 780,
    serviceRadius: 5,
    deliveryTime: 20,
    minimumOrderAmount: 30,
    isOpen: true,
    ownerId: 'test_restaurant_owner_5',
    createdAt: Timestamp.now()
  }
];

// Örnek kategori verileri
const sampleCategories = [
  {
    id: 'cat1',
    name: 'Ana Yemekler',
    description: 'Restoranımızın ana yemekleri',
    sortOrder: 1,
    isActive: true,
    restaurantId: '1',
    customId: 'CAT001',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat2',
    name: 'Çorbalar',
    description: 'Sıcak ve lezzetli çorbalar',
    sortOrder: 2,
    isActive: true,
    restaurantId: '1',
    customId: 'CAT002',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat3',
    name: 'Tatlılar',
    description: 'Geleneksel tatlılar',
    sortOrder: 3,
    isActive: true,
    restaurantId: '1',
    customId: 'CAT003',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat4',
    name: 'Pizzalar',
    description: 'İtalyan pizzaları',
    sortOrder: 1,
    isActive: true,
    restaurantId: '2',
    customId: 'CAT004',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat5',
    name: 'Tatlılar',
    description: 'İtalyan tatlıları',
    sortOrder: 2,
    isActive: true,
    restaurantId: '2',
    customId: 'CAT005',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat6',
    name: 'Sushi',
    description: 'Taze sushi çeşitleri',
    sortOrder: 1,
    isActive: true,
    restaurantId: '3',
    customId: 'CAT006',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat7',
    name: 'İçecekler',
    description: 'Sıcak ve soğuk içecekler',
    sortOrder: 2,
    isActive: true,
    restaurantId: '3',
    customId: 'CAT007',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat8',
    name: 'Burgerler',
    description: 'Lezzetli burgerler',
    sortOrder: 1,
    isActive: true,
    restaurantId: '4',
    customId: 'CAT008',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat9',
    name: 'İçecekler',
    description: 'Serinletici içecekler',
    sortOrder: 2,
    isActive: true,
    restaurantId: '4',
    customId: 'CAT009',
    createdAt: Timestamp.now()
  },
  {
    id: 'cat10',
    name: 'Ana Yemekler',
    description: 'Çiğköfte çeşitleri',
    sortOrder: 1,
    isActive: true,
    restaurantId: '5',
    customId: 'CAT010',
    createdAt: Timestamp.now()
  }
];

// Örnek ürün verileri
const sampleProducts = [
  {
    id: 'prod1',
    name: 'Adana Kebap',
    description: 'Acılı kıyma kebabı, pilav ve yoğurt ile',
    price: 85,
    image: '/images/food/adana.jpg',
    category: 'Ana Yemekler',
    categoryIds: ['cat1'],
    categoryNames: ['Ana Yemekler'],
    preparationTime: 20,
    options: [],
    isActive: true,
    restaurantId: '1',
    customId: 'PROD001',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod2',
    name: 'Urfa Kebap',
    description: 'Acısız kıyma kebabı, pilav ve yoğurt ile',
    price: 85,
    image: '/images/food/urfa.jpg',
    category: 'Ana Yemekler',
    categoryIds: ['cat1'],
    categoryNames: ['Ana Yemekler'],
    preparationTime: 20,
    options: [],
    isActive: true,
    restaurantId: '1',
    customId: 'PROD002',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod3',
    name: 'Mercimek Çorbası',
    description: 'Geleneksel mercimek çorbası',
    price: 25,
    image: '/images/food/mercimek.jpg',
    category: 'Çorbalar',
    categoryIds: ['cat2'],
    categoryNames: ['Çorbalar'],
    preparationTime: 10,
    options: [],
    isActive: true,
    restaurantId: '1',
    customId: 'PROD003',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod4',
    name: 'Baklava',
    description: 'Antep fıstıklı baklava',
    price: 45,
    image: '/images/food/baklava.jpg',
    category: 'Tatlılar',
    categoryIds: ['cat3'],
    categoryNames: ['Tatlılar'],
    preparationTime: 5,
    options: [],
    isActive: true,
    restaurantId: '1',
    customId: 'PROD004',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod5',
    name: 'Margherita Pizza',
    description: 'Domates, mozzarella, fesleğen',
    price: 65,
    image: '/images/food/margherita.jpg',
    category: 'Pizzalar',
    categoryIds: ['cat4'],
    categoryNames: ['Pizzalar'],
    preparationTime: 15,
    options: [],
    isActive: true,
    restaurantId: '2',
    customId: 'PROD005',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod6',
    name: 'Pepperoni Pizza',
    description: 'Pepperoni sosis, mozzarella',
    price: 75,
    image: '/images/food/pepperoni.jpg',
    category: 'Pizzalar',
    categoryIds: ['cat4'],
    categoryNames: ['Pizzalar'],
    preparationTime: 15,
    options: [],
    isActive: true,
    restaurantId: '2',
    customId: 'PROD006',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod7',
    name: 'Tiramisu',
    description: 'Geleneksel İtalyan tatlısı',
    price: 35,
    image: '/images/food/tiramisu.jpg',
    category: 'Tatlılar',
    categoryIds: ['cat5'],
    categoryNames: ['Tatlılar'],
    preparationTime: 5,
    options: [],
    isActive: true,
    restaurantId: '2',
    customId: 'PROD007',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod8',
    name: 'California Roll',
    description: 'Kaliforniya usulü sushi',
    price: 45,
    image: '/images/food/california.jpg',
    category: 'Sushi',
    categoryIds: ['cat6'],
    categoryNames: ['Sushi'],
    preparationTime: 10,
    options: [],
    isActive: true,
    restaurantId: '3',
    customId: 'PROD008',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod9',
    name: 'Yeşil Çay',
    description: 'Geleneksel yeşil çay',
    price: 15,
    image: '/images/food/green-tea.jpg',
    category: 'İçecekler',
    categoryIds: ['cat7'],
    categoryNames: ['İçecekler'],
    preparationTime: 2,
    options: [],
    isActive: true,
    restaurantId: '3',
    customId: 'PROD009',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod10',
    name: 'Cheeseburger',
    description: 'Dana eti, cheddar peyniri, marul, domates',
    price: 55,
    image: '/images/food/cheeseburger.jpg',
    category: 'Burgerler',
    categoryIds: ['cat8'],
    categoryNames: ['Burgerler'],
    preparationTime: 12,
    options: [],
    isActive: true,
    restaurantId: '4',
    customId: 'PROD010',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod11',
    name: 'Milkshake',
    description: 'Çilekli milkshake',
    price: 22,
    image: '/images/food/milkshake.jpg',
    category: 'İçecekler',
    categoryIds: ['cat9'],
    categoryNames: ['İçecekler'],
    preparationTime: 5,
    options: [],
    isActive: true,
    restaurantId: '4',
    customId: 'PROD011',
    createdAt: Timestamp.now()
  },
  {
    id: 'prod12',
    name: 'Çiğ Köfte',
    description: 'Geleneksel çiğköfte',
    price: 35,
    image: '/images/food/cigkofte.jpg',
    category: 'Ana Yemekler',
    categoryIds: ['cat10'],
    categoryNames: ['Ana Yemekler'],
    preparationTime: 10,
    options: [],
    isActive: true,
    restaurantId: '5',
    customId: 'PROD012',
    createdAt: Timestamp.now()
  }
];

async function seedSampleData() {
  try {
    console.log('Örnek veriler ekleniyor...');

    // Restoranları ekle
    for (const restaurant of sampleRestaurants) {
      const restaurantRef = doc(db, 'restaurants', restaurant.id);
      await setDoc(restaurantRef, restaurant);
      console.log(`Restoran eklendi: ${restaurant.name}`);
    }

    // Kategorileri ekle
    for (const category of sampleCategories) {
      const categoryRef = doc(db, 'restaurants', category.restaurantId, 'categories', category.id);
      await setDoc(categoryRef, category);
      console.log(`Kategori eklendi: ${category.name} (${category.restaurantId})`);
    }

    // Ürünleri ekle
    for (const product of sampleProducts) {
      const productRef = doc(db, 'products', product.id);
      await setDoc(productRef, product);
      console.log(`Ürün eklendi: ${product.name} (${product.restaurantId})`);
    }

    console.log('Tüm örnek veriler başarıyla eklendi!');
    return true;
  } catch (error) {
    console.error('Örnek veriler eklenirken hata:', error);
    throw error;
  }
}

async function runSeed() {
  try {
    console.log('Seeding başlatılıyor...');
    await seedSampleData();
    console.log('Seeding tamamlandı!');
  } catch (error) {
    console.error('Seeding hatası:', error);
  }
}

runSeed();