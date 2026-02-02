import type { ReportType } from '@/types/reports';

export interface ReportConfig {
  reportId: string;
  parameterMapping: Record<string, string>;
}

/**
 * Mapeamento de tipos de relatório para IDs do Bold Reports e parâmetros.
 * 
 * IMPORTANTE: Os IDs devem ser substituídos pelos IDs reais dos relatórios
 * configurados no Bold Reports Cloud.
 */
export const REPORT_MAPPING: Record<ReportType, ReportConfig> = {
  'bens-necessidade': {
    reportId: '8fae90ee-011b-40d4-a53a-65b74f97b3cb',
    parameterMapping: {
      orgaoUnidade: 'param_unidade',
      grupo: 'param_grupo',
      situacao: 'param_situacao',
      conservacao: 'param_estado',
      faixaPrecoMin: 'param_preco_inicial',
      faixaPrecoMax: 'param_preco_final',
      dataAquisicaoInicio: 'param_dataAquisicao_inicio',
      dataAquisicaoFim: 'param_dataAquisicao_final',
    }
  },
  'inventario': {
    reportId: '0d93ea95-4d38-4b5e-b8c2-35c784564ff0',
    parameterMapping: {
      tipo: 'Tipo',
      status: 'Status',
      periodoInicio: 'DataInicio',
      periodoFim: 'DataFim',
      unidadeAlvo: 'UnidadeAlvo',
    }
  },
  'auditoria': {
    reportId: '4d08d16c-8e95-4e9e-b937-570cd49bb207',
    parameterMapping: {
      orgao: 'Orgao',
      unidade: 'Unidade',
      setor: 'Setor',
      periodoInicio: 'DataInicio',
      periodoFim: 'DataFim',
    }
  },
};

/**
 * Estrutura de parâmetro com labels e values para a API Bold Reports.
 */
export interface BoldParameterData {
  labels: string[];
  values: string[];
}

/**
 * Converte os filtros do formulário para o formato de parâmetros do Bold Reports.
 * Retorna um objeto onde cada parâmetro tem labels e values.
 */
export function mapFiltersToBoldParameters(
  reportType: ReportType,
  filters: Record<string, unknown>,
  labelMappings?: Record<string, Record<string, string>> // value -> label mappings
): Record<string, BoldParameterData> {
  const config = REPORT_MAPPING[reportType];
  if (!config) return {};

  const parameters: Record<string, BoldParameterData> = {};

  for (const [filterKey, filterValue] of Object.entries(filters)) {
    const boldParamName = config.parameterMapping[filterKey];
    if (!boldParamName || filterValue === undefined || filterValue === null || filterValue === '') {
      continue;
    }

    // Handle Date objects
    if (filterValue instanceof Date) {
      const dateStr = filterValue.toISOString().split('T')[0];
      parameters[boldParamName] = {
        labels: [dateStr],
        values: [dateStr]
      };
    }
    // Handle arrays (multi-select values)
    else if (Array.isArray(filterValue)) {
      if (filterValue.length === 0) continue; // Skip empty arrays
      
      const values = filterValue.map(String);
      const labelMap = labelMappings?.[filterKey];
      const labels = labelMap 
        ? values.map(v => labelMap[v] || v)
        : values;
      
      parameters[boldParamName] = { labels, values };
    }
    // Handle primitive values
    else {
      const value = String(filterValue);
      const labelMap = labelMappings?.[filterKey];
      const label = labelMap?.[value] || value;
      
      parameters[boldParamName] = {
        labels: [label],
        values: [value]
      };
    }
  }

  return parameters;
}

/**
 * Obtém o ID do relatório Bold Reports para um tipo de relatório.
 */
export function getReportId(reportType: ReportType): string {
  return REPORT_MAPPING[reportType]?.reportId || '';
}
