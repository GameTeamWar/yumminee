import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, collection, getDocs } from 'firebase/firestore';

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

async function fixNewProduct() {
  try {
    console.log('Yeni eklenen ürünü düzeltiyorum...\n');

    // Yeni ürünü düzelt
    const productRef = doc(db, 'products', 'JXHsxpmx6MSdZETmLTgE');
    await updateDoc(productRef, {
      restaurantId: '17605974505', // Restoranın doğru ID'si
      isActive: true
    });
    console.log('✅ Yeni ürün (pizza) restaurantId ve isActive düzeltildi');

    // Kategori ID'sini de güncelle
    const categoriesSnapshot = await getDocs(collection(db, 'restaurants', '17605974505', 'categories'));
    if (!categoriesSnapshot.empty) {
      const categoryId = categoriesSnapshot.docs[0].id;
      await updateDoc(productRef, {
        categoryIds: [categoryId],
        categoryNames: ['naa'] // Kategori adı
      });
      console.log('✅ Yeni ürün kategori bilgileri güncellendi');
    }

    console.log('\n🎉 Yeni ürün düzeltmeleri tamamlandı!');

  } catch (error) {
    console.error('Yeni ürün düzeltme sırasında hata:', error);
  }
}

fixNewProduct();