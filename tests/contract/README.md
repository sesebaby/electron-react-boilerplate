# API 契约测试

本目录包含前后端API契约测试，用于验证：
1. 前端调用的API是否与后端实现一致
2. 数据字段映射的正确性
3. 请求响应的数据类型一致性

## 测试策略

- 使用契约驱动开发（Contract-Driven Development）
- 验证所有IPC通信接口的一致性
- 确保数据库字段映射（snake_case <-> camelCase）正确
- 类型安全验证

## 运行测试

```bash
npm run test:contract
```