import { useEffect, useState } from 'react';
import { FileText, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReportCard } from '@/components/ReportCard';
import { ExportPanel } from '@/components/ExportPanel';
import { useBoldReports } from '@/hooks/useBoldReports';
import { toast } from 'sonner';
import type { BoldReport, ExportFormat } from '@/types/boldReports';

const Index = () => {
  const { 
    reports, 
    parameters, 
    loading, 
    error, 
    fetchReports, 
    fetchParameters, 
    exportReport,
    clearError 
  } = useBoldReports();
  
  const [selectedReport, setSelectedReport] = useState<BoldReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (selectedReport) {
      fetchParameters(selectedReport.Id);
    }
  }, [selectedReport, fetchParameters]);

  const handleExport = async (format: ExportFormat, params: Record<string, string | string[]>) => {
    if (!selectedReport) return;
    
    const success = await exportReport(selectedReport.Id, format, params);
    if (success) {
      toast.success('Relatório exportado com sucesso!');
    } else {
      toast.error('Erro ao exportar relatório');
    }
  };

  const filteredReports = reports.filter(report =>
    report.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.CategoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Bold Reports</h1>
                <p className="text-sm text-muted-foreground">MVP de Testes</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchReports()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" onClick={clearError}>
                Fechar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar relatórios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredReports.length} relatório{filteredReports.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading && reports.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum relatório encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredReports.map((report) => (
                  <ReportCard
                    key={report.Id}
                    report={report}
                    isSelected={selectedReport?.Id === report.Id}
                    onClick={() => setSelectedReport(report)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Export Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {selectedReport ? (
                <ExportPanel
                  report={selectedReport}
                  parameters={parameters}
                  loading={loading}
                  onExport={handleExport}
                />
              ) : (
                <div className="bg-muted/50 rounded-lg p-8 text-center border border-dashed border-border">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Selecione um relatório para visualizar opções de exportação
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
