import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BoldReport, ReportParameter, ExportFormat } from '@/types/boldReports';

export function useBoldReports() {
  const [reports, setReports] = useState<BoldReport[]>([]);
  const [parameters, setParameters] = useState<ReportParameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: { action: 'list-reports' },
      });

      if (fnError) throw fnError;
      
      if (data?.success && Array.isArray(data?.data)) {
        setReports(data.data);
      } else if (data?.data?.Message) {
        throw new Error(data.data.Message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar relatórios');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchParameters = useCallback(async (reportId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: { action: 'get-report-parameters', reportId },
      });

      if (fnError) throw fnError;
      
      if (data?.success && Array.isArray(data?.data)) {
        setParameters(data.data);
      } else {
        setParameters([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar parâmetros');
      setParameters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportReport = useCallback(async (
    reportId: string, 
    format: ExportFormat, 
    parameterValues: Record<string, string | string[]>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: { 
          action: 'export-report', 
          reportId, 
          format,
          parameters: parameterValues 
        },
      });

      if (fnError) throw fnError;
      
      if (data?.success && data?.data) {
        // Decode base64 and download
        const byteCharacters = atob(data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.contentType });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename || `report.${format.toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return true;
      } else if (data?.data?.Message) {
        throw new Error(data.data.Message);
      }
      
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar relatório');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reports,
    parameters,
    loading,
    error,
    fetchReports,
    fetchParameters,
    exportReport,
    clearError: () => setError(null),
  };
}
