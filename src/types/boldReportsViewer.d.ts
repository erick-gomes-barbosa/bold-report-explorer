declare module '@boldreports/react-reporting-components' {
  import { Component } from 'react';

  interface ReportParameter {
    name: string;
    values: string[];
  }

  interface AjaxBeforeLoadArgs {
    headers: Array<{ Key: string; Value: string }>;
    serviceAuthorizationToken?: string;
    data?: unknown;
    url?: string;
    type?: string;
  }

  interface BoldReportViewerProps {
    id: string;
    reportServiceUrl: string;
    reportServerUrl: string;
    serviceAuthorizationToken: string;
    reportPath: string;
    parameters?: ReportParameter[];
    ajaxBeforeLoad?: (args: AjaxBeforeLoadArgs) => void;
    locale?: string;
    toolbarSettings?: {
      items?: string[];
      showToolbar?: boolean;
    };
    exportSettings?: {
      excelFormat?: string;
      wordFormat?: string;
      pdfFormat?: string;
    };
    printMode?: string;
    printOption?: string;
    processingMode?: string;
    dataSources?: unknown[];
  }

  export class BoldReportViewerComponent extends Component<BoldReportViewerProps> {}
}

// Extend Window interface for Bold Reports globals
declare global {
  interface Window {
    React: typeof import('react');
    ReactDOM: typeof import('react-dom');
    createReactClass: typeof import('create-react-class');
    $: typeof import('jquery');
    jQuery: typeof import('jquery');
  }
}

export {};
