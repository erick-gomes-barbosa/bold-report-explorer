import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocxPreviewProps {
  fileBlob: Blob | null;
  loading: boolean;
}

export function DocxPreview({ fileBlob, loading }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const renderDocument = async () => {
      if (!fileBlob || !containerRef.current || loading) return;

      setRenderLoading(true);
      setRenderError(null);

      // Clear previous content
      containerRef.current.innerHTML = '';

      try {
        await renderAsync(fileBlob, containerRef.current, undefined, {
          className: 'docx-preview-content',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
      } catch (err) {
        console.error('Error rendering DOCX:', err);
        setRenderError(err instanceof Error ? err.message : 'Erro ao renderizar documento');
      } finally {
        setRenderLoading(false);
      }
    };

    renderDocument();
  }, [fileBlob, loading]);

  // Reset state when no file
  useEffect(() => {
    if (!fileBlob && containerRef.current) {
      containerRef.current.innerHTML = '';
      setRenderError(null);
    }
  }, [fileBlob]);

  if (loading || renderLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {loading ? 'Gerando pré-visualização...' : 'Renderizando documento...'}
          </p>
        </div>
      </div>
    );
  }

  if (renderError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{renderError}</p>
          <p className="text-xs text-muted-foreground">Tente baixar o arquivo diretamente</p>
        </div>
      </div>
    );
  }

  if (!fileBlob) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Nenhum documento para exibir</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 flex justify-center">
        <div
          ref={containerRef}
          className="docx-container bg-white shadow-lg max-w-full"
          style={{
            minHeight: '500px',
          }}
        />
      </div>
      
      {/* Styles for docx-preview */}
      <style>{`
        .docx-container {
          background: white;
        }
        .docx-container .docx-wrapper {
          background: white !important;
          padding: 20px;
        }
        .docx-container .docx-wrapper > section.docx {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          margin-bottom: 20px;
          background: white;
        }
        .docx-container table {
          border-collapse: collapse;
        }
        .docx-container td, .docx-container th {
          border: 1px solid #ddd;
          padding: 4px 8px;
        }
      `}</style>
    </ScrollArea>
  );
}
