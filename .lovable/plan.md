
## Plano: Correção da Visibilidade de Relatórios por Permissões

### Problema Identificado

O hook `useReportPermissions` envia a ação `action: 'getPermissions'` via POST para a Edge Function, porém não existe um handler para essa ação no código. Quando nenhuma ação corresponde, a função retorna `{ success: false, error: 'Ação inválida' }`, fazendo com que o hook interprete que o usuário não tem permissões e exiba a mensagem de "Acesso Restrito".

### Evidência nos Logs

Os logs da Edge Function confirmam que a API do Bold Reports retorna corretamente as permissões:
```json
[{"PermissionAccess":"Read","PermissionEntity":"SpecificReports","UserId":17952,"ItemName":"Inventario","ItemId":"0d93ea95-4d38-4b5e-b8c2-35c784564ff0"}]
```

Mas essas chamadas são de outros fluxos (como o PermissionsDialog). O hook `useReportPermissions` não consegue buscar porque a ação não está implementada.

### Solução

Adicionar o handler para `action: 'getPermissions'` na Edge Function, seguindo o mesmo padrão já utilizado para `getGroups`.

---

## Alteração na Edge Function

**Arquivo**: `supabase/functions/user-management/index.ts`

Adicionar após o handler de `getItems` (linha ~670) e antes do handler de `addPermission`:

```typescript
// GET PERMISSIONS (via POST for consistency)
if (payload.action === 'getPermissions') {
  const { userId } = payload as { action: 'getPermissions'; userId: number };
  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'userId é obrigatório' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const result = await getBoldUserPermissions(token, userId);
  return new Response(
    JSON.stringify(result),
    { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Atualização do Tipo RequestPayload

Adicionar o tipo para a nova ação:

```typescript
interface GetPermissionsPayload {
  action: 'getPermissions';
  userId: number;
}
```

E incluir na união `RequestPayload`.

---

## Resumo das Alterações

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| supabase/functions/user-management/index.ts | Modificar | Adicionar handler para ação `getPermissions` via POST |

---

## Fluxo Corrigido

```text
1. Usuário faz login
2. AuthContext sincroniza com Bold Reports (obtem userId)
3. Hook useReportPermissions chama Edge Function com action: 'getPermissions'
4. Edge Function busca permissões do usuário na API Bold Reports
5. Retorna lista de permissões incluindo SpecificReports com ItemId
6. Hook filtra quais relatórios o usuário pode acessar
7. ReportsDashboard exibe apenas as abas permitidas
```

---

## Validação

Após a implementação, o usuário com permissão apenas para o relatório "Inventário" deverá ver:
- Apenas a aba "Inventário" na dashboard
- Sem mensagem de "Acesso Restrito"
- Capacidade de filtrar e exportar dados do relatório
