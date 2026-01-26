import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ViewerConfig {
  siteId: string;
  token: string;
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

      if (fnError) throw fnError;

      if (data?.success && data?.siteId) {
        setViewerConfig({
          siteId: data.siteId,
          token: data.token || '',
        });
      } else {
        throw new Error('Configuração do viewer não disponível');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar configuração do viewer');
      setViewerConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    viewerConfig,
    loading,
    error,
    fetchViewerConfig,
  };
}
