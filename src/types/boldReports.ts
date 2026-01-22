export interface BoldReport {
  Id: string;
  Name: string;
  Description?: string;
  CategoryId?: string;
  CategoryName?: string;
  CreatedById?: number;
  CreatedByDisplayName?: string;
  CreatedDate?: string;
  ModifiedById?: number;
  ModifiedByFullName?: string;
  ModifiedByDisplayName?: string;
  ModifiedDate?: string;
  ItemType?: number;
  ItemCreatedDate?: string;
  ItemModifiedDate?: string;
  Tags?: string[];
  CanRead?: boolean;
  CanWrite?: boolean;
  CanDelete?: boolean;
  CanDownload?: boolean;
  CanSchedule?: boolean;
  CanOpen?: boolean;
  CanMove?: boolean;
  CanCopy?: boolean;
  CanClone?: boolean;
}

export interface ReportParameter {
  Name: string;
  Prompt?: string;
  DataType: 'String' | 'Boolean' | 'DateTime' | 'Integer' | 'Float';
  AllowBlank?: boolean;
  MultiValue?: boolean;
  Hidden?: boolean;
  DefaultValues?: string[];
  ValidValues?: { Label: string; Value: string }[];
}

export type ExportFormat = 'PDF' | 'Excel' | 'Word' | 'HTML' | 'CSV' | 'PPT';
