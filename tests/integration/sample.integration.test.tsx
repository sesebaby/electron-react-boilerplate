/**
 * 示例集成测试
 * 验证集成测试环境配置正确
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

// 简单的测试组件
const TestComponent = () => {
  return (
    <div>
      <h1>集成测试组件</h1>
      <p>这是一个用于验证集成测试环境的组件</p>
    </div>
  );
};

describe('集成测试环境验证', () => {
  test('应该能正常渲染React组件', () => {
    render(<TestComponent />);
    
    expect(screen.getByText('集成测试组件')).toBeInTheDocument();
    expect(screen.getByText('这是一个用于验证集成测试环境的组件')).toBeInTheDocument();
  });

  test('应该能访问模拟的electronAPI', () => {
    expect(window.electronAPI).toBeDefined();
    expect(window.electronAPI.invoke).toBeDefined();
    expect(window.electronAPI.on).toBeDefined();
  });

  test('应该设置了正确的测试环境变量', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.TEST_MODE).toBe('true');
  });

  test('应该能正常运行异步测试', async () => {
    const asyncOperation = () => 
      new Promise(resolve => setTimeout(() => resolve('success'), 100));
    
    const result = await asyncOperation();
    expect(result).toBe('success');
  });
});

describe('数据库Mock验证', () => {
  test('应该能导入better-sqlite3 mock', () => {
    const Database = require('better-sqlite3');
    expect(Database).toBeDefined();
    
    const db = new Database(':memory:');
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
    expect(typeof db.exec).toBe('function');
  });

  test('应该能运行模拟的数据库操作', () => {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    
    const stmt = db.prepare('SELECT * FROM test_table');
    const result = stmt.get();
    
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});

// 测试清理
afterAll(() => {
  console.log('✅ 集成测试样例执行完成');
});