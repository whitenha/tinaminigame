'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, AuthError, OAuthResponse, AuthResponse } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResponse>;
  signUpWithEmail: (email: string, password: string, options?: Record<string, unknown>) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<OAuthResponse>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateUserMetadata: (data: Record<string, any>) => Promise<{ data: any, error: AuthError | null }>;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    const checkUserSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user || null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error getting session:', message);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email: string, password: string, options: Record<string, unknown> = {}): Promise<AuthResponse> => {
    return supabase.auth.signUp({ email, password, ...options });
  };

  const signInWithGoogle = async (): Promise<OAuthResponse> => {
    // Determine the current URL to build the redirect URL dynamically
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  const updateUserMetadata = async (metadata: Record<string, any>) => {
    const res = await supabase.auth.updateUser({
      data: metadata
    });
    if (!res.error && res.data.user) {
      setUser(res.data.user);
    }
    return res;
  };

  // Tạm thời nới lỏng: Bất kỳ ai đăng nhập đều được coi là teacher
  // TODO: Sau khi có chức năng cấp quyền, đổi lại thành: !!user?.user_metadata?.is_teacher
  const hasTeacherRole: boolean = !!user; 
  
  const value: AuthContextValue = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    updateUserMetadata,
    isTeacher: hasTeacherRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
