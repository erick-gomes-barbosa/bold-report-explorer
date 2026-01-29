

## Plano de Correção: Problema de POST na Pré-visualização do Bold Reports

### Resumo do Problema

Quando o usuário abre a pré-visualização de um relatório, o Bold Reports React Viewer está falhando ao fazer requisições POST para a API. Após análise da documentação oficial e do código atual, foram identificados problemas de configuração no componente `ReportViewer.tsx`.

### Causa Raiz Identificada

O componente está configurado incorretamente para se comunicar com o Bold Reports Cloud. A documentação oficial especifica configurações diferentes das que estão implementadas:

| Propriedade | Valor Atual (INCORRETO) | Valor Correto |
|-------------|------------------------|---------------|
| `reportServiceUrl` | `https://cloud.boldreports.com/reporting/api/site/${siteId}/v1.0/reports` | `https://service.boldreports.com/api/Viewer` |
| `reportPath` | `/${siteId}/reports/${report.Id}` | `/${CategoryName}/${ReportName}` |
| `reportServerUrl` | Nao configurado | `https://cloud.boldreports.com/reporting/api/site/${siteId}` |
| Autenticacao | `ajaxBeforeLoad` hook | `serviceAuthorizationToken` = `bearer ${token}` |

### Solucao Proposta

#### Arquivo: `src/components/ReportViewer.tsx`

**Alteracao 1**: Corrigir a URL do servico de relatórios

```typescript
// ANTES (INCORRETO)
const getBoldReportsServiceUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}/v1.0/reports`;

// DEPOIS (CORRETO)
const BOLD_REPORTS_SERVICE_URL = 'https://service.boldreports.com/api/Viewer';
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;
```

**Alteracao 2**: Corrigir o formato do `reportPath`

```typescript
// ANTES (INCORRETO)
const reportPath = `/${siteId}/reports/${report.Id}`;

// DEPOIS (CORRETO)
// Formato: /{CategoryName}/{ReportName}
const reportPath = `/${report.CategoryName || 'Reports'}/${report.Name}`;
```

**Alteracao 3**: Adicionar `reportServerUrl` e usar `serviceAuthorizationToken`

```typescript
// No BoldReportViewerComponent
<BoldReportViewerComponent
  id={viewerContainerId}
  reportServiceUrl={BOLD_REPORTS_SERVICE_URL}
  reportServerUrl={getBoldReportsServerUrl(siteId)}
  serviceAuthorizationToken={`bearer ${token}`}
  reportPath={reportPath}
  // ... outras props
/>
```

**Alteracao 4**: Remover o hook `ajaxBeforeLoad` (não é mais necessário)

O `serviceAuthorizationToken` substitui a necessidade de injetar headers manualmente.

---

### Atualizacao de Tipos

#### Arquivo: `src/types/boldReportsViewer.d.ts`

Adicionar a propriedade `serviceAuthorizationToken` à interface:

```typescript
interface BoldReportViewerProps {
  // ... props existentes
  reportServerUrl?: string;
  serviceAuthorizationToken?: string;
}
```

#### Arquivo: `src/globals.ts`

Adicionar a mesma propriedade à interface `BoldReportViewerProps`.

---

### Detalhes Tecnicos

**Arquivo principal a modificar**: `src/components/ReportViewer.tsx`

**Arquivos de tipos a atualizar**:
- `src/types/boldReportsViewer.d.ts`
- `src/globals.ts`

**Propriedades do componente após correção**:
- `reportServiceUrl`: URL fixa do serviço de viewer do Cloud
- `reportServerUrl`: URL do servidor do site específico
- `serviceAuthorizationToken`: Token de autenticação no formato "bearer {token}"
- `reportPath`: Caminho no formato /{Categoria}/{NomeRelatorio}

---

### Verificação Pos-Implementacao

1. Abrir um relatório no visualizador
2. Verificar no console se não há erros de requisição
3. Confirmar que o relatório carrega e exibe corretamente
4. Testar exportação em PDF para validar que o viewer está funcional

---

### Riscos e Mitigacoes

| Risco | Probabilidade | Mitigacao |
|-------|--------------|-----------|
| CategoryName pode ser undefined | Media | Usar fallback para string vazia ou "Reports" |
| Nome do relatório com caracteres especiais | Baixa | O Bold Reports deve lidar internamente com encoding |
| Token expirado | Media | O token já é renovado pela edge function |

