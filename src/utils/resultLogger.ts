/**
 * 结果记录器
 * 用于记录和保存测试结果
 */

import { TestResult } from './businessLogicTester';

export interface LoggerConfig {
  outputDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  formats: ('json' | 'html' | 'csv')[];
  retention: number; // 保留天数
}

export class ResultLogger {
  private config: LoggerConfig;
  
  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      outputDir: 'tests/results',
      logLevel: 'info',
      formats: ['json', 'html'],
      retention: 30,
      ...config
    };
  }

  /**
   * 记录测试结果
   */
  async logTestResult(testResult: TestResult): Promise<void> {
    console.log(`[ResultLogger] 记录测试结果: ${testResult.testId}`);
    
    try {
      await this.ensureOutputDirectory();
      
      // 生成不同格式的报告
      if (this.config.formats.includes('json')) {
        await this.saveJsonReport(testResult);
      }
      
      if (this.config.formats.includes('html')) {
        await this.saveHtmlReport(testResult);
      }
      
      if (this.config.formats.includes('csv')) {
        await this.saveCsvReport(testResult);
      }
      
      // 更新总体测试索引
      await this.updateTestIndex(testResult);
      
      // 清理过期文件
      await this.cleanupOldResults();
      
      console.log(`[ResultLogger] 测试结果记录完成: ${testResult.testId}`);
    } catch (error) {
      console.error(`[ResultLogger] 记录测试结果失败:`, error);
    }
  }

  /**
   * 保存JSON格式报告
   */
  private async saveJsonReport(testResult: TestResult): Promise<void> {
    const _fs = require('fs').promises;
    const _path = require('path');
    
    const _filename = `${testResult.testId}_${this.formatTimestamp(testResult.startTime)}.json`;
    const _filepath = path.join(this.config.outputDir, 'json', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(testResult, null, 2));
  }

  /**
   * 保存HTML格式报告
   */
  private async saveHtmlReport(testResult: TestResult): Promise<void> {
    const _fs = require('fs').promises;
    const _path = require('path');
    
    const _filename = `${testResult.testId}_${this.formatTimestamp(testResult.startTime)}.html`;
    const _filepath = path.join(this.config.outputDir, 'html', filename);
    
    const _htmlContent = this.generateHtmlReport(testResult);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, htmlContent);
  }

  /**
   * 保存CSV格式报告
   */
  private async saveCsvReport(testResult: TestResult): Promise<void> {
    const _fs = require('fs').promises;
    const _path = require('path');
    
    const _filename = `${testResult.testId}_${this.formatTimestamp(testResult.startTime)}.csv`;
    const _filepath = path.join(this.config.outputDir, 'csv', filename);
    
    const _csvContent = this.generateCsvReport(testResult);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, csvContent);
  }

  /**
   * 生成HTML报告内容
   */
  private generateHtmlReport(testResult: TestResult): string {
    const _duration = testResult.endTime.getTime() - testResult.startTime.getTime();
    const _durationStr = this.formatDuration(duration);
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>业务逻辑验证报告 - ${testResult.testId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #007bff; margin-bottom: 10px; }
        .status-badge { padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; }
        .status-passed { background-color: #28a745; }
        .status-failed { background-color: #dc3545; }
        .section { margin-bottom: 30px; }
        .section-title { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 15px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .metric-label { font-weight: bold; color: #666; }
        .metric-value { font-size: 1.2em; color: #007bff; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f8f9fa; font-weight: bold; }
        .table tr:nth-child(even) { background-color: #f9f9f9; }
        .issue { margin: 10px 0; padding: 10px; border-left: 4px solid #ffc107; background: #fff3cd; }
        .issue.critical { border-left-color: #dc3545; background: #f8d7da; }
        .issue.high { border-left-color: #fd7e14; background: #fff3cd; }
        .issue.medium { border-left-color: #ffc107; background: #fff3cd; }
        .issue.low { border-left-color: #6c757d; background: #f8f9fa; }
        .workflow-step { margin: 5px 0; padding: 8px; border-radius: 4px; }
        .step-passed { background: #d4edda; border-left: 4px solid #28a745; }
        .step-failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .expandable { cursor: pointer; user-select: none; }
        .expandable:before { content: '▶ '; display: inline-block; transition: transform 0.2s; }
        .expandable.expanded:before { transform: rotate(90deg); }
        .collapsible { display: none; margin-top: 10px; }
        .collapsible.expanded { display: block; }
    </style>
    <script>
        function toggleSection(element) {
            element.classList.toggle('expanded');
            const _content = element.nextElementSibling;
            content.classList.toggle('expanded');
        }
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">业务逻辑验证报告</h1>
            <p><strong>测试ID:</strong> ${testResult.testId}</p>
            <p><strong>描述:</strong> ${testResult.description}</p>
            <p><strong>状态:</strong> <span class="status-badge ${testResult.passed ? 'status-passed' : 'status-failed'}">${testResult.passed ? '通过' : '失败'}</span></p>
            <p><strong>开始时间:</strong> ${this.formatDateTime(testResult.startTime)}</p>
            <p><strong>结束时间:</strong> ${this.formatDateTime(testResult.endTime)}</p>
            <p><strong>耗时:</strong> ${durationStr}</p>
        </div>

        <div class="section">
            <h2 class="section-title">测试概览</h2>
            <div class="metric">
                <div class="metric-label">方法验证</div>
                <div class="metric-value">${testResult.methodResults.length}</div>
            </div>
            <div class="metric">
                <div class="metric-label">工作流验证</div>
                <div class="metric-value">${testResult.workflowResults.length}</div>
            </div>
            <div class="metric">
                <div class="metric-label">发现问题</div>
                <div class="metric-value">${testResult.issues.length}</div>
            </div>
            <div class="metric">
                <div class="metric-label">数据完整性</div>
                <div class="metric-value">${testResult.dataIntegrityReport?.passed ? '通过' : '失败'}</div>
            </div>
        </div>

        ${this.generateMethodResultsSection(testResult.methodResults)}
        ${this.generateWorkflowResultsSection(testResult.workflowResults)}
        ${this.generateIssuesSection(testResult.issues)}
        ${this.generateDataIntegritySection(testResult.dataIntegrityReport)}
    </div>
</body>
</html>`;
  }

  /**
   * 生成方法验证结果部分
   */
  private generateMethodResultsSection(methodResults: any[]): string {
    if (methodResults.length === 0) {
      return '<div class="section"><h2 class="section-title">方法验证结果</h2><p>无方法验证结果</p></div>';
    }

    const _passed = methodResults.filter(r => r.passed).length;
    const _failed = methodResults.length - passed;

    return `
        <div class="section">
            <h2 class="section-title expandable" onclick="toggleSection(this)">方法验证结果 (${passed}通过, ${failed}失败)</h2>
            <div class="collapsible">
                <table class="table">
                    <thead>
                        <tr>
                            <th>服务</th>
                            <th>方法</th>
                            <th>状态</th>
                            <th>错误信息</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${methodResults.map(result => `
                            <tr>
                                <td>${result.service || 'N/A'}</td>
                                <td>${result.method || 'N/A'}</td>
                                <td><span class="status-badge ${result.passed ? 'status-passed' : 'status-failed'}">${result.passed ? '通过' : '失败'}</span></td>
                                <td>${result.error || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
  }

  /**
   * 生成工作流验证结果部分
   */
  private generateWorkflowResultsSection(workflowResults: any[]): string {
    if (workflowResults.length === 0) {
      return '<div class="section"><h2 class="section-title">工作流验证结果</h2><p>无工作流验证结果</p></div>';
    }

    return `
        <div class="section">
            <h2 class="section-title expandable" onclick="toggleSection(this)">工作流验证结果</h2>
            <div class="collapsible">
                ${workflowResults.map(result => `
                    <div class="workflow">
                        <h4>${result.workflow} - <span class="status-badge ${result.completed ? 'status-passed' : 'status-failed'}">${result.completed ? '通过' : '失败'}</span></h4>
                        <div class="workflow-steps">
                            ${result.steps.map((step: any) => `
                                <div class="workflow-step ${step.passed ? 'step-passed' : 'step-failed'}">
                                    <strong>${step.step}:</strong> ${step.passed ? '通过' : `失败 (${step.error})`}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
  }

  /**
   * 生成问题部分
   */
  private generateIssuesSection(issues: any[]): string {
    if (issues.length === 0) {
      return '<div class="section"><h2 class="section-title">发现的问题</h2><p>未发现问题</p></div>';
    }

    const _groupedIssues = this.groupIssuesBySeverity(issues);

    return `
        <div class="section">
            <h2 class="section-title expandable" onclick="toggleSection(this)">发现的问题 (${issues.length})</h2>
            <div class="collapsible">
                ${Object.entries(groupedIssues).map(([severity, issuesList]) => `
                    <h3>${severity} (${issuesList.length})</h3>
                    ${issuesList.map(issue => `
                        <div class="issue ${severity.toLowerCase()}">
                            <strong>${issue.type}:</strong> ${issue.description}
                            ${issue.service ? `<br><small>服务: ${issue.service}</small>` : ''}
                            ${issue.method ? `<br><small>方法: ${issue.method}</small>` : ''}
                            ${issue.workflow ? `<br><small>工作流: ${issue.workflow}</small>` : ''}
                            ${issue.table ? `<br><small>表: ${issue.table}</small>` : ''}
                            <br><small>时间: ${this.formatDateTime(issue.timestamp)}</small>
                        </div>
                    `).join('')}
                `).join('')}
            </div>
        </div>`;
  }

  /**
   * 生成数据完整性部分
   */
  private generateDataIntegritySection(dataIntegrity: any): string {
    if (!dataIntegrity) {
      return '<div class="section"><h2 class="section-title">数据完整性报告</h2><p>无数据完整性报告</p></div>';
    }

    const { passed, violations, warnings, summary } = dataIntegrity;

    return `
        <div class="section">
            <h2 class="section-title expandable" onclick="toggleSection(this)">数据完整性报告 - ${passed ? '通过' : '失败'} (${summary.totalViolations}个违规, ${warnings.length}个警告)</h2>
            <div class="collapsible">
                <h3>违规项</h3>
                ${violations.length > 0 ? violations.map((violation: any) => `
                    <div class="issue ${violation.severity.toLowerCase()}">
                        <strong>${violation.type} (${violation.severity})</strong> on table <strong>${violation.table}</strong>
                        <p>${violation.description}</p>
                    </div>
                `).join('') : '<p>无违规项</p>'}
            </div>
        </div>`;
  }

  /**
   * 生成CSV格式报告
   */
  private generateCsvReport(testResult: TestResult): string {
    const csvRows: string[] = [];
    csvRows.push('测试类型,测试项目,状态,错误信息,时间戳');
    
    testResult.methodResults.forEach(result => {
      csvRows.push([
        `方法验证`,
        `${result.service || 'N/A'}.${result.method || 'N/A'}`,
        result.passed ? '通过' : '失败',
        `"${result.error || ''}"`,
        `"${this.formatDateTime(new Date())}"`
      ].join(','));
    });

    testResult.workflowResults.forEach(workflow => {
      workflow.steps.forEach((step: any) => {
        csvRows.push([
          `工作流验证`,
          `${workflow.workflow}.${step.step}`,
          step.passed ? '通过' : '失败',
          `"${step.error || ''}"`,
          `"${this.formatDateTime(new Date())}"`
        ].join(','));
      });
    });

    testResult.issues.forEach(issue => {
        csvRows.push([
            `问题`,
            issue.type,
            issue.severity,
            `"${issue.description}"`,
            `"${this.formatDateTime(issue.timestamp)}"`
        ].join(','))
    });

    return csvRows.join('\n');
  }

  /**
   * 按严重性分组问题
   */
  private groupIssuesBySeverity(issues: any[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {
        'Critical': [],
        'High': [],
        'Medium': [],
        'Low': [],
        'Info': []
    };
    for (const issue of issues) {
        if (grouped[issue.severity]) {
            grouped[issue.severity].push(issue);
        }
    }
    return grouped;
  }

  /**
   * 更新测试索引
   */
  private async updateTestIndex(testResult: TestResult): Promise<void> {
    const _fs = require('fs').promises;
    const _path = require('path');
    
    const _indexFile = path.join(this.config.outputDir, 'index.json');
    let indexData: any[] = [];
    
    try {
      indexData = JSON.parse(await fs.readFile(indexFile, 'utf8'));
    } catch (e) {
      // Index file doesn't exist or is invalid, start with an empty array
    }

    // 添加或更新测试记录
    const _existingIndex = indexData.findIndex(item => item.testId === testResult.testId);
    const _summary = {
      testId: testResult.testId,
      description: testResult.description,
      passed: testResult.passed,
      startTime: testResult.startTime,
      duration: testResult.endTime.getTime() - testResult.startTime.getTime(),
      issues: testResult.issues.length
    };

    if (existingIndex !== -1) {
      indexData[existingIndex] = summary;
    } else {
      indexData.push(summary);
    }
    
    indexData.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    await fs.writeFile(indexFile, JSON.stringify(indexData, null, 2));
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDirectory(): Promise<void> {
    const _fs = require('fs').promises;
    await fs.mkdir(this.config.outputDir, { recursive: true });
    await fs.mkdir(`${this.config.outputDir}/json`, { recursive: true });
    await fs.mkdir(`${this.config.outputDir}/html`, { recursive: true });
    await fs.mkdir(`${this.config.outputDir}/csv`, { recursive: true });
  }

  /**
   * 清理过期结果
   */
  private async cleanupOldResults(): Promise<void> {
    try {
      const _fs = require('fs').promises;
      const _path = require('path');
      
      const _cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);
      
      const _formats = ['json', 'html', 'csv'];
      const _deletedCount = 0;
      
      for (const format of formats) {
        const _formatDir = path.join(this.config.outputDir, format);
        
        try {
          const _files = await fs.readdir(formatDir);
          
          for (const file of files) {
            const _filePath = path.join(formatDir, file);
            const _stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              deletedCount++;
            }
          }
        } catch (error) {
          // 目录不存在或其他错误，继续处理其他格式
        }
      }
      
      if (deletedCount > 0) {
        console.log(`[ResultLogger] 清理了 ${deletedCount} 个过期结果文件`);
      }
    } catch (error) {
      console.error('[ResultLogger] 清理过期结果失败:', error);
    }
  }

  // 工具方法

  /**
   * 格式化时间戳
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(milliseconds: number): string {
    const _seconds = Math.floor(milliseconds / 1000);
    const _minutes = Math.floor(seconds / 60);
    const _hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}