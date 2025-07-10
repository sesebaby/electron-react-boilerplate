/**
 * 全局服务访问器
 * 
 * 提供向后兼容的服务访问接口，替换原有的复杂依赖注入系统
 */

import { simpleServiceManager, ServiceInstances } from './SimpleServiceManager';

/**
 * 获取全局服务实例
 * 兼容原有的 getGlobalServices 接口
 */
export async function getGlobalServices(): Promise<Partial<ServiceInstances>> {
  // 确保服务管理器已初始化
  if (!simpleServiceManager.isInitialized) {
    await simpleServiceManager.initialize();
  }
  
  return simpleServiceManager.getAllServices();
}

/**
 * 获取特定服务
 */
export function getService<K extends keyof ServiceInstances>(serviceName: K): ServiceInstances[K] | undefined {
  return simpleServiceManager.getService(serviceName);
}

/**
 * 检查服务是否可用
 */
export function isServiceAvailable<K extends keyof ServiceInstances>(serviceName: K): boolean {
  return simpleServiceManager.getService(serviceName) !== undefined;
}

/**
 * 获取服务初始化状态
 */
export function getServicesStatus() {
  return simpleServiceManager.getStatus();
}

// 向后兼容的导出
export { simpleServiceManager as serviceManager };

// 全局服务访问器（挂载到 window 对象，兼容现有代码）
declare global {
  interface Window {
    services?: Partial<ServiceInstances>;
  }
}

/**
 * 初始化全局服务访问器
 */
export async function initializeGlobalServices(): Promise<void> {
  await simpleServiceManager.initialize();
  
  // 将服务挂载到全局对象，兼容现有代码
  window.services = simpleServiceManager.getAllServices();
}
