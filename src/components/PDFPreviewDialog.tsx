import { X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  loading: boolean;
  onDownload: () => void;
  reportName?: string;
}

export function PDFPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  loading,
  onDownload,
  reportName = 'Relatório',
}: PDFPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium">
              Pré-visualização: {reportName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                id="btn-download-preview"
                onClick={onDownload}
                disabled={loading || !pdfUrl}
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-muted/30">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando pré-visualização...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Nenhum PDF para exibir
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
