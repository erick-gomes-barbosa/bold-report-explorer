
## Plano: Remover Totalmente a Pré-visualização do Bold Reports

### Contexto

A funcionalidade de pré-visualização do Bold Reports continua apresentando erro 401 apesar das múltiplas tentativas de correção. Será removida completamente, mantendo apenas a funcionalidade de exportação que funciona via Edge Function.

---

### Arquivos a Serem Modificados

#### 1. Deletar `src/components/ReportViewer.tsx`

Remover completamente o componente de visualização que usa o Bold Reports Viewer.

#### 2. Deletar `src/hooks/useReportViewer.ts`

Remover o hook que busca configuração do viewer (siteId, token, reportServerUrl).

#### 3. Modificar `src/pages/Index.tsx`

**Remover:**
- Import do `ReportViewer`
- Import do `useReportViewer`
- Estados `viewerOpen` e `viewerParams`
- Chamada `fetchViewerConfig()` no `useEffect`
- Função `handleView`
- Referência a `viewerConfig` no prop `onView` do `ExportPanel`
- Componente `<ReportViewer />` no final do JSX

#### 4. Modificar `src/components/ExportPanel.tsx`

**Remover:**
- Import do ícone `Eye`
- Prop `onView` da interface e componente
- Função `handleView`
- Botão de "Visualizar" no JSX

#### 5. Modificar `src/main.tsx`

**Remover:**
- Imports de CSS e scripts do Bold Reports Viewer (linhas 10-14)
- Import do `./globals` (linha 2) - não será mais necessário

#### 6. Deletar `src/globals.ts`

Remover arquivo de inicialização global do jQuery/React para Bold Reports.

#### 7. Remover da Edge Function `supabase/functions/bold-reports/index.ts`

**Remover:**
- Ação `get-viewer-config` no switch case (será ignorada se chamada)

---

### Arquivos de Tipos (Limpeza Opcional)

Os seguintes arquivos podem ser mantidos caso sejam usados por outras funcionalidades:
- `src/types/boldReportsViewer.d.ts` - pode ser removido pois era específico do viewer

---

### Resultado Esperado

- A aplicação mantém a listagem de relatórios
- A funcionalidade de exportação (PDF, Excel, Word, CSV) continua funcionando
- O botão "Visualizar" desaparece do painel de exportação
- Nenhum erro relacionado ao Bold Reports Viewer aparecerá no console

---

### Seção Técnica

**Dependências que podem ser removidas do `package.json` (opcional, para limpeza futura):**
- `@boldreports/react-reporting-components`
- `jquery`
- `create-react-class`

Porém, como a exportação pode usar partes dessas dependências internamente, recomendo não removê-las agora para evitar quebrar a funcionalidade de exportação.
