
# Plano: Corrigir Scroll e Corte de Filtros em Telas Pequenas

## Problema Identificado

Analisando a imagem enviada e o código atual:

1. **Filtros estao sendo cortados**: A `max-h-[calc(100vh-180px)]` aplicada ao FiltersSidebar nao esta funcionando corretamente em telas menores porque:
   - O container pai usa `grid` sem altura explicita
   - O `min-h-0` no container do grid nao esta propagando corretamente para os filhos
   - Em telas pequenas (notebooks), o calculo de 180px de offset pode nao ser suficiente

2. **ScrollArea nao esta funcionando**: O componente `ScrollArea` do Radix UI precisa de uma altura explicita no container pai para funcionar corretamente. Atualmente:
   - O grid container nao tem altura definida
   - O `flex-1 min-h-0` no ScrollArea nao tem referencia de altura maxima

## Causa Raiz

```text
Estrutura atual com problema:

<main className="flex-1 container... overflow-hidden flex flex-col min-h-0">
  <Tabs className="flex-1 flex flex-col min-h-0">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 mt-6">
      │
      ├── <div className="hidden lg:block lg:col-span-1 min-h-0">  ← SEM ALTURA DEFINIDA
      │     <FiltersSidebar max-h-[calc(100vh-180px)]/>
      │
      └── <div className="lg:col-span-3 min-h-0 overflow-auto">
            <DataTable/>

Problema: O grid nao propaga altura corretamente para os filhos em viewports menores
```

## Solucao Proposta

### 1. Usar Flexbox ao inves de Grid no Layout Principal

Substituir o grid por flexbox que propaga altura de forma mais previsivel:

```text
Antes: grid grid-cols-1 lg:grid-cols-4
Depois: flex flex-col lg:flex-row
```

### 2. Ajustar FiltersSidebar para Altura Responsiva

Usar altura relativa ao container ao inves de calculo fixo de viewport:

```text
Antes: max-h-[calc(100vh-180px)]
Depois: h-full max-h-full (altura do container pai) com overflow interno
```

### 3. Garantir Propagacao de Altura no Container

Adicionar altura explicita no container dos filtros:

```text
<div className="hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0 h-full">
```

## Alteracoes Detalhadas

### Arquivo: ReportsDashboard.tsx

**Mudanca na area do grid (linha 272):**

```text
Antes:
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 mt-6">
  <div className="hidden lg:block lg:col-span-1 min-h-0">
    <FiltersSidebar ... />
  </div>
  <div className="lg:col-span-3 min-h-0 overflow-auto">

Depois:
<div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 mt-6 overflow-hidden">
  <div className="hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0 min-h-0 max-h-full">
    <FiltersSidebar ... />
  </div>
  <div className="flex-1 min-w-0 min-h-0 overflow-auto">
```

### Arquivo: FiltersSidebar.tsx

**Mudanca no container principal (linha 16):**

```text
Antes:
<div className="bg-card rounded-lg border border-border flex flex-col max-h-[calc(100vh-180px)] overflow-hidden">

Depois:
<div className="bg-card rounded-lg border border-border flex flex-col h-full overflow-hidden">
```

Esta mudanca faz o FiltersSidebar ocupar 100% da altura do container pai, que agora tem altura controlada pelo flexbox.

### Arquivo: scroll-area.tsx

Garantir que o Viewport tenha `overflow-y-auto`:

```text
Linha 11 - adicionar overflow explicito:
<ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] overflow-y-auto">
```

## Estrutura Final

```text
<main className="flex-1 ... overflow-hidden flex flex-col min-h-0">
  │
  └── <Tabs className="flex-1 flex flex-col min-h-0">
        │
        ├── TabsList (flex-shrink-0)
        │
        └── <div className="flex flex-row ... flex-1 min-h-0 overflow-hidden">
              │
              ├── <div className="lg:w-72 flex-shrink-0 min-h-0 max-h-full">
              │     │
              │     └── <FiltersSidebar className="h-full">
              │           │
              │           ├── Header (flex-shrink-0)
              │           │
              │           └── <ScrollArea className="flex-1 min-h-0">
              │                 └── Filtros (scroll interno)
              │
              └── <div className="flex-1 min-w-0 overflow-auto">
                    └── DataTable
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/reports/ReportsDashboard.tsx` | Trocar grid por flexbox, adicionar largura fixa ao container de filtros |
| `src/components/reports/FiltersSidebar.tsx` | Usar `h-full` ao inves de `max-h-[calc(...)]` |
| `src/components/ui/scroll-area.tsx` | Adicionar overflow explicito no Viewport |

## Beneficios da Solucao

1. **Flexbox propaga altura corretamente** - Diferente do grid, flexbox com `min-h-0` garante que filhos respeitem limites
2. **Largura fixa para filtros** - `lg:w-72 xl:w-80` garante espaco consistente independente do conteudo
3. **Scroll independente funcional** - Com altura explicita, o ScrollArea funcionara corretamente
4. **Responsivo** - Em telas menores que `lg`, os filtros ficam no drawer mobile (comportamento existente)
5. **Nao corta conteudo** - `h-full` + container com altura propagada garante que filtros preencham o espaco disponivel

## Teste de Validacao

Apos implementacao, verificar:
1. Em tela de notebook (1366x768), filtros devem ser visiveis e scrollaveis
2. Scroll dentro dos filtros nao deve afetar pagina principal
3. Botao "Gerar" deve estar sempre visivel na area de filtros
4. DataTable deve ter seu proprio scroll independente
