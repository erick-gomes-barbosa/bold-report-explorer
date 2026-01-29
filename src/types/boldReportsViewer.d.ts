// Declarações de tipos para o Bold Reports React Viewer

declare module '@boldreports/javascript-reporting-controls/Content/v2.0/tailwind-light/bold.report-viewer.min.css';
declare module '@boldreports/javascript-reporting-controls/Scripts/v2.0/common/bold.reports.common.min';
declare module '@boldreports/javascript-reporting-controls/Scripts/v2.0/common/bold.reports.widgets.min';
declare module '@boldreports/javascript-reporting-controls/Scripts/v2.0/bold.report-viewer.min';
declare module '@boldreports/react-reporting-components/Scripts/bold.reports.react.min';

export interface BoldReportParameter {
  name: string;
  labels?: string[];
  values: string[];
  nullable?: boolean;
}

export interface BoldReportViewerInstance {
  exportReport: (format: string, fileName?: string) => void;
  printReport: () => void;
  refresh: () => void;
  setParameters: (parameters: BoldReportParameter[]) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string) => void;
}

// Interface para o callback ajaxBeforeLoad
export interface AjaxBeforeLoadEventArgs {
  url: string;
  method?: string;
  headers: Record<string, string>;
  data?: unknown;
  cancel?: boolean;
}

declare global {
  interface Window {
    BoldReportViewerComponent: React.ComponentType<{
      id: string;
      reportServiceUrl: string;
      reportServerUrl?: string;
      serviceAuthorizationToken?: string;
      reportPath?: string;
      parameters?: BoldReportParameter[];
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
      ajaxBeforeLoad?: (args: AjaxBeforeLoadEventArgs) => void;
    }>;
  }
}
