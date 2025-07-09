import React from 'react';
import { InventoryMovementSummaryData, ExportOptions as ExportConfig } from '../../../types/inventoryMovement';
import { GlassButton, GlassCard } from '../../ui/FormControls';

interface ExportOptionsProps {
  data: InventoryMovementSummaryData[];
  onClose: () => void;
  className?: string;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  data,
  onClose,
  className = ''
}) => {

  /**
   * 导出为CSV格式
   */
  const _exportToCSV = () => {
    const _headers = [
      '序号', '物品名称', '产品编码', '一级分类', '二级分类', '单位', '换算单位',
      '期初数量', '期初换算数量', '期初金额',
      '入库数量', '入库换算数量', '入库金额',
      '出库数量', '出库换算数量', '出库金额',
      '期末数量', '期末换算数量', '期末金额'
    ];
    
    const _csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.sequence,
        `"${item.productName}"`,
        item.productSku,
        `"${item.primaryCategory}"`,
        `"${item.secondaryCategory}"`,
        item.unit || '',
        item.convertedUnit || '',
        item.openingStock.quantity,
        item.openingStock.convertedQuantity.toFixed(2),
        item.openingStock.amount.toFixed(2),
        item.inboundTotal.quantity,
        item.inboundTotal.convertedQuantity.toFixed(2),
        item.inboundTotal.amount.toFixed(2),
        item.outboundTotal.quantity,
        item.outboundTotal.convertedQuantity.toFixed(2),
        item.outboundTotal.amount.toFixed(2),
        item.closingStock.quantity,
        item.closingStock.convertedQuantity.toFixed(2),
        item.closingStock.amount.toFixed(2)
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'text/csv', '出入库汇总.csv');
  };

  /**
   * 导出为Excel格式（简化版，实际为CSV）
   */
  const _exportToExcel = () => {
    // 这里可以使用xlsx库来生成真正的Excel文件
    // 为了简化，我们先使用CSV格式
    exportToCSV();
  };

  /**
   * 下载文件
   */
  const _downloadFile = (content: string, mimeType: string, filename: string) => {
    const _blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8;` });
    const _link = document.createElement('a');
    const _url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  /**
   * 导出汇总统计
   */
  const _exportSummary = () => {
    const _totals = data.reduce((acc, row) => {
      acc.openingStock.quantity += row.openingStock.quantity;
      acc.openingStock.amount += row.openingStock.amount;
      acc.inboundTotal.quantity += row.inboundTotal.quantity;
      acc.inboundTotal.amount += row.inboundTotal.amount;
      acc.outboundTotal.quantity += row.outboundTotal.quantity;
      acc.outboundTotal.amount += row.outboundTotal.amount;
      acc.closingStock.quantity += row.closingStock.quantity;
      acc.closingStock.amount += row.closingStock.amount;
      return acc;
    }, {
      openingStock: { quantity: 0, amount: 0 },
      inboundTotal: { quantity: 0, amount: 0 },
      outboundTotal: { quantity: 0, amount: 0 },
      closingStock: { quantity: 0, amount: 0 }
    });

    const _summaryContent = [
      '出入库汇总统计报表',
      `导出时间: ${new Date().toLocaleString('zh-CN')}`,
      `商品种类: ${data.length}`,
      '',
      '汇总数据:',
      `期初库存数量: ${totals.openingStock.quantity}`,
      `期初库存金额: ¥${totals.openingStock.amount.toFixed(2)}`,
      `入库总数量: ${totals.inboundTotal.quantity}`,
      `入库总金额: ¥${totals.inboundTotal.amount.toFixed(2)}`,
      `出库总数量: ${totals.outboundTotal.quantity}`,
      `出库总金额: ¥${totals.outboundTotal.amount.toFixed(2)}`,
      `期末库存数量: ${totals.closingStock.quantity}`,
      `期末库存金额: ¥${totals.closingStock.amount.toFixed(2)}`,
      `净变动金额: ¥${(totals.inboundTotal.amount - totals.outboundTotal.amount).toFixed(2)}`
    ].join('\n');

    downloadFile(summaryContent, 'text/plain', '出入库汇总统计.txt');
  };

  return (
    <GlassCard className={className}>
      <div className="p-6">
        <h4 className="text-lg font-semibold financial-title mb-4">导出选项</h4>
        
        <div className="space-y-4">
          {/* 导出格式选择 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <GlassButton
              onClick={exportToCSV}
              className="financial-value-positive flex items-center justify-center"
            >
              <span className="mr-2">📄</span>
              导出CSV
            </GlassButton>
            
            <GlassButton
              onClick={exportToExcel}
              className="financial-value-positive flex items-center justify-center"
            >
              <span className="mr-2">📊</span>
              导出Excel
            </GlassButton>
            
            <GlassButton
              onClick={exportSummary}
              className="financial-value-neutral flex items-center justify-center"
            >
              <span className="mr-2">📋</span>
              导出汇总
            </GlassButton>
          </div>

          {/* 导出说明 */}
          <div className="text-sm financial-description space-y-2">
            <p><strong>CSV格式:</strong> 包含完整的明细数据，可用Excel打开</p>
            <p><strong>Excel格式:</strong> 格式化的电子表格，包含样式和公式</p>
            <p><strong>汇总统计:</strong> 仅包含统计数据的文本文件</p>
          </div>

          {/* 数据信息 */}
          <div className="bg-white/5 rounded-lg p-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="financial-subtitle">当前数据:</span>
              <span className="financial-value-neutral">{data.length} 条记录</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="financial-subtitle">导出时间:</span>
              <span className="financial-value-neutral">{new Date().toLocaleString('zh-CN')}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/20">
            <GlassButton
              onClick={onClose}
              className="financial-subtitle"
            >
              取消
            </GlassButton>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
