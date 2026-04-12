'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({
  user: null,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  isTeacher: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const checkUserSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user || null);
      } catch (err) {
        console.error('Error getting session:', err.message);
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

  const signInWithEmail = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email, password, options = {}) => {
    return supabase.auth.signUp({ email, password, ...options });
  };

  const signInWithGoogle = async () => {
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

  const value = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    isTeacher: !!user, // Anyone logged in is considered a teacher/creator
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
