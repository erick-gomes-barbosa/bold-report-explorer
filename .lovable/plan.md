

# Plano: Adaptar Relatorio de Inventario com Logicas de Bens por Necessidade

## Analise Atual

### O que foi implementado em Bens por Necessidade
1. **Filtros Dinamicos**: Carrega opcoes de filtro diretamente da API Bold Reports via `useReportParameters`
2. **Multi-select**: Campos de filtro permitem selecao multipla
3. **Label Mappings**: Captura e envia labels junto com values para a API
4. **Mapeamento de Colunas**: Converte headers genericos (TextBox9) para nomes legiveis (Patrimonio)
5. **IDs para Testes**: Todos os elementos possuem IDs unicos
6. **Integracao com Bold Reports**: Usa `mapFiltersToBoldParameters` para converter filtros

### Situacao Atual do Inventario
- O relatorio de Inventario (**ID: 0d93ea95-4d38-4b5e-b8c2-35c784564ff0**) existe e exporta dados corretamente
- A API retorna **0 parametros dinamicos** - filtros sao estaticos
- O CSV exportado possui a estrutura:
  - TextBox9 = Nome/Descricao
  - TextBox10 = Tipo (total/parcial)
  - TextBox11 = Status (em_andamento/aberto)
  - TextBox12 = Data Inicio
  - TextBox13 = Data Fim
  - TextBox14 = Unidade
  - TextBox15 = Total Itens

## Alteracoes Necessarias

### 1. Atualizar Mapeamento de Colunas (`src/config/columnMapping.ts`)

Preencher o mapeamento para o relatorio de Inventario:

```text
Adicionar ao INVENTARIO_COLUMNS:
  'TextBox9': 'Descricao',
  'TextBox10': 'Tipo',
  'TextBox11': 'Status',
  'TextBox12': 'Data Inicio',
  'TextBox13': 'Data Fim',
  'TextBox14': 'Unidade',
  'TextBox15': 'Total Itens'
```

### 2. Atualizar Mapeamento de Parametros (`src/config/reportMapping.ts`)

Ajustar o mapeamento de filtros para usar o prefixo `param_`:

```text
Antes:
parameterMapping: {
  tipo: 'Tipo',
  status: 'Status',
  periodoInicio: 'DataInicio',
  periodoFim: 'DataFim',
  unidadeAlvo: 'UnidadeAlvo',
}

Depois:
parameterMapping: {
  tipo: 'param_tipo',
  status: 'param_status',
  periodoInicio: 'param_periodo_inicio',
  periodoFim: 'param_periodo_fim',
  unidadeAlvo: 'param_unidade',
}
```

### 3. Refatorar Filtros de Inventario (`src/components/reports/filters/InventarioFilters.tsx`)

Aplicar as mesmas logicas de BensNecessidadeFilters:

**3.1. Filtros Dinamicos via API (se disponiveis):**
Como a API nao retorna parametros para este relatorio, os filtros permanecerao estaticos, mas:
- Adicionar `useReportParameters` para tentar carregar opcoes
- Manter fallback para opcoes estaticas
- Preparar estrutura para quando parametros forem configurados no Bold Reports

**3.2. Converter para Multi-select (onde aplicavel):**
- **Tipo**: Manter select unico (Total/Parcial sao mutuamente exclusivos)
- **Status**: Converter para MultiSelect (permite filtrar multiplos status)
- **Unidade**: Converter para MultiSelect (permite filtrar multiplas unidades)

**3.3. Adicionar Label Mappings:**
Incluir `_labelMappings` no submit para enviar labels corretos

**3.4. Adicionar IDs para Testes:**
| Elemento | ID |
|----------|-----|
| Formulario | `form-inventario` |
| Campo Tipo | `filter-tipo` |
| Campo Status | `filter-status` |
| Campo Periodo Inicio | `filter-periodo-inicio` |
| Campo Periodo Fim | `filter-periodo-fim` |
| Campo Unidade | `filter-unidade` |
| Botao Limpar | `btn-filter-reset-inventario` |
| Botao Gerar | `btn-filter-submit-inventario` |

**3.5. Estrutura do Novo Componente:**

```text
InventarioFilters
├── useReportParameters (hook para carregar opcoes dinamicas)
├── useForm (react-hook-form + zod validation)
├── handleFormSubmit (inclui _labelMappings)
├── handleReset
├── Campos:
│   ├── Tipo (Select unico - obrigatorio)
│   ├── Status (MultiSelect - dinamico/estatico)
│   ├── Periodo (DatePicker inicio/fim)
│   └── Unidade (MultiSelect - dinamico/estatico)
└── Actions (Limpar + Gerar)
```

### 4. Atualizar Schema Zod

Ajustar o schema para suportar arrays nos campos multi-select:

```text
Antes:
status: z.string().optional(),
unidadeAlvo: z.string().optional(),

Depois:
status: z.array(z.string()).default([]),
unidadeAlvo: z.array(z.string()).default([]),
```

## Detalhamento das Alteracoes

### Arquivo: `src/config/columnMapping.ts`

**Linhas 19-21 - Preencher INVENTARIO_COLUMNS:**

```text
export const INVENTARIO_COLUMNS: Record<string, string> = {
  'TextBox9': 'Descricao',
  'TextBox10': 'Tipo',
  'TextBox11': 'Status',
  'TextBox12': 'Data Inicio',
  'TextBox13': 'Data Fim',
  'TextBox14': 'Unidade',
  'TextBox15': 'Total Itens',
};
```

### Arquivo: `src/config/reportMapping.ts`

**Linhas 28-37 - Ajustar prefixo dos parametros:**

```text
'inventario': {
  reportId: '0d93ea95-4d38-4b5e-b8c2-35c784564ff0',
  parameterMapping: {
    tipo: 'param_tipo',
    status: 'param_status',
    periodoInicio: 'param_periodo_inicio',
    periodoFim: 'param_periodo_fim',
    unidadeAlvo: 'param_unidade',
  }
},
```

### Arquivo: `src/components/reports/filters/InventarioFilters.tsx`

**Reescrita completa do componente seguindo o padrao de BensNecessidadeFilters:**

Principais mudancas:
1. Importar `useReportParameters` e `REPORT_MAPPING`
2. Importar `MultiSelect` e `Skeleton`
3. Atualizar schema Zod para arrays
4. Adicionar hook de parametros dinamicos
5. Converter Status e Unidade para MultiSelect
6. Adicionar `handleFormSubmit` com `_labelMappings`
7. Adicionar IDs em todos os campos
8. Manter fallback estatico para opcoes

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/config/columnMapping.ts` | Preencher INVENTARIO_COLUMNS |
| `src/config/reportMapping.ts` | Atualizar prefixo dos parametros |
| `src/components/reports/filters/InventarioFilters.tsx` | Refatorar com logicas de Bens por Necessidade |

## Resultado Esperado

1. Ao clicar na aba "Inventario", os filtros carregam opcoes (dinamicas ou estaticas)
2. Campos Status e Unidade permitem multi-selecao
3. Ao clicar em "Gerar", a tabela exibe dados com headers legiveis
4. Ao clicar em "Exportar", o arquivo e gerado com filtros aplicados
5. Todos os elementos possuem IDs para automacao de testes
6. Comportamento identico ao de Bens por Necessidade

