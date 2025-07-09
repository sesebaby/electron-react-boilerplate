import React from 'react';
import { createPortal } from 'react-dom';
import { GlassCard, GlassInput, GlassSelect, GlassButton } from '../ui/FormControls';
import { Unit, UnitType } from '../../types/entities';
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

interface UnitManagementTabProps {
  units: Unit[];
  showUnitForm: boolean;
  setShowUnitForm: (show: boolean) => void;
  editingUnit: Unit | null;
  unitForm: {
    name: string;
    symbol: string;
    type: UnitType;
    precision: number;
    description: string;
    isActive: boolean;
  };
  setUnitForm: (form: any) => void;
  onUnitSubmit: (e: React.FormEvent) => Promise<void>;
  onEditUnit: (unit: Unit) => void;
  onDeleteUnit: (unitId: string) => Promise<void>;
  onReimportUnits?: () => Promise<void>;
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
  onDeleteUnit,
  onReimportUnits
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
        <div className="flex gap-3">
          {onReimportUnits && (
            <GlassButton
              onClick={onReimportUnits}
              variant="secondary"
            >
              <span className="mr-2">🔄</span>
              重新导入单位
            </GlassButton>
          )}
          <GlassButton
            onClick={() => setShowUnitForm(true)}
            variant="primary"
          >
            <span className="mr-2">➕</span>
            添加单位
          </GlassButton>
        </div>
      </div>

      {/* 单位表格 */}
      <div className="glass-surface rounded-lg overflow-hidden mb-6">
        <TableContainer height="400px">
          <Table stickyHeader minWidth="800px">
            <TableHeader sticky>
              <TableRow>
                <TableHead className="min-w-[120px] text-left">名称</TableHead>
                <TableHead className="min-w-[100px] text-left">符号</TableHead>
                <TableHead className="min-w-[100px] text-left">类型</TableHead>
                <TableHead className="min-w-[200px] text-left">描述</TableHead>
                <TableHead className="min-w-[80px] text-left">状态</TableHead>
                <TableHead className="min-w-[120px] text-left">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-white/60">
                    暂无单位数据，请添加单位
                  </TableCell>
                </TableRow>
              ) : (
                units.map(unit => (
                  <TableRow key={unit.id}>
                    <TableCell className="min-w-[120px] text-white">{unit.name}</TableCell>
                    <TableCell className="min-w-[100px] text-white/80">{unit.symbol}</TableCell>
                    <TableCell className="min-w-[100px] text-white/80">{getUnitTypeLabel(unit.type)}</TableCell>
                    <TableCell className="min-w-[200px] text-white/70 max-w-xs truncate">
                      {unit.description || '-'}
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        unit.isActive 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {unit.isActive ? '启用' : '禁用'}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {/* 单位表单弹出框 */}
      {showUnitForm && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="glass-card w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
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
                  onChange={(e) => setUnitForm((prev: typeof unitForm) => ({ ...prev, name: e.target.value }))}
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
                  onChange={(e) => setUnitForm((prev: typeof unitForm) => ({ ...prev, symbol: e.target.value }))}
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
                  onChange={(e) => setUnitForm((prev: typeof unitForm) => ({ ...prev, type: e.target.value as UnitType }))}
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
                  小数点精度 *
                </label>
                <GlassSelect
                  value={unitForm.precision}
                  onChange={(e) => setUnitForm((prev: typeof unitForm) => ({ ...prev, precision: parseInt(e.target.value) }))}
                  required
                >
                  <option value={0}>0位小数</option>
                  <option value={1}>1位小数</option>
                  <option value={2}>2位小数</option>
                  <option value={3}>3位小数</option>
                  <option value={4}>4位小数</option>
                  <option value={5}>5位小数</option>
                  <option value={6}>6位小数</option>
                </GlassSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  描述
                </label>
                <GlassInput
                  type="text"
                  value={unitForm.description}
                  onChange={(e) => setUnitForm((prev: typeof unitForm) => ({ ...prev, description: e.target.value }))}
                  placeholder="单位的详细描述"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unitActive"
                  checked={unitForm.isActive}
                  onChange={(e) => setUnitForm((prev: typeof unitForm) => ({ ...prev, isActive: e.target.checked }))}
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
        </div>,
        document.body
      )}
    </GlassCard>
  );
};

export default UnitManagementTab;