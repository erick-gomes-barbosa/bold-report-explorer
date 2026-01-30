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
  const [contentEmpty, setContentEmpty] = useState(false);
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
    setContentEmpty(false);
  }, [fileBlob]);

  useEffect(() => {
    const renderDocument = async () => {
      if (!fileBlob || loading || isRendered) {
        return;
      }

      // Use double requestAnimationFrame to ensure DOM is ready after dialog animation
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      if (!isMountedRef.current || !containerRef.current) {
        console.log('[DocxPreview] Component not mounted or container not ready');
        return;
      }

      setRenderLoading(true);
      setRenderError(null);
      setContentEmpty(false);

      const container = containerRef.current;

      try {
        // Clear previous content safely
        container.innerHTML = '';

        // Convert Blob to ArrayBuffer for better compatibility
        console.log('[DocxPreview] Converting Blob to ArrayBuffer, blob size:', fileBlob.size, 'type:', fileBlob.type);
        const arrayBuffer = await fileBlob.arrayBuffer();
        console.log('[DocxPreview] ArrayBuffer created, byteLength:', arrayBuffer.byteLength);

        // Dynamically import docx-preview
        const docxPreview = await import('docx-preview');
        
        // Check if still mounted after async import
        if (!isMountedRef.current) {
          console.log('[DocxPreview] Component unmounted during import, aborting');
          return;
        }

        console.log('[DocxPreview] Rendering document with ArrayBuffer...');
        
        await docxPreview.renderAsync(arrayBuffer, container, undefined, {
          className: 'docx-preview-content',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          debug: true,
        });
        
        if (isMountedRef.current) {
          console.log('[DocxPreview] Document rendered successfully');
          console.log('[DocxPreview] Container children:', container.children.length);
          console.log('[DocxPreview] Container innerHTML length:', container.innerHTML.length);
          console.log('[DocxPreview] Has .docx-wrapper:', !!container.querySelector('.docx-wrapper'));
          console.log('[DocxPreview] Has section.docx:', !!container.querySelector('section.docx'));
          
          setIsRendered(true);
          
          // Check if content is actually visible after a short delay
          setTimeout(() => {
            if (isMountedRef.current && container) {
              const textContent = container.textContent?.trim() || '';
              console.log('[DocxPreview] Text content length:', textContent.length);
              console.log('[DocxPreview] Text content preview:', textContent.substring(0, 100));
              
              if (textContent.length === 0 && container.innerHTML.length < 500) {
                console.log('[DocxPreview] Content appears empty, showing fallback');
                setContentEmpty(true);
              }
            }
          }, 500);
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
      setContentEmpty(false);
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
      
      {/* Fallback message when content appears empty */}
      {contentEmpty && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90">
          <div className="flex flex-col items-center gap-3 text-center p-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium">Documento renderizado, mas o conteúdo não está visível</p>
            <p className="text-xs text-muted-foreground">
              Isso pode ocorrer com alguns formatos. Use o botão "Baixar" para visualizar o arquivo.
            </p>
          </div>
        </div>
      )}
      
      {/* Enhanced styles for docx-preview with forced visibility */}
      <style>{`
        .docx-container {
          background: white;
          position: relative;
        }
        .docx-container .docx-wrapper {
          background: white !important;
          padding: 20px;
          min-height: 100%;
        }
        .docx-container .docx-wrapper > section.docx {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          margin-bottom: 20px;
          background: white;
          min-height: 200px;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .docx-container table {
          border-collapse: collapse;
        }
        .docx-container td, .docx-container th {
          border: 1px solid #ddd;
          padding: 4px 8px;
        }
        /* Force text visibility */
        .docx-container p,
        .docx-container span,
        .docx-container div,
        .docx-container h1,
        .docx-container h2,
        .docx-container h3,
        .docx-container h4,
        .docx-container h5,
        .docx-container h6,
        .docx-container li,
        .docx-container td,
        .docx-container th {
          color: #000 !important;
        }
        /* Ensure proper rendering */
        .docx-container .docx-wrapper * {
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
