import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useBoldReportsScripts } from '@/hooks/useBoldReportsScripts';

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
  const { loaded: scriptsLoaded, loading: scriptsLoading, error: scriptsError, retry } = useBoldReportsScripts();
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

  // Initialize viewer using jQuery widget - only after scripts are loaded
  useEffect(() => {
    if (!open || !scriptsLoaded || !viewerRef.current || viewerInitialized.current) return;

    const $ = window.jQuery || window.$;
    console.log('[ReportViewer] Verificando disponibilidade:', {
      jQueryAvailable: !!$,
      boldReportViewerFn: !!($?.fn?.boldReportViewer),
      ejAvailable: !!window.ej,
    });

    if (!$ || !$.fn.boldReportViewer) {
      console.error('[ReportViewer] Bold Reports não carregado após scripts loaded');
      setError('Bold Reports não está disponível. Clique em "Tentar novamente".');
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
  }, [open, scriptsLoaded, token, siteId, reportPath, formattedParameters, reportServiceUrl, reportServerUrl]);

  // Cleanup on close
  useEffect(() => {
    if (!open && viewerRef.current && viewerInitialized.current) {
      const $ = window.jQuery || window.$;
      if ($ && $(viewerRef.current).data('boldReportViewer')) {
        $(viewerRef.current).boldReportViewer('destroy');
      }
      viewerInitialized.current = false;
      setIsLoading(true);
      setError(null);
    }
  }, [open]);

  // Combine script error with viewer error
  const displayError = scriptsError || error;
  const showLoading = scriptsLoading || (scriptsLoaded && isLoading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{reportName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 p-4 pt-2 overflow-hidden relative">
          {showLoading && !displayError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">
                {scriptsLoading ? 'Carregando componentes...' : 'Carregando relatório...'}
              </span>
            </div>
          )}
          
          {displayError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{displayError}</span>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  viewerInitialized.current = false;
                  retry();
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
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
