const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function checkAndFixProductCategories() {
  try {
    console.log('Urünlerin kategori ID\'lerini kontrol ediyorum...\n');

    // Tum ürünleri al
    const productsSnapshot = await getDocs(collection(db, 'products'));
    console.log(`Toplam ${productsSnapshot.size} urun bulundu`);

    let fixedProducts = 0;
    let productsWithIssues = 0;

    // Her urun icin kontrol et
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      const productId = productDoc.id;
      const restaurantId = productData.restaurantId;

      if (!restaurantId) {
        console.log(`Urun ${productId}: restaurantId yok, atlanıyor`);
        continue;
      }

      console.log(`\nUrun kontrol ediliyor: ${productData.name} (${productId})`);

      // Urunun kategorilerini al
      const categoryIds = productData.categoryIds || [];
      const optionIds = productData.optionIds || [];

      if (categoryIds.length === 0 && optionIds.length === 0) {
        console.log(`  Kategori/opsiyon ID\'si yok`);
        continue;
      }

      // Mevcut subcollection kategorilerini al
      const categoriesSnapshot = await getDocs(collection(db, 'restaurants', restaurantId, 'categories'));
      const currentCategories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        customId: doc.data().customId,
        name: doc.data().name
      }));

      // Mevcut subcollection opsiyonlarini al
      const optionsSnapshot = await getDocs(collection(db, 'restaurants', restaurantId, 'options'));
      const currentOptions = optionsSnapshot.docs.map(doc => ({
        id: doc.id,
        customId: doc.data().customId,
        name: doc.data().name
      }));

      console.log(`  Mevcut kategoriler: ${currentCategories.length}`);
      console.log(`  Mevcut opsiyonlar: ${currentOptions.length}`);

      // Kategori ID\'lerini kontrol et ve duzelt
      let validCategoryIds = [];
      let validCategoryNames = [];
      let needsUpdate = false;

      for (const categoryId of categoryIds) {
        // Once customId ile ara
        let foundCategory = currentCategories.find(cat => cat.customId === categoryId);
        if (!foundCategory) {
          // Sonra normal id ile ara
          foundCategory = currentCategories.find(cat => cat.id === categoryId);
        }

        if (foundCategory) {
          validCategoryIds.push(foundCategory.customId || foundCategory.id);
          validCategoryNames.push(foundCategory.name);
        } else {
          console.log(`  Gecersiz kategori ID: ${categoryId}`);
          needsUpdate = true;
        }
      }

      // Opsiyon ID\'lerini kontrol et ve duzelt
      let validOptionIds = [];
      let validOptionNames = [];

      for (const optionId of optionIds) {
        // Once customId ile ara
        let foundOption = currentOptions.find(opt => opt.customId === optionId);
        if (!foundOption) {
          // Sonra normal id ile ara
          foundOption = currentOptions.find(opt => opt.id === optionId);
        }

        if (foundOption) {
          validOptionIds.push(foundOption.customId || foundOption.id);
          validOptionNames.push(foundOption.name);
        } else {
          console.log(`  Gecersiz opsiyon ID: ${optionId}`);
          needsUpdate = true;
        }
      }

      // Eger guncelleme gerekiyorsa
      if (needsUpdate || validCategoryIds.length !== categoryIds.length || validOptionIds.length !== optionIds.length) {
        console.log(`  Urun guncelleniyor...`);

        const updateData = {
          categoryIds: validCategoryIds,
          categoryNames: validCategoryNames,
          optionIds: validOptionIds,
          optionNames: validOptionNames,
          updatedAt: new Date()
        };

        await updateDoc(doc(db, 'products', productId), updateData);

        console.log(`  Urun guncellendi:`);
        console.log(`    - Eski kategori ID\'leri: ${categoryIds.join(', ')}`);
        console.log(`    - Yeni kategori ID\'leri: ${validCategoryIds.join(', ')}`);
        console.log(`    - Eski opsiyon ID\'leri: ${optionIds.join(', ')}`);
        console.log(`    - Yeni opsiyon ID\'leri: ${validOptionIds.join(', ')}`);

        fixedProducts++;
      } else {
        console.log(`  Urun zaten dogru`);
      }

      if (needsUpdate) {
        productsWithIssues++;
      }
    }

    console.log(`\nOzet:`);
    console.log(`  - Toplam urun: ${productsSnapshot.size}`);
    console.log(`  - Duzeltilen urun: ${fixedProducts}`);
    console.log(`  - Sorunlu urun: ${productsWithIssues}`);

    if (fixedProducts > 0) {
      console.log('\nUrünler basariyla duzeltildi!');
    } else {
      console.log('\nTum urunler zaten dogru yapidadir.');
    }

  } catch (error) {
    console.error('Urun kontrolu sirasinda hata:', error);
  }
}

checkAndFixProductCategories();