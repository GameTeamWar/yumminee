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

async function cleanProductCollections() {
  try {
    console.log('Urunlerin koleksiyon bilgilerini temizliyorum...\n');

    // Tum ürünleri al
    const productsSnapshot = await getDocs(collection(db, 'products'));
    console.log(`Toplam ${productsSnapshot.size} urun bulundu`);

    let cleanedProducts = 0;

    // Her urun icin temizle
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      const productId = productDoc.id;

      console.log(`\nUrun temizleniyor: ${productData.name} (${productId})`);

      // Temizlenecek alanlar
      const cleanData = {
        categoryIds: [],
        categoryNames: [],
        optionIds: [],
        optionNames: [],
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'products', productId), cleanData);

      console.log(`  ✅ Temizlendi: kategori ve opsiyon bilgileri kaldirildi`);

      cleanedProducts++;
    }

    console.log(`\nOzet:`);
    console.log(`  - Toplam urun: ${productsSnapshot.size}`);
    console.log(`  - Temizlenen urun: ${cleanedProducts}`);

    if (cleanedProducts > 0) {
      console.log('\nUrunler basariyla temizlendi!');
      console.log('Artik urun duzenleme sayfasinda kategori secimi bos gelecek.');
    } else {
      console.log('\nTemizlenecek urun bulunamadi.');
    }

  } catch (error) {
    console.error('Urun temizleme sirasinda hata:', error);
  }
}

cleanProductCollections();