import { useState, useEffect, useMemo } from 'react';
import { X, Maximize2, Minimize2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BoldReport } from '@/types/boldReports';

interface ReportViewerProps {
  report: BoldReport;
  parameterValues: Record<string, string | string[]>;
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportViewer({
  report,
  parameterValues,
  siteId,
  isOpen,
  onClose,
}: ReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Build the Bold Reports Cloud viewer URL
  const viewerUrl = useMemo(() => {
    // Bold Reports Cloud direct report view URL with embed mode
    // Format: https://cloud.boldreports.com/reporting/en-us/site/{siteId}/reports/{reportId}/view?isembed=true
    const baseUrl = `https://cloud.boldreports.com/reporting/en-us/site/${siteId}/reports/${report.Id}/view`;
    
    const params = new URLSearchParams();
    params.set('isembed', 'true');
    
    // Add report parameters directly to URL
    if (Object.keys(parameterValues).length > 0) {
      Object.entries(parameterValues).forEach(([key, value]) => {
        const val = Array.isArray(value) ? value.join(',') : value;
        if (val) {
          params.set(key, val);
        }
      });
    }

    return `${baseUrl}?${params.toString()}`;
  }, [report.Id, siteId, parameterValues]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, viewerUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const openInNewTab = () => {
    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
  };

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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={openInNewTab}
              title="Abrir em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
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
          
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            title={`Visualização: ${report.Name}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
