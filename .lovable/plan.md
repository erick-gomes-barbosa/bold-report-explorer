
## Plano: Gerenciamento de Permissões e Grupos de Usuários

Este plano implementa um sistema completo de gerenciamento de permissões e grupos para usuários do Bold Reports, baseado na análise detalhada da API REST v1.0.

---

## Descobertas da API

### Endpoints Disponíveis

**Permissões de Usuário:**
| Operacao | Endpoint | Descricao |
|----------|----------|-----------|
| Adicionar | POST /v1.0/permissions/users | Adiciona UMA permissao por chamada |
| Listar | GET /v1.0/permissions/users/{userId} | Lista todas as permissoes do usuario |
| Remover | DELETE /v1.0/permissions/users/{permissionId} | Remove permissao pelo PermissionId |

**Grupos:**
| Operacao | Endpoint | Descricao |
|----------|----------|-----------|
| Listar grupos | GET /v1.0/groups | Lista todos os grupos disponiveis |
| Adicionar usuarios | POST /v1.0/groups/{groupId}/users | Adiciona VARIOS usuarios a UM grupo |
| Remover usuarios | DELETE /v1.0/groups/{groupId}/users | Remove VARIOS usuarios de UM grupo |
| Grupos do usuario | GET /v1.0/users/{user}/groups | Lista grupos de um usuario |

### Limitacoes Identificadas

1. **Permissoes sao adicionadas uma por vez** - nao ha endpoint de batch
2. **Nao ha endpoint de atualizacao de permissao** - precisa deletar e recriar
3. **Adicionar usuario a multiplos grupos** - requer uma chamada por grupo
4. **Remover usuario de multiplos grupos** - requer uma chamada por grupo

---

## Arquitetura da Solucao

### Novos Componentes a Criar

```text
src/components/users/
+-- PermissionsDialog.tsx        (MODIFICAR - adicionar botoes e abas)
+-- GrantPermissionsDialog.tsx   (NOVO - modal para conceder permissoes)
+-- EditPermissionsDialog.tsx    (NOVO - modal para editar/remover permissoes)
+-- ManageGroupsDialog.tsx       (NOVO - modal para gerenciar grupos)
```

### Edge Function a Estender

```text
supabase/functions/user-management/index.ts
+-- Novas acoes:
    +-- getGroups           (listar todos os grupos)
    +-- addPermission       (adicionar permissao)
    +-- deletePermission    (remover permissao)
    +-- addUserToGroups     (adicionar usuario a grupos)
    +-- removeUserFromGroups (remover usuario de grupos)
```

---

## Parte 1: Modificacao do PermissionsDialog

Transformar o dialog atual em um hub de gerenciamento com duas secoes:

### Secao de Permissoes
- Exibir lista de permissoes atuais (ja implementado)
- Adicionar dois botoes:
  - **"Conceder Permissoes"** - abre GrantPermissionsDialog
  - **"Editar Permissoes"** - abre EditPermissionsDialog

### Secao de Grupos
- Exibir lista de grupos do usuario (ja implementado)
- Adicionar dois botoes:
  - **"Adicionar a Grupos"** - abre ManageGroupsDialog (modo adicao)
  - **"Gerenciar Grupos"** - abre ManageGroupsDialog (modo edicao)

---

## Parte 2: GrantPermissionsDialog (Conceder Permissoes)

Modal para adicionar novas permissoes ao usuario.

### Interface do Usuario

```text
+--------------------------------------------------+
|  Conceder Permissoes para [Nome do Usuario]      |
+--------------------------------------------------+
|                                                  |
|  Categoria: Relatorios                           |
|  +----------------------------------------------+|
|  | [ ] Todos os Relatorios                      ||
|  |     Acesso: [Visualizar v]                   ||
|  | [ ] Relatorios por Categoria                 ||
|  |     Categoria: [Selecionar v]                ||
|  |     Acesso: [Visualizar v]                   ||
|  | [ ] Relatorio Especifico                     ||
|  |     Relatorio: [Selecionar v]                ||
|  |     Acesso: [Visualizar v]                   ||
|  +----------------------------------------------+|
|                                                  |
|  Categoria: Fontes de Dados                      |
|  +----------------------------------------------+|
|  | [ ] Todas as Fontes                          ||
|  |     Acesso: [Visualizar v]                   ||
|  | [ ] Fonte Especifica                         ||
|  |     Fonte: [Selecionar v]                    ||
|  |     Acesso: [Visualizar v]                   ||
|  +----------------------------------------------+|
|                                                  |
|  (Similar para Datasets, Categorias, Schedules)  |
|                                                  |
+--------------------------------------------------+
|                      [Cancelar]  [Salvar]        |
+--------------------------------------------------+
```

### Tipos de Permissao (PermissionEntity)
- AllReports, ReportsInCategory, SpecificReports
- AllCategories, SpecificCategory
- AllDataSources, SpecificDataSource
- AllDatasets, SpecificDataset
- AllSchedules, SpecificSchedule

### Niveis de Acesso (PermissionAccess)
- Create (Criar)
- Read (Visualizar)
- ReadWrite (Ler/Escrever)
- ReadWriteDelete (Acesso Total)
- Download (Download)

### Comportamento
- Quando o usuario seleciona uma categoria, o select correspondente eh habilitado
- Se nenhuma opcao for selecionada em uma categoria, o usuario nao tera permissao nela
- Ao salvar, faz chamadas sequenciais para adicionar cada permissao selecionada

---

## Parte 3: EditPermissionsDialog (Editar Permissoes)

Modal para editar ou remover permissoes existentes.

### Interface do Usuario

```text
+--------------------------------------------------+
|  Editar Permissoes de [Nome do Usuario]          |
+--------------------------------------------------+
|                                                  |
|  Relatorios                                      |
|  +----------------------------------------------+|
|  | [x] Todos os Relatorios - Visualizar    [X]  ||
|  | [x] Categoria X - Ler/Escrever          [X]  ||
|  +----------------------------------------------+|
|                                                  |
|  Fontes de Dados                                 |
|  +----------------------------------------------+|
|  | [x] Fonte ABC - Acesso Total            [X]  ||
|  +----------------------------------------------+|
|                                                  |
|  Selecione as permissoes para alterar ou         |
|  clique no X para remover                        |
|                                                  |
+--------------------------------------------------+
|  [Alterar Selecionadas v]   [Cancelar] [Salvar]  |
+--------------------------------------------------+
```

### Comportamento
- Lista as permissoes atuais agrupadas por categoria
- Cada permissao tem um checkbox e um botao X para remocao
- Dropdown "Alterar Selecionadas" permite mudar o nivel de acesso
- Para alterar: deleta a permissao antiga e cria uma nova com o novo nivel

---

## Parte 4: ManageGroupsDialog (Gerenciar Grupos)

Modal unificado para adicionar e remover usuario de grupos.

### Modo Adicao

```text
+--------------------------------------------------+
|  Adicionar [Nome] a Grupos                       |
+--------------------------------------------------+
|                                                  |
|  Grupos Disponiveis:                             |
|  +----------------------------------------------+|
|  | [x] Visualizadores                           ||
|  | [ ] Editores                                 ||
|  | [ ] Financeiro                               ||
|  | [ ] RH                                       ||
|  +----------------------------------------------+|
|                                                  |
|  (Grupos que o usuario ja pertence estao         |
|   desabilitados e marcados com "(membro)")       |
|                                                  |
+--------------------------------------------------+
|                      [Cancelar]  [Adicionar]     |
+--------------------------------------------------+
```

### Modo Edicao

```text
+--------------------------------------------------+
|  Gerenciar Grupos de [Nome]                      |
+--------------------------------------------------+
|                                                  |
|  Grupos Atuais:                                  |
|  +----------------------------------------------+|
|  | [x] Visualizadores                      [X]  ||
|  | [x] Financeiro                          [X]  ||
|  +----------------------------------------------+|
|                                                  |
|  Clique no X para remover o usuario do grupo     |
|                                                  |
+--------------------------------------------------+
|                      [Cancelar]  [Salvar]        |
+--------------------------------------------------+
```

---

## Parte 5: Extensao da Edge Function

### Novas Acoes a Implementar

**1. getGroups** - Listar todos os grupos disponiveis
```typescript
GET /v1.0/groups
Retorna: { groups: [{ Id, Name, Description }] }
```

**2. addPermission** - Adicionar uma permissao ao usuario
```typescript
POST /v1.0/permissions/users
Body: { PermissionAccess, UserId, PermissionEntity, ItemId? }
```

**3. deletePermission** - Remover uma permissao
```typescript
DELETE /v1.0/permissions/users/{permissionId}
```

**4. addUserToGroups** - Adicionar usuario a multiplos grupos
```typescript
// Loop interno para cada grupo
POST /v1.0/groups/{groupId}/users
Body: { Id: [userId] }
```

**5. removeUserFromGroups** - Remover usuario de multiplos grupos
```typescript
// Loop interno para cada grupo
DELETE /v1.0/groups/{groupId}/users
Body: { Id: [userId] }
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| src/components/users/PermissionsDialog.tsx | Modificar | Adicionar botoes de acao e secoes |
| src/components/users/GrantPermissionsDialog.tsx | Criar | Modal para conceder permissoes |
| src/components/users/EditPermissionsDialog.tsx | Criar | Modal para editar/remover permissoes |
| src/components/users/ManageGroupsDialog.tsx | Criar | Modal para gerenciar grupos |
| supabase/functions/user-management/index.ts | Modificar | Adicionar novas acoes |

---

## Detalhes Tecnicos

### Estrategia para Permissoes em Lote

Como a API nao suporta adicao em batch, a Edge Function fara:

```typescript
async function addMultiplePermissions(token, userId, permissions) {
  const results = [];
  for (const perm of permissions) {
    const result = await addPermission(token, {
      UserId: userId,
      PermissionEntity: perm.entity,
      PermissionAccess: perm.access,
      ItemId: perm.itemId // opcional
    });
    results.push(result);
  }
  return results;
}
```

### Estrategia para Grupos Multiplos

```typescript
async function addUserToMultipleGroups(token, userId, groupIds) {
  const results = [];
  for (const groupId of groupIds) {
    const result = await fetch(`/v1.0/groups/${groupId}/users`, {
      method: 'POST',
      body: JSON.stringify({ Id: [userId] })
    });
    results.push(result);
  }
  return results;
}
```

### Estrategia para "Atualizar" Permissao

Como nao ha endpoint de update:

```typescript
async function updatePermission(token, permissionId, newAccess, userId, entity, itemId) {
  // 1. Deletar permissao existente
  await deletePermission(token, permissionId);
  
  // 2. Criar nova permissao com novo nivel
  await addPermission(token, {
    UserId: userId,
    PermissionEntity: entity,
    PermissionAccess: newAccess,
    ItemId: itemId
  });
}
```

---

## Consideracoes de UX

1. **Loading states**: Mostrar indicador durante operacoes em lote
2. **Feedback de erros**: Se uma operacao falhar em batch, mostrar quais falharam
3. **Confirmacao**: Pedir confirmacao antes de remover permissoes ou grupos
4. **Validacao**: Impedir adicao de permissoes duplicadas (API retorna 409)
5. **Refresh**: Atualizar dados apos cada operacao bem-sucedida

---

## Sequencia de Implementacao

1. Estender a Edge Function com novas acoes
2. Criar ManageGroupsDialog (mais simples)
3. Criar GrantPermissionsDialog
4. Criar EditPermissionsDialog
5. Modificar PermissionsDialog para integrar tudo
6. Testar fluxos completos

