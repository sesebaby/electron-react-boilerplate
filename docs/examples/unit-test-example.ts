/**
 * 单元测试示例
 * 特点：完全隔离，Mock 所有依赖
 */

import { FinancialService } from '../services/FinancialService';

describe('单元测试 - FinancialService', () => {
  it('计算应收账款余额', () => {
    // 创建 Mock 数据库
    const mockDatabase = {
      getAccountsReceivable: jest.fn().mockResolvedValue([
        { id: '1', amount: 1000, receivedAmount: 300 },
        { id: '2', amount: 2000, receivedAmount: 500 }
      ])
    };
    
    // 测试纯逻辑
    const service = new FinancialService(mockDatabase);
    const balance = service.calculateTotalBalance();
    
    expect(balance).toBe(2200); // (1000-300) + (2000-500)
  });
});

// ✅ 优点：
// - 运行快速（毫秒级）
// - 不依赖外部环境
// - 容易定位问题

// ❌ 缺点：
// - 无法发现真实环境的问题
// - Mock 可能与实际不符
// - 无法测试组件间的配合