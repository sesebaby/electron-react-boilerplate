/**
 * 主题系统测试工具
 * 用于验证主题切换功能和CSS变量是否正确工作
 */

export interface ThemeTestResult {
  themeName: string;
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class ThemeSystemTester {
  private static readonly REQUIRED_CSS_VARIABLES = [
    '--app-background',
    '--surface-background',
    '--card-background',
    '--hover-background',
    '--active-background',
    '--text-primary',
    '--text-secondary',
    '--popup-background',
    '--glass-border',
    '--glass-shadow'
  ];

  private static readonly AVAILABLE_THEMES = [
    'glass-future',
    'dark-tech',
    'warm-business',
    'minimal-monochrome'
  ];

  /**
   * 测试所有主题的CSS变量是否正确定义
   */
  static async testAllThemes(): Promise<ThemeTestResult[]> {
    const results: ThemeTestResult[] = [];

    for (const themeName of this.AVAILABLE_THEMES) {
      const _result = await this.testTheme(themeName);
      results.push(result);
    }

    return results;
  }

  /**
   * 测试单个主题
   */
  static async testTheme(themeName: string): Promise<ThemeTestResult> {
    const result: ThemeTestResult = {
      themeName,
      success: true,
      errors: [],
      warnings: []
    };

    try {
      // 应用主题
      document.documentElement.setAttribute('data-theme', themeName);
      
      // 等待CSS变量更新
      await new Promise(resolve => setTimeout(resolve, 100));

      // 检查必需的CSS变量
      const _computedStyle = getComputedStyle(document.documentElement);
      
      for (const variable of this.REQUIRED_CSS_VARIABLES) {
        const _value = computedStyle.getPropertyValue(variable).trim();
        
        if (!value) {
          result.errors.push(`CSS变量 ${variable} 未定义或为空`);
          result.success = false;
        } else if (value === 'initial' || value === 'inherit') {
          result.warnings.push(`CSS变量 ${variable} 值可能不正确: ${value}`);
        }
      }

      // 检查背景色是否正确应用
      const _appBackground = computedStyle.getPropertyValue('--app-background').trim();
      if (!appBackground.includes('gradient') && !appBackground.includes('oklch')) {
        result.warnings.push('应用背景可能不是预期的渐变或oklch颜色');
      }

    } catch (error) {
      result.errors.push(`测试主题 ${themeName} 时发生错误: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * 检查是否存在硬编码颜色
   */
  static checkForHardcodedColors(): string[] {
    const _hardcodedPatterns = [
      /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,
      /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g,
      /#[0-9a-fA-F]{3,6}/g,
      /text-white(?!\/var)/g,
      /bg-red-\d+/g,
      /border-white(?!\/var)/g
    ];

    const issues: string[] = [];
    const _allElements = document.querySelectorAll('*');

    allElements.forEach((element, index) => {
      const _computedStyle = getComputedStyle(element);
      const _className = element.className;

      // 检查类名中的硬编码颜色
      hardcodedPatterns.forEach(pattern => {
        if (typeof className === 'string' && pattern.test(className)) {
          issues.push(`元素 ${index}: 类名包含硬编码颜色 - ${className}`);
        }
      });

      // 检查内联样式中的硬编码颜色
      const _style = (element as HTMLElement).style;
      if (style.color && !style.color.includes('var(')) {
        issues.push(`元素 ${index}: 内联样式包含硬编码颜色 - color: ${style.color}`);
      }
      if (style.backgroundColor && !style.backgroundColor.includes('var(')) {
        issues.push(`元素 ${index}: 内联样式包含硬编码背景色 - backgroundColor: ${style.backgroundColor}`);
      }
    });

    return issues;
  }

  /**
   * 生成测试报告
   */
  static generateReport(results: ThemeTestResult[]): string {
    const _report = '# 主题系统测试报告\n\n';
    
    const _totalThemes = results.length;
    const _successfulThemes = results.filter(r => r.success).length;
    const _failedThemes = results.filter(r => !r.success).length;

    report += `## 总体统计\n`;
    report += `- 测试主题数: ${totalThemes}\n`;
    report += `- 成功: ${successfulThemes}\n`;
    report += `- 失败: ${failedThemes}\n`;
    report += `- 成功率: ${((successfulThemes / totalThemes) * 100).toFixed(1)}%\n\n`;

    results.forEach(result => {
      report += `## 主题: ${result.themeName}\n`;
      report += `状态: ${result.success ? '✅ 通过' : '❌ 失败'}\n\n`;

      if (result.errors.length > 0) {
        report += `### 错误:\n`;
        result.errors.forEach(error => {
          report += `- ${error}\n`;
        });
        report += '\n';
      }

      if (result.warnings.length > 0) {
        report += `### 警告:\n`;
        result.warnings.forEach(warning => {
          report += `- ${warning}\n`;
        });
        report += '\n';
      }
    });

    return report;
  }

  /**
   * 运行完整的主题系统测试
   */
  static async runFullTest(): Promise<void> {
    console.log('🧪 开始主题系统测试...');

    // 测试所有主题
    const _themeResults = await this.testAllThemes();
    
    // 检查硬编码颜色
    const _hardcodedIssues = this.checkForHardcodedColors();
    
    // 生成报告
    const _report = this.generateReport(themeResults);
    
    console.log(report);
    
    if (hardcodedIssues.length > 0) {
      console.warn('⚠️ 发现硬编码颜色问题:');
      hardcodedIssues.slice(0, 10).forEach(issue => console.warn(`  ${issue}`));
      if (hardcodedIssues.length > 10) {
        console.warn(`  ... 还有 ${hardcodedIssues.length - 10} 个问题`);
      }
    }

    const _allSuccess = themeResults.every(r => r.success) && hardcodedIssues.length === 0;
    console.log(allSuccess ? '✅ 主题系统测试全部通过!' : '❌ 主题系统存在问题，请检查上述报告');
  }
}

// 导出便捷函数
export const _testThemeSystem = () => ThemeSystemTester.runFullTest();
