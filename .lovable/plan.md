
# Plano: Corrigir Responsividade e Scroll Independente dos Filtros

## Problemas Identificados

### 1. Layout Quebrando ao Aplicar Filtros
Quando os filtros são aplicados e o botão "Gerar" é clicado:
- A sidebar de filtros não possui altura máxima definida
- O conteúdo expande sem contenção adequada
- O `sticky top-24` não funciona corretamente sem altura definida no container

### 2. Scroll dos Filtros Afeta a Página Inteira
Atualmente:
- Ao scrollar os filtros, toda a página sobe
- Não há scroll independente para a área de filtros
- O scrollbar padrão ocupa espaço visual

## Solução Proposta

### Arquitetura de Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ ReportsHeader (sticky top-0)                     height: ~72px│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ main (height: calc(100vh - 72px), overflow: hidden)         │
│                                                             │
│  ┌───────────────┐  ┌─────────────────────────────────────┐ │
│  │ FiltersSidebar │  │ DataTable Area                      │ │
│  │               │  │                                     │ │
│  │ max-height:   │  │ (scroll vertical próprio)           │ │
│  │ calc(100vh    │  │                                     │ │
│  │ - header      │  │                                     │ │
│  │ - padding)    │  │                                     │ │
│  │               │  │                                     │ │
│  │ scroll:       │  │                                     │ │
│  │ independente  │  │                                     │ │
│  │ (thin)        │  │                                     │ │
│  └───────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Alterações Necessárias

### 1. ReportsDashboard.tsx - Layout Principal

Modificar a estrutura para:
- Definir altura fixa do container principal baseada em viewport
- Usar `flex` com `min-h-0` para permitir scroll nos filhos
- Remover `min-h-screen` que causa overflow

```text
Antes:
  <div className="min-h-screen bg-background">
    <main className="container...">
      <div className="grid grid-cols-1 lg:grid-cols-4">
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24">
            <FiltersSidebar />

Depois:
  <div className="h-screen flex flex-col bg-background overflow-hidden">
    <main className="flex-1 container... overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-4 h-full">
        <div className="hidden lg:block lg:col-span-1 h-full min-h-0">
          <FiltersSidebar />
```

### 2. FiltersSidebar.tsx - Scroll Independente

Adicionar ScrollArea com altura máxima calculada e scrollbar mínimo:

```text
Antes:
  <div className="bg-card rounded-lg border border-border p-4">
    <div className="flex items-center gap-2 mb-4...">Filtros</div>
    {reportType === 'bens-necessidade' && <BensNecessidadeFilters />}

Depois:
  <div className="bg-card rounded-lg border border-border flex flex-col 
                  max-h-[calc(100vh-180px)] overflow-hidden">
    <div className="flex items-center gap-2 p-4 pb-3 border-b...">Filtros</div>
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-4 pt-3">
        {reportType === 'bens-necessidade' && <BensNecessidadeFilters />}
      </div>
    </ScrollArea>
  </div>
```

### 3. ScrollBar - Scrollbar Mínimo

Modificar o componente ScrollBar para ter largura mínima:

```text
Antes:
  orientation === "vertical" && "h-full w-2.5 border-l..."

Depois:
  orientation === "vertical" && "h-full w-1.5 border-l..."
```

### 4. CSS Global - Estilo de Scrollbar Fino

Adicionar estilos para scrollbar nativo fino como fallback:

```text
/* Scrollbar fino para áreas de filtro */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/reports/ReportsDashboard.tsx` | Ajustar layout para altura fixa baseada em viewport |
| `src/components/reports/FiltersSidebar.tsx` | Adicionar ScrollArea com altura máxima e scroll independente |
| `src/components/ui/scroll-area.tsx` | Reduzir largura do scrollbar vertical para mínimo |
| `src/index.css` | Adicionar estilos de scrollbar fino como fallback |

## Detalhes Técnicos

### Cálculo de Altura Máxima dos Filtros

```text
max-h-[calc(100vh-180px)]

Onde:
- 100vh = altura total da viewport
- 72px = altura do header
- 24px = padding superior do main
- 24px = padding inferior do main
- ~60px = margem de segurança para tabs e espaçamento
```

### Prevenção de Layout Shift

Para evitar quebra de layout quando o estado de loading é ativado:

- O DataTable já usa `<Skeleton>` que mantém altura consistente
- O FiltersSidebar terá altura máxima fixa, impedindo expansão
- O grid usa `min-h-0` para permitir que filhos com `flex-1` respeitem limites

### Comportamento do Scroll Independente

```text
Interação do usuário:
  │
  ├─ Scroll dentro da área de filtros
  │   └─ Apenas os filtros rolam (ScrollArea interno)
  │   └─ Página principal permanece fixa
  │
  └─ Scroll fora da área de filtros
      └─ Comportamento normal do navegador
```

## Resultado Esperado

1. Layout não quebra ao aplicar filtros ou gerar relatório
2. Filtros têm scroll independente que não afeta a página
3. Scrollbar dos filtros é fino e discreto
4. Altura dos componentes é calculada dinamicamente baseada na viewport
5. Experiência responsiva mantida em diferentes tamanhos de tela
