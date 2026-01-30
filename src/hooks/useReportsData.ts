import { useState, useCallback } from 'react';
import type { ReportType, ReportDataItem, PaginationState, ExportFormat } from '@/types/reports';

// Mock data generators for each report type
function generateBensNecessidadeData(): ReportDataItem[] {
  return Array.from({ length: 47 }, (_, i) => ({
    id: `bem-${i + 1}`,
    patrimonio: `PAT-${String(i + 1).padStart(6, '0')}`,
    descricao: ['Mesa de escritório', 'Cadeira giratória', 'Computador Dell', 'Impressora HP', 'Armário de aço'][i % 5],
    grupo: ['Mobiliário', 'Equipamentos de Informática', 'Veículos'][i % 3],
    situacao: ['Ativo', 'Inativo', 'Em Manutenção'][i % 3],
    conservacao: ['Ótimo', 'Bom', 'Regular', 'Ruim'][i % 4],
    valorAquisicao: (Math.random() * 10000 + 500).toFixed(2),
    dataAquisicao: new Date(2020 + Math.floor(i / 12), i % 12, 1).toLocaleDateString('pt-BR'),
    unidade: ['Sede', 'Filial Norte', 'Almoxarifado'][i % 3],
  }));
}

function generateInventarioData(): ReportDataItem[] {
  return Array.from({ length: 32 }, (_, i) => ({
    id: `inv-${i + 1}`,
    codigo: `INV-${String(i + 1).padStart(4, '0')}`,
    tipo: i % 2 === 0 ? 'Total' : 'Parcial',
    unidade: ['Sede Principal', 'Almoxarifado Central', 'Depósito Norte', 'Filial Sul'][i % 4],
    status: ['Pendente', 'Em Andamento', 'Concluído', 'Cancelado'][i % 4],
    totalItens: Math.floor(Math.random() * 500) + 50,
    itensVerificados: Math.floor(Math.random() * 400) + 20,
    divergencias: Math.floor(Math.random() * 10),
    dataInicio: new Date(2024, i % 12, 1).toLocaleDateString('pt-BR'),
    responsavel: ['João Silva', 'Maria Santos', 'Pedro Costa'][i % 3],
  }));
}

function generateAuditoriaData(): ReportDataItem[] {
  return Array.from({ length: 25 }, (_, i) => ({
    id: `aud-${i + 1}`,
    processo: `AUD-${String(i + 1).padStart(5, '0')}/2024`,
    orgao: ['Prefeitura Municipal', 'Câmara Municipal'][i % 2],
    unidade: ['Secretaria de Administração', 'Secretaria de Finanças', 'Gabinete'][i % 3],
    setor: ['Recursos Humanos', 'Patrimônio', 'Contabilidade'][i % 3],
    tipoAuditoria: ['Ordinária', 'Especial', 'Seguimento'][i % 3],
    situacao: ['Em análise', 'Concluída', 'Pendência'][i % 3],
    periodo: `${String(i % 12 + 1).padStart(2, '0')}/2024`,
    observacoes: i % 3 === 0 ? 'Com recomendações' : '-',
  }));
}

export function useReportsData() {
  const [data, setData] = useState<ReportDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
  });

  const fetchReportData = useCallback(async (
    reportType: ReportType,
    filters: unknown,
    page: number = 0
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock data based on report type
      let allData: ReportDataItem[];
      switch (reportType) {
        case 'bens-necessidade':
          allData = generateBensNecessidadeData();
          break;
        case 'inventario':
          allData = generateInventarioData();
          break;
        case 'auditoria':
          allData = generateAuditoriaData();
          break;
        default:
          allData = [];
      }
      
      // Paginate
      const pageSize = pagination.pageSize;
      const startIndex = page * pageSize;
      const paginatedData = allData.slice(startIndex, startIndex + pageSize);
      
      setData(paginatedData);
      setPagination(prev => ({
        ...prev,
        pageIndex: page,
        totalCount: allData.length,
      }));
      
      console.log('Report data fetched:', { reportType, filters, page, total: allData.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  const exportData = useCallback(async (
    reportType: ReportType,
    format: ExportFormat,
    filters: unknown
  ) => {
    setLoading(true);
    try {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, this would call the backend
      console.log('Exporting report:', { reportType, format, filters });
      
      // Simulate download
      const filename = `relatorio_${reportType}_${Date.now()}.${format}`;
      console.log('Download started:', filename);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar');
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
    setError(null);
    setPagination(prev => ({ ...prev, pageIndex: 0, totalCount: 0 }));
  }, []);

  return {
    data,
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
