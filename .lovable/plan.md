
# Plano: Corrigir Divergencias de Parametros e Mapeamentos

## Problemas Identificados

Apos realizar requisicoes a API Bold Reports, identifiquei as seguintes divergencias:

### 1. Relatorio de Auditoria - Mapeamento de Parametros Incorreto

A configuracao atual em `reportMapping.ts` usa nomes de parametros errados:

| Campo | Configuracao Atual | Parametro Real da API |
|-------|-------------------|----------------------|
| orgao | `Orgao` | `param_orgao` |
| unidade | `Unidade` | `param_unidade` |
| setor | `Setor` | `param_setor` |
| periodoInicio | `DataInicio` | `param_periodo_inicio` |
| periodoFim | `DataFim` | `param_periodo_final` |

### 2. Relatorio de Auditoria - Colunas CSV Nao Mapeadas

O CSV exportado retorna headers genericos (`TextBox27-31`) que precisam ser mapeados:

| Header CSV | Nome Amigavel |
|------------|---------------|
| TextBox27 | Orgao |
| TextBox28 | Unidade |
| TextBox29 | Setor |
| TextBox30 | Data Inicio |
| TextBox31 | Data Fim |

### 3. Relatorio de Auditoria - Filtros Estaticos ao Inves de Dinamicos

O componente `AuditoriaFilters.tsx` usa dados mockados estaticos, mas a API retorna parametros dinamicos com `AvailableValues` para:
- `param_orgao` (MultiValue - 4 opcoes)
- `param_unidade` (MultiValue - 6 opcoes)
- `param_setor` (MultiValue - 11 opcoes)
- `param_periodo_inicio` (DateTime)
- `param_periodo_final` (DateTime)

## Alteracoes Necessarias

### Arquivo 1: `src/config/reportMapping.ts`

**Linhas 38-47 - Corrigir mapeamento de parametros da Auditoria:**

```text
Antes:
'auditoria': {
  reportId: '4d08d16c-8e95-4e9e-b937-570cd49bb207',
  parameterMapping: {
    orgao: 'Orgao',
    unidade: 'Unidade',
    setor: 'Setor',
    periodoInicio: 'DataInicio',
    periodoFim: 'DataFim',
  }
},

Depois:
'auditoria': {
  reportId: '4d08d16c-8e95-4e9e-b937-570cd49bb207',
  parameterMapping: {
    orgao: 'param_orgao',
    unidade: 'param_unidade',
    setor: 'param_setor',
    periodoInicio: 'param_periodo_inicio',
    periodoFim: 'param_periodo_final',
  }
},
```

### Arquivo 2: `src/config/columnMapping.ts`

**Linhas 32-35 - Preencher mapeamento de colunas da Auditoria:**

```text
Antes:
export const AUDITORIA_COLUMNS: Record<string, string> = {
  // Será preenchido conforme a estrutura real do relatório
};

Depois:
export const AUDITORIA_COLUMNS: Record<string, string> = {
  'TextBox27': 'Órgão',
  'TextBox28': 'Unidade',
  'TextBox29': 'Setor',
  'TextBox30': 'Data Início',
  'TextBox31': 'Data Fim',
};
```

### Arquivo 3: `src/components/reports/filters/AuditoriaFilters.tsx`

**Refatoracao completa para usar filtros dinamicos:**

Principais mudancas:
1. Importar `useReportParameters`, `MultiSelect`, `Skeleton`
2. Remover dados mockados estaticos (`orgaos`)
3. Atualizar schema Zod para arrays (multi-select)
4. Adicionar hook `useReportParameters` para carregar opcoes da API
5. Converter campos para `MultiSelect` (Orgao, Unidade, Setor)
6. Adicionar `_labelMappings` no submit
7. Adicionar IDs para testes automatizados
8. Manter campos de periodo como opcionais

**Novo Schema Zod:**
```text
orgao: z.array(z.string()).default([]),
unidade: z.array(z.string()).default([]),
setor: z.array(z.string()).default([]),
periodoInicio: z.date().optional(),
periodoFim: z.date().optional(),
```

**IDs para Testes:**
| Elemento | ID |
|----------|-----|
| Formulario | `form-auditoria` |
| Campo Orgao | `filter-orgao` |
| Campo Unidade | `filter-unidade` |
| Campo Setor | `filter-setor` |
| Campo Periodo Inicio | `filter-periodo-inicio` |
| Campo Periodo Fim | `filter-periodo-fim` |
| Botao Limpar | `btn-filter-reset-auditoria` |
| Botao Gerar | `btn-filter-submit-auditoria` |

### Arquivo 4: `src/types/reports.ts`

**Linhas 40-46 - Atualizar tipo AuditoriaFilters para arrays:**

```text
Antes:
export interface AuditoriaFilters {
  orgao?: string;
  unidade?: string;
  setor?: string;
  periodoInicio?: Date;
  periodoFim?: Date;
}

Depois:
export interface AuditoriaFilters {
  orgao: string[];
  unidade: string[];
  setor: string[];
  periodoInicio?: Date;
  periodoFim?: Date;
}
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/config/reportMapping.ts` | Corrigir prefixo dos parametros de Auditoria |
| `src/config/columnMapping.ts` | Preencher AUDITORIA_COLUMNS com TextBox27-31 |
| `src/components/reports/filters/AuditoriaFilters.tsx` | Refatorar para filtros dinamicos com MultiSelect |
| `src/types/reports.ts` | Atualizar interface AuditoriaFilters |

## Resultado Esperado

1. Ao clicar na aba "Auditoria", os filtros carregam opcoes dinamicas da API
2. Campos Orgao, Unidade e Setor permitem multi-selecao
3. Ao clicar em "Gerar", a tabela exibe dados com headers legiveis (Orgao, Unidade, etc.)
4. Ao clicar em "Exportar", o arquivo e gerado com filtros aplicados corretamente
5. Todos os elementos possuem IDs para automacao de testes
6. Comportamento consistente com Bens por Necessidade e Inventario
