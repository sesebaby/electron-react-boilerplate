import React, { useState, useEffect } from 'react';
import monthlyBalanceService from '../../services/business/monthlyBalanceService';
import { warehouseService } from '../../services/business/warehouseService';
import { getGlobalServices } from '../../services/container/containerConfig';
import { MonthlyBalanceGenerateParams, MonthlyBalanceGenerateResult } from '../../types/monthlyBalance';
import { Warehouse, Category } from '../../types/entities';
import { GlassButton, GlassCard } from '../ui/FormControls';

interface MonthlyBalanceGeneratorProps {
  onSuccess?: () => void;
}

export const MonthlyBalanceGenerator: React.FC<MonthlyBalanceGeneratorProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MonthlyBalanceGenerateResult | null>(null);

  // 表单状态
  const [params, setParams] = useState<MonthlyBalanceGenerateParams>(() => {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    
    return {
      year,
      month: lastMonth,
      operator: '系统管理员',
      includeZeroStock: false,
      includeExpired: true
    };
  });

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const services = await getGlobalServices();
      const [warehouseList, categoryList] = await Promise.all([
        warehouseService.findAll(),
        services.categoryService.findAll()
      ]);

      setWarehouses(warehouseList);
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to load form data:', err);
      setError('加载表单数据失败');
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // 输入验证
      if (!params.operator.trim()) {
        setError('请输入操作人');
        return;
      }

      const generateResult = await monthlyBalanceService.generateMonthlyBalance(params);

      if (!generateResult.success) {
        setError(generateResult.error?.message || '生成失败');
        return;
      }

      setResult(generateResult.data!);
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Failed to generate monthly balance:', err);
      setError('生成月度结余失败');
    } finally {
      setLoading(false);
    }
  };

  const handleParamChange = (key: keyof MonthlyBalanceGenerateParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('zh-CN').format(value);
  };

  const formatPeriod = (year: number, month: number): string => {
    return `${year}年${month}月`;
  };

  // 生成年份选项（最近5年）
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // 生成月份选项
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">生成月度结余</h2>
        <p className="text-white/70">
          根据FIFO批次库存数据生成指定月份的结余记录
        </p>
      </div>

      {/* 生成参数表单 */}
      <GlassCard title="生成参数设置">
        <div className="space-y-6">
          {/* 基础参数 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 年份选择 */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                结余年份 <span className="text-red-400">*</span>
              </label>
              <select
                value={params.year}
                onChange={(e) => handleParamChange('year', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200"
                disabled={loading}
              >
                {yearOptions.map(year => (
                  <option key={year} value={year} className="bg-gray-800">
                    {year}年
                  </option>
                ))}
              </select>
            </div>

            {/* 月份选择 */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                结余月份 <span className="text-red-400">*</span>
              </label>
              <select
                value={params.month}
                onChange={(e) => handleParamChange('month', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200"
                disabled={loading}
              >
                {monthOptions.map(month => (
                  <option key={month} value={month} className="bg-gray-800">
                    {month}月
                  </option>
                ))}
              </select>
            </div>

            {/* 操作人 */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                操作人 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={params.operator}
                onChange={(e) => handleParamChange('operator', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200"
                placeholder="请输入操作人姓名"
                disabled={loading}
              />
            </div>
          </div>

          {/* 过滤条件 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">过滤条件</h3>
            
            {/* 仓库选择 */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                指定仓库（可选）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {warehouses.map(warehouse => (
                  <label key={warehouse.id} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.warehouseIds?.includes(warehouse.id) || false}
                      onChange={(e) => {
                        const warehouseIds = params.warehouseIds || [];
                        if (e.target.checked) {
                          handleParamChange('warehouseIds', [...warehouseIds, warehouse.id]);
                        } else {
                          handleParamChange('warehouseIds', warehouseIds.filter(id => id !== warehouse.id));
                        }
                      }}
                      className="rounded text-blue-500 focus:ring-2 focus:ring-blue-400/50"
                      disabled={loading}
                    />
                    <span className="text-white text-sm">{warehouse.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-white/50 text-xs mt-2">
                不选择则包含所有仓库
              </p>
            </div>

            {/* 分类选择 */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                指定分类（可选）
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {categories.map(category => (
                  <label key={category.id} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.categoryIds?.includes(category.id) || false}
                      onChange={(e) => {
                        const categoryIds = params.categoryIds || [];
                        if (e.target.checked) {
                          handleParamChange('categoryIds', [...categoryIds, category.id]);
                        } else {
                          handleParamChange('categoryIds', categoryIds.filter(id => id !== category.id));
                        }
                      }}
                      className="rounded text-blue-500 focus:ring-2 focus:ring-blue-400/50"
                      disabled={loading}
                    />
                    <span className="text-white text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-white/50 text-xs mt-2">
                不选择则包含所有分类
              </p>
            </div>
          </div>

          {/* 高级选项 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">高级选项</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.includeZeroStock || false}
                  onChange={(e) => handleParamChange('includeZeroStock', e.target.checked)}
                  className="rounded text-blue-500 focus:ring-2 focus:ring-blue-400/50"
                  disabled={loading}
                />
                <div>
                  <span className="text-white font-medium">包含零库存</span>
                  <p className="text-white/60 text-sm">包含剩余数量为0的批次</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.includeExpired || false}
                  onChange={(e) => handleParamChange('includeExpired', e.target.checked)}
                  className="rounded text-blue-500 focus:ring-2 focus:ring-blue-400/50"
                  disabled={loading}
                />
                <div>
                  <span className="text-white font-medium">包含过期批次</span>
                  <p className="text-white/60 text-sm">包含已过期的库存批次</p>
                </div>
              </label>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">
              备注（可选）
            </label>
            <textarea
              value={params.remark || ''}
              onChange={(e) => handleParamChange('remark', e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 resize-none"
              placeholder="请输入生成备注..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 pt-4 border-t border-white/10">
            <GlassButton
              variant="primary"
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  生成中...
                </>
              ) : (
                <>
                  <span className="mr-2">⚙️</span>
                  生成{formatPeriod(params.year, params.month)}结余
                </>
              )}
            </GlassButton>
            
            <div className="text-white/70 text-sm flex items-center">
              <span className="mr-2">📅</span>
              结余日期: {new Date(params.year, params.month, 0).toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 错误提示 */}
      {error && (
        <GlassCard className="border-red-400/30 bg-red-500/10">
          <div className="p-4 flex items-center gap-3 text-red-300">
            <span className="text-xl">❌</span>
            <span>{error}</span>
          </div>
        </GlassCard>
      )}

      {/* 生成结果 */}
      {result && (
        <GlassCard title="生成结果" className="border-green-400/30 bg-green-500/10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-green-300 mb-4">
              <span className="text-2xl">✅</span>
              <span className="text-lg font-semibold">
                {formatPeriod(params.year, params.month)}月度结余生成成功
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white/5 rounded-lg border border-green-400/20">
                <div className="text-lg font-semibold text-white">
                  {formatNumber(result.generatedRecords)}
                </div>
                <div className="text-green-300/80 text-sm">生成记录数</div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-green-400/20">
                <div className="text-lg font-semibold text-white">
                  {formatCurrency(result.totalValue)}
                </div>
                <div className="text-green-300/80 text-sm">结余总价值</div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-green-400/20">
                <div className="text-lg font-semibold text-white">
                  {formatNumber(result.batchCount)}
                </div>
                <div className="text-green-300/80 text-sm">涉及批次</div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-green-400/20">
                <div className="text-lg font-semibold text-white">
                  {formatNumber(result.productCount)}
                </div>
                <div className="text-green-300/80 text-sm">涉及产品</div>
              </div>
            </div>

            <div className="text-white/70 text-sm">
              ⏱️ 处理耗时: {result.processingTime}ms
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                <h4 className="text-yellow-300 font-semibold mb-2">⚠️ 处理警告</h4>
                <ul className="text-yellow-200/80 text-sm space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default MonthlyBalanceGenerator;