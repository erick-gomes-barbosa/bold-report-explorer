
# Plano: Aplicar Valores Padrão de Período no Relatório de Auditoria

## Problema Identificado

Os campos de **Período Início** e **Período Fim** no formulário de Auditoria não estão sendo inicializados com os valores padrão retornados pela API do Bold Reports.

### Causa Raiz

O componente `AuditoriaFilters` utiliza apenas o hook `useCascadingFilters` (para buscar Órgãos, Unidades e Setores do banco externo), mas não utiliza o hook `useReportParameters` que busca os parâmetros do Bold Reports - incluindo os `DefaultValues` para os campos de data.

### Estrutura Esperada da API Bold Reports

Os parâmetros de data retornam um formato similar a:

```json
{
  "Name": "param_periodo_inicio",
  "DataType": "DateTime",
  "HasDefault": true,
  "DefaultValues": ["2024-01-01"]
}
```

---

## Solução Proposta

### Modificar: `src/components/reports/filters/AuditoriaFilters.tsx`

**Alterações:**

1. **Importar e usar `useReportParameters`**
   - Adicionar import do hook e da configuração de mapeamento
   - Chamar o hook com o `reportId` do relatório de Auditoria

2. **Criar função auxiliar para parsing de datas**
   - Converter strings ISO para objetos `Date`
   - Tratar diferentes formatos de data

3. **Adicionar `useEffect` para aplicar valores padrão**
   - Quando os parâmetros forem carregados, extrair `DefaultValues`
   - Aplicar `periodoInicio` e `periodoFim` no formulário usando `form.setValue()`

4. **Ajustar estado de loading**
   - Combinar `loadingParams` com os loadings existentes

---

## Fluxo de Dados Atualizado

```text
1. Componente monta
   ↓
2. useCascadingFilters → busca Órgãos (banco externo)
3. useReportParameters → busca parâmetros (Bold Reports API)
   ↓
4. useEffect detecta parâmetros carregados
   ↓
5. Extrai DefaultValues de param_periodo_inicio e param_periodo_final
   ↓
6. Converte strings para Date e aplica no form
   ↓
7. Campos de período exibem datas padrão
```

---

## Código das Alterações

### 1. Imports Adicionais

```typescript
import { useReportParameters } from '@/hooks/useReportParameters';
import { REPORT_MAPPING } from '@/config/reportMapping';
```

### 2. Hook useReportParameters

```typescript
const reportId = REPORT_MAPPING['auditoria'].reportId;
const { parameters, loading: loadingParams } = useReportParameters(reportId);
```

### 3. Função de Parsing de Data

```typescript
const parseDefaultDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};
```

### 4. useEffect para Aplicar Defaults

```typescript
// Apply default date values from Bold Reports parameters
useEffect(() => {
  if (parameters.length === 0) return;
  
  const periodoInicioParam = parameters.find(p => p.Name === 'param_periodo_inicio');
  const periodoFimParam = parameters.find(p => p.Name === 'param_periodo_final');
  
  const defaultInicio = periodoInicioParam?.DefaultValues?.[0];
  const defaultFim = periodoFimParam?.DefaultValues?.[0];
  
  if (defaultInicio && !form.getValues('periodoInicio')) {
    form.setValue('periodoInicio', parseDefaultDate(defaultInicio));
  }
  
  if (defaultFim && !form.getValues('periodoFim')) {
    form.setValue('periodoFim', parseDefaultDate(defaultFim));
  }
}, [parameters, form]);
```

### 5. Loading Combinado (opcional)

```typescript
const isLoading = loading || loadingOrgaos || loadingParams;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/reports/filters/AuditoriaFilters.tsx` | Adicionar `useReportParameters`, parsing de datas padrão, e `useEffect` para aplicar valores |

---

## Validações

Após implementação, verificar:

1. Ao abrir a aba Auditoria, os campos de Período devem exibir as datas padrão da API
2. Limpar filtros (botão "Limpar") deve manter ou resetar as datas padrão
3. A exportação do relatório deve incluir os valores de período corretamente
4. Selecionar datas manualmente deve substituir os valores padrão

---

## Notas Técnicas

- Os nomes dos parâmetros são `param_periodo_inicio` e `param_periodo_final` (conforme `reportMapping.ts`)
- O campo `DefaultValues` é um array de strings; usamos o primeiro elemento `[0]`
- O parsing usa `new Date()` que aceita formatos ISO (`YYYY-MM-DD`)
- A verificação `!form.getValues(...)` evita sobrescrever valores já definidos pelo usuário
