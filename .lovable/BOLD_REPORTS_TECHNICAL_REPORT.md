# Relatório Técnico: Bold Reports Viewer Integration

## Data: 2026-01-30
## Projeto: MVP Bold Reports Viewer
## Problema: Erro 401 Unauthorized ao carregar relatórios no viewer embarcado

---

## 1. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Index.tsx                                                                   │
│    ├── useBoldReports() → list-reports, get-report-parameters, export       │
│    ├── useReportViewer() → get-viewer-config                                │
│    └── <ReportViewer /> → Bold Reports React Component                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EDGE FUNCTION (Deno/Supabase)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  supabase/functions/bold-reports/index.ts                                    │
│    ├── action: get-viewer-config → retorna siteId, token, reportServerUrl   │
│    ├── action: list-reports → GET /v1.0/items?itemType=Report               │
│    ├── action: get-report-parameters → GET /v1.0/reports/{id}/parameters    │
│    └── action: export-report → POST /v5.0/reports/export                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BOLD REPORTS CLOUD API                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Base URL: https://cloud.boldreports.com/reporting/api/site/b2044034        │
│  Service URL: https://service.boldreports.com/api/Viewer                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Secrets Configurados

| Secret | Descrição | Valor (parcial) |
|--------|-----------|-----------------|
| `BOLD_SITE_ID` | ID do site no Bold Reports Cloud | `b2044034` |
| `BOLD_TOKEN` | JWT estático de autenticação | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImVyaWNrLmJhcmJvc2FAYmF5bWV0cmljcy5jb20uYnIiLCJuYW1laWQiOiIxNjk1OCIsInVuaXF1ZV9uYW1lIjoiNDE2MWMzNTEtOTY5MC00YTAxLTlkNjctMTcyZGUwYTc0YWQ0IiwiSVAiOiIxMC4yNDQuMC4xODMiLCJpc3N1ZWRfZGF0ZSI6IjE3Njk3NzEzMjciLCJuYmYiOjE3Njk3NzEzMjcsImV4cCI6MTc3MzcwNTYwMCwiaWF0IjoxNzY5NzcxMzI3LCJpc3MiOiJodHRwczovL2Nsb3VkLmJvbGRyZXBvcnRzLmNvbS9yZXBvcnRpbmcvc2l0ZS9iMjA0NDAzNCIsImF1ZCI6Imh0dHBzOi8vY2xvdWQuYm9sZHJlcG9ydHMuY29tL3JlcG9ydGluZy9zaXRlL2IyMDQ0MDM0In0.nbbHSrevb8e-DZ5NUvozQiv8mz1t3WyCi6a3NmBHNzs` |
| `BOLD_EMAIL` | Email do usuário (fallback) | `erick.barbosa@baymetrics.com.br` |
| `BOLD_PASSWORD` | Senha do usuário (fallback) | Configurado |

### Claims do Token JWT:

```json
{
  "email": "erick.barbosa@baymetrics.com.br",
  "nameid": "16958",
  "unique_name": "4161c351-9690-4a01-9d67-172de0a74ad4",
  "IP": "10.244.0.183",
  "issued_date": "1769771327",
  "nbf": 1769771327,
  "exp": 1773705600,
  "iat": 1769771327,
  "iss": "https://cloud.boldreports.com/reporting/site/b2044034",
  "aud": "https://cloud.boldreports.com/reporting/site/b2044034"
}
```

**Observação**: O token expira em `1773705600` (aproximadamente 15 de Janeiro de 2026).

---

## 3. Fluxo de Inicialização do Viewer

### 3.1 Passo 1: Buscar Configuração (Edge Function)

**Componente**: `src/hooks/useReportViewer.ts`

```typescript
const fetchViewerConfig = useCallback(async () => {
  const { data, error } = await supabase.functions.invoke('bold-reports', {
    body: { action: 'get-viewer-config' },
  });
  
  if (data?.success && data?.siteId) {
    setViewerConfig({
      siteId: data.siteId,           // "b2044034"
      token: data.token,             // JWT raw (sem prefixo "bearer")
      reportServerUrl: data.reportServerUrl, // URL completa
    });
  }
}, []);
```

**Resposta da Edge Function** (capturada em network logs):

```json
{
  "success": true,
  "siteId": "b2044034",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImVyaWNrLmJhcmJvc2FAYmF5bWV0cmljcy5jb20uYnIiLCJuYW1laWQiOiIxNjk1OCIsInVuaXF1ZV9uYW1lIjoiNDE2MWMzNTEtOTY5MC00YTAxLTlkNjctMTcyZGUwYTc0YWQ0IiwiSVAiOiIxMC4yNDQuMC4xODMiLCJpc3N1ZWRfZGF0ZSI6IjE3Njk3NzEzMjciLCJuYmYiOjE3Njk3NzEzMjcsImV4cCI6MTc3MzcwNTYwMCwiaWF0IjoxNzY5NzcxMzI3LCJpc3MiOiJodHRwczovL2Nsb3VkLmJvbGRyZXBvcnRzLmNvbS9yZXBvcnRpbmcvc2l0ZS9iMjA0NDAzNCIsImF1ZCI6Imh0dHBzOi8vY2xvdWQuYm9sZHJlcG9ydHMuY29tL3JlcG9ydGluZy9zaXRlL2IyMDQ0MDM0In0.nbbHSrevb8e-DZ5NUvozQiv8mz1t3WyCi6a3NmBHNzs",
  "reportServerUrl": "https://cloud.boldreports.com/reporting/api/site/b2044034"
}
```

**Status**: ✅ FUNCIONANDO (200 OK)

---

### 3.2 Passo 2: Renderizar Componente Bold Reports Viewer

**Componente**: `src/components/ReportViewer.tsx`

```tsx
// URLs do Bold Reports Cloud
const BOLD_REPORTS_SERVICE_URL = 'https://service.boldreports.com/api/Viewer';

// Helper para construir URL do servidor
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;

// Componente Bold Reports React Viewer
<BoldReportViewerComponent
  id={viewerContainerId}
  reportServiceUrl={BOLD_REPORTS_SERVICE_URL}
  reportServerUrl={effectiveServerUrl}
  serviceAuthorizationToken={`bearer ${token}`}  // ← FORMATO: "bearer {JWT}"
  reportPath={reportPath}
  parameters={convertParameters()}
  locale="pt-BR"
  toolbarSettings={{
    showToolbar: true,
    items: ['Print', 'Refresh', 'Zoom', 'FitPage', 'FitWidth', 'PageNavigation'],
  }}
  exportSettings={{
    exportOptions: 63,
  }}
  enablePageCache={true}
  reportLoaded={handleReportLoaded}
  reportError={handleReportError}
  ajaxBeforeLoad={handleAjaxBeforeLoad}
  ajaxSuccess={handleAjaxSuccess}
  ajaxError={handleAjaxError}
/>
```

**Props enviadas ao componente**:

| Prop | Valor |
|------|-------|
| `reportServiceUrl` | `https://service.boldreports.com/api/Viewer` |
| `reportServerUrl` | `https://cloud.boldreports.com/reporting/api/site/b2044034` |
| `serviceAuthorizationToken` | `bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `reportPath` | `/{CategoryName}/{ReportName}` (ex: `/Testes/Relatorio de Teste`) |

---

### 3.3 Passo 3: Interceptação de Requisições AJAX

**Handler**: `handleAjaxBeforeLoad`

```typescript
const handleAjaxBeforeLoad = useCallback((args: AjaxBeforeLoadEventArgs) => {
  console.log('[BoldReports AJAX] Action:', args?.actionName || 'N/A');
  
  if (token && args) {
    const bearerToken = `bearer ${token}`;
    
    // Método principal: atualiza serviceAuthorizationToken
    args.serviceAuthorizationToken = bearerToken;
    
    // Método secundário: headerReq como objeto simples
    if (!args.headerReq) {
      args.headerReq = {};
    }
    args.headerReq['Authorization'] = bearerToken;
    
    console.log('[BoldReports AJAX] ✅ Token injetado (bearer minúsculo)');
  }
}, [token]);
```

**Interface do evento**:

```typescript
interface AjaxBeforeLoadEventArgs {
  reportViewerToken?: string;
  serviceAuthorizationToken?: string;
  headerReq?: Record<string, string>;
  headers?: Record<string, string>;
  data?: string;
  actionName?: string;
}
```

---

## 4. Edge Function: Processamento do Token

**Arquivo**: `supabase/functions/bold-reports/index.ts`

### 4.1 Extração do Token Raw

```typescript
// Remove 'bearer ' or 'Bearer ' prefix if present, returns raw JWT
function extractRawToken(token: string): string {
  const lowerToken = token.toLowerCase();
  if (lowerToken.startsWith('bearer ')) {
    return token.substring(7).trim();
  }
  return token.trim();
}
```

### 4.2 Obtenção do Token

```typescript
async function getAccessToken(): Promise<string> {
  // If we have a static token configured, use it directly
  if (BOLD_TOKEN) {
    const rawToken = extractRawToken(BOLD_TOKEN);
    return rawToken;
  }

  // Otherwise, try to generate token via email/password (fallback)
  // ... password_grant flow
}
```

### 4.3 Uso nas Requisições à API Bold Reports

```typescript
const headers = {
  'Authorization': `Bearer ${accessToken}`,  // ← Formato: "Bearer {JWT}"
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
```

---

## 5. Chamadas à API que Funcionam (Edge Function)

### 5.1 list-reports ✅

**URL**: `https://cloud.boldreports.com/reporting/api/site/b2044034/v1.0/items?itemType=Report`

**Resposta**: 200 OK com lista de 9 relatórios

```json
{
  "success": true,
  "data": [
    {
      "Id": "fdad645c-ec19-4e25-accd-d7c4b68cd06c",
      "Name": "Relatorio de Teste",
      "CategoryName": "Testes",
      "CanRead": true,
      "CanWrite": true
    }
    // ... mais relatórios
  ],
  "status": 200
}
```

### 5.2 get-report-parameters ✅

**URL**: `https://cloud.boldreports.com/reporting/api/site/b2044034/v1.0/reports/{id}/parameters`

**Resposta**: 200 OK com parâmetros do relatório

```json
{
  "success": true,
  "data": [
    {
      "Name": "row_limit",
      "Prompt": "row_limit",
      "DataType": "Integer",
      "DefaultValues": ["10"]
    },
    {
      "Name": "category_selector",
      "Prompt": "category_selector",
      "DataType": "String",
      "AvailableValues": [...]
    }
  ],
  "status": 200
}
```

### 5.3 get-viewer-config ✅

**Resposta**: 200 OK

```json
{
  "success": true,
  "siteId": "b2044034",
  "token": "eyJhbGciOi...",
  "reportServerUrl": "https://cloud.boldreports.com/reporting/api/site/b2044034"
}
```

---

## 6. O Problema: Bold Reports React Viewer

Enquanto as chamadas via Edge Function funcionam perfeitamente (autenticação OK), o **componente React Bold Reports Viewer** está retornando erro 401.

### 6.1 Diferença Crítica

| Chamada | Origem | Header Authorization | Status |
|---------|--------|---------------------|--------|
| Edge Function → Bold API | Backend (Deno) | `Bearer {JWT}` | ✅ 200 |
| React Viewer → Bold Service | Frontend (Browser) | `bearer {JWT}` | ❌ 401 |

### 6.2 URLs Envolvidas no Viewer

O Bold Reports React Viewer faz chamadas para DUAS URLs diferentes:

1. **reportServiceUrl**: `https://service.boldreports.com/api/Viewer`
   - Este é o serviço de renderização do viewer
   - Recebe o token via `serviceAuthorizationToken`

2. **reportServerUrl**: `https://cloud.boldreports.com/reporting/api/site/b2044034`
   - Este é o servidor onde os relatórios estão hospedados
   - O viewer precisa se autenticar aqui para buscar definições/dados

### 6.3 Fluxo Interno do Viewer

```
BoldReportViewerComponent
    │
    ├─► Chamada ao reportServiceUrl (service.boldreports.com)
    │     └─► Envia serviceAuthorizationToken como parâmetro
    │
    └─► Chamada ao reportServerUrl (cloud.boldreports.com)
          └─► Precisa validar token com o servidor de relatórios
                └─► ❌ ERRO 401 AQUI
```

---

## 7. Hipóteses do Problema

### 7.1 Hipótese A: Formato do Token no Header

A documentação do Bold Reports usa consistentemente `bearer` (minúsculo), mas alguns servidores podem esperar `Bearer` (maiúsculo conforme RFC 6750).

**Atual**: `serviceAuthorizationToken={`bearer ${token}`}`

**Alternativa**: Testar com `Bearer ${token}`

### 7.2 Hipótese B: Token Não Propagado Internamente

O componente React pode não estar propagando o token para as chamadas internas ao `reportServerUrl`. A prop `serviceAuthorizationToken` pode ser usada apenas para o `reportServiceUrl`.

**Possível solução**: Usar o evento `ajaxBeforeLoad` para injetar o token em TODAS as requisições.

### 7.3 Hipótese C: CORS

O Bold Reports Cloud pode não estar permitindo requisições da origem do frontend.

**Origem atual**: `https://83156da2-5022-467d-8e0d-62137e129699.lovableproject.com`

**Verificar**: Configurações de CORS no painel Bold Reports Cloud.

### 7.4 Hipótese D: Incompatibilidade de Versão

A biblioteca `@boldreports/react-reporting-components@^12.2.7` pode ter um formato diferente para autenticação.

### 7.5 Hipótese E: Token JWT com Audience/Issuer Incorreto

O token foi gerado para:
- **iss/aud**: `https://cloud.boldreports.com/reporting/site/b2044034`

Mas o `reportServerUrl` é:
- `https://cloud.boldreports.com/reporting/api/site/b2044034`

Note a diferença: `/reporting/site/` vs `/reporting/api/site/`

---

## 8. Código Relevante Completo

### 8.1 src/components/ReportViewer.tsx

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize2, Minimize2, Loader2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BoldReport, ExportFormat } from '@/types/boldReports';
import type { BoldReportViewerInstance, BoldReportParameter, AjaxBeforeLoadEventArgs } from '@/types/boldReportsViewer';
import { toast } from 'sonner';

interface ReportViewerProps {
  report: BoldReport;
  parameterValues: Record<string, string | string[]>;
  siteId: string;
  token: string;
  reportServerUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

// URLs do Bold Reports Cloud
const BOLD_REPORTS_SERVICE_URL = 'https://service.boldreports.com/api/Viewer';

// Formato Cloud centralizado COM /site/{siteId}
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;

export function ReportViewer({
  report,
  parameterValues,
  siteId,
  token,
  reportServerUrl,
  isOpen,
  onClose,
}: ReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportReady, setIsReportReady] = useState(false);
  const viewerContainerId = `reportviewer-${report.Id.replace(/[^a-zA-Z0-9]/g, '-')}`;

  // Caminho do relatório no formato /{CategoryName}/{ReportName}
  const reportPath = `/${report.CategoryName || 'Reports'}/${report.Name}`;

  // URL do servidor - usa a prop ou fallback baseado no siteId
  const effectiveServerUrl = reportServerUrl || getBoldReportsServerUrl(siteId);

  // Callback para interceptar requisições AJAX
  const handleAjaxBeforeLoad = useCallback((args: AjaxBeforeLoadEventArgs) => {
    console.log('[BoldReports AJAX] Action:', args?.actionName || 'N/A');
    
    if (token && args) {
      const bearerToken = `bearer ${token}`;
      
      args.serviceAuthorizationToken = bearerToken;
      
      if (!args.headerReq) {
        args.headerReq = {};
      }
      args.headerReq['Authorization'] = bearerToken;
      
      console.log('[BoldReports AJAX] ✅ Token injetado');
    }
  }, [token]);

  const BoldReportViewerComponent = window.BoldReportViewerComponent;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {isOpen && BoldReportViewerComponent && (
          <BoldReportViewerComponent
            id={viewerContainerId}
            reportServiceUrl={BOLD_REPORTS_SERVICE_URL}
            reportServerUrl={effectiveServerUrl}
            serviceAuthorizationToken={`bearer ${token}`}
            reportPath={reportPath}
            parameters={convertParameters()}
            locale="pt-BR"
            toolbarSettings={{
              showToolbar: true,
              items: ['Print', 'Refresh', 'Zoom', 'FitPage', 'FitWidth', 'PageNavigation'],
            }}
            exportSettings={{ exportOptions: 63 }}
            enablePageCache={true}
            reportLoaded={handleReportLoaded}
            reportError={handleReportError}
            ajaxBeforeLoad={handleAjaxBeforeLoad}
            ajaxSuccess={handleAjaxSuccess}
            ajaxError={handleAjaxError}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 8.2 supabase/functions/bold-reports/index.ts (Trecho Relevante)

```typescript
const BOLD_SITE_ID = Deno.env.get('BOLD_SITE_ID');
const BOLD_TOKEN = Deno.env.get('BOLD_TOKEN');
const BASE_URL = `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`;

function extractRawToken(token: string): string {
  const lowerToken = token.toLowerCase();
  if (lowerToken.startsWith('bearer ')) {
    return token.substring(7).trim();
  }
  return token.trim();
}

async function getAccessToken(): Promise<string> {
  if (BOLD_TOKEN) {
    const rawToken = extractRawToken(BOLD_TOKEN);
    return rawToken;
  }
  // ... fallback para password_grant
}

// Ação get-viewer-config
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

---

## 9. Logs de Console (Esperados)

```
[BoldReports] Inicializando Viewer
[BoldReports] Report: { id: "fdad645c-...", name: "Relatorio de Teste", category: "Testes" }
[BoldReports] SiteId: b2044034
[BoldReports] Token (primeiros 50 chars): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFp...
[BoldReports] Report Service URL: https://service.boldreports.com/api/Viewer
[BoldReports] Report Server URL: https://cloud.boldreports.com/reporting/api/site/b2044034
[BoldReports] Report Path: /Testes/Relatorio de Teste
[BoldReports] Service Auth Token: bearer eyJhbGciOiJIUzI1NiI...

[BoldReports AJAX] Action: ReportLoad
[BoldReports AJAX] ✅ Token injetado (bearer minúsculo)

[BoldReports AJAX] ❌ Erro
[BoldReports AJAX] Error: { statusCode: 401, message: "Access Denied" }
```

---

## 10. Próximos Passos Sugeridos

1. **Verificar CORS** no painel Bold Reports Cloud para a origem do frontend

2. **Testar com Bearer maiúsculo** na prop `serviceAuthorizationToken`

3. **Verificar se o endpoint reportServerUrl** está correto:
   - Token issuer: `https://cloud.boldreports.com/reporting/site/b2044034`
   - reportServerUrl: `https://cloud.boldreports.com/reporting/api/site/b2044034`

4. **Consultar documentação oficial** sobre autenticação do React Viewer para Bold Reports Cloud

5. **Verificar permissões do usuário** no Bold Reports Server para o relatório específico

---

## 11. Dependências Instaladas

```json
{
  "@boldreports/react-reporting-components": "^12.2.7",
  "create-react-class": "^15.7.0",
  "jquery": "^3.7.1"
}
```

---

## 12. Arquivos de Declaração de Tipos

### src/types/boldReportsViewer.d.ts

```typescript
export interface AjaxBeforeLoadEventArgs {
  reportViewerToken?: string;
  serviceAuthorizationToken?: string;
  headerReq?: Record<string, string>;
  headers?: Record<string, string>;
  data?: string;
  actionName?: string;
}

declare global {
  interface Window {
    BoldReportViewerComponent: React.ComponentType<{
      id: string;
      reportServiceUrl: string;
      reportServerUrl?: string;
      serviceAuthorizationToken?: string;
      reportPath?: string;
      parameters?: BoldReportParameter[];
      locale?: string;
      toolbarSettings?: {...};
      exportSettings?: {...};
      enablePageCache?: boolean;
      reportLoaded?: () => void;
      reportError?: (args: { errorCode: string; message: string }) => void;
      ajaxBeforeLoad?: (args: AjaxBeforeLoadEventArgs) => void;
      ajaxSuccess?: (args: unknown) => void;
      ajaxError?: (args: unknown) => void;
    }>;
  }
}
```

---

## 13. Resumo do Problema

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| Edge Function → Bold API | ✅ OK | Autenticação funciona, lista relatórios |
| Token JWT | ✅ Válido | Expira em Jan/2026 |
| React Viewer → Bold Service | ❌ 401 | Falha na autenticação interna |
| Formato Token | ⚠️ Revisar | `bearer` vs `Bearer` |
| CORS | ⚠️ Não verificado | Pode bloquear origem |
| Permissões usuário | ⚠️ Não verificado | Pode não ter Read no relatório |

---

*Relatório gerado em 2026-01-30 para análise por IA especializada.*
