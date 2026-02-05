
# Plano: Pagina de Gerencia de Usuarios para Administradores Bold Reports

## Resumo

Transformar o botao de configuracoes sem funcao em um botao de acesso a uma nova pagina de gerenciamento de usuarios, visivel apenas para administradores Bold Reports. A pagina exibira uma tabela com os usuarios e suas permissoes.

## Arquitetura da Solucao

```text
+------------------+       +--------------------+       +--------------------+
|  ReportsHeader   | ----> | /usuarios          | <---- | bold-users         |
|  (Botao Admin)   |       | (Nova Pagina)      |       | (Nova Edge Func)   |
+------------------+       +--------------------+       +--------------------+
        |                          |                           |
        v                          v                           v
   Visivel apenas           Tabela com                   Busca usuarios
   se isAdmin=true          usuarios e grupos            do Bold Reports
```

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/UserManagement.tsx` | Pagina principal de gerencia de usuarios |
| `supabase/functions/bold-users/index.ts` | Edge function para listar usuarios do Bold Reports |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/reports/ReportsHeader.tsx` | Transformar botao em link condicional para admins |
| `src/App.tsx` | Adicionar nova rota protegida `/usuarios` |

## Detalhamento das Alteracoes

### 1. ReportsHeader.tsx - Botao de Gerencia de Usuarios

**Antes (linhas 57-60):**
```jsx
<div className="flex items-center gap-2">
  <Button variant="ghost" size="icon" className="...">
    <Settings className="h-5 w-5" />
  </Button>
```

**Depois:**
```jsx
<div className="flex items-center gap-2">
  {boldReportsInfo.isAdmin && (
    <Button 
      variant="ghost" 
      size="icon" 
      className="text-primary-foreground hover:bg-primary-foreground/10"
      onClick={() => navigate('/usuarios')}
      title="Gerenciar Usuários"
    >
      <Users className="h-5 w-5" />
    </Button>
  )}
```

- Icone alterado de `Settings` para `Users` (lucide-react)
- Botao visivel apenas quando `boldReportsInfo.isAdmin === true`
- Adiciona navegacao para `/usuarios`
- Tooltip explicativo

### 2. App.tsx - Nova Rota Protegida

Adicionar rota para a pagina de gerencia dentro do grupo de rotas protegidas:

```jsx
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<Reports />} />
  <Route path="/bold-reports" element={<Index />} />
  <Route path="/usuarios" element={<UserManagement />} />
</Route>
```

### 3. UserManagement.tsx - Nova Pagina

Estrutura da pagina:

```text
+----------------------------------------------------+
|  ReportsHeader (title="Gerencia de Usuarios")      |
+----------------------------------------------------+
|                                                    |
|  +----------------------------------------------+  |
|  |  Card: Tabela de Usuarios                    |  |
|  |  +------------------------------------------+|  |
|  |  | Avatar | Nome | Email | Grupos | Status  ||  |
|  |  +------------------------------------------+|  |
|  |  | ...    | ...  | ...   | ...    | ...     ||  |
|  |  +------------------------------------------+|  |
|  +----------------------------------------------+  |
|                                                    |
+----------------------------------------------------+
```

**Funcionalidades:**
- Listagem de todos os usuarios do Bold Reports
- Exibicao de: Avatar, Nome Completo, Email, Grupos, Status (Ativo/Inativo)
- Badge visual para indicar administradores
- Loading skeleton durante carregamento
- Estado de erro com mensagem

### 4. Edge Function bold-users

Nova edge function para listar usuarios do Bold Reports:

**Endpoint:** `POST /bold-users`

**Resposta:**
```json
{
  "success": true,
  "users": [
    {
      "id": 16958,
      "email": "user@example.com",
      "displayName": "Usuario Exemplo",
      "firstName": "Usuario",
      "lastName": "Exemplo",
      "isActive": true,
      "groups": ["System Administrator"]
    }
  ]
}
```

A funcao reutiliza a logica de autenticacao existente em `bold-auth`:
- Obtem token do sistema via Embed Secret
- Lista todos os usuarios
- Para cada usuario, busca seus grupos
- Retorna lista completa com grupos

## Interface Visual da Tabela

| Coluna | Descricao | Formatacao |
|--------|-----------|------------|
| Usuario | Avatar + Nome | Avatar com iniciais, nome em negrito |
| Email | Endereco de email | Texto simples |
| Grupos | Lista de grupos | Badges separados |
| Status | Ativo/Inativo | Badge verde ou cinza |
| Admin | Indicador | Badge "Admin" se for administrador |

## Seguranca

1. **Frontend**: Botao so aparece se `boldReportsInfo.isAdmin === true`
2. **Backend**: A Edge function usa autenticacao do sistema Bold Reports
3. **Rota**: Protegida pelo `ProtectedRoute` (requer login)

A verificacao de admin eh feita no frontend baseada no retorno da API Bold Reports.
Se um usuario nao-admin tentar acessar `/usuarios` diretamente, a pagina ainda
carregara, mas ele nao tera chegado la pelo botao (que estara invisivel).
Uma verificacao adicional pode ser adicionada na pagina para redirecionar nao-admins.

## Proximos Passos (Fora deste Escopo)

- Edicao de permissoes de usuarios
- Adicao/remocao de usuarios de grupos
- Sincronizacao bidirecional com Bold Reports
