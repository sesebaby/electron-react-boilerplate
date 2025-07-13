import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

/**
 * 自定义测试覆盖率报告器
 * 专为Electron桌面应用设计，收集测试覆盖率和性能数据
 */
export default class CoverageReporter implements Reporter {
  private testResults: Array<{
    test: string;
    status: string;
    duration: number;
    error?: string;
    coverage?: any;
  }> = [];

  private startTime: number = 0;
  private endTime: number = 0;

  onBegin() {
    this.startTime = Date.now();
    console.log('🚀 开始执行E2E测试套件...');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const testInfo = {
      test: test.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      coverage: this.extractCoverageData(result)
    };

    this.testResults.push(testInfo);

    // 实时输出测试结果
    const statusIcon = this.getStatusIcon(result.status);
    const durationText = `${result.duration}ms`;
    console.log(`${statusIcon} ${test.title} (${durationText})`);

    if (result.error) {
      console.log(`   ❌ 错误: ${result.error.message}`);
    }
  }

  async onEnd(result: FullResult) {
    this.endTime = Date.now();
    const totalDuration = this.endTime - this.startTime;

    // 生成测试报告
    const report = this.generateReport(result, totalDuration);
    
    // 保存报告到文件
    await this.saveReport(report);
    
    // 输出摘要
    this.printSummary(result, totalDuration);
  }

  private extractCoverageData(result: TestResult): any {
    // 从测试结果中提取覆盖率数据
    // 这里可以集成V8覆盖率或其他覆盖率工具
    return {
      // 占位符，实际实现需要根据具体需求
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0
    };
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      case 'timedOut': return '⏰';
      default: return '❓';
    }
  }

  private generateReport(result: FullResult, totalDuration: number) {
    const passed = this.testResults.filter(t => t.status === 'passed').length;
    const failed = this.testResults.filter(t => t.status === 'failed').length;
    const skipped = this.testResults.filter(t => t.status === 'skipped').length;
    const total = this.testResults.length;

    return {
      summary: {
        total,
        passed,
        failed,
        skipped,
        passRate: total > 0 ? (passed / total * 100).toFixed(2) : '0',
        totalDuration,
        avgDuration: total > 0 ? (totalDuration / total).toFixed(2) : '0'
      },
      tests: this.testResults,
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      },
      coverage: this.calculateOverallCoverage()
    };
  }

  private calculateOverallCoverage() {
    // 计算整体覆盖率
    // 这里是占位符实现
    return {
      lines: { covered: 0, total: 0, percentage: 0 },
      functions: { covered: 0, total: 0, percentage: 0 },
      branches: { covered: 0, total: 0, percentage: 0 },
      statements: { covered: 0, total: 0, percentage: 0 }
    };
  }

  private async saveReport(report: any) {
    const reportDir = path.join(process.cwd(), 'test-results');
    const reportPath = path.join(reportDir, 'coverage-report.json');

    // 确保目录存在
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // 保存JSON报告
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 生成HTML报告
    await this.generateHtmlReport(report, reportDir);

    console.log(`📊 测试报告已保存到: ${reportPath}`);
  }

  private async generateHtmlReport(report: any, reportDir: string) {
    const htmlContent = this.generateHtmlContent(report);
    const htmlPath = path.join(reportDir, 'coverage-report.html');
    
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`🌐 HTML报告已保存到: ${htmlPath}`);
  }

  private generateHtmlContent(report: any): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E测试报告 - 进销存管理系统</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .tests { padding: 0 30px 30px; }
        .test-item { padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #ddd; }
        .test-passed { border-left-color: #28a745; background: #f8fff9; }
        .test-failed { border-left-color: #dc3545; background: #fff8f8; }
        .test-skipped { border-left-color: #ffc107; background: #fffdf7; }
        .test-title { font-weight: bold; margin-bottom: 5px; }
        .test-meta { font-size: 0.9em; color: #666; }
        .error { color: #dc3545; margin-top: 10px; font-family: monospace; background: #f8f8f8; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 E2E测试报告</h1>
            <p>进销存管理系统 - ${report.environment.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.total}</div>
                <div class="metric-label">总测试数</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #28a745">${report.summary.passed}</div>
                <div class="metric-label">通过</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #dc3545">${report.summary.failed}</div>
                <div class="metric-label">失败</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #ffc107">${report.summary.skipped}</div>
                <div class="metric-label">跳过</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.passRate}%</div>
                <div class="metric-label">通过率</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(report.summary.totalDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">总耗时</div>
            </div>
        </div>
        
        <div class="tests">
            <h2>测试详情</h2>
            ${report.tests.map((test: any) => `
                <div class="test-item test-${test.status}">
                    <div class="test-title">${this.getStatusIcon(test.status)} ${test.test}</div>
                    <div class="test-meta">耗时: ${test.duration}ms | 状态: ${test.status}</div>
                    ${test.error ? `<div class="error">错误: ${test.error}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  private printSummary(result: FullResult, totalDuration: number) {
    const passed = this.testResults.filter(t => t.status === 'passed').length;
    const failed = this.testResults.filter(t => t.status === 'failed').length;
    const skipped = this.testResults.filter(t => t.status === 'skipped').length;
    const total = this.testResults.length;
    const passRate = total > 0 ? (passed / total * 100).toFixed(2) : '0';

    console.log('\n📊 测试执行摘要:');
    console.log('═'.repeat(50));
    console.log(`总测试数: ${total}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⏭️  跳过: ${skipped}`);
    console.log(`📈 通过率: ${passRate}%`);
    console.log(`⏱️  总耗时: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(50));

    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults
        .filter(t => t.status === 'failed')
        .forEach(test => {
          console.log(`   • ${test.test}`);
          if (test.error) {
            console.log(`     错误: ${test.error}`);
          }
        });
    }
  }
}
