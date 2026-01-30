import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

// Declare jQuery and Bold Reports globals
declare global {
  interface Window {
    $: any;
    jQuery: any;
    ej: any;
  }
}

interface ReportViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportPath: string;
  reportName: string;
  siteId: string;
  token: string;
  parameters?: Record<string, string | string[]>;
}

// Format token with lowercase 'bearer' as required by Bold Reports
const formatToken = (token: string): string => {
  const cleanToken = token.replace(/^bearer\s+/i, '').trim();
  return `bearer ${cleanToken}`;
};

export function ReportViewer({
  open,
  onOpenChange,
  reportPath,
  reportName,
  siteId,
  token,
  parameters = {},
}: ReportViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInitialized = useRef(false);

  // Convert parameters to Bold Reports format
  const formattedParameters = Object.entries(parameters).map(([name, value]) => ({
    name,
    values: Array.isArray(value) ? value : [value],
  }));

  // URLs per the official guide
  const reportServiceUrl = 'https://service.boldreports.com/api/Viewer';
  const reportServerUrl = `https://${siteId}.boldreports.com/reporting/api`;

  // Initialize viewer using jQuery widget
  useEffect(() => {
    if (!open || !viewerRef.current || viewerInitialized.current) return;

    const $ = window.$;
    console.log('[ReportViewer] Verificando disponibilidade:', {
      jQueryAvailable: !!$,
      boldReportViewerFn: !!($?.fn?.boldReportViewer),
      ejAvailable: !!window.ej,
    });

    if (!$ || !$.fn.boldReportViewer) {
      console.error('[ReportViewer] Bold Reports não carregado');
      setError('Bold Reports não está disponível. Tente recarregar a página.');
      setIsLoading(false);
      return;
    }

    const bearerToken = formatToken(token);

    console.log('[ReportViewer] Inicializando viewer:', {
      reportPath,
      reportServiceUrl,
      reportServerUrl,
      tokenPrefix: bearerToken.substring(0, 25) + '...',
    });

    try {
      $(viewerRef.current).boldReportViewer({
        reportServiceUrl,
        reportServerUrl,
        serviceAuthorizationToken: bearerToken,
        reportPath,
        parameters: formattedParameters.length > 0 ? formattedParameters : undefined,
        locale: 'pt-BR',
        toolbarSettings: {
          showToolbar: true,
          items: [
            window.ej?.ReportViewer?.ToolbarItems?.Print,
            window.ej?.ReportViewer?.ToolbarItems?.Export,
            window.ej?.ReportViewer?.ToolbarItems?.Refresh,
            window.ej?.ReportViewer?.ToolbarItems?.ZoomIn,
            window.ej?.ReportViewer?.ToolbarItems?.ZoomOut,
            window.ej?.ReportViewer?.ToolbarItems?.FitToPage,
            window.ej?.ReportViewer?.ToolbarItems?.PageNavigation,
          ].filter(Boolean),
        },
        // CRITICAL: Inject token into EVERY AJAX request
        ajaxBeforeLoad: (args: any) => {
          if (token && args.headers) {
            args.headers.push({
              Key: 'Authorization',
              Value: bearerToken,
            });
            args.serviceAuthorizationToken = bearerToken;
            console.log('[ReportViewer] ajaxBeforeLoad - Token injected');
          }
        },
        renderingBegin: () => {
          console.log('[ReportViewer] Renderização iniciada');
          setIsLoading(false);
        },
        renderingComplete: () => {
          console.log('[ReportViewer] Renderização completa');
          setIsLoading(false);
        },
        reportError: (args: any) => {
          console.error('[ReportViewer] Erro:', args);
          setError(args.message || 'Erro ao carregar relatório');
          setIsLoading(false);
        },
      });

      viewerInitialized.current = true;
    } catch (err) {
      console.error('[ReportViewer] Erro ao inicializar:', err);
      setError('Erro ao inicializar o visualizador');
      setIsLoading(false);
    }
  }, [open, token, siteId, reportPath, formattedParameters, reportServiceUrl, reportServerUrl]);

  // Cleanup on close
  useEffect(() => {
    if (!open && viewerRef.current && viewerInitialized.current) {
      const $ = window.$;
      if ($ && $(viewerRef.current).data('boldReportViewer')) {
        $(viewerRef.current).boldReportViewer('destroy');
      }
      viewerInitialized.current = false;
      setIsLoading(true);
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{reportName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 p-4 pt-2 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando relatório...</span>
            </div>
          )}
          
          {error ? (
            <div className="flex items-center justify-center h-full text-destructive">
              {error}
            </div>
          ) : (
            <div 
              ref={viewerRef} 
              id="bold-report-viewer" 
              className="h-full w-full"
              style={{ minHeight: '600px' }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
