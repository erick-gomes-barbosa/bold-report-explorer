/* eslint-disable */
import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Bold Reports CSS
import '@boldreports/javascript-reporting-controls/Content/v2.0/tailwind-light/bold.report-viewer.min.css';

// Bold Reports Scripts (order matters)
import '@boldreports/javascript-reporting-controls/Scripts/v2.0/common/bold.reports.common.min';
import '@boldreports/javascript-reporting-controls/Scripts/v2.0/common/bold.reports.widgets.min';
import '@boldreports/javascript-reporting-controls/Scripts/v2.0/bold.report-viewer.min';

// Bold Reports React component
import '@boldreports/react-reporting-components/Scripts/bold.reports.react.min';

// Declare the Bold Report Viewer component (created by bold.reports.react.min)
declare let BoldReportViewerComponent: any;

interface BoldReportViewerProps {
  reportPath: string;
  parameters?: Record<string, string | string[]>;
  onReportLoaded?: () => void;
  onReportError?: (error: string) => void;
}

interface ViewerConfig {
  siteId: string;
  token: string;
  reportServerUrl: string;
}

export function BoldReportViewer({
  reportPath,
  parameters = {},
  onReportLoaded,
  onReportError,
}: BoldReportViewerProps) {
  const [config, setConfig] = useState<ViewerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerIdRef = useRef(`bold-viewer-${Date.now()}`);

  const fetchViewerConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: { action: 'get-viewer-config' },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setConfig({
          siteId: data.siteId,
          token: data.token,
          reportServerUrl: data.reportServerUrl,
        });
      } else {
        throw new Error(data?.error || 'Failed to get viewer configuration');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar configuração do viewer';
      setError(errorMessage);
      onReportError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onReportError]);

  useEffect(() => {
    fetchViewerConfig();
  }, [fetchViewerConfig]);

  // Convert parameters to Bold Reports format
  const formattedParameters = Object.entries(parameters).map(([name, value]) => ({
    name,
    values: Array.isArray(value) ? value : [String(value)],
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando visualizador...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="font-medium text-destructive">Erro ao carregar visualizador</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" onClick={fetchViewerConfig} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">Configuração não disponível</p>
      </div>
    );
  }

  // Token must have lowercase 'bearer ' prefix for Bold Reports Cloud
  const authToken = `bearer ${config.token}`;

  const viewerStyle = {
    height: '100%',
    width: '100%',
    minHeight: '500px',
  };

  return (
    <div style={viewerStyle}>
      <BoldReportViewerComponent
        id={viewerIdRef.current}
        reportServiceUrl="https://service.boldreports.com/api/Viewer"
        reportServerUrl={config.reportServerUrl}
        reportPath={reportPath}
        serviceAuthorizationToken={authToken}
        parameters={formattedParameters}
      />
    </div>
  );
}
