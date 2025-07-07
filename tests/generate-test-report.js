/**
 * 测试报告生成器
 * 生成HTML格式的详细测试报告
 */

const fs = require('fs').promises;
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.resultsDir = path.join(__dirname, 'tests', 'results');
  }

  async generateReport(testResults, reportType = 'comprehensive') {
    try {
      // 确保输出目录存在
      await fs.mkdir(this.resultsDir, { recursive: true });
      await fs.mkdir(path.join(this.resultsDir, 'html'), { recursive: true });
      await fs.mkdir(path.join(this.resultsDir, 'json'), { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // 生成JSON报告
      const jsonReport = this.generateJsonReport(testResults);
      const jsonPath = path.join(this.resultsDir, 'json', `test-report-${timestamp}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2));
      
      // 生成HTML报告
      const htmlReport = this.generateHtmlReport(testResults, reportType);
      const htmlPath = path.join(this.resultsDir, 'html', `test-report-${timestamp}.html`);
      await fs.writeFile(htmlPath, htmlReport);
      
      console.log(`📄 测试报告已生成:`);
      console.log(`   JSON: ${jsonPath}`);
      console.log(`   HTML: ${htmlPath}`);
      
      return { jsonPath, htmlPath };
    } catch (error) {
      console.error('生成测试报告失败:', error);
      throw error;
    }
  }

  generateJsonReport(testResults) {
    const timestamp = new Date();
    const totalScenarios = testResults.length;
    const passedScenarios = testResults.filter(r => r.passed || r.completed).length;
    
    return {
      metadata: {
        generatedAt: timestamp.toISOString(),
        reportVersion: '1.0.0',
        testFramework: 'Business Logic Verifier v1.0'
      },
      summary: {
        totalScenarios,
        passedScenarios,
        failedScenarios: totalScenarios - passedScenarios,
        successRate: (passedScenarios / totalScenarios) * 100,
        executionTime: '模拟时间'
      },
      scenarios: testResults.map((result, index) => ({
        id: index + 1,
        name: this.getScenarioName(index),
        status: (result.passed || result.completed) ? 'PASSED' : 'FAILED',
        details: result
      })),
      issues: this.extractAllIssues(testResults),
      recommendations: this.generateRecommendations(testResults)
    };
  }

  generateHtmlReport(testResults, reportType) {
    const timestamp = new Date();
    const totalScenarios = testResults.length;
    const passedScenarios = testResults.filter(r => r.passed || r.completed).length;
    const successRate = (passedScenarios / totalScenarios) * 100;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>业务逻辑验证报告 - ${timestamp.toLocaleDateString()}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            transition: transform 0.3s ease;
        }
        
        .summary-card:hover {
            transform: translateY(-5px);
        }
        
        .summary-card .icon {
            font-size: 2.5em;
            margin-bottom: 15px;
        }
        
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .summary-card .label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .success { color: #27ae60; }
        .danger { color: #e74c3c; }
        .warning { color: #f39c12; }
        .info { color: #3498db; }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 1.8em;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .scenario-grid {
            display: grid;
            gap: 20px;
        }
        
        .scenario-card {
            background: white;
            border: 1px solid #e1e8ed;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 3px 10px rgba(0,0,0,0.05);
        }
        
        .scenario-header {
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-bottom: 1px solid #e1e8ed;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .scenario-title {
            font-size: 1.3em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .status-passed {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status-failed {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f1b0b7;
        }
        
        .scenario-body {
            padding: 20px;
        }
        
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .metric-label {
            font-size: 0.8em;
            color: #666;
            text-transform: uppercase;
        }
        
        .issues-list {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
        }
        
        .issue-item {
            padding: 8px 0;
            border-bottom: 1px solid #ffeaa7;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        
        .issue-item:last-child {
            border-bottom: none;
        }
        
        .severity-critical { color: #dc3545; font-weight: bold; }
        .severity-high { color: #fd7e14; font-weight: bold; }
        .severity-medium { color: #ffc107; font-weight: bold; }
        .severity-low { color: #6c757d; }
        
        .recommendations {
            background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%);
            border-radius: 10px;
            padding: 25px;
            margin-top: 30px;
        }
        
        .recommendations h3 {
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .recommendation-list {
            list-style: none;
        }
        
        .recommendation-list li {
            padding: 10px 0;
            padding-left: 30px;
            position: relative;
        }
        
        .recommendation-list li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #27ae60;
            font-weight: bold;
            font-size: 1.2em;
        }
        
        .footer {
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9em;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            width: ${successRate}%;
            transition: width 0.3s ease;
        }
        
        .expandable {
            cursor: pointer;
            user-select: none;
        }
        
        .expandable::before {
            content: "▶";
            display: inline-block;
            margin-right: 8px;
            transition: transform 0.2s ease;
        }
        
        .expandable.expanded::before {
            transform: rotate(90deg);
        }
        
        .collapsible {
            display: none;
            margin-top: 15px;
        }
        
        .collapsible.expanded {
            display: block;
        }
        
        @media (max-width: 768px) {
            .container { margin: 10px; }
            .summary-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 2em; }
        }
    </style>
    <script>
        function toggleSection(element) {
            element.classList.toggle('expanded');
            const content = element.nextElementSibling;
            content.classList.toggle('expanded');
        }
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 业务逻辑验证报告</h1>
            <div class="subtitle">生成时间: ${timestamp.toLocaleString('zh-CN')}</div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="icon">📊</div>
                <div class="value">${totalScenarios}</div>
                <div class="label">测试场景</div>
            </div>
            <div class="summary-card">
                <div class="icon success">✅</div>
                <div class="value success">${passedScenarios}</div>
                <div class="label">通过场景</div>
            </div>
            <div class="summary-card">
                <div class="icon danger">❌</div>
                <div class="value danger">${totalScenarios - passedScenarios}</div>
                <div class="label">失败场景</div>
            </div>
            <div class="summary-card">
                <div class="icon info">📈</div>
                <div class="value ${successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'danger'}">${successRate.toFixed(1)}%</div>
                <div class="label">成功率</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2 class="section-title">
                    <span>📋</span>
                    测试场景详情
                </h2>
                <div class="scenario-grid">
                    ${this.generateScenarioCards(testResults)}
                </div>
            </div>
            
            ${this.generateIssuesSection(testResults)}
            
            <div class="recommendations">
                <h3>
                    <span>💡</span>
                    修复建议
                </h3>
                ${this.generateRecommendationsHtml(testResults)}
            </div>
        </div>
        
        <div class="footer">
            <p>报告由业务逻辑验证系统自动生成 | 验证框架版本 1.0.0</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateScenarioCards(testResults) {
    const scenarioNames = ['库存管理', '采购工作流', '销售工作流', '数据完整性'];
    const scenarioIcons = ['📦', '🛒', '💰', '🔍'];
    
    return testResults.map((result, index) => {
      const scenarioName = scenarioNames[index] || '未知场景';
      const scenarioIcon = scenarioIcons[index] || '🔧';
      const status = (result.passed || result.completed) ? 'passed' : 'failed';
      const statusText = status === 'passed' ? '通过' : '失败';
      
      return `
        <div class="scenario-card">
            <div class="scenario-header">
                <div class="scenario-title">
                    <span>${scenarioIcon}</span>
                    ${scenarioName}
                </div>
                <div class="status-badge status-${status}">${statusText}</div>
            </div>
            <div class="scenario-body">
                ${this.generateScenarioMetrics(result)}
                ${this.generateScenarioDetails(result)}
            </div>
        </div>
      `;
    }).join('');
  }

  generateScenarioMetrics(result) {
    let metricsHtml = '<div class="metrics">';
    
    if (result.summary) {
      if (result.summary.successRate !== undefined) {
        metricsHtml += `
          <div class="metric">
            <div class="metric-value ${result.summary.successRate >= 80 ? 'success' : result.summary.successRate >= 50 ? 'warning' : 'danger'}">
              ${result.summary.successRate.toFixed(1)}%
            </div>
            <div class="metric-label">成功率</div>
          </div>
        `;
      }
      
      if (result.summary.total !== undefined) {
        metricsHtml += `
          <div class="metric">
            <div class="metric-value info">${result.summary.total}</div>
            <div class="metric-label">总操作</div>
          </div>
        `;
      }
      
      if (result.summary.stepsTotal !== undefined) {
        metricsHtml += `
          <div class="metric">
            <div class="metric-value info">${result.summary.stepsTotal}</div>
            <div class="metric-label">总步骤</div>
          </div>
        `;
      }
      
      if (result.summary.checksTotal !== undefined) {
        metricsHtml += `
          <div class="metric">
            <div class="metric-value info">${result.summary.checksTotal}</div>
            <div class="metric-label">检查项</div>
          </div>
        `;
      }
      
      if (result.summary.totalViolations !== undefined) {
        metricsHtml += `
          <div class="metric">
            <div class="metric-value ${result.summary.totalViolations === 0 ? 'success' : 'danger'}">${result.summary.totalViolations}</div>
            <div class="metric-label">违规项</div>
          </div>
        `;
      }
    }
    
    metricsHtml += '</div>';
    return metricsHtml;
  }

  generateScenarioDetails(result) {
    let detailsHtml = '';
    
    // 显示具体的问题
    const issues = this.extractScenarioIssues(result);
    if (issues.length > 0) {
      detailsHtml += `
        <div class="expandable" onclick="toggleSection(this)">主要问题 (${issues.length})</div>
        <div class="collapsible">
          <div class="issues-list">
            ${issues.slice(0, 5).map(issue => `
              <div class="issue-item">
                <span class="severity-${issue.severity.toLowerCase()}">[${issue.severity}]</span>
                <span>${issue.description}</span>
              </div>
            `).join('')}
            ${issues.length > 5 ? `<div class="issue-item"><em>... 还有 ${issues.length - 5} 个问题</em></div>` : ''}
          </div>
        </div>
      `;
    }
    
    return detailsHtml;
  }

  generateIssuesSection(testResults) {
    const allIssues = this.extractAllIssues(testResults);
    
    if (allIssues.length === 0) {
      return `
        <div class="section">
          <h2 class="section-title">
            <span>✅</span>
            问题分析
          </h2>
          <div style="padding: 20px; text-align: center; color: #28a745;">
            <h3>🎉 太棒了！没有发现任何问题</h3>
            <p>所有业务逻辑验证都通过了，系统运行良好。</p>
          </div>
        </div>
      `;
    }
    
    const groupedIssues = this.groupIssuesBySeverity(allIssues);
    
    return `
      <div class="section">
        <h2 class="section-title">
          <span>⚠️</span>
          问题分析 (共 ${allIssues.length} 个)
        </h2>
        ${Object.entries(groupedIssues).map(([severity, issues]) => {
          if (issues.length === 0) return '';
          
          return `
            <div class="scenario-card" style="margin-bottom: 20px;">
              <div class="scenario-header">
                <div class="scenario-title">
                  <span class="severity-${severity.toLowerCase()}">${this.getSeverityIcon(severity)}</span>
                  ${severity} 级别问题
                </div>
                <div class="status-badge" style="background: ${this.getSeverityColor(severity)}20; color: ${this.getSeverityColor(severity)}; border-color: ${this.getSeverityColor(severity)}40;">
                  ${issues.length} 个
                </div>
              </div>
              <div class="scenario-body">
                <div class="issues-list">
                  ${issues.slice(0, 8).map(issue => `
                    <div class="issue-item">
                      <span class="severity-${severity.toLowerCase()}">[${issue.scenario || '未知'}]</span>
                      <span>${issue.description}</span>
                    </div>
                  `).join('')}
                  ${issues.length > 8 ? `<div class="issue-item"><em>... 还有 ${issues.length - 8} 个类似问题</em></div>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  generateRecommendationsHtml(testResults) {
    const recommendations = this.generateRecommendations(testResults);
    
    return `
      <ul class="recommendation-list">
        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    `;
  }

  // 辅助方法
  getScenarioName(index) {
    const names = ['库存管理', '采购工作流', '销售工作流', '数据完整性'];
    return names[index] || `场景${index + 1}`;
  }

  extractScenarioIssues(result) {
    const issues = [];
    
    if (result.summary?.issues) {
      result.summary.issues.forEach(issue => {
        issues.push({
          description: issue,
          severity: 'Medium',
          type: 'Operation Error'
        });
      });
    }
    
    if (result.checks) {
      result.checks.forEach(check => {
        if (check.violations) {
          check.violations.forEach(violation => {
            issues.push({
              description: violation.description,
              severity: violation.severity || 'Medium',
              type: violation.type || 'Data Integrity'
            });
          });
        }
      });
    }
    
    return issues;
  }

  extractAllIssues(testResults) {
    const allIssues = [];
    const scenarioNames = ['库存管理', '采购工作流', '销售工作流', '数据完整性'];
    
    testResults.forEach((result, index) => {
      const scenarioName = scenarioNames[index];
      const scenarioIssues = this.extractScenarioIssues(result);
      
      scenarioIssues.forEach(issue => {
        allIssues.push({
          ...issue,
          scenario: scenarioName
        });
      });
    });
    
    return allIssues;
  }

  groupIssuesBySeverity(issues) {
    return {
      'Critical': issues.filter(i => i.severity === 'Critical'),
      'High': issues.filter(i => i.severity === 'High'),
      'Medium': issues.filter(i => i.severity === 'Medium'),
      'Low': issues.filter(i => i.severity === 'Low')
    };
  }

  getSeverityIcon(severity) {
    const icons = {
      'Critical': '🔴',
      'High': '🟡',
      'Medium': '🟠',
      'Low': '🔵'
    };
    return icons[severity] || '⚪';
  }

  getSeverityColor(severity) {
    const colors = {
      'Critical': '#dc3545',
      'High': '#fd7e14',
      'Medium': '#ffc107',
      'Low': '#6c757d'
    };
    return colors[severity] || '#6c757d';
  }

  generateRecommendations(testResults) {
    const recommendations = [];
    const hasFailures = testResults.some(r => !(r.passed || r.completed));
    
    if (hasFailures) {
      recommendations.push('立即修复Critical级别的问题，特别是数据完整性违规');
      recommendations.push('检查和修复库存管理中的负数问题');
      recommendations.push('完善工作流程中的错误处理机制');
      recommendations.push('建立实时数据一致性监控');
      recommendations.push('加强业务规则验证逻辑');
      recommendations.push('定期执行完整的业务逻辑验证');
    } else {
      recommendations.push('继续保持良好的代码质量');
      recommendations.push('定期运行业务逻辑验证以预防问题');
      recommendations.push('考虑增加更多边界情况的测试');
      recommendations.push('建立持续集成中的自动验证');
    }
    
    return recommendations;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 演示用法
  const { SimpleVerifier } = require('./test-verification.js');
  const { ErrorProneVerifier } = require('./test-verification-with-errors.js');
  
  async function generateDemoReports() {
    const reportGenerator = new TestReportGenerator();
    
    console.log('📊 生成演示测试报告...\n');
    
    // 1. 生成正常测试报告
    console.log('1. 生成正常测试结果报告...');
    const normalVerifier = new SimpleVerifier();
    const normalResults = [
      await normalVerifier.runInventoryTests(),
      await normalVerifier.runPurchaseWorkflowTests(),
      await normalVerifier.runSalesWorkflowTests(),
      await normalVerifier.runDataIntegrityTests()
    ];
    
    await reportGenerator.generateReport(normalResults, 'normal');
    
    // 2. 生成包含错误的测试报告
    console.log('\n2. 生成包含错误的测试结果报告...');
    const errorVerifier = new ErrorProneVerifier();
    const errorResults = [
      await errorVerifier.runInventoryTests(),
      await errorVerifier.runPurchaseWorkflowTests(),
      await errorVerifier.runSalesWorkflowTests(),
      await errorVerifier.runDataIntegrityTests()
    ];
    
    await reportGenerator.generateReport(errorResults, 'with-errors');
    
    console.log('\n✅ 所有演示报告已生成完成！');
  }
  
  generateDemoReports().catch(console.error);
}

module.exports = { TestReportGenerator };