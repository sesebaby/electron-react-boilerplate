import React from 'react';
import { GlassCard, GlassInput, GlassSelect, GlassButton } from '../ui/FormControls';
import { Unit, UnitType } from '../../types/entities';

interface UnitManagementTabProps {
  units: Unit[];
  showUnitForm: boolean;
  setShowUnitForm: (show: boolean) => void;
  editingUnit: Unit | null;
  unitForm: {
    name: string;
    symbol: string;
    type: UnitType;
    description: string;
    isActive: boolean;
  };
  setUnitForm: (form: any) => void;
  onUnitSubmit: (e: React.FormEvent) => Promise<void>;
  onEditUnit: (unit: Unit) => void;
  onDeleteUnit: (unitId: string) => Promise<void>;
}

const UnitManagementTab: React.FC<UnitManagementTabProps> = ({
  units,
  showUnitForm,
  setShowUnitForm,
  editingUnit,
  unitForm,
  setUnitForm,
  onUnitSubmit,
  onEditUnit,
  onDeleteUnit
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

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">单位管理</h3>
          <p className="text-white/70 text-sm mt-1">管理系统中的计量单位</p>
        </div>
        <GlassButton
          onClick={() => setShowUnitForm(true)}
          variant="primary"
        >
          <span className="mr-2">➕</span>
          添加单位
        </GlassButton>
      </div>

      {/* 单位表格 */}
      <div className="glass-surface rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/80 font-medium">名称</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">符号</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">类型</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">描述</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">状态</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-white/60">
                    暂无单位数据，请添加单位
                  </td>
                </tr>
              ) : (
                units.map(unit => (
                  <tr key={unit.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-white">{unit.name}</td>
                    <td className="py-3 px-4 text-white/80">{unit.symbol}</td>
                    <td className="py-3 px-4 text-white/80">{getUnitTypeLabel(unit.type)}</td>
                    <td className="py-3 px-4 text-white/70 max-w-xs truncate">
                      {unit.description || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        unit.isActive 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {unit.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEditUnit(unit)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteUnit(unit.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 单位表单弹出框 */}
      {showUnitForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="glass-card w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-white">
                {editingUnit ? '编辑单位' : '添加单位'}
              </h4>
              <button
                type="button"
                onClick={() => setShowUnitForm(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onUnitSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  单位名称 *
                </label>
                <GlassInput
                  type="text"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如：千克、个、箱"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  单位符号 *
                </label>
                <GlassInput
                  type="text"
                  value={unitForm.symbol}
                  onChange={(e) => setUnitForm(prev => ({ ...prev, symbol: e.target.value }))}
                  placeholder="如：kg、pcs、box"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  单位类型 *
                </label>
                <GlassSelect
                  value={unitForm.type}
                  onChange={(e) => setUnitForm(prev => ({ ...prev, type: e.target.value as UnitType }))}
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
                  描述
                </label>
                <GlassInput
                  type="text"
                  value={unitForm.description}
                  onChange={(e) => setUnitForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="单位的详细描述"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unitActive"
                  checked={unitForm.isActive}
                  onChange={(e) => setUnitForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-white/10"
                />
                <label htmlFor="unitActive" className="text-sm text-white/80">
                  启用此单位
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <GlassButton
                  type="button"
                  onClick={() => setShowUnitForm(false)}
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
                  {editingUnit ? '保存' : '添加'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default UnitManagementTab;