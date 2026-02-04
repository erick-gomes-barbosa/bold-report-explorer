
# Plano: Mensagem de Aviso Quando o Relatório Não Retorna Dados

## Problema

Atualmente, quando o usuário gera um relatório e a API retorna com sucesso mas **sem dados** (filtros muito restritivos ou nenhum registro correspondente), o sistema:

1. Exibe toast "Relatório gerado com sucesso!" ✗
2. Mostra a tabela vazia com mensagem genérica "Clique em Gerar..." ✗

O usuário não recebe feedback claro de que os filtros aplicados não encontraram registros.

---

## Solução Proposta

Implementar detecção de "retorno vazio" no hook `useReportsData` e propagar essa informação para o componente, permitindo exibir uma mensagem específica e um toast de aviso.

---

## Alterações Técnicas

### 1. Modificar `src/hooks/useReportsData.ts`

Adicionar um novo estado `hasNoResults` que será `true` quando a requisição for bem-sucedida mas o CSV não contiver dados:

```typescript
const [hasNoResults, setHasNoResults] = useState(false);
```

Na função `fetchReportData`, após o parsing do CSV:

```typescript
// Detectar se o CSV tem dados
if (parsed.data.length === 0) {
  setHasNoResults(true);
  setData([]);
  setColumns([]);
  // Não lançar erro, apenas sinalizar que não há dados
  return;
}

setHasNoResults(false);
// ... resto do código
```

Retornar `hasNoResults` no objeto do hook.

---

### 2. Modificar `src/components/reports/ReportsDashboard.tsx`

Usar o novo estado `hasNoResults` para:

1. Exibir toast de aviso em vez de sucesso quando não houver dados
2. Passar mensagem diferenciada para o `DataTable`

```typescript
const { 
  data, 
  hasNoResults,  // <-- novo
  // ...
} = useReportsData();

// No handleFiltersSubmit:
if (hasNoResults) {
  toast.warning('Nenhum registro encontrado para os filtros selecionados');
} else {
  toast.success('Relatório gerado com sucesso!');
}
```

Atualizar as `emptyMessage` do DataTable para diferenciar:
- Estado inicial: "Clique em 'Gerar' para visualizar..."
- Após busca sem resultados: "Nenhum registro encontrado com os filtros aplicados"

---

### 3. Modificar `src/components/reports/DataTable.tsx`

Adicionar suporte para um novo prop `hasSearched` ou detectar internamente quando houve uma busca sem resultados:

```typescript
interface DataTableProps<T extends { id: string }> {
  // ... props existentes
  noResultsMessage?: string;  // Mensagem específica para quando não há resultados após busca
}
```

Atualizar a UI do estado vazio para mostrar uma mensagem mais clara quando é resultado de filtros:

```
┌────────────────────────────────────────┐
│                                        │
│       [Ícone de busca/filtro]          │
│                                        │
│   Nenhum registro encontrado           │
│                                        │
│   Os filtros aplicados não retornaram  │
│   resultados. Tente ajustar os         │
│   critérios de busca.                  │
│                                        │
└────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useReportsData.ts` | Adicionar estado `hasNoResults` e lógica de detecção |
| `src/components/reports/ReportsDashboard.tsx` | Usar `hasNoResults` para toast e mensagens |
| `src/components/reports/DataTable.tsx` | Melhorar UI do estado vazio com mensagem diferenciada |

---

## Fluxo de Dados Atualizado

```text
1. Usuário aplica filtros e clica "Gerar"
   ↓
2. fetchReportData() é chamado
   ↓
3. API retorna CSV
   ↓
4. parseBase64CSVToObjects() processa CSV
   ↓
5. Verifica: parsed.data.length === 0 ?
   ↓
   ├─ SIM → setHasNoResults(true), setData([])
   │        → Toast: "Nenhum registro encontrado..."
   │        → DataTable mostra mensagem específica
   │
   └─ NÃO → setHasNoResults(false), setData(parsed.data)
            → Toast: "Relatório gerado com sucesso!"
            → DataTable exibe dados
```

---

## Benefícios

- Feedback claro para o usuário sobre o resultado da busca
- Diferenciação entre "ainda não buscou" e "buscou mas não encontrou"
- Toast de aviso (amarelo) em vez de sucesso (verde) quando não há dados
- Orientação para o usuário ajustar os filtros
