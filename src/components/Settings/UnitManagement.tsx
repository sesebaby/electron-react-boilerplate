import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton } from '../ui/FormControls';
import { serviceManager } from '../../services/core';
import { Unit, UnitType } from '../../types/entities';
import UnitManagementTab from '../System/UnitManagementTab';
import ConfirmDialog from '../ui/ConfirmDialog';
import AlertDialog from '../ui/AlertDialog';

const UnitManagement: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
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
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const result = await unitService.findAll();
      const allUnits = result.success ?
        (Array.isArray(result.data) ? result.data : result.data?.items || []) : [];
      setUnits((Array.isArray(allUnits) ? allUnits : []) as Unit[]);
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

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">单位管理</h1>
        <p className="text-white/70">管理系统中的计量单位，为库存管理提供标准化的度量基础</p>
      </div>

      {/* 主要内容 */}
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

      {/* 使用说明 */}
      <GlassCard className="p-6">
        <h4 className="text-white font-medium mb-4">使用说明</h4>
        <ul className="text-white/70 text-sm space-y-2">
          <li>• 单位管理是库存系统的基础，请谨慎添加和修改单位</li>
          <li>• 建议根据实际业务需求合理设置单位精度，避免计算误差</li>
          <li>• 禁用的单位不会在业务流程中显示，但保留历史数据</li>
          <li>• 重新导入功能会恢复系统默认单位，请谨慎使用</li>
          <li>• 删除单位前，请确保没有库存数据正在使用该单位</li>
        </ul>
      </GlassCard>

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

export default UnitManagement;