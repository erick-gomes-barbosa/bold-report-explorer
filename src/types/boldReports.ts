export interface BoldReport {
  Id: string;
  Name: string;
  Description?: string;
  CategoryId?: string;
  CategoryName?: string;
  CreatedById?: string;
  CreatedByDisplayName?: string;
  CreatedDate?: string;
  ModifiedById?: string;
  ModifiedByDisplayName?: string;
  ModifiedDate?: string;
  ItemType?: string;
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
