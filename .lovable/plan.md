
# Plano: Separar Estados de Loading e Adicionar Indicador de Exportação

## Problema Identificado

Atualmente, o hook `useReportsData` utiliza um **único estado `loading`** para ambas as operações:
1. **Geração do relatório** (botão "Gerar")
2. **Exportação do relatório** (botão "Exportar")

Isso causa dois problemas:
- Ao clicar em "Exportar", o botão "Gerar" também entra em estado de loading
- Não há feedback visual claro de que a exportação está em andamento

---

## Solução Proposta

### 1. Separar estados de loading no hook

Criar dois estados distintos:
- `loading` - Para a geração do relatório (fetch de dados para a tabela)
- `exporting` - Para a exportação do arquivo

### 2. Adicionar indicador visual de exportação

Implementar um overlay ou toast persistente durante a exportação com:
- Barra de progresso indeterminada
- Ícone do formato sendo exportado
- Mensagem clara: "Exportando PDF..." / "Exportando Excel..."

---

## Alterações Técnicas

### Arquivo 1: `src/hooks/useReportsData.ts`

**Mudanças:**
- Adicionar estado `exporting` separado
- Usar `exporting` em vez de `loading` na função `exportData`
- Retornar ambos os estados no objeto do hook

```typescript
const [exporting, setExporting] = useState(false);

// Na função exportData:
const exportData = useCallback(async (...) => {
  setExporting(true);  // em vez de setLoading(true)
  try { ... }
  finally {
    setExporting(false);  // em vez de setLoading(false)
  }
}, []);

return {
  // ... estados existentes
  exporting,  // novo
};
```

---

### Arquivo 2: `src/components/reports/ReportsDashboard.tsx`

**Mudanças:**
- Extrair `exporting` do hook
- Passar apenas `loading` (não `exporting`) para `FiltersSidebar` e `MobileFiltersDrawer`
- Passar `exporting` para o `ExportDropdown`
- Adicionar componente de overlay durante a exportação

```typescript
const { 
  // ... outros estados
  exporting,
} = useReportsData();

// Overlay de exportação
{exporting && (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <Card className="p-6 flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center">
        <p className="font-medium">Exportando relatório...</p>
        <p className="text-sm text-muted-foreground">Aguarde enquanto preparamos o arquivo</p>
      </div>
      <Progress value={undefined} className="w-48" /> // Indeterminado
    </Card>
  </div>
)}
```

---

### Arquivo 3: `src/components/reports/ExportDropdown.tsx`

**Mudanças:**
- Adicionar prop `exporting` para controlar o estado do botão
- Mostrar spinner no botão durante exportação
- Desabilitar dropdown durante exportação

```typescript
interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;  // manter para compatibilidade, mas usar exporting
  exporting?: boolean;  // novo
}

<Button 
  variant="outline" 
  disabled={disabled || exporting}
  className="gap-2"
>
  {exporting ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Download className="h-4 w-4" />
  )}
  {exporting ? 'Exportando...' : 'Exportar'}
</Button>
```

---

## Fluxo Atualizado

```text
┌─────────────────────────────────────────────────────────────────┐
│                          ANTES                                   │
├─────────────────────────────────────────────────────────────────┤
│ Clique em "Gerar"  → loading = true  → Botão "Gerar": loading   │
│ Clique em "Exportar" → loading = true → Botão "Gerar": loading  │ ✗
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          DEPOIS                                  │
├─────────────────────────────────────────────────────────────────┤
│ Clique em "Gerar"   → loading = true   → Botão "Gerar": loading │
│ Clique em "Exportar" → exporting = true → Botão "Gerar": normal │ ✓
│                                         → Overlay de exportação  │ ✓
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useReportsData.ts` | Adicionar estado `exporting` separado |
| `src/components/reports/ReportsDashboard.tsx` | Usar `exporting`, adicionar overlay |
| `src/components/reports/ExportDropdown.tsx` | Adicionar suporte a `exporting`, atualizar UI |

---

## Comportamento Esperado

1. **Ao clicar em "Gerar":**
   - Botão "Gerar" mostra "Gerando..." com spinner
   - Botão "Exportar" permanece normal (mas desabilitado se não houver dados)

2. **Ao clicar em "Exportar":**
   - Botão "Gerar" permanece normal
   - Botão "Exportar" mostra "Exportando..." com spinner
   - Overlay modal aparece no centro da tela com:
     - Spinner animado
     - Texto "Exportando relatório..."
     - Subtexto "Aguarde enquanto preparamos o arquivo"
     - Barra de progresso (indeterminada)

3. **Ao concluir exportação:**
   - Overlay desaparece
   - Toast de sucesso aparece
   - Botão "Exportar" volta ao estado normal

---

## Notas Técnicas

- O estado `loading` continua sendo usado apenas para operações de fetch (geração da tabela)
- O estado `exporting` é exclusivo para operações de download
- O overlay usa `z-50` para garantir que fique acima de todo o conteúdo
- A barra de Progress com `value={undefined}` cria efeito de progresso indeterminado
