import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BoldReport, ReportParameter, ExportFormat } from '@/types/boldReports';

// Helper function to get correct file extension based on format
function getFileExtension(format: ExportFormat): string {
  const extensionMap: Record<ExportFormat, string> = {
    'PDF': 'pdf',
    'Excel': 'xlsx',
    'Word': 'docx',
    'CSV': 'csv',
    'HTML': 'html',
    'PPT': 'pptx',
  };
  
  return extensionMap[format] || format.toLowerCase();
}

// Helper to process base64 to blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  // Clean base64 (remove whitespace that might have been added by transmission)
  const cleanBase64 = base64.replace(/\s+/g, '');
  
  // Validate base64 format
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
    throw new Error('Base64 inválido - contém caracteres não permitidos');
  }
  
  // Decode base64 to binary string
  let byteCharacters: string;
  try {
    byteCharacters = atob(cleanBase64);
  } catch (atobError) {
    throw new Error(`Falha ao decodificar Base64: ${atobError instanceof Error ? atobError.message : 'desconhecido'}`);
  }
  
  // Convert binary string to byte array
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  
  // Create blob with correct MIME type
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Verify blob is not empty
  if (blob.size === 0) {
    throw new Error('Arquivo exportado está vazio (0 bytes)');
  }
  
  return blob;
}

export function useBoldReports() {
  const [reports, setReports] = useState<BoldReport[]>([]);
  const [parameters, setParameters] = useState<ReportParameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Store the current preview blob for download
  const previewBlobRef = useRef<{ blob: Blob; filename: string } | null>(null);

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

  const generatePreview = useCallback(async (
    reportId: string,
    parameterValues: Record<string, string | string[]>
  ): Promise<boolean> => {
    setPreviewLoading(true);
    setError(null);
    
    // Clean up previous preview URL
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    previewBlobRef.current = null;
    
    try {
      // Normalize parameters
      const normalizedParams: Record<string, string | string[]> = {};
      Object.entries(parameterValues).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          normalizedParams[key] = value;
        } else if (value !== null && value !== undefined && value !== '') {
          normalizedParams[key] = String(value);
        }
      });

      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: { 
          action: 'export-report', 
          reportId, 
          format: 'PDF',
          parameters: normalizedParams 
        },
      });

      if (fnError) throw fnError;
      
      if (data?.success && data?.data) {
        const mimeType = data.contentType || 'application/pdf';
        const blob = base64ToBlob(data.data, mimeType);
        
        // Generate filename
        const timestamp = new Date().getTime();
        const filename = `relatorio_${timestamp}.pdf`;
        
        // Store for later download
        previewBlobRef.current = { blob, filename };
        
        // Create URL for preview
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        console.log('Preview gerado:', {
          filename,
          size: blob.size,
          type: mimeType
        });
        
        return true;
      } else if (data?.data?.Message) {
        throw new Error(data.data.Message);
      }
      
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar pré-visualização');
      return false;
    } finally {
      setPreviewLoading(false);
    }
  }, [previewUrl]);

  const downloadPreview = useCallback(() => {
    if (!previewBlobRef.current) return;
    
    const { blob, filename } = previewBlobRef.current;
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }, []);

  const closePreview = useCallback(() => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    previewBlobRef.current = null;
  }, [previewUrl]);

  const exportReport = useCallback(async (
    reportId: string, 
    format: ExportFormat, 
    parameterValues: Record<string, string | string[]>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Normalize parameters
      const normalizedParams: Record<string, string | string[]> = {};
      Object.entries(parameterValues).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          normalizedParams[key] = value;
        } else if (value !== null && value !== undefined && value !== '') {
          normalizedParams[key] = String(value);
        }
      });

      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: { 
          action: 'export-report', 
          reportId, 
          format,
          parameters: normalizedParams 
        },
      });

      if (fnError) throw fnError;
      
      if (data?.success && data?.data) {
        const mimeType = data.contentType || 'application/octet-stream';
        const blob = base64ToBlob(data.data, mimeType);
        
        // Get proper file extension based on format
        const extension = getFileExtension(format);
        
        // Generate filename with timestamp and correct extension
        const timestamp = new Date().getTime();
        const filename = `relatorio_${timestamp}.${extension}`;
        
        console.log('Download iniciado:', {
          filename: filename,
          size: blob.size,
          type: mimeType,
          format: format,
          expectedExtension: extension
        });
        
        // Create download link and trigger
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
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
    previewLoading,
    error,
    previewUrl,
    fetchReports,
    fetchParameters,
    exportReport,
    generatePreview,
    downloadPreview,
    closePreview,
    clearError: () => setError(null),
  };
}
