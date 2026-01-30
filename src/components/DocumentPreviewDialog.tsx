import { useState, useCallback } from 'react';
import { X, Download, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileSpreadsheet, FileText, FileType, Eye } from 'lucide-react';
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
import { SpreadsheetPreview } from './SpreadsheetPreview';
import { BoldReportViewer } from './BoldReportViewer';
import type { ExportFormat } from '@/types/boldReports';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileBlob: Blob | null;
  format: ExportFormat;
  loading: boolean;
  onDownload: () => void;
  documentName?: string;
  // New props for embedded viewer mode
  useEmbeddedViewer?: boolean;
  reportPath?: string;
  reportParameters?: Record<string, string | string[]>;
}

// Format display names and icons
const formatInfo: Record<string, { label: string; icon: React.ReactNode }> = {
  PDF: { label: 'PDF', icon: <FileText className="h-4 w-4" /> },
  Excel: { label: 'Excel', icon: <FileSpreadsheet className="h-4 w-4" /> },
  Word: { label: 'Word', icon: <FileType className="h-4 w-4" /> },
  CSV: { label: 'CSV', icon: <FileSpreadsheet className="h-4 w-4" /> },
  HTML: { label: 'HTML', icon: <Eye className="h-4 w-4" /> },
  PPT: { label: 'PowerPoint', icon: <FileText className="h-4 w-4" /> },
};

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileBlob,
  format,
  loading,
  onDownload,
  documentName = 'Documento',
  useEmbeddedViewer = false,
  reportPath,
  reportParameters,
}: DocumentPreviewDialogProps) {
  // PDF-specific state
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
      setNumPages(0);
    }
    onOpenChange(newOpen);
  };

  const formatDisplay = formatInfo[format] || formatInfo.PDF;
  const isPDF = format === 'PDF';
  const isSpreadsheet = format === 'Excel' || format === 'CSV';

  const renderPreviewContent = () => {
    // Use Bold Reports Embedded Viewer when enabled and we have the report path
    if (useEmbeddedViewer && reportPath) {
      return (
        <div className="flex-1 overflow-hidden bg-muted/30">
          <BoldReportViewer
            reportPath={reportPath}
            parameters={reportParameters}
            onReportLoaded={() => console.log('Report loaded')}
            onReportError={(error) => console.error('Report error:', error)}
          />
        </div>
      );
    }

    // Fallback to PDF viewer for exported PDFs
    if (isPDF) {
      return (
        <div className="flex-1 overflow-auto bg-muted/30 flex flex-col items-center">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando pré-visualização...</p>
              </div>
            </div>
          ) : fileUrl ? (
            <div className="py-4 flex flex-col items-center min-h-full relative">
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <Document
                file={fileUrl}
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
      );
    }

    if (isSpreadsheet) {
      return (
        <div className="flex-1 overflow-hidden bg-muted/30">
          <SpreadsheetPreview
            fileUrl={fileUrl}
            fileBlob={fileBlob}
            loading={loading}
          />
        </div>
      );
    }

    // Fallback for other formats - show message to use embedded viewer or download
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 p-8">
        <FileType className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">
          Pré-visualização disponível no visualizador
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          Para visualizar este documento {formatDisplay.label}, use o visualizador embedded 
          ou baixe o arquivo diretamente.
        </p>
        <Button onClick={onDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Baixar {formatDisplay.label}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0" hideCloseButton>
        <DialogDescription className="sr-only">
          Pré-visualização do documento {format}
        </DialogDescription>
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {formatDisplay.icon}
              <DialogTitle className="text-lg font-medium truncate max-w-[300px]">
                {documentName}
              </DialogTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {useEmbeddedViewer ? 'Viewer' : formatDisplay.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom controls - only for PDF without embedded viewer */}
              {isPDF && !useEmbeddedViewer && (
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
              )}
              
              {/* Download button - always show unless using embedded viewer (which has its own) */}
              {!useEmbeddedViewer && (
                <Button
                  id="btn-download-preview"
                  onClick={onDownload}
                  disabled={loading || (!fileUrl && !fileBlob)}
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Baixar</span>
                </Button>
              )}
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
        
        {renderPreviewContent()}

        {/* Page navigation footer - only for PDF without embedded viewer */}
        {isPDF && !useEmbeddedViewer && fileUrl && numPages > 0 && !loading && (
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
