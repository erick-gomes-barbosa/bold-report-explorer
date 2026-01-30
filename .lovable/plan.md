
## Plano: Integrar Bold Reports Viewer do Zero (Seguindo Guia Oficial)

### Contexto

Implementação completa do Bold Reports Viewer seguindo estritamente o guia técnico fornecido, com foco na resolução do erro 401 através da correta propagação do token via `ajaxBeforeLoad`.

---

### Fase 1: Preparação do Ambiente React (Dependências Globais)

#### 1.1 Criar `src/globals.ts`

O Bold Reports Viewer depende de objetos globais no `window`:

```typescript
import jquery from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import createReactClass from 'create-react-class';

window.React = React;
window.ReactDOM = ReactDOM;
window.createReactClass = createReactClass;
window.$ = window.jQuery = jquery;
```

#### 1.2 Atualizar `src/main.tsx`

- Importar `./globals` no topo do arquivo (antes de qualquer outro import)
- Importar os scripts CSS do Bold Reports Viewer

---

### Fase 2: Criar Componente ReportViewer

#### 2.1 Criar `src/components/ReportViewer.tsx`

Implementar o componente seguindo as especificações do guia:

**URLs de Integração (conforme guia):**
- `reportServiceUrl`: `https://service.boldreports.com/api/Viewer` (processa layout)
- `reportServerUrl`: `https://{site_id}.boldreports.com/reporting/api` (dados e permissões)

**Propagação do Token (fix para 401):**
```typescript
const formatToken = (token: string) => `bearer ${token}`; // minúsculo!

const onAjaxRequest = useCallback((args: any) => {
  if (token && args.headers) {
    // Força injeção via array headers.push
    args.headers.push({
      Key: 'Authorization',
      Value: formatToken(token)
    });
    args.serviceAuthorizationToken = formatToken(token);
  }
}, [token]);
```

**Props do componente:**
- `reportServiceUrl`: URL fixa do serviço de visualização
- `reportServerUrl`: URL dinâmica do servidor (com siteId)
- `serviceAuthorizationToken`: Token formatado com `bearer`
- `reportPath`: Caminho do relatório (formato: `/Categoria/Nome`)
- `ajaxBeforeLoad`: Handler para injeção do token

---

### Fase 3: Criar Hook useReportViewer

#### 3.1 Criar `src/hooks/useReportViewer.ts`

Hook para buscar configuração do viewer via Edge Function:

```typescript
interface ViewerConfig {
  siteId: string;
  token: string; // JWT puro (sem prefixo)
  reportServerUrl: string;
}
```

- Chamar action `get-viewer-config` na Edge Function
- Retornar configuração para o componente

---

### Fase 4: Atualizar Edge Function

#### 4.1 Adicionar action `get-viewer-config` em `supabase/functions/bold-reports/index.ts`

**Resposta esperada (conforme guia):**
```json
{
  "success": true,
  "siteId": "b2044034",
  "token": "JWT_PURO_SEM_PREFIXO",
  "reportServerUrl": "https://b2044034.boldreports.com/reporting/api"
}
```

O token deve ser retornado **sem** o prefixo "Bearer" - o frontend adiciona `bearer` (minúsculo).

---

### Fase 5: Integrar na Interface

#### 5.1 Atualizar `src/components/ExportPanel.tsx`

- Adicionar prop `onView` para callback de visualização
- Adicionar botão "Visualizar" com ícone `Eye`
- O botão só aparece se `onView` for fornecido

#### 5.2 Atualizar `src/pages/Index.tsx`

- Importar `useReportViewer` e `ReportViewer`
- Adicionar estados para controle do viewer:
  - `viewerOpen`: boolean para abrir/fechar dialog
  - `viewerParams`: parâmetros selecionados pelo usuário
- Buscar configuração do viewer no mount
- Passar `onView` para `ExportPanel`
- Renderizar `ReportViewer` em um Dialog quando aberto

---

### Fase 6: Criar Tipos TypeScript

#### 6.1 Criar `src/types/boldReportsViewer.d.ts`

Declarações de tipos para o componente Bold Reports e objetos globais do window.

---

### Diagrama de Fluxo

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Fluxo de Autenticação                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. useReportViewer → Edge Function (get-viewer-config)          │
│                           │                                      │
│                           ▼                                      │
│  2. Edge Function → Bold Reports Token API (Embed Secret)        │
│                           │                                      │
│                           ▼                                      │
│  3. Retorna: { siteId, token (JWT puro), reportServerUrl }       │
│                           │                                      │
│                           ▼                                      │
│  4. ReportViewer recebe token                                    │
│     - Formata como "bearer {token}" (minúsculo)                  │
│     - Passa via serviceAuthorizationToken                        │
│     - Injeta via ajaxBeforeLoad em TODAS requisições             │
│                           │                                      │
│                           ▼                                      │
│  5. Bold Viewer faz requisições:                                 │
│     - reportServiceUrl: layout do relatório                      │
│     - reportServerUrl: dados e permissões                        │
│     - Todas com header Authorization: "bearer {token}"           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Seção Técnica

#### Arquivos a Criar:
- `src/globals.ts` - Globais para jQuery/React
- `src/components/ReportViewer.tsx` - Componente do viewer
- `src/hooks/useReportViewer.ts` - Hook para buscar config
- `src/types/boldReportsViewer.d.ts` - Tipos TypeScript

#### Arquivos a Modificar:
- `src/main.tsx` - Importar globals e CSS
- `src/components/ExportPanel.tsx` - Adicionar botão Visualizar
- `src/pages/Index.tsx` - Integrar viewer
- `supabase/functions/bold-reports/index.ts` - Adicionar get-viewer-config

#### Pontos Críticos do Guia:
1. Token com `bearer` em **minúsculo** (não `Bearer`)
2. `reportServerUrl` sem `/site/{siteId}` no final
3. Injeção via `args.headers.push()` no `ajaxBeforeLoad`
4. CORS configurado no Bold Reports Cloud (já feito pelo usuário)
