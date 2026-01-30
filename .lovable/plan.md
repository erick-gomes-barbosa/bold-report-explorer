
# Plano de Integração: Bold Reports Embedded Viewer

## Objetivo
Migrar a pré-visualização de relatórios da abordagem atual (exportação via API REST + renderização cliente com bibliotecas JS) para a abordagem de **componentes embedded oficiais** do Bold Reports, que renderiza relatórios diretamente no navegador através do serviço Cloud.

## Problema Atual
A abordagem atual exporta documentos via API REST e tenta renderizá-los no cliente usando bibliotecas como `docx-preview` para Word e `react-pdf` para PDF. Esta abordagem tem limitações:
- A biblioteca `docx-preview` não renderiza corretamente todos os documentos Word
- Dependência de conversão Base64 → Blob → renderização manual
- Perda de fidelidade visual em relação ao relatório original

## Solução Proposta
Utilizar o **BoldReportViewerComponent** oficial que:
- Renderiza relatórios diretamente no navegador via serviço Cloud
- Oferece navegação de páginas, zoom, impressão e exportação nativos
- Mantém fidelidade visual total ao relatório original
- Suporta parâmetros dinâmicos nativamente

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────────────────────────┐   │
│  │  Index Page │    │   BoldReportViewerComponent      │   │
│  │             │--->│                                  │   │
│  │ - Lista     │    │  reportServiceUrl                │   │
│  │ - Seleção   │    │  reportServerUrl                 │   │
│  │             │    │  reportPath                      │   │
│  └─────────────┘    │  serviceAuthorizationToken       │   │
│                     │  parameters                      │   │
│                     └──────────────────────────────────┘   │
│                                  │                          │
└──────────────────────────────────│──────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Bold Reports Cloud Service                     │
├─────────────────────────────────────────────────────────────┤
│  service.boldreports.com/api/Viewer                        │
│                                                             │
│  - Processamento de relatórios                             │
│  - Renderização visual                                     │
│  - Exportação nativa                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Passos de Implementação

### 1. Instalar Dependências NPM

Adicionar os pacotes necessários do Bold Reports:

| Pacote | Descrição |
|--------|-----------|
| `@boldreports/react-reporting-components` | Componentes React do Bold Reports |
| `jquery` | Dependência obrigatória do Bold Reports |

### 2. Configurar Globals (jQuery no window)

Criar arquivo `src/globals.ts` para expor jQuery e React globalmente (requisito do Bold Reports):

```typescript
import jquery from 'jquery';
import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from 'react-dom';

window.React = React;
window.createReactClass = createReactClass;
window.ReactDOM = ReactDOM;
window.$ = window.jQuery = jquery;
```

### 3. Atualizar main.tsx

Importar `globals.ts` antes de tudo:

```typescript
import './globals';
import React from "react";
import { createRoot } from "react-dom/client";
// ... resto do código
```

### 4. Adicionar Scripts CDN no index.html

Incluir scripts do Bold Reports Common e Widgets:

```html
<script src="https://cdn.boldreports.com/12.2.6/scripts/v2.0/common/bold.reports.common.min.js"></script>
<script src="https://cdn.boldreports.com/12.2.6/scripts/v2.0/common/bold.reports.widgets.min.js"></script>
```

### 5. Criar Componente BoldReportViewer

Novo componente `src/components/BoldReportViewer.tsx`:

```typescript
interface BoldReportViewerProps {
  reportPath: string;
  parameters?: Record<string, string | string[]>;
  onReportLoaded?: () => void;
  onReportError?: (error: string) => void;
}
```

Propriedades Cloud:
- `reportServiceUrl`: `https://service.boldreports.com/api/Viewer`
- `reportServerUrl`: `https://{BOLD_SITE_ID}.boldreports.com/reporting/api/`
- `serviceAuthorizationToken`: Token JWT com prefixo `bearer `
- `reportPath`: Caminho do relatório (ex: `/Categoria/NomeRelatorio`)

### 6. Atualizar Edge Function para Fornecer Token

Adicionar action `get-viewer-config` na Edge Function (já existe parcialmente):

```typescript
case 'get-viewer-config':
  const token = await getAccessToken();
  return new Response(JSON.stringify({
    success: true,
    siteId: BOLD_SITE_ID,
    token: token,
    reportServerUrl: `https://${BOLD_SITE_ID}.boldreports.com/reporting/api/`,
    reportServiceUrl: 'https://service.boldreports.com/api/Viewer'
  }));
```

### 7. Atualizar useBoldReports Hook

Adicionar função para obter configuração do viewer:

```typescript
const fetchViewerConfig = async () => {
  const { data } = await supabase.functions.invoke('bold-reports', {
    body: { action: 'get-viewer-config' }
  });
  return data;
};
```

### 8. Atualizar DocumentPreviewDialog

Modificar para usar o BoldReportViewer embedded em vez dos renderizadores customizados quando aplicável.

### 9. Configurar CORS no Bold Reports Cloud

Pré-requisito administrativo:
- Acessar Bold Reports Cloud como Admin
- Settings → CORS Policy → Enable CORS
- Adicionar domínios:
  - `https://id-preview--83156da2-5022-467d-8e0d-62137e129699.lovable.app`
  - URL de produção quando publicar

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `package.json` | Modificar | Adicionar `jquery` e `@boldreports/react-reporting-components` |
| `src/globals.ts` | Criar | Expor jQuery e React globalmente |
| `src/main.tsx` | Modificar | Importar globals.ts primeiro |
| `index.html` | Modificar | Adicionar scripts CDN do Bold Reports |
| `src/components/BoldReportViewer.tsx` | Criar | Componente wrapper do viewer |
| `src/hooks/useBoldReports.ts` | Modificar | Adicionar fetchViewerConfig |
| `src/components/DocumentPreviewDialog.tsx` | Modificar | Usar BoldReportViewer para preview |
| `src/pages/Index.tsx` | Modificar | Integrar novo fluxo de preview |

---

## Seção Técnica

### Configuração Cloud (URLs)

| Propriedade | Valor |
|-------------|-------|
| `reportServiceUrl` | `https://service.boldreports.com/api/Viewer` |
| `reportServerUrl` | `https://{SITE_ID}.boldreports.com/reporting/api/` |
| Token Format | `bearer {JWT_TOKEN}` (lowercase "bearer") |

### Fluxo de Autenticação

```text
1. Frontend solicita config via Edge Function
2. Edge Function gera token via Embed Secret (HMAC-SHA256)
3. Frontend recebe token + URLs
4. Frontend passa token para BoldReportViewerComponent
5. Viewer comunica diretamente com service.boldreports.com
```

### Considerações de Segurança

- O token JWT é gerado dinamicamente pela Edge Function
- Token tem expiração (TTL ~1 hora)
- Credenciais sensíveis permanecem apenas no backend
- CORS deve estar configurado no painel Bold Reports Cloud

### Fallback para Exportação

Manter a funcionalidade de exportação direta (download) para usuários que preferem baixar o arquivo em vez de visualizar inline.

---

## Resultado Esperado

Após a implementação:
1. O botão "Pré-visualizar" abrirá o Bold Report Viewer embedded
2. O relatório será renderizado nativamente pelo serviço Cloud
3. Usuário terá acesso a: navegação de páginas, zoom, impressão, exportação
4. Parâmetros serão passados automaticamente ao viewer
5. Fidelidade visual 100% com o relatório original

---

## Requisitos Pré-Implementação

Antes de implementar, é necessário:
1. Confirmar que CORS está habilitado no Bold Reports Cloud para os domínios do projeto
2. Verificar se o `BOLD_SITE_ID` está no formato correto (subdomínio, ex: "empresa" em empresa.boldreports.com)
