"use strict";
/**
 * 增强的日志工具
 * 支持控制台输出、文件存储和内存缓存
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * 增强的日志记录器
 */
class Logger {
    constructor(config) {
        this.logs = [];
        this.fileLoggerService = null;
        this.autoFlushTimer = null;
        this.config = {
            level: LogLevel.INFO,
            maxLogs: 1000,
            enableFileLogging: true,
            enableConsoleOutput: true,
            autoFlushInterval: 30, // 30秒
            ...config
        };
        // 在初始化时保存原始的console方法
        this.originalConsole = {
            debug: console.debug.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        };
        this.initializeFileLogging();
        this.startAutoFlush();
    }
    /**
     * 初始化文件日志功能
     */
    async initializeFileLogging() {
        if (!this.config.enableFileLogging) {
            return;
        }
        try {
            // 动态导入文件日志服务
            const { fileLoggerService } = await Promise.resolve().then(() => require('../services/logging/fileLoggerService'));
            this.fileLoggerService = fileLoggerService;
        }
        catch (error) {
            console.warn('日志记录器: 无法加载文件日志服务，仅使用控制台输出', error);
            this.config.enableFileLogging = false;
        }
    }
    /**
     * 开始自动刷新定时器
     */
    startAutoFlush() {
        if (this.config.autoFlushInterval > 0) {
            this.autoFlushTimer = setInterval(() => {
                this.flushToFile().catch(console.error);
            }, this.config.autoFlushInterval * 1000);
        }
    }
    /**
     * 设置日志级别
     */
    setLevel(level) {
        this.config.level = level;
    }
    /**
     * 更新配置
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // 重新初始化如果需要
        if (config.enableFileLogging !== undefined) {
            this.initializeFileLogging();
        }
        // 重新启动自动刷新
        if (config.autoFlushInterval !== undefined) {
            if (this.autoFlushTimer) {
                clearInterval(this.autoFlushTimer);
            }
            this.startAutoFlush();
        }
    }
    /**
     * 核心日志记录方法
     */
    log(level, message, data, source) {
        if (level >= this.config.level) {
            const entry = {
                timestamp: new Date(),
                level,
                message,
                data,
                source
            };
            // 添加到内存缓存
            this.logs.push(entry);
            // 保持日志数量在限制内
            if (this.logs.length > this.config.maxLogs) {
                this.logs.shift();
            }
            // 输出到控制台
            if (this.config.enableConsoleOutput) {
                this.outputToConsole(entry);
            }
            // 写入文件（异步）
            if (this.config.enableFileLogging && this.fileLoggerService) {
                this.fileLoggerService.writeLog(entry).catch((error) => {
                    this.originalConsole.error('文件日志写入失败:', error);
                });
            }
        }
    }
    outputToConsole(entry) {
        const timestamp = entry.timestamp.toISOString();
        const levelName = LogLevel[entry.level];
        const prefix = `[${timestamp}] [${levelName}]`;
        // 使用原始的console方法，避免与其他模块的console重写产生循环调用
        switch (entry.level) {
            case LogLevel.DEBUG:
                this.originalConsole.debug(prefix, entry.message, entry.data || '');
                break;
            case LogLevel.INFO:
                this.originalConsole.info(prefix, entry.message, entry.data || '');
                break;
            case LogLevel.WARN:
                this.originalConsole.warn(prefix, entry.message, entry.data || '');
                break;
            case LogLevel.ERROR:
                this.originalConsole.error(prefix, entry.message, entry.data || '');
                break;
        }
    }
    /**
     * Debug级别日志
     */
    debug(message, data, source) {
        this.log(LogLevel.DEBUG, message, data, source);
    }
    /**
     * Info级别日志
     */
    info(message, data, source) {
        this.log(LogLevel.INFO, message, data, source);
    }
    /**
     * Warning级别日志
     */
    warn(message, data, source) {
        this.log(LogLevel.WARN, message, data, source);
    }
    /**
     * Error级别日志
     */
    error(message, data, source) {
        this.log(LogLevel.ERROR, message, data, source);
    }
    /**
     * 批量记录日志
     */
    logBatch(entries) {
        const logEntries = entries.map(entry => ({
            ...entry,
            timestamp: new Date()
        }));
        // 过滤日志级别
        const filteredEntries = logEntries.filter(entry => entry.level >= this.config.level);
        // 添加到内存缓存
        this.logs.push(...filteredEntries);
        // 保持日志数量在限制内
        while (this.logs.length > this.config.maxLogs) {
            this.logs.shift();
        }
        // 输出到控制台
        if (this.config.enableConsoleOutput) {
            filteredEntries.forEach(entry => this.outputToConsole(entry));
        }
        // 批量写入文件
        if (this.config.enableFileLogging && this.fileLoggerService && filteredEntries.length > 0) {
            this.fileLoggerService.writeLogBatch(filteredEntries).catch((error) => {
                console.error('批量文件日志写入失败:', error);
            });
        }
    }
    /**
     * 获取日志列表
     */
    getLogs(level) {
        if (level !== undefined) {
            return this.logs.filter(log => log.level >= level);
        }
        return [...this.logs];
    }
    /**
     * 清空内存日志
     */
    clearLogs() {
        this.logs = [];
    }
    /**
     * 获取日志数量
     */
    getLogCount() {
        return this.logs.length;
    }
    /**
     * 手动刷新到文件
     */
    async flushToFile() {
        if (this.fileLoggerService) {
            try {
                await this.fileLoggerService.flush();
            }
            catch (error) {
                console.error('手动刷新日志失败:', error);
            }
        }
    }
    /**
     * 获取日志统计信息
     */
    getStats() {
        var _a, _b;
        const logsByLevel = {
            DEBUG: 0,
            INFO: 0,
            WARN: 0,
            ERROR: 0
        };
        this.logs.forEach(log => {
            const levelName = LogLevel[log.level];
            logsByLevel[levelName] = (logsByLevel[levelName] || 0) + 1;
        });
        const sortedLogs = [...this.logs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return {
            totalLogs: this.logs.length,
            logsByLevel,
            memoryUsage: JSON.stringify(this.logs).length, // 近似内存使用量
            oldestLog: (_a = sortedLogs[0]) === null || _a === void 0 ? void 0 : _a.timestamp,
            newestLog: (_b = sortedLogs[sortedLogs.length - 1]) === null || _b === void 0 ? void 0 : _b.timestamp
        };
    }
    /**
     * 启用/禁用文件日志
     */
    async setFileLogging(enabled) {
        this.config.enableFileLogging = enabled;
        if (enabled) {
            await this.initializeFileLogging();
        }
        else {
            if (this.fileLoggerService) {
                await this.fileLoggerService.flush();
                this.fileLoggerService = null;
            }
        }
    }
    /**
     * 启用/禁用控制台输出
     */
    setConsoleOutput(enabled) {
        this.config.enableConsoleOutput = enabled;
    }
    /**
     * 获取配置信息
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 销毁日志记录器
     */
    async destroy() {
        // 停止自动刷新
        if (this.autoFlushTimer) {
            clearInterval(this.autoFlushTimer);
            this.autoFlushTimer = null;
        }
        // 最后一次刷新
        await this.flushToFile();
        // 清理文件日志服务
        if (this.fileLoggerService && this.fileLoggerService.destroy) {
            this.fileLoggerService.destroy();
        }
        // 清空内存日志
        this.logs = [];
    }
}
exports.Logger = Logger;
// 创建并导出默认日志实例
exports.logger = new Logger();
// 进程退出时清理
if (typeof process !== 'undefined') {
    process.on('exit', () => {
        exports.logger.destroy().catch(console.error);
    });
    process.on('SIGINT', () => {
        exports.logger.destroy().then(() => process.exit(0)).catch(() => process.exit(1));
    });
    process.on('SIGTERM', () => {
        exports.logger.destroy().then(() => process.exit(0)).catch(() => process.exit(1));
    });
}
exports.default = exports.logger;
