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
    reportId: 'PLACEHOLDER_BENS_NECESSIDADE_ID',
    parameterMapping: {
      orgaoUnidade: 'OrgaoUnidade',
      grupo: 'Grupo',
      situacao: 'Situacao',
      conservacao: 'Conservacao',
      faixaPrecoMin: 'PrecoMinimo',
      faixaPrecoMax: 'PrecoMaximo',
      dataAquisicaoInicio: 'DataInicio',
      dataAquisicaoFim: 'DataFim',
    }
  },
  'inventario': {
    reportId: 'PLACEHOLDER_INVENTARIO_ID',
    parameterMapping: {
      tipo: 'Tipo',
      status: 'Status',
      periodoInicio: 'DataInicio',
      periodoFim: 'DataFim',
      unidadeAlvo: 'UnidadeAlvo',
    }
  },
  'auditoria': {
    reportId: 'PLACEHOLDER_AUDITORIA_ID',
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
