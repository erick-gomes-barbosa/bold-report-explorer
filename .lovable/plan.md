
# Plano: Corrigir Formato de Parâmetros para API Bold Reports

## Problema Identificado

A exportação de relatórios está retornando dados vazios (apenas headers CSV) porque os parâmetros não estão sendo enviados no formato correto esperado pela API Bold Reports Cloud.

### Formato Atual (Incorreto)
```json
{
  "ReportId": "8fae90ee-...",
  "ExportType": "CSV",
  "FilterParameters": "{\"param_unidade\":[\"value\"]}"
}
```

### Formato Esperado pela API Bold Reports
```json
{
  "ReportId": "8fae90ee-...",
  "ExportType": "CSV",
  "Parameters": [
    {
      "Name": "param_unidade",
      "Labels": ["Label Exibido"],
      "Values": ["valor_real"]
    }
  ]
}
```

## Evidências do Problema

| Evidência | Detalhe |
|-----------|---------|
| Tamanho do CSV | 75 bytes (apenas headers, sem dados) |
| Base64 Length | 100 caracteres |
| CSV Decodificado | `TextBox9,TextBox10,TextBox11,...` (sem linhas de dados) |

## Alterações Necessárias

### 1. Edge Function: Reformatar Parâmetros

**Arquivo:** `supabase/functions/bold-reports/index.ts`

Modificar a ação `export-report` para transformar os parâmetros no formato correto:

```text
Antes:
  FilterParameters: '{"param_unidade":["value"]}'

Depois:
  Parameters: [
    { Name: "param_unidade", Labels: ["value"], Values: ["value"] }
  ]
```

### 2. Criar Função Auxiliar para Formatação

Adicionar função `formatBoldReportParameters` que:

1. Recebe objeto `{ param_name: [values] }`
2. Filtra arrays vazios (omitir parâmetros não preenchidos)
3. Retorna array no formato:
```typescript
[
  { Name: string, Labels: string[], Values: string[] }
]
```

### 3. Atualizar Frontend para Enviar Labels

**Arquivo:** `src/hooks/useReportsData.ts` e `src/config/reportMapping.ts`

Modificar `mapFiltersToBoldParameters` para incluir labels quando disponíveis:

```text
Estrutura atual:
  { param_unidade: ["uuid-1", "uuid-2"] }

Nova estrutura:
  {
    param_unidade: {
      labels: ["Ministério da Tecnologia", "Departamento de TI"],
      values: ["uuid-1", "uuid-2"]
    }
  }
```

## Fluxo de Dados Corrigido

```text
┌────────────────────────────────────────────────────────────┐
│ BensNecessidadeFilters                                     │
│                                                            │
│ form.handleSubmit → {                                      │
│   orgaoUnidade: ["uuid-1"],                                │
│   grupo: [],                                               │
│   situacao: ["em_uso"],                                    │
│   ...                                                      │
│ }                                                          │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│ mapFiltersToBoldParameters (atualizado)                    │
│                                                            │
│ Entrada: { orgaoUnidade: ["uuid-1"], situacao: ["em_uso"]} │
│                                                            │
│ Saída: {                                                   │
│   param_unidade: { labels: ["Nome"], values: ["uuid-1"] }, │
│   param_situacao: { labels: ["Em Uso"], values: ["em_uso"]│
│ }                                                          │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Edge Function: bold-reports                                │
│                                                            │
│ formatBoldReportParameters(parameters)                     │
│                                                            │
│ Body enviado para API:                                     │
│ {                                                          │
│   ReportId: "8fae90ee-...",                                │
│   ExportType: "CSV",                                       │
│   Parameters: [                                            │
│     { Name: "param_unidade",                               │
│       Labels: ["Nome"],                                    │
│       Values: ["uuid-1"] },                                │
│     { Name: "param_situacao",                              │
│       Labels: ["Em Uso"],                                  │
│       Values: ["em_uso"] }                                 │
│   ]                                                        │
│ }                                                          │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Bold Reports API Response                                  │
│                                                            │
│ FileContent: "base64EncodedCSVWithData..."                 │
│ (CSV com dados filtrados corretamente)                     │
└────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/bold-reports/index.ts` | Reformatar parâmetros para array com Name/Labels/Values |
| `src/config/reportMapping.ts` | Modificar `mapFiltersToBoldParameters` para incluir labels |
| `src/hooks/useReportsData.ts` | Passar dados do formulário com labels |
| `src/components/reports/filters/BensNecessidadeFilters.tsx` | Incluir labels dos valores selecionados |

## Detalhes Técnicos

### Função formatBoldReportParameters (Edge Function)

```text
interface BoldParameter {
  Name: string;
  Labels: string[];
  Values: string[];
}

function formatBoldReportParameters(
  params: Record<string, { labels?: string[], values: string[] }>
): BoldParameter[] {
  return Object.entries(params)
    .filter(([_, data]) => data.values.length > 0)
    .map(([name, data]) => ({
      Name: name,
      Labels: data.labels || data.values,
      Values: data.values
    }));
}
```

### Tratamento de Arrays Vazios

Conforme o guia fornecido, parâmetros vazios devem ser **omitidos** (não enviados) para que o Bold Reports aplique o comportamento padrão de "Selecionar Todos".

```text
Filtros do usuário:
  param_unidade: ["uuid"]   ← Enviar
  param_grupo: []           ← NÃO enviar (omitir)
  param_situacao: ["ativo"] ← Enviar
  param_estado: []          ← NÃO enviar (omitir)

Parameters enviados:
  [
    { Name: "param_unidade", Labels: [...], Values: [...] },
    { Name: "param_situacao", Labels: [...], Values: [...] }
  ]
```

## Checklist de Validação

Antes do envio à API:
- [ ] Todos os parâmetros têm `Name`, `Labels` e `Values`
- [ ] `Labels` e `Values` são sempre arrays
- [ ] Arrays `Labels` e `Values` têm o mesmo tamanho
- [ ] Parâmetros com valores vazios são omitidos
- [ ] Não há valores `null` ou `undefined`

## Resultado Esperado

1. Os parâmetros serão enviados no formato correto para a API
2. O Bold Reports aplicará os filtros corretamente
3. O CSV retornado conterá dados reais (não apenas headers)
4. A tabela exibirá os dados filtrados conforme selecionado pelo usuário
