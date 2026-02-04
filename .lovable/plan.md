
# Plano: Corrigir Divergências em Bens por Necessidade e Inventário

## Resumo das Divergências Identificadas

Após analisar os arquivos CSV e as imagens de parâmetros fornecidas, identifiquei as seguintes divergências:

---

## 1. Bens por Necessidade

### 1.1 Parâmetros (Divergência Encontrada)

O primeiro parâmetro está incorreto:

| Campo UI | Configuração Atual | Parâmetro Real (imagem) |
|----------|-------------------|------------------------|
| Setor | `param_unidade` | `param_setor` |
| Grupo | `param_grupo` | `param_grupo` ✅ |
| Situação | `param_situacao` | `param_situacao` ✅ |
| Conservação | `param_estado` | `param_estado` ✅ |
| Preço Mínimo | `param_preco_inicial` | `param_preco_inicial` ✅ |
| Preço Máximo | `param_preco_final` | `param_preco_final` ✅ |
| Data Início | `param_dataAquisicao_inicio` | `param_dataAquisicao_inicio` ✅ |
| Data Fim | `param_dataAquisicao_final` | `param_dataAquisicao_final` ✅ |

### 1.2 Colunas CSV (Sem Divergências)

O mapeamento atual está correto:

| Header | Label | Status |
|--------|-------|--------|
| TextBox9 | Patrimônio | ✅ |
| TextBox10 | Descrição | ✅ |
| TextBox11 | Situação | ✅ |
| TextBox12 | Conservação | ✅ |
| TextBox13 | Valor | ✅ |
| TextBox14 | Grupo | ✅ |
| TextBox15 | Unidade | ✅ |

---

## 2. Inventário

### 2.1 Colunas CSV (Divergência Crítica)

O mapeamento atual usa TextBox9-15, mas o CSV exportado usa TextBox23-29:

| Configuração Atual | Header Real | Label Correto |
|-------------------|-------------|---------------|
| TextBox9 → Descrição | TextBox23 | Descrição |
| TextBox10 → Tipo | TextBox24 | Tipo |
| TextBox11 → Status | TextBox25 | Status |
| TextBox12 → Data Início | TextBox26 | Data |
| TextBox13 → Data Fim | TextBox27 | Data Fim |
| TextBox14 → Unidade | TextBox28 | Unidade |
| TextBox15 → Total Itens | TextBox29 | Total Itens |

### 2.2 Parâmetros (Validação Visual)

Baseado na imagem Parametros_Inventario.png:

| Campo UI | Label na Imagem | Parâmetro Configurado |
|----------|-----------------|----------------------|
| Tipo de inventário | "Tipo de inventário" | `param_tipo` ✅ |
| Status | "Status" | `param_status` ✅ |
| Início do período | "Inicio do período" | `param_periodo_inicio` ✅ |
| Final do período | "Final do período" | `param_periodo_fim` ✅ |
| Unidade alvo | "Unidade alvo" | `param_unidade` ✅ |

---

## Alterações Necessárias

### Arquivo 1: `src/config/reportMapping.ts`

**Linha 17 - Corrigir nome do parâmetro de Bens por Necessidade:**

```text
Antes:
orgaoUnidade: 'param_unidade',

Depois:
setor: 'param_setor',
```

### Arquivo 2: `src/config/columnMapping.ts`

**Linhas 19-27 - Atualizar mapeamento de colunas do Inventário:**

```text
Antes:
export const INVENTARIO_COLUMNS: Record<string, string> = {
  'TextBox9': 'Descrição',
  'TextBox10': 'Tipo',
  'TextBox11': 'Status',
  'TextBox12': 'Data Início',
  'TextBox13': 'Data Fim',
  'TextBox14': 'Unidade',
  'TextBox15': 'Total Itens',
};

Depois:
export const INVENTARIO_COLUMNS: Record<string, string> = {
  'TextBox23': 'Descrição',
  'TextBox24': 'Tipo',
  'TextBox25': 'Status',
  'TextBox26': 'Data',
  'TextBox27': 'Data Fim',
  'TextBox28': 'Unidade',
  'TextBox29': 'Total Itens',
};
```

### Arquivo 3: `src/components/reports/filters/BensNecessidadeFilters.tsx`

**Renomear campo `orgaoUnidade` para `setor` em todo o componente:**

Alterações principais:
- Schema Zod: `orgaoUnidade` → `setor`
- defaultValues: `orgaoUnidade: []` → `setor: []`
- handleReset: `orgaoUnidade: []` → `setor: []`
- getOptionsForParameter: `param_unidade` → `param_setor`
- getLabelMappingForParameter: `param_unidade` → `param_setor`
- FormField name: `orgaoUnidade` → `setor`
- FormLabel: "Órgão/Unidade" → "Setor"
- Input ID: `filter-orgao-unidade` → `filter-setor`

### Arquivo 4: `src/types/reports.ts`

**Linha 23 - Atualizar interface BensNecessidadeFilters:**

```text
Antes:
orgaoUnidade?: string;

Depois:
setor?: string;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/config/reportMapping.ts` | Trocar `orgaoUnidade: 'param_unidade'` por `setor: 'param_setor'` |
| `src/config/columnMapping.ts` | Corrigir headers TextBox9-15 → TextBox23-29 para Inventário |
| `src/components/reports/filters/BensNecessidadeFilters.tsx` | Renomear campo `orgaoUnidade` → `setor` |
| `src/types/reports.ts` | Atualizar interface `BensNecessidadeFilters` |

---

## Resultado Esperado

1. Relatório de Bens por Necessidade filtra corretamente pelo parâmetro `param_setor`
2. Relatório de Inventário exibe colunas com headers legíveis (Descrição, Status, Data, Unidade, Total Itens)
3. Interface do filtro de Bens por Necessidade exibe "Setor" ao invés de "Órgão/Unidade"
4. Todos os elementos mantêm IDs para automação de testes
