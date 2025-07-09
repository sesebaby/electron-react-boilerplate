import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton } from '../ui/FormControls';
import { LoadingProgress } from '../ui/SkeletonLoader';
import { useDialog } from '../../hooks/useDialog';
import systemInitializationService, { 
  InitializationProgress, 
  InitializationOptions 
} from '../../services/systemInitializationService';
import backupService, { BackupInfo } from '../../services/database/backupService';

interface SystemStatus {
  databaseSize: number;
  tableCount: number;
  recordCount: number;
  lastBackup?: Date;
  version: string;
}

export const SystemInitialization: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState<InitializationProgress | null>(null);
  const [initOptions, setInitOptions] = useState<InitializationOptions>({
    createBackup: true,
    backupDescription: '',
    preserveUsers: true,
    preserveSettings: true,
    importMockData: true
  });

  const { showConfirm, showAlert, showSuccess, showError } = useDialog();

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      setIsLoading(true);
      const [status, backups] = await Promise.all([
        systemInitializationService.getSystemStatus(),
        backupService.getBackupList()
      ]);
      setSystemStatus(status);
      setBackupList(backups);
    } catch (error) {
      console.error('加载系统信息失败:', error);
      showError('加载系统信息失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeSystem = () => {
    showConfirm(
      '系统初始化确认',
      `⚠️ 警告：此操作将执行以下步骤：

${initOptions.createBackup ? '✓ 创建当前数据库备份\n' : ''}✓ 清空现有业务数据
✓ 重建数据库结构
${initOptions.importMockData ? '✓ 导入默认示例数据\n' : ''}${initOptions.preserveUsers ? '✓ 保留用户账户信息\n' : ''}${initOptions.preserveSettings ? '✓ 保留系统设置\n' : ''}
此操作不可逆转，请确认您已了解操作后果！`,
      () => executeInitialization(),
      undefined,
      'danger',
      '确认初始化',
      '取消'
    );
  };

  const executeInitialization = async () => {
    try {
      setIsInitializing(true);
      setInitProgress(null);

      await systemInitializationService.initializeSystem(
        {
          ...initOptions,
          backupDescription: initOptions.backupDescription || 
            `系统初始化前自动备份 - ${new Date().toLocaleString()}`
        },
        (progress) => {
          setInitProgress(progress);
        }
      );

      showSuccess('系统初始化完成！页面将在3秒后刷新...');
      
      // 3秒后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('系统初始化失败:', error);
      showError(`系统初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsInitializing(false);
      setInitProgress(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <GlassCard className="p-8">
        <LoadingProgress message="正在加载系统信息..." />
      </GlassCard>
    );
  }

  if (isInitializing && initProgress) {
    return (
      <GlassCard className="p-8">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-6">系统初始化进行中</h3>
          <LoadingProgress 
            progress={initProgress.progress}
            message={initProgress.message}
          />
          
          {initProgress.stage === 'error' && initProgress.error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 font-medium">错误信息：</p>
              <p className="text-red-100 text-sm mt-1">{initProgress.error}</p>
            </div>
          )}

          {initProgress.backupInfo && (
            <div className="mt-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-200 font-medium">备份已创建：</p>
              <p className="text-green-100 text-sm mt-1">
                {initProgress.backupInfo.filename} ({formatFileSize(initProgress.backupInfo.size)})
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统状态信息 */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">系统状态</h3>
        {systemStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{systemStatus.tableCount}</div>
              <div className="text-white/70 text-sm">数据表</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{systemStatus.recordCount.toLocaleString()}</div>
              <div className="text-white/70 text-sm">数据记录</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{formatFileSize(systemStatus.databaseSize)}</div>
              <div className="text-white/70 text-sm">数据库大小</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{backupList.length}</div>
              <div className="text-white/70 text-sm">备份文件</div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* 初始化选项 */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">初始化选项</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="createBackup"
              checked={initOptions.createBackup}
              onChange={(e) => setInitOptions(prev => ({ ...prev, createBackup: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
            />
            <label htmlFor="createBackup" className="text-white">
              执行初始化前创建数据库备份
            </label>
          </div>

          {initOptions.createBackup && (
            <div className="ml-7">
              <input
                type="text"
                placeholder="备份描述（可选）"
                value={initOptions.backupDescription}
                onChange={(e) => setInitOptions(prev => ({ ...prev, backupDescription: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="preserveUsers"
              checked={initOptions.preserveUsers}
              onChange={(e) => setInitOptions(prev => ({ ...prev, preserveUsers: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
            />
            <label htmlFor="preserveUsers" className="text-white">
              保留用户账户信息
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="preserveSettings"
              checked={initOptions.preserveSettings}
              onChange={(e) => setInitOptions(prev => ({ ...prev, preserveSettings: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
            />
            <label htmlFor="preserveSettings" className="text-white">
              保留系统基础设置
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="importMockData"
              checked={initOptions.importMockData}
              onChange={(e) => setInitOptions(prev => ({ ...prev, importMockData: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
            />
            <label htmlFor="importMockData" className="text-white">
              导入默认示例数据
            </label>
          </div>
        </div>
      </GlassCard>

      {/* 操作按钮 */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <GlassButton
            onClick={handleInitializeSystem}
            disabled={isInitializing}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50"
          >
            🔄 执行系统初始化
          </GlassButton>
          
          <GlassButton
            onClick={loadSystemInfo}
            disabled={isInitializing}
            className="flex-1 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
          >
            🔄 刷新状态
          </GlassButton>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-200 text-sm">
            ⚠️ <strong>重要提醒：</strong>系统初始化将清空所有业务数据，请确保已做好数据备份。
            建议在系统维护时间执行此操作。
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default SystemInitialization;
