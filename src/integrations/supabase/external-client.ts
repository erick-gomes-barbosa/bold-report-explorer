import { createClient } from '@supabase/supabase-js';
import type { ExternalDatabase } from './external-types';

// Cliente para Supabase externo (autenticação e dados de usuários)
const EXTERNAL_SUPABASE_URL = 'https://fyzipdzbslanwzbjgrrn.supabase.co';
const EXTERNAL_SUPABASE_KEY = 'sb_publishable_8foRTdonScLDIW37MEcIHg_Arav34aP';

export const externalSupabase = createClient<ExternalDatabase>(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
