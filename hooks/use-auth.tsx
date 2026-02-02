'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

// Mock User Type
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user from localStorage on mount (Simulated Persistence)
  useEffect(() => {
    const storedUser = localStorage.getItem('bee2-auth-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser)); // eslint-disable-line
      } catch (error) {
        console.error('Failed to parse user', error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    // Simulated API Call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const testEmail = process.env.NEXT_PUBLIC_TEST_EMAIL;
    const testPassword = process.env.NEXT_PUBLIC_TEST_PASSWORD;

    if (email === testEmail && password === testPassword) {
      const mockUser: User = {
        id: '1',
        name: 'Admin User',
        email: email,
        avatar: '/avatars/01.png',
        role: 'admin',
      };

      setUser(mockUser);
      localStorage.setItem('bee2-auth-user', JSON.stringify(mockUser));
      setIsLoading(false);
      return { success: true };
    } else {
      setIsLoading(false);
      return { success: false, error: 'E-posta veya şifre hatalı.' };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
  }) => {
    setIsLoading(true);

    // Simulate API Call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In a real app, strict validation would happen here or on server

    // Create new user (Simulated)
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      email: data.email,
      role: 'user',
    };

    setUser(newUser);
    localStorage.setItem('bee2-auth-user', JSON.stringify(newUser));
    setIsLoading(false);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bee2-auth-user');
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
