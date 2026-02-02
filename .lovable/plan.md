
# Integração Bold Reports com Dashboard de Relatórios

## Objetivo
Conectar cada aba da dashboard (Bens por Necessidade, Inventário, Auditoria) a um relatório específico do Bold Reports usando IDs configuráveis, implementando dois fluxos de exportação distintos:

1. **Botão "Gerar"**: Exporta CSV para popular a DataTable com dados reais
2. **Botão "Exportar"**: Permite download em PDF, XLSX ou CSV

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        ReportsDashboard                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐        ┌────────────────────────────────┐    │
│  │  FiltersSidebar  │        │        DataTable                │    │
│  │                  │        │                                 │    │
│  │  [Filtros]       │───────>│  Dados parseados do CSV        │    │
│  │  [Gerar] ────────│───┐    │                                 │    │
│  │                  │   │    └────────────────────────────────┘    │
│  └──────────────────┘   │                                          │
│                         │    ┌────────────────────────────────┐    │
│                         │    │      ExportDropdown             │    │
│                         │    │  [PDF] [XLSX] [CSV] ─────────────│───│
│                         │    └────────────────────────────────┘    │
│                         │                     │                     │
└─────────────────────────│─────────────────────│─────────────────────┘
                          │                     │
                          ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Edge Function (bold-reports)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Gerar (CSV):                      Exportar (PDF/XLSX/CSV):        │
│  - ReportId mapeado por aba        - Mesmo ReportId                │
│  - Filtros → Parameters            - Mesmo mapeamento              │
│  - format: 'CSV'                   - format: escolhido             │
│  - Retorna base64                  - Retorna base64 para download  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Bold Reports Cloud API                          │
│                   /v5.0/reports/export                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Passos de Implementação

### 1. Criar Configuração de Mapeamento de Relatórios

Criar um arquivo de configuração que mapeia cada tipo de relatório ao seu ID no Bold Reports e define o mapeamento de filtros para parâmetros.

| Tipo de Relatório | Report ID (Bold Reports) | Parâmetros Mapeados |
|-------------------|--------------------------|---------------------|
| `bens-necessidade` | `{ID_A_DEFINIR}` | orgaoUnidade, grupo, situacao, etc. |
| `inventario` | `{ID_A_DEFINIR}` | tipo, status, periodo, etc. |
| `auditoria` | `{ID_A_DEFINIR}` | orgao, unidade, setor, etc. |

### 2. Atualizar o Hook useReportsData

Refatorar o hook para:
- Substituir dados mockados por chamadas reais à Edge Function
- No `fetchReportData`: exportar CSV, parsear e popular a tabela
- No `exportData`: exportar no formato escolhido e fazer download

### 3. Implementar Parser de CSV

Criar utilitário para converter CSV base64 em array de objetos que a DataTable aceita:

```text
Base64 → decodificar → string CSV → split linhas → parse headers → map rows
```

### 4. Atualizar Mapeamento de Filtros para Parâmetros

Transformar os filtros do formulário Zod para o formato de parâmetros do Bold Reports:

```text
Filtros do Form          →    Parâmetros Bold Reports
─────────────────────────────────────────────────────
orgaoUnidade: "1"        →    { OrgaoUnidade: ["1"] }
dataAquisicaoInicio: Date →   { DataInicio: ["2024-01-01"] }
```

### 5. Ajustar ExportDropdown

Modificar para chamar a função de exportação com download real, não mais simulação.

### 6. Adicionar Estados de UI

- Loading state durante geração/exportação
- Toast de sucesso/erro apropriados
- Tratamento de erros da API

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/config/reportMapping.ts` | Criar | Mapeamento de ReportType para Bold Report IDs e parâmetros |
| `src/utils/csvParser.ts` | Criar | Utilitário para parsear CSV e converter para objetos |
| `src/hooks/useReportsData.ts` | Modificar | Integrar com Edge Function |
| `src/components/reports/ReportsDashboard.tsx` | Modificar | Ajustar handlers |
| `src/types/reports.ts` | Modificar | Adicionar tipos para config |

## Seção Técnica

### Estrutura do Arquivo de Configuração

```typescript
// src/config/reportMapping.ts
export interface ReportConfig {
  reportId: string;  // ID do relatório no Bold Reports
  parameterMapping: Record<string, string>;  // filtro local → parâmetro Bold
}

export const REPORT_MAPPING: Record<ReportType, ReportConfig> = {
  'bens-necessidade': {
    reportId: 'PLACEHOLDER_ID_1',  // Substituir pelo ID real
    parameterMapping: {
      orgaoUnidade: 'OrgaoUnidade',
      grupo: 'Grupo',
      situacao: 'Situacao',
      conservacao: 'Conservacao',
      faixaPrecoMin: 'PrecoMinimo',
      faixaPrecoMax: 'PrecoMaximo',
      dataAquisicaoInicio: 'DataInicio',
      dataAquisicaoFim: 'DataFim',
    }
  },
  // ... outros relatórios
};
```

### Fluxo do Botão "Gerar"

```text
1. Usuário preenche filtros e clica "Gerar"
2. handleFiltersSubmit é chamado com os filtros validados
3. fetchReportData busca reportId do REPORT_MAPPING
4. Transforma filtros em parâmetros Bold Reports
5. Chama Edge Function com action: 'export-report', format: 'CSV'
6. Recebe base64, converte para string CSV
7. Parseia CSV em array de objetos
8. Atualiza state com dados para DataTable
```

### Fluxo do Botão "Exportar"

```text
1. Usuário clica em "Exportar" e escolhe formato (PDF/XLSX/CSV)
2. handleExport é chamado com o formato
3. Usa os mesmos filtros já aplicados (currentFilters)
4. Chama Edge Function com action: 'export-report', format: escolhido
5. Recebe base64, converte para Blob
6. Dispara download automático do arquivo
```

### Parser de CSV

```typescript
// src/utils/csvParser.ts
export function parseCSVToObjects(csvString: string): Record<string, unknown>[] {
  const lines = csvString.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);
    const obj: Record<string, unknown> = { id: `row-${index}` };
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}
```

### Transformação de Datas

Datas do formulário precisam ser convertidas para formato ISO:

```typescript
function formatDateParameter(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split('T')[0];  // "2024-01-15"
}
```

## Dependências

Nenhuma nova dependência necessária. O projeto já possui:
- `xlsx` para exportação (se necessário parse complexo de CSV)
- `supabase` client para chamar Edge Function

## Observações Importantes

1. **IDs dos Relatórios**: Os IDs reais dos relatórios Bold Reports precisarão ser fornecidos e configurados no arquivo de mapeamento.

2. **Nomes dos Parâmetros**: Os nomes dos parâmetros no Bold Reports precisam corresponder exatamente aos definidos nos relatórios. O mapeamento atual é um exemplo que deve ser ajustado conforme os relatórios reais.

3. **Formato do CSV**: O parser assume CSV padrão com vírgula como separador. Se o Bold Reports exportar com outro separador (ex: ponto-e-vírgula), o parser deve ser ajustado.

4. **Colunas Dinâmicas**: As colunas da DataTable podem precisar ser geradas dinamicamente baseadas nos headers do CSV retornado, ou manter o mapeamento atual se a estrutura for fixa.
