

# Plano: Corrigir Reconhecimento de Administrador Bold Reports

## Problema Identificado

A edge function `bold-auth` **funciona corretamente** e retorna:
```json
{
  "isAdmin": true,
  "groups": ["System Administrator"],
  "synced": true
}
```

Porém, o estado `isAdmin` nunca chega ao componente `ReportsHeader` devido a dois problemas no fluxo de autenticacao.

## Diagrama do Fluxo Atual (Com Problemas)

```text
Login                              AuthContext                         ReportsHeader
  |                                     |                                    |
  |-- signIn() ----------------------->|                                    |
  |<-- success ------------------------|                                    |
  |                                     |                                    |
  |-- syncWithBoldReports() (async) -->|                                    |
  |-- navigate('/') -------------------|-----> isAdmin = false ------------>|  PROBLEMA!
  |                                     |                                    |
  |                                     |<-- bold-auth response              |
  |                                     |    isAdmin = true                  |
  |                                     |    (tarde demais!)                 |
```

## Problema 1: Login Nao Aguarda Sincronizacao

**Arquivo:** `src/pages/Login.tsx` (linhas 54-63)

```javascript
// ATUAL - nao espera a sincronizacao terminar
syncWithBoldReports(data.email).catch((err) => {
  console.warn('[Login] Bold Reports sync failed (non-blocking):', err);
});

// Navega IMEDIATAMENTE, antes do isAdmin ser atualizado
navigate('/');
```

O navegador redireciona antes da sincronizacao completar.

## Problema 2: Sessao Existente Nao Sincroniza

**Arquivo:** `src/contexts/AuthContext.tsx` (linhas 82-92)

Quando o usuario ja tem uma sessao ativa (refresh da pagina), o codigo busca profile e role, mas **nunca chama** `syncWithBoldReports`:

```javascript
// Quando existe sessao, apenas busca profile - NAO sincroniza Bold Reports
if (existingSession?.user) {
  fetchUserData(existingSession.user.id);
  // FALTA: syncWithBoldReports(existingSession.user.email!)
}
```

## Solucao

### 1. Login.tsx - Aguardar Sincronizacao

**Antes:**
```javascript
syncWithBoldReports(data.email).catch((err) => {
  console.warn('[Login] Bold Reports sync failed (non-blocking):', err);
});

navigate('/');
```

**Depois:**
```javascript
// Aguarda sincronizacao antes de navegar
await syncWithBoldReports(data.email);

navigate('/');
```

A sincronizacao ja possui try/catch interno, entao erros nao bloqueiam a navegacao.

### 2. AuthContext.tsx - Sincronizar em Sessao Existente

**Alterar** a funcao `onAuthStateChange` (linhas 63-80) e `getSession` (linhas 82-92) para chamar `syncWithBoldReports` quando houver usuario autenticado.

**Antes:**
```javascript
if (currentSession?.user) {
  setTimeout(() => {
    fetchUserData(currentSession.user.id);
  }, 0);
}
```

**Depois:**
```javascript
if (currentSession?.user) {
  setTimeout(() => {
    fetchUserData(currentSession.user.id);
    syncWithBoldReportsInternal(currentSession.user.email!);
  }, 0);
}
```

Onde `syncWithBoldReportsInternal` e uma funcao interna que nao precisa ser exposta via contexto.

## Diagrama do Fluxo Corrigido

```text
Login                              AuthContext                         ReportsHeader
  |                                     |                                    |
  |-- signIn() ----------------------->|                                    |
  |<-- success ------------------------|                                    |
  |                                     |                                    |
  |-- await syncWithBoldReports() ---->|                                    |
  |                    ...aguarda...    |                                    |
  |<-- complete (isAdmin=true) --------|                                    |
  |                                     |                                    |
  |-- navigate('/') -------------------|-----> isAdmin = true ------------->|  CORRETO!

Refresh de Pagina
  |                                     |                                    |
  |                   getSession() ---->|                                    |
  |               syncWithBoldReports ->|                                    |
  |                                     |-----> isAdmin = true ------------->|  CORRETO!
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Login.tsx` | Adicionar `await` antes de `syncWithBoldReports` |
| `src/contexts/AuthContext.tsx` | Chamar sincronizacao em sessao existente e em `onAuthStateChange` |

## Resultado Esperado

1. Apos login, o usuario sera redirecionado **apenas depois** que `isAdmin` for atualizado
2. Em refresh de pagina, a sincronizacao ocorre automaticamente
3. O botao de gerenciamento de usuarios aparecera corretamente para administradores

