import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';

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

async function checkAndCleanOldCollections() {
  try {
    console.log('🔍 Firebase koleksiyonlarını kontrol ediyorum...\n');

    // 1. Eski root level koleksiyonları kontrol et
    console.log('📂 Eski root level koleksiyonları kontrol ediyorum:');

    const oldCategoriesSnapshot = await getDocs(collection(db, 'categories'));
    console.log(`  - Eski kategoriler: ${oldCategoriesSnapshot.size} adet`);

    const oldOptionsSnapshot = await getDocs(collection(db, 'options'));
    console.log(`  - Eski opsiyonlar: ${oldOptionsSnapshot.size} adet`);

    // 2. Mevcut subcollection yapısını kontrol et
    console.log('\n🏗️  Mevcut subcollection yapısını kontrol ediyorum:');

    const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
    console.log(`  - Restoranlar: ${restaurantsSnapshot.size} adet`);

    let totalSubCategories = 0;
    let totalSubOptions = 0;

    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantId = restaurantDoc.id;
      const restaurantName = restaurantDoc.data().name || 'İsimsiz';

      // Subcollection kategorilerini kontrol et
      const subCategoriesSnapshot = await getDocs(collection(db, 'restaurants', restaurantId, 'categories'));
      totalSubCategories += subCategoriesSnapshot.size;

      // Subcollection opsiyonlarını kontrol et
      const subOptionsSnapshot = await getDocs(collection(db, 'restaurants', restaurantId, 'options'));
      totalSubOptions += subOptionsSnapshot.size;

      if (subCategoriesSnapshot.size > 0 || subOptionsSnapshot.size > 0) {
        console.log(`  - ${restaurantName} (${restaurantId}):`);
        console.log(`    * Kategoriler: ${subCategoriesSnapshot.size}`);
        console.log(`    * Opsiyonlar: ${subOptionsSnapshot.size}`);
      }
    }

    console.log(`\n📊 Özet:`);
    console.log(`  - Toplam subcollection kategoriler: ${totalSubCategories}`);
    console.log(`  - Toplam subcollection opsiyonlar: ${totalSubOptions}`);

    // 3. Eski koleksiyonları temizle
    if (oldCategoriesSnapshot.size > 0 || oldOptionsSnapshot.size > 0) {
      console.log('\n🧹 Eski koleksiyonları temizliyorum...');

      const batch = writeBatch(db);

      // Eski kategorileri sil
      oldCategoriesSnapshot.forEach((doc) => {
        console.log(`  - Eski kategori siliniyor: ${doc.id}`);
        batch.delete(doc.ref);
      });

      // Eski opsiyonları sil
      oldOptionsSnapshot.forEach((doc) => {
        console.log(`  - Eski opsiyon siliniyor: ${doc.id}`);
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log('✅ Eski koleksiyonlar başarıyla temizlendi!');
    } else {
      console.log('\n✅ Eski koleksiyon bulunamadı, temizlik gerekli değil.');
    }

    // 4. Final kontrol
    console.log('\n🔍 Final kontrol yapıyorum...');

    const finalOldCategories = await getDocs(collection(db, 'categories'));
    const finalOldOptions = await getDocs(collection(db, 'options'));

    if (finalOldCategories.size === 0 && finalOldOptions.size === 0) {
      console.log('✅ Tüm eski koleksiyonlar başarıyla temizlendi!');
      console.log('✅ Sistem artık sadece subcollection yapısını kullanıyor.');
    } else {
      console.log('⚠️  Bazı eski koleksiyonlar hala mevcut, tekrar kontrol edin.');
    }

  } catch (error) {
    console.error('Koleksiyon kontrolü sırasında hata:', error);
  }
}

checkAndCleanOldCollections();