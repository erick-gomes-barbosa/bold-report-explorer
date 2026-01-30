
## Plano: Corrigir Sobreposição de Botões de Fechar no Modal

### Problema Identificado

O componente `DialogContent` em `src/components/ui/dialog.tsx` (linha 45-48) renderiza automaticamente um botão de fechar (X) com posição `absolute right-4 top-4`. Esse botão está sobrepondo os botões no `DialogHeader` do `ReportViewer.tsx` (Exportar e Tela Cheia), pois ambos ficam no canto superior direito.

### Análise Visual

```text
┌─────────────────────────────────────────────────────────────┐
│ DialogHeader (com px-4 py-3)                                │
│                                                             │
│  [Título do Relatório]         [Exportar] [Tela Cheia]      │
│                                                   ▲         │
│                                                   │         │
│                              Botão X do Dialog ───┘         │
│                              (position: absolute            │
│                               right-4 top-4)                │
│                              SOBREPÕE os botões!            │
└─────────────────────────────────────────────────────────────┘
```

### Solução Proposta

Existem duas abordagens possíveis:

**Opção A - Remover o botão do DialogContent (Recomendada)**
Modificar o componente `dialog.tsx` para aceitar uma prop `hideCloseButton` e condicionalmente não renderizar o botão X embutido.

**Opção B - Adicionar botão X customizado no ReportViewer**
Restaurar o botão X que foi removido anteriormente no `ReportViewer.tsx` e ajustar o `dialog.tsx` para não renderizar o botão padrão.

Vou implementar a **Opção A** (mais limpa e reutilizável).

---

### Mudanças a Implementar

#### 1. Arquivo: `src/components/ui/dialog.tsx`

Adicionar prop opcional `hideCloseButton` ao `DialogContent` para controlar a exibição do botão X:

```typescript
// Antes (linhas 30-52)
const DialogContent = React.forwardRef<...>(
  ({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content ...>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 ...">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);

// Depois
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<...>(
  ({ className, children, hideCloseButton = false, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content ...>
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 ...">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
```

#### 2. Arquivo: `src/components/ReportViewer.tsx`

1. Adicionar `hideCloseButton` ao `DialogContent` para remover o botão automático
2. Restaurar o botão X customizado no `DialogHeader`, após os botões existentes

**Alteração no DialogContent (linha 244):**
```typescript
<DialogContent 
  hideCloseButton  // Adicionar esta prop
  className={`...`}
>
```

**Adicionar botão X no DialogHeader (após linha 296):**
```typescript
import { X } from 'lucide-react'; // Adicionar ao import

// No DialogHeader, após o botão de Tela Cheia:
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  onClick={onClose}
  title="Fechar"
>
  <X className="h-4 w-4" />
</Button>
```

---

### Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────┐
│ DialogHeader                                                │
│                                                             │
│  [Título]              [Exportar] [Tela Cheia] [X Fechar]   │
│                                                             │
│  Sem sobreposição - botões alinhados horizontalmente        │
└─────────────────────────────────────────────────────────────┘
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/dialog.tsx` | Adicionar prop `hideCloseButton` ao `DialogContent` |
| `src/components/ReportViewer.tsx` | Usar `hideCloseButton` e adicionar botão X customizado no header |
