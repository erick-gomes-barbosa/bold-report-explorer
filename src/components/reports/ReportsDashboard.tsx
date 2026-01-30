import { useState, useCallback } from 'react';
import { Package, ClipboardList, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportsHeader } from '@/components/reports/ReportsHeader';
import { FiltersSidebar } from '@/components/reports/FiltersSidebar';
import { MobileFiltersDrawer } from '@/components/reports/MobileFiltersDrawer';
import { DataTable, Column } from '@/components/reports/DataTable';
import { ExportDropdown } from '@/components/reports/ExportDropdown';
import { Badge } from '@/components/ui/badge';
import { useReportsData } from '@/hooks/useReportsData';
import { toast } from 'sonner';
import type { ReportType, ReportDataItem, ExportFormat } from '@/types/reports';

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
    loading, 
    error, 
    pagination,
    fetchReportData,
    exportData,
    changePage,
    clearData,
  } = useReportsData();

  const handleTabChange = (value: string) => {
    const newTab = value as ReportType;
    setActiveTab(newTab);
    clearData();
    setCurrentFilters(null);
  };

  const handleFiltersSubmit = useCallback((filters: unknown) => {
    setCurrentFilters(filters);
    fetchReportData(activeTab, filters, 0);
    toast.success('Relatório gerado com sucesso!');
  }, [activeTab, fetchReportData]);

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

  const columns = getColumns(activeTab);

  return (
    <div className="min-h-screen bg-background">
      <ReportsHeader />

      <main className="container max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24">
                <FiltersSidebar
                  reportType={activeTab}
                  onSubmit={handleFiltersSubmit}
                  loading={loading}
                />
              </div>
            </div>

            {/* Data Table Area */}
            <div className="lg:col-span-3">
              <TabsContent value="bens-necessidade" className="mt-0">
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
                />
              </TabsContent>

              <TabsContent value="inventario" className="mt-0">
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
                />
              </TabsContent>

              <TabsContent value="auditoria" className="mt-0">
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
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
