
## Plano de Correção - Erro 401 Bold Reports (Fase 2)

### Contexto

O erro 401 persiste porque a correção da URL do reportServerUrl não foi aplicada corretamente. A Edge Function ainda está retornando a URL completa com `/site/{siteId}`, mas o documento PDF analisado especifica que o componente Viewer requer apenas a URL base da API.

---

### Correção 1: Ajustar reportServerUrl na Edge Function

**Arquivo:** `supabase/functions/bold-reports/index.ts`

**Problema:** A action `get-viewer-config` retorna a URL completa com `/site/{siteId}`, mas o Viewer espera a URL base e anexa os endpoints dinamicamente.

**De (linhas 256-265):**
```typescript
case 'get-viewer-config':
  return new Response(
    JSON.stringify({ 
      success: true, 
      siteId: BOLD_SITE_ID,
      token: accessToken,
      reportServerUrl: `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
```

**Para:**
```typescript
case 'get-viewer-config':
  // FASE 1 CORRIGIDA: URL base SEM /site/{siteId}
  // O componente Viewer anexa dinamicamente os endpoints necessarios
  return new Response(
    JSON.stringify({ 
      success: true, 
      siteId: BOLD_SITE_ID,
      token: accessToken,
      reportServerUrl: `https://cloud.boldreports.com/reporting/api/`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
```

---

### Correção 2: Priorizar função local no ReportViewer (Fallback robusto)

**Arquivo:** `src/components/ReportViewer.tsx`

**Problema:** O componente usa `reportServerUrl` da prop (que vem da API) mesmo quando a função local `getBoldReportsServerUrl` já está corrigida.

**De (linha 73):**
```typescript
const effectiveServerUrl = reportServerUrl || getBoldReportsServerUrl(siteId);
```

**Para:**
```typescript
// FASE 1: Sempre usar URL base SEM /site/{siteId}
// Ignorar prop reportServerUrl se ela contiver /site/ (formato antigo)
const effectiveServerUrl = getBoldReportsServerUrl(siteId);
```

Isso garante que mesmo se a Edge Function retornar a URL antiga (cache), o componente usará o formato correto.

---

### Após aplicar as correções

O usuário deve:

1. **Recarregar a página** (Ctrl+Shift+R / Cmd+Shift+R) para limpar cache
2. **Testar novamente** a visualização de um relatório
3. **Verificar no console** se o `reportServerUrl` agora é `https://cloud.boldreports.com/reporting/api/` (sem `/site/b2044034`)

---

### Seção Técnica

**Por que a URL base?**

O documento PDF analisa que o componente Bold Reports Viewer:
- Recebe a URL base da API como `reportServerUrl`
- Anexa dinamicamente endpoints como `/site/{siteId}/v5.0/...` durante as requisições internas
- Se a URL já contiver `/site/{siteId}`, pode haver duplicação ou rotas inválidas

**Fluxo esperado após correção:**
1. Edge Function retorna: `reportServerUrl: "https://cloud.boldreports.com/reporting/api/"`
2. Viewer anexa internamente: `/site/b2044034/v5.0/viewer/PostReportAction`
3. Requisição final: `https://cloud.boldreports.com/reporting/api/site/b2044034/v5.0/viewer/PostReportAction`
