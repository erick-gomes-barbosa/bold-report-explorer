import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FiltersSidebar } from './FiltersSidebar';
import type { ReportType } from '@/types/reports';

interface MobileFiltersDrawerProps {
  reportType: ReportType;
  onSubmit: (data: unknown) => void;
  loading?: boolean;
}

export function MobileFiltersDrawer({ reportType, onSubmit, loading }: MobileFiltersDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtros do Relatório
          </SheetTitle>
        </SheetHeader>
        <FiltersSidebar 
          reportType={reportType} 
          onSubmit={onSubmit}
          loading={loading}
        />
      </SheetContent>
    </Sheet>
  );
}
