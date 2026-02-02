

# Plano: Corrigir Estouro de DIV em Mobile e Adicionar IDs de Navegacao

## Problemas Identificados

### 1. Estouro de DIV na Navegacao Mobile
O texto "Bens por Necessidade" e extende alem do limite do TabsTrigger porque:
- O componente TabsTrigger possui `whitespace-nowrap` por padrao
- O TabsList usa `grid-cols-3` que divide igualmente o espaco
- Nao ha truncamento ou abreviacao do texto em telas pequenas

### 2. Ausencia de IDs para Testes Automatizados
Os elementos de navegacao (TabsTrigger) nao possuem IDs, dificultando a automacao de testes.

## Solucao Proposta

### 1. Ajustar Layout do TabsList para Mobile

Modificar o TabsList para permitir que os triggers se ajustem ao conteudo em vez de forcarem divisao igual:

```text
Antes:
<TabsList className="grid w-full sm:w-auto grid-cols-3">

Depois:
<TabsList className="flex flex-wrap w-full sm:w-auto gap-1">
```

### 2. Remover whitespace-nowrap dos Triggers em Mobile

Permitir que o texto quebre em mobile, mas mantenha em uma linha em telas maiores:

```text
Antes:
<TabsTrigger value="bens-necessidade" className="gap-2">

Depois:
<TabsTrigger 
  value="bens-necessidade" 
  id="tab-bens-necessidade"
  className="gap-2 flex-1 sm:flex-none whitespace-normal sm:whitespace-nowrap text-center"
>
```

### 3. Usar Texto Abreviado em Mobile

Usar textos mais curtos em telas pequenas:

```text
Antes:
<span className="text-xs sm:text-sm">Bens por Necessidade</span>

Depois:
<span className="hidden sm:inline text-sm">Bens por Necessidade</span>
<span className="sm:hidden text-xs">Bens</span>
```

### 4. Adicionar IDs aos Elementos de Navegacao

Adicionar IDs unicos para facilitar testes automatizados:

| Elemento | ID |
|----------|-----|
| Tab Bens por Necessidade | `tab-bens-necessidade` |
| Tab Inventario | `tab-inventario` |
| Tab Auditoria | `tab-auditoria` |
| TabsList | `tabs-list-reports` |
| Botao Filtros Mobile | `btn-mobile-filters` |

## Alteracoes Detalhadas

### Arquivo: ReportsDashboard.tsx

**Linhas 243-256 - Modificar TabsList e TabsTriggers:**

```text
Antes:
<TabsList className="grid w-full sm:w-auto grid-cols-3">
  <TabsTrigger value="bens-necessidade" className="gap-2">
    <Package className="h-4 w-4 hidden sm:inline" />
    <span className="text-xs sm:text-sm">Bens por Necessidade</span>
  </TabsTrigger>
  <TabsTrigger value="inventario" className="gap-2">
    <ClipboardList className="h-4 w-4 hidden sm:inline" />
    <span className="text-xs sm:text-sm">Inventário</span>
  </TabsTrigger>
  <TabsTrigger value="auditoria" className="gap-2">
    <Search className="h-4 w-4 hidden sm:inline" />
    <span className="text-xs sm:text-sm">Auditoria</span>
  </TabsTrigger>
</TabsList>

Depois:
<TabsList id="tabs-list-reports" className="flex flex-wrap w-full sm:w-auto gap-1">
  <TabsTrigger 
    value="bens-necessidade" 
    id="tab-bens-necessidade"
    className="gap-1.5 flex-1 sm:flex-none min-w-0"
  >
    <Package className="h-4 w-4 hidden sm:inline flex-shrink-0" />
    <span className="hidden sm:inline text-sm truncate">Bens por Necessidade</span>
    <span className="sm:hidden text-xs">Bens</span>
  </TabsTrigger>
  <TabsTrigger 
    value="inventario" 
    id="tab-inventario"
    className="gap-1.5 flex-1 sm:flex-none min-w-0"
  >
    <ClipboardList className="h-4 w-4 hidden sm:inline flex-shrink-0" />
    <span className="hidden sm:inline text-sm truncate">Inventário</span>
    <span className="sm:hidden text-xs">Inventário</span>
  </TabsTrigger>
  <TabsTrigger 
    value="auditoria" 
    id="tab-auditoria"
    className="gap-1.5 flex-1 sm:flex-none min-w-0"
  >
    <Search className="h-4 w-4 hidden sm:inline flex-shrink-0" />
    <span className="hidden sm:inline text-sm truncate">Auditoria</span>
    <span className="sm:hidden text-xs">Auditoria</span>
  </TabsTrigger>
</TabsList>
```

### Arquivo: MobileFiltersDrawer.tsx

**Linha 23 - Adicionar ID ao botao de filtros mobile:**

```text
Antes:
<Button variant="outline" className="lg:hidden gap-2">

Depois:
<Button variant="outline" id="btn-mobile-filters" className="lg:hidden gap-2">
```

## Resumo dos IDs Adicionados

| Componente | ID | Finalidade |
|------------|-----|------------|
| TabsList | `tabs-list-reports` | Container da navegacao |
| Tab Bens | `tab-bens-necessidade` | Navegar para aba de bens |
| Tab Inventario | `tab-inventario` | Navegar para aba de inventario |
| Tab Auditoria | `tab-auditoria` | Navegar para aba de auditoria |
| Botao Filtros | `btn-mobile-filters` | Abrir drawer de filtros em mobile |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/reports/ReportsDashboard.tsx` | Ajustar layout de tabs e adicionar IDs |
| `src/components/reports/MobileFiltersDrawer.tsx` | Adicionar ID ao botao de filtros |

## Resultado Esperado

1. Em mobile, os tabs exibem texto abreviado ("Bens", "Inventario", "Auditoria")
2. Nenhum estouro de DIV na area de navegacao
3. Todos os elementos de navegacao possuem IDs para automacao de testes
4. Em desktop, os tabs exibem texto completo com icones
5. Layout responsivo funciona corretamente em todas as resolucoes

