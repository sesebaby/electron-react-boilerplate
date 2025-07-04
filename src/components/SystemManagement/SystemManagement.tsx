import React, { useState, useEffect } from 'react';
import { systemTester, TestResult, SystemTestReport } from '../../utils/systemTest';
import { systemOptimizer, OptimizationResult, SystemOptimizationReport } from '../../utils/systemOptimization';
import { systemHealthMonitor, HealthCheckResult, SystemHealthReport } from '../../utils/systemHealth';
import './SystemManagement.css';

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
    if (!healthReport) return { status: 'unknown', message: '等待检查' };
    
    const { overallStatus, healthScore } = healthReport;
    
    if (overallStatus === 'healthy') {
      return { status: 'healthy', message: `系统运行良好 (${healthScore}/100)` };
    } else if (overallStatus === 'warning') {
      return { status: 'warning', message: `系统存在警告 (${healthScore}/100)` };
    } else {
      return { status: 'critical', message: `系统存在严重问题 (${healthScore}/100)` };
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

  return (
    <div className={`system-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>系统管理</h2>
          <p>系统测试、优化分析和健康监控</p>
        </div>
        <div className="header-actions">
          <div className={`system-status-indicator ${systemStatus.status}`}>
            <span className="status-dot"></span>
            <span className="status-text">{systemStatus.message}</span>
          </div>
        </div>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
          <button onClick={() => setError(null)} className="close-error">✕</button>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📊</span>
          系统概览
        </button>
        <button 
          className={`tab-btn ${activeTab === 'testing' ? 'active' : ''}`}
          onClick={() => setActiveTab('testing')}
        >
          <span className="tab-icon">🧪</span>
          集成测试
        </button>
        <button 
          className={`tab-btn ${activeTab === 'optimization' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimization')}
        >
          <span className="tab-icon">🔧</span>
          系统优化
        </button>
        <button 
          className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitoring')}
        >
          <span className="tab-icon">🏥</span>
          健康监控
        </button>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>正在执行系统操作，请稍候...</p>
          </div>
        </div>
      )}

      {/* 标签页内容 */}
      <div className="tab-content">
        {/* 系统概览 */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-cards">
              <div className="overview-card">
                <div className="card-header">
                  <h3>🧪 系统测试</h3>
                  <button className="glass-button primary" onClick={runSystemTests}>
                    运行测试
                  </button>
                </div>
                <div className="card-content">
                  {testReport ? (
                    <div className="test-summary">
                      <div className="summary-item">
                        <span className="label">测试总数:</span>
                        <span className="value">{testReport.totalTests}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">通过测试:</span>
                        <span className="value success">{testReport.passedTests}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">失败测试:</span>
                        <span className="value error">{testReport.failedTests}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">耗时:</span>
                        <span className="value">{formatDuration(testReport.totalDuration)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="no-data">暂无测试数据，点击"运行测试"开始</p>
                  )}
                </div>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <h3>🔧 系统优化</h3>
                  <button className="glass-button primary" onClick={runOptimization}>
                    分析优化
                  </button>
                </div>
                <div className="card-content">
                  {optimizationReport ? (
                    <div className="optimization-summary">
                      <div className="summary-item">
                        <span className="label">性能得分:</span>
                        <span className={`value ${optimizationReport.performanceScore >= 80 ? 'success' : 'warning'}`}>
                          {optimizationReport.performanceScore}/100
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="label">优化项:</span>
                        <span className="value">{optimizationReport.totalOptimizations}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">已实施:</span>
                        <span className="value success">{optimizationReport.implementedOptimizations}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">待实施:</span>
                        <span className="value">{optimizationReport.totalOptimizations - optimizationReport.implementedOptimizations}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="no-data">暂无优化数据，点击"分析优化"开始</p>
                  )}
                </div>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <h3>🏥 健康监控</h3>
                  <div className="card-actions">
                    <button className="glass-button secondary" onClick={runHealthCheck}>
                      立即检查
                    </button>
                    <button 
                      className={`glass-button ${isMonitoring ? 'warning' : 'primary'}`}
                      onClick={toggleContinuousMonitoring}
                    >
                      {isMonitoring ? '停止监控' : '开始监控'}
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  {healthReport ? (
                    <div className="health-summary">
                      <div className="summary-item">
                        <span className="label">健康得分:</span>
                        <span className={`value ${healthReport.healthScore >= 80 ? 'success' : healthReport.healthScore >= 60 ? 'warning' : 'error'}`}>
                          {healthReport.healthScore}/100
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="label">正常组件:</span>
                        <span className="value success">{healthReport.summary.healthy}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">警告组件:</span>
                        <span className="value warning">{healthReport.summary.warnings}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">严重问题:</span>
                        <span className="value error">{healthReport.summary.critical}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="no-data">暂无健康数据，点击"立即检查"开始</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 系统测试 */}
        {activeTab === 'testing' && (
          <div className="testing-tab">
            <div className="section-header">
              <h3>系统集成测试</h3>
              <button className="glass-button primary" onClick={runSystemTests}>
                <span className="button-icon">🧪</span>
                运行完整测试
              </button>
            </div>

            {testReport && (
              <div className="test-results">
                <div className="test-overview">
                  <div className="test-stats">
                    <div className="stat-item success">
                      <div className="stat-icon">✅</div>
                      <div className="stat-content">
                        <div className="stat-value">{testReport.passedTests}</div>
                        <div className="stat-label">通过测试</div>
                      </div>
                    </div>
                    <div className="stat-item error">
                      <div className="stat-icon">❌</div>
                      <div className="stat-content">
                        <div className="stat-value">{testReport.failedTests}</div>
                        <div className="stat-label">失败测试</div>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon">⏱️</div>
                      <div className="stat-content">
                        <div className="stat-value">{formatDuration(testReport.totalDuration)}</div>
                        <div className="stat-label">总耗时</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="test-details">
                  <h4>测试详情</h4>
                  <div className="test-list">
                    {testReport.results.map((result, index) => (
                      <div key={index} className={`test-item ${result.success ? 'success' : 'error'}`}>
                        <div className="test-header">
                          <span className="test-status">
                            {result.success ? '✅' : '❌'}
                          </span>
                          <span className="test-name">{result.testName}</span>
                          <span className="test-duration">{formatDuration(result.duration)}</span>
                        </div>
                        {result.error && (
                          <div className="test-error">
                            错误: {result.error}
                          </div>
                        )}
                        {result.details && (
                          <div className="test-details-content">
                            <pre>{JSON.stringify(result.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 系统优化 */}
        {activeTab === 'optimization' && (
          <div className="optimization-tab">
            <div className="section-header">
              <h3>系统优化分析</h3>
              <button className="glass-button primary" onClick={runOptimization}>
                <span className="button-icon">🔧</span>
                重新分析
              </button>
            </div>

            {optimizationReport && (
              <div className="optimization-results">
                <div className="optimization-overview">
                  <div className="performance-score">
                    <div className="score-circle">
                      <div className="score-value">{optimizationReport.performanceScore}</div>
                      <div className="score-label">性能得分</div>
                    </div>
                  </div>
                  <div className="optimization-stats">
                    <div className="stat-item">
                      <span className="stat-label">总优化项:</span>
                      <span className="stat-value">{optimizationReport.totalOptimizations}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">已实施:</span>
                      <span className="stat-value success">{optimizationReport.implementedOptimizations}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">待实施:</span>
                      <span className="stat-value">{optimizationReport.totalOptimizations - optimizationReport.implementedOptimizations}</span>
                    </div>
                  </div>
                </div>

                <div className="optimization-categories">
                  {Object.entries(
                    optimizationReport.recommendations.reduce((acc, opt) => {
                      if (!acc[opt.category]) acc[opt.category] = [];
                      acc[opt.category].push(opt);
                      return acc;
                    }, {} as Record<string, OptimizationResult[]>)
                  ).map(([category, optimizations]) => (
                    <div key={category} className="optimization-category">
                      <h4>{category}</h4>
                      <div className="optimization-list">
                        {optimizations.map((opt, index) => (
                          <div key={index} className={`optimization-item ${opt.implemented ? 'implemented' : 'pending'}`}>
                            <div className="optimization-header">
                              <span className="optimization-status">
                                {opt.implemented ? '✅' : '📋'}
                              </span>
                              <span className="optimization-name">{opt.optimization}</span>
                              <span className={`optimization-impact ${opt.impact}`}>
                                {opt.impact === 'high' ? '🔴' : opt.impact === 'medium' ? '🟡' : '🟢'} {opt.impact}
                              </span>
                            </div>
                            <div className="optimization-details">
                              {opt.details}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 健康监控 */}
        {activeTab === 'monitoring' && (
          <div className="monitoring-tab">
            <div className="section-header">
              <h3>系统健康监控</h3>
              <div className="monitoring-controls">
                <button className="glass-button secondary" onClick={runHealthCheck}>
                  <span className="button-icon">🔄</span>
                  立即检查
                </button>
                <button 
                  className={`glass-button ${isMonitoring ? 'warning' : 'primary'}`}
                  onClick={toggleContinuousMonitoring}
                >
                  <span className="button-icon">{isMonitoring ? '⏹️' : '▶️'}</span>
                  {isMonitoring ? '停止监控' : '开始监控'}
                </button>
              </div>
            </div>

            {healthReport && (
              <div className="health-results">
                <div className="health-overview">
                  <div className="health-score">
                    <div className="score-circle">
                      <div className="score-value">{healthReport.healthScore}</div>
                      <div className="score-label">健康得分</div>
                    </div>
                  </div>
                  <div className="health-summary">
                    <div className="summary-stats">
                      <div className="stat-item success">
                        <span className="stat-icon">✅</span>
                        <div className="stat-content">
                          <div className="stat-value">{healthReport.summary.healthy}</div>
                          <div className="stat-label">正常组件</div>
                        </div>
                      </div>
                      <div className="stat-item warning">
                        <span className="stat-icon">⚠️</span>
                        <div className="stat-content">
                          <div className="stat-value">{healthReport.summary.warnings}</div>
                          <div className="stat-label">警告组件</div>
                        </div>
                      </div>
                      <div className="stat-item error">
                        <span className="stat-icon">❌</span>
                        <div className="stat-content">
                          <div className="stat-value">{healthReport.summary.critical}</div>
                          <div className="stat-label">严重问题</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="health-checks">
                  <h4>组件健康状态</h4>
                  <div className="health-list">
                    {healthReport.checks.map((check, index) => (
                      <div key={index} className={`health-item ${check.status}`}>
                        <div className="health-header">
                          <span className="health-status">
                            {check.status === 'healthy' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}
                          </span>
                          <span className="health-component">{check.component}</span>
                          <span className={`health-badge ${check.status}`}>
                            {check.status}
                          </span>
                        </div>
                        <div className="health-message">
                          {check.message}
                        </div>
                        {check.metrics && (
                          <div className="health-metrics">
                            <strong>指标:</strong>
                            <pre>{JSON.stringify(check.metrics, null, 2)}</pre>
                          </div>
                        )}
                        {check.recommendations && check.recommendations.length > 0 && (
                          <div className="health-recommendations">
                            <strong>建议:</strong>
                            <ul>
                              {check.recommendations.map((rec, i) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManagement;