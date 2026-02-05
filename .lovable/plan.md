
# Plano: Sistema de Cadastro e Login de Usuários

## Visao Geral

Implementar um sistema completo de autenticacao utilizando Supabase Auth integrado com Lovable Cloud, incluindo:
- Paginas de Login e Cadastro
- Gerenciamento de sessao
- Tabela de perfis de usuarios
- Sistema de roles para controle de acesso
- Protecao de rotas

---

## Arquitetura do Sistema

```text
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|  Pagina Login    +---->+  Supabase Auth    +---->+  auth.users      |
|  Pagina Cadastro |     |                   |     |  (gerenciado)    |
|                  |     +--------+----------+     +--------+---------+
+------------------+              |                         |
                                  |  Trigger                |
                                  v                         v
                         +--------+----------+     +--------+---------+
                         |                   |     |                  |
                         |  profiles         |<----+  user_roles      |
                         |  (dados usuario)  |     |  (permissoes)    |
                         |                   |     |                  |
                         +-------------------+     +------------------+
```

---

## Componentes Necessarios

### 1. Banco de Dados (Migracao SQL)

#### Tabela `profiles`
Armazena informacoes adicionais do usuario:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver seu proprio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Usuarios podem atualizar seu proprio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
```

#### Tabela `user_roles` (Sistema de Permissoes)

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Funcao segura para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admins podem ver todos os roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuarios podem ver seu proprio role
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

#### Trigger para Criar Perfil Automaticamente

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Atribuir role padrao (viewer)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

### 2. Contexto de Autenticacao

#### Arquivo: `src/contexts/AuthContext.tsx`

Gerencia o estado de autenticacao em toda a aplicacao:

```typescript
// Funcionalidades:
- Listener onAuthStateChange (antes de getSession)
- Estado do usuario atual
- Funcoes: signIn, signUp, signOut
- Loading state durante verificacao inicial
- Perfil e role do usuario
```

---

### 3. Hook de Autenticacao

#### Arquivo: `src/hooks/useAuth.ts`

Hook conveniente para acessar o contexto:

```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

### 4. Paginas de Autenticacao

#### Arquivo: `src/pages/Login.tsx`

- Formulario com email e senha
- Link para cadastro
- Opcao "Esqueci minha senha"
- Validacao com Zod
- Feedback visual (loading, erros)

#### Arquivo: `src/pages/Cadastro.tsx`

- Formulario com nome, email, senha, confirmacao
- Validacao de forca da senha
- Link para login
- Mensagem de confirmacao de email

---

### 5. Componente de Rota Protegida

#### Arquivo: `src/components/ProtectedRoute.tsx`

```typescript
// Funcionalidades:
- Verifica se usuario esta autenticado
- Redireciona para /login se nao autenticado
- Mostra loading enquanto verifica sessao
- Opcional: verificar role minimo
```

---

### 6. Atualizacao do Roteamento

#### Arquivo: `src/App.tsx`

```typescript
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/cadastro" element={<Cadastro />} />
  
  {/* Rotas Protegidas */}
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<Reports />} />
    <Route path="/bold-reports" element={<Index />} />
  </Route>
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

### 7. Atualizacao do Header

#### Arquivo: `src/components/reports/ReportsHeader.tsx`

Adicionar:
- Nome do usuario logado
- Menu dropdown com opcoes:
  - Ver Perfil
  - Configuracoes
  - Sair

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/contexts/AuthContext.tsx` | Contexto de autenticacao |
| `src/hooks/useAuth.ts` | Hook para acesso ao contexto |
| `src/pages/Login.tsx` | Pagina de login |
| `src/pages/Cadastro.tsx` | Pagina de cadastro |
| `src/components/ProtectedRoute.tsx` | Wrapper de rota protegida |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar AuthProvider e novas rotas |
| `src/components/reports/ReportsHeader.tsx` | Adicionar menu do usuario |
| Migracao SQL | Criar tabelas profiles e user_roles |

---

## Fluxo de Usuario

```text
1. Usuario acessa qualquer rota
   |
   v
2. ProtectedRoute verifica sessao
   |
   +---> Nao autenticado --> Redireciona para /login
   |
   v
3. Usuario esta na pagina de Login
   |
   +---> Clica "Cadastrar" --> Vai para /cadastro
   |
   v
4. Usuario preenche formulario e envia
   |
   v
5. Supabase Auth cria usuario em auth.users
   |
   v
6. Trigger cria registro em profiles e user_roles
   |
   v
7. Usuario recebe email de confirmacao (opcional)
   |
   v
8. Usuario faz login com email/senha
   |
   v
9. onAuthStateChange detecta sessao
   |
   v
10. ProtectedRoute libera acesso
    |
    v
11. Usuario ve o dashboard de relatorios
```

---

## Consideracoes de Seguranca

1. **Senhas**: Validacao minima de 8 caracteres, com numeros e letras
2. **RLS**: Todas as tabelas com Row Level Security ativado
3. **Roles em tabela separada**: Evita ataques de escalacao de privilegios
4. **SECURITY DEFINER**: Funcao `has_role` executa com privilegios elevados de forma segura
5. **Confirmacao de email**: Pode ser habilitada/desabilitada conforme necessidade

---

## Proximos Passos Opcionais

Apos a implementacao base, podem ser adicionados:

- Recuperacao de senha (esqueci minha senha)
- Login social (Google via Lovable Cloud)
- Pagina de perfil do usuario
- Painel administrativo para gerenciar roles
- Logs de auditoria de acesso
