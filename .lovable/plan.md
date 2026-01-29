

## Plano de Correção: Resolver Erro 401 no Bold Reports Viewer

### Diagnóstico Confirmado

Após análise da documentação oficial do Bold Reports e da URL fornecida pelo usuário, identifiquei a causa raiz do erro 401:

**URL de acesso do usuário:**
```
https://cloud.boldreports.com/reporting/site/b2044034/report-designer/...
```

**Configuração atual no código:**
```typescript
reportServerUrl = 'https://cloud.boldreports.com/reporting/api/site/b2044034'
```

**Problema:** A documentação oficial indica dois formatos distintos:

| Tipo de Servidor | Formato de `reportServerUrl` |
|------------------|------------------------------|
| Enterprise (on-premise) | `https://<<host>>/reporting/api/site/<<site_name>>` |
| Cloud (tenant) | `https://<<tenant>>.boldreports.com/reporting/api/` |

O formato atual mistura elementos dos dois: usa `cloud.boldreports.com` (centralizado) mas adiciona `/site/{siteId}` como se fosse Enterprise.

---

### Solução Proposta

Como sua conta usa o formato centralizado do cloud (`cloud.boldreports.com`), precisamos testar dois formatos alternativos de URL:

**Opção 1 - Remover o `/site/{siteId}` do path:**
```typescript
reportServerUrl = 'https://cloud.boldreports.com/reporting/api/'
```

**Opção 2 - Usar o formato do token JWT:**
O token gerado pela API tem o issuer/audience como:
```
https://cloud.boldreports.com/reporting/site/{siteId}
```
Então o `reportServerUrl` deveria seguir este padrão, mas trocando para `/api/`:
```typescript
reportServerUrl = 'https://cloud.boldreports.com/reporting/api/site/b2044034'
```

---

### Mudanças a Implementar

#### 1. Arquivo: `src/components/ReportViewer.tsx`

**1.1 Atualizar função `getBoldReportsServerUrl`:**

Implementar suporte para múltiplos formatos de URL com fallback e logging detalhado:

```typescript
// ANTES
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;

// DEPOIS - Formato Cloud centralizado (teste)
const getBoldReportsServerUrl = (siteId: string) => {
  // Formato 1: Cloud centralizado sem site no path
  // Baseado na documentação: https://<<tenant>>.boldreports.com/reporting/api/
  // Como não há tenant personalizado, usar o cloud diretamente
  const url = `https://cloud.boldreports.com/reporting/api/`;
  console.log('[BoldReports] Report Server URL:', url);
  return url;
};
```

**1.2 Melhorar a função `handleAjaxBeforeLoad`:**

Refinar a injeção de headers para garantir compatibilidade total:

```typescript
const handleAjaxBeforeLoad = useCallback((args: any) => {
  console.group('[BoldReports AJAX] Requisição Interceptada');
  console.log('[BoldReports AJAX] Args:', JSON.stringify(args, null, 2));
  
  if (token && args) {
    const bearerToken = `Bearer ${token}`;
    
    // Inicializa headers se não existir
    if (!args.headers) {
      args.headers = [];
    }
    
    // Formato array: remove duplicatas e adiciona novo header
    if (Array.isArray(args.headers)) {
      args.headers = args.headers.filter(
        (h: any) => h?.Key?.toLowerCase() !== 'authorization'
      );
      args.headers.push({ Key: 'Authorization', Value: bearerToken });
    }
    
    // Formato headerReq (se existir)
    if (args.headerReq && typeof args.headerReq === 'object') {
      args.headerReq['Authorization'] = bearerToken;
    }
    
    // Atualiza serviceAuthorizationToken
    if ('serviceAuthorizationToken' in args) {
      args.serviceAuthorizationToken = bearerToken;
    }
    
    console.log('[BoldReports AJAX] Token injetado com sucesso');
  }
  
  console.groupEnd();
}, [token]);
```

#### 2. Arquivo: `supabase/functions/bold-reports/index.ts`

**2.1 Adicionar campo `reportServerUrl` na resposta:**

Incluir a URL do servidor diretamente na resposta da edge function para maior controle:

```typescript
case 'get-viewer-config':
  return new Response(
    JSON.stringify({ 
      success: true, 
      siteId: BOLD_SITE_ID,
      token: accessToken,
      // Nova propriedade: URL do servidor pré-calculada
      reportServerUrl: `https://cloud.boldreports.com/reporting/api/`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
```

#### 3. Arquivo: `src/hooks/useReportViewer.ts`

**3.1 Atualizar interface e consumo da nova propriedade:**

```typescript
interface ViewerConfig {
  siteId: string;
  token: string;
  reportServerUrl?: string; // Nova propriedade
}

// Na função fetchViewerConfig:
if (data?.success && data?.siteId) {
  setViewerConfig({
    siteId: data.siteId,
    token: data.token || '',
    reportServerUrl: data.reportServerUrl,
  });
}
```

#### 4. Arquivo: `src/pages/Index.tsx`

**4.1 Passar `reportServerUrl` para o `ReportViewer`:**

```typescript
<ReportViewer
  report={selectedReport}
  parameterValues={viewerParams}
  siteId={viewerConfig.siteId}
  token={viewerConfig.token}
  reportServerUrl={viewerConfig.reportServerUrl}
  isOpen={viewerOpen}
  onClose={() => setViewerOpen(false)}
/>
```

---

### Diagrama de Fluxo Atualizado

```text
┌─────────────────┐
│   Usuário       │
│   Clica em      │
│   "Visualizar"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Index.tsx      │
│  handleView()   │
│  Abre Modal     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  ReportViewer.tsx                                │
│                                                  │
│  BoldReportViewerComponent:                      │
│  - reportServiceUrl:                             │
│    https://service.boldreports.com/api/Viewer   │
│  - reportServerUrl:                              │
│    https://cloud.boldreports.com/reporting/api/ │
│  - serviceAuthorizationToken:                    │
│    bearer {token}                                │
│  - reportPath: /{Category}/{ReportName}          │
│                                                  │
│  ajaxBeforeLoad:                                 │
│  - Injeta Authorization header                   │
│  - Atualiza serviceAuthorizationToken            │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Bold Reports Cloud Service                      │
│  service.boldreports.com/api/Viewer              │
│                                                  │
│  Valida token JWT ───────────────────────────────┼─▶ 200 OK
│                                                  │
│  Se inválido: ──────────────────────────────────┼─▶ 401 Unauthorized
└─────────────────────────────────────────────────┘
```

---

### Estratégia de Teste

Após implementar as mudanças:

1. **Recarregar a aplicação**
2. **Abrir o console do navegador (F12)**
3. **Selecionar um relatório e clicar em "Visualizar"**
4. **Observar os logs:**
   - `[BoldReports] Report Server URL:` - Deve mostrar a URL corrigida
   - `[BoldReports AJAX] Args:` - Deve mostrar a estrutura do objeto args
   - `[BoldReports AJAX] Token injetado` - Confirma a injeção

5. **Se ainda houver erro 401:**
   - Verificar na aba Network qual requisição está falhando
   - Comparar a URL da requisição com o issuer do token JWT
   - Testar o formato alternativo da URL

---

### Formato Alternativo (Plano B)

Se a primeira correção não funcionar, testar o formato com site ID no path:

```typescript
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}/`;
```

O trailing slash (`/`) no final pode ser significativo para algumas APIs.

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ReportViewer.tsx` | Atualizar `getBoldReportsServerUrl` para novo formato e melhorar `handleAjaxBeforeLoad` |
| `bold-reports/index.ts` | Adicionar `reportServerUrl` na resposta de `get-viewer-config` |
| `useReportViewer.ts` | Adicionar `reportServerUrl` na interface `ViewerConfig` |
| `Index.tsx` | Passar `reportServerUrl` como prop para `ReportViewer` |

