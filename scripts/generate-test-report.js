const fs = require('fs');
const path = require('path');

/**
 * 测试报告生成脚本
 * 整合各种测试结果，生成统一的测试报告
 */

class TestReportGenerator {
  constructor() {
    this.testResultsDir = path.join(__dirname, '../test-results');
    this.reportOutputDir = path.join(__dirname, '../test-reports');
    this.timestamp = new Date().toISOString();
  }

  /**
   * 生成完整的测试报告
   */
  async generateReport() {
    console.log('🚀 开始生成测试报告...');

    try {
      // 确保输出目录存在
      this.ensureDirectoryExists(this.reportOutputDir);

      // 收集测试结果
      const testResults = await this.collectTestResults();

      // 生成HTML报告
      await this.generateHtmlReport(testResults);

      // 生成JSON报告
      await this.generateJsonReport(testResults);

      // 生成Markdown报告
      await this.generateMarkdownReport(testResults);

      // 生成覆盖率报告
      await this.generateCoverageReport();

      console.log('✅ 测试报告生成完成');
      console.log(`📁 报告位置: ${this.reportOutputDir}`);

    } catch (error) {
      console.error('❌ 测试报告生成失败:', error);
      process.exit(1);
    }
  }

  /**
   * 收集所有测试结果
   */
  async collectTestResults() {
    const results = {
      summary: {
        timestamp: this.timestamp,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        passRate: 0
      },
      categories: {
        unit: { tests: [], summary: this.createCategorySummary() },
        integration: { tests: [], summary: this.createCategorySummary() },
        e2e: { tests: [], summary: this.createCategorySummary() },
        performance: { tests: [], summary: this.createCategorySummary() }
      },
      coverage: null,
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: this.timestamp
      }
    };

    // 收集Playwright测试结果
    await this.collectPlaywrightResults(results);

    // 收集Jest测试结果
    await this.collectJestResults(results);

    // 计算总体统计
    this.calculateOverallSummary(results);

    return results;
  }

  /**
   * 收集Playwright测试结果
   */
  async collectPlaywrightResults(results) {
    const playwrightResultsPath = path.join(this.testResultsDir, 'results.json');
    
    if (fs.existsSync(playwrightResultsPath)) {
      try {
        const playwrightData = JSON.parse(fs.readFileSync(playwrightResultsPath, 'utf8'));
        
        playwrightData.suites?.forEach(suite => {
          suite.specs?.forEach(spec => {
            const category = this.categorizeTest(spec.title);
            const testResult = {
              name: spec.title,
              status: spec.tests[0]?.results[0]?.status || 'unknown',
              duration: spec.tests[0]?.results[0]?.duration || 0,
              error: spec.tests[0]?.results[0]?.error?.message,
              file: spec.file
            };

            results.categories[category].tests.push(testResult);
            this.updateCategorySummary(results.categories[category].summary, testResult);
          });
        });
      } catch (error) {
        console.warn('警告: 无法解析Playwright测试结果:', error.message);
      }
    }
  }

  /**
   * 收集Jest测试结果
   */
  async collectJestResults(results) {
    const jestResultsPath = path.join(this.testResultsDir, 'jest-results.json');
    
    if (fs.existsSync(jestResultsPath)) {
      try {
        const jestData = JSON.parse(fs.readFileSync(jestResultsPath, 'utf8'));
        
        jestData.testResults?.forEach(testFile => {
          testFile.assertionResults?.forEach(test => {
            const testResult = {
              name: test.title,
              status: test.status,
              duration: test.duration || 0,
              error: test.failureMessages?.join('\n'),
              file: testFile.name
            };

            results.categories.unit.tests.push(testResult);
            this.updateCategorySummary(results.categories.unit.summary, testResult);
          });
        });
      } catch (error) {
        console.warn('警告: 无法解析Jest测试结果:', error.message);
      }
    }
  }

  /**
   * 分类测试
   */
  categorizeTest(testTitle) {
    if (testTitle.includes('性能') || testTitle.includes('performance')) {
      return 'performance';
    } else if (testTitle.includes('集成') || testTitle.includes('integration')) {
      return 'integration';
    } else if (testTitle.includes('E2E') || testTitle.includes('端到端')) {
      return 'e2e';
    } else {
      return 'unit';
    }
  }

  /**
   * 创建分类摘要
   */
  createCategorySummary() {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      passRate: 0
    };
  }

  /**
   * 更新分类摘要
   */
  updateCategorySummary(summary, testResult) {
    summary.total++;
    summary.duration += testResult.duration;

    switch (testResult.status) {
      case 'passed':
        summary.passed++;
        break;
      case 'failed':
        summary.failed++;
        break;
      case 'skipped':
        summary.skipped++;
        break;
    }

    summary.passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(2) : 0;
  }

  /**
   * 计算总体摘要
   */
  calculateOverallSummary(results) {
    Object.values(results.categories).forEach(category => {
      results.summary.totalTests += category.summary.total;
      results.summary.passedTests += category.summary.passed;
      results.summary.failedTests += category.summary.failed;
      results.summary.skippedTests += category.summary.skipped;
      results.summary.duration += category.summary.duration;
    });

    results.summary.passRate = results.summary.totalTests > 0 
      ? (results.summary.passedTests / results.summary.totalTests * 100).toFixed(2) 
      : 0;
  }

  /**
   * 生成HTML报告
   */
  async generateHtmlReport(results) {
    const htmlContent = this.generateHtmlContent(results);
    const htmlPath = path.join(this.reportOutputDir, 'test-report.html');
    
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`📄 HTML报告已生成: ${htmlPath}`);
  }

  /**
   * 生成HTML内容
   */
  generateHtmlContent(results) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - 进销存管理系统</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .categories { padding: 0 30px 30px; }
        .category { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .category-header { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; }
        .test-list { max-height: 300px; overflow-y: auto; }
        .test-item { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .test-passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test-skipped { background: #fff3cd; border-left: 4px solid #ffc107; }
        .error { color: #dc3545; font-size: 0.9em; margin-top: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 测试报告</h1>
            <p>进销存管理系统 - ${results.summary.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${results.summary.totalTests}</div>
                <div class="metric-label">总测试数</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #28a745">${results.summary.passedTests}</div>
                <div class="metric-label">通过</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #dc3545">${results.summary.failedTests}</div>
                <div class="metric-label">失败</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #ffc107">${results.summary.skippedTests}</div>
                <div class="metric-label">跳过</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.summary.passRate}%</div>
                <div class="metric-label">通过率</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(results.summary.duration / 1000).toFixed(1)}s</div>
                <div class="metric-label">总耗时</div>
            </div>
        </div>
        
        <div class="categories">
            ${Object.entries(results.categories).map(([name, category]) => `
                <div class="category">
                    <div class="category-header">
                        ${this.getCategoryDisplayName(name)} 
                        (${category.summary.passed}/${category.summary.total} 通过, ${category.summary.passRate}%)
                    </div>
                    <div class="test-list">
                        ${category.tests.map(test => `
                            <div class="test-item test-${test.status}">
                                <strong>${test.name}</strong>
                                <span style="float: right;">${test.duration}ms</span>
                                ${test.error ? `<div class="error">${test.error}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 获取分类显示名称
   */
  getCategoryDisplayName(category) {
    const names = {
      unit: '单元测试',
      integration: '集成测试',
      e2e: '端到端测试',
      performance: '性能测试'
    };
    return names[category] || category;
  }

  /**
   * 生成JSON报告
   */
  async generateJsonReport(results) {
    const jsonPath = path.join(this.reportOutputDir, 'test-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`📄 JSON报告已生成: ${jsonPath}`);
  }

  /**
   * 生成Markdown报告
   */
  async generateMarkdownReport(results) {
    const markdownContent = this.generateMarkdownContent(results);
    const markdownPath = path.join(this.reportOutputDir, 'test-report.md');
    
    fs.writeFileSync(markdownPath, markdownContent);
    console.log(`📄 Markdown报告已生成: ${markdownPath}`);
  }

  /**
   * 生成Markdown内容
   */
  generateMarkdownContent(results) {
    return `# 测试报告 - 进销存管理系统

## 📊 测试摘要

- **执行时间**: ${results.summary.timestamp}
- **总测试数**: ${results.summary.totalTests}
- **通过**: ${results.summary.passedTests} ✅
- **失败**: ${results.summary.failedTests} ❌
- **跳过**: ${results.summary.skippedTests} ⏭️
- **通过率**: ${results.summary.passRate}%
- **总耗时**: ${(results.summary.duration / 1000).toFixed(1)}秒

## 📋 分类详情

${Object.entries(results.categories).map(([name, category]) => `
### ${this.getCategoryDisplayName(name)}

- 总数: ${category.summary.total}
- 通过: ${category.summary.passed}
- 失败: ${category.summary.failed}
- 跳过: ${category.summary.skipped}
- 通过率: ${category.summary.passRate}%
- 耗时: ${(category.summary.duration / 1000).toFixed(1)}秒

${category.tests.length > 0 ? `
#### 测试详情

${category.tests.map(test => `
- ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'} **${test.name}** (${test.duration}ms)${test.error ? `\n  \`\`\`\n  ${test.error}\n  \`\`\`` : ''}
`).join('')}
` : ''}
`).join('')}

## 🔧 环境信息

- **平台**: ${results.environment.platform}
- **Node版本**: ${results.environment.nodeVersion}
- **生成时间**: ${results.environment.timestamp}

---
*此报告由自动化测试系统生成*
`;
  }

  /**
   * 生成覆盖率报告
   */
  async generateCoverageReport() {
    const coveragePath = path.join(__dirname, '../coverage');
    if (fs.existsSync(coveragePath)) {
      console.log(`📊 覆盖率报告位置: ${coveragePath}`);
    }
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

// 执行报告生成
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateReport().catch(console.error);
}

module.exports = TestReportGenerator;
