# 测试和部署清单

## 🧪 测试层级

### 1. 单元测试（Unit Tests）
- ✅ **覆盖率**: 业务逻辑 80%+
- ✅ **Mock**: 所有外部依赖
- ✅ **运行时间**: < 5秒
- ✅ **命令**: `npm run test:unit`

### 2. 集成测试（Integration Tests）
- ⚠️ **覆盖率**: 关键路径 100%
- ⚠️ **Mock**: 仅外部 API
- ⚠️ **测试内容**:
  - [ ] 真实数据库操作
  - [ ] 文件系统操作
  - [ ] IPC 通信
- ⚠️ **命令**: `npm run test:integration`

### 3. 端到端测试（E2E Tests）
- ⚠️ **覆盖率**: 核心用户流程
- ⚠️ **Mock**: 无
- ⚠️ **测试内容**:
  - [ ] 完整用户流程
  - [ ] 跨平台兼容性
- ⚠️ **命令**: `npm run test:e2e`

## 🚀 部署前检查清单

### 环境检查
```bash
# 运行环境检查脚本
npm run prestart
```

### 依赖检查
- [ ] Node.js 版本兼容 (v16/v18/v20)
- [ ] Electron 版本匹配
- [ ] 原生模块编译正确
  ```bash
  npm rebuild better-sqlite3 --runtime=electron --target=30.5.1
  ```

### 数据库检查
- [ ] 数据库文件可创建
- [ ] 表结构正确
- [ ] 初始数据加载
- [ ] 备份机制工作

### 权限检查
- [ ] 文件系统写入权限
- [ ] 日志目录可写
- [ ] 配置文件可读写

### 性能检查
- [ ] 启动时间 < 3秒
- [ ] 内存使用 < 200MB
- [ ] CPU 使用率正常

## 🛠 常见问题解决

### better-sqlite3 加载失败
```bash
# Windows
npm rebuild better-sqlite3 --runtime=electron --target=30.5.1 --arch=x64 --dist-url=https://electronjs.org/headers

# macOS
npm rebuild better-sqlite3 --runtime=electron --target=30.5.1 --arch=x64

# Linux
npm rebuild better-sqlite3 --runtime=electron --target=30.5.1
```

### 数据库初始化失败
1. 检查数据库路径权限
2. 确保目录存在
3. 检查磁盘空间

### Electron 白屏
1. 打开开发者工具查看错误
2. 检查 preload.js 是否正确加载
3. 验证 IPC 通道注册

## 📋 发布流程

1. **本地测试**
   ```bash
   npm run test:all
   ```

2. **构建检查**
   ```bash
   npm run build
   npm run prestart
   ```

3. **打包**
   ```bash
   npm run package
   ```

4. **签名**（如需要）

5. **分发**
   - GitHub Releases
   - 自动更新服务器

## 🔍 监控

### 错误监控
- [ ] Sentry 集成
- [ ] 日志收集
- [ ] 崩溃报告

### 性能监控
- [ ] 启动时间
- [ ] 内存使用
- [ ] API 响应时间

### 用户反馈
- [ ] 反馈通道
- [ ] 版本更新通知