import { storage } from './config';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

// Dosya yükleme fonksiyonu
export const uploadFile = async (
  file: File,
  path: string,
  progressCallback?: (progress: number) => void
): Promise<string> => {
  try {
    // Dosya adında benzersiz bir soneki ekle (timestamp)
    const timestamp = new Date().getTime();
    const fileName = `${path}/${timestamp}_${file.name}`;
    
    // Storage referansı oluştur
    const storageRef = ref(storage, fileName);
    
    // Dosya yükleme işlemi
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // İlerleme durumunu hesapla
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (progressCallback) {
            progressCallback(progress);
          }
        },
        (error) => {
          console.error('Dosya yükleme hatası:', error);
          reject(error);
        },
        async () => {
          // Yükleme tamamlandığında indirme URL'sini al
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('Dosya yükleme fonksiyonu hatası:', error);
    throw error;
  }
};

// Resim yükleme fonksiyonu (restoranlar ve ürünler için)
export const uploadImage = async (
  file: File,
  type: 'restaurant' | 'product' | 'profile',
  id: string,
  progressCallback?: (progress: number) => void
): Promise<string> => {
  try {
    const path = `images/${type}s/${id}`;
    return await uploadFile(file, path, progressCallback);
  } catch (error) {
    console.error('Resim yükleme hatası:', error);
    throw error;
  }
};

// Dosya silme fonksiyonu
export const deleteFile = async (url: string): Promise<void> => {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Dosya silme hatası:', error);
    throw error;
  }
};