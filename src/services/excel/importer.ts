import * as XLSX from 'xlsx';
import { InventoryItem } from '../../types/inventory';
import { ExcelImportOptions, ImportResult, ImportError, ColumnMapping } from '../../types/excel';
import { validateExcelRow, ExcelRowInput } from '../../utils/validation';
import { DEFAULT_COLUMN_MAPPING, APP_CONFIG } from '../../utils/constants';
import { v4 as uuidv4 } from 'uuid';

export class ExcelImporter {
  private defaultMapping: ColumnMapping = DEFAULT_COLUMN_MAPPING;

  async importFromFile(filePath: string, options: ExcelImportOptions = {}): Promise<ImportResult> {
    try {
      const workbook = XLSX.readFile(filePath);
      return this.processWorkbook(workbook, options);
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          field: 'file',
          value: filePath,
          message: `读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        skippedRows: 0
      };
    }
  }

  async importFromBuffer(buffer: ArrayBuffer, options: ExcelImportOptions = {}): Promise<ImportResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      return this.processWorkbook(workbook, options);
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          field: 'buffer',
          value: '',
          message: `解析数据失败: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        skippedRows: 0
      };
    }
  }

  private processWorkbook(workbook: XLSX.WorkBook, options: ExcelImportOptions): ImportResult {
    const {
      sheetName = workbook.SheetNames[0],
      skipRows = 0,
      mapping = this.defaultMapping
    } = options;

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          field: 'sheet',
          value: sheetName,
          message: `工作表 "${sheetName}" 不存在`
        }],
        skippedRows: 0
      };
    }

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rawData.length <= skipRows) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          field: 'data',
          value: '',
          message: '没有找到有效数据行'
        }],
        skippedRows: 0
      };
    }

    // 获取表头
    const headers = rawData[skipRows] as string[];
    const dataRows = rawData.slice(skipRows + 1);

    const result: ImportResult = {
      success: true,
      data: [],
      errors: [],
      skippedRows: 0
    };

    // 验证表头
    const mappingValidation = this.validateHeaders(headers, mapping);
    if (!mappingValidation.valid) {
      result.success = false;
      result.errors.push({
        row: skipRows + 1,
        field: 'headers',
        value: headers,
        message: mappingValidation.message
      });
      return result;
    }

    // 处理数据行
    for (let i = 0; i < dataRows.length; i++) {
      const rowIndex = skipRows + i + 2; // Excel行号(从1开始) + 跳过的表头行
      const rowData = dataRows[i] as any[];

      if (this.isEmptyRow(rowData)) {
        result.skippedRows++;
        continue;
      }

      if (rowIndex > APP_CONFIG.EXCEL.MAX_ROWS + skipRows) {
        result.errors.push({
          row: rowIndex,
          field: 'limit',
          value: '',
          message: `超出最大处理行数限制 (${APP_CONFIG.EXCEL.MAX_ROWS})`
        });
        break;
      }

      try {
        const mappedData = this.mapRowData(headers, rowData, mapping);
        const validation = validateExcelRow(mappedData);

        if (!validation.success) {
          result.errors.push({
            row: rowIndex,
            field: 'validation',
            value: mappedData,
            message: validation.errors?.join(', ') || '数据验证失败'
          });
          continue;
        }

        const inventoryItem = this.convertToInventoryItem(validation.data!);
        result.data.push(inventoryItem);

      } catch (error) {
        result.errors.push({
          row: rowIndex,
          field: 'processing',
          value: rowData,
          message: `处理行数据失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    }

    // 如果有成功导入的数据，则认为整体成功
    result.success = result.data.length > 0;

    return result;
  }

  private validateHeaders(headers: string[], mapping: ColumnMapping): { valid: boolean; message: string } {
    const requiredFields = ['name', 'sku', 'category', 'stockQuantity', 'unitPrice'];
    const mappedFields = Object.values(mapping);
    
    const missingFields = requiredFields.filter(field => 
      !mappedFields.includes(field as keyof InventoryItem)
    );

    if (missingFields.length > 0) {
      return {
        valid: false,
        message: `缺少必需的字段映射: ${missingFields.join(', ')}`
      };
    }

    // 检查Excel表头是否包含映射中定义的列
    const missingColumns = Object.keys(mapping).filter(col => 
      !headers.includes(col)
    );

    if (missingColumns.length > 0) {
      return {
        valid: false,
        message: `Excel文件缺少列: ${missingColumns.join(', ')}`
      };
    }

    return { valid: true, message: '' };
  }

  private mapRowData(headers: string[], rowData: any[], mapping: ColumnMapping): any {
    const mapped: any = {};
    
    headers.forEach((header, index) => {
      if (mapping[header]) {
        const value = rowData[index];
        if (value !== undefined && value !== null && value !== '') {
          mapped[header] = value;
        }
      }
    });

    return mapped;
  }

  private convertToInventoryItem(data: ExcelRowInput): InventoryItem {
    const now = new Date();
    const stockQuantity = data['库存数量'] || 0;
    const unitPrice = data['单价'] || 0;
    
    return {
      id: uuidv4(),
      name: data['商品名称'],
      description: data['商品描述'] || '',
      sku: data['SKU'],
      category: data['分类'],
      supplier: data['供应商'] || '',
      stockQuantity,
      reservedQuantity: data['预留数量'] || 0,
      unitPrice,
      totalValue: stockQuantity * unitPrice,
      lastUpdated: now,
      status: data['状态'] || 'in-stock',
      location: data['存放位置'] || '',
      reorderLevel: data['补货提醒'] || 0,
      maxStock: data['最大库存'] || 0
    };
  }

  private isEmptyRow(rowData: any[]): boolean {
    return !rowData || rowData.every(cell => 
      cell === undefined || cell === null || cell === ''
    );
  }

  getDefaultMapping(): ColumnMapping {
    return { ...this.defaultMapping };
  }

  validateFile(filePath: string): { valid: boolean; message: string } {
    try {
      const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
      
      if (!APP_CONFIG.EXCEL.SUPPORTED_EXTENSIONS.includes(extension)) {
        return {
          valid: false,
          message: `不支持的文件格式。支持的格式: ${APP_CONFIG.EXCEL.SUPPORTED_EXTENSIONS.join(', ')}`
        };
      }

      return { valid: true, message: '' };
    } catch (error) {
      return {
        valid: false,
        message: `文件验证失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
}

export default new ExcelImporter();