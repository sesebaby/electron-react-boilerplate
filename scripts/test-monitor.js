const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 测试监控和通知脚本
 * 监控测试执行状态，发送通知，生成趋势报告
 */

class TestMonitor {
  constructor() {
    this.testResultsDir = path.join(__dirname, '../test-results');
    this.historyDir = path.join(__dirname, '../test-history');
    this.configPath = path.join(__dirname, '../test-monitor.config.json');
    this.config = this.loadConfig();
  }

  /**
   * 加载配置
   */
  loadConfig() {
    const defaultConfig = {
      notifications: {
        enabled: true,
        webhook: process.env.TEST_WEBHOOK_URL || '',
        email: {
          enabled: false,
          recipients: []
        }
      },
      thresholds: {
        passRate: 95, // 通过率阈值
        duration: 300000, // 执行时间阈值（5分钟）
        coverage: 80 // 覆盖率阈值
      },
      history: {
        maxRecords: 100,
        retentionDays: 30
      }
    };

    if (fs.existsSync(this.configPath)) {
      try {
        const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return { ...defaultConfig, ...userConfig };
      } catch (error) {
        console.warn('配置文件解析失败，使用默认配置:', error.message);
        return defaultConfig;
      }
    }

    return defaultConfig;
  }

  /**
   * 监控测试执行
   */
  async monitorTests() {
    console.log('🔍 开始监控测试执行...');

    try {
      // 确保历史目录存在
      this.ensureDirectoryExists(this.historyDir);

      // 收集测试结果
      const testResults = await this.collectTestResults();

      // 保存到历史记录
      await this.saveToHistory(testResults);

      // 分析测试结果
      const analysis = await this.analyzeResults(testResults);

      // 发送通知
      await this.sendNotifications(testResults, analysis);

      // 生成趋势报告
      await this.generateTrendReport();

      console.log('✅ 测试监控完成');

    } catch (error) {
      console.error('❌ 测试监控失败:', error);
      await this.sendErrorNotification(error);
    }
  }

  /**
   * 收集测试结果
   */
  async collectTestResults() {
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        passRate: 0
      },
      coverage: null,
      performance: null,
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        ci: !!process.env.CI
      }
    };

    // 读取Playwright测试结果
    const playwrightResultsPath = path.join(this.testResultsDir, 'results.json');
    if (fs.existsSync(playwrightResultsPath)) {
      const playwrightData = JSON.parse(fs.readFileSync(playwrightResultsPath, 'utf8'));
      
      if (playwrightData.stats) {
        results.summary.total += playwrightData.stats.total || 0;
        results.summary.passed += playwrightData.stats.passed || 0;
        results.summary.failed += playwrightData.stats.failed || 0;
        results.summary.skipped += playwrightData.stats.skipped || 0;
        results.summary.duration += playwrightData.stats.duration || 0;
      }
    }

    // 读取Jest测试结果
    const jestResultsPath = path.join(this.testResultsDir, 'jest-results.json');
    if (fs.existsSync(jestResultsPath)) {
      const jestData = JSON.parse(fs.readFileSync(jestResultsPath, 'utf8'));
      
      if (jestData.numTotalTests) {
        results.summary.total += jestData.numTotalTests;
        results.summary.passed += jestData.numPassedTests || 0;
        results.summary.failed += jestData.numFailedTests || 0;
        results.summary.skipped += jestData.numPendingTests || 0;
      }
    }

    // 计算通过率
    if (results.summary.total > 0) {
      results.summary.passRate = (results.summary.passed / results.summary.total * 100).toFixed(2);
    }

    // 读取覆盖率信息
    const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      results.coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    }

    // 读取性能测试结果
    const performancePath = path.join(this.testResultsDir, 'performance-results.json');
    if (fs.existsSync(performancePath)) {
      results.performance = JSON.parse(fs.readFileSync(performancePath, 'utf8'));
    }

    return results;
  }

  /**
   * 分析测试结果
   */
  async analyzeResults(results) {
    const analysis = {
      status: 'success',
      issues: [],
      improvements: [],
      alerts: []
    };

    // 检查通过率
    if (parseFloat(results.summary.passRate) < this.config.thresholds.passRate) {
      analysis.status = 'warning';
      analysis.issues.push({
        type: 'low_pass_rate',
        message: `通过率 ${results.summary.passRate}% 低于阈值 ${this.config.thresholds.passRate}%`,
        severity: 'high'
      });
    }

    // 检查执行时间
    if (results.summary.duration > this.config.thresholds.duration) {
      analysis.issues.push({
        type: 'slow_execution',
        message: `测试执行时间 ${(results.summary.duration / 1000).toFixed(1)}s 超过阈值 ${(this.config.thresholds.duration / 1000).toFixed(1)}s`,
        severity: 'medium'
      });
    }

    // 检查覆盖率
    if (results.coverage && results.coverage.total) {
      const totalCoverage = results.coverage.total.lines.pct;
      if (totalCoverage < this.config.thresholds.coverage) {
        analysis.issues.push({
          type: 'low_coverage',
          message: `代码覆盖率 ${totalCoverage}% 低于阈值 ${this.config.thresholds.coverage}%`,
          severity: 'medium'
        });
      }
    }

    // 检查失败的测试
    if (results.summary.failed > 0) {
      analysis.status = 'failure';
      analysis.alerts.push({
        type: 'test_failures',
        message: `有 ${results.summary.failed} 个测试失败`,
        severity: 'high'
      });
    }

    // 与历史数据比较
    const historicalAnalysis = await this.compareWithHistory(results);
    if (historicalAnalysis) {
      analysis.trends = historicalAnalysis;
    }

    return analysis;
  }

  /**
   * 与历史数据比较
   */
  async compareWithHistory(currentResults) {
    const historyFiles = fs.readdirSync(this.historyDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .slice(-5); // 取最近5次结果

    if (historyFiles.length === 0) {
      return null;
    }

    const historicalData = historyFiles.map(file => {
      const filePath = path.join(this.historyDir, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    });

    const avgPassRate = historicalData.reduce((sum, data) => 
      sum + parseFloat(data.summary.passRate), 0) / historicalData.length;

    const avgDuration = historicalData.reduce((sum, data) => 
      sum + data.summary.duration, 0) / historicalData.length;

    const trends = {
      passRate: {
        current: parseFloat(currentResults.summary.passRate),
        average: avgPassRate.toFixed(2),
        trend: parseFloat(currentResults.summary.passRate) > avgPassRate ? 'improving' : 'declining'
      },
      duration: {
        current: currentResults.summary.duration,
        average: avgDuration.toFixed(0),
        trend: currentResults.summary.duration < avgDuration ? 'improving' : 'declining'
      }
    };

    return trends;
  }

  /**
   * 保存到历史记录
   */
  async saveToHistory(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const historyFile = path.join(this.historyDir, `test-results-${timestamp}.json`);
    
    fs.writeFileSync(historyFile, JSON.stringify(results, null, 2));

    // 清理旧的历史记录
    await this.cleanupHistory();
  }

  /**
   * 清理历史记录
   */
  async cleanupHistory() {
    const files = fs.readdirSync(this.historyDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(this.historyDir, file),
        mtime: fs.statSync(path.join(this.historyDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // 保留最近的记录
    const filesToDelete = files.slice(this.config.history.maxRecords);
    
    // 删除过期的记录
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.history.retentionDays);

    for (const file of files) {
      if (file.mtime < cutoffDate || filesToDelete.includes(file)) {
        fs.unlinkSync(file.path);
      }
    }
  }

  /**
   * 发送通知
   */
  async sendNotifications(results, analysis) {
    if (!this.config.notifications.enabled) {
      return;
    }

    const notification = this.buildNotification(results, analysis);

    // 发送Webhook通知
    if (this.config.notifications.webhook) {
      await this.sendWebhookNotification(notification);
    }

    // 发送邮件通知
    if (this.config.notifications.email.enabled) {
      await this.sendEmailNotification(notification);
    }
  }

  /**
   * 构建通知内容
   */
  buildNotification(results, analysis) {
    const statusEmoji = {
      success: '✅',
      warning: '⚠️',
      failure: '❌'
    };

    const notification = {
      title: `${statusEmoji[analysis.status]} 测试执行报告`,
      summary: {
        status: analysis.status,
        total: results.summary.total,
        passed: results.summary.passed,
        failed: results.summary.failed,
        passRate: results.summary.passRate,
        duration: (results.summary.duration / 1000).toFixed(1)
      },
      issues: analysis.issues,
      trends: analysis.trends,
      timestamp: results.timestamp,
      environment: results.environment
    };

    return notification;
  }

  /**
   * 发送Webhook通知
   */
  async sendWebhookNotification(notification) {
    try {
      const response = await fetch(this.config.notifications.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error(`Webhook请求失败: ${response.status}`);
      }

      console.log('📤 Webhook通知发送成功');
    } catch (error) {
      console.error('📤 Webhook通知发送失败:', error.message);
    }
  }

  /**
   * 发送错误通知
   */
  async sendErrorNotification(error) {
    if (!this.config.notifications.enabled || !this.config.notifications.webhook) {
      return;
    }

    const errorNotification = {
      title: '❌ 测试监控错误',
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(this.config.notifications.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorNotification)
      });
    } catch (webhookError) {
      console.error('发送错误通知失败:', webhookError.message);
    }
  }

  /**
   * 生成趋势报告
   */
  async generateTrendReport() {
    const historyFiles = fs.readdirSync(this.historyDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .slice(-30); // 最近30次记录

    if (historyFiles.length < 2) {
      return;
    }

    const trendData = historyFiles.map(file => {
      const filePath = path.join(this.historyDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return {
        timestamp: data.timestamp,
        passRate: parseFloat(data.summary.passRate),
        duration: data.summary.duration,
        total: data.summary.total,
        failed: data.summary.failed
      };
    });

    const trendReport = {
      period: {
        start: trendData[0].timestamp,
        end: trendData[trendData.length - 1].timestamp,
        records: trendData.length
      },
      metrics: {
        passRate: {
          min: Math.min(...trendData.map(d => d.passRate)),
          max: Math.max(...trendData.map(d => d.passRate)),
          avg: (trendData.reduce((sum, d) => sum + d.passRate, 0) / trendData.length).toFixed(2)
        },
        duration: {
          min: Math.min(...trendData.map(d => d.duration)),
          max: Math.max(...trendData.map(d => d.duration)),
          avg: Math.round(trendData.reduce((sum, d) => sum + d.duration, 0) / trendData.length)
        }
      },
      data: trendData
    };

    const trendReportPath = path.join(this.testResultsDir, 'trend-report.json');
    fs.writeFileSync(trendReportPath, JSON.stringify(trendReport, null, 2));

    console.log(`📈 趋势报告已生成: ${trendReportPath}`);
  }

  /**
   * 确保目录存在
   */
  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// 执行监控
if (require.main === module) {
  const monitor = new TestMonitor();
  monitor.monitorTests().catch(console.error);
}

module.exports = TestMonitor;
