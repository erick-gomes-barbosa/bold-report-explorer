import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocxPreviewProps {
  fileBlob: Blob | null;
  loading: boolean;
}

export function DocxPreview({ fileBlob, loading }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderAttemptedRef = useRef(false);

  // Callback ref to detect when container is mounted
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node) {
      setContainerReady(true);
    }
  }, []);

  useEffect(() => {
    const renderDocument = async () => {
      // Wait for all conditions to be met
      if (!fileBlob || !containerRef.current || loading || !containerReady) {
        console.log('[DocxPreview] Waiting for conditions:', {
          hasBlob: !!fileBlob,
          hasContainer: !!containerRef.current,
          loading,
          containerReady
        });
        return;
      }

      // Prevent double render
      if (renderAttemptedRef.current) {
        return;
      }
      renderAttemptedRef.current = true;

      setRenderLoading(true);
      setRenderError(null);

      const container = containerRef.current;

      try {
        // Clear previous content safely
        container.innerHTML = '';

        // Dynamically import docx-preview to avoid SSR issues
        const docxPreview = await import('docx-preview');
        
        console.log('[DocxPreview] Rendering document, blob size:', fileBlob.size, 'type:', fileBlob.type);
        
        // Double-check container is still valid after async import
        if (!containerRef.current) {
          throw new Error('Container was unmounted during import');
        }
        
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
        
        console.log('[DocxPreview] Document rendered successfully');
      } catch (err) {
        console.error('[DocxPreview] Error rendering DOCX:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setRenderError(`Erro ao renderizar documento: ${errorMessage}`);
      } finally {
        setRenderLoading(false);
      }
    };

    renderDocument();
  }, [fileBlob, loading, containerReady]);

  // Reset render attempt when blob changes
  useEffect(() => {
    renderAttemptedRef.current = false;
  }, [fileBlob]);

  // Reset state when no file
  useEffect(() => {
    if (!fileBlob) {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setRenderError(null);
      renderAttemptedRef.current = false;
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
          ref={setContainerRef}
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
