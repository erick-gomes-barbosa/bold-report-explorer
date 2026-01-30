export interface BoldReport {
  Id: string;
  Name: string;
  Description?: string;
  CategoryId?: string;
  CategoryName?: string;
  Path?: string;
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

export interface AvailableValue {
  DisplayField: string;
  ValueField: string;
  IsSelected?: boolean;
}

export interface ReportParameter {
  Name: string;
  Prompt?: string;
  DataType: 'String' | 'Boolean' | 'DateTime' | 'Integer' | 'Float';
  AllowNull?: boolean;
  AllowBlank?: boolean;
  HasDefault?: boolean;
  DefaultValues?: string[];
  AvailableValues?: AvailableValue[];
  ElementType?: 'ComboBox' | 'MultiValue' | 'TextBox' | 'CheckBox' | 'DateTimePicker';
  Hidden?: boolean;
  // Legacy format support
  ValidValues?: { Label: string; Value: string }[];
  MultiValue?: boolean;
}

export type ExportFormat = 'PDF' | 'Excel' | 'Word' | 'HTML' | 'CSV' | 'PPT';
