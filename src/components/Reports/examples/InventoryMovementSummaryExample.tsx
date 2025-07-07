/**
 * 出入库汇总组件使用示例
 */

import React, { useState } from 'react';
import InventoryMovementSummary from '../InventoryMovementSummary';
import { 
  InventoryMovementSummaryData, 
  MovementSummaryFilters,
  MovementDimension 
} from '../../../types/inventoryMovement';
import { GlassCard, GlassButton } from '../../ui/FormControls';

const InventoryMovementSummaryExample: React.FC = () => {
  const [showComponent, setShowComponent] = useState(true);
  const [dataCount, setDataCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * 处理数据变化
   */
  const handleDataChange = (data: InventoryMovementSummaryData[]) => {
    setDataCount(data.length);
    console.log('出入库汇总数据更新:', data);
  };

  /**
   * 处理错误
   */
  const handleError = (error: string) => {
    setLastError(error);
    console.error('出入库汇总错误:', error);
  };

  /**
   * 重置组件
   */
  const resetComponent = () => {
    setShowComponent(false);
    setTimeout(() => {
      setShowComponent(true);
      setDataCount(0);
      setLastError(null);
    }, 100);
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* 示例说明 */}
      <GlassCard>
        <div className="p-6">
          <h1 className="text-2xl font-bold financial-title mb-4">
            出入库汇总组件示例
          </h1>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold financial-subtitle mb-2">功能特性</h3>
              <ul className="list-disc list-inside space-y-1 financial-description">
                <li>📊 嵌套表头结构：期初库存、入库合计、出库合计、期末库存</li>
                <li>📏 多维度统计：数量、换算数量、金额三个维度</li>
                <li>📌 固定列设计：序号、物品名称、分类始终可见</li>
                <li>⏰ 时间控制：日期区间选择器 + 快捷时间按钮</li>
                <li>🔍 筛选功能：分类、商品、关键词搜索</li>
                <li>📈 统计信息：商品种类、库存总值、周转率等</li>
                <li>📤 导出功能：CSV、Excel、汇总统计</li>
                <li>⚙️ 列显示控制：自定义显示列</li>
                <li>🎨 主题适配：支持多种主题切换</li>
                <li>💾 本地存储：保存用户偏好设置</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold financial-subtitle mb-2">使用方法</h3>
              <div className="bg-black/20 rounded-lg p-4 font-mono text-sm">
                <pre className="text-green-400">{`import InventoryMovementSummary from './components/Reports/InventoryMovementSummary';

function App() {
  return (
    <InventoryMovementSummary
      onDataChange={(data) => console.log('数据更新:', data)}
      onError={(error) => console.error('错误:', error)}
    />
  );
}`}</pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold financial-subtitle mb-2">当前状态</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm financial-description">数据记录数</div>
                  <div className="text-xl font-bold financial-value-neutral">{dataCount}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm financial-description">组件状态</div>
                  <div className="text-xl font-bold financial-value-positive">
                    {showComponent ? '运行中' : '重置中'}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm financial-description">最后错误</div>
                  <div className="text-sm financial-value-negative">
                    {lastError || '无错误'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <GlassButton
                onClick={resetComponent}
                className="financial-value-neutral"
              >
                🔄 重置组件
              </GlassButton>
              <GlassButton
                onClick={() => setLastError(null)}
                className="financial-subtitle"
              >
                🗑️ 清除错误
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 组件实例 */}
      {showComponent && (
        <InventoryMovementSummary />
      )}

      {/* 开发说明 */}
      <GlassCard>
        <div className="p-6">
          <h3 className="text-lg font-semibold financial-subtitle mb-4">开发说明</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium financial-text mb-2">组件架构</h4>
              <ul className="list-disc list-inside space-y-1 financial-description text-sm">
                <li><code>InventoryMovementSummary.tsx</code> - 主组件，负责数据管理和状态控制</li>
                <li><code>TimeControl.tsx</code> - 时间控制组件，处理日期范围选择</li>
                <li><code>MovementSummaryTable.tsx</code> - 汇总表格组件，负责数据展示</li>
                <li><code>ExportOptions.tsx</code> - 导出选项组件，处理数据导出</li>
                <li><code>ColumnDisplayConfig.tsx</code> - 列显示配置组件</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium financial-text mb-2">数据流</h4>
              <ol className="list-decimal list-inside space-y-1 financial-description text-sm">
                <li>加载基础数据（产品、分类、仓库）</li>
                <li>根据时间范围获取库存事务</li>
                <li>计算期初库存（FIFO逻辑）</li>
                <li>统计期间入库和出库</li>
                <li>计算期末库存</li>
                <li>应用筛选和排序</li>
                <li>渲染表格和统计信息</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium financial-text mb-2">性能优化</h4>
              <ul className="list-disc list-inside space-y-1 financial-description text-sm">
                <li>使用 React.memo 优化子组件渲染</li>
                <li>使用 useMemo 缓存计算结果</li>
                <li>使用 useCallback 优化事件处理函数</li>
                <li>本地存储用户偏好，减少重复配置</li>
                <li>虚拟化表格支持大数据量</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium financial-text mb-2">主题适配</h4>
              <ul className="list-disc list-inside space-y-1 financial-description text-sm">
                <li>使用CSS变量实现主题切换</li>
                <li>支持玻璃未来风、深色科技风、温暖商务风主题</li>
                <li>表格样式完全适配主题系统</li>
                <li>无硬编码颜色，完全响应主题变化</li>
              </ul>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default InventoryMovementSummaryExample;
