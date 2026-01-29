

## Plano de Correcao: Problema 401 com Logs de Diagnostico Granular

### Resumo do Problema

O Bold Reports Viewer esta retornando erro 401 (Unauthorized) ao tentar carregar relatorios. A analise revelou que ha uma **incompatibilidade entre a URL do servidor e o token JWT**:

| Elemento | Valor |
|----------|-------|
| Token `iss` (issuer) | `https://cloud.boldreports.com/reporting/site/b2044034` |
| Token `aud` (audience) | `https://cloud.boldreports.com/reporting/site/b2044034` |
| URL atual sendo usada | `https://b2044034.boldreports.com/reporting/api/` |

O token foi emitido para `cloud.boldreports.com/reporting/site/{siteId}`, mas as requisicoes estao indo para `{siteId}.boldreports.com` - dominios completamente diferentes.

---

### Solucao

#### Fase 1: Corrigir a URL do Servidor

Alterar `getBoldReportsServerUrl` para usar o formato que corresponde ao issuer/audience do token:

```typescript
// ANTES (formato subdominio - INCORRETO para este token)
const getBoldReportsServerUrl = (siteId: string) => 
  `https://${siteId}.boldreports.com/reporting/api/`;

// DEPOIS (formato Cloud padrao - corresponde ao token)
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;
```

#### Fase 2: Adicionar Logs de Diagnostico Granular

Adicionar logs detalhados em cada etapa do processo para facilitar depuracao futura:

**Arquivo: `src/components/ReportViewer.tsx`**

```typescript
// Logs no momento da inicializacao
console.group('[BoldReports] Inicializando Viewer');
console.log('[BoldReports] Report:', {
  id: report.Id,
  name: report.Name,
  category: report.CategoryName
});
console.log('[BoldReports] SiteId:', siteId);
console.log('[BoldReports] Token (primeiros 50 chars):', token.substring(0, 50) + '...');
console.log('[BoldReports] Report Service URL:', BOLD_REPORTS_SERVICE_URL);
console.log('[BoldReports] Report Server URL:', getBoldReportsServerUrl(siteId));
console.log('[BoldReports] Report Path:', reportPath);
console.log('[BoldReports] Service Auth Token:', `bearer ${token.substring(0, 20)}...`);
console.log('[BoldReports] Parameters:', convertParameters());
console.groupEnd();
```

**Arquivo: `src/hooks/useReportViewer.ts`**

```typescript
// Logs na busca da configuracao
console.group('[BoldReports] Buscando configuracao do viewer');
console.log('[BoldReports] Chamando edge function: get-viewer-config');
// ... apos resposta
console.log('[BoldReports] Resposta recebida:', {
  success: data?.success,
  siteId: data?.siteId,
  tokenLength: data?.token?.length,
  tokenPreview: data?.token?.substring(0, 50) + '...'
});
console.groupEnd();
```

**Arquivo: `supabase/functions/bold-reports/index.ts`**

```typescript
// Logs detalhados de autenticacao
console.log('[BoldReports Edge] Gerando/validando token...');
console.log('[BoldReports Edge] Token source:', BOLD_TOKEN ? 'BOLD_TOKEN' : 'password_grant');
console.log('[BoldReports Edge] Token expiry (cached):', cachedToken?.expiresAt);
```

#### Fase 3: Adicionar Callback de Evento AJAX

Usar o callback `ajaxBeforeLoad` para logar TODAS as requisicoes HTTP do viewer:

```typescript
ajaxBeforeLoad={(args: AjaxBeforeLoadEventArgs) => {
  console.group('[BoldReports AJAX] Requisicao');
  console.log('[BoldReports AJAX] URL:', args.url);
  console.log('[BoldReports AJAX] Method:', args.method || 'GET');
  console.log('[BoldReports AJAX] Headers:', args.headers);
  console.log('[BoldReports AJAX] Data:', args.data);
  console.groupEnd();
}}
```

---

### Arquivos a Modificar

1. **`src/components/ReportViewer.tsx`**
   - Corrigir `getBoldReportsServerUrl` para formato Cloud
   - Adicionar logs de inicializacao
   - Adicionar callback `ajaxBeforeLoad` para interceptar requisicoes
   - Melhorar logs nos handlers `handleReportLoaded` e `handleReportError`

2. **`src/hooks/useReportViewer.ts`**
   - Adicionar logs na funcao `fetchViewerConfig`

3. **`supabase/functions/bold-reports/index.ts`**
   - Adicionar logs mais detalhados no processo de autenticacao

4. **`src/types/boldReportsViewer.d.ts`**
   - Adicionar tipo `AjaxBeforeLoadEventArgs` para o callback

---

### Detalhes Tecnicos

**Estrutura dos Logs**

Todos os logs seguirao o padrao:
- `[BoldReports]` - Logs do componente React
- `[BoldReports AJAX]` - Logs de requisicoes HTTP do viewer
- `[BoldReports Edge]` - Logs da edge function

Uso de `console.group()` e `console.groupEnd()` para agrupar logs relacionados.

**Callback ajaxBeforeLoad**

Interface esperada:
```typescript
interface AjaxBeforeLoadEventArgs {
  url: string;
  method?: string;
  headers: Record<string, string>;
  data?: unknown;
  cancel?: boolean;
}
```

Este callback permite:
1. Ver a URL exata sendo chamada
2. Verificar se os headers de autenticacao estao corretos
3. Potencialmente modificar a requisicao antes do envio

---

### Verificacao Pos-Implementacao

1. Abrir o console do navegador (F12)
2. Abrir um relatorio no visualizador
3. Verificar os logs agrupados:
   - `[BoldReports] Inicializando Viewer` - configuracao inicial
   - `[BoldReports AJAX] Requisicao` - cada requisicao HTTP
   - Verificar se URLs correspondem ao formato esperado
4. Se ainda houver erro 401, os logs mostrarao exatamente qual URL e headers estao sendo usados

---

### Riscos e Mitigacoes

| Risco | Probabilidade | Mitigacao |
|-------|--------------|-----------|
| Logs excessivos em producao | Media | Usar variavel de ambiente para controlar nivel de log |
| URL Cloud nao funcionar | Baixa | O token indica que Cloud e o formato correto |
| Exposicao de token no console | Media | Mostrar apenas preview do token (primeiros 20-50 chars) |

