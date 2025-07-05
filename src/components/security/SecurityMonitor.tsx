import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/secureLogger';
import { UserRole } from '../../types/entities';
import PermissionGate from './PermissionGate';
import { GlassCard, GlassButton, GlassSelect } from '../ui/FormControls';

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string | null;
  sessionId?: string | null;
}

interface SecurityMonitorProps {
  className?: string;
}

export const SecurityMonitor: React.FC<SecurityMonitorProps> = ({ className }) => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<LogEntry[]>([]);
  const [securityEvents, setSecurityEvents] = useState<LogEntry[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('24');
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Load audit logs and security events
  const loadLogs = () => {
    const hours = parseInt(selectedTimeRange);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const allLogs = logger.getAuditTrail(since);
    const secEvents = logger.getSecurityEvents(hours);
    
    setAuditLogs(allLogs);
    setSecurityEvents(secEvents);
  };

  // Filter logs by level
  const filteredLogs = useMemo(() => {
    if (selectedLogLevel === 'all') {
      return auditLogs;
    }
    return auditLogs.filter(log => log.level === selectedLogLevel);
  }, [auditLogs, selectedLogLevel]);

  // Auto-refresh logs
  useEffect(() => {
    loadLogs();
    
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [selectedTimeRange, autoRefresh]);

  const handleClearLogs = () => {
    if (window.confirm('确定要清空审计日志吗？此操作不可逆转。')) {
      logger.clearAuditTrail();
      logger.security('Audit logs cleared by admin', { adminId: user?.id });
      loadLogs();
    }
  };

  const getLogLevelColor = (level: string): string => {
    switch (level) {
      case 'error': return 'text-red-300 bg-red-500/20 border-red-400/30';
      case 'warn': return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      case 'info': return 'text-blue-300 bg-blue-500/20 border-blue-400/30';
      case 'debug': return 'text-gray-300 bg-gray-500/20 border-gray-400/30';
      default: return 'text-white/80 bg-white/10 border-white/20';
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  return (
    <PermissionGate role={UserRole.ADMIN} fallback={
      <GlassCard className="text-center">
        <div className="text-red-400 text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold text-white mb-2">访问被拒绝</h3>
        <p className="text-white/70">您没有权限访问安全监控面板</p>
      </GlassCard>
    }>
      <div className={`space-y-6 ${className || ''}`}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🛡️ 安全监控</h1>
            <p className="text-white/70">审计日志和安全事件监控</p>
          </div>
          
          <div className="flex gap-3">
            <GlassButton
              onClick={loadLogs}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <span>🔄</span>
              刷新
            </GlassButton>
            
            <GlassButton
              onClick={handleClearLogs}
              variant="danger"
              className="flex items-center gap-2"
            >
              <span>🗑️</span>
              清空日志
            </GlassButton>
          </div>
        </div>

        {/* Controls */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <GlassSelect
              label="时间范围"
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <option value="1">最近1小时</option>
              <option value="6">最近6小时</option>
              <option value="24">最近24小时</option>
              <option value="168">最近7天</option>
              <option value="720">最近30天</option>
            </GlassSelect>

            <GlassSelect
              label="日志级别"
              value={selectedLogLevel}
              onChange={(e) => setSelectedLogLevel(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="error">错误</option>
              <option value="warn">警告</option>
              <option value="info">信息</option>
              <option value="debug">调试</option>
            </GlassSelect>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoRefresh" className="text-white/80 text-sm">
                自动刷新 (30s)
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Security Events Summary */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">🚨 安全事件概览</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
              <div className="text-red-300 text-2xl font-bold">
                {securityEvents.filter(e => e.level === 'error').length}
              </div>
              <div className="text-red-200 text-sm">错误事件</div>
            </div>
            
            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
              <div className="text-yellow-300 text-2xl font-bold">
                {securityEvents.filter(e => e.level === 'warn').length}
              </div>
              <div className="text-yellow-200 text-sm">警告事件</div>
            </div>
            
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
              <div className="text-blue-300 text-2xl font-bold">
                {auditLogs.length}
              </div>
              <div className="text-blue-200 text-sm">审计记录</div>
            </div>
          </div>

          {/* Recent Security Events */}
          {securityEvents.length > 0 && (
            <div>
              <h4 className="text-white font-semibold mb-3">最近安全事件:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {securityEvents.slice(0, 10).map((event, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getLogLevelColor(event.level)}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{event.message}</span>
                      <span className="text-xs opacity-75">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    {event.data && (
                      <pre className="text-xs mt-2 opacity-75 overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Audit Logs */}
        <GlassCard>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">📋 审计日志</h3>
            <span className="text-white/60 text-sm">
              显示 {filteredLogs.length} 条记录
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-white mb-2">没有日志记录</h3>
                  <p className="text-white/70">当前时间范围内没有找到审计日志</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${getLogLevelColor(log.level)}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="font-medium">{log.message}</span>
                          </div>
                          
                          {log.userId && (
                            <div className="text-xs mt-1 opacity-75">
                              用户ID: {log.userId}
                              {log.sessionId && ` | 会话ID: ${log.sessionId.slice(0, 8)}...`}
                            </div>
                          )}
                          
                          {log.data && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer opacity-75 hover:opacity-100">
                                显示详细信息
                              </summary>
                              <pre className="text-xs mt-2 opacity-75 overflow-x-auto bg-black/20 rounded p-2">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        
                        <span className="text-xs opacity-75 ml-4 whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </PermissionGate>
  );
};

export default SecurityMonitor;