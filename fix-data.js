import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, collection, getDocs, setDoc } from 'firebase/firestore';

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

async function fixDataIssues() {
  try {
    console.log('Veri sorunlarını düzeltiyorum...\n');

    // 1. Ürünün restaurantId'sini düzelt
    const productRef = doc(db, 'products', 'ZHklbFwEmLU5eSbw2j6z');
    await updateDoc(productRef, {
      restaurantId: '17605974505', // Restoranın doğru ID'si
      isActive: true
    });
    console.log('✅ Ürün restaurantId ve isActive düzeltildi');

    // 2. Kategoriyi alt koleksiyona taşı
    const categoryDoc = await getDocs(collection(db, 'categories'));
    if (!categoryDoc.empty) {
      const categoryData = categoryDoc.docs[0].data();
      const categoryId = categoryDoc.docs[0].id;

      // Alt koleksiyona ekle
      const subCategoryRef = doc(db, 'restaurants', '17605974505', 'categories', categoryId);
      await setDoc(subCategoryRef, {
        ...categoryData,
        restaurantId: '17605974505' // Restoran ID'sini de güncelle
      });

      console.log('✅ Kategori alt koleksiyona taşındı');
    }

    // 3. Ürünün categoryIds'ini güncelle (kategori ID'si ile)
    const categoriesSnapshot = await getDocs(collection(db, 'restaurants', '17605974505', 'categories'));
    if (!categoriesSnapshot.empty) {
      const categoryId = categoriesSnapshot.docs[0].id;
      await updateDoc(productRef, {
        categoryIds: [categoryId],
        categoryNames: ['naa'] // Kategori adı
      });
      console.log('✅ Ürün kategori bilgileri güncellendi');
    }

    console.log('\n🎉 Veri düzeltmeleri tamamlandı!');
    console.log('Artık ürünler müşteri tarafında görünebilir.');

  } catch (error) {
    console.error('Veri düzeltme sırasında hata:', error);
  }
}

fixDataIssues();