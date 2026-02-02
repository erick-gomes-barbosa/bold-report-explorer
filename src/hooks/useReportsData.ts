import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getReportId, mapFiltersToBoldParameters } from '@/config/reportMapping';
import { 
  parseBase64CSVToObjects, 
  base64ToBlob, 
  downloadBlob,
  FORMAT_MIME_TYPES,
  FORMAT_EXTENSIONS,
  type ParsedCSVResult 
} from '@/utils/csvParser';
import type { ReportType, ReportDataItem, PaginationState, ExportFormat } from '@/types/reports';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bold-reports`;

interface FetchResponse {
  success: boolean;
  data?: string; // base64 encoded
  contentType?: string;
  error?: string;
}

export function useReportsData() {
  const [data, setData] = useState<ReportDataItem[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
  });

  /**
   * Busca dados do relatório exportando como CSV e parseando para a tabela.
   */
  const fetchReportData = useCallback(async (
    reportType: ReportType,
    filters: unknown,
    page: number = 0
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const reportId = getReportId(reportType);
      if (!reportId || reportId.startsWith('PLACEHOLDER')) {
        throw new Error(`ID do relatório não configurado para: ${reportType}`);
      }

      const parameters = mapFiltersToBoldParameters(
        reportType, 
        filters as Record<string, unknown>
      );

      console.group('[ReportsData] Fetching report data');
      console.log('Report Type:', reportType);
      console.log('Report ID:', reportId);
      console.log('Parameters:', parameters);
      console.groupEnd();

      const response = await supabase.functions.invoke<FetchResponse>('bold-reports', {
        body: {
          action: 'export-report',
          reportId,
          format: 'CSV',
          parameters,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao buscar relatório');
      }

      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.error || 'Dados do relatório não disponíveis');
      }

      // Parse CSV to objects
      const parsed: ParsedCSVResult = parseBase64CSVToObjects(response.data.data);
      
      console.group('[ReportsData] Parsed CSV');
      console.log('Headers:', parsed.headers);
      console.log('Row count:', parsed.data.length);
      console.groupEnd();

      // Apply client-side pagination
      const pageSize = pagination.pageSize;
      const startIndex = page * pageSize;
      const paginatedData = parsed.data.slice(startIndex, startIndex + pageSize);
      
      setData(paginatedData as ReportDataItem[]);
      setColumns(parsed.headers);
      setPagination(prev => ({
        ...prev,
        pageIndex: page,
        totalCount: parsed.data.length,
      }));

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
      console.error('[ReportsData] Error:', message);
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  /**
   * Exporta o relatório no formato especificado e dispara o download.
   */
  const exportData = useCallback(async (
    reportType: ReportType,
    format: ExportFormat,
    filters: unknown
  ): Promise<boolean> => {
    setLoading(true);
    
    try {
      const reportId = getReportId(reportType);
      if (!reportId || reportId.startsWith('PLACEHOLDER')) {
        throw new Error(`ID do relatório não configurado para: ${reportType}`);
      }

      const parameters = mapFiltersToBoldParameters(
        reportType, 
        filters as Record<string, unknown>
      );

      // Map local format to Bold Reports format
      const boldFormat = format.toUpperCase() === 'XLSX' ? 'Excel' : format.toUpperCase();

      console.group('[ReportsData] Exporting report');
      console.log('Report Type:', reportType);
      console.log('Format:', boldFormat);
      console.log('Parameters:', parameters);
      console.groupEnd();

      const response = await supabase.functions.invoke<FetchResponse>('bold-reports', {
        body: {
          action: 'export-report',
          reportId,
          format: boldFormat,
          parameters,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao exportar relatório');
      }

      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.error || 'Dados da exportação não disponíveis');
      }

      // Convert base64 to blob and download
      const mimeType = FORMAT_MIME_TYPES[format.toLowerCase()] || 'application/octet-stream';
      const extension = FORMAT_EXTENSIONS[format.toLowerCase()] || `.${format.toLowerCase()}`;
      const blob = base64ToBlob(response.data.data, mimeType);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `relatorio_${reportType}_${timestamp}${extension}`;
      
      downloadBlob(blob, filename);
      
      console.log('[ReportsData] Download started:', filename);
      return true;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao exportar';
      console.error('[ReportsData] Export error:', message);
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, pageIndex: newPage }));
  }, []);

  const clearData = useCallback(() => {
    setData([]);
    setColumns([]);
    setError(null);
    setPagination(prev => ({ ...prev, pageIndex: 0, totalCount: 0 }));
  }, []);

  return {
    data,
    columns,
    loading,
    error,
    pagination,
    fetchReportData,
    exportData,
    changePage,
    clearData,
    clearError: () => setError(null),
  };
}
