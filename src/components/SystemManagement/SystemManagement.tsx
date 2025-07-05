import React, { useState, useEffect } from 'react';
import { systemTester, TestResult, SystemTestReport } from '../../utils/systemTest';
import { systemOptimizer, OptimizationResult, SystemOptimizationReport } from '../../utils/systemOptimization';
import { systemHealthMonitor, HealthCheckResult, SystemHealthReport } from '../../utils/systemHealth';
import { GlassButton, GlassCard } from '../ui/FormControls';

interface SystemManagementProps {
  className?: string;
}

type ActiveTab = 'overview' | 'testing' | 'optimization' | 'monitoring';

export const SystemManagement: React.FC<SystemManagementProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 报告状态
  const [testReport, setTestReport] = useState<SystemTestReport | null>(null);
  const [optimizationReport, setOptimizationReport] = useState<SystemOptimizationReport | null>(null);
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  
  // 自动监控状态
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    // 初始加载概览数据
    if (activeTab === 'overview') {
      loadOverviewData();
    }
  }, [activeTab]);

  const loadOverviewData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 快速健康检查
      const health = await systemHealthMonitor.performHealthCheck();
      setHealthReport(health);
    } catch (err) {
      setError('加载系统概览失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runSystemTests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 开始运行系统集成测试...');
      const report = await systemTester.runAllTests();
      setTestReport(report);
    } catch (err) {
      setError('系统测试失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔧 开始系统优化分析...');
      const report = await systemOptimizer.analyzeAndOptimize();
      setOptimizationReport(report);
    } catch (err) {
      setError('系统优化失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🏥 开始系统健康检查...');
      const report = await systemHealthMonitor.performHealthCheck();
      setHealthReport(report);
    } catch (err) {
      setError('健康检查失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleContinuousMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      console.log('🔴 停止持续监控');
    } else {
      setIsMonitoring(true);
      systemHealthMonitor.startContinuousMonitoring(5); // 5分钟间隔
      console.log('🟢 开始持续监控');
    }
  };

  const getOverallSystemStatus = () => {
    if (!healthReport) return { status: 'unknown', message: '等待检查', color: 'text-gray-600' };
    
    const { overallStatus, healthScore } = healthReport;
    
    if (overallStatus === 'healthy') {
      return { 
        status: 'healthy', 
        message: `系统运行良好 (${healthScore}/100)`,
        color: 'text-green-600'
      };
    } else if (overallStatus === 'warning') {
      return { 
        status: 'warning', 
        message: `系统存在警告 (${healthScore}/100)`,
        color: 'text-yellow-600'
      };
    } else {
      return { 
        status: 'critical', 
        message: `系统存在严重问题 (${healthScore}/100)`,
        color: 'text-red-600'
      };
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const systemStatus = getOverallSystemStatus();

  const tabs = [
    { id: 'overview' as ActiveTab, label: '系统概览', icon: '📊', description: '整体状态概览' },
    { id: 'testing' as ActiveTab, label: '集成测试', icon: '🧪', description: '系统功能测试' },
    { id: 'optimization' as ActiveTab, label: '系统优化', icon: '🔧', description: '性能优化分析' },
    { id: 'monitoring' as ActiveTab, label: '健康监控', icon: '🏥', description: '实时健康监控' }
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className || ''}`}>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              系统管理
            </h1>
            <p className="text-gray-600 mt-1">系统测试、优化分析和健康监控</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-2 bg-white/70 rounded-xl border border-white/20 ${systemStatus.color}`}>
              <div className={`w-2 h-2 rounded-full ${
                systemStatus.status === 'healthy' ? 'bg-green-500' :
                systemStatus.status === 'warning' ? 'bg-yellow-500' :
                systemStatus.status === 'critical' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium">{systemStatus.message}</span>
            </div>
          </div>
        </div>

        {/* 错误消息 */}
        {error && (
          <GlassCard className="border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-600">
                <span>❌</span>
                <span>{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
          </GlassCard>
        )}

        {/* 标签导航 */}
        <GlassCard className="p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`
                  flex-1 min-w-0 px-4 py-3 rounded-xl transition-all duration-300 flex flex-col items-center text-center
                  ${activeTab === tab.id 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
                  }
                `}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-xl mb-1">{tab.icon}</span>
                <span className="font-medium text-sm">{tab.label}</span>
                <span className={`text-xs mt-1 ${activeTab === tab.id ? 'text-white/80' : 'text-gray-500'}`}>
                  {tab.description}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* 加载状态 */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <GlassCard className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在执行系统操作，请稍候...</p>
            </GlassCard>
          </div>
        )}

        {/* 标签页内容 */}
        <div className="space-y-6">
          {/* 系统概览 */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 系统测试卡片 */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="mr-2 text-xl">🧪</span>
                    系统测试
                  </h3>
                  <GlassButton 
                    onClick={runSystemTests}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                  >
                    运行测试
                  </GlassButton>
                </div>
                
                {testReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">测试总数</span>
                      <span className="font-semibold">{testReport.totalTests}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">通过测试</span>
                      <span className="font-semibold text-green-600">{testReport.passedTests}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">失败测试</span>
                      <span className="font-semibold text-red-600">{testReport.failedTests}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">耗时</span>
                      <span className="font-semibold">{formatDuration(testReport.totalDuration)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无测试数据，点击"运行测试"开始</p>
                )}
              </GlassCard>

              {/* 系统优化卡片 */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="mr-2 text-xl">🔧</span>
                    系统优化
                  </h3>
                  <GlassButton 
                    onClick={runOptimization}
                    className="bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-green-600 hover:to-blue-700"
                  >
                    分析优化
                  </GlassButton>
                </div>
                
                {optimizationReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">性能得分</span>
                      <span className={`font-semibold ${optimizationReport.performanceScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {optimizationReport.performanceScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">优化项</span>
                      <span className="font-semibold">{optimizationReport.totalOptimizations}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">已实施</span>
                      <span className="font-semibold text-green-600">{optimizationReport.implementedOptimizations}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">待实施</span>
                      <span className="font-semibold">{optimizationReport.totalOptimizations - optimizationReport.implementedOptimizations}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无优化数据，点击"分析优化"开始</p>
                )}
              </GlassCard>

              {/* 健康监控卡片 */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="mr-2 text-xl">🏥</span>
                    健康监控
                  </h3>
                  <div className="flex gap-2">
                    <GlassButton 
                      onClick={runHealthCheck}
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      立即检查
                    </GlassButton>
                    <GlassButton 
                      onClick={toggleContinuousMonitoring}
                      className={`${isMonitoring 
                        ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700' 
                        : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
                      }`}
                    >
                      {isMonitoring ? '停止监控' : '开始监控'}
                    </GlassButton>
                  </div>
                </div>
                
                {healthReport ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">健康得分</span>
                      <span className={`font-semibold ${
                        healthReport.healthScore >= 80 ? 'text-green-600' : 
                        healthReport.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {healthReport.healthScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">正常组件</span>
                      <span className="font-semibold text-green-600">{healthReport.summary.healthy}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">警告组件</span>
                      <span className="font-semibold text-yellow-600">{healthReport.summary.warnings}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">严重问题</span>
                      <span className="font-semibold text-red-600">{healthReport.summary.critical}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无健康数据，点击"立即检查"开始</p>
                )}
              </GlassCard>
            </div>
          )}

          {/* 系统测试 */}
          {activeTab === 'testing' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">系统集成测试</h3>
                <GlassButton 
                  onClick={runSystemTests}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                >
                  <span className="mr-2">🧪</span>
                  运行完整测试
                </GlassButton>
              </div>

              {testReport && (
                <div className="space-y-6">
                  {/* 测试概览 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">✅</div>
                      <div className="text-2xl font-bold text-green-600">{testReport.passedTests}</div>
                      <div className="text-sm text-gray-600">通过测试</div>
                    </GlassCard>
                    
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">❌</div>
                      <div className="text-2xl font-bold text-red-600">{testReport.failedTests}</div>
                      <div className="text-sm text-gray-600">失败测试</div>
                    </GlassCard>
                    
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">⏱️</div>
                      <div className="text-2xl font-bold text-blue-600">{formatDuration(testReport.totalDuration)}</div>
                      <div className="text-sm text-gray-600">总耗时</div>
                    </GlassCard>
                  </div>

                  {/* 测试详情 */}
                  <GlassCard>
                    <div className="p-4 border-b border-white/20">
                      <h4 className="text-lg font-semibold text-gray-800">测试详情</h4>
                    </div>
                    <div className="p-6 space-y-4">
                      {testReport.results.map((result, index) => (
                        <div key={index} className={`p-4 rounded-xl border ${
                          result.success 
                            ? 'bg-green-50/50 border-green-200 text-green-800' 
                            : 'bg-red-50/50 border-red-200 text-red-800'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">
                                {result.success ? '✅' : '❌'}
                              </span>
                              <span className="font-medium">{result.testName}</span>
                            </div>
                            <span className="text-sm">{formatDuration(result.duration)}</span>
                          </div>
                          {result.error && (
                            <div className="text-sm mt-2 p-3 bg-white/50 rounded-lg">
                              <strong>错误: </strong>{result.error}
                            </div>
                          )}
                          {result.details && (
                            <div className="text-xs mt-2 p-3 bg-white/50 rounded-lg font-mono">
                              <pre className="overflow-x-auto">{JSON.stringify(result.details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}
            </div>
          )}

          {/* 系统优化 */}
          {activeTab === 'optimization' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">系统优化分析</h3>
                <GlassButton 
                  onClick={runOptimization}
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-green-600 hover:to-blue-700"
                >
                  <span className="mr-2">🔧</span>
                  重新分析
                </GlassButton>
              </div>

              {optimizationReport && (
                <div className="space-y-6">
                  {/* 性能概览 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">📊</div>
                      <div className={`text-2xl font-bold ${optimizationReport.performanceScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {optimizationReport.performanceScore}
                      </div>
                      <div className="text-sm text-gray-600">性能得分</div>
                    </GlassCard>
                    
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">🔧</div>
                      <div className="text-2xl font-bold text-blue-600">{optimizationReport.totalOptimizations}</div>
                      <div className="text-sm text-gray-600">总优化项</div>
                    </GlassCard>
                    
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">✅</div>
                      <div className="text-2xl font-bold text-green-600">{optimizationReport.implementedOptimizations}</div>
                      <div className="text-sm text-gray-600">已实施</div>
                    </GlassCard>
                    
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">📋</div>
                      <div className="text-2xl font-bold text-orange-600">{optimizationReport.totalOptimizations - optimizationReport.implementedOptimizations}</div>
                      <div className="text-sm text-gray-600">待实施</div>
                    </GlassCard>
                  </div>

                  {/* 优化分类 */}
                  <div className="space-y-6">
                    {Object.entries(
                      optimizationReport.recommendations.reduce((acc, opt) => {
                        if (!acc[opt.category]) acc[opt.category] = [];
                        acc[opt.category].push(opt);
                        return acc;
                      }, {} as Record<string, OptimizationResult[]>)
                    ).map(([category, optimizations]) => (
                      <GlassCard key={category}>
                        <div className="p-4 border-b border-white/20">
                          <h4 className="text-lg font-semibold text-gray-800">{category}</h4>
                        </div>
                        <div className="p-6 space-y-4">
                          {optimizations.map((opt, index) => (
                            <div key={index} className={`p-4 rounded-xl border ${
                              opt.implemented 
                                ? 'bg-green-50/50 border-green-200' 
                                : 'bg-yellow-50/50 border-yellow-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">
                                    {opt.implemented ? '✅' : '📋'}
                                  </span>
                                  <span className="font-medium text-gray-900">{opt.optimization}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  opt.impact === 'high' ? 'bg-red-100 text-red-600' :
                                  opt.impact === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                  'bg-green-100 text-green-600'
                                }`}>
                                  {opt.impact === 'high' ? '🔴' : opt.impact === 'medium' ? '🟡' : '🟢'} {opt.impact}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 bg-white/50 p-3 rounded-lg">
                                {opt.details}
                              </div>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 健康监控 */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">系统健康监控</h3>
                <div className="flex gap-3">
                  <GlassButton 
                    onClick={runHealthCheck}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <span className="mr-2">🔄</span>
                    立即检查
                  </GlassButton>
                  <GlassButton 
                    onClick={toggleContinuousMonitoring}
                    className={`${isMonitoring 
                      ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700' 
                      : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
                    }`}
                  >
                    <span className="mr-2">{isMonitoring ? '⏹️' : '▶️'}</span>
                    {isMonitoring ? '停止监控' : '开始监控'}
                  </GlassButton>
                </div>
              </div>

              {healthReport && (
                <div className="space-y-6">
                  {/* 健康概览 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">💚</div>
                      <div className={`text-2xl font-bold ${
                        healthReport.healthScore >= 80 ? 'text-green-600' : 
                        healthReport.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {healthReport.healthScore}
                      </div>
                      <div className="text-sm text-gray-600">健康得分</div>
                    </GlassCard>
                    
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">✅</div>
                      <div className="text-2xl font-bold text-green-600">{healthReport.summary.healthy}</div>
                      <div className="text-sm text-gray-600">正常组件</div>
                    </GlassCard>
                    
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">⚠️</div>
                      <div className="text-2xl font-bold text-yellow-600">{healthReport.summary.warnings}</div>
                      <div className="text-sm text-gray-600">警告组件</div>
                    </GlassCard>
                    
                    <GlassCard className="text-center p-6">
                      <div className="text-3xl mb-3">❌</div>
                      <div className="text-2xl font-bold text-red-600">{healthReport.summary.critical}</div>
                      <div className="text-sm text-gray-600">严重问题</div>
                    </GlassCard>
                  </div>

                  {/* 组件健康状态 */}
                  <GlassCard>
                    <div className="p-4 border-b border-white/20">
                      <h4 className="text-lg font-semibold text-gray-800">组件健康状态</h4>
                    </div>
                    <div className="p-6 space-y-4">
                      {healthReport.checks.map((check, index) => (
                        <div key={index} className={`p-4 rounded-xl border ${
                          check.status === 'healthy' ? 'bg-green-50/50 border-green-200' :
                          check.status === 'warning' ? 'bg-yellow-50/50 border-yellow-200' :
                          'bg-red-50/50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">
                                {check.status === 'healthy' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}
                              </span>
                              <span className="font-medium text-gray-900">{check.component}</span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              check.status === 'healthy' ? 'bg-green-100 text-green-600' :
                              check.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {check.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-3">
                            {check.message}
                          </div>
                          {check.metrics && (
                            <div className="text-xs bg-white/50 p-3 rounded-lg font-mono mb-3">
                              <strong className="text-gray-700">指标:</strong>
                              <pre className="mt-1 overflow-x-auto">{JSON.stringify(check.metrics, null, 2)}</pre>
                            </div>
                          )}
                          {check.recommendations && check.recommendations.length > 0 && (
                            <div className="text-sm bg-white/50 p-3 rounded-lg">
                              <strong className="text-gray-700">建议:</strong>
                              <ul className="mt-1 list-disc list-inside space-y-1">
                                {check.recommendations.map((rec, i) => (
                                  <li key={i} className="text-gray-600">{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemManagement;