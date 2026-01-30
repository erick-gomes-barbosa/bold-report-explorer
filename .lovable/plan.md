
## Plano de Correcao do Erro 401 - Bold Reports Viewer

### Contexto

O documento PDF analisado identifica que o erro 401 nao e causado por token invalido, mas sim por **falhas na propagacao de cabecalhos** e **incompatibilidades de configuracao de URLs**. A Edge Function funciona porque faz chamadas diretas com o token, mas o componente React Viewer falha porque suas requisicoes AJAX internas nao estao recebendo o token corretamente.

---

### Fase 1: Corrigir reportServerUrl (Critico)

**Arquivo:** `src/components/ReportViewer.tsx`

**Problema:** O documento indica que a URL do servidor deve ser o formato base **sem** o sufixo `/site/{siteId}`, pois o componente Viewer anexa dinamicamente os endpoints.

**De:**
```typescript
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;
```

**Para:**
```typescript
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/`;
```

> Nota: O documento especifica que "o componente Viewer muitas vezes exige a URL base do servidor sem o sufixo do site, pois ele anexa dinamicamente os endpoints necessarios".

---

### Fase 2: Refatorar handleAjaxBeforeLoad (Critico)

**Arquivo:** `src/components/ReportViewer.tsx`

**Problema:** A versao 12.2.7 do Bold Reports espera que os cabecalhos sejam inseridos via `args.headers.push()` (array), nao via atribuicao direta a `args.headerReq`.

**De (linha 97-117):**
```typescript
const handleAjaxBeforeLoad = useCallback((args: AjaxBeforeLoadEventArgs) => {
  if (token && args) {
    const bearerToken = `bearer ${token}`;
    args.serviceAuthorizationToken = bearerToken;
    
    if (!args.headerReq) {
      args.headerReq = {};
    }
    args.headerReq['Authorization'] = bearerToken;
  }
}, [token]);
```

**Para (conforme documentacao oficial):**
```typescript
const handleAjaxBeforeLoad = useCallback((args: AjaxBeforeLoadEventArgs) => {
  console.log('[BoldReports AJAX] Action:', args?.actionName || 'N/A');
  
  if (token && args) {
    const bearerToken = `bearer ${token}`;
    
    // Metodo 1: Usar args.headers.push() conforme doc v12.2.7
    if (args.headers && Array.isArray(args.headers)) {
      // Remover cabecalhos de autorizacao existentes para evitar duplicidade
      args.headers = args.headers.filter((h: { Key: string }) => h.Key !== 'Authorization');
      
      // Injetar novo token
      args.headers.push({
        Key: 'Authorization',
        Value: bearerToken
      });
    }
    
    // Metodo 2: Tambem definir serviceAuthorizationToken como fallback
    args.serviceAuthorizationToken = bearerToken;
    
    console.log('[BoldReports AJAX] Token injetado via headers.push()');
  } else {
    console.warn('[BoldReports AJAX] Token nao disponivel');
  }
}, [token]);
```

---

### Fase 3: Atualizar Tipo TypeScript

**Arquivo:** `src/types/boldReportsViewer.d.ts`

**Adicionar:** Tipo para o array `headers` no evento `ajaxBeforeLoad`:

```typescript
export interface AjaxBeforeLoadEventArgs {
  reportViewerToken?: string;
  serviceAuthorizationToken?: string;
  headerReq?: Record<string, string>;
  headers?: Array<{ Key: string; Value: string }>; // ADICIONAR
  data?: string;
  actionName?: string;
}
```

---

### Fase 4: Configuracao CORS (Acao Manual - Usuario)

O usuario deve acessar o painel de administracao do Bold Reports Cloud e adicionar os dominios do Lovable:

**Passos:**
1. Acessar https://cloud.boldreports.com/
2. Navegar ate **Settings > CORS Policy**
3. Habilitar **Customize CORS Policy**
4. Adicionar os seguintes dominios em **Allowed Origins**:
   - `https://id-preview--83156da2-5022-467d-8e0d-62137e129699.lovable.app`
   - `https://83156da2-5022-467d-8e0d-62137e129699.lovableproject.com` (se publicado)
5. Garantir que `Authorization` e `Content-Type` estejam nos cabecalhos permitidos
6. Salvar e aguardar alguns minutos para propagacao

---

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ReportViewer.tsx` | Alterar `reportServerUrl` para formato base sem `/site/{siteId}` |
| `src/components/ReportViewer.tsx` | Refatorar `handleAjaxBeforeLoad` para usar `args.headers.push()` |
| `src/types/boldReportsViewer.d.ts` | Adicionar tipo `headers` no `AjaxBeforeLoadEventArgs` |

---

### Diagnostico Adicional Recomendado

Apos aplicar as correcoes, utilizar as ferramentas de desenvolvedor do navegador para:

1. Localizar a requisicao para `https://service.boldreports.com/api/Viewer/PostReportAction`
2. Verificar se o cabecalho `Authorization` esta presente em **Request Headers**
3. Confirmar se o valor e exatamente `bearer {token}`
4. Se ausente, revisar a funcao `handleAjaxBeforeLoad`

---

### Secao Tecnica

**Por que a Edge Function funciona mas o Viewer falha?**

A Edge Function faz chamadas HTTP diretas com `Authorization: Bearer ${token}`, que funciona perfeitamente. O componente Viewer, porem, dispara multiplas requisicoes AJAX internas atraves do jQuery, e a injecao de cabecalhos precisa seguir o padrao esperado pela biblioteca (via `headers.push()`).

**Por que remover `/site/{siteId}` da URL?**

O documento explica que o Viewer "anexa dinamicamente os endpoints necessarios durante o ciclo de vida do carregamento do relatorio". Se a URL ja contiver o site ID, pode haver duplicacao ou incompatibilidade de rotas.

**Sobre CORS:**

Se o CORS nao estiver configurado, o navegador bloqueara a resposta antes mesmo que o token seja validado, resultando em erro 401 ou erro de rede indefinido.
