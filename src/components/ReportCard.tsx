import { FileText, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { BoldReport } from '@/types/boldReports';

interface ReportCardProps {
  report: BoldReport;
  isSelected: boolean;
  onClick: () => void;
}

export function ReportCard({ report, isSelected, onClick }: ReportCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-primary bg-blue-light/30' 
          : 'hover:bg-accent/50'
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{report.Name}</h3>
            {report.CategoryName && (
              <span className="text-xs text-muted-foreground">{report.CategoryName}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {report.Description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {report.Description}
          </p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {report.ModifiedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(report.ModifiedDate)}
            </span>
          )}
          {report.ModifiedByDisplayName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {report.ModifiedByDisplayName}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
