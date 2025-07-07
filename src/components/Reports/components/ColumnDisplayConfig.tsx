import React from 'react';
import { ColumnDisplayConfig as ColumnConfig } from '../../../types/inventoryMovement';
import { GlassButton, GlassCard } from '../../ui/FormControls';

interface ColumnDisplayConfigProps {
  columnDisplay: ColumnConfig;
  onChange: (config: ColumnConfig) => void;
  onClose: () => void;
  className?: string;
}

export const ColumnDisplayConfig: React.FC<ColumnDisplayConfigProps> = ({
  columnDisplay,
  onChange,
  onClose,
  className = ''
}) => {

  /**
   * 处理列显示状态变化
   */
  const handleColumnToggle = (
    section: keyof ColumnConfig,
    column: keyof ColumnConfig[keyof ColumnConfig],
    checked: boolean
  ) => {
    const newConfig = {
      ...columnDisplay,
      [section]: {
        ...columnDisplay[section],
        [column]: checked
      }
    };
    onChange(newConfig);
  };

  /**
   * 全选/全不选某个部分
   */
  const handleSectionToggle = (section: keyof ColumnConfig, checked: boolean) => {
    const newConfig = {
      ...columnDisplay,
      [section]: {
        quantity: checked,
        convertedQuantity: checked,
        amount: checked
      }
    };
    onChange(newConfig);
  };

  /**
   * 重置为默认配置
   */
  const handleReset = () => {
    const defaultConfig: ColumnConfig = {
      openingStock: { quantity: true, convertedQuantity: true, amount: true },
      inboundTotal: { quantity: true, convertedQuantity: true, amount: true },
      outboundTotal: { quantity: true, convertedQuantity: true, amount: true },
      closingStock: { quantity: true, convertedQuantity: true, amount: true }
    };
    onChange(defaultConfig);
  };

  /**
   * 渲染列配置部分
   */
  const renderSection = (
    sectionKey: keyof ColumnConfig,
    sectionTitle: string,
    sectionIcon: string
  ) => {
    const section = columnDisplay[sectionKey];
    const allChecked = section.quantity && section.convertedQuantity && section.amount;
    const someChecked = section.quantity || section.convertedQuantity || section.amount;

    return (
      <div className="space-y-3">
        {/* 部分标题和全选 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{sectionIcon}</span>
            <h4 className="font-semibold financial-subtitle">{sectionTitle}</h4>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(input) => {
                if (input) input.indeterminate = someChecked && !allChecked;
              }}
              onChange={(e) => handleSectionToggle(sectionKey, e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/50"
            />
            <span className="text-sm financial-description">全选</span>
          </label>
        </div>

        {/* 具体列选项 */}
        <div className="grid grid-cols-1 gap-2 ml-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={section.quantity}
              onChange={(e) => handleColumnToggle(sectionKey, 'quantity', e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/50"
            />
            <span className="text-sm financial-text">数量</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={section.convertedQuantity}
              onChange={(e) => handleColumnToggle(sectionKey, 'convertedQuantity', e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/50"
            />
            <span className="text-sm financial-text">换算数量</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={section.amount}
              onChange={(e) => handleColumnToggle(sectionKey, 'amount', e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/50"
            />
            <span className="text-sm financial-text">金额</span>
          </label>
        </div>
      </div>
    );
  };

  /**
   * 计算显示的列数
   */
  const getVisibleColumnsCount = () => {
    let count = 0;
    Object.values(columnDisplay).forEach(section => {
      if (section.quantity) count++;
      if (section.convertedQuantity) count++;
      if (section.amount) count++;
    });
    return count;
  };

  return (
    <GlassCard className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold financial-title">列显示设置</h3>
          <div className="text-sm financial-description">
            当前显示 {getVisibleColumnsCount()} 列
          </div>
        </div>

        <div className="space-y-6">
          {/* 期初库存 */}
          {renderSection('openingStock', '期初库存', '📥')}

          {/* 入库合计 */}
          {renderSection('inboundTotal', '入库合计', '⬆️')}

          {/* 出库合计 */}
          {renderSection('outboundTotal', '出库合计', '⬇️')}

          {/* 期末库存 */}
          {renderSection('closingStock', '期末库存', '📤')}
        </div>

        {/* 预设配置 */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <h4 className="font-medium financial-subtitle mb-3">快速配置</h4>
          <div className="grid grid-cols-2 gap-2">
            <GlassButton
              onClick={() => onChange({
                openingStock: { quantity: true, convertedQuantity: false, amount: true },
                inboundTotal: { quantity: true, convertedQuantity: false, amount: true },
                outboundTotal: { quantity: true, convertedQuantity: false, amount: true },
                closingStock: { quantity: true, convertedQuantity: false, amount: true }
              })}
              className="text-sm financial-subtitle"
            >
              仅数量+金额
            </GlassButton>

            <GlassButton
              onClick={() => onChange({
                openingStock: { quantity: true, convertedQuantity: true, amount: false },
                inboundTotal: { quantity: true, convertedQuantity: true, amount: false },
                outboundTotal: { quantity: true, convertedQuantity: true, amount: false },
                closingStock: { quantity: true, convertedQuantity: true, amount: false }
              })}
              className="text-sm financial-subtitle"
            >
              仅数量相关
            </GlassButton>

            <GlassButton
              onClick={() => onChange({
                openingStock: { quantity: false, convertedQuantity: false, amount: true },
                inboundTotal: { quantity: false, convertedQuantity: false, amount: true },
                outboundTotal: { quantity: false, convertedQuantity: false, amount: true },
                closingStock: { quantity: false, convertedQuantity: false, amount: true }
              })}
              className="text-sm financial-subtitle"
            >
              仅金额
            </GlassButton>

            <GlassButton
              onClick={handleReset}
              className="text-sm financial-value-neutral"
            >
              全部显示
            </GlassButton>
          </div>
        </div>

        {/* 说明信息 */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg text-sm">
          <div className="financial-description space-y-1">
            <p><strong>提示：</strong></p>
            <p>• 至少需要显示一列数据</p>
            <p>• 固定列（序号、物品名称、分类）始终显示</p>
            <p>• 设置会自动保存到本地存储</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-white/20 mt-6">
          <GlassButton
            onClick={onClose}
            className="financial-subtitle"
          >
            关闭
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};
