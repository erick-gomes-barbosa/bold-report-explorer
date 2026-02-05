
# Plano: Sincronizar Autenticacao Supabase + Bold Reports

## Visao Geral

Implementar um fluxo hibrido onde o usuario autentica via Supabase externo (sessao principal) e automaticamente valida/sincroniza com o Bold Reports para obter permissoes de relatorios.

## Arquitetura Proposta

```text
+-------------------+      +----------------------+      +-------------------+
|  Usuario          |      |  Edge Function       |      |  Bold Reports     |
|  (Login Form)     |      |  (bold-auth)         |      |  Cloud API        |
+--------+----------+      +----------+-----------+      +---------+---------+
         |                            |                            |
         | 1. signIn(email, pwd)      |                            |
         v                            |                            |
+--------+----------+                 |                            |
|  Supabase Externo |                 |                            |
|  (Auth + Profile) |                 |                            |
+--------+----------+                 |                            |
         |                            |                            |
         | 2. Session criada          |                            |
         |                            |                            |
         | 3. POST /bold-auth         |                            |
         +--------------------------->|                            |
         |                            | 4. POST /token              |
         |                            +--------------------------->|
         |                            |                            |
         |                            | 5. GET /users/me           |
         |                            +--------------------------->|
         |                            |                            |
         |                            | 6. GET /users/{id}/groups  |
         |                            +--------------------------->|
         |                            |                            |
         |                            |<------ isAdmin, token -----+
         |<--- boldReportsInfo -------+                            |
         |                            |                            |
         | 7. Armazenar no contexto   |                            |
         v                            |                            |
+--------+----------+                 |                            |
|  AuthContext      |                 |                            |
|  + boldReports    |                 |                            |
+-------------------+                 |                            |
```

## Detalhamento Tecnico

### 1. Nova Edge Function: bold-auth

**Arquivo:** `supabase/functions/bold-auth/index.ts`

Responsabilidades:
- Receber credenciais do usuario (email/senha)
- Autenticar no Bold Reports via endpoint `/token`
- Buscar informacoes do usuario via `/users/me`
- Verificar se e admin via `/users/{id}/groups`
- Retornar token Bold + flag isAdmin

```text
POST /bold-auth
Body: { email: string, password: string }
Response: {
  success: boolean,
  boldToken: string,
  userId: number,
  email: string,
  isAdmin: boolean,
  error?: string
}
```

### 2. Atualizar AuthContext

**Arquivo:** `src/contexts/AuthContext.tsx`

Adicionar:
- Estado `boldReportsInfo` com token e permissoes
- Funcao `syncWithBoldReports(email, password)` que chama a nova edge function
- Chamar sincronizacao apos login bem-sucedido no Supabase

```text
interface BoldReportsInfo {
  token: string | null;
  userId: number | null;
  isAdmin: boolean;
  synced: boolean;
}

interface AuthContextType {
  // ... campos existentes ...
  boldReportsInfo: BoldReportsInfo;
  syncWithBoldReports: (email: string, password: string) => Promise<void>;
}
```

### 3. Atualizar Pagina de Login

**Arquivo:** `src/pages/Login.tsx`

Modificar fluxo de `onSubmit`:
1. Autenticar no Supabase externo (ja implementado)
2. Em caso de sucesso, chamar `syncWithBoldReports(email, password)`
3. Navegar para a pagina principal

### 4. Atualizar Header para Exibir Role

**Arquivo:** `src/components/reports/ReportsHeader.tsx`

Adicionar badge ou indicador visual mostrando se o usuario e Admin no Bold Reports.

## Resumo de Arquivos

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| Criar | `supabase/functions/bold-auth/index.ts` | Edge function para autenticar no Bold Reports |
| Modificar | `src/contexts/AuthContext.tsx` | Adicionar estado e funcao para Bold Reports |
| Modificar | `src/pages/Login.tsx` | Integrar sincronizacao pos-login |
| Modificar | `src/components/reports/ReportsHeader.tsx` | Exibir role do Bold Reports |
| Criar | `src/types/boldAuth.ts` | Tipos TypeScript para autenticacao Bold |

## Fluxo de Login Completo

```text
1. Usuario preenche email e senha
   |
   v
2. signIn() -> Supabase Externo
   |
   +-- Erro? Exibir mensagem e parar
   |
   v
3. syncWithBoldReports(email, senha) -> Edge Function
   |
   +-- Erro? Logar no console (nao bloquear acesso)
   |
   v
4. Armazenar boldReportsInfo no contexto
   |
   v
5. Navegar para Dashboard
   |
   v
6. Header exibe role (Admin/Usuario) baseado em isAdmin
```

## Consideracoes de Seguranca

1. **Senha trafega apenas para Edge Function** (HTTPS + ambiente servidor)
2. **Token Bold Reports fica apenas em memoria** (useState, nao localStorage)
3. **Edge Function usa secrets** para URL base do Bold Reports
4. **Sincronizacao e opcional** - falha no Bold nao impede acesso ao sistema

## Tratamento de Cenarios

| Cenario | Comportamento |
|---------|---------------|
| Usuario existe no Supabase mas nao no Bold | Login ok, boldReportsInfo.synced = false |
| Credenciais diferentes entre sistemas | Login ok no Supabase, alerta que Bold nao sincronizou |
| Bold Reports indisponivel | Login ok, funcionalidades de relatorio limitadas |
| Admin no Bold | isAdmin = true, UI exibe badge e opcoes extras |

## URL do Bold Reports

Baseado na edge function existente, a URL base e:
- `https://cloud.boldreports.com/reporting/api/site/{BOLD_SITE_ID}`

O `BOLD_SITE_ID` ja esta configurado como secret.
