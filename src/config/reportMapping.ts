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
 * Converte os filtros do formulário para o formato de parâmetros do Bold Reports.
 */
export function mapFiltersToBoldParameters(
  reportType: ReportType,
  filters: Record<string, unknown>
): Record<string, string[]> {
  const config = REPORT_MAPPING[reportType];
  if (!config) return {};

  const parameters: Record<string, string[]> = {};

  for (const [filterKey, filterValue] of Object.entries(filters)) {
    const boldParamName = config.parameterMapping[filterKey];
    if (!boldParamName || filterValue === undefined || filterValue === null || filterValue === '') {
      continue;
    }

    // Handle Date objects
    if (filterValue instanceof Date) {
      parameters[boldParamName] = [filterValue.toISOString().split('T')[0]];
    }
    // Handle arrays
    else if (Array.isArray(filterValue)) {
      parameters[boldParamName] = filterValue.map(String);
    }
    // Handle primitive values
    else {
      parameters[boldParamName] = [String(filterValue)];
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
