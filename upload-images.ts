import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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
const storage = getStorage(app);
const db = getFirestore(app);

// Resim dosyalarını yükleme fonksiyonu
async function uploadImage(filePath: string, storagePath: string): Promise<string> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const storageRef = ref(storage, storagePath);

    console.log(`Uploading ${filePath} to ${storagePath}...`);
    const snapshot = await uploadBytes(storageRef, fileBuffer);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log(`✅ Uploaded ${filePath}: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading ${filePath}:`, error);
    throw error;
  }
}

// Tüm resimleri yükleme fonksiyonu
async function uploadAllImages() {
  try {
    console.log('🚀 Starting image upload process...');

    const imagesDir = path.join(process.cwd(), 'public', 'images');

    // Restoran resimlerini yükle
    const restaurantImages = [
      'butger.png',
      'hero-food.jpg',
      'logo.png'
    ];

    console.log('\n📁 Uploading restaurant images...');
    for (const imageName of restaurantImages) {
      const filePath = path.join(imagesDir, imageName);
      if (fs.existsSync(filePath)) {
        const storagePath = `restaurant-images/${imageName}`;
        const downloadURL = await uploadImage(filePath, storagePath);

        // Firebase'de ilgili restaurant'ı güncelle
        if (imageName === 'butger.png') {
          // Burger House için
          const restaurantRef = doc(db, 'restaurants', '4');
          await updateDoc(restaurantRef, {
            image: downloadURL,
            coverImage: downloadURL
          });
          console.log('✅ Updated Burger House image');
        } else if (imageName === 'hero-food.jpg') {
          // Hero food için genel kullanım
          console.log('✅ Hero food uploaded for general use');
        } else if (imageName === 'logo.png') {
          // Logo için genel kullanım
          console.log('✅ Logo uploaded for general use');
        }
      }
    }

    // Ürün resimlerini yükle
    const foodImages = [
      'adana.jpg',
      'urfa.jpg',
      'mercimek.jpg',
      'baklava.jpg',
      'margherita.jpg',
      'pepperoni.jpg',
      'tiramisu.jpg',
      'california.jpg',
      'green-tea.jpg',
      'cheeseburger.jpg',
      'milkshake.jpg',
      'cigkofte.jpg'
    ];

    console.log('\n🍽️ Uploading food images...');
    for (const imageName of foodImages) {
      const filePath = path.join(imagesDir, 'food', imageName);
      if (fs.existsSync(filePath)) {
        const storagePath = `food-images/${imageName}`;
        const downloadURL = await uploadImage(filePath, storagePath);

        // Firebase'de ilgili ürünü güncelle
        const productName = imageName.replace('.jpg', '');
        let productId = '';

        switch (productName) {
          case 'adana': productId = 'prod1'; break;
          case 'urfa': productId = 'prod2'; break;
          case 'mercimek': productId = 'prod3'; break;
          case 'baklava': productId = 'prod4'; break;
          case 'margherita': productId = 'prod5'; break;
          case 'pepperoni': productId = 'prod6'; break;
          case 'tiramisu': productId = 'prod7'; break;
          case 'california': productId = 'prod8'; break;
          case 'green-tea': productId = 'prod9'; break;
          case 'cheeseburger': productId = 'prod10'; break;
          case 'milkshake': productId = 'prod11'; break;
          case 'cigkofte': productId = 'prod12'; break;
        }

        if (productId) {
          const productRef = doc(db, 'products', productId);
          await updateDoc(productRef, {
            image: downloadURL
          });
          console.log(`✅ Updated product ${productName} image`);
        }
      } else {
        console.log(`⚠️ Food image not found: ${filePath}`);
      }
    }

    // Marker ve diğer resimleri yükle
    const otherImages = [
      'courier-marker.png',
      'delivery-marker.png',
      'marker-icon.png',
      'restaurant-marker.png'
    ];

    console.log('\n📍 Uploading marker images...');
    for (const imageName of otherImages) {
      const filePath = path.join(imagesDir, imageName);
      if (fs.existsSync(filePath)) {
        const storagePath = `markers/${imageName}`;
        await uploadImage(filePath, storagePath);
      }
    }

    // Mockup resimleri yükle
    const mockupImages = [
      'customer-app-mockup.png',
      'customer-app-mockusp.png',
      'Adsız tasarım.png'
    ];

    console.log('\n📱 Uploading mockup images...');
    for (const imageName of mockupImages) {
      const filePath = path.join(imagesDir, imageName);
      if (fs.existsSync(filePath)) {
        const storagePath = `mockups/${imageName}`;
        await uploadImage(filePath, storagePath);
      }
    }

    console.log('\n🎉 All images uploaded successfully!');

  } catch (error) {
    console.error('❌ Error in upload process:', error);
  }
}

// Script'i çalıştır
uploadAllImages();