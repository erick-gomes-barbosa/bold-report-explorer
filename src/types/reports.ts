// Report types for the Bens Móveis module

export type ReportType = 'bens-necessidade' | 'inventario' | 'auditoria';

export interface OrgaoUnidade {
  id: string;
  nome: string;
  setores?: Setor[];
}

export interface Setor {
  id: string;
  nome: string;
}

export interface Grupo {
  id: string;
  nome: string;
}

// Filter schemas for each report type
export interface BensNecessidadeFilters {
  orgaoUnidade?: string;
  grupo?: string;
  situacao?: string;
  conservacao?: string;
  faixaPrecoMin?: number;
  faixaPrecoMax?: number;
  dataAquisicaoInicio?: Date;
  dataAquisicaoFim?: Date;
}

export interface InventarioFilters {
  tipo: 'total' | 'parcial';
  status?: string;
  periodoInicio?: Date;
  periodoFim?: Date;
  unidadeAlvo?: string;
}

export interface AuditoriaFilters {
  orgao?: string;
  unidade?: string;
  setor?: string;
  periodoInicio?: Date;
  periodoFim?: Date;
}

export type ReportFilters = BensNecessidadeFilters | InventarioFilters | AuditoriaFilters;

// Report data item (generic for DataTable)
export interface ReportDataItem {
  id: string;
  [key: string]: unknown;
}

// Column definition for DataTable
export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey: keyof T;
  cell?: (value: unknown, row: T) => React.ReactNode;
}

// Pagination state
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

// Report state
export interface ReportState {
  data: ReportDataItem[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
}

// Export format options
export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

// Permission levels
export type PermissionLevel = 'viewer' | 'editor' | 'admin';

export interface UserPermissions {
  level: PermissionLevel;
  canViewBensNecessidade: boolean;
  canViewInventario: boolean;
  canViewAuditoria: boolean;
  canExport: boolean;
}
