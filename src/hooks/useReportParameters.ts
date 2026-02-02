import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReportParameter, AvailableValue } from '@/types/boldReports';
import type { MultiSelectOption } from '@/components/ui/multi-select';

interface UseReportParametersResult {
  parameters: ReportParameter[];
  loading: boolean;
  error: string | null;
  getOptionsForParameter: (paramName: string) => MultiSelectOption[];
  getLabelMappingForParameter: (paramName: string) => Record<string, string>;
  refetch: () => Promise<void>;
}

// Cache para evitar chamadas duplicadas
const parametersCache = new Map<string, ReportParameter[]>();

export function useReportParameters(reportId: string): UseReportParametersResult {
  const [parameters, setParameters] = useState<ReportParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchParameters = useCallback(async () => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    // Verificar cache
    if (parametersCache.has(reportId)) {
      setParameters(parametersCache.get(reportId)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('bold-reports', {
        body: {
          action: 'get-report-parameters',
          reportId,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      // A API retorna os parâmetros em data.data (array) ou data (se já for array)
      const params = Array.isArray(data) ? data : (data?.data || data?.parameters || []);
      
      // Armazenar no cache
      parametersCache.set(reportId, params);
      setParameters(params);
    } catch (err) {
      console.error('Erro ao buscar parâmetros:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar parâmetros');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchParameters();
    }
  }, [fetchParameters]);

  const getOptionsForParameter = useCallback((paramName: string): MultiSelectOption[] => {
    const param = parameters.find(p => p.Name === paramName);
    if (!param) return [];

    // Suporta ambos os formatos: AvailableValues (Bold Reports) e ValidValues (legado)
    if (param.AvailableValues && param.AvailableValues.length > 0) {
      return param.AvailableValues
        .filter((av: AvailableValue) => av.DisplayField && av.ValueField)
        .map((av: AvailableValue) => ({
          label: av.DisplayField,
          value: av.ValueField,
        }));
    }

    // Fallback para formato ValidValues { Label, Value }
    if (param.ValidValues && param.ValidValues.length > 0) {
      return param.ValidValues
        .filter((vv) => vv.Label && vv.Value)
        .map((vv) => ({
          label: vv.Label,
          value: vv.Value,
        }));
    }

    return [];
  }, [parameters]);

  /**
   * Retorna um mapeamento de value -> label para um parâmetro específico.
   * Útil para enviar labels junto com values para a API Bold Reports.
   */
  const getLabelMappingForParameter = useCallback((paramName: string): Record<string, string> => {
    const param = parameters.find(p => p.Name === paramName);
    if (!param) return {};

    const mapping: Record<string, string> = {};

    // Suporta ambos os formatos: AvailableValues e ValidValues
    if (param.AvailableValues && param.AvailableValues.length > 0) {
      param.AvailableValues
        .filter((av: AvailableValue) => av.DisplayField && av.ValueField)
        .forEach((av: AvailableValue) => {
          mapping[av.ValueField] = av.DisplayField;
        });
    } else if (param.ValidValues && param.ValidValues.length > 0) {
      param.ValidValues
        .filter((vv) => vv.Label && vv.Value)
        .forEach((vv) => {
          mapping[vv.Value] = vv.Label;
        });
    }

    return mapping;
  }, [parameters]);

  return {
    parameters,
    loading,
    error,
    getOptionsForParameter,
    getLabelMappingForParameter,
    refetch: fetchParameters,
  };
}

/**
 * Limpa o cache de parâmetros (útil para forçar recarregamento)
 */
export function clearParametersCache(reportId?: string): void {
  if (reportId) {
    parametersCache.delete(reportId);
  } else {
    parametersCache.clear();
  }
}
