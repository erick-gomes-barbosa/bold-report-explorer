
# Plano: Carregar Valores Disponíveis dos Filtros Dinamicamente

## Objetivo
Buscar os valores disponíveis (`AvailableValues`) dos parâmetros do Bold Reports e populá-los nos campos de multi-seleção da aba **Bens por Necessidade**.

## Dados Descobertos (API Bold Reports)

| Parâmetro | Prompt | Valores Disponíveis |
|-----------|--------|---------------------|
| `param_unidade` | Órgão/Unidade | Ministério da Tecnologia, Departamento de TI, Setor de Infraestrutura |
| `param_grupo` | Grupo de Bens | Mobiliário, Equipamentos de Informática, Veículos, Periféricos |
| `param_situacao` | Situação de Uso | em_estoque, em_manutencao, desativado, em_uso |
| `param_estado` | Estado de Conservação | bom, regular, ruim, novo |
| `param_preco_inicial` | Preço Mínimo | Float (default: 0) |
| `param_preco_final` | Preço Máximo | Float (default: 99999) |

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────┐
│                    BensNecessidadeFilters                   │
│                                                             │
│  useEffect (on mount)                                       │
│      │                                                      │
│      ▼                                                      │
│  fetchParameters('8fae90ee-011b-40d4-a53a-65b74f97b3cb')   │
│      │                                                      │
│      ▼                                                      │
│  Edge Function → Bold Reports API                           │
│      │                                                      │
│      ▼                                                      │
│  Mapear AvailableValues para MultiSelectOption[]            │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ Unidade: [Ministério da Tecnologia ▾]   │               │
│  │ Grupo:   [Mobiliário, Veículos    ▾]    │               │
│  │ Situação:[em_uso, em_estoque      ▾]    │               │
│  │ Estado:  [bom, regular            ▾]    │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Alterações Necessárias

### 1. Criar Hook para Buscar Parâmetros do Relatório
**Arquivo:** `src/hooks/useReportParameters.ts` (novo)

Responsabilidades:
- Chamar a Edge Function com `action: 'get-report-parameters'`
- Receber a lista de `ReportParameter[]` com `AvailableValues`
- Expor função para transformar `AvailableValues` em `MultiSelectOption[]`
- Cache dos parâmetros por `reportId` para evitar chamadas duplicadas

### 2. Atualizar Componente de Filtros
**Arquivo:** `src/components/reports/filters/BensNecessidadeFilters.tsx`

Mudanças:
- Importar o novo hook `useReportParameters`
- Chamar `fetchParameters` no `useEffect` com o ID do relatório
- Substituir opções hardcoded por opções dinâmicas da API
- Exibir estado de loading enquanto carrega os parâmetros
- Tratar erros de carregamento com fallback para opções vazias

### 3. Mapeamento de AvailableValues para MultiSelectOption
Transformar formato da API:
```text
API Bold Reports               →  MultiSelectOption
─────────────────────────────────────────────────────
{                                 {
  DisplayField: "Mobiliário"  →    label: "Mobiliário"
  ValueField: "7ea4d582-..."  →    value: "7ea4d582-..."
}                                 }
```

## Fluxo de Dados

```text
┌──────────────────┐
│ Componente Monta │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ useReportParameters(reportId)        │
│                                      │
│ - loading = true                     │
│ - fetchParameters()                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Edge Function: get-report-parameters │
│                                      │
│ POST /bold-reports                   │
│ { action: 'get-report-parameters',   │
│   reportId: '8fae90ee-...' }         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Bold Reports API Response            │
│                                      │
│ [                                    │
│   { Name: 'param_unidade',           │
│     AvailableValues: [...] },        │
│   { Name: 'param_grupo', ... },      │
│   ...                                │
│ ]                                    │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Processar e Mapear                   │
│                                      │
│ parameterOptions = {                 │
│   param_unidade: [                   │
│     { value: 'uuid', label: 'Nome' } │
│   ],                                 │
│   param_grupo: [...],                │
│   ...                                │
│ }                                    │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Renderizar MultiSelect com opções    │
│                                      │
│ <MultiSelect                         │
│   options={parameterOptions[         │
│     'param_unidade'                  │
│   ] ?? []}                           │
│   ...                                │
│ />                                   │
└──────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useReportParameters.ts` | Criar | Hook para buscar e cachear parâmetros |
| `src/components/reports/filters/BensNecessidadeFilters.tsx` | Modificar | Usar opções dinâmicas da API |

## Detalhes Técnicos

### Hook useReportParameters

```text
useReportParameters(reportId: string)
├── Estados:
│   ├── parameters: ReportParameter[]
│   ├── loading: boolean
│   └── error: string | null
│
├── Funções:
│   ├── fetchParameters(): Promise<void>
│   └── getOptionsForParameter(name: string): MultiSelectOption[]
│
└── Retorno:
    ├── parameters
    ├── loading
    ├── error
    └── getOptionsForParameter
```

### Mapeamento de Parâmetros no Componente

```text
Parâmetro API        →  Campo do Formulário
────────────────────────────────────────────
param_unidade        →  orgaoUnidade
param_grupo          →  grupo
param_situacao       →  situacao
param_estado         →  conservacao
```

## Tratamento de Edge Cases

1. **API não retorna parâmetros**: Mostrar opções vazias com mensagem
2. **AvailableValues vazio**: Permitir entrada de texto livre ou mostrar placeholder
3. **Erro de rede**: Mostrar toast de erro e permitir retry
4. **Loading lento**: Exibir skeleton nos campos de seleção

## Resultado Esperado

1. Ao abrir a aba "Bens por Necessidade", os filtros carregam automaticamente
2. Os campos de multi-seleção mostram os valores reais do Bold Reports
3. Os valores selecionados são enviados com os UUIDs/valores corretos
4. O Bold Reports aplica os filtros corretamente na geração do relatório
