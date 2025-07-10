import React, { useState, useEffect } from 'react';
import { GlobalConversionRule, Unit, UnitType } from '../../types/entities';
import { GlassInput, GlassSelect, GlassCard } from '../ui/FormControls';
import { serviceManager } from '../../services/core';

interface UnitConversionSettingsProps {
  enableConversion: boolean;
  conversionType: 'global' | 'custom';
  globalRuleId?: string;
  customRule?: {
    fromUnitId: string;
    toUnitId: string;
    conversionRate: number;
    description: string;
  };
  onSettingsChange: (settings: {
    enableConversion: boolean;
    conversionType: 'global' | 'custom';
    globalRuleId?: string;
    customRule?: {
      fromUnitId: string;
      toUnitId: string;
      conversionRate: number;
      description: string;
    };
  }) => void;
  className?: string;
}

export const UnitConversionSettings: React.FC<UnitConversionSettingsProps> = ({
  enableConversion,
  conversionType,
  globalRuleId,
  customRule,
  onSettingsChange,
  className
}) => {
  const [globalRules, setGlobalRules] = useState<GlobalConversionRule[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 本地状态管理
  const [localSettings, setLocalSettings] = useState({
    enableConversion,
    conversionType,
    globalRuleId: globalRuleId || '',
    customRule: customRule || {
      fromUnitId: '',
      toUnitId: '',
      conversionRate: 1,
      description: ''
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // 同步props到本地状态
    setLocalSettings({
      enableConversion,
      conversionType,
      globalRuleId: globalRuleId || '',
      customRule: customRule || {
        fromUnitId: '',
        toUnitId: '',
        conversionRate: 1,
        description: ''
      }
    });
  }, [enableConversion, conversionType, globalRuleId, customRule]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const inventoryService = serviceManager.getInventoryService();
      const [rulesResult, unitsResult] = await Promise.all([
        inventoryService.findAllGlobalConversionRules(),
        inventoryService.findAllUnits()
      ]);

      const rulesData = rulesResult.success ? (rulesResult.data || []) : [];
      const unitsData = unitsResult.success ? (unitsResult.data || []) : [];

      setGlobalRules(rulesData);
      setUnits(unitsData);
    } catch (err) {
      setError('加载数据失败');
      console.error('Failed to load conversion data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (newSettings: Partial<typeof localSettings>) => {
    const updatedSettings = { ...localSettings, ...newSettings };
    setLocalSettings(updatedSettings);
    
    // 构建回调参数
    const callbackData: Parameters<typeof onSettingsChange>[0] = {
      enableConversion: updatedSettings.enableConversion,
      conversionType: updatedSettings.conversionType,
      globalRuleId: updatedSettings.conversionType === 'global' ? updatedSettings.globalRuleId : undefined,
      customRule: updatedSettings.conversionType === 'custom' ? updatedSettings.customRule : undefined
    };
    
    onSettingsChange(callbackData);
  };

  const handleEnableToggle = (enabled: boolean) => {
    handleSettingsChange({ enableConversion: enabled });
  };

  const handleTypeChange = (type: 'global' | 'custom') => {
    handleSettingsChange({ conversionType: type });
  };

  const handleGlobalRuleChange = (ruleId: string) => {
    handleSettingsChange({ globalRuleId: ruleId });
  };

  const handleCustomRuleChange = (field: keyof typeof localSettings.customRule, value: any) => {
    const updatedCustomRule = { ...localSettings.customRule, [field]: value };
    
    // 自动生成描述
    if (field === 'fromUnitId' || field === 'toUnitId' || field === 'conversionRate') {
      const fromUnit = units.find(u => u.id === updatedCustomRule.fromUnitId);
      const toUnit = units.find(u => u.id === updatedCustomRule.toUnitId);
      
      if (fromUnit && toUnit && updatedCustomRule.conversionRate) {
        updatedCustomRule.description = `1${fromUnit.symbol} = ${updatedCustomRule.conversionRate}${toUnit.symbol}`;
      }
    }
    
    handleSettingsChange({ customRule: updatedCustomRule });
  };

  const getPreviewText = () => {
    if (!localSettings.enableConversion) {
      return '换算已禁用';
    }
    
    if (localSettings.conversionType === 'global') {
      const rule = globalRules.find(r => r.id === localSettings.globalRuleId);
      return rule ? rule.description : '请选择全局规则';
    } else {
      const { customRule } = localSettings;
      const fromUnit = units.find(u => u.id === customRule.fromUnitId);
      const toUnit = units.find(u => u.id === customRule.toUnitId);
      
      if (fromUnit && toUnit && customRule.conversionRate) {
        return `1${fromUnit.symbol} = ${customRule.conversionRate}${toUnit.symbol}`;
      }
      return '请完成自定义规则设置';
    }
  };

  if (loading) {
    return (
      <GlassCard title="单位换算设置" className={className}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-white/80">正在加载...</span>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard title="单位换算设置" className={className}>
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">⚠️ {error}</div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
          >
            重新加载
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard title="单位换算设置" className={className}>
      <div className="space-y-4">
        {/* 启用换算开关 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-white font-medium">启用单位换算</label>
            <p className="text-sm text-white/70">为该商品启用单位换算功能</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.enableConversion}
              onChange={(e) => handleEnableToggle(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              localSettings.enableConversion
                ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                : 'bg-white/20'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform ${
                localSettings.enableConversion ? 'translate-x-5' : 'translate-x-0'
              } mt-0.5 ml-0.5`}></div>
            </div>
          </label>
        </div>

        {/* 换算配置 */}
        {localSettings.enableConversion && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            {/* 换算类型选择 */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('global')}
                className={`p-3 rounded-lg border transition-all ${
                  localSettings.conversionType === 'global'
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="font-medium">全局换算</div>
                <div className="text-xs opacity-80">使用系统预设规则</div>
              </button>
              
              <button
                type="button"
                onClick={() => handleTypeChange('custom')}
                className={`p-3 rounded-lg border transition-all ${
                  localSettings.conversionType === 'custom'
                    ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="font-medium">自定义换算</div>
                <div className="text-xs opacity-80">设置专属换算规则</div>
              </button>
            </div>

            {/* 全局规则选择 */}
            {localSettings.conversionType === 'global' && (
              <GlassSelect
                label="选择全局规则"
                value={localSettings.globalRuleId}
                onChange={(e) => handleGlobalRuleChange(e.target.value)}
                required
              >
                <option value="">请选择全局换算规则</option>
                {globalRules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name} - {rule.description}
                  </option>
                ))}
              </GlassSelect>
            )}

            {/* 自定义规则编辑 */}
            {localSettings.conversionType === 'custom' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <GlassSelect
                    label="源单位"
                    value={localSettings.customRule.fromUnitId}
                    onChange={(e) => handleCustomRuleChange('fromUnitId', e.target.value)}
                    required
                  >
                    <option value="">请选择源单位</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.symbol})
                      </option>
                    ))}
                  </GlassSelect>

                  <GlassSelect
                    label="目标单位"
                    value={localSettings.customRule.toUnitId}
                    onChange={(e) => handleCustomRuleChange('toUnitId', e.target.value)}
                    required
                  >
                    <option value="">请选择目标单位</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.symbol})
                      </option>
                    ))}
                  </GlassSelect>
                </div>

                <GlassInput
                  label="换算比率"
                  type="number"
                  placeholder="1.0"
                  value={localSettings.customRule.conversionRate}
                  onChange={(e) => handleCustomRuleChange('conversionRate', parseFloat(e.target.value) || 1)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            )}

            {/* 换算预览 */}
            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm text-white/70 mb-1">换算预览</div>
              <div className="text-white font-medium">{getPreviewText()}</div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default UnitConversionSettings;