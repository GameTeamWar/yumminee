import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function checkRealData() {
  try {
    console.log('Gerçek verilerin detaylarını kontrol ediyorum...\n');

    // Restoranı detaylı kontrol et
    const restaurantDoc = await getDoc(doc(db, 'restaurants', '17605974505'));
    if (restaurantDoc.exists()) {
      const restaurant = restaurantDoc.data();
      console.log('🏪 Restoran Detayları:');
      console.log(`  ID: ${restaurantDoc.id}`);
      console.log(`  İsim: ${restaurant.name}`);
      console.log(`  Sahibi: ${restaurant.ownerId}`);
      console.log(`  Açık mı: ${restaurant.isOpen}`);
      console.log(`  Min. Sipariş: ${restaurant.minimumOrderAmount}₺`);
    }

    // Ürünleri kontrol et
    const productsSnapshot = await getDocs(collection(db, 'products'));
    console.log(`\n🍽️  Ürünler (${productsSnapshot.size} adet):`);
    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      console.log(`  - ${product.name} (ID: ${doc.id})`);
      console.log(`    Restoran ID: ${product.restaurantId}`);
      console.log(`    Aktif mi: ${product.isActive}`);
      console.log(`    Fiyat: ${product.price}₺`);
      console.log(`    Kategori: ${product.category || 'Yok'}`);
      console.log(`    Kategori IDs: ${product.categoryIds ? product.categoryIds.join(', ') : 'Yok'}`);
      console.log('');
    });

    // Kategorileri kontrol et (ana koleksiyon)
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    console.log(`📂 Ana Kategoriler (${categoriesSnapshot.size} adet):`);
    categoriesSnapshot.forEach((doc) => {
      const category = doc.data();
      console.log(`  - ${category.name} (ID: ${doc.id})`);
      console.log(`    Restoran ID: ${category.restaurantId}`);
      console.log(`    Aktif mi: ${category.isActive}`);
    });

    // Alt koleksiyon kategorilerini kontrol et
    console.log('\n📂 Alt Koleksiyon Kategorileri:');
    try {
      const subCategoriesSnapshot = await getDocs(collection(db, 'restaurants', '17605974505', 'categories'));
      console.log(`  Restoran ${'17605974505'} için ${subCategoriesSnapshot.size} kategori bulundu:`);
      subCategoriesSnapshot.forEach((doc) => {
        const category = doc.data();
        console.log(`  - ${category.name} (ID: ${doc.id})`);
        console.log(`    Aktif mi: ${category.isActive}`);
      });
    } catch (error) {
      console.log(`  Alt koleksiyon kategorileri alınamadı: ${error.message}`);
    }

  } catch (error) {
    console.error('Veri kontrolü sırasında hata:', error);
  }
}

checkRealData();