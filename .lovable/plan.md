
## Plano de Integração Definitiva: Bold Reports Viewer

### Diagnóstico Completo

Após pesquisa aprofundada na documentação oficial do Bold Reports, identifiquei os seguintes problemas na implementação atual:

---

### 1. Análise do Token JWT Fornecido

O token que você forneceu contém as seguintes informações críticas:

| Claim | Valor |
|-------|-------|
| **email** | `erick.barbosa@baymetrics.com.br` |
| **issuer (iss)** | `https://cloud.boldreports.com/reporting/site/b2044034` |
| **audience (aud)** | `https://cloud.boldreports.com/reporting/site/b2044034` |
| **exp** | Token válido até Janeiro de 2026 |

**Implicação:** O token foi emitido para o site `b2044034` no cloud centralizado, portanto o `reportServerUrl` deve seguir o padrão do issuer/audience.

---

### 2. Problema Identificado: Formato Incorreto da `reportServerUrl`

A documentação oficial mostra dois cenários:

#### Enterprise Reporting Server
```javascript
reportServiceUrl: "https://on-premise-demo.boldreports.com/reporting/reportservice/api/Viewer"
reportServerUrl: "https://on-premise-demo.boldreports.com/reporting/api/site/site1"
```

#### Cloud Reporting Server (com subdomínio dedicado)
```javascript
reportServiceUrl: "https://service.boldreports.com/api/Viewer"
reportServerUrl: "https://acmecorp.boldreports.com/reporting/api/"
```

#### Seu Caso: Cloud Centralizado (sem subdomínio dedicado)
A sua conta usa o formato `cloud.boldreports.com/reporting/site/{siteId}`, que é um **híbrido** entre os dois. Baseado no issuer/audience do token JWT, o formato correto é:

```javascript
reportServiceUrl: "https://service.boldreports.com/api/Viewer"
reportServerUrl: "https://cloud.boldreports.com/reporting/api/site/b2044034"
```

---

### 3. Segundo Problema: Token Dinâmico vs Estático

Atualmente a edge function gera tokens via `password_grant`. No entanto, você forneceu um token estático válido até 2026. Vamos configurar para usar este token estático, que é mais confiável.

---

### Mudanças a Implementar

#### Fase 1: Atualizar Secrets

| Secret | Valor Atual | Novo Valor |
|--------|-------------|------------|
| `BOLD_TOKEN` | (não configurado) | Token JWT fornecido |
| `BOLD_EMAIL` | (valor antigo) | `erick.barbosa@baymetrics.com.br` |

#### Fase 2: Atualizar Edge Function (`supabase/functions/bold-reports/index.ts`)

Corrigir o formato da `reportServerUrl`:

**De:**
```typescript
reportServerUrl: 'https://cloud.boldreports.com/reporting/api/'
```

**Para:**
```typescript
reportServerUrl: `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`
```

Isso alinha a URL com o issuer/audience do token JWT.

#### Fase 3: Validar Configuração do Viewer (`src/components/ReportViewer.tsx`)

Garantir que:
1. O `serviceAuthorizationToken` usa o formato `bearer {token}` (minúsculo)
2. O `reportServerUrl` é passado corretamente
3. O `ajaxBeforeLoad` injeta o token nos headers corretos

---

### Detalhes Técnicos

#### Arquivo: `supabase/functions/bold-reports/index.ts`

Alterar a ação `get-viewer-config`:

```typescript
case 'get-viewer-config':
  return new Response(
    JSON.stringify({ 
      success: true, 
      siteId: BOLD_SITE_ID,
      token: accessToken,
      // CORRIGIDO: Usar formato com site ID para cloud centralizado
      // Alinhado com issuer/audience do token JWT
      reportServerUrl: `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
```

#### Arquivo: `src/components/ReportViewer.tsx`

Atualizar a constante de fallback:

```typescript
// CORRIGIDO: Formato Cloud centralizado COM /site/{siteId}
// Baseado no issuer/audience do token JWT
const getBoldReportsServerUrl = (siteId: string) => 
  `https://cloud.boldreports.com/reporting/api/site/${siteId}`;
```

E na renderização do componente:

```typescript
<BoldReportViewerComponent
  id={viewerContainerId}
  reportServiceUrl={BOLD_REPORTS_SERVICE_URL}
  reportServerUrl={effectiveServerUrl || getBoldReportsServerUrl(siteId)}
  serviceAuthorizationToken={`bearer ${token}`}
  reportPath={reportPath}
  // ... outras props
/>
```

---

### Configuração Final Esperada

| Propriedade | Valor |
|-------------|-------|
| `reportServiceUrl` | `https://service.boldreports.com/api/Viewer` |
| `reportServerUrl` | `https://cloud.boldreports.com/reporting/api/site/b2044034` |
| `serviceAuthorizationToken` | `bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `reportPath` | `/{CategoryName}/{ReportName}` |

---

### Sequência de Implementação

1. **Adicionar o secret `BOLD_TOKEN`** com o token JWT fornecido
2. **Atualizar o secret `BOLD_EMAIL`** para `erick.barbosa@baymetrics.com.br`
3. **Atualizar a edge function** para usar o formato correto da `reportServerUrl`
4. **Atualizar o ReportViewer.tsx** com o fallback correto
5. **Deploy e teste**

---

### Por Que Esta Solução Resolve o 401

O erro 401 ocorre porque:
1. O token JWT tem `issuer` = `https://cloud.boldreports.com/reporting/site/b2044034`
2. O viewer estava enviando requisições para `https://cloud.boldreports.com/reporting/api/` (sem o `/site/{siteId}`)
3. O serviço Bold Reports rejeita porque a URL não corresponde ao issuer do token

Com a correção:
1. O `reportServerUrl` será `https://cloud.boldreports.com/reporting/api/site/b2044034`
2. Isso corresponde ao padrão do issuer do token
3. O serviço Bold Reports validará o token corretamente

---

### Resumo das Alterações

| Arquivo/Configuração | Alteração |
|---------------------|-----------|
| Secret `BOLD_TOKEN` | Adicionar token JWT estático fornecido |
| Secret `BOLD_EMAIL` | Atualizar para `erick.barbosa@baymetrics.com.br` |
| `bold-reports/index.ts` | Corrigir `reportServerUrl` para incluir `/site/${siteId}` |
| `ReportViewer.tsx` | Atualizar fallback da URL e garantir consistência |
