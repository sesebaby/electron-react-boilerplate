/**
 * 响应式设计测试工具
 * 用于检查和验证响应式设计的实现
 */

export interface ResponsiveTestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  breakpointTests: BreakpointTestResult[];
  touchFriendlyTests: TouchFriendlyTestResult[];
  performanceTests: PerformanceTestResult[];
}

export interface BreakpointTestResult {
  breakpoint: string;
  width: number;
  passed: boolean;
  issues: string[];
}

export interface TouchFriendlyTestResult {
  element: string;
  minSize: { width: number; height: number };
  actualSize: { width: number; height: number };
  passed: boolean;
}

export interface PerformanceTestResult {
  metric: string;
  value: number;
  threshold: number;
  passed: boolean;
}

export class ResponsiveDesignTester {
  private static readonly BREAKPOINTS = {
    mobile: 320,
    mobileLarge: 480,
    tablet: 768,
    desktop: 1024,
    desktopLarge: 1280,
    desktopXL: 1920
  };

  private static readonly TOUCH_TARGET_MIN_SIZE = 44; // 44px minimum touch target

  /**
   * 运行完整的响应式设计测试
   */
  static async runFullTest(): Promise<ResponsiveTestResult> {
    const result: ResponsiveTestResult = {
      success: true,
      errors: [],
      warnings: [],
      breakpointTests: [],
      touchFriendlyTests: [],
      performanceTests: []
    };

    try {
      // 测试断点响应
      result.breakpointTests = await this.testBreakpoints();
      
      // 测试触摸友好性
      result.touchFriendlyTests = this.testTouchFriendly();
      
      // 测试性能
      result.performanceTests = this.testPerformance();

      // 检查是否有失败的测试
      const hasFailures = [
        ...result.breakpointTests,
        ...result.touchFriendlyTests,
        ...result.performanceTests
      ].some(test => !test.passed);

      if (hasFailures) {
        result.success = false;
        result.errors.push('部分响应式设计测试失败');
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`测试过程中发生错误: ${error}`);
    }

    return result;
  }

  /**
   * 测试不同断点下的响应式表现
   */
  private static async testBreakpoints(): Promise<BreakpointTestResult[]> {
    const results: BreakpointTestResult[] = [];

    for (const [name, width] of Object.entries(this.BREAKPOINTS)) {
      const result: BreakpointTestResult = {
        breakpoint: name,
        width,
        passed: true,
        issues: []
      };

      // 模拟设置视口宽度
      this.setViewportWidth(width);
      
      // 等待布局更新
      await new Promise(resolve => setTimeout(resolve, 100));

      // 检查导航栏适配
      const navIssues = this.checkNavigationResponsive(width);
      result.issues.push(...navIssues);

      // 检查表格适配
      const tableIssues = this.checkTableResponsive(width);
      result.issues.push(...tableIssues);

      // 检查模态框适配
      const modalIssues = this.checkModalResponsive(width);
      result.issues.push(...modalIssues);

      // 检查表单适配
      const formIssues = this.checkFormResponsive(width);
      result.issues.push(...formIssues);

      if (result.issues.length > 0) {
        result.passed = false;
      }

      results.push(result);
    }

    return results;
  }

  /**
   * 测试触摸友好性
   */
  private static testTouchFriendly(): TouchFriendlyTestResult[] {
    const results: TouchFriendlyTestResult[] = [];
    
    // 检查所有可点击元素
    const clickableElements = document.querySelectorAll('button, [role="button"], a, input[type="submit"], input[type="button"]');
    
    clickableElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const result: TouchFriendlyTestResult = {
        element: `${element.tagName.toLowerCase()}[${index}]`,
        minSize: { width: this.TOUCH_TARGET_MIN_SIZE, height: this.TOUCH_TARGET_MIN_SIZE },
        actualSize: { width: rect.width, height: rect.height },
        passed: rect.width >= this.TOUCH_TARGET_MIN_SIZE && rect.height >= this.TOUCH_TARGET_MIN_SIZE
      };
      
      results.push(result);
    });

    return results;
  }

  /**
   * 测试性能指标
   */
  private static testPerformance(): PerformanceTestResult[] {
    const results: PerformanceTestResult[] = [];

    // 检查动画性能
    const animationElements = document.querySelectorAll('[class*="animate"], [class*="transition"]');
    results.push({
      metric: 'Animation Elements Count',
      value: animationElements.length,
      threshold: 50, // 建议不超过50个动画元素
      passed: animationElements.length <= 50
    });

    // 检查模糊效果元素
    const blurElements = document.querySelectorAll('[class*="blur"], [style*="blur"]');
    results.push({
      metric: 'Blur Effects Count',
      value: blurElements.length,
      threshold: 20, // 建议不超过20个模糊效果
      passed: blurElements.length <= 20
    });

    // 检查DOM元素数量
    const totalElements = document.querySelectorAll('*').length;
    results.push({
      metric: 'Total DOM Elements',
      value: totalElements,
      threshold: 1500, // 建议不超过1500个元素
      passed: totalElements <= 1500
    });

    return results;
  }

  /**
   * 设置视口宽度（仅用于测试）
   */
  private static setViewportWidth(width: number): void {
    // 在实际应用中，这个方法会通过开发者工具或测试框架来实现
    // 这里只是模拟实现
    document.documentElement.style.width = `${width}px`;
  }

  /**
   * 检查导航栏响应式
   */
  private static checkNavigationResponsive(width: number): string[] {
    const issues: string[] = [];
    
    const sidebar = document.querySelector('.sidebar, [class*="sidebar"]');
    const topbar = document.querySelector('.topbar, [class*="topbar"]');
    
    if (width <= 768) {
      // 移动端检查
      if (sidebar && !sidebar.classList.contains('hidden') && !sidebar.classList.contains('-translate-x-full')) {
        issues.push('移动端侧边栏应该隐藏或使用抽屉式显示');
      }
      
      if (topbar) {
        const rect = topbar.getBoundingClientRect();
        if (rect.height > 80) {
          issues.push('移动端顶部导航栏高度过高');
        }
      }
    }

    return issues;
  }

  /**
   * 检查表格响应式
   */
  private static checkTableResponsive(width: number): string[] {
    const issues: string[] = [];
    
    const tables = document.querySelectorAll('table, [class*="table"]');
    
    tables.forEach((table, index) => {
      const rect = table.getBoundingClientRect();
      
      if (width <= 768 && rect.width > width) {
        issues.push(`表格[${index}]在移动端宽度超出视口`);
      }
      
      if (width <= 480 && rect.height > window.innerHeight * 0.6) {
        issues.push(`表格[${index}]在小屏幕下高度过高`);
      }
    });

    return issues;
  }

  /**
   * 检查模态框响应式
   */
  private static checkModalResponsive(width: number): string[] {
    const issues: string[] = [];
    
    const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="dialog"]');
    
    modals.forEach((modal, index) => {
      const rect = modal.getBoundingClientRect();
      
      if (width <= 768) {
        if (rect.width > width * 0.95) {
          issues.push(`模态框[${index}]在移动端宽度过大`);
        }
        
        if (rect.height > window.innerHeight * 0.9) {
          issues.push(`模态框[${index}]在移动端高度过大`);
        }
      }
    });

    return issues;
  }

  /**
   * 检查表单响应式
   */
  private static checkFormResponsive(width: number): string[] {
    const issues: string[] = [];
    
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input, select, textarea, button');
      
      inputs.forEach((input, inputIndex) => {
        const rect = input.getBoundingClientRect();
        
        if (width <= 768 && rect.height < 44) {
          issues.push(`表单[${index}]输入框[${inputIndex}]在移动端高度不足44px`);
        }
      });
    });

    return issues;
  }

  /**
   * 生成测试报告
   */
  static generateReport(result: ResponsiveTestResult): string {
    let report = '# 响应式设计测试报告\n\n';
    
    report += `## 总体结果: ${result.success ? '✅ 通过' : '❌ 失败'}\n\n`;
    
    if (result.errors.length > 0) {
      report += '## 错误\n';
      result.errors.forEach(error => {
        report += `- ❌ ${error}\n`;
      });
      report += '\n';
    }
    
    if (result.warnings.length > 0) {
      report += '## 警告\n';
      result.warnings.forEach(warning => {
        report += `- ⚠️ ${warning}\n`;
      });
      report += '\n';
    }
    
    // 断点测试结果
    report += '## 断点测试结果\n';
    result.breakpointTests.forEach(test => {
      report += `### ${test.breakpoint} (${test.width}px) - ${test.passed ? '✅' : '❌'}\n`;
      if (test.issues.length > 0) {
        test.issues.forEach(issue => {
          report += `- ${issue}\n`;
        });
      }
      report += '\n';
    });
    
    // 触摸友好性测试结果
    report += '## 触摸友好性测试\n';
    const failedTouchTests = result.touchFriendlyTests.filter(test => !test.passed);
    if (failedTouchTests.length > 0) {
      report += `发现 ${failedTouchTests.length} 个元素不符合触摸友好标准:\n`;
      failedTouchTests.forEach(test => {
        report += `- ${test.element}: ${test.actualSize.width}x${test.actualSize.height}px (需要: ${test.minSize.width}x${test.minSize.height}px)\n`;
      });
    } else {
      report += '✅ 所有交互元素都符合触摸友好标准\n';
    }
    report += '\n';
    
    // 性能测试结果
    report += '## 性能测试结果\n';
    result.performanceTests.forEach(test => {
      report += `- ${test.metric}: ${test.value} (阈值: ${test.threshold}) ${test.passed ? '✅' : '❌'}\n`;
    });
    
    return report;
  }
}

// 导出便捷方法
export const testResponsiveDesign = () => ResponsiveDesignTester.runFullTest();
export const generateResponsiveReport = (result: ResponsiveTestResult) => ResponsiveDesignTester.generateReport(result);
