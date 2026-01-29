import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Maximize2, Minimize2, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BoldReport, ExportFormat } from '@/types/boldReports';
import type { BoldReportViewerInstance, BoldReportParameter } from '@/types/boldReportsViewer';
import { toast } from 'sonner';

interface ReportViewerProps {
  report: BoldReport;
  parameterValues: Record<string, string | string[]>;
  siteId: string;
  token: string;
  isOpen: boolean;
  onClose: () => void;
}

// URLs do Bold Reports Cloud
const BOLD_REPORTS_SERVICE_URL = 'https://service.boldreports.com/api/Viewer';
// Para Cloud tenants, o formato é: https://{siteId}.boldreports.com/reporting/api/
const getBoldReportsServerUrl = (siteId: string) => 
  `https://${siteId}.boldreports.com/reporting/api/`;

// Formatos de exportação disponíveis
const exportFormats: { format: ExportFormat; label: string }[] = [
  { format: 'PDF', label: 'PDF' },
  { format: 'Excel', label: 'Excel (.xlsx)' },
  { format: 'Word', label: 'Word (.docx)' },
  { format: 'CSV', label: 'CSV' },
  { format: 'HTML', label: 'HTML' },
  { format: 'PPT', label: 'PowerPoint (.pptx)' },
];

export function ReportViewer({
  report,
  parameterValues,
  siteId,
  token,
  isOpen,
  onClose,
}: ReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportReady, setIsReportReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const viewerContainerId = `reportviewer-${report.Id.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const viewerInstanceRef = useRef<BoldReportViewerInstance | null>(null);

  // Converte parâmetros para o formato esperado pelo Bold Reports
  const convertParameters = useCallback((): BoldReportParameter[] => {
    return Object.entries(parameterValues).map(([name, value]) => ({
      name,
      values: Array.isArray(value) ? value : [value],
      nullable: false,
    }));
  }, [parameterValues]);

  // Manipula quando o relatório é carregado
  const handleReportLoaded = useCallback(() => {
    console.log('Bold Reports: Relatório carregado com sucesso');
    setIsLoading(false);
    setIsReportReady(true);
  }, []);

  // Manipula erros do relatório
  const handleReportError = useCallback((args: { errorCode: string; message: string }) => {
    console.error('Bold Reports Error:', args);
    setIsLoading(false);
    toast.error(`Erro ao carregar relatório: ${args.message}`);
  }, []);


  // Exporta o relatório programaticamente
  const handleExport = useCallback((format: ExportFormat) => {
    if (!isReportReady) {
      toast.error('Aguarde o relatório carregar completamente');
      return;
    }

    try {
      setIsExporting(true);
      
      // Obtém a instância do viewer via jQuery
      const viewerObj = window.$?.(`#${viewerContainerId}`)?.data?.('boldReportViewer') as BoldReportViewerInstance | undefined;
      
      if (viewerObj) {
        viewerInstanceRef.current = viewerObj;
        
        // Gera nome do arquivo
        const timestamp = new Date().getTime();
        const fileName = `${report.Name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
        
        console.log(`Exportando relatório para ${format}...`, fileName);
        viewerObj.exportReport(format, fileName);
        
        toast.success(`Exportação ${format} iniciada`);
      } else {
        throw new Error('Instância do viewer não encontrada');
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao iniciar exportação');
    } finally {
      // Reset após um tempo para permitir que o download seja processado
      setTimeout(() => setIsExporting(false), 2000);
    }
  }, [isReportReady, viewerContainerId, report.Name]);

  // Limpa o viewer quando fecha o modal
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(true);
      setIsReportReady(false);
      viewerInstanceRef.current = null;
    }
  }, [isOpen]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Caminho do relatório no formato /{CategoryName}/{ReportName}
  const reportPath = `/${report.CategoryName || 'Reports'}/${report.Name}`;

  // Verifica se o componente Bold Reports está disponível
  const BoldReportViewerComponent = window.BoldReportViewerComponent;

  if (!BoldReportViewerComponent) {
    console.warn('BoldReportViewerComponent não está disponível no escopo global');
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`
          ${isFullscreen 
            ? 'max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none m-0' 
            : 'max-w-6xl w-[95vw] h-[85vh] max-h-[85vh]'
          } 
          flex flex-col p-0 gap-0 overflow-hidden
        `}
      >
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-base font-medium truncate flex-1 pr-4">
            {report.Name}
          </DialogTitle>
          <div className="flex items-center gap-1">
            {/* Dropdown de Exportação */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  disabled={!isReportReady || isExporting}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {exportFormats.map(({ format, label }) => (
                  <DropdownMenuItem
                    key={format}
                    onClick={() => handleExport(format)}
                    disabled={isExporting}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair do modo tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden bg-background">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Carregando relatório...</span>
              </div>
            </div>
          )}
          
          {/* Bold Reports React Viewer Component */}
          {isOpen && BoldReportViewerComponent && (
            <div style={{ height: '100%', width: '100%' }}>
              <BoldReportViewerComponent
                id={viewerContainerId}
                reportServiceUrl={BOLD_REPORTS_SERVICE_URL}
                reportServerUrl={getBoldReportsServerUrl(siteId)}
                serviceAuthorizationToken={`bearer ${token}`}
                reportPath={reportPath}
                parameters={convertParameters()}
                locale="pt-BR"
                toolbarSettings={{
                  showToolbar: true,
                  items: [
                    'Print',
                    'Refresh',
                    'Zoom',
                    'FitPage',
                    'FitWidth',
                    'PageNavigation',
                  ],
                }}
                exportSettings={{
                  exportOptions: 63, // Todos os formatos (PDF, Excel, Word, HTML, PPT, CSV)
                }}
                enablePageCache={true}
                reportLoaded={handleReportLoaded}
                reportError={handleReportError}
              />
            </div>
          )}

          {/* Fallback se o componente não estiver disponível */}
          {isOpen && !BoldReportViewerComponent && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p>Componente Bold Reports não disponível.</p>
                <p className="text-sm mt-2">Verifique se as dependências foram instaladas corretamente.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
