

## Plano de Correção: Erro de Pré-visualização do Bold Reports

### Resumo do Problema

O Bold Reports React Viewer está falhando durante a inicialização com o erro `jQuery.parseJSON is not a function`. Mesmo com jQuery 3.7.1 instalado (que inclui `parseJSON`), o erro persiste. A análise revelou que os polyfills adicionados em `globals.ts` para `isWindow`, `isFunction`, etc. não incluem `parseJSON`.

### Causa Raiz Identificada

O Bold Reports internamente usa `jQuery.parseJSON()` para processar respostas AJAX (linha 3286 do `bold.report-viewer.min.js`). Embora o jQuery 3.7.1 inclua este método, os polyfills atuais no `globals.ts` **estão verificando se o método existe E ADICIONANDO-O** condicionalmente. Porém, `$.parseJSON` não foi incluído nessa lista de polyfills.

Além disso, o problema pode ser agravado pela ordem de carregamento: o Bold Reports pode estar tentando acessar `jQuery.parseJSON` antes que o polyfill seja aplicado corretamente, ou o bundler do Vite pode estar tree-shaking alguns métodos.

### Solução Proposta

#### Fase 1: Adicionar Polyfill para `parseJSON`

Atualizar `src/globals.ts` para incluir o polyfill de `jQuery.parseJSON`:

```typescript
// $.parseJSON - depreciado no jQuery 3.0, removido no jQuery 4.0
// Bold Reports ainda usa este método internamente
if (typeof jq.parseJSON !== 'function') {
  jq.parseJSON = JSON.parse;
}
```

#### Fase 2: Garantir Ordem de Execução dos Polyfills

Mover TODOS os polyfills para ANTES da atribuição global do jQuery:

```text
Ordem correta:
1. Importar jquery
2. Aplicar TODOS os polyfills ao objeto jquery
3. Atribuir ao window.$ e window.jQuery
4. Carregar scripts Bold Reports (em main.tsx)
```

#### Fase 3: Verificar se Há Outros Métodos Faltando

Baseado na documentação do jQuery 4.0 Upgrade Guide, adicionar polyfills para todos os métodos depreciados que o Bold Reports pode usar:

| Método | Status | Ação |
|--------|--------|------|
| `$.parseJSON` | Removido em jQuery 4 | Adicionar polyfill |
| `$.isWindow` | Removido em jQuery 4 | Ja existe |
| `$.isFunction` | Removido em jQuery 4 | Ja existe |
| `$.isArray` | Removido em jQuery 4 | Ja existe |
| `$.isNumeric` | Removido em jQuery 4 | Ja existe |
| `$.type` | Removido em jQuery 4 | Ja existe |
| `$.trim` | Removido em jQuery 4 | Considerar adicionar |
| `$.now` | Removido em jQuery 4 | Considerar adicionar |

---

### Detalhes Tecnicos

**Arquivo a ser modificado:** `src/globals.ts`

**Alteracoes necessarias:**

1. Adicionar polyfill para `$.parseJSON`:
```typescript
// $.parseJSON - Bold Reports usa internamente para processar respostas AJAX
if (typeof jq.parseJSON !== 'function') {
  jq.parseJSON = function(data: string | null) {
    if (data === null || data === undefined) {
      return null;
    }
    return JSON.parse(data + '');
  };
}
```

2. Adicionar polyfills preventivos para `$.trim` e `$.now`:
```typescript
// $.trim - pode ser usado por widgets do Bold Reports
if (typeof jq.trim !== 'function') {
  jq.trim = function(text: string | null | undefined) {
    return text == null ? '' : (text + '').replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  };
}

// $.now - pode ser usado para timestamps
if (typeof jq.now !== 'function') {
  jq.now = Date.now;
}
```

3. Reorganizar o arquivo para garantir que polyfills sejam aplicados antes da exposicao global.

---

### Verificacao Pos-Implementacao

Apos aplicar as correcoes:

1. Abrir um relatorio no visualizador
2. Verificar console para erros
3. Testar exportacao em diferentes formatos
4. Confirmar que o relatorio carrega completamente

---

### Riscos e Mitigacoes

| Risco | Probabilidade | Mitigacao |
|-------|--------------|-----------|
| Outros metodos jQuery faltando | Media | Adicionar polyfills preventivos para todos os metodos depreciados |
| Conflito com versao do jQuery | Baixa | Polyfills verificam existencia antes de adicionar |
| Performance | Baixa | Polyfills sao simples wrappers |

