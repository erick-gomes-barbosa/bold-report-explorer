import type { ReportType } from '@/types/reports';

/**
 * Mapeamento de nomes de colunas do Bold Reports para nomes amigáveis.
 * 
 * Os relatórios do Bold Reports podem retornar headers genéricos como
 * "TextBox1", "TextBox2", etc. Este mapeamento converte para nomes legíveis.
 */

// Mapeamento para o relatório de Bens por Necessidade
export const BENS_NECESSIDADE_COLUMNS: Record<string, string> = {
  'TextBox9': 'Patrimônio',
  'TextBox10': 'Descrição',
  'TextBox11': 'Situação',
  'TextBox12': 'Conservação',
  'TextBox13': 'Valor',
  'TextBox14': 'Grupo',
  'TextBox15': 'Unidade',
};

// Mapeamento para o relatório de Inventário
export const INVENTARIO_COLUMNS: Record<string, string> = {
  'TextBox23': 'Descrição',
  'TextBox24': 'Tipo',
  'TextBox25': 'Status',
  'TextBox26': 'Data',
  'TextBox27': 'Data Fim',
  'TextBox28': 'Unidade',
  'TextBox29': 'Total Itens',
};

// Mapeamento para o relatório de Auditoria
export const AUDITORIA_COLUMNS: Record<string, string> = {
  'TextBox27': 'Órgão',
  'TextBox28': 'Unidade',
  'TextBox29': 'Setor',
  'TextBox30': 'Data Início',
  'TextBox31': 'Data Fim',
};

/**
 * Obtém o mapeamento de colunas para um tipo de relatório.
 */
export function getColumnMapping(reportType: ReportType): Record<string, string> {
  switch (reportType) {
    case 'bens-necessidade':
      return BENS_NECESSIDADE_COLUMNS;
    case 'inventario':
      return INVENTARIO_COLUMNS;
    case 'auditoria':
      return AUDITORIA_COLUMNS;
    default:
      return {};
  }
}

/**
 * Aplica o mapeamento de colunas a um array de headers.
 */
export function mapHeaders(headers: string[], mapping: Record<string, string>): string[] {
  return headers.map(header => mapping[header] || header);
}
