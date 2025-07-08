import React, { useState, useEffect } from 'react';
import { GlassCard, GlassInput, GlassSelect, GlassButton } from '../ui/FormControls';
import { unitService, globalConversionService } from '../../services/business';
import { Unit, GlobalConversionRule, UnitType } from '../../types/entities';
import UnitManagementTab from './UnitManagementTab';
import ConversionRulesTab from './ConversionRulesTab';
import ConfirmDialog from '../ui/ConfirmDialog';
import AlertDialog from '../ui/AlertDialog';
import { notificationHelper } from '../../utils/notificationHelper';
import { NotificationType, ALL_MESSAGE_TYPES, IMPORTANT_MESSAGE_TYPES } from '../../types/simpleNotification';

interface SystemSettingsProps {
  className?: string;
}

type SettingsTab = 'basic' | 'business' | 'units' | 'conversions' | 'notifications';

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

  // 通知配置状态
  const [notificationSettings, setNotificationSettings] = useState(() => {
    return notificationHelper.getConfig();
  });

  // 单位管理状态
  const [units, setUnits] = useState<Unit[]>([]);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: '',
    symbol: '',
    type: UnitType.QUANTITY,
    precision: 0,
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

  // 弹出框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertVariant, setAlertVariant] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // 弹出框辅助函数
  const showAlert = (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlertDialog(true);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmAction(() => onConfirm);
    setShowConfirmDialog(true);
  };

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

      // 加载通知配置
      setNotificationSettings(notificationHelper.getConfig());
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

      // 保存通知配置
      notificationHelper.updateConfig(notificationSettings);

      setHasChanges(false);
      showAlert('保存成功', '设置保存成功！', 'success');
    } catch (error) {
      console.error('保存设置失败:', error);
      showAlert('保存失败', '保存设置失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    showConfirm('确定要重置所有设置到默认值吗？此操作不可撤销。', () => {
      loadSettings();
      setHasChanges(false);
    });
  };

  const handleBasicChange = (field: keyof BasicSettings, value: string) => {
    setBasicSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleBusinessChange = (field: keyof BusinessSettings, value: any) => {
    setBusinessSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // 通知配置处理函数
  const handleNotificationChange = (field: string, value: any) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleMessageTypeToggle = (type: NotificationType) => {
    setNotificationSettings(prev => {
      const enabledTypes = prev.enabledTypes.includes(type)
        ? prev.enabledTypes.filter(t => t !== type)
        : [...prev.enabledTypes, type];

      return { ...prev, enabledTypes };
    });
    setHasChanges(true);
  };

  const handleImportantModeToggle = (enabled: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      showOnlyImportant: enabled,
      // 如果启用重要模式，自动设置启用的类型为重要类型
      enabledTypes: enabled ? IMPORTANT_MESSAGE_TYPES : ALL_MESSAGE_TYPES
    }));
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

  const handleReimportUnits = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.dbReimportUnits) {
        const result = await window.electronAPI.dbReimportUnits();
        if (result.success) {
          await loadUnits(); // 重新加载单位数据
          showAlert('重新导入成功', result.message || '单位数据已重新导入', 'success');
        } else {
          showAlert('重新导入失败', result.error || '重新导入单位数据失败', 'error');
        }
      } else {
        showAlert('功能不可用', '此功能仅在Electron环境中可用', 'warning');
      }
    } catch (error) {
      console.error('重新导入单位失败:', error);
      showAlert('重新导入失败', error instanceof Error ? error.message : '重新导入单位数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim() || !unitForm.symbol.trim()) {
      showAlert('输入错误', '单位名称和符号不能为空', 'warning');
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
        precision: 0,
        description: '',
        isActive: true
      });
    } catch (error) {
      showAlert('保存失败', error instanceof Error ? error.message : '保存单位失败', 'error');
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      symbol: unit.symbol,
      type: unit.type,
      precision: unit.precision,
      description: unit.description || '',
      isActive: unit.isActive
    });
    setShowUnitForm(true);
  };

  const handleDeleteUnit = async (unitId: string): Promise<void> => {
    return new Promise((resolve) => {
      showConfirm('确定要删除这个单位吗？', async () => {
        try {
          await unitService.delete(unitId);
          await loadUnits();
          resolve();
        } catch (error) {
          showAlert('删除失败', error instanceof Error ? error.message : '删除单位失败', 'error');
          resolve();
        }
      });
    });
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
      showAlert('输入错误', '规则名称和单位不能为空', 'warning');
      return;
    }
    if (conversionForm.conversionRate <= 0) {
      showAlert('输入错误', '换算比率必须大于0', 'warning');
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
      showAlert('保存失败', error instanceof Error ? error.message : '保存换算规则失败', 'error');
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

  const handleDeleteConversion = async (ruleId: string): Promise<void> => {
    return new Promise((resolve) => {
      showConfirm('确定要删除这个换算规则吗？', async () => {
        try {
          await globalConversionService.delete(ruleId);
          await loadConversionRules();
          resolve();
        } catch (error) {
          showAlert('删除失败', error instanceof Error ? error.message : '删除换算规则失败', 'error');
          resolve();
        }
      });
    });
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
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'text-white bg-white/10 border-b-2 border-blue-400'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">🔔</span>
            通知配置
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
          onReimportUnits={handleReimportUnits}
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

      {activeTab === 'notifications' && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-white mb-6">通知配置</h3>

          <div className="space-y-8">
            {/* 通知总开关 */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-lg font-medium text-white">启用通知系统</h4>
                <p className="text-sm text-white/70 mt-1">控制是否显示系统通知消息</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.enabled}
                  onChange={(e) => handleNotificationChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 消息级别设置 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">消息级别设置</h4>

              {/* 快捷模式选择 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => handleImportantModeToggle(false)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !notificationSettings.showOnlyImportant
                      ? 'border-blue-400 bg-blue-400/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                  }`}
                >
                  <div className="text-center">
                    <span className="text-2xl block mb-2">📢</span>
                    <span className="font-medium">显示全部</span>
                    <p className="text-xs mt-1 opacity-80">显示所有类型的消息</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleImportantModeToggle(true)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    notificationSettings.showOnlyImportant
                      ? 'border-orange-400 bg-orange-400/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                  }`}
                >
                  <div className="text-center">
                    <span className="text-2xl block mb-2">⚠️</span>
                    <span className="font-medium">只显示重要</span>
                    <p className="text-xs mt-1 opacity-80">只显示警告和错误消息</p>
                  </div>
                </button>

                <div className={`p-4 rounded-lg border-2 ${
                  !notificationSettings.showOnlyImportant &&
                  (notificationSettings.enabledTypes.length !== ALL_MESSAGE_TYPES.length)
                    ? 'border-purple-400 bg-purple-400/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/70'
                }`}>
                  <div className="text-center">
                    <span className="text-2xl block mb-2">🎛️</span>
                    <span className="font-medium">自定义</span>
                    <p className="text-xs mt-1 opacity-80">自定义显示的消息类型</p>
                  </div>
                </div>
              </div>

              {/* 详细消息类型选择 */}
              {!notificationSettings.showOnlyImportant && (
                <div className="space-y-3">
                  <h5 className="text-md font-medium text-white/90">选择要显示的消息类型：</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ALL_MESSAGE_TYPES.map(type => {
                      const typeConfig = {
                        info: { icon: '💡', label: '信息', color: 'blue' },
                        success: { icon: '✅', label: '成功', color: 'green' },
                        warning: { icon: '⚠️', label: '警告', color: 'yellow' },
                        error: { icon: '❌', label: '错误', color: 'red' }
                      }[type];

                      const isEnabled = notificationSettings.enabledTypes.includes(type);

                      return (
                        <label key={type} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleMessageTypeToggle(type)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-lg">{typeConfig.icon}</span>
                          <span className={`text-sm ${isEnabled ? 'text-white' : 'text-white/60'}`}>
                            {typeConfig.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 其他设置 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">其他设置</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    最大显示数量
                  </label>
                  <GlassSelect
                    value={notificationSettings.maxDisplay.toString()}
                    onChange={(e) => handleNotificationChange('maxDisplay', parseInt(e.target.value))}
                  >
                    <option value="3">3条</option>
                    <option value="5">5条</option>
                    <option value="10">10条</option>
                  </GlassSelect>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white/80">声音提醒</label>
                    <p className="text-xs text-white/60 mt-1">新通知时播放提示音</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.enableSound}
                      onChange={(e) => handleNotificationChange('enableSound', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 当前配置预览 */}
            <div className="p-4 bg-white/5 rounded-lg">
              <h5 className="text-md font-medium text-white/90 mb-3">当前配置预览：</h5>
              <div className="text-sm text-white/70 space-y-1">
                <p>• 通知系统：{notificationSettings.enabled ? '已启用' : '已禁用'}</p>
                <p>• 显示模式：{notificationSettings.showOnlyImportant ? '只显示重要消息' : '自定义显示'}</p>
                <p>• 启用类型：{notificationSettings.showOnlyImportant
                  ? IMPORTANT_MESSAGE_TYPES.map(t => notificationHelper.getTypeDisplayText(t)).join('、')
                  : notificationSettings.enabledTypes.map(t => notificationHelper.getTypeDisplayText(t)).join('、')
                }</p>
                <p>• 最大显示：{notificationSettings.maxDisplay}条</p>
                <p>• 声音提醒：{notificationSettings.enableSound ? '已启用' : '已禁用'}</p>
              </div>
            </div>
          </div>
        </GlassCard>
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

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="确认操作"
        message="确定要执行此操作吗？"
        confirmText="确定"
        cancelText="取消"
        variant="warning"
        onConfirm={() => {
          confirmAction();
          setShowConfirmDialog(false);
        }}
        onCancel={() => setShowConfirmDialog(false)}
      />

      {/* 警告对话框 */}
      <AlertDialog
        isOpen={showAlertDialog}
        title={alertTitle}
        message={alertMessage}
        variant={alertVariant}
        onConfirm={() => setShowAlertDialog(false)}
      />
    </div>
  );
};

export default SystemSettings;
