import React, { useState, useEffect } from 'react';
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
  TableRow
} from '../ui/table';

const ConversionRulesManagement: React.FC = () => {
  const [conversionRules, setConversionRules] = useState<GlobalConversionRule[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [editingConversion, setEditingConversion] = useState<GlobalConversionRule | null>(null);
  const [conversionForm, setConversionForm] = useState({
    name: '',
    fromUnitId: '',
    toUnitId: '',
    conversionRate: 1,
    category: UnitType.QUANTITY,
    description: '',
    isActive: true
  });

  // 初始化示例数据
  useEffect(() => {
    // 示例单位数据
    const exampleUnits: Unit[] = [
      // 数量单位
      { 
        id: 'unit_001', 
        name: '个', 
        symbol: 'pcs', 
        type: UnitType.QUANTITY, 
        precision: 0, 
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 'unit_002', 
        name: '箱', 
        symbol: 'box', 
        type: UnitType.QUANTITY, 
        precision: 0, 
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 'unit_003', 
        name: '包', 
        symbol: 'pkg', 
        type: UnitType.QUANTITY, 
        precision: 0, 
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 'unit_004', 
        name: '套', 
        symbol: 'set', 
        type: UnitType.QUANTITY, 
        precision: 0, 
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // 重量单位
      { 
        id: 'unit_005', 
        name: '千克', 
        symbol: 'kg', 
        type: UnitType.WEIGHT, 
        precision: 2, 
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 'unit_006', 
        name: '克', 
        symbol: 'g', 
        type: UnitType.WEIGHT, 
        precision: 0, 
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // 体积单位
      { 
        id: 'unit_007', 
        name: '升', 
        symbol: 'L', 
        type: UnitType.VOLUME, 
        precision: 2, 
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 'unit_008', 
        name: '毫升', 
        symbol: 'ml', 
        type: UnitType.VOLUME, 
        precision: 0, 
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // 示例换算规则数据
    const exampleRules: GlobalConversionRule[] = [
      {
        id: 'rule_001',
        name: '标准包装换算（箱装）',
        fromUnitId: 'unit_002', // 箱
        toUnitId: 'unit_001',   // 个
        conversionRate: 24,
        category: UnitType.QUANTITY,
        description: '标准箱装，1箱 = 24个',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'rule_002',
        name: '标准包装换算（包装）',
        fromUnitId: 'unit_003', // 包
        toUnitId: 'unit_001',   // 个
        conversionRate: 12,
        category: UnitType.QUANTITY,
        description: '标准包装，1包 = 12个',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'rule_003',
        name: '重量标准换算',
        fromUnitId: 'unit_005', // 千克
        toUnitId: 'unit_006',   // 克
        conversionRate: 1000,
        category: UnitType.WEIGHT,
        description: '重量单位换算，1千克 = 1000克',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'rule_004',
        name: '体积标准换算',
        fromUnitId: 'unit_007', // 升
        toUnitId: 'unit_008',   // 毫升
        conversionRate: 1000,
        category: UnitType.VOLUME,
        description: '体积单位换算，1升 = 1000毫升',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'rule_005',
        name: '套装换算（箱对箱特殊规格）',
        fromUnitId: 'unit_002', // 箱
        toUnitId: 'unit_004',   // 套
        conversionRate: 6,
        category: UnitType.QUANTITY,
        description: '特殊套装规格，1箱 = 6套',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    setUnits(exampleUnits);
    setConversionRules(exampleRules);
  }, []);

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

  const getUnitsForCategory = (category: UnitType) => {
    return units.filter(unit => unit.type === category && unit.isActive);
  };

  const onConversionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingConversion) {
        // 编辑现有规则
        const updatedRule: GlobalConversionRule = {
          ...editingConversion,
          ...conversionForm,
          updatedAt: new Date()
        };
        
        setConversionRules(prev => 
          prev.map(rule => rule.id === editingConversion.id ? updatedRule : rule)
        );
      } else {
        // 添加新规则
        const newRule: GlobalConversionRule = {
          id: `rule_${Date.now()}`,
          ...conversionForm,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setConversionRules(prev => [...prev, newRule]);
      }
      
      // 重置表单
      setConversionForm({
        name: '',
        fromUnitId: '',
        toUnitId: '',
        conversionRate: 1,
        category: UnitType.QUANTITY,
        description: '',
        isActive: true
      });
      setShowConversionForm(false);
      setEditingConversion(null);
    } catch (error) {
      console.error('保存换算规则失败:', error);
    }
  };

  const onEditConversion = (rule: GlobalConversionRule) => {
    setEditingConversion(rule);
    setConversionForm({
      name: rule.name,
      fromUnitId: rule.fromUnitId,
      toUnitId: rule.toUnitId,
      conversionRate: rule.conversionRate,
      category: rule.category,
      description: rule.description,
      isActive: rule.isActive
    });
    setShowConversionForm(true);
  };

  const onDeleteConversion = async (ruleId: string) => {
    if (window.confirm('确定要删除这个换算规则吗？')) {
      setConversionRules(prev => prev.filter(rule => rule.id !== ruleId));
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">换算规则管理</h1>
        <p className="text-white/70">管理全局单位换算规则，为业务系统提供标准化的单位转换</p>
      </div>

      {/* 主要内容 */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">全局换算规则</h3>
            <p className="text-white/70 text-sm mt-1">
              这些换算规则将应用于整个系统，确保单位换算的一致性和准确性
            </p>
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
          <TableContainer height="500px" scrollbarClassName="table-scrollbar">
            <Table stickyHeader minWidth="1000px">
              <TableHeader sticky>
                <TableRow>
                  <TableHead className="min-w-[180px] text-left">规则名称</TableHead>
                  <TableHead className="min-w-[100px] text-left">类别</TableHead>
                  <TableHead className="min-w-[120px] text-left">源单位</TableHead>
                  <TableHead className="min-w-[120px] text-left">目标单位</TableHead>
                  <TableHead className="min-w-[100px] text-left">比率</TableHead>
                  <TableHead className="min-w-[250px] text-left">描述</TableHead>
                  <TableHead className="min-w-[80px] text-left">状态</TableHead>
                  <TableHead className="min-w-[140px] text-left">操作</TableHead>
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
                      <TableCell className="min-w-[180px] text-white font-medium">{rule.name}</TableCell>
                      <TableCell className="min-w-[100px] text-white/80">{getUnitTypeLabel(rule.category)}</TableCell>
                      <TableCell className="min-w-[120px] text-white/80">{getUnitName(rule.fromUnitId)}</TableCell>
                      <TableCell className="min-w-[120px] text-white/80">{getUnitName(rule.toUnitId)}</TableCell>
                      <TableCell className="min-w-[100px] text-white/80">{rule.conversionRate}</TableCell>
                      <TableCell className="min-w-[250px] text-white/70">
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
                      <TableCell className="min-w-[140px]">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onEditConversion(rule)}
                            className="px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 rounded-md transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50"
                            title="编辑"
                          >
                            <span className="text-sm">✏️</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteConversion(rule.id)}
                            className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded-md transition-all duration-200 border border-red-500/30 hover:border-red-400/50"
                            title="删除"
                          >
                            <span className="text-sm">🗑️</span>
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

        {/* 说明信息 */}
        <div className="glass-surface rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">使用说明</h4>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• 这些换算规则是全局生效的，将在整个系统中保持一致</li>
            <li>• 换算比率表示：1个源单位 = 比率数量的目标单位</li>
            <li>• 建议为常用的单位组合创建换算规则，提高业务效率</li>
            <li>• 禁用的规则不会在业务中显示，但保留数据便于后续启用</li>
          </ul>
        </div>
      </GlassCard>

      {/* 换算规则表单弹出框 */}
      {showConversionForm && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
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
                  onChange={(e) => setConversionForm(prev => ({ ...prev, name: e.target.value }))}
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
                    setConversionForm(prev => ({ 
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
                  onChange={(e) => setConversionForm(prev => ({ ...prev, fromUnitId: e.target.value }))}
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
                  onChange={(e) => setConversionForm(prev => ({ ...prev, toUnitId: e.target.value }))}
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
                  onChange={(e) => setConversionForm(prev => ({ ...prev, conversionRate: parseFloat(e.target.value) || 0 }))}
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
                  onChange={(e) => setConversionForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="换算规则的详细描述（可选）"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="conversionActive"
                  checked={conversionForm.isActive}
                  onChange={(e) => setConversionForm(prev => ({ ...prev, isActive: e.target.checked }))}
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
    </div>
  );
};

export default ConversionRulesManagement;