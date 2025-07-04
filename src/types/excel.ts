import { InventoryItem } from './inventory';

export interface ExcelImportOptions {
  sheetName?: string;
  skipRows?: number;
  mapping?: ColumnMapping;
}

export interface ColumnMapping {
  [key: string]: keyof InventoryItem;
}

export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
  includeHeaders?: boolean;
}

export interface ImportResult {
  success: boolean;
  data: InventoryItem[];
  errors: ImportError[];
  skippedRows: number;
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
}