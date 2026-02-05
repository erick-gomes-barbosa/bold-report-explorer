
# Plano: Sistema Completo de Gerenciamento de Usuarios

## Resumo

Implementar um sistema CRUD completo de usuarios com sincronizacao entre Supabase (externo) e Bold Reports Cloud, incluindo:
- Adicionar usuario (com senha temporaria e fluxo de primeiro login)
- Editar usuario
- Apagar usuario
- Visualizar permissoes

## Arquitetura da Solucao

```text
+---------------------------+       +---------------------------+
|   UserManagement.tsx      |       |   Edge Functions          |
|  +-----------------------+|       |  +-----------------------+|
|  | UserActionsToolbar    ||       |  | user-management       ||
|  | - Adicionar Usuario   |------->|  | - POST: criar usuario ||
|  | - Editar Usuario      ||       |  | - PUT: editar usuario ||
|  | - Apagar Usuario      ||       |  | - DELETE: apagar      ||
|  | - Ver Permissoes      ||       |  | - GET: permissoes     ||
|  +-----------------------+|       |  +-----------------------+|
|                           |       +---------------------------+
|  Modais:                  |                    |
|  - AddUserDialog          |       +------------+------------+
|  - EditUserDialog         |       |                         |
|  - DeleteUserDialog       |       v                         v
|  - PermissionsDialog      | +------------+         +----------------+
+---------------------------+ |  Supabase  |         | Bold Reports   |
                              |  Externo   |         | Cloud API      |
                              +------------+         +----------------+
```

## Migracao de Banco de Dados

O usuario ja adicionou manualmente o campo `needs_password_reset` na tabela `profiles`.

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/user-management/index.ts` | Edge function unificada para CRUD |
| `src/components/users/UserActionsToolbar.tsx` | Barra de acoes com botoes |
| `src/components/users/AddUserDialog.tsx` | Modal para adicionar usuario |
| `src/components/users/EditUserDialog.tsx` | Modal para editar usuario |
| `src/components/users/DeleteUserDialog.tsx` | Dialogo de confirmacao |
| `src/components/users/PermissionsDialog.tsx` | Modal de permissoes |
| `src/pages/PasswordReset.tsx` | Pagina de troca de senha obrigatoria |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/UserManagement.tsx` | Integrar toolbar, selecao de usuarios e modais |
| `src/contexts/AuthContext.tsx` | Verificar `needs_password_reset` apos login |
| `src/pages/Login.tsx` | Redirecionar para troca de senha se necessario |
| `supabase/config.toml` | Adicionar configuracao da nova edge function |
| `src/integrations/supabase/external-types.ts` | Adicionar campo `needs_password_reset` ao tipo Profile |

---

## 1. Edge Function: user-management

### Operacoes suportadas:

| Metodo | Acao | Endpoint | Body/Params |
|--------|------|----------|-------------|
| POST | Criar usuario | `/user-management` | `{ action: 'create', email, firstName, lastName, password }` |
| PUT | Editar usuario | `/user-management` | `{ action: 'update', email, firstName, lastName, contactNumber }` |
| DELETE | Apagar usuario | `/user-management` | `{ action: 'delete', email }` |
| GET | Permissoes | `/user-management?userId=123` | - |

### Fluxo de criacao de usuario:

```text
1. Recebe dados (email, firstName, lastName, password)
           |
           v
2. Cria usuario no Bold Reports via POST /v1.0/users
   Body: { Email, FirstName, Lastname, Password }
           |
           v
3. Cria usuario no Supabase externo via Admin API
   - createUser({ email, password, ... })
           |
           v
4. Atualiza profile no Supabase externo
   - Marca needs_password_reset = true
           |
           v
5. Retorna sucesso
```

### Endpoints Bold Reports utilizados:

| Operacao | Metodo | Endpoint |
|----------|--------|----------|
| Criar | POST | `/v1.0/users` |
| Editar | PUT | `/v1.0/users/{email}` |
| Apagar | DELETE | `/v1.0/users/{email}` |
| Permissoes | GET | `/v1.0/permissions/users/{id}` |

---

## 2. Componentes de UI

### UserActionsToolbar.tsx

```text
+----------------------------------------------------------------+
| [+ Adicionar Usuario]  [Editar]  [Apagar]  [Ver Permissoes]    |
+----------------------------------------------------------------+
                          ^            ^             ^
                          |            |             |
                    Desabilitado se nenhum usuario selecionado
```

Props:
- `selectedUser: BoldUser | null`
- `onAddClick: () => void`
- `onEditClick: () => void`
- `onDeleteClick: () => void`
- `onPermissionsClick: () => void`

### AddUserDialog.tsx

Formulario com campos:
- Email (obrigatorio)
- Nome (obrigatorio)
- Sobrenome (opcional)
- Senha temporaria (obrigatorio, com botao para mostrar/esconder e gerar automaticamente)

Validacao:
- Email valido
- Nome com minimo 2 caracteres
- Senha com minimo 8 caracteres, 1 maiuscula, 1 numero

### EditUserDialog.tsx

Formulario pre-preenchido com dados do usuario selecionado:
- Email (somente leitura - identificador)
- Nome
- Sobrenome
- Telefone (apenas Bold Reports)

### DeleteUserDialog.tsx

Dialogo de confirmacao:
- Exibe nome e email do usuario
- Checkbox "Confirmo que desejo excluir este usuario"
- Botao de exclusao desabilitado ate marcar checkbox
- Aviso: "Esta acao ira remover o usuario de ambos os sistemas"

### PermissionsDialog.tsx

Exibe permissoes organizadas por categoria:

```text
+--------------------------------------------------+
|  Permissoes de: Joao Silva                       |
+--------------------------------------------------+
|                                                  |
|  Relatorios                                      |
|  +--------------------------------------------+  |
|  | AllReports              | Read            |  |
|  | Categoria Financeiro    | ReadWrite       |  |
|  +--------------------------------------------+  |
|                                                  |
|  Fontes de Dados                                 |
|  +--------------------------------------------+  |
|  | AllDataSources          | Read            |  |
|  +--------------------------------------------+  |
|                                                  |
|  Datasets                                        |
|  +--------------------------------------------+  |
|  | SpecificDataset: Vendas | ReadWrite       |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

Categorias de PermissionEntity:
- Relatorios: `AllReports`, `ReportsInCategory`, `SpecificReports`
- Categorias: `AllCategories`, `SpecificCategory`
- Fontes de Dados: `AllDataSources`, `SpecificDataSource`
- Datasets: `AllDatasets`, `SpecificDataset`
- Agendamentos: `AllSchedules`, `SpecificSchedule`

Niveis de PermissionAccess:
- `Create` - Apenas criar
- `Read` - Apenas visualizar
- `ReadWrite` - Visualizar e editar
- `ReadWriteDelete` - Acesso total
- `Download` - Apenas download

---

## 3. UserManagement.tsx - Alteracoes

### Novos estados:

```typescript
const [selectedUser, setSelectedUser] = useState<BoldUser | null>(null);
const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
```

### Funcao de refresh:

```typescript
const refreshUsers = async () => {
  // Re-fetch users from bold-users edge function
  setSelectedUser(null);
};
```

### Tabela com selecao:

- Click na linha seleciona o usuario
- Linha selecionada tem fundo destacado (`bg-accent`)
- Click novamente deseleciona

---

## 4. Fluxo de Primeiro Login

### Alteracoes no AuthContext:

Apos login bem-sucedido, verificar se `profile.needs_password_reset === true`:

```typescript
// Apos fetchUserData
if (profileData?.needs_password_reset) {
  // Setar flag para redirecionar
  setNeedsPasswordReset(true);
}
```

### Alteracoes no Login.tsx:

```typescript
// Apos sincronizacao com Bold Reports
if (needsPasswordReset) {
  navigate('/trocar-senha');
} else {
  navigate('/');
}
```

### Nova pagina PasswordReset.tsx:

```text
+---------------------------------------+
|                                       |
|    Defina sua nova senha              |
|    ---------------------------        |
|                                       |
|    Este e seu primeiro acesso.        |
|    Por favor, defina uma nova senha.  |
|                                       |
|    Nova senha: [________________]     |
|    Confirmar:  [________________]     |
|                                       |
|    [       Salvar Senha         ]     |
|                                       |
+---------------------------------------+
```

Ao salvar:
1. Atualiza senha no Supabase Auth (external)
2. Atualiza profile com `needs_password_reset = false`
3. Redireciona para dashboard

**Nota:** A senha do Bold Reports nao sera atualizada automaticamente pois a API nao suporta alteracao de senha por administradores. O usuario devera acessar o Bold Reports diretamente se precisar alterar a senha la.

---

## 5. Configuracao da Edge Function

Adicionar ao `supabase/config.toml`:

```toml
[functions.user-management]
verify_jwt = false
```

---

## 6. Atualizacao de Tipos

Atualizar `src/integrations/supabase/external-types.ts`:

```typescript
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  needs_password_reset?: boolean | null; // NOVO
}
```

---

## Ordem de Implementacao

1. Atualizar tipos (`external-types.ts`)
2. Criar edge function `user-management`
3. Atualizar `config.toml`
4. Criar componentes de dialogo (`AddUserDialog`, `EditUserDialog`, `DeleteUserDialog`, `PermissionsDialog`)
5. Criar `UserActionsToolbar`
6. Atualizar `UserManagement.tsx`
7. Criar pagina `PasswordReset.tsx`
8. Atualizar `AuthContext.tsx` e `Login.tsx` para fluxo de primeiro login
9. Adicionar rota `/trocar-senha` no `App.tsx`

---

## Seguranca

1. **Validacao de admin:** Apenas usuarios com `isAdmin = true` podem acessar estas funcoes
2. **Service Role Key:** A edge function usa a service role key do Supabase externo para criar usuarios
3. **Secrets necessarios:** `EXTERNAL_SUPABASE_URL`, `EXTERNAL_SUPABASE_KEY` (ja existem), mais `EXTERNAL_SUPABASE_SERVICE_KEY` (nova, necessaria para Admin API)
4. **Senha temporaria:** Validar requisitos minimos de seguranca
5. **Rate limiting:** Limitar operacoes de criacao

---

## Secret Adicional Necessario

Para criar usuarios no Supabase externo via Admin API, sera necessaria a **Service Role Key** do projeto externo:

**EXTERNAL_SUPABASE_SERVICE_KEY** - Chave de servico do Supabase externo (fyzipdzbslanwzbjgrrn.supabase.co)

Esta chave permite criar usuarios sem exigir confirmacao de email.
