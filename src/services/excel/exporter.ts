import * as XLSX from 'xlsx';
import { InventoryItem } from '../../types/inventory';
import { ExcelExportOptions } from '../../types/excel';
import { EXCEL_HEADERS } from '../../utils/constants';

export class ExcelExporter {
  async exportToFile(
    data: InventoryItem[], 
    filePath: string, 
    options: ExcelExportOptions = {}
  ): Promise<{ success: boolean; message: string }> {
    try {
      const buffer = await this.exportToBuffer(data, options);
      const fs = require('fs');
      
      // 确保目录存在
      const path = require('path');
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, buffer);
      
      return {
        success: true,
        message: `成功导出 ${data.length} 条记录到 ${filePath}`
      };
    } catch (error) {
      return {
        success: false,
        message: `导出失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  async exportToBuffer(
    data: InventoryItem[], 
    options: ExcelExportOptions = {}
  ): Promise<Buffer> {
    const {
      sheetName = 'inventory',
      includeHeaders = true
    } = options;

    // 转换数据为Excel格式
    const excelData = this.convertToExcelFormat(data, includeHeaders);
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    
    // 设置列宽
    const columnWidths = this.calculateColumnWidths(data);
    worksheet['!cols'] = columnWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 生成Buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private convertToExcelFormat(data: InventoryItem[], includeHeaders: boolean): any[][] {
    const result: any[][] = [];
    
    // 添加表头
    if (includeHeaders) {
      result.push([...EXCEL_HEADERS]);
    }
    
    // 添加数据行
    data.forEach(item => {
      const row = [
        item.name,
        item.description,
        item.sku,
        item.category,
        item.supplier,
        item.stockQuantity,
        item.reservedQuantity,
        item.unitPrice,
        item.totalValue,
        this.translateStatus(item.status),
        item.location,
        item.reorderLevel,
        item.maxStock,
        this.formatDate(item.lastUpdated)
      ];
      result.push(row);
    });
    
    return result;
  }

  private calculateColumnWidths(data: InventoryItem[]): any[] {
    const baseWidths = [
      { wch: 20 }, // 商品名称
      { wch: 30 }, // 商品描述
      { wch: 15 }, // SKU
      { wch: 12 }, // 分类
      { wch: 15 }, // 供应商
      { wch: 10 }, // 库存数量
      { wch: 10 }, // 预留数量
      { wch: 10 }, // 单价
      { wch: 12 }, // 总价值
      { wch: 12 }, // 状态
      { wch: 15 }, // 存放位置
      { wch: 10 }, // 补货提醒
      { wch: 10 }, // 最大库存
      { wch: 18 }  // 最后更新时间
    ];

    // 根据实际数据内容调整列宽
    if (data.length > 0) {
      const sample = data.slice(0, Math.min(100, data.length));
      
      sample.forEach(item => {
        const values = [
          item.name,
          item.description,
          item.sku,
          item.category,
          item.supplier,
          item.stockQuantity.toString(),
          item.reservedQuantity.toString(),
          item.unitPrice.toString(),
          item.totalValue.toString(),
          this.translateStatus(item.status),
          item.location,
          item.reorderLevel.toString(),
          item.maxStock.toString(),
          this.formatDate(item.lastUpdated)
        ];

        values.forEach((value, index) => {
          if (value && baseWidths[index]) {
            const length = this.getStringDisplayLength(value.toString());
            if (length > baseWidths[index].wch) {
              baseWidths[index].wch = Math.min(length, 50); // 最大50字符宽度
            }
          }
        });
      });
    }

    return baseWidths;
  }

  private getStringDisplayLength(str: string): number {
    // 中文字符算2个字符宽度，英文字符算1个
    let length = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0x4e00 && code <= 0x9fff) {
        length += 2; // 中文字符
      } else {
        length += 1; // 其他字符
      }
    }
    return length;
  }

  private translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'in-stock': '正常库存',
      'low-stock': '库存不足',
      'out-of-stock': '缺货',
      'discontinued': '已停产'
    };
    return statusMap[status] || status;
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  async exportTemplate(filePath: string): Promise<{ success: boolean; message: string }> {
    try {
      const templateData = [
        ['示例商品1', '这是一个示例商品描述', 'SKU001', '电子产品', '供应商A', 100, 0, 10.5, '正常库存', 'A1货架', 10, 500],
        ['示例商品2', '这是另一个示例商品描述', 'SKU002', '办公用品', '供应商B', 50, 5, 25.0, '正常库存', 'B2货架', 5, 200]
      ];

      const result = await this.exportToFile(
        templateData.map((row, index) => ({
          id: `template-${index}`,
          name: row[0] as string,
          description: row[1] as string,
          sku: row[2] as string,
          category: row[3] as string,
          supplier: row[4] as string,
          stockQuantity: row[5] as number,
          reservedQuantity: row[6] as number,
          unitPrice: row[7] as number,
          totalValue: (row[5] as number) * (row[7] as number),
          lastUpdated: new Date(),
          status: 'in-stock' as const,
          location: row[9] as string,
          reorderLevel: row[10] as number,
          maxStock: row[11] as number
        })),
        filePath,
        { sheetName: '导入模板', includeHeaders: true }
      );

      if (result.success) {
        return {
          success: true,
          message: `导入模板已生成: ${filePath}`
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: `生成模板失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
}

export default new ExcelExporter();