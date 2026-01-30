import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ParameterForm } from './ParameterForm';
import type { BoldReport, ReportParameter, ExportFormat } from '@/types/boldReports';

interface ExportPanelProps {
  report: BoldReport;
  parameters: ReportParameter[];
  loading: boolean;
  onExport: (format: ExportFormat, params: Record<string, string | string[]>) => void;
}

// Format-specific colors that blend with the earthy palette
const formatColors: Record<ExportFormat, { bg: string; text: string; border: string }> = {
  PDF: { 
    bg: 'bg-red-50 dark:bg-red-950/30', 
    text: 'text-red-600 dark:text-red-400', 
    border: 'border-red-200 dark:border-red-800' 
  },
  Excel: { 
    bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    border: 'border-emerald-200 dark:border-emerald-800' 
  },
  Word: { 
    bg: 'bg-blue-50 dark:bg-blue-950/30', 
    text: 'text-blue-600 dark:text-blue-400', 
    border: 'border-blue-200 dark:border-blue-800' 
  },
  CSV: { 
    bg: 'bg-amber-50 dark:bg-amber-950/30', 
    text: 'text-amber-600 dark:text-amber-400', 
    border: 'border-amber-200 dark:border-amber-800' 
  },
  HTML: { 
    bg: 'bg-orange-50 dark:bg-orange-950/30', 
    text: 'text-orange-600 dark:text-orange-400', 
    border: 'border-orange-200 dark:border-orange-800' 
  },
  PPT: { 
    bg: 'bg-rose-50 dark:bg-rose-950/30', 
    text: 'text-rose-600 dark:text-rose-400', 
    border: 'border-rose-200 dark:border-rose-800' 
  },
};

const exportFormats: { format: ExportFormat; label: string; icon: React.ReactNode }[] = [
  { format: 'PDF', label: 'PDF', icon: <FileText className="h-4 w-4" /> },
  { format: 'Excel', label: 'Excel', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { format: 'Word', label: 'Word', icon: <FileType className="h-4 w-4" /> },
  { format: 'CSV', label: 'CSV', icon: <FileSpreadsheet className="h-4 w-4" /> },
];

export function ExportPanel({ report, parameters, loading, onExport }: ExportPanelProps) {
  const [parameterValues, setParameterValues] = useState<Record<string, string | string[]>>({});
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('PDF');

  const handleExport = () => {
    onExport(selectedFormat, parameterValues);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {report.Name}
          </CardTitle>
          {report.Description && (
            <p className="text-sm text-muted-foreground">{report.Description}</p>
          )}
        </CardHeader>
      </Card>

      {parameters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Parâmetros</CardTitle>
          </CardHeader>
          <CardContent>
            <ParameterForm
              parameters={parameters}
              values={parameterValues}
              onChange={setParameterValues}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Formato de Exportação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {exportFormats.map(({ format, label, icon }) => {
              const colors = formatColors[format];
              const isSelected = selectedFormat === format;
              
              return (
                <TooltipProvider key={format}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        id={`btn-format-${format.toLowerCase()}`}
                        variant="outline"
                        size="sm"
                        className={`justify-center gap-1.5 transition-all ${
                          isSelected 
                            ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-current` 
                            : `hover:${colors.bg} hover:${colors.text} hover:${colors.border}`
                        }`}
                        onClick={() => setSelectedFormat(format)}
                      >
                        <span className={isSelected ? colors.text : colors.text}>{icon}</span>
                        <span className="hidden xl:inline">{label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="xl:hidden">
                      <p>{label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  id="btn-export-report"
                  onClick={handleExport} 
                  disabled={loading}
                  className="w-full gap-2"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span className="hidden xl:inline">Exportando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 shrink-0" />
                      <span className="hidden xl:inline">Exportar</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="xl:hidden">
                <p>{loading ? 'Exportando...' : 'Exportar'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
