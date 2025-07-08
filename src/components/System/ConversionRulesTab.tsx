import React from 'react';
import { createPortal } from 'react-dom';
import { GlassCard, GlassInput, GlassSelect, GlassButton } from '../ui/FormControls';
import { GlobalConversionRule, Unit, UnitType } from '../../types/entities';
import { 
  Table, 
  TableContainer,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty,
  TableLoading
} from '../ui/table';

interface ConversionRulesTabProps {
  conversionRules: GlobalConversionRule[];
  units: Unit[];
  showConversionForm: boolean;
  setShowConversionForm: (show: boolean) => void;
  editingConversion: GlobalConversionRule | null;
  conversionForm: {
    name: string;
    fromUnitId: string;
    toUnitId: string;
    conversionRate: number;
    category: UnitType;
    description: string;
    isActive: boolean;
  };
  setConversionForm: (form: any) => void;
  onConversionSubmit: (e: React.FormEvent) => Promise<void>;
  onEditConversion: (rule: GlobalConversionRule) => void;
  onDeleteConversion: (ruleId: string) => Promise<void>;
}

const ConversionRulesTab: React.FC<ConversionRulesTabProps> = ({
  conversionRules,
  units,
  showConversionForm,
  setShowConversionForm,
  editingConversion,
  conversionForm,
  setConversionForm,
  onConversionSubmit,
  onEditConversion,
  onDeleteConversion
}) => {
  const unitTypeOptions = [
    { value: UnitType.WEIGHT, label: '重量' },
    { value: UnitType.LENGTH, label: '长度' },
    { value: UnitType.VOLUME, label: '体积' },
    { value: UnitType.QUANTITY, label: '数量' },
    { value: UnitType.AREA, label: '面积' },
    { value: UnitType.TIME, label: '时间' }
  ];

  const getUnitTypeLabel = (type: UnitType) => {
    return unitTypeOptions.find(opt => opt.value === type)?.label || type;
  };

  const getUnitName = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    return unit ? `${unit.name}(${unit.symbol})` : unitId;
  };

  // 按类别过滤单位
  const getUnitsForCategory = (category: UnitType) => {
    return units.filter(unit => unit.type === category && unit.isActive);
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">换算规则</h3>
          <p className="text-white/70 text-sm mt-1">管理全局单位换算规则</p>
        </div>
        <GlassButton
          onClick={() => setShowConversionForm(true)}
          variant="primary"
        >
          <span className="mr-2">➕</span>
          添加换算规则
        </GlassButton>
      </div>

      {/* 换算规则表格 */}
      <div className="glass-surface rounded-lg overflow-hidden mb-6">
        <TableContainer height="400px">
          <Table stickyHeader minWidth="1000px">
            <TableHeader sticky>
              <TableRow>
                <TableHead className="min-w-[150px] text-left">规则名称</TableHead>
                <TableHead className="min-w-[100px] text-left">类别</TableHead>
                <TableHead className="min-w-[120px] text-left">源单位</TableHead>
                <TableHead className="min-w-[120px] text-left">目标单位</TableHead>
                <TableHead className="min-w-[100px] text-left">比率</TableHead>
                <TableHead className="min-w-[200px] text-left">描述</TableHead>
                <TableHead className="min-w-[80px] text-left">状态</TableHead>
                <TableHead className="min-w-[120px] text-left">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversionRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-white/60">
                    暂无换算规则，请添加规则
                  </TableCell>
                </TableRow>
              ) : (
                conversionRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="min-w-[150px] text-white font-medium">{rule.name}</TableCell>
                    <TableCell className="min-w-[100px] text-white/80">{getUnitTypeLabel(rule.category)}</TableCell>
                    <TableCell className="min-w-[120px] text-white/80">{getUnitName(rule.fromUnitId)}</TableCell>
                    <TableCell className="min-w-[120px] text-white/80">{getUnitName(rule.toUnitId)}</TableCell>
                    <TableCell className="min-w-[100px] text-white/80">{rule.conversionRate}</TableCell>
                    <TableCell className="min-w-[200px] text-white/70 max-w-xs truncate">
                      {rule.description || '-'}
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.isActive 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {rule.isActive ? '启用' : '禁用'}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEditConversion(rule)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteConversion(rule.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {/* 换算规则表单弹出框 */}
      {showConversionForm && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="glass-card w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-white">
                {editingConversion ? '编辑换算规则' : '添加换算规则'}
              </h4>
              <button
                type="button"
                onClick={() => setShowConversionForm(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onConversionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  规则名称 *
                </label>
                <GlassInput
                  type="text"
                  value={conversionForm.name}
                  onChange={(e) => setConversionForm((prev: typeof conversionForm) => ({ ...prev, name: e.target.value }))}
                  placeholder="如：重量标准换算"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  换算类别 *
                </label>
                <GlassSelect
                  value={conversionForm.category}
                  onChange={(e) => {
                    const category = e.target.value as UnitType;
                    setConversionForm((prev: typeof conversionForm) => ({ 
                      ...prev, 
                      category,
                      fromUnitId: '',
                      toUnitId: ''
                    }));
                  }}
                  required
                >
                  {unitTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </GlassSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  源单位 *
                </label>
                <GlassSelect
                  value={conversionForm.fromUnitId}
                  onChange={(e) => setConversionForm((prev: typeof conversionForm) => ({ ...prev, fromUnitId: e.target.value }))}
                  required
                >
                  <option value="">请选择源单位</option>
                  {getUnitsForCategory(conversionForm.category).map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}({unit.symbol})
                    </option>
                  ))}
                </GlassSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  目标单位 *
                </label>
                <GlassSelect
                  value={conversionForm.toUnitId}
                  onChange={(e) => setConversionForm((prev: typeof conversionForm) => ({ ...prev, toUnitId: e.target.value }))}
                  required
                >
                  <option value="">请选择目标单位</option>
                  {getUnitsForCategory(conversionForm.category)
                    .filter(unit => unit.id !== conversionForm.fromUnitId)
                    .map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}({unit.symbol})
                      </option>
                    ))}
                </GlassSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  换算比率 *
                </label>
                <GlassInput
                  type="number"
                  value={conversionForm.conversionRate}
                  onChange={(e) => setConversionForm((prev: typeof conversionForm) => ({ ...prev, conversionRate: parseFloat(e.target.value) || 0 }))}
                  placeholder="如：1000（1千克=1000克）"
                  step="0.01"
                  min="0.01"
                  required
                />
                <p className="text-xs text-white/60 mt-1">
                  1个源单位 = {conversionForm.conversionRate}个目标单位
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  描述
                </label>
                <GlassInput
                  type="text"
                  value={conversionForm.description}
                  onChange={(e) => setConversionForm((prev: typeof conversionForm) => ({ ...prev, description: e.target.value }))}
                  placeholder="换算规则的详细描述（可选）"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="conversionActive"
                  checked={conversionForm.isActive}
                  onChange={(e) => setConversionForm((prev: typeof conversionForm) => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-white/10"
                />
                <label htmlFor="conversionActive" className="text-sm text-white/80">
                  启用此换算规则
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <GlassButton
                  type="button"
                  onClick={() => setShowConversionForm(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  取消
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingConversion ? '保存' : '添加'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </GlassCard>
  );
};

export default ConversionRulesTab;