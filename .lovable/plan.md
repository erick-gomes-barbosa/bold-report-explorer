
# Plano: Mapeamento dos Filtros para Parâmetros Bold Reports

## Objetivo
Corrigir o mapeamento dos filtros da aba **Bens por Necessidade** para usar os nomes de parâmetros corretos do Bold Reports, com suporte a multi-seleção.

## Parâmetros a Mapear

| Campo do Filtro | Nome no Form | Parâmetro Bold Reports | Tipo |
|-----------------|--------------|------------------------|------|
| Unidade | `orgaoUnidade` | `param_unidade` | Multi-seleção |
| Grupo | `grupo` | `param_grupo` | Multi-seleção |
| Situação | `situacao` | `param_situacao` | Multi-seleção |
| Estado de Conservação | `conservacao` | `param_estado` | Multi-seleção |
| Preço Mínimo | `faixaPrecoMin` | `param_preco_inicial` | Número |
| Preço Máximo | `faixaPrecoMax` | `param_preco_final` | Número |
| Data Início | `dataAquisicaoInicio` | `param_dataAquisicao_inicio` | Data |
| Data Fim | `dataAquisicaoFim` | `param_dataAquisicao_final` | Data |

## Alterações Necessárias

### 1. Atualizar Arquivo de Mapeamento
**Arquivo:** `src/config/reportMapping.ts`

Corrigir o `parameterMapping` do relatório `bens-necessidade`:

```text
Antes                      →  Depois
─────────────────────────────────────────────────
orgaoUnidade: 'OrgaoUnidade'  →  orgaoUnidade: 'param_unidade'
grupo: 'Grupo'                →  grupo: 'param_grupo'
situacao: 'Situacao'          →  situacao: 'param_situacao'
conservacao: 'Conservacao'    →  conservacao: 'param_estado'
faixaPrecoMin: 'PrecoMinimo'  →  faixaPrecoMin: 'param_preco_inicial'
faixaPrecoMax: 'PrecoMaximo'  →  faixaPrecoMax: 'param_preco_final'
dataAquisicaoInicio: 'DataInicio'  →  dataAquisicaoInicio: 'param_dataAquisicao_inicio'
dataAquisicaoFim: 'DataFim'        →  dataAquisicaoFim: 'param_dataAquisicao_final'
```

### 2. Converter Filtros para Multi-Seleção
**Arquivo:** `src/components/reports/filters/BensNecessidadeFilters.tsx`

Alterar os campos Unidade, Grupo, Situação e Conservação de `Select` simples para componentes que suportam múltipla seleção (usando Checkbox dentro de um Popover ou componente similar).

Mudanças no schema Zod:

```text
Antes                         →  Depois
──────────────────────────────────────────────
orgaoUnidade: z.string()      →  orgaoUnidade: z.array(z.string())
grupo: z.string()             →  grupo: z.array(z.string())
situacao: z.string()          →  situacao: z.array(z.string())
conservacao: z.string()       →  conservacao: z.array(z.string())
```

### 3. Tratamento de Arrays Vazios
A função `mapFiltersToBoldParameters` já ignora valores vazios e já suporta arrays. Apenas garantir que arrays vazios não sejam enviados:

```text
Se array vazio [] → não incluir o parâmetro
Se array com valores ["Ativo", "Inativo"] → enviar como param_situacao: ["Ativo", "Inativo"]
```

## Componente de Multi-Seleção

Criar um componente reutilizável `MultiSelect` baseado em Popover + Checkbox que:
- Mostra badges com os itens selecionados
- Permite selecionar/desmarcar múltiplos itens
- Exibe "Todos" quando nenhum está selecionado (comportamento padrão do Bold Reports)

## Fluxo de Dados Atualizado

```text
┌────────────────────────────────────────┐
│  Formulário de Filtros                 │
│                                        │
│  Unidade: [✓ Sec. Adm] [✓ Sec. Fin]   │
│  Grupo: [✓ Mobiliário]                 │
│  Situação: [] (vazio = todos)          │
│  Estado: [✓ Bom] [✓ Regular]           │
│  Preço: 100 até 5000                   │
│  Data: 01/01/2024 até 31/12/2024       │
└────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│  mapFiltersToBoldParameters()          │
│                                        │
│  {                                     │
│    param_unidade: ["1", "2"],          │
│    param_grupo: ["1"],                 │
│    param_estado: ["Bom", "Regular"],   │
│    param_preco_inicial: ["100"],       │
│    param_preco_final: ["5000"],        │
│    param_dataAquisicao_inicio: [...],  │
│    param_dataAquisicao_final: [...]    │
│  }                                     │
│  // param_situacao omitido (vazio)     │
└────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│  Edge Function → Bold Reports API      │
└────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/config/reportMapping.ts` | Corrigir nomes dos parâmetros |
| `src/components/reports/filters/BensNecessidadeFilters.tsx` | Converter para multi-seleção |
| `src/components/ui/multi-select.tsx` | Criar componente de multi-seleção (novo) |

## Resultado Esperado

Após a implementação:
1. Os filtros de Unidade, Grupo, Situação e Conservação permitirão múltipla seleção
2. Campos vazios (sem seleção) retornarão todos os registros
3. Os parâmetros serão enviados com os nomes corretos (`param_*`)
4. O Bold Reports receberá os filtros corretamente e aplicará no relatório
