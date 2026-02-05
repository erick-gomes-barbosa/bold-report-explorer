

# Plano: Migrar Gerenciamento de Usuarios para Supabase Externo

## Visao Geral

Migrar toda a aplicacao para usar seu Supabase externo em vez do Lovable Cloud, utilizando as credenciais ja configuradas (`EXTERNAL_SUPABASE_URL` e `EXTERNAL_SUPABASE_KEY`).

---

## Arquitetura Atual vs Nova

```text
ARQUITETURA ATUAL:
+------------------+     +-------------------+
|  Frontend        |---->|  Lovable Cloud    |
|  (React App)     |     |  (Supabase)       |
+------------------+     +-------------------+

NOVA ARQUITETURA:
+------------------+     +-------------------+
|  Frontend        |---->|  Supabase Externo |
|  (React App)     |     |  (Seu projeto)    |
+------------------+     +-------------------+
```

---

## Alteracoes Necessarias

### 1. Criar Cliente Supabase Externo

**Novo arquivo:** `src/integrations/supabase/external-client.ts`

Criar um cliente Supabase separado que usa as variaveis de ambiente do projeto externo:

```typescript
import { createClient } from '@supabase/supabase-js';

// Cliente para Supabase externo (autenticacao e dados de usuarios)
const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const EXTERNAL_SUPABASE_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_KEY;

export const externalSupabase = createClient(
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
```

---

### 2. Adicionar Variaveis de Ambiente

Sera necessario adicionar as variaveis de ambiente do Supabase externo ao frontend:

| Variavel | Descricao |
|----------|-----------|
| `VITE_EXTERNAL_SUPABASE_URL` | URL do seu projeto Supabase externo |
| `VITE_EXTERNAL_SUPABASE_KEY` | Chave anon/publishable do seu projeto |

**Importante:** Estas sao chaves publicas (publishable) e podem ficar no codigo frontend.

---

### 3. Atualizar AuthContext

**Arquivo:** `src/contexts/AuthContext.tsx`

Alterar o import para usar o cliente externo:

```typescript
// ANTES
import { supabase } from '@/integrations/supabase/client';

// DEPOIS
import { externalSupabase } from '@/integrations/supabase/external-client';
```

Atualizar todas as chamadas de `supabase` para `externalSupabase`:

- `externalSupabase.auth.onAuthStateChange()`
- `externalSupabase.auth.getSession()`
- `externalSupabase.auth.signInWithPassword()`
- `externalSupabase.auth.signUp()`
- `externalSupabase.auth.signOut()`
- `externalSupabase.from('profiles').select()`
- `externalSupabase.from('user_roles').select()`

---

### 4. Definir Tipos para o Supabase Externo

**Novo arquivo:** `src/integrations/supabase/external-types.ts`

Criar tipos TypeScript para as tabelas do Supabase externo:

```typescript
export type AppRole = 'admin' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
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
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Profile>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id'>;
        Update: Partial<UserRole>;
      };
    };
    Enums: {
      app_role: AppRole;
    };
  };
}
```

---

## Resumo de Arquivos

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| Criar | `src/integrations/supabase/external-client.ts` | Cliente Supabase externo |
| Criar | `src/integrations/supabase/external-types.ts` | Tipos TypeScript |
| Modificar | `src/contexts/AuthContext.tsx` | Usar cliente externo |

---

## Informacoes Necessarias

Para prosseguir com a implementacao, vou precisar das seguintes informacoes do seu Supabase externo (sao chaves publicas, seguras para usar no frontend):

1. **URL do projeto** - Exemplo: `https://xxxxxxxxxxx.supabase.co`
2. **Chave Anon (publishable)** - A chave publica do seu projeto

Essas informacoes podem ser encontradas em:
`Supabase Dashboard > Settings > API > Project URL e Project API keys (anon/public)`

---

## Fluxo Apos Implementacao

```text
1. Usuario acessa /login ou /cadastro
   |
   v
2. Frontend usa externalSupabase.auth
   |
   v
3. Supabase EXTERNO processa autenticacao
   |
   v
4. Trigger cria profile/role no Supabase EXTERNO
   |
   v
5. Frontend busca dados do usuario do Supabase EXTERNO
   |
   v
6. Usuario autenticado pode acessar a plataforma
```

---

## Consideracoes Importantes

1. **Sessao separada:** O Supabase externo tera sua propria sessao de autenticacao
2. **Tabelas e RLS:** Como voce ja criou tudo, a estrutura esta pronta
3. **Edge Functions:** As edge functions continuarao usando o Lovable Cloud para Bold Reports
4. **Dados de usuarios:** Todos os dados de usuarios (profiles, roles) estarao no seu Supabase externo

