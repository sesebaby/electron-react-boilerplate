import { useState, useCallback } from 'react';
import { InventoryItem } from '../types/inventory';
import { ImportResult, ExcelImportOptions, ExcelExportOptions } from '../types/excel';
import ExcelImporter from '../services/excel/importer';
import ExcelExporter from '../services/excel/exporter';

export const useExcel = () => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFromFile = useCallback(async (
    filePath: string, 
    options?: ExcelImportOptions
  ): Promise<ImportResult> => {
    try {
      setImporting(true);
      setError(null);
      
      const result = await ExcelImporter.importFromFile(filePath, options);
      setImportResult(result);
      
      if (!result.success) {
        setError('导入过程中发现错误，请检查导入结果');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导入失败';
      setError(errorMessage);
      const failedResult: ImportResult = {
        success: false,
        data: [],
        errors: [{
          row: 0,
          field: 'import',
          value: '',
          message: errorMessage
        }],
        skippedRows: 0
      };
      setImportResult(failedResult);
      return failedResult;
    } finally {
      setImporting(false);
    }
  }, []);

  const importFromBuffer = useCallback(async (
    buffer: ArrayBuffer, 
    options?: ExcelImportOptions
  ): Promise<ImportResult> => {
    try {
      setImporting(true);
      setError(null);
      
      const result = await ExcelImporter.importFromBuffer(buffer, options);
      setImportResult(result);
      
      if (!result.success) {
        setError('导入过程中发现错误，请检查导入结果');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导入失败';
      setError(errorMessage);
      const failedResult: ImportResult = {
        success: false,
        data: [],
        errors: [{
          row: 0,
          field: 'import',
          value: '',
          message: errorMessage
        }],
        skippedRows: 0
      };
      setImportResult(failedResult);
      return failedResult;
    } finally {
      setImporting(false);
    }
  }, []);

  const exportToFile = useCallback(async (
    data: InventoryItem[], 
    filePath: string, 
    options?: ExcelExportOptions
  ): Promise<{ success: boolean; message: string }> => {
    try {
      setExporting(true);
      setError(null);
      
      const result = await ExcelExporter.exportToFile(data, filePath, options);
      
      if (!result.success) {
        setError(result.message);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出失败';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setExporting(false);
    }
  }, []);

  const exportToBuffer = useCallback(async (
    data: InventoryItem[], 
    options?: ExcelExportOptions
  ): Promise<Buffer | null> => {
    try {
      setExporting(true);
      setError(null);
      
      return await ExcelExporter.exportToBuffer(data, options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出失败';
      setError(errorMessage);
      return null;
    } finally {
      setExporting(false);
    }
  }, []);

  const exportTemplate = useCallback(async (filePath: string): Promise<{ success: boolean; message: string }> => {
    try {
      setExporting(true);
      setError(null);
      
      const result = await ExcelExporter.exportTemplate(filePath);
      
      if (!result.success) {
        setError(result.message);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '模板生成失败';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setExporting(false);
    }
  }, []);

  const validateFile = useCallback((filePath: string): { valid: boolean; message: string } => {
    return ExcelImporter.validateFile(filePath);
  }, []);

  const getDefaultMapping = useCallback(() => {
    return ExcelImporter.getDefaultMapping();
  }, []);

  const clearImportResult = useCallback(() => {
    setImportResult(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    importing,
    exporting,
    importResult,
    error,
    
    // Import functions
    importFromFile,
    importFromBuffer,
    
    // Export functions
    exportToFile,
    exportToBuffer,
    exportTemplate,
    
    // Utility functions
    validateFile,
    getDefaultMapping,
    
    // State management
    clearImportResult,
    clearError
  };
};

export default useExcel;