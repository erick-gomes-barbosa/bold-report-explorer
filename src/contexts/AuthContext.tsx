import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { externalSupabase } from '@/integrations/supabase/external-client';
import type { AppRole, Profile, UserRole } from '@/integrations/supabase/external-types';
import { supabase } from '@/integrations/supabase/client';
import type { BoldReportsInfo, BoldAuthResponse } from '@/types/boldAuth';
import { defaultBoldReportsInfo } from '@/types/boldAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  boldReportsInfo: BoldReportsInfo;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  syncWithBoldReports: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [boldReportsInfo, setBoldReportsInfo] = useState<BoldReportsInfo>(defaultBoldReportsInfo);

  // Fetch profile and role for a user
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await externalSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData && !profileError) {
        setProfile(profileData);
      }

      // Fetch role
      const { data: roleData, error: roleError } = await externalSupabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle() as { data: UserRole | null; error: any };

      if (roleData && !roleError) {
        setRole(roleData.role);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to avoid Supabase client deadlock
          setTimeout(() => {
            fetchUserData(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    externalSupabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchUserData(existingSession.user.id);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync with Bold Reports - call edge function to authenticate and get permissions
  const syncWithBoldReports = async (email: string, password: string) => {
    console.log('[AuthContext] Syncing with Bold Reports for:', email);
    
    try {
      const { data, error } = await supabase.functions.invoke<BoldAuthResponse>('bold-auth', {
        body: { email, password },
      });

      if (error) {
        console.error('[AuthContext] Bold Reports sync error:', error);
        setBoldReportsInfo({
          ...defaultBoldReportsInfo,
          synced: false,
          syncError: error.message,
        });
        return;
      }

      if (data?.success) {
        console.log('[AuthContext] Bold Reports sync successful:', { 
          userId: data.userId, 
          isAdmin: data.isAdmin 
        });
        setBoldReportsInfo({
          token: data.boldToken || null,
          userId: data.userId || null,
          email: data.email || null,
          isAdmin: data.isAdmin || false,
          synced: true,
          syncError: null,
        });
      } else {
        console.warn('[AuthContext] Bold Reports sync failed:', data?.error);
        setBoldReportsInfo({
          ...defaultBoldReportsInfo,
          synced: false,
          syncError: data?.error || 'Falha na sincronização',
        });
      }
    } catch (err) {
      console.error('[AuthContext] Bold Reports sync exception:', err);
      setBoldReportsInfo({
        ...defaultBoldReportsInfo,
        synced: false,
        syncError: err instanceof Error ? err.message : 'Erro inesperado',
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await externalSupabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await externalSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await externalSupabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setBoldReportsInfo(defaultBoldReportsInfo);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        boldReportsInfo,
        signIn,
        signUp,
        signOut,
        syncWithBoldReports,
      }}
    >
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
