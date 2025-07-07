"use strict";
/**
 * 日志轮转工具
 * 负责管理日志文件的轮转、压缩和清理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRotation = void 0;
class LogRotation {
    constructor() {
        this.isElectron = this.checkElectronEnvironment();
        this.initializeModules();
    }
    /**
     * 检查是否运行在Electron环境
     */
    checkElectronEnvironment() {
        return typeof window !== 'undefined' &&
            typeof window.electronAPI !== 'undefined';
    }
    /**
     * 初始化所需模块
     */
    initializeModules() {
        if (this.isElectron) {
            this.initializeElectronModules();
        }
        else if (typeof require !== 'undefined') {
            try {
                this.fs = require('fs');
                this.path = require('path');
                this.zlib = require('zlib');
            }
            catch (error) {
                console.warn('日志轮转工具: 无法加载Node.js模块，将使用降级方案');
                this.initializeBrowserFallback();
            }
        }
        else {
            this.initializeBrowserFallback();
        }
    }
    /**
     * 初始化Electron模块
     */
    initializeElectronModules() {
        // 通过IPC与主进程通信
        this.fs = {
            readdir: (path, callback) => {
                if (window.electronAPI && window.electronAPI.readdir) {
                    window.electronAPI.readdir(path)
                        .then((result) => {
                        if (result.success) {
                            callback(null, result.data);
                        }
                        else {
                            callback(new Error(result.error || 'Readdir failed'));
                        }
                    })
                        .catch(callback);
                }
                else {
                    callback(new Error('Electron API not available'));
                }
            },
            stat: (path, callback) => {
                if (window.electronAPI && window.electronAPI.stat) {
                    window.electronAPI.stat(path)
                        .then((result) => {
                        if (result.success) {
                            callback(null, result.data);
                        }
                        else {
                            callback(new Error(result.error || 'Stat failed'));
                        }
                    })
                        .catch(callback);
                }
                else {
                    callback(new Error('Electron API not available'));
                }
            },
            rename: (oldPath, newPath, callback) => {
                if (window.electronAPI && window.electronAPI.rename) {
                    window.electronAPI.rename(oldPath, newPath)
                        .then((result) => {
                        if (result.success) {
                            callback();
                        }
                        else {
                            callback(new Error(result.error || 'Rename failed'));
                        }
                    })
                        .catch(callback);
                }
                else {
                    callback(new Error('Electron API not available'));
                }
            },
            unlink: (path, callback) => {
                if (window.electronAPI && window.electronAPI.unlink) {
                    window.electronAPI.unlink(path)
                        .then((result) => {
                        if (result.success) {
                            callback();
                        }
                        else {
                            callback(new Error(result.error || 'Unlink failed'));
                        }
                    })
                        .catch(callback);
                }
                else {
                    callback(new Error('Electron API not available'));
                }
            },
            createReadStream: (path) => {
                // 返回一个模拟的读取流
                return {
                    pipe: (destination) => destination,
                    on: (event, handler) => { }
                };
            }
        };
        this.path = {
            join: (...paths) => paths.join('/'),
            dirname: (path) => path.substring(0, path.lastIndexOf('/')),
            basename: (path) => path.substring(path.lastIndexOf('/') + 1),
            extname: (path) => {
                const lastDot = path.lastIndexOf('.');
                return lastDot > 0 ? path.substring(lastDot) : '';
            }
        };
    }
    /**
     * 初始化浏览器降级方案
     */
    initializeBrowserFallback() {
        // 在浏览器环境中的简化实现
        this.fs = {
            readdir: (path, callback) => {
                // 从localStorage中获取模拟的文件列表
                const keys = Object.keys(localStorage).filter(key => key.startsWith('log_'));
                const files = keys.map(key => key.replace('log_', '').replace(/_/g, '/'));
                callback(null, files);
            },
            stat: (path, callback) => {
                const key = `log_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const data = localStorage.getItem(key);
                if (data) {
                    callback(null, {
                        size: data.length,
                        mtime: new Date(),
                        birthtime: new Date()
                    });
                }
                else {
                    callback(new Error('File not found'));
                }
            },
            rename: (oldPath, newPath, callback) => {
                const oldKey = `log_${oldPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const newKey = `log_${newPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const data = localStorage.getItem(oldKey);
                if (data) {
                    localStorage.setItem(newKey, data);
                    localStorage.removeItem(oldKey);
                    callback();
                }
                else {
                    callback(new Error('File not found'));
                }
            },
            unlink: (path, callback) => {
                const key = `log_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
                localStorage.removeItem(key);
                callback();
            },
            createReadStream: (path) => {
                return {
                    pipe: (destination) => destination,
                    on: (event, handler) => { }
                };
            }
        };
        this.path = {
            join: (...paths) => paths.join('/'),
            dirname: (path) => path.substring(0, path.lastIndexOf('/')),
            basename: (path) => path.substring(path.lastIndexOf('/') + 1),
            extname: (path) => {
                const lastDot = path.lastIndexOf('.');
                return lastDot > 0 ? path.substring(lastDot) : '';
            }
        };
    }
    /**
     * 获取目录中的日志文件信息
     */
    async getLogFiles(directory) {
        return new Promise((resolve, reject) => {
            this.fs.readdir(directory, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                const logFiles = files.filter(file => file.endsWith('.log'));
                const promises = logFiles.map(file => this.getFileInfo(this.path.join(directory, file)));
                Promise.all(promises)
                    .then(resolve)
                    .catch(reject);
            });
        });
    }
    /**
     * 获取单个文件信息
     */
    async getFileInfo(filePath) {
        return new Promise((resolve, reject) => {
            this.fs.stat(filePath, (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime || stats.mtime,
                    modified: stats.mtime
                });
            });
        });
    }
    /**
     * 检查是否需要轮转并执行轮转
     */
    async rotateIfNeeded(directory, config) {
        try {
            const logFiles = await this.getLogFiles(directory);
            for (const file of logFiles) {
                const fileSizeMB = file.size / (1024 * 1024);
                if (fileSizeMB > config.maxFileSize) {
                    await this.rotateFile(file.path, config);
                }
            }
            // 清理超过最大文件数的旧文件
            await this.cleanupExcessFiles(directory, config.maxFiles);
        }
        catch (error) {
            console.error('日志轮转检查失败:', error);
        }
    }
    /**
     * 轮转单个文件
     */
    async rotateFile(filePath, config) {
        const directory = this.path.dirname(filePath);
        const fileName = this.path.basename(filePath, '.log');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // 生成新的文件名
        const rotatedFileName = `${fileName}.${timestamp}.log`;
        const rotatedFilePath = this.path.join(directory, rotatedFileName);
        return new Promise((resolve, reject) => {
            // 重命名当前文件
            this.fs.rename(filePath, rotatedFilePath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                // 如果启用压缩，压缩已轮转的文件
                if (config.enableCompression) {
                    this.compressFile(rotatedFilePath)
                        .then(() => resolve())
                        .catch(reject);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * 压缩文件
     */
    async compressFile(filePath) {
        if (!this.zlib) {
            console.warn('日志轮转工具: 压缩功能不可用');
            return;
        }
        const compressedPath = `${filePath}.gz`;
        return new Promise((resolve, reject) => {
            try {
                const readStream = this.fs.createReadStream(filePath);
                const writeStream = this.fs.createWriteStream(compressedPath);
                const gzip = this.zlib.createGzip();
                readStream.pipe(gzip).pipe(writeStream);
                writeStream.on('finish', () => {
                    // 删除原文件
                    this.fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('删除原文件失败:', err);
                        }
                        resolve();
                    });
                });
                writeStream.on('error', reject);
                readStream.on('error', reject);
                gzip.on('error', reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 清理超过最大文件数的旧文件
     */
    async cleanupExcessFiles(directory, maxFiles) {
        try {
            const logFiles = await this.getLogFiles(directory);
            // 按修改时间排序，最新的在前
            const sortedFiles = logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
            // 删除超过最大数量的文件
            const filesToDelete = sortedFiles.slice(maxFiles);
            for (const file of filesToDelete) {
                await this.deleteFile(file.path);
                // 同时删除对应的压缩文件
                const compressedPath = `${file.path}.gz`;
                try {
                    await this.deleteFile(compressedPath);
                }
                catch (error) {
                    // 压缩文件可能不存在，忽略错误
                }
            }
        }
        catch (error) {
            console.error('清理超量文件失败:', error);
        }
    }
    /**
     * 删除文件
     */
    async deleteFile(filePath) {
        return new Promise((resolve, reject) => {
            this.fs.unlink(filePath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * 清理过期日志
     */
    async cleanupOldLogs(directory, maxAgeInDays) {
        try {
            const logFiles = await this.getLogFiles(directory);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
            const oldFiles = logFiles.filter(file => file.modified < cutoffDate);
            for (const file of oldFiles) {
                await this.deleteFile(file.path);
                // 同时删除对应的压缩文件
                const compressedPath = `${file.path}.gz`;
                try {
                    await this.deleteFile(compressedPath);
                }
                catch (error) {
                    // 压缩文件可能不存在，忽略错误
                }
            }
            if (oldFiles.length > 0) {
                console.info(`日志轮转工具: 清理了 ${oldFiles.length} 个过期日志文件`);
            }
        }
        catch (error) {
            console.error('清理过期日志失败:', error);
        }
    }
    /**
     * 获取日志目录统计信息
     */
    async getDirectoryStats(directory) {
        var _a, _b;
        try {
            const logFiles = await this.getLogFiles(directory);
            if (logFiles.length === 0) {
                return {
                    totalFiles: 0,
                    totalSize: 0
                };
            }
            const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);
            const sortedByDate = logFiles.sort((a, b) => a.modified.getTime() - b.modified.getTime());
            return {
                totalFiles: logFiles.length,
                totalSize,
                oldestFile: (_a = sortedByDate[0]) === null || _a === void 0 ? void 0 : _a.modified,
                newestFile: (_b = sortedByDate[sortedByDate.length - 1]) === null || _b === void 0 ? void 0 : _b.modified
            };
        }
        catch (error) {
            console.error('获取目录统计信息失败:', error);
            return {
                totalFiles: 0,
                totalSize: 0
            };
        }
    }
}
// 创建默认实例
exports.logRotation = new LogRotation();
exports.default = LogRotation;
