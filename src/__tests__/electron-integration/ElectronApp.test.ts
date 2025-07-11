/**
 * Electron 应用集成测试
 * 测试主进程和渲染进程的交互
 */

import { Application } from 'spectron';
import * as path from 'path';

describe('Electron 应用集成测试', () => {
  let app: Application;

  beforeEach(async () => {
    // 启动 Electron 应用
    app = new Application({
      path: require('electron'),
      args: [path.join(__dirname, '../../../public/main.js')],
      env: {
        NODE_ENV: 'test'
      }
    });

    await app.start();
  });

  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('应该创建窗口', async () => {
    const count = await app.client.getWindowCount();
    expect(count).toBe(1);
  });

  it('应该能够通过 IPC 通信', async () => {
    // 测试 IPC 通信
    const result = await app.client.execute(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        window.api.invoke('test-ping').then(resolve);
      });
    });

    expect(result).toBeDefined();
  });
});