
# Plano: Corrigir Parsing da Resposta de Usuarios do Bold Reports

## Problema Identificado

Os logs da edge function mostram claramente o problema:

```text
[BoldAuth] Users response keys: [ "UserList" ]
[BoldAuth] Found 0 users total
[BoldAuth] User not found in Bold Reports
```

A API do Bold Reports retorna os usuarios na propriedade `UserList`, mas o codigo atual na linha 127 so verifica:
- `data.value`
- `data.Users`
- `data.items`
- `data.Result`

**Nao inclui `data.UserList`**, resultando em um array vazio e fazendo o sistema acreditar que o usuario nao existe.

## Solucao

Adicionar `data.UserList` na lista de propriedades verificadas.

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/bold-auth/index.ts` | Adicionar `UserList` no parsing da resposta (linha 127) |

## Alteracao Especifica

**Antes (linha 127):**
```javascript
users = data.value || data.Users || data.items || data.Result || [];
```

**Depois:**
```javascript
users = data.UserList || data.value || data.Users || data.items || data.Result || [];
```

## Resultado Esperado

Apos a correcao:

```text
[BoldAuth] Users response keys: [ "UserList" ]
[BoldAuth] Found 2 users total           // Agora encontra os usuarios
[BoldAuth] Found user: { id: X, email: erick.barbosa@baymetrics.com.br }
[BoldAuth] User groups: ["System Administrator"]
[BoldAuth] Authentication successful: { userId: X, isAdmin: true }
```

O usuario sera reconhecido como:
- `synced: true`
- `isAdmin: true`
- `userId: <id numerico>`
- `groups: ["System Administrator"]`

## Implantacao

1. Atualizar a edge function `bold-auth`
2. Re-deploy automatico
3. Testar login novamente
