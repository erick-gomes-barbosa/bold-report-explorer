import { useState, useCallback } from 'react';
import { X, Download, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfLoading, setPdfLoading] = useState<boolean>(true);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfLoading(false);
  }, []);

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPageNumber(1);
      setScale(1.0);
      setPdfLoading(true);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0" hideCloseButton>
        <DialogDescription className="sr-only">
          Pré-visualização do relatório PDF
        </DialogDescription>
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium truncate max-w-[300px]">
              {reportName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="h-8 w-8"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomIn}
                  disabled={scale >= 3.0}
                  className="h-8 w-8"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                id="btn-download-preview"
                onClick={onDownload}
                disabled={loading || !pdfUrl}
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Baixar PDF</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-muted/30 flex flex-col items-center">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando pré-visualização...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="py-4 flex flex-col items-center min-h-full">
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center p-8 text-destructive">
                    <p>Erro ao carregar o PDF</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Tente baixar o arquivo diretamente
                    </p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  className="shadow-lg"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Nenhum PDF para exibir
              </p>
            </div>
          )}
        </div>

        {/* Page navigation footer */}
        {pdfUrl && numPages > 0 && !loading && (
          <div className="px-4 py-3 border-t flex items-center justify-center gap-4 bg-background">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pageNumber} de {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="gap-1"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
