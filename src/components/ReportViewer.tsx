import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

// Import Bold Reports Viewer dynamically
let BoldReportViewerComponent: React.ComponentType<any> | null = null;

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
  // Remove any existing prefix and add lowercase 'bearer'
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
  const [viewerReady, setViewerReady] = useState(false);

  // Load Bold Reports component dynamically
  useEffect(() => {
    if (open && !BoldReportViewerComponent) {
      // @ts-ignore - Module loaded dynamically
      import('@boldreports/react-reporting-components')
        .then((module: any) => {
          BoldReportViewerComponent = module.BoldReportViewerComponent;
          setViewerReady(true);
          setIsLoading(false);
        })
        .catch((err: Error) => {
          console.error('[ReportViewer] Erro ao carregar componente:', err);
          setIsLoading(false);
        });
    } else if (open && BoldReportViewerComponent) {
      setViewerReady(true);
      setIsLoading(false);
    }
  }, [open]);

  // CRITICAL: Inject token into EVERY AJAX request via ajaxBeforeLoad
  // This is the fix for 401 errors - the token must be propagated to all sub-requests
  const onAjaxRequest = useCallback(
    (args: any) => {
      if (token && args.headers) {
        const bearerToken = formatToken(token);
        
        // Force inject via headers.push (array format per Bold Reports docs)
        args.headers.push({
          Key: 'Authorization',
          Value: bearerToken,
        });
        
        // Also set serviceAuthorizationToken for good measure
        args.serviceAuthorizationToken = bearerToken;

        console.log('[ReportViewer] ajaxBeforeLoad - Token injected:', {
          url: args.url,
          tokenPrefix: bearerToken.substring(0, 20) + '...',
        });
      }
    },
    [token]
  );

  // Convert parameters to Bold Reports format
  const formattedParameters = Object.entries(parameters).map(([name, value]) => ({
    name,
    values: Array.isArray(value) ? value : [value],
  }));

  // URLs per the official guide:
  // - reportServiceUrl: processes report layout (fixed URL)
  // - reportServerUrl: manages data and permissions (dynamic with siteId)
  const reportServiceUrl = 'https://service.boldreports.com/api/Viewer';
  const reportServerUrl = `https://${siteId}.boldreports.com/reporting/api`;

  console.log('[ReportViewer] Configuração:', {
    reportPath,
    reportServiceUrl,
    reportServerUrl,
    tokenFormat: formatToken(token).substring(0, 25) + '...',
    parametersCount: formattedParameters.length,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{reportName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 p-4 pt-2 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando visualizador...</span>
            </div>
          ) : viewerReady && BoldReportViewerComponent ? (
            <div className="h-full w-full" style={{ minHeight: '600px' }}>
              <BoldReportViewerComponent
                id="bold-report-viewer"
                reportServiceUrl={reportServiceUrl}
                reportServerUrl={reportServerUrl}
                serviceAuthorizationToken={formatToken(token)}
                reportPath={reportPath}
                parameters={formattedParameters.length > 0 ? formattedParameters : undefined}
                ajaxBeforeLoad={onAjaxRequest}
                locale="pt-BR"
                toolbarSettings={{
                  showToolbar: true,
                  items: [
                    'Print',
                    'Export',
                    'Refresh',
                    'ZoomIn',
                    'ZoomOut',
                    'FitToPage',
                    'PageNavigation',
                  ],
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Erro ao carregar o visualizador de relatórios
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
