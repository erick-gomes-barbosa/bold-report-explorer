export type AppRole = 'admin' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  needs_password_reset?: boolean | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface ExternalDatabase {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          needs_password_reset?: boolean | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          needs_password_reset?: boolean | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: UserRole;
        Insert: {
          id?: string;
          user_id: string;
          role?: AppRole;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: AppRole;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _user_id: string;
          _role: AppRole;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
