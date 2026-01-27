import jquery from 'jquery';
import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from 'react-dom';

// Expõe as dependências no escopo global (window) para os scripts base do Bold Reports
declare global {
  interface Window {
    React: typeof React;
    createReactClass: typeof createReactClass;
    ReactDOM: typeof ReactDOM;
    $: typeof jquery;
    jQuery: typeof jquery;
    BoldReportViewerComponent: React.ComponentType<BoldReportViewerProps>;
  }
}

export interface BoldReportViewerProps {
  id: string;
  reportServiceUrl: string;
  reportPath?: string;
  parameters?: Array<{
    name: string;
    labels?: string[];
    values: string[];
    nullable?: boolean;
  }>;
  locale?: string;
  toolbarSettings?: {
    showToolbar?: boolean;
    items?: string[];
  };
  exportSettings?: {
    exportOptions?: number;
    excelFormat?: string;
    wordFormat?: string;
    pptFormat?: string;
  };
  printMode?: boolean;
  printOption?: string;
  processingMode?: string;
  enablePageCache?: boolean;
  renderMode?: string;
  dataSources?: Array<{
    name: string;
    value: unknown[];
  }>;
  authorizationHeaderValue?: string;
  reportLoaded?: () => void;
  reportError?: (args: { errorCode: string; message: string }) => void;
  exportItemClick?: (args: { exportType: string }) => void;
  exportProgressChanged?: (args: { progress: number }) => void;
  ajaxBeforeLoad?: (args: { headers: Record<string, string> }) => void;
}

window.React = React;
window.createReactClass = createReactClass;
window.ReactDOM = ReactDOM;
window.$ = window.jQuery = jquery;

export {};
