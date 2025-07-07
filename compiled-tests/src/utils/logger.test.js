"use strict";
/**
 * Logger工具单元测试
 */
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
// Mock文件日志服务
const mockFileLoggerService = {
    writeLog: jest.fn().mockResolvedValue(undefined),
    writeLogBatch: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn()
};
// Mock动态导入
jest.mock('../services/logging/fileLoggerService', () => ({
    fileLoggerService: mockFileLoggerService
}));
describe('Logger工具测试', () => {
    let testLogger;
    beforeEach(() => {
        jest.clearAllMocks();
        testLogger = new logger_1.Logger({
            level: logger_1.LogLevel.DEBUG,
            maxLogs: 100,
            enableFileLogging: true,
            enableConsoleOutput: true,
            autoFlushInterval: 0 // 禁用自动刷新用于测试
        });
    });
    afterEach(async () => {
        await testLogger.destroy();
    });
    describe('基础功能测试', () => {
        test('应该正确初始化logger配置', () => {
            const config = testLogger.getConfig();
            expect(config.level).toBe(logger_1.LogLevel.DEBUG);
            expect(config.maxLogs).toBe(100);
            expect(config.enableFileLogging).toBe(true);
            expect(config.enableConsoleOutput).toBe(true);
        });
        test('应该创建具有默认配置的logger', () => {
            const defaultLogger = new logger_1.Logger();
            const config = defaultLogger.getConfig();
            expect(config.level).toBe(logger_1.LogLevel.INFO);
            expect(config.maxLogs).toBe(1000);
            expect(config.enableFileLogging).toBe(true);
            expect(config.enableConsoleOutput).toBe(true);
            expect(config.autoFlushInterval).toBe(30);
            defaultLogger.destroy();
        });
    });
    describe('日志级别测试', () => {
        test('应该记录DEBUG级别日志', () => {
            testLogger.debug('测试debug消息', { test: true });
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(logger_1.LogLevel.DEBUG);
            expect(logs[0].message).toBe('测试debug消息');
            expect(logs[0].data).toEqual({ test: true });
        });
        test('应该记录INFO级别日志', () => {
            testLogger.info('测试info消息', { info: 'data' });
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(logger_1.LogLevel.INFO);
            expect(logs[0].message).toBe('测试info消息');
        });
        test('应该记录WARN级别日志', () => {
            testLogger.warn('测试warn消息');
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(logger_1.LogLevel.WARN);
            expect(logs[0].message).toBe('测试warn消息');
        });
        test('应该记录ERROR级别日志', () => {
            testLogger.error('测试error消息', new Error('测试错误'));
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe(logger_1.LogLevel.ERROR);
            expect(logs[0].message).toBe('测试error消息');
        });
        test('应该包含source信息', () => {
            testLogger.info('测试消息', null, 'TestSource');
            const logs = testLogger.getLogs();
            expect(logs[0].source).toBe('TestSource');
        });
        test('应该包含正确的时间戳', () => {
            const beforeTime = new Date();
            testLogger.info('测试时间戳');
            const afterTime = new Date();
            const logs = testLogger.getLogs();
            expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
            expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        });
    });
    describe('日志级别过滤测试', () => {
        test('应该根据设置的级别过滤日志', () => {
            testLogger.setLevel(logger_1.LogLevel.WARN);
            testLogger.debug('这条不应该被记录');
            testLogger.info('这条也不应该被记录');
            testLogger.warn('这条应该被记录');
            testLogger.error('这条也应该被记录');
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(2);
            expect(logs[0].level).toBe(logger_1.LogLevel.WARN);
            expect(logs[1].level).toBe(logger_1.LogLevel.ERROR);
        });
        test('应该正确过滤getLogs方法的结果', () => {
            testLogger.debug('debug消息');
            testLogger.info('info消息');
            testLogger.warn('warn消息');
            testLogger.error('error消息');
            const debugLogs = testLogger.getLogs(logger_1.LogLevel.DEBUG);
            const infoLogs = testLogger.getLogs(logger_1.LogLevel.INFO);
            const warnLogs = testLogger.getLogs(logger_1.LogLevel.WARN);
            const errorLogs = testLogger.getLogs(logger_1.LogLevel.ERROR);
            expect(debugLogs).toHaveLength(4); // 包含所有级别
            expect(infoLogs).toHaveLength(3); // 不包含DEBUG
            expect(warnLogs).toHaveLength(2); // 只包含WARN和ERROR
            expect(errorLogs).toHaveLength(1); // 只包含ERROR
        });
    });
    describe('批量日志测试', () => {
        test('应该正确处理批量日志记录', () => {
            const entries = [
                { level: logger_1.LogLevel.INFO, message: '批量消息1', data: { id: 1 } },
                { level: logger_1.LogLevel.WARN, message: '批量消息2', data: { id: 2 } },
                { level: logger_1.LogLevel.ERROR, message: '批量消息3', data: { id: 3 } }
            ];
            testLogger.logBatch(entries);
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(3);
            expect(logs[0].message).toBe('批量消息1');
            expect(logs[1].message).toBe('批量消息2');
            expect(logs[2].message).toBe('批量消息3');
        });
        test('应该在批量日志中应用级别过滤', () => {
            testLogger.setLevel(logger_1.LogLevel.WARN);
            const entries = [
                { level: logger_1.LogLevel.DEBUG, message: '不应该记录' },
                { level: logger_1.LogLevel.INFO, message: '也不应该记录' },
                { level: logger_1.LogLevel.WARN, message: '应该记录' },
                { level: logger_1.LogLevel.ERROR, message: '也应该记录' }
            ];
            testLogger.logBatch(entries);
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(2);
            expect(logs[0].level).toBe(logger_1.LogLevel.WARN);
            expect(logs[1].level).toBe(logger_1.LogLevel.ERROR);
        });
        test('应该为批量日志设置正确的时间戳', () => {
            const beforeTime = new Date();
            const entries = [
                { level: logger_1.LogLevel.INFO, message: '消息1' },
                { level: logger_1.LogLevel.INFO, message: '消息2' }
            ];
            testLogger.logBatch(entries);
            const afterTime = new Date();
            const logs = testLogger.getLogs();
            logs.forEach((log) => {
                expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
                expect(log.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
            });
        });
    });
    describe('内存管理测试', () => {
        test('应该维持最大日志数量限制', () => {
            testLogger = new logger_1.Logger({ maxLogs: 3 });
            testLogger.info('消息1');
            testLogger.info('消息2');
            testLogger.info('消息3');
            testLogger.info('消息4'); // 这应该导致消息1被删除
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(3);
            expect(logs[0].message).toBe('消息2');
            expect(logs[1].message).toBe('消息3');
            expect(logs[2].message).toBe('消息4');
        });
        test('应该正确清空日志', () => {
            testLogger.info('消息1');
            testLogger.info('消息2');
            expect(testLogger.getLogCount()).toBe(2);
            testLogger.clearLogs();
            expect(testLogger.getLogCount()).toBe(0);
            expect(testLogger.getLogs()).toHaveLength(0);
        });
    });
    describe('统计信息测试', () => {
        test('应该返回正确的日志统计信息', () => {
            testLogger.debug('debug消息');
            testLogger.info('info消息1');
            testLogger.info('info消息2');
            testLogger.warn('warn消息');
            testLogger.error('error消息');
            const stats = testLogger.getStats();
            expect(stats.totalLogs).toBe(5);
            expect(stats.logsByLevel.DEBUG).toBe(1);
            expect(stats.logsByLevel.INFO).toBe(2);
            expect(stats.logsByLevel.WARN).toBe(1);
            expect(stats.logsByLevel.ERROR).toBe(1);
            expect(stats.memoryUsage).toBeGreaterThan(0);
            expect(stats.oldestLog).toBeInstanceOf(Date);
            expect(stats.newestLog).toBeInstanceOf(Date);
        });
        test('应该正确计算日志时间范围', () => {
            const firstTime = new Date();
            testLogger.info('第一条消息');
            // 等待一小段时间确保时间差
            setTimeout(() => {
                var _a, _b, _c;
                testLogger.info('第二条消息');
                const lastTime = new Date();
                const stats = testLogger.getStats();
                expect((_a = stats.oldestLog) === null || _a === void 0 ? void 0 : _a.getTime()).toBeGreaterThanOrEqual(firstTime.getTime());
                expect((_b = stats.newestLog) === null || _b === void 0 ? void 0 : _b.getTime()).toBeLessThanOrEqual(lastTime.getTime());
                expect((_c = stats.newestLog) === null || _c === void 0 ? void 0 : _c.getTime()).toBeGreaterThanOrEqual(stats.oldestLog.getTime());
            }, 10);
        });
    });
    describe('配置更新测试', () => {
        test('应该正确更新配置', () => {
            const newConfig = {
                level: logger_1.LogLevel.ERROR,
                maxLogs: 50,
                enableConsoleOutput: false
            };
            testLogger.updateConfig(newConfig);
            const config = testLogger.getConfig();
            expect(config.level).toBe(logger_1.LogLevel.ERROR);
            expect(config.maxLogs).toBe(50);
            expect(config.enableConsoleOutput).toBe(false);
        });
        test('应该正确切换控制台输出', () => {
            testLogger.setConsoleOutput(false);
            expect(testLogger.getConfig().enableConsoleOutput).toBe(false);
            testLogger.setConsoleOutput(true);
            expect(testLogger.getConfig().enableConsoleOutput).toBe(true);
        });
    });
    describe('文件日志集成测试', () => {
        test('应该调用文件日志服务写入单条日志', async () => {
            // 等待文件日志服务初始化
            await new Promise(resolve => setTimeout(resolve, 100));
            testLogger.info('测试文件日志');
            // 等待异步写入完成
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(mockFileLoggerService.writeLog).toHaveBeenCalledWith(expect.objectContaining({
                level: logger_1.LogLevel.INFO,
                message: '测试文件日志'
            }));
        });
        test('应该调用文件日志服务写入批量日志', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            const entries = [
                { level: logger_1.LogLevel.INFO, message: '批量消息1' },
                { level: logger_1.LogLevel.WARN, message: '批量消息2' }
            ];
            testLogger.logBatch(entries);
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(mockFileLoggerService.writeLogBatch).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ message: '批量消息1' }),
                expect.objectContaining({ message: '批量消息2' })
            ]));
        });
        test('应该处理文件日志服务错误', async () => {
            mockFileLoggerService.writeLog.mockRejectedValueOnce(new Error('文件写入失败'));
            await new Promise(resolve => setTimeout(resolve, 100));
            testLogger.info('测试错误处理');
            await new Promise(resolve => setTimeout(resolve, 100));
            // 日志应该仍然添加到内存中
            expect(testLogger.getLogs()).toHaveLength(1);
        });
        test('应该正确切换文件日志功能', async () => {
            await testLogger.setFileLogging(false);
            expect(testLogger.getConfig().enableFileLogging).toBe(false);
            await testLogger.setFileLogging(true);
            expect(testLogger.getConfig().enableFileLogging).toBe(true);
        });
        test('应该调用文件日志服务的刷新方法', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await testLogger.flushToFile();
            expect(mockFileLoggerService.flush).toHaveBeenCalled();
        });
    });
    describe('销毁和清理测试', () => {
        test('应该正确销毁logger实例', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await testLogger.destroy();
            expect(mockFileLoggerService.flush).toHaveBeenCalled();
            expect(testLogger.getLogs()).toHaveLength(0);
        });
    });
    describe('默认实例测试', () => {
        test('应该导出可用的默认logger实例', () => {
            expect(logger_1.logger).toBeDefined();
            expect(typeof logger_1.logger.info).toBe('function');
            expect(typeof logger_1.logger.error).toBe('function');
            expect(typeof logger_1.logger.warn).toBe('function');
            expect(typeof logger_1.logger.debug).toBe('function');
        });
        test('默认实例应该正常工作', () => {
            const originalLogCount = logger_1.logger.getLogCount();
            logger_1.logger.info('测试默认实例');
            expect(logger_1.logger.getLogCount()).toBe(originalLogCount + 1);
        });
    });
    describe('边界情况测试', () => {
        test('应该处理null和undefined数据', () => {
            testLogger.info('消息1', null);
            testLogger.info('消息2', undefined);
            testLogger.info('消息3', '');
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(3);
            expect(logs[0].data).toBeNull();
            expect(logs[1].data).toBeUndefined();
            expect(logs[2].data).toBe('');
        });
        test('应该处理复杂对象数据', () => {
            const complexData = {
                nested: { deep: { value: 'test' } },
                array: [1, 2, { item: 'value' }],
                function: () => 'test',
                date: new Date(),
                regexp: /test/g
            };
            testLogger.info('复杂数据测试', complexData);
            const logs = testLogger.getLogs();
            expect(logs[0].data).toBe(complexData);
        });
        test('应该处理循环引用对象', () => {
            const circularObj = { name: 'test' };
            circularObj.self = circularObj;
            expect(() => {
                testLogger.info('循环引用测试', circularObj);
            }).not.toThrow();
            const logs = testLogger.getLogs();
            expect(logs).toHaveLength(1);
        });
        test('应该处理非常长的消息', () => {
            const longMessage = 'a'.repeat(10000);
            testLogger.info(longMessage);
            const logs = testLogger.getLogs();
            expect(logs[0].message).toBe(longMessage);
        });
    });
});
