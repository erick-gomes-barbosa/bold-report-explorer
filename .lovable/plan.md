

## Plano de Correção Definitiva: Bold Reports Viewer - Erro 401

### Diagnóstico Completo Baseado na Documentação Oficial

Após pesquisa aprofundada na documentação oficial do Bold Reports, identifiquei **múltiplos problemas** que podem causar o erro 401.

---

### 1. Análise do Token JWT Fornecido

O novo token fornecido contém:

| Claim | Valor |
|-------|-------|
| **email** | `erick.barbosa@baymetrics.com.br` |
| **issued_date** | `1769771327` (30 Jan 2025) |
| **exp** | `1773705600` (válido até ~15 Jan 2026) |
| **issuer (iss)** | `https://cloud.boldreports.com/reporting/site/b2044034` |
| **audience (aud)** | `https://cloud.boldreports.com/reporting/site/b2044034` |

---

### 2. Problema #1: Formato da URL - Análise da Documentação

A documentação oficial do Bold Reports mostra **dois cenários diferentes** para Cloud:

#### Cenário A: Cloud com Subdomínio Dedicado
```javascript
// Quando você tem: https://acmecorp.boldreports.com
reportServerUrl: 'https://acmecorp.boldreports.com/reporting/api/'
```

#### Cenário B: Enterprise/On-Premise com Site ID
```javascript
// Quando você tem: https://on-premise-demo.boldreports.com
reportServerUrl: 'https://on-premise-demo.boldreports.com/reporting/api/site/site1'
```

#### Seu Caso: Cloud Centralizado (cloud.boldreports.com)
Você usa o **cloud centralizado** sem subdomínio dedicado. O issuer do token JWT indica que o formato deve incluir o site ID:

```javascript
// Formato esperado baseado no issuer do token
reportServerUrl: 'https://cloud.boldreports.com/reporting/api/site/b2044034'
```

**Isso confirma que a correção anterior estava correta!**

---

### 3. Problema #2: Case Sensitivity do "Bearer" Token

A documentação oficial usa consistentemente **`bearer` minúsculo**:

```javascript
serviceAuthorizationToken = {'bearer <server token>'}
```

No código atual existe uma **inconsistência**:

| Local | Formato | Status |
|-------|---------|--------|
| `serviceAuthorizationToken` prop | `bearer ${token}` | OK |
| `ajaxBeforeLoad` handler | `Bearer ${token}` | INCONSISTENTE |

Embora o RFC 6750 defina "Bearer" como case-insensitive, alguns servidores podem ser mais restritivos. Vamos padronizar para `bearer` (minúsculo) conforme a documentação.

---

### 4. Problema #3: Formato de Injeção de Headers no ajaxBeforeLoad

A documentação do evento `ajaxBeforeLoad` mostra que os headers podem ser modificados via:
- `args.headerReq` - Objeto de headers
- `args.headers` - Array de headers
- `args.serviceAuthorizationToken` - Token direto

O código atual usa um formato de array com `{ Key, Value }`, mas a documentação sugere um formato mais simples. Vou simplificar a implementação.

---

### 5. Problema #4: Atualizar o Token Estático

O token anterior expirou ou foi substituído. Precisamos atualizar o `BOLD_TOKEN` secret com o novo token fornecido.

---

### Alterações a Implementar

#### Fase 1: Atualizar Secret BOLD_TOKEN

Substituir o token armazenado pelo novo token JWT fornecido.

#### Fase 2: Corrigir `src/components/ReportViewer.tsx`

**Alteração 1** - Padronizar Bearer para minúsculo no `ajaxBeforeLoad`:

```typescript
// Linha ~104 - DE:
const bearerToken = `Bearer ${token}`;

// PARA:
const bearerToken = `bearer ${token}`;
```

**Alteração 2** - Simplificar injeção de headers no `ajaxBeforeLoad`:

A implementação atual é complexa demais. Vamos simplificar seguindo o padrão da documentação:

```typescript
const handleAjaxBeforeLoad = useCallback((args: AjaxBeforeLoadEventArgs) => {
  console.log('[BoldReports AJAX] Action:', args?.actionName);
  
  if (token && args) {
    const bearerToken = `bearer ${token}`;
    
    // Método principal: atualiza serviceAuthorizationToken
    args.serviceAuthorizationToken = bearerToken;
    
    // Método secundário: headerReq como objeto
    if (!args.headerReq) {
      args.headerReq = {};
    }
    args.headerReq['Authorization'] = bearerToken;
    
    console.log('[BoldReports AJAX] Token injetado');
  }
}, [token]);
```

#### Fase 3: Verificar Edge Function (já está correta)

A edge function já retorna o formato correto:
```typescript
reportServerUrl: `https://cloud.boldreports.com/reporting/api/site/${BOLD_SITE_ID}`
```

---

### Verificação de Permissões (Ponto #3 do Usuário)

Conforme mencionado pelo usuário, o erro 401 "Access Denied" também pode ocorrer se o usuário não tiver permissão de leitura no relatório. Para verificar:

1. Fazer login no Bold Reports Server com conta Admin
2. Navegar até o relatório que está falhando
3. Verificar "Manage Permissions"
4. Garantir que `erick.barbosa@baymetrics.com.br` tenha permissão `Read`

---

### Resumo das Alterações

| Arquivo/Configuração | Alteração |
|---------------------|-----------|
| Secret `BOLD_TOKEN` | Atualizar com o novo token JWT fornecido |
| `ReportViewer.tsx` | Padronizar `bearer` minúsculo no ajaxBeforeLoad |
| `ReportViewer.tsx` | Simplificar lógica de injeção de headers |

---

### Configuração Final Esperada

| Propriedade | Valor |
|-------------|-------|
| `reportServiceUrl` | `https://service.boldreports.com/api/Viewer` |
| `reportServerUrl` | `https://cloud.boldreports.com/reporting/api/site/b2044034` |
| `serviceAuthorizationToken` | `bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (novo token) |

---

### Diagnóstico Adicional Recomendado

Se após as correções o erro 401 persistir, os próximos passos seriam:

1. **Verificar logs do Bold Reports Server** - O servidor pode ter logs mais detalhados sobre o motivo da rejeição
2. **Testar token via Postman** - Fazer uma chamada direta à API do Bold Reports para confirmar que o token funciona
3. **Verificar CORS no Bold Reports** - Garantir que a origem da aplicação está permitida
4. **Verificar validade do token** - Confirmar que o token não expirou (exp: 1773705600 = ~15 Jan 2026)

