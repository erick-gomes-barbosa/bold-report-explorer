import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ViewerConfig {
  siteId: string;
  token: string; // JWT puro (sem prefixo)
  reportServerUrl: string;
}

export function useReportViewer() {
  const [viewerConfig, setViewerConfig] = useState<ViewerConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchViewerConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: { action: 'get-viewer-config' },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao buscar configuração do viewer');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao obter configuração do viewer');
      }

      setViewerConfig({
        siteId: data.siteId,
        token: data.token,
        reportServerUrl: data.reportServerUrl,
      });

      console.log('[useReportViewer] Configuração obtida:', {
        siteId: data.siteId,
        tokenPreview: data.token?.substring(0, 30) + '...',
        reportServerUrl: data.reportServerUrl,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[useReportViewer] Erro:', message);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    viewerConfig,
    loading,
    error,
    fetchViewerConfig,
    clearError,
  };
}
