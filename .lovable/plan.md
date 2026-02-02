
# Plano: Adicionar IDs aos Componentes e Corrigir Mapeamento de Parâmetros

## Objetivo
Adicionar identificadores (IDs) a todos os componentes de filtro para facilitar testes automatizados e corrigir o mapeamento de valores disponíveis da API Bold Reports.

## Problemas Identificados

### 1. Mapeamento Incompleto de Valores
O hook `getOptionsForParameter` atualmente só suporta:
```text
AvailableValues: [{ DisplayField, ValueField }]
```

Mas a API Bold Reports pode retornar também:
```text
ValidValues: [{ Label, Value }]
```

### 2. Componentes Sem IDs
Nenhum componente de filtro possui atributo `id`, dificultando:
- Testes automatizados
- Depuração visual
- Seleção programática de elementos

## Alterações Necessárias

### 1. Atualizar Hook `useReportParameters.ts`
Modificar `getOptionsForParameter` para suportar ambos os formatos:

```text
Fluxo de mapeamento:
┌─────────────────────────────────────────────────────────────┐
│ API Bold Reports retorna parâmetro                          │
├─────────────────────────────────────────────────────────────┤
│ if (param.AvailableValues)                                  │
│   → map({ DisplayField, ValueField })                       │
│                                                             │
│ else if (param.ValidValues)                                 │
│   → map({ Label → label, Value → value })                   │
│                                                             │
│ else                                                        │
│   → return []                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Adicionar Prop `id` ao MultiSelect
Modificar componente para aceitar e aplicar `id`:

```text
interface MultiSelectProps {
  ...
  id?: string;  // ← Novo
}

<Button id={id} ...>
```

### 3. Adicionar IDs aos Componentes de Filtro

| Componente | ID Proposto |
|------------|-------------|
| Órgão/Unidade (MultiSelect) | `filter-orgao-unidade` |
| Grupo (MultiSelect) | `filter-grupo` |
| Situação (MultiSelect) | `filter-situacao` |
| Estado de Conservação (MultiSelect) | `filter-conservacao` |
| Preço Mínimo (Input) | `filter-preco-min` |
| Preço Máximo (Input) | `filter-preco-max` |
| Data Início (Button) | `filter-data-inicio` |
| Data Fim (Button) | `filter-data-fim` |
| Botão Limpar | `btn-filter-reset` |
| Botão Gerar | `btn-filter-submit` |
| Formulário | `form-bens-necessidade` |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useReportParameters.ts` | Suportar `ValidValues` além de `AvailableValues` |
| `src/components/ui/multi-select.tsx` | Adicionar prop `id` |
| `src/components/reports/filters/BensNecessidadeFilters.tsx` | Adicionar IDs a todos os componentes |

## Detalhes Técnicos

### Hook - Mapeamento Dual de Valores

```text
getOptionsForParameter(paramName):
  1. Buscar parâmetro por Name
  2. Verificar se existe AvailableValues
     → Se sim: mapear DisplayField → label, ValueField → value
  3. Senão, verificar ValidValues
     → Se sim: mapear Label → label, Value → value
  4. Retornar array de MultiSelectOption
```

### MultiSelect - Nova Prop

```text
Props atuais:
  - options, value, onChange, placeholder, emptyMessage, className, disabled

Nova prop:
  - id?: string  → Aplicado ao Button trigger do Popover
```

### Estrutura de IDs

```text
form-bens-necessidade
├── filter-orgao-unidade
├── filter-grupo
├── filter-situacao
├── filter-conservacao
├── filter-preco-min
├── filter-preco-max
├── filter-data-inicio
├── filter-data-fim
├── btn-filter-reset
└── btn-filter-submit
```

## Resultado Esperado

1. Todos os componentes de filtro terão IDs únicos e descritivos
2. O hook suportará ambos os formatos de valores da API Bold Reports
3. Testes automatizados poderão localizar elementos facilmente
4. Depuração via DevTools será simplificada
