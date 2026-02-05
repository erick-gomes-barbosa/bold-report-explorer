import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, ClipboardList, Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportsHeader } from '@/components/reports/ReportsHeader';
import { FiltersSidebar } from '@/components/reports/FiltersSidebar';
import { MobileFiltersDrawer } from '@/components/reports/MobileFiltersDrawer';
import { DataTable, Column } from '@/components/reports/DataTable';
import { ExportDropdown } from '@/components/reports/ExportDropdown';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useReportsData } from '@/hooks/useReportsData';
import { toast } from 'sonner';
import type { ReportType, ReportDataItem, ExportFormat } from '@/types/reports';

// Função para formatar datas vindas do CSV
const formatDateValue = (value: unknown): React.ReactNode => {
  if (!value || value === '-' || value === '') return '-';
  
  const strValue = String(value).trim();
  
  // Tenta parsear formato americano: "1/24/2026 5:56:16 AM" ou "1/24/2026"
  const usDateMatch = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usDateMatch) {
    const [, month, day, year] = usDateMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  }
  
  // Tenta parsear como ISO date (2026-01-24T...)
  try {
    const date = parseISO(strValue);
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  } catch {}
  
  // Tenta parsear como timestamp numérico
  const numValue = Number(strValue);
  if (!isNaN(numValue) && numValue > 946684800000) { // > ano 2000
    const date = new Date(numValue);
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  }
  
  return strValue; // Retorna original se não conseguir parsear
};

// Formatadores de células para campos específicos
const cellFormatters: Record<string, (value: unknown) => React.ReactNode> = {
  'Situação': (value) => {
    const situacao = String(value);
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'em_uso': 'default',
      'em_estoque': 'secondary',
      'em_manutencao': 'outline',
      'desativado': 'destructive',
    };
    const labels: Record<string, string> = {
      'em_uso': 'Em Uso',
      'em_estoque': 'Em Estoque',
      'em_manutencao': 'Em Manutenção',
      'desativado': 'Desativado',
    };
    return <Badge variant={variants[situacao] || 'default'}>{labels[situacao] || situacao}</Badge>;
  },
  'Conservação': (value) => {
    const conservacao = String(value);
    const colors: Record<string, string> = {
      'novo': 'text-green-600',
      'bom': 'text-blue-600',
      'regular': 'text-yellow-600',
      'ruim': 'text-destructive',
    };
    const labels: Record<string, string> = {
      'novo': 'Novo',
      'bom': 'Bom',
      'regular': 'Regular',
      'ruim': 'Ruim',
    };
    return <span className={colors[conservacao] || ''}>{labels[conservacao] || conservacao}</span>;
  },
  'Valor': (value) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return String(value);
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  },
  // Formatadores de data
  'Data Início': formatDateValue,
  'Data Fim': formatDateValue,
  'Data Aquisição': formatDateValue,
};

// Column definitions for each report type
const bensNecessidadeColumns: Column<ReportDataItem>[] = [
  { id: 'patrimonio', header: 'Patrimônio', accessorKey: 'patrimonio' },
  { id: 'descricao', header: 'Descrição', accessorKey: 'descricao' },
  { id: 'grupo', header: 'Grupo', accessorKey: 'grupo' },
  { 
    id: 'situacao', 
    header: 'Situação', 
    accessorKey: 'situacao',
    cell: (value) => (
      <Badge variant={value === 'Ativo' ? 'default' : value === 'Inativo' ? 'secondary' : 'outline'}>
        {String(value)}
      </Badge>
    )
  },
  { 
    id: 'conservacao', 
    header: 'Conservação', 
    accessorKey: 'conservacao',
    cell: (value) => {
      const colors: Record<string, string> = {
        'Ótimo': 'text-green-600',
        'Bom': 'text-blue-600',
        'Regular': 'text-yellow-600',
        'Ruim': 'text-orange-600',
        'Péssimo': 'text-red-600',
      };
      return <span className={colors[String(value)] || ''}>{String(value)}</span>;
    }
  },
  { 
    id: 'valorAquisicao', 
    header: 'Valor (R$)', 
    accessorKey: 'valorAquisicao',
    cell: (value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  },
  { id: 'dataAquisicao', header: 'Data Aquisição', accessorKey: 'dataAquisicao' },
  { id: 'unidade', header: 'Unidade', accessorKey: 'unidade' },
];

const inventarioColumns: Column<ReportDataItem>[] = [
  { id: 'codigo', header: 'Código', accessorKey: 'codigo' },
  { id: 'tipo', header: 'Tipo', accessorKey: 'tipo' },
  { id: 'unidade', header: 'Unidade', accessorKey: 'unidade' },
  { 
    id: 'status', 
    header: 'Status', 
    accessorKey: 'status',
    cell: (value) => {
      const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        'Pendente': 'secondary',
        'Em Andamento': 'default',
        'Concluído': 'outline',
        'Cancelado': 'destructive',
      };
      return <Badge variant={variants[String(value)] || 'default'}>{String(value)}</Badge>;
    }
  },
  { id: 'totalItens', header: 'Total Itens', accessorKey: 'totalItens' },
  { id: 'itensVerificados', header: 'Verificados', accessorKey: 'itensVerificados' },
  { 
    id: 'divergencias', 
    header: 'Divergências', 
    accessorKey: 'divergencias',
    cell: (value) => (
      <span className={Number(value) > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
        {String(value)}
      </span>
    )
  },
  { id: 'dataInicio', header: 'Data Início', accessorKey: 'dataInicio' },
  { id: 'responsavel', header: 'Responsável', accessorKey: 'responsavel' },
];

const auditoriaColumns: Column<ReportDataItem>[] = [
  { id: 'processo', header: 'Processo', accessorKey: 'processo' },
  { id: 'orgao', header: 'Órgão', accessorKey: 'orgao' },
  { id: 'unidade', header: 'Unidade', accessorKey: 'unidade' },
  { id: 'setor', header: 'Setor', accessorKey: 'setor' },
  { id: 'tipoAuditoria', header: 'Tipo', accessorKey: 'tipoAuditoria' },
  { 
    id: 'situacao', 
    header: 'Situação', 
    accessorKey: 'situacao',
    cell: (value) => {
      const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        'Em análise': 'default',
        'Concluída': 'outline',
        'Pendência': 'destructive',
      };
      return <Badge variant={variants[String(value)] || 'default'}>{String(value)}</Badge>;
    }
  },
  { id: 'periodo', header: 'Período', accessorKey: 'periodo' },
  { id: 'observacoes', header: 'Observações', accessorKey: 'observacoes' },
];

const getColumns = (reportType: ReportType): Column<ReportDataItem>[] => {
  switch (reportType) {
    case 'bens-necessidade':
      return bensNecessidadeColumns;
    case 'inventario':
      return inventarioColumns;
    case 'auditoria':
      return auditoriaColumns;
    default:
      return [];
  }
};

export function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState<ReportType>('bens-necessidade');
  const [currentFilters, setCurrentFilters] = useState<unknown>(null);
  
  const { 
    data, 
    columns: csvColumns,
    loading,
    exporting,
    error,
    hasNoResults,
    hasSearched,
    pagination,
    fetchReportData,
    exportData,
    changePage,
    clearData,
  } = useReportsData();

  // Gera colunas dinâmicas baseadas nos headers do CSV
  const dynamicColumns = useMemo((): Column<ReportDataItem>[] => {
    if (csvColumns.length === 0) {
      return [];
    }
    
    return csvColumns.map(header => ({
      id: header,
      header: header,
      accessorKey: header,
      cell: cellFormatters[header] || undefined,
    }));
  }, [csvColumns]);

  const handleTabChange = (value: string) => {
    const newTab = value as ReportType;
    setActiveTab(newTab);
    clearData();
    setCurrentFilters(null);
  };

  const handleFiltersSubmit = useCallback(async (filters: unknown) => {
    setCurrentFilters(filters);
    try {
      await fetchReportData(activeTab, filters, 0);
    } catch (err) {
      toast.error('Erro ao gerar relatório');
    }
  }, [activeTab, fetchReportData]);

  // Ref para evitar toasts duplicados
  const lastToastRef = useRef<{ hasSearched: boolean; hasNoResults: boolean; dataLength: number } | null>(null);

  // Exibir toast apropriado após o fetch
  useEffect(() => {
    if (loading) return;
    
    const current = { hasSearched, hasNoResults, dataLength: data.length };
    const last = lastToastRef.current;
    
    // Evitar disparar toast se o estado não mudou
    if (last && 
        last.hasSearched === current.hasSearched && 
        last.hasNoResults === current.hasNoResults && 
        last.dataLength === current.dataLength) {
      return;
    }
    
    lastToastRef.current = current;
    
    if (hasSearched && !error) {
      if (hasNoResults) {
        toast.warning('Nenhum registro encontrado para os filtros selecionados');
      } else if (data.length > 0) {
        toast.success('Relatório gerado com sucesso!');
      }
    }
  }, [hasSearched, hasNoResults, loading, error, data.length]);

  const handlePageChange = useCallback((page: number) => {
    changePage(page);
    if (currentFilters) {
      fetchReportData(activeTab, currentFilters, page);
    }
  }, [activeTab, currentFilters, changePage, fetchReportData]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!currentFilters) {
      toast.error('Gere o relatório primeiro antes de exportar');
      return;
    }
    
    const success = await exportData(activeTab, format, currentFilters);
    if (success) {
      toast.success(`Exportação em ${format.toUpperCase()} iniciada!`);
    } else {
      toast.error('Erro ao exportar relatório');
    }
  }, [activeTab, currentFilters, exportData]);

  // Use colunas dinâmicas do CSV ou fallback para colunas estáticas
  const columns = dynamicColumns.length > 0 ? dynamicColumns : getColumns(activeTab);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <ReportsHeader />

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-6 overflow-hidden flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
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

            <div className="flex items-center gap-2">
              <MobileFiltersDrawer
                reportType={activeTab}
                onSubmit={handleFiltersSubmit}
                loading={loading}
              />
              <ExportDropdown 
                onExport={handleExport} 
                disabled={data.length === 0}
                loading={loading}
                exporting={exporting}
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 mt-6 overflow-hidden">
            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0 min-h-0 max-h-full">
              <FiltersSidebar
                reportType={activeTab}
                onSubmit={handleFiltersSubmit}
                loading={loading}
              />
            </div>

            {/* Data Table Area */}
            <div className="flex-1 min-w-0 min-h-0 overflow-auto">
              <TabsContent value="bens-necessidade" className="mt-0 h-full">
                <DataTable
                  data={data}
                  columns={columns}
                  loading={loading}
                  error={error}
                  pageIndex={pagination.pageIndex}
                  pageSize={pagination.pageSize}
                  totalCount={pagination.totalCount}
                  onPageChange={handlePageChange}
                  emptyMessage="Clique em 'Gerar' para visualizar os bens"
                  noResultsMessage="Nenhum bem encontrado para os filtros aplicados"
                  hasSearched={hasSearched}
                />
              </TabsContent>

              <TabsContent value="inventario" className="mt-0 h-full">
                <DataTable
                  data={data}
                  columns={columns}
                  loading={loading}
                  error={error}
                  pageIndex={pagination.pageIndex}
                  pageSize={pagination.pageSize}
                  totalCount={pagination.totalCount}
                  onPageChange={handlePageChange}
                  emptyMessage="Clique em 'Gerar' para visualizar os inventários"
                  noResultsMessage="Nenhum inventário encontrado para os filtros aplicados"
                  hasSearched={hasSearched}
                />
              </TabsContent>

              <TabsContent value="auditoria" className="mt-0 h-full">
                <DataTable
                  data={data}
                  columns={columns}
                  loading={loading}
                  error={error}
                  pageIndex={pagination.pageIndex}
                  pageSize={pagination.pageSize}
                  totalCount={pagination.totalCount}
                  onPageChange={handlePageChange}
                  emptyMessage="Clique em 'Gerar' para visualizar as auditorias"
                  noResultsMessage="Nenhuma auditoria encontrada para os filtros aplicados"
                  hasSearched={hasSearched}
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </main>

      {/* Overlay de exportação */}
      {exporting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-6 flex flex-col items-center gap-4 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Exportando relatório...</p>
              <p className="text-sm text-muted-foreground">Aguarde enquanto preparamos o arquivo</p>
            </div>
            <Progress className="w-48" />
          </Card>
        </div>
      )}
    </div>
  );
}
