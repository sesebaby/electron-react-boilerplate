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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversionForm, setConversionForm] = useState({
    name: '',
    fromUnitId: '',
    toUnitId: '',
    conversionRate: 1,
    category: UnitType.QUANTITY,
    description: '',
    isActive: false
  });

  // 初始化数据
  useEffect(() => {
    loadData();
  }, []);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 加载单位数据
      const unitsResult = await window.electronAPI.dbGetAllUnits();
      if (unitsResult.success) {
        setUnits(unitsResult.data);
      } else {
        // 如果没有单位数据，使用示例数据
        const exampleUnits: Unit[] = [
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
        setUnits(exampleUnits);
      }
      
      // 加载换算规则数据 - 暂时使用空数据
      // const rulesResult = await window.electronAPI.dbGetAllConversionRules();
      // if (rulesResult.success) {
      //   setConversionRules(rulesResult.data);
      // } else {
      //   console.error('加载换算规则失败:', rulesResult.error);
      //   setError('加载换算规则失败');
      // }
      setConversionRules([]);
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

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
      setLoading(true);
      setError(null);
      
      if (editingConversion) {
        // 编辑现有规则 - 暂时模拟成功
        // const result = await window.electronAPI.dbUpdateConversionRule({
        //   id: editingConversion.id,
        //   updates: conversionForm
        // });
        const result = { success: true, error: null };
        
        if (result.success) {
          // 重新加载数据
          await loadData();
          setShowConversionForm(false);
          setEditingConversion(null);
        } else {
          setError('更新换算规则失败: ' + result.error);
        }
      } else {
        // 添加新规则 - 暂时模拟成功
        // const result = await window.electronAPI.dbCreateConversionRule(conversionForm);
        const result = { success: true, error: null };
        
        if (result.success) {
          // 重新加载数据
          await loadData();
          setShowConversionForm(false);
        } else {
          setError('创建换算规则失败: ' + result.error);
        }
      }
      
      // 重置表单
      setConversionForm({
        name: '',
        fromUnitId: '',
        toUnitId: '',
        conversionRate: 1,
        category: UnitType.QUANTITY,
        description: '',
        isActive: false
      });
    } catch (error) {
      console.error('保存换算规则失败:', error);
      setError('保存换算规则失败');
    } finally {
      setLoading(false);
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
      try {
        setLoading(true);
        setError(null);
        
        // const result = await window.electronAPI.dbDeleteConversionRule({ id: ruleId });
        const result = { success: true, error: null };
        
        if (result.success) {
          // 重新加载数据
          await loadData();
        } else {
          setError('删除换算规则失败: ' + result.error);
        }
      } catch (error) {
        console.error('删除换算规则失败:', error);
        setError('删除换算规则失败');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">换算规则管理</h1>
        <p className="text-white/70">管理全局单位换算规则，为业务系统提供标准化的单位转换</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            <span className="text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
            disabled={loading}
          >
            <span className="mr-2">➕</span>
            {loading ? '加载中...' : '添加换算规则'}
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-white/60">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : conversionRules.length === 0 ? (
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
                            disabled={loading}
                            className="px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 rounded-md transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 disabled:opacity-50"
                            title="编辑"
                          >
                            <span className="text-sm">✏️</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteConversion(rule.id)}
                            disabled={loading}
                            className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded-md transition-all duration-200 border border-red-500/30 hover:border-red-400/50 disabled:opacity-50"
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

        {/* 系统初始化说明 */}
        <div className="glass-surface rounded-lg p-4 mb-4 bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 text-lg">ℹ️</span>
            <div>
              <h4 className="text-blue-300 font-medium mb-2">系统初始化说明</h4>
              <p className="text-blue-200/80 text-sm mb-2">
                上方是初始化系统的换算规则示意，默认为禁用状态，不会影响业务。如有需要，可以自行修改开启。
              </p>
              <ul className="text-blue-200/70 text-xs space-y-1">
                <li>• 所有初始换算规则均为禁用状态，确保不会在用户不知情的情况下影响业务</li>
                <li>• 您可以根据实际业务需要，选择性启用相关的换算规则</li>
                <li>• 启用规则前请仔细检查换算比率是否符合您的业务要求</li>
              </ul>
            </div>
          </div>
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
          <div className="glass-card w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
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

            <form onSubmit={onConversionSubmit} className="space-y-3">
              {/* 第一行：规则名称和换算类别 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
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
                  <label className="block text-sm font-medium text-white/80 mb-1">
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
              </div>

              {/* 第二行：源单位和目标单位 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
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
                  <label className="block text-sm font-medium text-white/80 mb-1">
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
              </div>

              {/* 第三行：换算比率 */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
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

              {/* 第四行：描述 */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  描述
                </label>
                <GlassInput
                  type="text"
                  value={conversionForm.description}
                  onChange={(e) => setConversionForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="换算规则的详细描述（可选）"
                />
              </div>

              {/* 第五行：启用状态 */}
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

              <div className="flex gap-3 pt-3">
                <GlassButton
                  type="button"
                  onClick={() => setShowConversionForm(false)}
                  variant="secondary"
                  className="flex-1"
                  disabled={loading}
                >
                  取消
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? '保存中...' : (editingConversion ? '保存' : '添加')}
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