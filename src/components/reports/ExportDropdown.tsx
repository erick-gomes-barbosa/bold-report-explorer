import { FileSpreadsheet, FileText, FileDown, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { ExportFormat } from '@/types/reports';

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
  exporting?: boolean;
}

export function ExportDropdown({ onExport, disabled, loading, exporting }: ExportDropdownProps) {
  const isDisabled = disabled || loading || exporting;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={isDisabled}
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onExport('pdf')} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4 text-destructive" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onExport('xlsx')} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Exportar Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('csv')} className="gap-2 cursor-pointer">
          <FileDown className="h-4 w-4 text-blue-600" />
          Exportar CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}