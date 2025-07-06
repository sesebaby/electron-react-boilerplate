import React, { useState, useEffect } from 'react';
import { GlassCard, GlassInput, GlassButton, GlassSelect } from '../ui/FormControls';

interface OperationLogsProps {
  className?: string;
}

interface LogSettings {
  enableAuditLog: boolean;
  logRetentionDays: number;
}

interface OperationLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
  ip: string;
  status: 'success' | 'warning' | 'error';
}

// 模拟日志数据
const generateMockLogs = (): OperationLog[] => {
  const users = ['系统管理员', '张三', '李四', '王五', '赵六'];
  const modules = ['用户管理', '商品管理', '库存管理', '订单管理', '系统设置'];
  const actions = ['登录', '新增', '修改', '删除', '查询', '导出', '导入'];
  const statuses: ('success' | 'warning' | 'error')[] = ['success', 'warning', 'error'];

  const logs: OperationLog[] = [];

  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const user = users[Math.floor(Math.random() * users.length)];
    const module = modules[Math.floor(Math.random() * modules.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    logs.push({
      id: `log_${i + 1}`,
      timestamp: timestamp.toISOString(),
      user,
      action,
      module,
      details: `${action}${module}操作`,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      status
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const OperationLogs: React.FC<OperationLogsProps> = ({ className }) => {
  const [logSettings, setLogSettings] = useState<LogSettings>({
    enableAuditLog: true,
    logRetentionDays: 90
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // 日志列表状态
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<OperationLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // 计算分页
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  useEffect(() => {
    loadLogSettings();
    initializeLogs();
  }, []);

  // 筛选日志
  useEffect(() => {
    let filtered = logs;

    // 按搜索词筛选
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 按模块筛选
    if (selectedModule) {
      filtered = filtered.filter(log => log.module === selectedModule);
    }

    // 按状态筛选
    if (selectedStatus) {
      filtered = filtered.filter(log => log.status === selectedStatus);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // 重置到第一页
  }, [logs, searchTerm, selectedModule, selectedStatus]);

  const loadLogSettings = async () => {
    try {
      const savedSettings = localStorage.getItem('operationLogs.settings');
      if (savedSettings) {
        setLogSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('加载日志设置失败:', error);
    }
  };

  const initializeLogs = () => {
    const mockLogs = generateMockLogs();
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  };

  const saveLogSettings = async () => {
    setLoading(true);
    try {
      localStorage.setItem('operationLogs.settings', JSON.stringify(logSettings));
      setHasChanges(false);
      alert('日志设置保存成功！');
    } catch (error) {
      console.error('保存日志设置失败:', error);
      alert('保存日志设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLogSettingChange = (field: keyof LogSettings, value: any) => {
    setLogSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              操作日志
            </h1>
            <p className="mt-1 text-white/80">
              查看系统操作记录和审计日志
            </p>
          </div>
          <div className="flex gap-3">
            <GlassButton
              onClick={saveLogSettings}
              variant="primary"
              disabled={loading || !hasChanges}
            >
              <span className="mr-2">💾</span>
              {loading ? '保存中...' : '保存设置'}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* 日志管理配置 */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-semibold text-white mb-6">日志管理配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              日志保留天数
            </label>
            <GlassInput
              type="number"
              value={logSettings.logRetentionDays}
              onChange={(e) => handleLogSettingChange('logRetentionDays', parseInt(e.target.value) || 90)}
              placeholder="90"
              min="7"
              max="365"
            />
            <p className="text-xs text-white/60 mt-1">超过此天数的日志将被自动清理</p>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-lg font-medium text-white mb-4">日志功能</h4>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={logSettings.enableAuditLog}
                  onChange={(e) => handleLogSettingChange('enableAuditLog', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                />
                <span className="text-white/90">启用审计日志</span>
                <span className="text-xs text-white/60">记录所有用户操作和系统事件</span>
              </label>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 日志列表区域 */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h3 className="text-xl font-semibold text-white">操作日志列表</h3>
            <span className="text-sm text-white/60">({filteredLogs.length} 条记录)</span>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <GlassInput
              type="text"
              placeholder="搜索用户、操作、模块或详情..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <GlassSelect
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="">所有模块</option>
              <option value="用户管理">用户管理</option>
              <option value="商品管理">商品管理</option>
              <option value="库存管理">库存管理</option>
              <option value="订单管理">订单管理</option>
              <option value="系统设置">系统设置</option>
            </GlassSelect>
          </div>
          <div>
            <GlassSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">所有状态</option>
              <option value="success">成功</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
            </GlassSelect>
          </div>
        </div>

        {/* 日志表格 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4 text-white/80 font-medium">时间</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">用户</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">操作</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">模块</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">详情</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">IP地址</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.map((log) => (
                <tr key={log.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white/90 text-sm">
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td className="py-3 px-4 text-white/90">{log.user}</td>
                  <td className="py-3 px-4 text-white/90">{log.action}</td>
                  <td className="py-3 px-4 text-white/90">{log.module}</td>
                  <td className="py-3 px-4 text-white/80 text-sm">{log.details}</td>
                  <td className="py-3 px-4 text-white/70 text-sm">{log.ip}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success' ? 'bg-green-500/20 text-green-400' :
                      log.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {log.status === 'success' ? '成功' :
                       log.status === 'warning' ? '警告' : '错误'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-white/60">
              显示 {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} 条，共 {filteredLogs.length} 条记录
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <span className="px-3 py-1 text-white/80">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* 保存提示 */}
      {hasChanges && (
        <GlassCard className="p-4 border-l-4 border-yellow-400">
          <div className="flex items-center">
            <span className="text-yellow-400 mr-2">⚠️</span>
            <span className="text-white/90">您有未保存的日志设置更改，请记得保存。</span>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default OperationLogs;
