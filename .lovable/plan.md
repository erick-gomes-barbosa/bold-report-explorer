
# Plano: Corrigir Busca de Grupos do Usuário no Bold Reports

## Problema Identificado

Os logs mostram:
```text
[BoldAuth] Getting groups for user: 16958
[BoldAuth] User groups: []
```

O userId 16958 está correto, a requisição de grupos funciona (não há erro), mas retorna um array vazio. Similar ao problema anterior com `UserList`, a API do Bold Reports provavelmente retorna os grupos em uma propriedade diferente de `Groups`.

## Solução

Adicionar logging detalhado na função `getUserGroups` para capturar a estrutura exata da resposta e ajustar o parsing para considerar múltiplos formatos possíveis.

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/bold-auth/index.ts` | Melhorar função `getUserGroups` com logging e parsing flexível |

## Alterações Específicas

### Função `getUserGroups` (linhas 160-183)

**Antes:**
```javascript
async function getUserGroups(systemToken: string, userId: number): Promise<string[]> {
  const groupsUrl = `${BASE_URL}/v1.0/users/${userId}/groups`;
  console.log('[BoldAuth] Getting groups for user:', userId);
  
  const response = await fetch(groupsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${systemToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.warn('[BoldAuth] Could not fetch user groups');
    return [];
  }
  
  const data: GroupsResponse = await response.json();
  const groupNames = data.Groups?.map(g => g.Name) || [];
  console.log('[BoldAuth] User groups:', groupNames);
  
  return groupNames;
}
```

**Depois:**
```javascript
async function getUserGroups(systemToken: string, userId: number): Promise<string[]> {
  const groupsUrl = `${BASE_URL}/v1.0/users/${userId}/groups`;
  console.log('[BoldAuth] Getting groups for user:', userId);
  console.log('[BoldAuth] Groups URL:', groupsUrl);
  
  const response = await fetch(groupsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${systemToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.warn('[BoldAuth] Could not fetch user groups:', response.status, errorText.substring(0, 200));
    return [];
  }
  
  const data = await response.json();
  console.log('[BoldAuth] Groups response type:', typeof data);
  console.log('[BoldAuth] Groups response keys:', Object.keys(data || {}));
  console.log('[BoldAuth] Groups raw response:', JSON.stringify(data).substring(0, 500));
  
  // Handle different response formats from Bold Reports API
  let groups: Array<{ Id?: string; Name?: string; GroupName?: string }> = [];
  
  if (Array.isArray(data)) {
    groups = data;
  } else if (data && typeof data === 'object') {
    // Try common response wrapper properties
    groups = data.GroupList || data.Groups || data.value || data.items || data.Result || [];
  }
  
  // Extract group names, handling different property names
  const groupNames = groups.map(g => g.Name || g.GroupName || '').filter(Boolean);
  console.log('[BoldAuth] User groups:', groupNames);
  
  return groupNames;
}
```

## Mudanças Principais

1. **Logging da URL**: Adiciona log da URL de grupos para debug
2. **Logging detalhado da resposta**: Mostra tipo, chaves e conteúdo raw
3. **Parsing flexível**: Verifica múltiplas propriedades possíveis (`GroupList`, `Groups`, `value`, etc.)
4. **Múltiplos nomes de campo**: Considera tanto `Name` quanto `GroupName`

## Resultado Esperado

Após a correção, os logs mostrarão a estrutura exata da resposta da API, permitindo identificar onde os grupos estão sendo retornados. Se estiverem em `GroupList` (como os usuários em `UserList`), o novo código irá parseá-los corretamente.

## Implantação

1. Atualizar a edge function `bold-auth`
2. Re-deploy automático
3. Testar login novamente para verificar os logs
