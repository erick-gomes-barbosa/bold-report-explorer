import { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize2, Minimize2, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BoldReport, ExportFormat } from '@/types/boldReports';
import type { BoldReportViewerInstance, BoldReportParameter, AjaxBeforeLoadEventArgs } from '@/types/boldReportsViewer';
import { toast } from 'sonner';

interface ReportViewerProps {
  report: BoldReport;
  parameterValues: Record<string, string | string[]>;
  siteId: string;
  token: string;
  reportServerUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

// URLs do Bold Reports Cloud
const BOLD_REPORTS_SERVICE_URL = 'https://service.boldreports.com/api/Viewer';

// CORRIGIDO: Formato Cloud centralizado sem /site/{siteId} no path
// Baseado na documentação: https://<<tenant>>.boldreports.com/reporting/api/
// Como usamos cloud.boldreports.com centralizado, removemos /site/{siteId}
const DEFAULT_REPORT_SERVER_URL = 'https://cloud.boldreports.com/reporting/api/';

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
  reportServerUrl,
  isOpen,
  onClose,
}: ReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportReady, setIsReportReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const viewerContainerId = `reportviewer-${report.Id.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const viewerInstanceRef = useRef<BoldReportViewerInstance | null>(null);

  // Caminho do relatório no formato /{CategoryName}/{ReportName}
  const reportPath = `/${report.CategoryName || 'Reports'}/${report.Name}`;

  // Converte parâmetros para o formato esperado pelo Bold Reports
  const convertParameters = useCallback((): BoldReportParameter[] => {
    return Object.entries(parameterValues).map(([name, value]) => ({
      name,
      values: Array.isArray(value) ? value : [value],
      nullable: false,
    }));
  }, [parameterValues]);

  // URL do servidor - usa a prop ou fallback para o padrão
  const effectiveServerUrl = reportServerUrl || DEFAULT_REPORT_SERVER_URL;

  // Log de inicialização quando o viewer é montado
  useEffect(() => {
    if (isOpen && token && siteId) {
      console.group('[BoldReports] Inicializando Viewer');
      console.log('[BoldReports] Report:', {
        id: report.Id,
        name: report.Name,
        category: report.CategoryName
      });
      console.log('[BoldReports] SiteId:', siteId);
      console.log('[BoldReports] Token (primeiros 50 chars):', token.substring(0, 50) + '...');
      console.log('[BoldReports] Report Service URL:', BOLD_REPORTS_SERVICE_URL);
      console.log('[BoldReports] Report Server URL:', effectiveServerUrl);
      console.log('[BoldReports] Report Path:', reportPath);
      console.log('[BoldReports] Service Auth Token:', `bearer ${token.substring(0, 20)}...`);
      console.log('[BoldReports] Parameters:', convertParameters());
      console.groupEnd();
    }
  }, [isOpen, token, siteId, report, reportPath, convertParameters, effectiveServerUrl]);

  // Callback para interceptar requisições AJAX do viewer e injetar token de autenticação
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAjaxBeforeLoad = useCallback((args: any) => {
    console.group('[BoldReports AJAX] Requisição Interceptada');
    console.log('[BoldReports AJAX] Action:', args?.actionName || 'N/A');
    console.log('[BoldReports AJAX] Args completo:', JSON.stringify(args, null, 2));
    
    // Injeta o token de autorização nos headers da requisição
    if (token && args) {
      const bearerToken = `Bearer ${token}`;
      
      // Inicializa headers se não existir
      if (!args.headers) {
        args.headers = [];
      }
      
      // Formato array: remove duplicatas e adiciona novo header
      if (Array.isArray(args.headers)) {
        // Remove header Authorization existente para evitar duplicatas
        args.headers = args.headers.filter(
          (h: any) => h?.Key?.toLowerCase() !== 'authorization'
        );
        // Adiciona novo header no formato { Key, Value }
        args.headers.push({ Key: 'Authorization', Value: bearerToken });
        console.log('[BoldReports AJAX] ✅ Token injetado via headers array');
      }
      
      // Formato headerReq (se existir como objeto)
      if (args.headerReq && typeof args.headerReq === 'object') {
        args.headerReq['Authorization'] = bearerToken;
        console.log('[BoldReports AJAX] ✅ Token injetado via headerReq');
      }
      
      // Atualiza serviceAuthorizationToken se disponível
      if ('serviceAuthorizationToken' in args) {
        args.serviceAuthorizationToken = bearerToken;
        console.log('[BoldReports AJAX] ✅ serviceAuthorizationToken atualizado');
      }
      
      console.log('[BoldReports AJAX] Token injetado com sucesso');
    } else {
      console.warn('[BoldReports AJAX] ⚠️ Token não disponível para injeção');
    }
    
    console.groupEnd();
  }, [token]);

  // FASE 3: Callback para capturar respostas de sucesso
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAjaxSuccess = useCallback((args: any) => {
    console.group('[BoldReports AJAX] ✅ Sucesso');
    console.log('[BoldReports AJAX] Response completo:', args);
    if (args && typeof args === 'object') {
      console.log('[BoldReports AJAX] Response chaves:', Object.keys(args));
    }
    console.groupEnd();
  }, []);

  // FASE 3: Callback para capturar erros AJAX
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAjaxError = useCallback((args: any) => {
    console.group('[BoldReports AJAX] ❌ Erro');
    console.log('[BoldReports AJAX] Error completo:', args);
    if (args && typeof args === 'object') {
      console.log('[BoldReports AJAX] Error chaves:', Object.keys(args));
      for (const [key, value] of Object.entries(args)) {
        console.log(`[BoldReports AJAX] ${key}:`, value);
      }
    }
    console.groupEnd();
  }, []);

  // Manipula quando o relatório é carregado
  const handleReportLoaded = useCallback(() => {
    console.log('[BoldReports] ✅ Relatório carregado com sucesso');
    setIsLoading(false);
    setIsReportReady(true);
  }, []);

  // Manipula erros do relatório
  const handleReportError = useCallback((args: { errorCode: string; message: string }) => {
    console.group('[BoldReports] ❌ Erro no relatório');
    console.error('[BoldReports] Error Code:', args.errorCode);
    console.error('[BoldReports] Message:', args.message);
    console.groupEnd();
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

  // reportPath já é definido no início do componente

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
                reportServerUrl={effectiveServerUrl}
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
                ajaxBeforeLoad={handleAjaxBeforeLoad}
                ajaxSuccess={handleAjaxSuccess}
                ajaxError={handleAjaxError}
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
