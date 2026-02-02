
# Plano: Corrigir Endpoint e Formato de Parâmetros para Exportação Bold Reports

## Problema Raiz Identificado

A investigação revelou que:

1. **O endpoint usado está incorreto** - A Edge Function usa `/v5.0/reports/export` com um array `Parameters`, mas este endpoint ignora os filtros
2. **O formato do corpo da requisição está errado** - A API espera `FilterParameters` como uma STRING JSON, não um array de objetos

### Evidências do Problema

| Teste | Tamanho CSV Retornado |
|-------|----------------------|
| Sem filtros | 15639 bytes (128 rows) |
| Com param_unidade filtrado | 15639 bytes (128 rows) |
| Com param_preco filtrado (500-600) | 15639 bytes (128 rows) |

O tamanho é SEMPRE o mesmo, provando que a API está ignorando os parâmetros.

### Documentação da API Bold Reports v1.0

A API v1.0 tem um endpoint específico para exportação COM filtros:

**Endpoint:**
```
POST /v1.0/reports/{reportId}/{exportType}/export-filter
```

**Formato do Body:**
```json
{
  "FilterParameters": "{'ParamName':['value1','value2'],'AnotherParam':['value']}"
}
```

- `FilterParameters` é uma **STRING JSON** (não um array de objetos)
- Valores são arrays de strings MESMO para valores únicos
- Usa aspas simples dentro da string JSON

## Alterações Necessárias

### 1. Edge Function: Alterar Endpoint e Formato

**Arquivo:** `supabase/functions/bold-reports/index.ts`

Modificar a ação `export-report` para:

1. Usar o endpoint correto: `/v1.0/reports/{reportId}/{exportType}/export-filter`
2. Formatar parâmetros como string JSON com aspas simples
3. Enviar no campo `FilterParameters` ao invés de `Parameters`

### 2. Estrutura do Request Body

**Atual (incorreto):**
```json
{
  "ReportId": "8fae90ee-...",
  "ExportType": "CSV",
  "Parameters": [
    { "Name": "param_unidade", "Labels": ["Label"], "Values": ["uuid"] }
  ]
}
```

**Correto:**
```json
{
  "FilterParameters": "{'param_unidade':['uuid-value'],'param_grupo':['uuid1','uuid2']}"
}
```

### 3. Função de Formatação de Parâmetros

```text
Fluxo de transformação:
┌─────────────────────────────────────────────────────────────┐
│ Frontend envia:                                             │
│ {                                                           │
│   param_unidade: { labels: [...], values: ["uuid-1"] },     │
│   param_grupo: { labels: [...], values: ["uuid-1","uuid-2"]}│
│ }                                                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Edge Function transforma para:                              │
│                                                             │
│ filterString = "{'param_unidade':['uuid-1'],                │
│                  'param_grupo':['uuid-1','uuid-2']}"        │
│                                                             │
│ Body: { "FilterParameters": filterString }                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ URL do Request:                                             │
│ POST /v1.0/reports/{reportId}/CSV/export-filter             │
└─────────────────────────────────────────────────────────────┘
```

## Detalhes Técnicos

### Função para Formatar FilterParameters

```text
function formatFilterParameters(params): string {
  if (!params || Object.keys(params).length === 0) {
    return '{}';
  }
  
  const parts = [];
  for (const [name, data] of Object.entries(params)) {
    const values = data.values || [];
    if (values.length > 0) {
      // Formato: 'ParamName':['value1','value2']
      const valuesStr = values
        .map(v => `'${v}'`)
        .join(',');
      parts.push(`'${name}':[${valuesStr}]`);
    }
  }
  
  return `{${parts.join(',')}}`;
}
```

### Alteração na Edge Function

**Mudanças no case `export-report`:**

1. Construir a URL com reportId e exportType no path
2. Formatar parâmetros como string JSON com aspas simples
3. Enviar body com apenas `FilterParameters`

```text
URL anterior: ${BASE_URL}/v5.0/reports/export
URL nova:     ${BASE_URL}/v1.0/reports/${reportId}/${exportFormat}/export-filter

Body anterior: { ReportId, ExportType, Parameters: [...] }
Body novo:     { FilterParameters: "{'param':['value']}" }
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/bold-reports/index.ts` | Alterar endpoint e formato de parâmetros |

## Casos Especiais a Tratar

1. **Sem filtros selecionados**: Enviar `FilterParameters: "{}"` ou omitir o parâmetro
2. **Valores com aspas simples**: Escapar aspas dentro dos valores
3. **Tipos de dados**: Todos os valores devem ser strings (mesmo números e datas)

## Resultado Esperado

1. O endpoint `/v1.0/reports/{id}/{format}/export-filter` será usado
2. Os parâmetros serão formatados corretamente como string JSON
3. A API Bold Reports aplicará os filtros corretamente
4. O CSV retornado terá tamanho diferente dependendo dos filtros aplicados
5. A tabela exibirá apenas os dados filtrados

## Testes para Validação

Após a implementação, testar:

1. Exportar sem filtros - deve retornar todos os dados
2. Exportar com 1 filtro (param_unidade) - deve retornar subset
3. Exportar com múltiplos filtros - deve retornar subset menor
4. Verificar que o tamanho do CSV muda com filtros diferentes
