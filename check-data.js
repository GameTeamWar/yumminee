import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkExistingData() {
  try {
    console.log('Firebase\'deki mevcut verileri kontrol ediyorum...\n');

    // Restoranları kontrol et
    const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
    console.log(`📍 Restoranlar: ${restaurantsSnapshot.size} adet`);

    if (restaurantsSnapshot.size > 0) {
      console.log('Mevcut restoranlar:');
      restaurantsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${data.name} (ID: ${doc.id})`);
      });
    }

    // Ürünleri kontrol et
    const productsSnapshot = await getDocs(collection(db, 'products'));
    console.log(`\n🍽️  Ürünler: ${productsSnapshot.size} adet`);

    // Kategorileri kontrol et
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    console.log(`📂 Kategoriler: ${categoriesSnapshot.size} adet`);

    // Kullanıcıları kontrol et
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`👥 Kullanıcılar: ${usersSnapshot.size} adet`);

    if (usersSnapshot.size > 0) {
      console.log('Mevcut kullanıcılar:');
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${data.displayName || data.email} (${data.role})`);
      });
    }

    console.log('\n✅ Veri kontrolü tamamlandı!');

    if (restaurantsSnapshot.size > 0 || productsSnapshot.size > 0 || usersSnapshot.size > 0) {
      console.log('\n⚠️  UYARI: Firebase\'de gerçek veriler mevcut!');
      console.log('Mock data eklemek mevcut verileri etkileyebilir.');
      return false;
    } else {
      console.log('\nℹ️  Firebase boş, mock data eklenebilir.');
      return true;
    }

  } catch (error) {
    console.error('Veri kontrolü sırasında hata:', error);
    return false;
  }
}

checkExistingData();