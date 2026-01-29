

## Plano de Verificacao e Correcao: Integracao Bold Reports React Viewer

### 1. Analise Comparativa: Guia vs Implementacao Atual

Comparando o guia de integracao fornecido com a implementacao atual, identifiquei os seguintes pontos de atencao:

| Item | Guia de Referencia | Implementacao Atual | Status |
|------|-------------------|---------------------|--------|
| Pacotes NPM | `@boldreports/react-reporting-components`, `create-react-class`, `jquery` | Todos instalados | OK |
| globals.js | Expor React, ReactDOM, jQuery no window | Implementado em `src/globals.ts` com polyfills extras | OK |
| Importacao globals | Antes de qualquer import React | Primeira linha em `src/main.tsx` | OK |
| CSS do viewer | Importar em main.tsx | Importado corretamente | OK |
| Scripts base | common, widgets, viewer, react | Todos importados em main.tsx | OK |
| `reportServiceUrl` | URL do Web API Service | `https://service.boldreports.com/api/Viewer` | OK |
| `reportServerUrl` | URL do servidor de relatorios | **PROBLEMA IDENTIFICADO** | CORRIGIR |
| `reportPath` | `/{CategoryName}/{ReportName}` | Implementado corretamente | OK |
| `parameters` | Array de objetos com name/values | Implementado corretamente | OK |
| `serviceAuthorizationToken` | `bearer <token>` | Implementado corretamente | OK |

---

### 2. Problema Principal: Formato da `reportServerUrl`

**Descoberta Critica na Documentacao Oficial:**

Para **Cloud Reporting Server**, a documentacao especifica:
- `reportServerUrl`: `https://<<Report server name>>/reporting/api/`
- Exemplo: `https://acmecorp.boldreports.com/reporting/api/`

**O que o codigo atual faz:**
```typescript
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;
// Resultado: https://cloud.boldreports.com/reporting/api/site/b2044034
```

**O que deveria ser (segundo a documentacao):**
```typescript
// Para Cloud Reporting Server, o formato correto e:
`https://${tenantName}.boldreports.com/reporting/api/`
// Exemplo: https://acmecorp.boldreports.com/reporting/api/
```

**Problema**: O siteId (`b2044034`) nao e o nome do tenant/subdominio. Precisamos descobrir qual e o nome correto do tenant ou testar formatos alternativos.

---

### 3. Problema Secundario: Logs AJAX mostrando "undefined"

Os logs mostram:
```text
[BoldReports AJAX] Action Name: { "_type": "undefined", "value": "undefined" }
```

**Causa**: O objeto `args` passado para `ajaxBeforeLoad` esta sendo logado incorretamente. O Bold Reports React passa os argumentos de forma diferente da documentacao JavaScript pura.

**Solucao**: Logar o objeto `args` completo para inspecao antes de tentar acessar propriedades especificas.

---

### 4. Plano de Correcao Detalhado

#### Fase 1: Melhorar Logs de Diagnostico

**Arquivo**: `src/components/ReportViewer.tsx`

Modificar `handleAjaxBeforeLoad` para logar o objeto completo:

```typescript
const handleAjaxBeforeLoad = useCallback((args: unknown) => {
  console.group('[BoldReports AJAX] Requisicao');
  console.log('[BoldReports AJAX] Args completo:', args);
  console.log('[BoldReports AJAX] Tipo:', typeof args);
  
  // Se for objeto, logar todas as chaves
  if (args && typeof args === 'object') {
    console.log('[BoldReports AJAX] Chaves:', Object.keys(args as object));
    
    // Logar cada propriedade
    for (const [key, value] of Object.entries(args as object)) {
      console.log(`[BoldReports AJAX] ${key}:`, value);
    }
  }
  console.groupEnd();
}, []);
```

#### Fase 2: Testar Formatos Alternativos de URL

Adicionar log detalhado de todas as URLs sendo usadas e testar formato alternativo:

**Opcao A - Formato com tenant como subdominio:**
```typescript
// Precisa descobrir o nome do tenant
const getBoldReportsServerUrl = (tenantName: string) => 
  `https://${tenantName}.boldreports.com/reporting/api/`;
```

**Opcao B - Formato Cloud padrao (se Opcao A falhar):**
```typescript
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;
```

**Opcao C - Formato sem o path /reporting/api/ no serverUrl:**

Segundo a documentacao, para alguns casos o `reportServerUrl` pode nao ser necessario quando usando Cloud service URL.

#### Fase 3: Adicionar Log de Eventos Adicionais

Adicionar callbacks para eventos `ajaxSuccess` e `ajaxError` para capturar respostas:

```typescript
// Adicionar ao BoldReportViewerComponent
ajaxSuccess={(args: unknown) => {
  console.group('[BoldReports AJAX] Sucesso');
  console.log('[BoldReports AJAX] Response:', args);
  console.groupEnd();
}}

ajaxError={(args: unknown) => {
  console.group('[BoldReports AJAX] Erro');
  console.log('[BoldReports AJAX] Error:', args);
  console.groupEnd();
}}
```

#### Fase 4: Atualizar Tipos

**Arquivo**: `src/types/boldReportsViewer.d.ts`

Adicionar eventos de sucesso e erro:

```typescript
interface BoldReportViewerProps {
  // ... props existentes
  ajaxSuccess?: (args: unknown) => void;
  ajaxError?: (args: unknown) => void;
}
```

---

### 5. Questao Pendente: Nome do Tenant

Para a `reportServerUrl` funcionar corretamente no Cloud, precisamos de uma dessas informacoes:

1. **Nome do tenant/subdominio** - Ex: `baymetrics` resultaria em `https://baymetrics.boldreports.com/reporting/api/`
2. **Confirmacao de que o formato `cloud.boldreports.com/reporting/api/site/{siteId}` e aceito** - Este e o formato que o token JWT usa no `iss`/`aud`

O token JWT mostra:
- `iss`: `https://cloud.boldreports.com/reporting/site/b2044034`
- `aud`: `https://cloud.boldreports.com/reporting/site/b2044034`

Note que o issuer usa `/reporting/site/{siteId}` mas a implementacao atual usa `/reporting/api/site/{siteId}`. Isso pode ser a causa do 401.

---

### 6. Arquivos a Modificar

1. **`src/components/ReportViewer.tsx`**
   - Melhorar logging do `ajaxBeforeLoad`
   - Adicionar callbacks `ajaxSuccess` e `ajaxError`
   - Testar formatos de URL alternativos

2. **`src/types/boldReportsViewer.d.ts`**
   - Adicionar tipos para `ajaxSuccess` e `ajaxError`

3. **`src/globals.ts`**
   - Manter como esta (polyfills estao corretos)

---

### 7. Verificacao Pos-Implementacao

1. Abrir console do navegador (F12)
2. Abrir um relatorio no visualizador
3. Observar logs `[BoldReports AJAX]`:
   - Verificar estrutura real do objeto `args`
   - Identificar quais propriedades estao disponiveis
   - Verificar URLs sendo chamadas
4. Se houver erro 401:
   - Verificar logs de `ajaxError`
   - Comparar URL do request com issuer do token
5. Testar formatos de URL alternativos conforme necessario

---

### 8. Detalhes Tecnicos

**Propriedades do BoldReportViewerComponent apos correcao:**

| Propriedade | Valor | Observacao |
|-------------|-------|------------|
| `id` | `reportviewer-{reportId}` | ID unico do container |
| `reportServiceUrl` | `https://service.boldreports.com/api/Viewer` | URL fixa do servico Cloud |
| `reportServerUrl` | A ser determinado | Testar formatos alternativos |
| `serviceAuthorizationToken` | `bearer {token}` | Token JWT gerado pela edge function |
| `reportPath` | `/{CategoryName}/{ReportName}` | Caminho do relatorio |
| `parameters` | Array de `{name, values}` | Parametros do relatorio |
| `ajaxBeforeLoad` | Callback de log | Para diagnostico |
| `ajaxSuccess` | Callback de log | Para diagnostico |
| `ajaxError` | Callback de log | Para diagnostico |
| `reportLoaded` | Handler de sucesso | Para controle de estado |
| `reportError` | Handler de erro | Para exibir mensagens |

