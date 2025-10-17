"use client";

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, db } from './config';
import { collection, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Kullanıcı kayıt fonksiyonu
export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string,
  phoneNumber: string,
  address: string,
  role: 'customer' | 'restaurant' | 'courier' | 'admin' = 'customer'
) => {
  try {
    // Firebase Authentication kaydı
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Kullanıcı profilini güncelle
    await updateProfile(userCredential.user, { displayName });

    // Firestore'da kullanıcı bilgilerini kaydet
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      displayName,
      phoneNumber,
      address,
      role,
      createdAt: serverTimestamp(),
    });

    // Role özel koleksiyon için kayıt oluştur
    if (role === 'restaurant') {
      await setDoc(doc(db, 'restaurants', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: displayName,
        email,
        phoneNumber,
        address,
        coverImage: '',
        categories: [],
        rating: 0,
        reviewCount: 0,
        serviceRadius: 5, // km cinsinden varsayılan hizmet alanı
        createdAt: serverTimestamp(),
      });
    } else if (role === 'courier') {
      await setDoc(doc(db, 'couriers', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: displayName,
        email,
        phoneNumber,
        isOnline: false,
        isAvailable: false,
        currentLocation: null,
        createdAt: serverTimestamp(),
      });
    }

    return userCredential.user;
  } catch (error) {
    console.error('Kullanıcı kaydı hatası:', error);
    throw error;
  }
};

// Kullanıcı girişi fonksiyonu
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Giriş hatası:', error);
    throw error;
  }
};

// Çıkış fonksiyonu
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Çıkış hatası:', error);
    throw error;
  }
};

// Şifre sıfırlama
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error);
    throw error;
  }
};

// Mevcut kullanıcı rolünü getir
export const getCurrentUserRole = async (user: User | null) => {
  if (!user) return null;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data().role;
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı rolü alma hatası:', error);
    return null;
  }
};