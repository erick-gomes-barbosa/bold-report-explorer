import { Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BensNecessidadeFilters } from './filters/BensNecessidadeFilters';
import { InventarioFilters } from './filters/InventarioFilters';
import { AuditoriaFilters } from './filters/AuditoriaFilters';
import type { ReportType } from '@/types/reports';

interface FiltersSidebarProps {
  reportType: ReportType;
  onSubmit: (data: unknown) => void;
  loading?: boolean;
}

export function FiltersSidebar({ reportType, onSubmit, loading }: FiltersSidebarProps) {
  return (
    <div className="bg-card rounded-lg border border-border flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 p-4 pb-3 border-b border-border flex-shrink-0">
        <Filter className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Filtros</h3>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 pt-3">
          {reportType === 'bens-necessidade' && (
            <BensNecessidadeFilters onSubmit={onSubmit} loading={loading} />
          )}
          {reportType === 'inventario' && (
            <InventarioFilters onSubmit={onSubmit} loading={loading} />
          )}
          {reportType === 'auditoria' && (
            <AuditoriaFilters onSubmit={onSubmit} loading={loading} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
