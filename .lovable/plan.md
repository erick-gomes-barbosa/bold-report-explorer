
## Plano de Tratativas Responsivas para Botões de Ação

### Diagnóstico do Problema

O layout atual apresenta um conflito de breakpoints:

| Breakpoint | Layout Grid | Largura do ExportPanel | Texto nos Botões |
|------------|-------------|------------------------|------------------|
| < 640px (sm) | 1 coluna | 100% viewport | Escondido |
| 640px - 1024px | 1 coluna | 100% viewport | Escondido |
| >= 1024px (lg) | 3 colunas | ~33% viewport (~350-450px) | **Visível (problema!)** |

O texto aparece exatamente quando o container fica mais estreito, causando a quebra visual.

---

### Solução Proposta: Breakpoint Personalizado + Ajustes de Layout

#### Fase 1: Criar breakpoint customizado para containers estreitos

Adicionar um breakpoint `xl` (1280px) para exibir texto nos botões somente quando há espaço suficiente:

```typescript
// tailwind.config.ts - Não precisa alteração, xl já existe (1280px)
```

#### Fase 2: Atualizar ExportPanel.tsx

**Alteração 1** - Botões de formato de exportação (grid 4 colunas):

```typescript
// DE:
<span className="hidden lg:inline">{label}</span>

// PARA:
<span className="hidden xl:inline">{label}</span>
```

**Alteração 2** - Botões Visualizar e Exportar:

```typescript
// DE:
<span className="hidden lg:inline">Visualizar</span>
<span className="hidden lg:inline">Exportar</span>
<span className="hidden lg:inline">Exportando...</span>

// PARA:
<span className="hidden xl:inline">Visualizar</span>
<span className="hidden xl:inline">Exportar</span>
<span className="hidden xl:inline">Exportando...</span>
```

**Alteração 3** - Melhorar layout dos botões de ação para garantir que não quebrem:

```typescript
// DE:
<div className="flex flex-col sm:flex-row gap-2">

// PARA:
<div className="flex gap-2">
```

Remover `flex-col` para manter os botões sempre lado a lado (já que terão apenas ícones em telas menores).

**Alteração 4** - Adicionar `min-w-0` e `shrink-0` para evitar compressão excessiva:

```typescript
<Button 
  ...
  className="flex-1 gap-2 min-w-0"
>
```

#### Fase 3: Adicionar Tooltips para acessibilidade

Quando os botões mostram apenas ícones, é importante que o usuário saiba o que cada um faz. Utilizaremos o componente `Tooltip` existente:

```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Envolver cada botão com Tooltip quando estiver em modo ícone
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button ...>
        <Eye className="h-4 w-4" />
        <span className="hidden xl:inline">Visualizar</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent className="xl:hidden">
      <p>Visualizar</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ExportPanel.tsx` | Trocar `lg:inline` por `xl:inline` em todos os textos de botões |
| `src/components/ExportPanel.tsx` | Alterar container de botões para `flex gap-2` (remover `flex-col sm:flex-row`) |
| `src/components/ExportPanel.tsx` | Adicionar Tooltips aos botões de ação |

---

### Comportamento Esperado Após Correção

| Largura Viewport | Layout | Botões de Formato | Botões de Ação |
|------------------|--------|-------------------|----------------|
| < 640px | 1 coluna | Apenas ícones | Apenas ícones + Tooltip |
| 640px - 1024px | 1 coluna | Apenas ícones | Apenas ícones + Tooltip |
| 1024px - 1280px | 3 colunas (painel estreito) | Apenas ícones | Apenas ícones + Tooltip |
| >= 1280px | 3 colunas (painel com mais espaço) | Ícones + Texto | Ícones + Texto |

---

### Seção Tecnica

**Por que `xl` e não um breakpoint customizado?**

- O breakpoint `xl` (1280px) é o ponto onde o painel de 1/3 da largura (~426px) tem espaço suficiente para texto
- Em `lg` (1024px), o painel tem apenas ~341px, insuficiente para botões com texto
- Usar breakpoints nativos do Tailwind mantém consistência e evita configuração adicional

**Cálculo:**
- Viewport 1024px: container max-width ~1024px - padding = ~992px, 1/3 = ~330px
- Viewport 1280px: container max-width ~1280px - padding = ~1248px, 1/3 = ~416px
- Texto "Exportar" + ícone + gap precisa de ~120px mínimo por botão, 2 botões = 240px + margins
