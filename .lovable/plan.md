
# Plano: Corrigir Formatacao de Datas e Campo Tipo de Inventario

## Problemas Identificados

### 1. Colunas de Data Mal Formatadas
As colunas "Data Inicio" e "Data Fim" exibem valores brutos do CSV (possivelmente ISO format como "2024-01-15T00:00:00") porque:
- O `csvParser.ts` nao possui logica para detectar e formatar datas
- O `cellFormatters` no `ReportsDashboard.tsx` nao possui formatadores para colunas de data
- Os dados chegam como string e sao exibidos diretamente

### 2. Campo Tipo de Inventario com Selecao Unica
O campo "Tipo de Inventario" esta implementado com `Select` (selecao unica) quando deveria ser `MultiSelect`:
- Schema Zod usa `z.enum(['total', 'parcial'])` ao inves de `z.array(z.string())`
- Componente usa `<Select>` ao inves de `<MultiSelect>`
- Default value e `'total'` (string) ao inves de `[]` (array)

## Solucao Proposta

### 1. Adicionar Formatador de Datas no Dashboard

Criar formatadores para colunas de data que detectam e convertem para formato brasileiro:

```text
Novo formatador em cellFormatters:
'Data Início': (value) => formatDate(value)
'Data Fim': (value) => formatDate(value)
```

Funcao auxiliar `formatDate`:
- Detecta se valor parece uma data (ISO, timestamp, etc)
- Converte para formato "dd/MM/yyyy" usando date-fns
- Retorna valor original se nao conseguir parsear

### 2. Converter Campo Tipo para MultiSelect

Atualizar o componente `InventarioFilters.tsx`:

**Schema Zod:**
```text
Antes: tipo: z.enum(['total', 'parcial'])
Depois: tipo: z.array(z.string()).default([])
```

**Default Values:**
```text
Antes: tipo: 'total'
Depois: tipo: []
```

**Componente:**
```text
Antes: <Select> com <SelectItem>
Depois: <MultiSelect> com staticTipoOptions
```

**Opcoes Estaticas:**
```text
const staticTipoOptions = [
  { value: 'total', label: 'Total' },
  { value: 'parcial', label: 'Parcial' },
];
```

### 3. Atualizar Label Mappings

Incluir mapeamento para o campo tipo no `handleFormSubmit`:

```text
const labelMappings = {
  tipo: getLabelMappingForParameter('param_tipo'),
  status: getLabelMappingForParameter('param_status'),
  unidadeAlvo: getLabelMappingForParameter('param_unidade'),
};
```

## Alteracoes Detalhadas

### Arquivo: `src/components/reports/ReportsDashboard.tsx`

**Adicionar import do date-fns (linha 1):**
```text
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
```

**Adicionar funcao auxiliar e formatadores de data (apos linha 14):**
```text
// Função para formatar datas vindas do CSV
const formatDateValue = (value: unknown): React.ReactNode => {
  if (!value || value === '-' || value === '') return '-';
  
  const strValue = String(value);
  
  // Tenta parsear como ISO date
  try {
    const date = parseISO(strValue);
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  } catch {}
  
  // Tenta parsear como timestamp
  const numValue = Number(strValue);
  if (!isNaN(numValue) && numValue > 946684800000) { // > ano 2000
    const date = new Date(numValue);
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  }
  
  return strValue; // Retorna original se não conseguir parsear
};

// Adicionar aos cellFormatters:
const cellFormatters: Record<string, (value: unknown) => React.ReactNode> = {
  // ... formatadores existentes ...
  'Data Início': formatDateValue,
  'Data Fim': formatDateValue,
  'Data Aquisição': formatDateValue,
};
```

### Arquivo: `src/components/reports/filters/InventarioFilters.tsx`

**Linha 37 - Alterar schema do campo tipo:**
```text
Antes:
tipo: z.enum(['total', 'parcial']),

Depois:
tipo: z.array(z.string()).default([]),
```

**Linha 63-76 - Adicionar opcoes estaticas para tipo:**
```text
const staticTipoOptions = [
  { value: 'total', label: 'Total' },
  { value: 'parcial', label: 'Parcial' },
];
```

**Linha 88-92 - Alterar default value:**
```text
Antes:
defaultValues: {
  tipo: 'total',
  status: [],
  unidadeAlvo: [],
},

Depois:
defaultValues: {
  tipo: [],
  status: [],
  unidadeAlvo: [],
},
```

**Linhas 97-100 - Adicionar tipo ao labelMappings:**
```text
const labelMappings: Record<string, Record<string, string>> = {
  tipo: getLabelMappingForParameter('param_tipo'),
  status: getLabelMappingForParameter('param_status'),
  unidadeAlvo: getLabelMappingForParameter('param_unidade'),
};
```

**Linhas 109-115 - Alterar reset para tipo array:**
```text
form.reset({
  tipo: [],
  status: [],
  periodoInicio: undefined,
  periodoFim: undefined,
  unidadeAlvo: [],
});
```

**Linhas 118-123 - Adicionar opcoes dinamicas para tipo:**
```text
const dynamicTipoOptions = getOptionsForParameter('param_tipo');
const tipoOptions = dynamicTipoOptions.length > 0 ? dynamicTipoOptions : staticTipoOptions;
```

**Linhas 129-149 - Substituir Select por MultiSelect:**
```text
Antes:
<FormField
  control={form.control}
  name="tipo"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Tipo de Inventário *</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger id="filter-tipo">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="total">Total</SelectItem>
          <SelectItem value="parcial">Parcial</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>

Depois:
<FormField
  control={form.control}
  name="tipo"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Tipo de Inventário</FormLabel>
      <FormControl>
        {loadingParams ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <MultiSelect
            id="filter-tipo"
            options={tipoOptions}
            value={field.value}
            onChange={field.onChange}
            placeholder="Todos os tipos"
          />
        )}
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Remover imports nao utilizados:**
- Remover `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` pois nao serao mais usados

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/reports/ReportsDashboard.tsx` | Adicionar formatadores de data |
| `src/components/reports/filters/InventarioFilters.tsx` | Converter tipo para MultiSelect |

## Resultado Esperado

1. Colunas "Data Inicio" e "Data Fim" exibem datas no formato brasileiro (dd/MM/yyyy)
2. Campo "Tipo de Inventario" permite selecao multipla (ou nenhuma para "todos")
3. Filtros vazios disparam comportamento "Selecionar Todos" no Bold Reports
4. Consistencia com o padrao de Bens por Necessidade
