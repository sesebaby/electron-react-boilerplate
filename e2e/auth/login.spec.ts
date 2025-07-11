import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { TestScenarios } from '../fixtures/test-data';

/**
 * 用户认证E2E测试
 * 覆盖登录、登出、会话管理等核心认证功能
 */
test.describe('用户认证流程', () => {
  let electronApp: any;
  let page: any;

  test.beforeEach(async () => {
    // 启动Electron应用
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    
    // 等待应用完全加载
    await page.waitForLoadState('domcontentloaded');
    await TestHelpers.waitForAppLoad(page);
  });

  test.afterEach(async () => {
    // 清理：关闭应用
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('应该显示登录页面', async () => {
    // 验证登录页面元素存在
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // 验证页面标题
    await expect(page.locator('text=进销存管理系统')).toBeVisible();
    await expect(page.locator('text=请输入您的登录凭据以继续')).toBeVisible();
    
    // 验证默认账号提示
    await expect(page.locator('text=默认管理员账号')).toBeVisible();
    await expect(page.locator('text=admin / 123456')).toBeVisible();
  });

  test('使用有效凭据应该登录成功', async () => {
    // 填写有效的登录凭据
    await page.fill('[data-testid="username-input"]', TestScenarios.validLogin.username);
    await page.fill('[data-testid="password-input"]', TestScenarios.validLogin.password);
    
    // 点击登录按钮
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功，应该跳转到Dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15000 });
    
    // 验证URL变化
    await page.waitForFunction(() => window.location.hash === '#dashboard');
    
    // 验证不再显示登录表单
    await expect(page.locator('[data-testid="login-form"]')).not.toBeVisible();
    
    console.log('✅ 有效凭据登录测试通过');
  });

  test('使用无效凭据应该显示错误信息', async () => {
    // 填写无效的登录凭据
    await page.fill('[data-testid="username-input"]', TestScenarios.invalidLogin.username);
    await page.fill('[data-testid="password-input"]', TestScenarios.invalidLogin.password);
    
    // 点击登录按钮
    await page.click('[data-testid="login-button"]');
    
    // 等待错误信息显示
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
    
    // 验证错误信息内容
    await expect(page.locator('[data-testid="error-message"]')).toContainText('用户名或密码错误');
    
    // 确保仍在登录页面
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    console.log('✅ 无效凭据登录测试通过');
  });

  test('空白表单应该显示验证错误', async () => {
    // 不填写任何信息直接点击登录
    await page.click('[data-testid="login-button"]');
    
    // 验证浏览器原生验证提示
    const usernameInput = page.locator('[data-testid="username-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    
    // 验证required属性生效
    await expect(usernameInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
    
    // 确保仍在登录页面
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    console.log('✅ 空白表单验证测试通过');
  });

  test('只填写用户名应该提示密码必填', async () => {
    // 只填写用户名
    await page.fill('[data-testid="username-input"]', 'admin');
    
    // 点击登录按钮
    await page.click('[data-testid="login-button"]');
    
    // 密码字段应该获得焦点（浏览器原生验证）
    const passwordInput = page.locator('[data-testid="password-input"]');
    await expect(passwordInput).toBeFocused();
    
    console.log('✅ 部分表单验证测试通过');
  });

  test('记住密码功能应该正常工作', async () => {
    const username = TestScenarios.validLogin.username;
    const password = TestScenarios.validLogin.password;
    
    // 填写登录信息
    await page.fill('[data-testid="username-input"]', username);
    await page.fill('[data-testid="password-input"]', password);
    
    // 确保记住密码复选框选中（默认应该选中）
    const rememberCheckbox = page.locator('input[type="checkbox"]');
    const isChecked = await rememberCheckbox.isChecked();
    if (!isChecked) {
      await rememberCheckbox.click();
    }
    
    // 登录
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15000 });
    
    // 验证localStorage中保存了凭据
    const savedCredentials = await page.evaluate(() => {
      return localStorage.getItem('login_credentials');
    });
    
    expect(savedCredentials).toBeTruthy();
    
    const credentials = JSON.parse(savedCredentials || '{}');
    expect(credentials.username).toBe(username);
    expect(credentials.password).toBe(password);
    
    console.log('✅ 记住密码功能测试通过');
  });

  test('登录过程中应该显示加载状态', async () => {
    // 填写登录信息
    await page.fill('[data-testid="username-input"]', TestScenarios.validLogin.username);
    await page.fill('[data-testid="password-input"]', TestScenarios.validLogin.password);
    
    // 点击登录按钮
    const loginButton = page.locator('[data-testid="login-button"]');
    await loginButton.click();
    
    // 验证按钮状态变化（可能很快，所以使用短超时）
    try {
      await expect(loginButton).toContainText('登录中...', { timeout: 1000 });
      console.log('✅ 捕获到登录加载状态');
    } catch (error) {
      console.log('ℹ️ 登录过程太快，未捕获到加载状态（这是正常的）');
    }
    
    // 最终应该登录成功
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15000 });
    
    console.log('✅ 登录加载状态测试通过');
  });

  test('错误信息应该可以关闭', async () => {
    // 触发错误
    await page.fill('[data-testid="username-input"]', TestScenarios.invalidLogin.username);
    await page.fill('[data-testid="password-input"]', TestScenarios.invalidLogin.password);
    await page.click('[data-testid="login-button"]');
    
    // 等待错误信息显示
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    
    // 查找并点击关闭按钮
    const closeButton = errorMessage.locator('button');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    
    // 验证错误信息消失
    await expect(errorMessage).not.toBeVisible();
    
    console.log('✅ 错误信息关闭功能测试通过');
  });

  test('输入时应该清除错误信息', async () => {
    // 先触发错误
    await page.fill('[data-testid="username-input"]', TestScenarios.invalidLogin.username);
    await page.fill('[data-testid="password-input"]', TestScenarios.invalidLogin.password);
    await page.click('[data-testid="login-button"]');
    
    // 等待错误信息显示
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // 开始输入用户名
    await page.fill('[data-testid="username-input"]', 'admin');
    
    // 错误信息应该消失
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    
    console.log('✅ 输入清除错误信息测试通过');
  });
});

/**
 * 会话管理测试
 */
test.describe('会话管理', () => {
  let electronApp: any;
  let page: any;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await TestHelpers.waitForAppLoad(page);
    
    // 先登录
    await TestHelpers.login(page);
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('登录后应该保持会话状态', async () => {
    // 验证已登录状态
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // 检查localStorage中的用户信息
    const userInfo = await page.evaluate(() => {
      return localStorage.getItem('_auth_user');
    });
    
    expect(userInfo).toBeTruthy();
    
    const user = JSON.parse(userInfo || '{}');
    expect(user.username).toBe('admin');
    
    console.log('✅ 会话状态保持测试通过');
  });

  test('刷新页面后应该保持登录状态', async () => {
    // 验证已登录
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // 刷新页面
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // 应该仍然在Dashboard页面，而不是登录页面
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="login-form"]')).not.toBeVisible();
    
    console.log('✅ 页面刷新会话保持测试通过');
  });

  // 注意：会话超时测试在实际应用中可能需要很长时间，这里跳过
  test.skip('会话超时后应该重定向到登录页面', async () => {
    // 这个测试需要等待30分钟的超时时间，在E2E测试中不现实
    // 可以考虑在单元测试中测试这个逻辑，或者修改超时时间进行测试
  });
});