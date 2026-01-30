import { useState, useEffect, useCallback } from 'react';

interface ScriptStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

const SCRIPTS = [
  {
    id: 'jquery',
    sources: [
      '/scripts/jquery-3.6.0.min.js',
      'https://code.jquery.com/jquery-3.6.0.min.js',
    ],
    check: () => typeof window !== 'undefined' && !!window.jQuery,
    beforeLoad: () => {
      // Create Syncfusion namespace if it doesn't exist (for Bold Reports compatibility)
      if (typeof window !== 'undefined' && !window.Syncfusion) {
        (window as any).Syncfusion = {};
      }
    },
  },
  {
    id: 'jsrender',
    sources: [
      '/scripts/jsrender.min.js',
      'https://cdn.jsdelivr.net/npm/jsrender@1.0.12/jsrender.min.js',
    ],
    check: () => typeof window !== 'undefined' && !!window.jQuery?.templates,
  },
  {
    id: 'bold-common',
    sources: [
      '/scripts/bold.reports.common.min.js',
    ],
    check: () => typeof window !== 'undefined' && !!window.ej,
  },
  {
    id: 'bold-widgets',
    sources: [
      '/scripts/bold.reports.widgets.min.js',
    ],
    // widgets may initialize differently, just check if ej exists
    check: () => typeof window !== 'undefined' && !!window.ej,
  },
  {
    id: 'bold-viewer',
    sources: [
      '/scripts/bold.report-viewer.min.js',
    ],
    check: () => typeof window !== 'undefined' && !!window.jQuery?.fn?.boldReportViewer,
    beforeLoad: () => {
      // Ensure Syncfusion namespace exists before loading viewer
      if (typeof window !== 'undefined' && !window.Syncfusion) {
        (window as any).Syncfusion = {};
      }
    },
  },
];

const CSS_LINKS = [
  {
    id: 'bold-css',
    href: '/styles/bold.report-viewer.min.css',
  },
];

// Load a single script dynamically with fallback sources
const loadScript = async (sources: string[], id: string): Promise<void> => {
  // Check if script already exists
  if (document.getElementById(id)) {
    return;
  }

  for (const src of sources) {
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = false; // Load in order

        script.onload = () => {
          console.log(`[BoldReportsScripts] Script loaded: ${id} from ${src}`);
          resolve();
        };

        script.onerror = () => {
          // Remove failed script so we can try next source
          script.remove();
          reject(new Error(`Failed to load from ${src}`));
        };

        document.head.appendChild(script);
      });
      return; // Success, exit
    } catch (err) {
      console.warn(`[BoldReportsScripts] Fallback: ${id} failed from ${src}`);
    }
  }

  throw new Error(`Failed to load script: ${id} from all sources`);
};

// Load CSS dynamically
const loadCSS = (href: string, id: string): void => {
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  console.log(`[BoldReportsScripts] CSS loaded: ${id}`);
};

export function useBoldReportsScripts(): ScriptStatus & { retry: () => void } {
  const [status, setStatus] = useState<ScriptStatus>({
    loaded: false,
    loading: true,
    error: null,
  });

  const loadAllScripts = useCallback(async () => {
    setStatus({ loaded: false, loading: true, error: null });

    try {
      // Load CSS first
      for (const css of CSS_LINKS) {
        loadCSS(css.href, css.id);
      }

      // Check if already loaded
      const allLoaded = SCRIPTS.every(s => s.check());
      if (allLoaded) {
        console.log('[BoldReportsScripts] All scripts already loaded');
        setStatus({ loaded: true, loading: false, error: null });
        return;
      }

      // Load scripts in sequence
      for (const script of SCRIPTS) {
        if (!script.check()) {
          // Run beforeLoad hook if exists
          if ('beforeLoad' in script && typeof script.beforeLoad === 'function') {
            script.beforeLoad();
          }
          
          console.log(`[BoldReportsScripts] Loading: ${script.id}`);
          await loadScript(script.sources, script.id);
          
          // Wait a bit for script to initialize
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify it loaded
          if (!script.check()) {
            throw new Error(`Script ${script.id} loaded but not initialized`);
          }
        } else {
          console.log(`[BoldReportsScripts] Already loaded: ${script.id}`);
        }
      }

      // Final verification
      const finalCheck = {
        jQuery: !!window.jQuery,
        ej: !!window.ej,
        boldReportViewer: !!window.jQuery?.fn?.boldReportViewer,
      };

      console.log('[BoldReportsScripts] Final verification:', finalCheck);

      if (finalCheck.jQuery && finalCheck.boldReportViewer) {
        setStatus({ loaded: true, loading: false, error: null });
      } else {
        throw new Error('Scripts loaded but Bold Report Viewer not available');
      }
    } catch (err) {
      console.error('[BoldReportsScripts] Error:', err);
      setStatus({
        loaded: false,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar scripts',
      });
    }
  }, []);

  useEffect(() => {
    loadAllScripts();
  }, [loadAllScripts]);

  return { ...status, retry: loadAllScripts };
}

// Extend Window interface
declare global {
  interface Window {
    jQuery: any;
    $: any;
    ej: any;
    Syncfusion: any;
  }
}
