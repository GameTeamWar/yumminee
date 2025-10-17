"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User,
  updateProfile as firebaseUpdateProfile,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { getUserProfile, getUserProfileByEmailAndRole } from "@/lib/firebase/db";
import { UserProfile } from "@/lib/firebase/types";
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  currentRole: string | null;
  signIn: (email: string, password: string, role?: string) => Promise<User>;
  signUp: (email: string, password: string, displayName: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  switchRole: (newRole: string) => Promise<void>;
  getAvailableRoles: () => Promise<string[]>;
  checkEmailAvailabilityForRole: (email: string, role: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Firebase authentication error messages in Turkish
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanılıyor. Lütfen farklı bir e-posta adresi deneyin.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf. Lütfen en az 6 karakter uzunluğunda bir şifre belirleyin.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi. Lütfen doğru bir e-posta adresi girin.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmış. Lütfen destek ekibiyle iletişime geçin.';
    case 'auth/user-not-found':
      return 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı.';
    case 'auth/wrong-password':
      return 'Hatalı şifre. Lütfen şifrenizi kontrol edin.';
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
    case 'auth/invalid-login-credentials':
      return 'Giriş bilgileri geçersiz. E-posta ve şifrenizi kontrol edin.';
    case 'auth/missing-password':
      return 'Şifre alanı boş bırakılamaz.';
    case 'auth/invalid-password':
      return 'Geçersiz şifre formatı.';
    case 'auth/account-exists-with-different-credential':
      return 'Bu e-posta adresi farklı bir giriş yöntemi ile kayıtlı.';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
    case 'auth/network-request-failed':
      return 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.';
    case 'auth/requires-recent-login':
      return 'Bu işlem için yeniden giriş yapmanız gerekiyor.';
    case 'auth/operation-not-allowed':
      return 'Bu işlem şu anda kullanılamıyor.';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [tabId] = useState(() => Date.now().toString()); // Her sekme için unique ID

  // URL'den role belirleme
  const getCurrentRoleFromURL = (): string => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/shop') || path.includes('shop')) {
        return 'restaurant';
      } else if (path.startsWith('/courier') || path.includes('courier')) {
        return 'courier';
      } else {
        return 'customer';
      }
    }
    return 'customer';
  };

  // Bu sekmenin rolünü localStorage'dan al veya URL'den belirle
  const getTabRole = (): string => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`auth-tab-role-${tabId}`);
      if (stored) {
        return stored;
      }
      const urlRole = getCurrentRoleFromURL();
      localStorage.setItem(`auth-tab-role-${tabId}`, urlRole);
      return urlRole;
    }
    return 'customer';
  };

  // Bu sekmenin rolünü ayarla
  const setTabRole = (role: string) => {
    setCurrentRole(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`auth-tab-role-${tabId}`, role);
    }
  };

  useEffect(() => {
    // URL değişikliklerini dinle
    const updateRoleFromURL = () => {
      const newRole = getCurrentRoleFromURL();
      setTabRole(newRole);
    };

    updateRoleFromURL();
    
    // URL değişikliklerini dinle
    window.addEventListener('popstate', updateRoleFromURL);
    
    return () => {
      window.removeEventListener('popstate', updateRoleFromURL);
    };
  }, [tabId]); // tabId dependency eklendi

  // Çoklu sekme desteği için storage event listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-user-logout') {
        // Başka bir sekmede çıkış yapıldıysa bu sekmede de çıkış yap
        setUser(null);
        setUserProfile(null);
        setTabRole('customer'); // Default role'a dön
      } else if (e.key === 'auth-user-role-change') {
        // Başka bir sekmede rol değiştiyse bu sekme için güncelle
        const newRole = e.newValue;
        if (newRole) {
          setTabRole(newRole);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [tabId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Önceki kullanıcı durumu ile karşılaştır
      const previousUser = user;
      const isNewLogin = !previousUser && currentUser;
      const isLogout = previousUser && !currentUser;

      setUser(currentUser);

      if (currentUser) {
        // Kullanıcı giriş yapmışsa token'ı güncelle ve profil bilgilerini getir
        try {
          const token = await currentUser.getIdToken();
          const isProduction = process.env.NODE_ENV === 'production';
          document.cookie = `auth-token=${token}; path=/; max-age=86400; ${isProduction ? 'secure;' : ''} samesite=strict`;

          // Mevcut role'a göre profil bilgilerini getir
          const roleToCheck = getTabRole();

          // Email kontrolü
          if (!currentUser.email) {
            console.error('Kullanıcının email adresi bulunamadı');
            setUser(null);
            setUserProfile(null);
            await firebaseSignOut(auth);
            return;
          }

          const profile = await getUserProfileByEmailAndRole(currentUser.email, roleToCheck);

          if (profile) {
            setUserProfile(profile as UserProfile);

            // Eğer başka bir sekmeden giriş yapıldıysa bilgilendir
            if (isNewLogin && localStorage.getItem('auth-multi-tab-warning-shown') !== 'true') {
              console.log('🔄 Başka bir sekmeden giriş yapıldı - çoklu sekme modu aktif');
              // toast.info('🔄 Başka bir sekmeden giriş yapıldı', {
              //   description: 'Farklı roller için ayrı sekmeler kullanabilirsiniz'
              // });
              localStorage.setItem('auth-multi-tab-warning-shown', 'true');
              setTimeout(() => localStorage.removeItem('auth-multi-tab-warning-shown'), 5000);
            }
          } else {
            // Bu role için profil yoksa sadece profili null yap, çıkış yapma
            console.warn(`${roleToCheck} rolü için profil bulunamadı:`, currentUser.email);
            setUserProfile(null);
            // Çıkış yapma - kullanıcı başka sekmelerde farklı rollerle giriş yapmış olabilir
          }
        } catch (error) {
          console.error('Token veya profil alınamadı:', error);
          setUserProfile(null);
        }
      } else {
        // Kullanıcı çıkış yapmışsa token'ı temizle ve profili sıfırla
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setUserProfile(null);

        // Eğer çıkış başka bir sekmeden yapıldıysa bilgilendir
        if (isLogout && !localStorage.getItem('auth-user-logout-triggered')) {
          console.log('🚪 Başka bir sekmeden çıkış yapıldı');
          // toast.info('🚪 Başka bir sekmeden çıkış yapıldı');
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [tabId]); // currentRole yerine tabId kullanıyoruz

  const signIn = async (email: string, password: string, role?: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Auth token cookie'si oluştur
      const token = await userCredential.user.getIdToken();
      const isProduction = process.env.NODE_ENV === 'production';
      document.cookie = `auth-token=${token}; path=/; max-age=86400; ${isProduction ? 'secure;' : ''} samesite=strict`;
      
      // Role belirtildiyse güncelle
      if (role) {
        setTabRole(role);
      }
      
      return userCredential.user;
    } catch (error: any) {
      console.error('SignIn error:', error);
      const errorMessage = error?.code ? getAuthErrorMessage(error.code) : error?.message || 'Giriş yapılırken bir hata oluştu.';
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;
      
      // Kullanıcı profil bilgisini güncelle
      if (user) {
        await firebaseUpdateProfile(user, { displayName });
        await sendEmailVerification(user);
      }
      
      return user;
    } catch (error: any) {
      console.error('SignUp error:', error);
      const errorMessage = error?.code ? getAuthErrorMessage(error.code) : error?.message || 'Hesap oluşturulurken bir hata oluştu.';
      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    try {
      // Bu sekmeden çıkış yapıldığını işaretle
      localStorage.setItem('auth-user-logout-triggered', 'true');
      
      await firebaseSignOut(auth);
      // Auth token cookie'sini temizle
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Diğer sekmelere çıkış yapıldığını haber ver
      localStorage.setItem('auth-user-logout', Date.now().toString());
      // Hemen sonra temizle (sadece event trigger için)
      setTimeout(() => {
        localStorage.removeItem('auth-user-logout');
        localStorage.removeItem('auth-user-logout-triggered');
      }, 100);

      // Çıkış sonrası ana sayfaya yönlendir
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
    try {
      if (!user) throw new Error("Kullanıcı oturum açmamış");
      await firebaseUpdateProfile(user, data);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user || !user.email) throw new Error("Kullanıcı oturum açmamış");

      // Kullanıcıyı yeniden doğrula
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Şifreyi güncelle
      await firebaseUpdatePassword(user, newPassword);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (!user) throw new Error("Kullanıcı oturum açmamış");
      await sendEmailVerification(user);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const refreshUserProfile = async () => {
    try {
      if (!user) {
        setUserProfile(null);
        return;
      }
      
      if (!user.email) {
        console.error('Kullanıcının email adresi bulunamadı');
        setUserProfile(null);
        return;
      }
      
      const roleToCheck = getTabRole();
      const profile = await getUserProfileByEmailAndRole(user.email, roleToCheck);
      setUserProfile(profile as UserProfile);
    } catch (error) {
      console.error('Profil yenilenirken hata:', error);
      setUserProfile(null);
    }
  };

  const switchRole = async (newRole: string) => {
    try {
      if (!user) {
        throw new Error("Kullanıcı oturum açmamış");
      }
      
      if (!user.email) {
        throw new Error("Kullanıcının email adresi bulunamadı");
      }
      
      // Yeni role göre profil kontrolü
      const profile = await getUserProfileByEmailAndRole(user.email, newRole);
      
      if (!profile) {
        // Bu role için hesap yoksa daha açıklayıcı hata mesajı ver
        const roleNames = {
          customer: 'Müşteri',
          restaurant: 'Restoran sahibi', 
          courier: 'Kurye'
        };
        throw new Error(`${roleNames[newRole as keyof typeof roleNames] || newRole} hesabınız bulunmuyor. Lütfen önce bu rol için kayıt olun.`);
      }
      
      setTabRole(newRole);
      setUserProfile(profile as UserProfile);
      
      // Diğer sekmelere rol değiştiğini haber ver
      localStorage.setItem('auth-user-role-change', newRole);
      setTimeout(() => localStorage.removeItem('auth-user-role-change'), 100);
    } catch (error) {
      console.error('Role değiştirirken hata:', error);
      throw error;
    }
  };

  const getAvailableRoles = async (): Promise<string[]> => {
    try {
      if (!user || !user.email) {
        return [];
      }

      const roles = ['customer', 'restaurant', 'courier'];
      const availableRoles: string[] = [];

      for (const role of roles) {
        try {
          const profile = await getUserProfileByEmailAndRole(user.email, role);
          if (profile) {
            availableRoles.push(role);
          }
        } catch (error) {
          // Bu rolde profil yok, devam et
          console.log(`${role} rolü için profil bulunamadı:`, error);
        }
      }

      return availableRoles;
    } catch (error) {
      console.error('Mevcut roller alınırken hata:', error);
      return [];
    }
  };

  // Ayrı hesap sistemi için email kontrolü
  const validateEmailForRole = (email: string, role: string): boolean => {
    // Opsiyonel: Rol bazlı email kısıtlaması
    // const emailDomain = email.split('@')[1];

    // if (role === 'restaurant' && !emailDomain.includes('business')) {
    //   return false; // Restoran hesapları için business email zorunlu
    // }

    return true; // Şimdilik tüm email'lere izin ver
  };

  // Ayrı hesap modu için rol kontrolü
  const checkEmailAvailabilityForRole = async (email: string, role: string): Promise<boolean> => {
    try {
      // Bu email ile başka bir rolde hesap var mı kontrol et
      const roles = ['customer', 'restaurant', 'courier'];
      for (const r of roles) {
        if (r !== role) {
          try {
            const profile = await getUserProfileByEmailAndRole(email, r);
            if (profile) {
              return false; // Bu email başka bir rolde kullanılıyor
            }
          } catch (error) {
            // Profil bulunamadı, devam et
          }
        }
      }
      return true; // Bu email bu rol için kullanılabilir
    } catch (error) {
      console.error('Email kontrolü yapılırken hata:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    currentRole,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateUserProfile,
    sendVerificationEmail,
    refreshUserProfile,
    switchRole,
    getAvailableRoles,
    checkEmailAvailabilityForRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Çoklu sekme yönetimi için hook
export const useMultiTabAuth = () => {
  const [activeTabs, setActiveTabs] = useState<number>(1);
  
  useEffect(() => {
    // Bu sekmenin aktif olduğunu işaretle
    const tabId = Date.now().toString();
    localStorage.setItem(`auth-tab-${tabId}`, 'active');
    
    // Aktif sekmeleri say
    const countActiveTabs = () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('auth-tab-'));
      setActiveTabs(keys.length);
    };
    
    countActiveTabs();
    
    // Storage değişikliklerini dinle
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('auth-tab-')) {
        countActiveTabs();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Sekme kapatılınca temizle
    const handleBeforeUnload = () => {
      localStorage.removeItem(`auth-tab-${tabId}`);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      localStorage.removeItem(`auth-tab-${tabId}`);
    };
  }, []);
  
  return { activeTabs };
};