import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface DocxPreviewProps {
  fileBlob: Blob | null;
  loading: boolean;
}

export function DocxPreview({ fileBlob, loading }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Reset rendered state when blob changes
    setIsRendered(false);
  }, [fileBlob]);

  useEffect(() => {
    const renderDocument = async () => {
      if (!fileBlob || loading || isRendered) {
        return;
      }

      // Use a small delay to ensure DOM is ready after dialog animation
      await new Promise(resolve => setTimeout(resolve, 150));

      if (!isMountedRef.current || !containerRef.current) {
        console.log('[DocxPreview] Component not mounted or container not ready');
        return;
      }

      setRenderLoading(true);
      setRenderError(null);

      const container = containerRef.current;

      try {
        // Clear previous content safely
        container.innerHTML = '';

        // Dynamically import docx-preview
        const docxPreview = await import('docx-preview');
        
        // Check if still mounted after async import
        if (!isMountedRef.current) {
          console.log('[DocxPreview] Component unmounted during import, aborting');
          return;
        }

        console.log('[DocxPreview] Rendering document, blob size:', fileBlob.size);
        
        await docxPreview.renderAsync(fileBlob, container, undefined, {
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
        
        if (isMountedRef.current) {
          console.log('[DocxPreview] Document rendered successfully, container children:', container.children.length);
          setIsRendered(true);
        }
      } catch (err) {
        console.error('[DocxPreview] Error rendering DOCX:', err);
        if (isMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          setRenderError(`Erro ao renderizar documento: ${errorMessage}`);
        }
      } finally {
        if (isMountedRef.current) {
          setRenderLoading(false);
        }
      }
    };

    renderDocument();
  }, [fileBlob, loading, isRendered]);

  // Reset state when no file
  useEffect(() => {
    if (!fileBlob) {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setRenderError(null);
      setIsRendered(false);
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
    <div className="h-full overflow-auto">
      <div className="p-4 flex justify-center min-h-full">
        <div
          ref={containerRef}
          className="docx-container bg-white shadow-lg max-w-full"
          style={{
            minHeight: '500px',
            minWidth: '600px',
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
    </div>
  );
}
