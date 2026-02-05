
## Plano: Visibilidade de Relatórios Baseada em Permissões

Este plano implementa a verificação de permissões do usuário para controlar a visibilidade e disponibilidade das abas de relatórios (Bens por Necessidade, Inventário, Auditoria) na página principal.

---

## Arquitetura da Solução

### Fluxo de Verificação de Permissões

```text
1. Usuario faz login
2. AuthContext sincroniza com Bold Reports (ja implementado)
3. Sistema busca permissoes do usuario via Edge Function
4. Hook useReportPermissions processa as permissoes
5. ReportsDashboard filtra abas visiveis baseado nas permissoes
```

### Lógica de Permissão para Relatórios

Um usuário pode ver um relatório se possuir QUALQUER UMA das seguintes permissões:

| Permissao | Descricao |
|-----------|-----------|
| AllReports (Read/ReadWrite/ReadWriteDelete) | Acesso a todos os relatorios |
| ReportsInCategory + CategoryId correspondente | Acesso a categoria do relatorio |
| SpecificReports + ItemId = ReportId | Acesso especifico ao relatorio |

### Administradores

Usuários com `isAdmin = true` (do AuthContext) têm acesso a TODOS os relatórios, sem necessidade de verificação adicional.

---

## Parte 1: Criar Hook useReportPermissions

**Arquivo**: `src/hooks/useReportPermissions.ts`

### Responsabilidades

1. Buscar permissões do usuário logado via Edge Function
2. Processar e mapear permissões para relatórios específicos
3. Expor função para verificar acesso a um relatório pelo ID
4. Cachear permissões para evitar chamadas repetidas

### Interface

```typescript
interface UseReportPermissionsResult {
  loading: boolean;
  error: string | null;
  canAccessReport: (reportId: string) => boolean;
  accessibleReports: string[]; // Lista de IDs acessíveis
  refresh: () => Promise<void>;
}
```

### Lógica de Verificação

```typescript
function canAccessReport(reportId: string): boolean {
  // 1. Admin tem acesso total
  if (boldReportsInfo.isAdmin) return true;
  
  // 2. Verifica AllReports
  if (permissions.some(p => 
    p.PermissionEntity === 'AllReports' && 
    ['Read', 'ReadWrite', 'ReadWriteDelete'].includes(p.PermissionAccess)
  )) return true;
  
  // 3. Verifica SpecificReports com ItemId
  if (permissions.some(p => 
    p.PermissionEntity === 'SpecificReports' && 
    p.ItemId === reportId &&
    ['Read', 'ReadWrite', 'ReadWriteDelete', 'Download'].includes(p.PermissionAccess)
  )) return true;
  
  // 4. Verifica ReportsInCategory (requer conhecer categoria do relatório)
  // Esta verificação pode precisar de dados adicionais da API
  
  return false;
}
```

---

## Parte 2: Modificar ReportsDashboard

**Arquivo**: `src/components/reports/ReportsDashboard.tsx`

### Alterações

1. Importar e usar o hook `useReportPermissions`
2. Filtrar abas baseado nas permissões
3. Redirecionar para primeira aba disponível se a aba atual não for acessível
4. Exibir mensagem quando nenhum relatório estiver disponível

### Estrutura de Tabs Filtradas

```typescript
const REPORT_TABS = [
  { id: 'bens-necessidade', reportId: '8fae90ee-011b-40d4-a53a-65b74f97b3cb', label: 'Bens por Necessidade', icon: Package },
  { id: 'inventario', reportId: '0d93ea95-4d38-4b5e-b8c2-35c784564ff0', label: 'Inventário', icon: ClipboardList },
  { id: 'auditoria', reportId: '4d08d16c-8e95-4e9e-b937-570cd49bb207', label: 'Auditoria', icon: Search },
];

// Filtrar tabs acessíveis
const accessibleTabs = REPORT_TABS.filter(tab => canAccessReport(tab.reportId));
```

### Estado de Loading

Enquanto as permissões estão sendo carregadas, exibir skeleton/loading nas abas para evitar flash de conteúdo.

---

## Parte 3: Atualizar BoldReportsInfo

**Arquivo**: `src/types/boldAuth.ts`

Adicionar campo opcional para armazenar permissões do usuário, evitando múltiplas chamadas:

```typescript
export interface BoldReportsInfo {
  // ... campos existentes
  permissions?: Permission[]; // Cache de permissões
}
```

---

## Parte 4: Estender Edge Function (Opcional)

Se necessário buscar a categoria de cada relatório para verificar `ReportsInCategory`, adicionar uma ação `getReportDetails` na Edge Function.

**Alternativa mais simples**: Para a verificação inicial, focar em `AllReports` e `SpecificReports`, que já contêm o `ItemId` necessário.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| src/hooks/useReportPermissions.ts | Criar | Hook para gerenciar permissões de relatórios |
| src/components/reports/ReportsDashboard.tsx | Modificar | Filtrar abas baseado em permissões |
| src/types/boldAuth.ts | Modificar | Adicionar cache de permissões (opcional) |
| src/contexts/AuthContext.tsx | Modificar | Buscar permissões durante sync (opcional) |

---

## Fluxo de Usuário

```text
1. Usuário faz login
2. Sistema sincroniza com Bold Reports (AuthContext)
3. Ao acessar página de relatórios:
   a. Hook useReportPermissions busca permissões do Bold
   b. Sistema filtra abas disponíveis
   c. Se usuário não tem acesso a nenhum relatório:
      - Exibe mensagem "Você não possui permissão para visualizar relatórios"
   d. Se usuário perde acesso à aba atual:
      - Redireciona para primeira aba disponível
```

---

## Considerações de UX

1. **Loading State**: Mostrar skeleton enquanto verifica permissões
2. **Mensagem de Erro**: Explicar claramente quando usuário não tem acesso
3. **Fallback para Admin**: Administradores sempre veem todas as abas
4. **Cache**: Evitar buscar permissões a cada navegação
5. **Refresh**: Permitir atualizar permissões se necessário

---

## Considerações de Segurança

1. **Verificação Server-Side**: A Edge Function já restringe acesso à exportação
2. **Verificação Client-Side**: Esta implementação é para UX (ocultar opções)
3. **Double-Check**: Mesmo que aba seja visível, export verifica permissões novamente

---

## Sequência de Implementação

1. Criar hook useReportPermissions
2. Testar busca de permissões
3. Modificar ReportsDashboard para usar o hook
4. Testar fluxo completo com diferentes usuários
5. Ajustar UX baseado em feedback

