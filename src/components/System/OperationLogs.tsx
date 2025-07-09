import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard, GlassInput, GlassButton, GlassSelect } from '../ui/FormControls';
import AlertDialog from '../ui/AlertDialog';
import { logger, LogLevel, LogEntry } from '../../utils/logger';
import { globalErrorHandler } from '../../utils/globalErrorHandler';
import { userActionLogger, UserActionType, ActionContext } from '../../utils/userActionLogger';
import { 
  Table, 
  TableContainer,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty as _TableEmpty,
  TableLoading
} from '../ui/table';

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
  level: string;
  message: string;
  source: string;
  user: string;
  action: string;
  module: string;
  details: string;
  data?: any;
  status: 'success' | 'warning' | 'error';
  duration?: number;
}

interface LogStatistics {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsBySource: Record<string, number>;
  recentErrorCount: number;
  averageLogsPerHour: number;
}

// 转换日志条目为操作日志格式
const _convertLogEntryToOperationLog = (entry: LogEntry, index: number): OperationLog => {
  const _levelName = LogLevel[entry.level];
  
  // 从消息中提取操作信息
  const _parseMessage = (message: string) => {
    // 尝试从消息中提取操作和模块信息
    if (message.includes('User Action:')) {
      const _actionMatch = message.match(/User Action: (\w+) - (.+)/);
      if (actionMatch) {
        return {
          action: actionMatch[1],
          details: actionMatch[2]
        };
      }
    }
    
    if (message.includes('API Request')) {
      return {
        action: message.includes('Success') ? 'API调用成功' : 'API调用',
        details: message
      };
    }
    
    if (message.includes('Error')) {
      return {
        action: '错误',
        details: message
      };
    }
    
    return {
      action: '系统日志',
      details: message
    };
  };
  
  const _parseSource = (source?: string) => {
    if (!source) return '系统';
    
    const sourceMap: Record<string, string> = {
      'ApiClient': 'API接口',
      'UserAction': '用户操作',
      'ErrorBoundary': '错误处理',
      'GlobalErrorHandler': '全局错误',
      'FileLoggerService': '文件日志',
      'ProductManagement': '商品管理',
      'InventoryService': '库存服务'
    };
    
    return sourceMap[source] || source;
  };
  
  const _getStatus = (level: LogLevel): 'success' | 'warning' | 'error' => {
    switch (level) {
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.WARN:
        return 'warning';
      default:
        return 'success';
    }
  };
  
  const _getUserFromData = (data: any): string => {
    if (data?.userId) return data.userId;
    if (data?.user) return data.user;
    return '系统';
  };
  
  const _parsed = parseMessage(entry.message);
  
  return {
    id: `log_${entry.timestamp.getTime()}_${index}`,
    timestamp: entry.timestamp.toISOString(),
    level: levelName,
    message: entry.message,
    source: entry.source || '系统',
    user: getUserFromData(entry.data),
    action: parsed.action,
    module: parseSource(entry.source),
    details: parsed.details,
    data: entry.data,
    status: getStatus(entry.level),
    duration: entry.data?.duration
  };
};

// 获取真实日志数据
const _getRealLogData = (): OperationLog[] => {
  try {
    // 从日志系统获取日志
    const _logEntries = logger.getLogs();
    
    // 转换为操作日志格式
    const _operationLogs = logEntries.map(convertLogEntryToOperationLog);
    
    // 按时间排序（最新的在前）
    return operationLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('Failed to get real log data:', error);
    return [];
  }
};

// 获取日志统计信息
const _getLogStatistics = (): LogStatistics => {
  try {
    const _stats = logger.getStats();
    const _errorStats = globalErrorHandler.getErrorStats();
    const _actionStats = userActionLogger.getActionStats();
    
    // 计算每小时平均日志数
    const _now = Date.now();
    const _oneHourAgo = now - 60 * 60 * 1000;
    const _recentLogs = logger.getLogs().filter(log => 
      log.timestamp.getTime() > oneHourAgo
    );
    
    // 统计来源分布
    const logsBySource: Record<string, number> = {};
    logger.getLogs().forEach(log => {
      const _source = log.source || '未知';
      logsBySource[source] = (logsBySource[source] || 0) + 1;
    });
    
    return {
      totalLogs: stats.totalLogs,
      logsByLevel: stats.logsByLevel,
      logsBySource,
      recentErrorCount: errorStats.errorsByType.javascript || 0,
      averageLogsPerHour: recentLogs.length
    };
  } catch (error) {
    console.error('Failed to get log statistics:', error);
    return {
      totalLogs: 0,
      logsByLevel: {},
      logsBySource: {},
      recentErrorCount: 0,
      averageLogsPerHour: 0
    };
  }
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
  const [selectedLevel, setSelectedLevel] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // 新增状态
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  // 弹出框状态
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertVariant, setAlertVariant] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // 弹出框辅助函数
  const _showAlert = (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlertDialog(true);
  };

  // 计算分页
  const _totalPages = Math.ceil(filteredLogs.length / pageSize);
  const _startIndex = (currentPage - 1) * pageSize;
  const _endIndex = startIndex + pageSize;
  const _currentLogs = filteredLogs.slice(startIndex, endIndex);

  // 加载日志数据
  const _loadLogData = useCallback(() => {
    try {
      const _realLogs = getRealLogData();
      const _stats = getLogStatistics();
      
      setLogs(realLogs);
      setStatistics(stats);
      setLastRefresh(new Date());
      
      // 记录页面访问
      userActionLogger.logAction({
        type: UserActionType.PAGE_VIEW,
        context: ActionContext.SYSTEM,
        description: 'Viewed operation logs page',
        details: {
          totalLogs: stats.totalLogs,
          logLevels: Object.keys(stats.logsByLevel)
        }
      });
    } catch (error) {
      console.error('Failed to load log data:', error);
      showAlert('加载失败', '无法加载日志数据，请稍后重试', 'error');
    }
  }, []);

  // 自动刷新控制
  const _toggleAutoRefresh = useCallback(() => {
    if (autoRefresh) {
      // 停止自动刷新
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setAutoRefresh(false);
      
      userActionLogger.logAction({
        type: UserActionType.SETTINGS_CHANGE,
        context: ActionContext.SYSTEM,
        description: 'Disabled auto refresh for logs'
      });
    } else {
      // 启动自动刷新
      const _interval = setInterval(() => {
        loadLogData();
      }, 10000); // 每10秒刷新一次
      
      setRefreshInterval(interval);
      setAutoRefresh(true);
      
      userActionLogger.logAction({
        type: UserActionType.SETTINGS_CHANGE,
        context: ActionContext.SYSTEM,
        description: 'Enabled auto refresh for logs'
      });
    }
  }, [autoRefresh, refreshInterval, loadLogData]);

  useEffect(() => {
    loadLogSettings();
    loadLogData();
    
    return () => {
      // 清理定时器
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [loadLogData]);

  // 筛选日志
  useEffect(() => {
    const _filtered = logs;

    // 按搜索词筛选
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
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

    // 按日志级别筛选
    if (selectedLevel) {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // 重置到第一页
  }, [logs, searchTerm, selectedModule, selectedStatus, selectedLevel]);

  const _loadLogSettings = async () => {
    try {
      const _savedSettings = localStorage.getItem('operationLogs.settings');
      if (savedSettings) {
        setLogSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('加载日志设置失败:', error);
    }
  };

  // 导出日志功能
  const _exportLogs = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    setIsExporting(true);
    
    try {
      const _exportData = filteredLogs.map(log => ({
        时间: new Date(log.timestamp).toLocaleString('zh-CN'),
        级别: log.level,
        用户: log.user,
        操作: log.action,
        模块: log.module,
        详情: log.details,
        状态: log.status === 'success' ? '成功' : log.status === 'warning' ? '警告' : '错误',
        耗时: log.duration ? `${log.duration}ms` : ''
      }));

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        // 生成CSV内容
        const _headers = Object.keys(exportData[0] || {});
        const _csvContent = [
          headers.join(','),
          ...exportData.map(row => 
            headers.map(header => 
              `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`
            ).join(',')
          )
        ].join('\n');
        
        content = '\uFEFF' + csvContent; // 添加BOM以支持中文
        filename = `operation_logs_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv;charset=utf-8';
      } else {
        // 生成JSON内容
        content = JSON.stringify(exportData, null, 2);
        filename = `operation_logs_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      // 创建下载链接
      const _blob = new Blob([content], { type: mimeType });
      const _url = URL.createObjectURL(blob);
      const _link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 记录导出操作
      userActionLogger.logAction({
        type: UserActionType.EXPORT,
        context: ActionContext.SYSTEM,
        description: `Exported ${filteredLogs.length} logs as ${format.toUpperCase()}`,
        details: {
          format,
          recordCount: filteredLogs.length,
          filename
        }
      });

      showAlert('导出成功', `成功导出 ${filteredLogs.length} 条日志记录`, 'success');
      
    } catch (error) {
      console.error('Export failed:', error);
      showAlert('导出失败', '导出日志失败，请稍后重试', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [filteredLogs]);

  // 清理日志功能
  const _clearLogs = useCallback(() => {
    try {
      logger.clearLogs();
      loadLogData();
      
      userActionLogger.logAction({
        type: UserActionType.DELETE,
        context: ActionContext.SYSTEM,
        description: 'Cleared all logs',
      });
      
      showAlert('清理成功', '已清理所有日志记录', 'success');
    } catch (error) {
      console.error('Clear logs failed:', error);
      showAlert('清理失败', '清理日志失败，请稍后重试', 'error');
    }
  }, [loadLogData]);

  const _saveLogSettings = async () => {
    setLoading(true);
    try {
      localStorage.setItem('operationLogs.settings', JSON.stringify(logSettings));
      setHasChanges(false);
      showAlert('保存成功', '日志设置保存成功！', 'success');
    } catch (error) {
      console.error('保存日志设置失败:', error);
      showAlert('保存失败', '保存日志设置失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const _handleLogSettingChange = (field: keyof LogSettings, value: any) => {
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

        {/* 统计信息面板 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
              <div className="text-blue-300 text-sm">总日志数</div>
              <div className="text-white text-2xl font-bold">{statistics.totalLogs}</div>
            </div>
            <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
              <div className="text-green-300 text-sm">错误数量</div>
              <div className="text-white text-2xl font-bold">{statistics.recentErrorCount}</div>
            </div>
            <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-4">
              <div className="text-purple-300 text-sm">每小时平均</div>
              <div className="text-white text-2xl font-bold">{statistics.averageLogsPerHour}</div>
            </div>
            <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-4">
              <div className="text-orange-300 text-sm">最后刷新</div>
              <div className="text-white text-sm">{lastRefresh.toLocaleTimeString('zh-CN')}</div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <GlassButton
            onClick={loadLogData}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <span>🔄</span>
            刷新日志
          </GlassButton>
          
          <GlassButton
            onClick={toggleAutoRefresh}
            variant={autoRefresh ? "primary" : "secondary"}
            className="flex items-center gap-2"
          >
            <span>{autoRefresh ? "⏸️" : "▶️"}</span>
            {autoRefresh ? "停止自动刷新" : "开启自动刷新"}
          </GlassButton>
          
          <GlassButton
            onClick={() => exportLogs('csv')}
            disabled={isExporting || filteredLogs.length === 0}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <span>📁</span>
            {isExporting ? "导出中..." : "导出CSV"}
          </GlassButton>
          
          <GlassButton
            onClick={() => exportLogs('json')}
            disabled={isExporting || filteredLogs.length === 0}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <span>📄</span>
            导出JSON
          </GlassButton>
          
          <GlassButton
            onClick={clearLogs}
            variant="danger"
            className="flex items-center gap-2 ml-auto"
          >
            <span>🗑️</span>
            清理日志
          </GlassButton>
        </div>

        {/* 搜索和筛选 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              {statistics && Object.keys(statistics.logsBySource).map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </GlassSelect>
          </div>
          <div>
            <GlassSelect
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="">所有级别</option>
              <option value="INFO">信息</option>
              <option value="WARN">警告</option>
              <option value="ERROR">错误</option>
              <option value="DEBUG">调试</option>
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
        <TableContainer height="500px">
          <Table stickyHeader minWidth="1200px">
            <TableHeader sticky>
              <TableRow>
                <TableHead className="min-w-[150px] text-left">时间</TableHead>
                <TableHead className="min-w-[80px] text-left">级别</TableHead>
                <TableHead className="min-w-[100px] text-left">用户</TableHead>
                <TableHead className="min-w-[120px] text-left">操作</TableHead>
                <TableHead className="min-w-[100px] text-left">模块</TableHead>
                <TableHead className="min-w-[300px] text-left">详情</TableHead>
                <TableHead className="min-w-[100px] text-left">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="min-w-[150px] text-white/90 text-sm">
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="min-w-[80px]">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                      log.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' :
                      log.level === 'INFO' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {log.level}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[100px] text-white/90">{log.user}</TableCell>
                  <TableCell className="min-w-[120px] text-white/90">{log.action}</TableCell>
                  <TableCell className="min-w-[100px] text-white/90">{log.module}</TableCell>
                  <TableCell className="min-w-[300px] text-white/80 text-sm" title={log.details}>
                    {log.details.length > 50 ? `${log.details.substring(0, 50)}...` : log.details}
                  </TableCell>
                  <TableCell className="min-w-[100px]">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success' ? 'bg-green-500/20 text-green-400' :
                      log.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {log.status === 'success' ? '成功' :
                       log.status === 'warning' ? '警告' : '错误'}
                    </span>
                    {log.duration && (
                      <div className="text-xs text-white/60 mt-1">{log.duration}ms</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

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

export default OperationLogs;
