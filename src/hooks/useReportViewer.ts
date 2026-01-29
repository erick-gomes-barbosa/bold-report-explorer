import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ViewerConfig {
  siteId: string;
  token: string;
  reportServerUrl?: string;
}

export function useReportViewer() {
  const [viewerConfig, setViewerConfig] = useState<ViewerConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchViewerConfig = useCallback(async () => {
    console.group('[BoldReports] Buscando configuração do viewer');
    console.log('[BoldReports] Chamando edge function: get-viewer-config');
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: { action: 'get-viewer-config' },
      });

      console.log('[BoldReports] Resposta recebida:', {
        success: data?.success,
        siteId: data?.siteId,
        tokenLength: data?.token?.length,
        tokenPreview: data?.token ? data.token.substring(0, 50) + '...' : 'N/A',
        error: fnError?.message
      });

      if (fnError) throw fnError;

      if (data?.success && data?.siteId) {
        setViewerConfig({
          siteId: data.siteId,
          token: data.token || '',
          reportServerUrl: data.reportServerUrl,
        });
        console.log('[BoldReports] Configuração salva com sucesso');
        console.log('[BoldReports] Report Server URL:', data.reportServerUrl);
      } else {
        throw new Error('Configuração do viewer não disponível');
      }
    } catch (err) {
      console.error('[BoldReports] Erro ao buscar configuração:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar configuração do viewer');
      setViewerConfig(null);
    } finally {
      console.groupEnd();
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
