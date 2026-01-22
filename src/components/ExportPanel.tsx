import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParameterForm } from './ParameterForm';
import type { BoldReport, ReportParameter, ExportFormat } from '@/types/boldReports';

interface ExportPanelProps {
  report: BoldReport;
  parameters: ReportParameter[];
  loading: boolean;
  onExport: (format: ExportFormat, params: Record<string, string | string[]>) => void;
}

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {exportFormats.map(({ format, label, icon }) => (
              <Button
                key={format}
                variant={selectedFormat === format ? 'default' : 'outline'}
                size="sm"
                className="justify-start gap-2"
                onClick={() => setSelectedFormat(format)}
              >
                {icon}
                {label}
              </Button>
            ))}
          </div>

          <Button 
            onClick={handleExport} 
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar Relatório
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
