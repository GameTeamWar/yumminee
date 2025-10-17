"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getCurrentUserRole } from '@/lib/firebase/auth';
import { UserRole } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  role: UserRole | null;
  loading: boolean;
}

// Default değerler ile context oluşturma
const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase auth durumunu dinleme
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        const userRole = await getCurrentUserRole(authUser);
        setRole(userRole as UserRole);
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    // Cleanup
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Context hook'u
export const useAuth = () => useContext(AuthContext);