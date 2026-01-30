
## Plano de Correção - Erro 401 Bold Reports (Fase 3 - Concluída)

### Contexto

Aplicadas as correções do guia de integração oficial do Bold Reports.

---

### Correções Aplicadas

#### Correção 1: Formato de URL com Subdomínio (Edge Function)

**Arquivo:** `supabase/functions/bold-reports/index.ts`

**Antes:**
```typescript
reportServerUrl: `https://cloud.boldreports.com/reporting/api/`
```

**Depois:**
```typescript
reportServerUrl: `https://${BOLD_SITE_ID}.boldreports.com/reporting/api`
```

---

#### Correção 2: Formato de URL com Subdomínio (ReportViewer)

**Arquivo:** `src/components/ReportViewer.tsx`

**Antes:**
```typescript
const getBoldReportsServerUrl = (_siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/`;
```

**Depois:**
```typescript
const getBoldReportsServerUrl = (siteId: string) => 
  `https://${siteId}.boldreports.com/reporting/api`;
```

---

#### Correção 3: Inicialização do Array headers no ajaxBeforeLoad

**Arquivo:** `src/components/ReportViewer.tsx`

**Antes:**
```typescript
if (args.headers && Array.isArray(args.headers)) {
  // código...
}
```

**Depois:**
```typescript
// Inicializar args.headers como array vazio se não existir
if (!args.headers) {
  args.headers = [];
}
// Remover duplicatas e adicionar o token
args.headers = args.headers.filter((h) => h.Key !== 'Authorization');
args.headers.push({ Key: 'Authorization', Value: bearerToken });
```

---

### Configuração CORS (Bold Reports Cloud)

O usuário já configurou as seguintes origens no painel Bold Reports Cloud:

- `https://83156da2-5022-467d-8e0d-62137e129699.lovableproject.com`
- `https://id-preview--83156da2-5022-467d-8e0d-62137e129699.lovable.app`

---

### Verificação

Após o deploy da Edge Function, o usuário deve:

1. **Recarregar a página** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Testar visualização de um relatório**
3. **Verificar no console** se o `reportServerUrl` agora é `https://b2044034.boldreports.com/reporting/api`

---

### Fluxo Esperado

1. Edge Function retorna: `reportServerUrl: "https://b2044034.boldreports.com/reporting/api"`
2. Viewer usa esta URL para as requisições internas
3. O token é injetado via `args.headers.push()` em todas as requisições AJAX
