import React, { useState, useEffect } from 'react';
import { GlassCard, GlassInput, GlassSelect, GlassButton } from '../ui/FormControls';
import { unitService, globalConversionService } from '../../services/business';
import { Unit, GlobalConversionRule, UnitType } from '../../types/entities';
import UnitManagementTab from './UnitManagementTab';
import ConversionRulesTab from './ConversionRulesTab';

interface SystemSettingsProps {
  className?: string;
}

type SettingsTab = 'basic' | 'business' | 'units' | 'conversions';

interface BasicSettings {
  systemName: string;
  companyName: string;
  companyAddress: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  logo: string;
}

interface BusinessSettings {
  stockWarningThreshold: number;
  priceDecimalPlaces: number;
  defaultWarehouse: string;
  autoStockOut: boolean;
  requireApproval: boolean;
  enableBarcode: boolean;
  currencySymbol: string;
  taxRate: number;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('basic');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 设置状态
  const [basicSettings, setBasicSettings] = useState<BasicSettings>({
    systemName: '进销存管理系统',
    companyName: '示例公司',
    companyAddress: '北京市朝阳区示例街道123号',
    contactPhone: '010-12345678',
    contactEmail: 'contact@example.com',
    website: 'https://www.example.com',
    logo: ''
  });

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    stockWarningThreshold: 10,
    priceDecimalPlaces: 2,
    defaultWarehouse: 'main',
    autoStockOut: false,
    requireApproval: true,
    enableBarcode: true,
    currencySymbol: '¥',
    taxRate: 0.13
  });

  // 单位管理状态
  const [units, setUnits] = useState<Unit[]>([]);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: '',
    symbol: '',
    type: UnitType.QUANTITY,
    description: '',
    isActive: true
  });

  // 换算规则状态
  const [conversionRules, setConversionRules] = useState<GlobalConversionRule[]>([]);
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

  useEffect(() => {
    loadSettings();
    loadUnits();
    loadConversionRules();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // 从localStorage或API加载设置
      const savedBasic = localStorage.getItem('systemSettings.basic');
      const savedBusiness = localStorage.getItem('systemSettings.business');

      if (savedBasic) setBasicSettings(JSON.parse(savedBasic));
      if (savedBusiness) setBusinessSettings(JSON.parse(savedBusiness));
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // 保存到localStorage或API
      localStorage.setItem('systemSettings.basic', JSON.stringify(basicSettings));
      localStorage.setItem('systemSettings.business', JSON.stringify(businessSettings));

      setHasChanges(false);
      alert('设置保存成功！');
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    if (confirm('确定要重置所有设置到默认值吗？此操作不可撤销。')) {
      loadSettings();
      setHasChanges(false);
    }
  };

  const handleBasicChange = (field: keyof BasicSettings, value: string) => {
    setBasicSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleBusinessChange = (field: keyof BusinessSettings, value: any) => {
    setBusinessSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // =============== 单位管理 ===============

  const loadUnits = async () => {
    try {
      const allUnits = await unitService.findAll();
      setUnits(allUnits);
    } catch (error) {
      console.error('加载单位失败:', error);
    }
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim() || !unitForm.symbol.trim()) {
      alert('单位名称和符号不能为空');
      return;
    }

    try {
      if (editingUnit) {
        await unitService.update(editingUnit.id, unitForm);
      } else {
        await unitService.create(unitForm);
      }
      await loadUnits();
      setShowUnitForm(false);
      setEditingUnit(null);
      setUnitForm({
        name: '',
        symbol: '',
        type: UnitType.QUANTITY,
        description: '',
        isActive: true
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存单位失败');
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      symbol: unit.symbol,
      type: unit.type,
      description: unit.description || '',
      isActive: unit.isActive
    });
    setShowUnitForm(true);
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (confirm('确定要删除这个单位吗？')) {
      try {
        await unitService.delete(unitId);
        await loadUnits();
      } catch (error) {
        alert(error instanceof Error ? error.message : '删除单位失败');
      }
    }
  };

  // =============== 换算规则管理 ===============

  const loadConversionRules = async () => {
    try {
      const rules = await globalConversionService.findAll(false);
      setConversionRules(rules);
    } catch (error) {
      console.error('加载换算规则失败:', error);
    }
  };

  const handleConversionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversionForm.name.trim() || !conversionForm.fromUnitId || !conversionForm.toUnitId) {
      alert('规则名称和单位不能为空');
      return;
    }
    if (conversionForm.conversionRate <= 0) {
      alert('换算比率必须大于0');
      return;
    }

    try {
      const description = `1${units.find(u => u.id === conversionForm.fromUnitId)?.symbol} = ${conversionForm.conversionRate}${units.find(u => u.id === conversionForm.toUnitId)?.symbol}`;
      
      const ruleData = {
        ...conversionForm,
        description
      };

      if (editingConversion) {
        await globalConversionService.update(editingConversion.id, ruleData);
      } else {
        await globalConversionService.create(ruleData);
      }
      await loadConversionRules();
      setShowConversionForm(false);
      setEditingConversion(null);
      setConversionForm({
        name: '',
        fromUnitId: '',
        toUnitId: '',
        conversionRate: 1,
        category: UnitType.QUANTITY,
        description: '',
        isActive: true
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存换算规则失败');
    }
  };

  const handleEditConversion = (rule: GlobalConversionRule) => {
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

  const handleDeleteConversion = async (ruleId: string) => {
    if (confirm('确定要删除这个换算规则吗？')) {
      try {
        await globalConversionService.delete(ruleId);
        await loadConversionRules();
      } catch (error) {
        alert(error instanceof Error ? error.message : '删除换算规则失败');
      }
    }
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              系统设置
            </h1>
            <p className="mt-1 text-white/80">
              配置系统参数和业务规则
            </p>
          </div>
          <div className="flex gap-3">
            <GlassButton
              onClick={resetSettings}
              variant="secondary"
              disabled={loading}
            >
              <span className="mr-2">🔄</span>
              重置
            </GlassButton>
            <GlassButton
              onClick={saveSettings}
              variant="primary"
              disabled={loading || !hasChanges}
            >
              <span className="mr-2">💾</span>
              {loading ? '保存中...' : '保存设置'}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* 设置标签 */}
      <GlassCard className="p-0">
        <div className="flex border-b border-white/20">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
              activeTab === 'basic'
                ? 'text-white bg-white/10 border-b-2 border-blue-400'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">🏢</span>
            基本配置
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
              activeTab === 'business'
                ? 'text-white bg-white/10 border-b-2 border-blue-400'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">📊</span>
            业务参数
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('units')}
            className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
              activeTab === 'units'
                ? 'text-white bg-white/10 border-b-2 border-blue-400'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">📏</span>
            单位管理
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('conversions')}
            className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
              activeTab === 'conversions'
                ? 'text-white bg-white/10 border-b-2 border-blue-400'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">🔄</span>
            换算规则
          </button>
        </div>
      </GlassCard>

      {/* 设置内容 */}
      {activeTab === 'basic' && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-white mb-6">基本配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                系统名称 *
              </label>
              <GlassInput
                type="text"
                value={basicSettings.systemName}
                onChange={(e) => handleBasicChange('systemName', e.target.value)}
                placeholder="请输入系统名称"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                公司名称 *
              </label>
              <GlassInput
                type="text"
                value={basicSettings.companyName}
                onChange={(e) => handleBasicChange('companyName', e.target.value)}
                placeholder="请输入公司名称"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/80 mb-2">
                公司地址
              </label>
              <GlassInput
                type="text"
                value={basicSettings.companyAddress}
                onChange={(e) => handleBasicChange('companyAddress', e.target.value)}
                placeholder="请输入公司地址"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                联系电话
              </label>
              <GlassInput
                type="tel"
                value={basicSettings.contactPhone}
                onChange={(e) => handleBasicChange('contactPhone', e.target.value)}
                placeholder="请输入联系电话"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                联系邮箱
              </label>
              <GlassInput
                type="email"
                value={basicSettings.contactEmail}
                onChange={(e) => handleBasicChange('contactEmail', e.target.value)}
                placeholder="请输入联系邮箱"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                公司网站
              </label>
              <GlassInput
                type="url"
                value={basicSettings.website}
                onChange={(e) => handleBasicChange('website', e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                公司Logo URL
              </label>
              <GlassInput
                type="url"
                value={basicSettings.logo}
                onChange={(e) => handleBasicChange('logo', e.target.value)}
                placeholder="请输入Logo图片URL"
              />
            </div>
          </div>
        </GlassCard>
      )}

      {activeTab === 'business' && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-white mb-6">业务参数</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                库存预警阈值
              </label>
              <GlassInput
                type="number"
                value={businessSettings.stockWarningThreshold}
                onChange={(e) => handleBusinessChange('stockWarningThreshold', parseInt(e.target.value) || 0)}
                placeholder="10"
                min="0"
              />
              <p className="text-xs text-white/60 mt-1">当库存低于此值时发出预警</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                价格小数位数
              </label>
              <GlassSelect
                value={businessSettings.priceDecimalPlaces}
                onChange={(e) => handleBusinessChange('priceDecimalPlaces', parseInt(e.target.value))}
              >
                <option value={0}>0位小数</option>
                <option value={1}>1位小数</option>
                <option value={2}>2位小数</option>
                <option value={3}>3位小数</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                默认仓库
              </label>
              <GlassSelect
                value={businessSettings.defaultWarehouse}
                onChange={(e) => handleBusinessChange('defaultWarehouse', e.target.value)}
              >
                <option value="main">主仓库</option>
                <option value="backup">备用仓库</option>
                <option value="temp">临时仓库</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                货币符号
              </label>
              <GlassSelect
                value={businessSettings.currencySymbol}
                onChange={(e) => handleBusinessChange('currencySymbol', e.target.value)}
              >
                <option value="¥">人民币 (¥)</option>
                <option value="$">美元 ($)</option>
                <option value="€">欧元 (€)</option>
                <option value="£">英镑 (£)</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                税率 (%)
              </label>
              <GlassInput
                type="number"
                value={businessSettings.taxRate * 100}
                onChange={(e) => handleBusinessChange('taxRate', (parseFloat(e.target.value) || 0) / 100)}
                placeholder="13"
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div className="md:col-span-2">
              <h4 className="text-lg font-medium text-white mb-4">业务规则</h4>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={businessSettings.autoStockOut}
                    onChange={(e) => handleBusinessChange('autoStockOut', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                  />
                  <span className="text-white/90">自动出库</span>
                  <span className="text-xs text-white/60">销售订单确认后自动执行出库操作</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={businessSettings.requireApproval}
                    onChange={(e) => handleBusinessChange('requireApproval', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                  />
                  <span className="text-white/90">需要审批</span>
                  <span className="text-xs text-white/60">大额订单需要管理员审批</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={businessSettings.enableBarcode}
                    onChange={(e) => handleBusinessChange('enableBarcode', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                  />
                  <span className="text-white/90">启用条码扫描</span>
                  <span className="text-xs text-white/60">支持条码扫描进行快速操作</span>
                </label>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {activeTab === 'units' && (
        <UnitManagementTab
          units={units}
          showUnitForm={showUnitForm}
          setShowUnitForm={setShowUnitForm}
          editingUnit={editingUnit}
          unitForm={unitForm}
          setUnitForm={setUnitForm}
          onUnitSubmit={handleUnitSubmit}
          onEditUnit={handleEditUnit}
          onDeleteUnit={handleDeleteUnit}
        />
      )}

      {activeTab === 'conversions' && (
        <ConversionRulesTab
          conversionRules={conversionRules}
          units={units}
          showConversionForm={showConversionForm}
          setShowConversionForm={setShowConversionForm}
          editingConversion={editingConversion}
          conversionForm={conversionForm}
          setConversionForm={setConversionForm}
          onConversionSubmit={handleConversionSubmit}
          onEditConversion={handleEditConversion}
          onDeleteConversion={handleDeleteConversion}
        />
      )}

      {/* 保存提示 */}
      {hasChanges && (
        <GlassCard className="p-4 border-l-4 border-yellow-400">
          <div className="flex items-center">
            <span className="text-yellow-400 mr-2">⚠️</span>
            <span className="text-white/90">您有未保存的更改，请记得保存设置。</span>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default SystemSettings;
