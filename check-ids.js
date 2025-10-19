const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy, updateDoc, doc } = require('firebase/firestore');

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

async function migrateCategories() {
  console.log('=== KATEGORİLERİ MİGRENİNG ===');
  const categoriesRef = collection(db, 'categories');
  const categoriesSnapshot = await getDocs(categoriesRef);

  for (const docSnapshot of categoriesSnapshot.docs) {
    const categoryData = docSnapshot.data();
    console.log(`Processing category: ${docSnapshot.id}`, categoryData);

    // Eğer restaurantId varsa ve shopId yoksa, shopId'yi ekle
    if (categoryData.restaurantId && !categoryData.shopId) {
      // restaurantId'yi ownerId olarak kabul edip, shops koleksiyonundan shopId'yi bul
      const shopsRef = collection(db, 'shops');
      const shopsQuery = query(shopsRef, where('ownerId', '==', categoryData.restaurantId));
      const shopsSnapshot = await getDocs(shopsQuery);

      if (!shopsSnapshot.empty) {
        const shopDoc = shopsSnapshot.docs[0];
        console.log(`Found shop for category: ${shopDoc.id}`);

        await updateDoc(doc(db, 'categories', docSnapshot.id), {
          shopId: shopDoc.id,
          updatedAt: new Date()
        });
        console.log(`Updated category ${docSnapshot.id} with shopId: ${shopDoc.id}`);
      } else {
        console.log(`No shop found for ownerId: ${categoryData.restaurantId}`);
      }
    }
  }
}

async function migrateProducts() {
  console.log('=== ÜRÜNLERİ MİGRENİNG ===');
  const productsRef = collection(db, 'products');
  const productsSnapshot = await getDocs(productsRef);

  for (const docSnapshot of productsSnapshot.docs) {
    const productData = docSnapshot.data();
    console.log(`Processing product: ${docSnapshot.id}`, productData);

    // Eğer categoryIds varsa ve bunlar customId ise, document ID'lere çevir
    if (productData.categoryIds && Array.isArray(productData.categoryIds)) {
      const updatedCategoryIds = [];

      for (const categoryId of productData.categoryIds) {
        // customId ile kategori bul
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('customId', '==', categoryId)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);

        if (!categoriesSnapshot.empty) {
          const categoryDoc = categoriesSnapshot.docs[0];
          updatedCategoryIds.push(categoryDoc.id);
          console.log(`Mapped customId ${categoryId} to documentId ${categoryDoc.id}`);
        } else {
          console.log(`Category not found for customId: ${categoryId}`);
        }
      }

      if (updatedCategoryIds.length > 0) {
        await updateDoc(doc(db, 'products', docSnapshot.id), {
          categoryIds: updatedCategoryIds,
          updatedAt: new Date()
        });
        console.log(`Updated product ${docSnapshot.id} categoryIds:`, updatedCategoryIds);
      }
    }
  }
}

async function checkData() {
  console.log('=== KATEGORİLER ===');
  const categoriesRef = collection(db, 'categories');
  const categoriesSnapshot = await getDocs(categoriesRef);
  categoriesSnapshot.forEach((doc) => {
    console.log(`${doc.id}:`, doc.data());
  });

  console.log('\n=== ÜRÜNLER ===');
  const productsRef = collection(db, 'products');
  const productsSnapshot = await getDocs(productsRef);
  productsSnapshot.forEach((doc) => {
    console.log(`${doc.id}:`, doc.data());
  });

  console.log('\n=== OPSİYONLAR ===');
  const optionsRef = collection(db, 'options');
  const optionsSnapshot = await getDocs(optionsRef);
  optionsSnapshot.forEach((doc) => {
    console.log(`${doc.id}:`, doc.data());
  });

  console.log('\n=== RESTORANLAR ===');
  const shopsRef = collection(db, 'shops');
  const shopsSnapshot = await getDocs(shopsRef);
  shopsSnapshot.forEach((doc) => {
    console.log(`${doc.id}:`, doc.data());
  });
}

async function main() {
  console.log('Starting migration...');
  await migrateCategories();
  await migrateProducts();
  console.log('Migration completed. Checking final state...');
  await checkData();
}

main().catch(console.error);