/**
 * 用户操作追踪日志记录器
 * 记录用户的关键业务操作和UI交互
 */

import { _logger as logger } from './logger';

export enum UserActionType {
  // 认证相关
  LOGIN = 'login',
  LOGOUT = 'logout',
  
  // 导航相关
  PAGE_VIEW = 'page_view',
  NAVIGATION = 'navigation',
  
  // 业务操作
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  SEARCH = 'search',
  EXPORT = 'export',
  IMPORT = 'import',
  
  // UI交互
  CLICK = 'click',
  FORM_SUBMIT = 'form_submit',
  FORM_CANCEL = 'form_cancel',
  DIALOG_OPEN = 'dialog_open',
  DIALOG_CLOSE = 'dialog_close',
  TAB_SWITCH = 'tab_switch',
  
  // 文件操作
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  
  // 系统操作
  SETTINGS_CHANGE = 'settings_change',
  PERMISSION_CHANGE = 'permission_change',
  
  // 错误和异常
  ERROR_OCCURRED = 'error_occurred',
  RETRY_ACTION = 'retry_action'
}

export enum ActionContext {
  // 页面上下文
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  REPORTS = 'reports',
  SYSTEM = 'system',
  SALES = 'sales',
  PURCHASE = 'purchase',
  FINANCIAL = 'financial',
  CALENDAR = 'calendar',
  
  // 组件上下文
  DIALOG = 'dialog',
  FORM = 'form',
  TABLE = 'table',
  CHART = 'chart',
  MENU = 'menu',
  TOOLBAR = 'toolbar',
  
  // 功能上下文
  AUTH = 'auth',
  SETTINGS = 'settings',
  SEARCH = 'search',
  FILTER = 'filter',
  EXPORT = 'export'
}

export interface UserActionEvent {
  actionId: string;
  type: UserActionType;
  context: ActionContext;
  target?: string;
  description: string;
  details?: Record<string, any>;
  timestamp: Date;
  userId?: string | null;
  sessionId?: string;
  url: string;
  userAgent: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

export interface UserActionConfig {
  enableTracking: boolean;
  enableUITracking: boolean;
  enableBusinessTracking: boolean;
  trackSensitiveActions: boolean;
  maxActionsPerSession: number;
  sessionTimeout: number; // 分钟
}

class UserActionLogger {
  private config: UserActionConfig;
  private currentUserId: string | null = null;
  private sessionId: string;
  private actionCounts: Map<string, number> = new Map();
  private lastActionTime: number = Date.now();
  private pendingActions: Map<string, { startTime: Date; event: Partial<UserActionEvent> }> = new Map();

  constructor(config?: Partial<UserActionConfig>) {
    this.config = {
      enableTracking: true,
      enableUITracking: true,
      enableBusinessTracking: true,
      trackSensitiveActions: false,
      maxActionsPerSession: 1000,
      sessionTimeout: 30, // 30分钟
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置DOM事件监听器（用于UI交互追踪）
   */
  private setupEventListeners(): void {
    if (!this.config.enableUITracking || typeof window === 'undefined') {
      return;
    }

    // 页面加载
    window.addEventListener('load', () => {
      this.logAction({
        type: UserActionType.PAGE_VIEW,
        context: this.getPageContext(),
        description: `Page loaded: ${window.location.pathname}`,
        details: {
          url: window.location.href,
          referrer: document.referrer,
          title: document.title
        }
      });
    });

    // 页面卸载
    window.addEventListener('beforeunload', () => {
      this.logAction({
        type: UserActionType.PAGE_VIEW,
        context: this.getPageContext(),
        description: `Page unloaded: ${window.location.pathname}`,
        details: {
          url: window.location.href,
          timeOnPage: Date.now() - this.lastActionTime
        }
      });
    });

    // 监听点击事件（委托到document）
    document.addEventListener('click', (event) => {
      this.handleClickEvent(event);
    });

    // 监听表单提交
    document.addEventListener('submit', (event) => {
      this.handleFormSubmit(event);
    });

    // 监听键盘事件（重要快捷键）
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardEvent(event);
    });

    // 监听popstate（浏览器导航）
    window.addEventListener('popstate', () => {
      this.logAction({
        type: UserActionType.NAVIGATION,
        context: this.getPageContext(),
        description: `Browser navigation to: ${window.location.pathname}`,
        details: {
          url: window.location.href,
          type: 'browser_navigation'
        }
      });
    });
  }

  /**
   * 处理点击事件
   */
  private handleClickEvent(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    // 检查是否是重要的UI元素
    const isButton = target.tagName === 'BUTTON' || target.role === 'button';
    const isLink = target.tagName === 'A';
    const hasDataTrack = target.hasAttribute('data-track');
    const hasClickHandler = target.onclick !== null;

    if (isButton || isLink || hasDataTrack || hasClickHandler) {
      const actionData = this.extractElementInfo(target);
      
      this.logAction({
        type: UserActionType.CLICK,
        context: this.getElementContext(target),
        target: actionData.selector,
        description: `Clicked: ${actionData.description}`,
        details: {
          element: actionData.element,
          text: actionData.text,
          coordinates: { x: event.clientX, y: event.clientY }
        }
      });
    }
  }

  /**
   * 处理表单提交
   */
  private handleFormSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const formFields = Array.from(formData.keys());

    this.logAction({
      type: UserActionType.FORM_SUBMIT,
      context: ActionContext.FORM,
      target: this.getElementSelector(form),
      description: `Form submitted: ${form.name || form.id || 'unnamed'}`,
      details: {
        action: form.action,
        method: form.method,
        fieldCount: formFields.length,
        fields: formFields // 不记录实际值，只记录字段名
      }
    });
  }

  /**
   * 处理键盘事件
   */
  private handleKeyboardEvent(event: KeyboardEvent): void {
    // 只记录重要的快捷键
    const importantKeys = [
      'F1', 'F5', 'F12', // 功能键
      'Escape', 'Enter', // 操作键
    ];

    const isCtrlCombo = event.ctrlKey && ['s', 'z', 'y', 'c', 'v', 'x', 'a', 'f'].includes(event.key.toLowerCase());
    const isImportantKey = importantKeys.includes(event.key);

    if (isCtrlCombo || isImportantKey) {
      this.logAction({
        type: UserActionType.CLICK,
        context: this.getPageContext(),
        description: `Keyboard shortcut: ${this.formatKeyCombo(event)}`,
        details: {
          key: event.key,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          target: this.getElementSelector(event.target as HTMLElement)
        }
      });
    }
  }

  /**
   * 获取页面上下文
   */
  private getPageContext(): ActionContext {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('dashboard')) return ActionContext.DASHBOARD;
    if (path.includes('inventory')) return ActionContext.INVENTORY;
    if (path.includes('report')) return ActionContext.REPORTS;
    if (path.includes('system')) return ActionContext.SYSTEM;
    if (path.includes('sales')) return ActionContext.SALES;
    if (path.includes('purchase')) return ActionContext.PURCHASE;
    if (path.includes('financial')) return ActionContext.FINANCIAL;
    if (path.includes('calendar')) return ActionContext.CALENDAR;
    
    return ActionContext.DASHBOARD; // 默认上下文
  }

  /**
   * 获取元素上下文
   */
  private getElementContext(element: HTMLElement): ActionContext {
    // 通过元素的类名或数据属性推断上下文
    const classList = element.className.toLowerCase();
    const dataset = element.dataset;

    if (dataset.context) {
      return dataset.context as ActionContext;
    }

    if (classList.includes('dialog') || element.closest('[role="dialog"]')) {
      return ActionContext.DIALOG;
    }
    
    if (classList.includes('form') || element.closest('form')) {
      return ActionContext.FORM;
    }
    
    if (classList.includes('table') || element.closest('table')) {
      return ActionContext.TABLE;
    }
    
    if (classList.includes('menu') || element.closest('[role="menu"]')) {
      return ActionContext.MENU;
    }

    return this.getPageContext();
  }

  /**
   * 提取元素信息
   */
  private extractElementInfo(element: HTMLElement): {
    selector: string;
    description: string;
    element: string;
    text: string;
  } {
    const selector = this.getElementSelector(element);
    const text = (element.textContent || element.innerText || '').trim().substring(0, 100);
    const elementType = element.tagName.toLowerCase();
    
    let description = text || selector || elementType;
    
    // 特殊元素的描述
    if (element.hasAttribute('aria-label')) {
      description = element.getAttribute('aria-label') || description;
    } else if (element.hasAttribute('title')) {
      description = element.getAttribute('title') || description;
    } else if (element.hasAttribute('data-tooltip')) {
      description = element.getAttribute('data-tooltip') || description;
    }

    return {
      selector,
      description,
      element: elementType,
      text
    };
  }

  /**
   * 获取元素选择器
   */
  private getElementSelector(element: HTMLElement | null): string {
    if (!element) return '';

    // 优先使用ID
    if (element.id) {
      return `#${element.id}`;
    }

    // 使用data-track属性
    if (element.hasAttribute('data-track')) {
      return `[data-track="${element.getAttribute('data-track')}"]`;
    }

    // 使用class（取第一个有意义的class）
    if (element.className) {
      const classes = element.className.split(' ').filter(cls => 
        cls && !cls.startsWith('css-') && !cls.includes('emotion')
      );
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }

    // 使用标签名和层级
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;
    
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => 
        child.tagName === element.tagName
      );
      const index = siblings.indexOf(element);
      return `${tagName}:nth-of-type(${index + 1})`;
    }

    return tagName;
  }

  /**
   * 格式化键盘组合
   */
  private formatKeyCombo(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    parts.push(event.key);
    return parts.join('+');
  }

  /**
   * 记录用户操作
   */
  public logAction(action: {
    type: UserActionType;
    context: ActionContext;
    description: string;
    target?: string;
    details?: Record<string, any>;
    duration?: number;
    success?: boolean;
    errorMessage?: string;
  }): void {
    if (!this.config.enableTracking) {
      return;
    }

    // 检查会话超时
    this.checkSessionTimeout();

    // 检查操作数量限制
    if (this.getTotalActionCount() >= this.config.maxActionsPerSession) {
      return;
    }

    // 生成完整的操作事件
    const _actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent: UserActionEvent = {
      actionId: _actionId,
      type: action.type,
      context: action.context,
      target: action.target,
      description: action.description,
      details: action.details,
      timestamp: new Date(),
      userId: this.currentUserId,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      duration: action.duration,
      success: action.success !== false, // 默认为true
      errorMessage: action.errorMessage
    };

    // 过滤敏感操作
    if (this.isSensitiveAction(fullEvent) && !this.config.trackSensitiveActions) {
      return;
    }

    // 记录到日志系统
    this.recordAction(fullEvent);

    // 更新统计
    this.updateActionStats(fullEvent);
    this.lastActionTime = Date.now();
  }

  /**
   * 开始追踪长时间操作
   */
  public startAction(actionId: string, action: {
    type: UserActionType;
    context: ActionContext;
    description: string;
    target?: string;
    details?: Record<string, any>;
  }): void {
    this.pendingActions.set(actionId, {
      startTime: new Date(),
      event: action
    });
  }

  /**
   * 完成长时间操作
   */
  public completeAction(actionId: string, details?: {
    success?: boolean;
    errorMessage?: string;
    additionalDetails?: Record<string, any>;
  }): void {
    const _pending = this.pendingActions.get(actionId);
    if (!pending) return;

    const _duration = Date.now() - pending.startTime.getTime();
    
    this.logAction({
      type: pending.event.type!,
      context: pending.event.context!,
      description: pending.event.description!,
      target: pending.event.target,
      duration: _duration,
      success: details?.success !== false,
      errorMessage: details?.errorMessage,
      details: {
        ...pending.event.details,
        ...details?.additionalDetails
      }
    });

    this.pendingActions.delete(actionId);
  }

  /**
   * 记录业务操作
   */
  public logBusinessAction(params: {
    type: UserActionType.CREATE | UserActionType.UPDATE | UserActionType.DELETE | UserActionType.VIEW;
    entity: string;
    entityId?: string;
    context: ActionContext;
    description?: string;
    details?: Record<string, any>;
    success?: boolean;
    errorMessage?: string;
  }): void {
    if (!this.config.enableBusinessTracking) {
      return;
    }

    this.logAction({
      type: params.type,
      context: params.context,
      target: params.entity,
      description: params.description || `${params.type} ${params.entity}${params.entityId ? ` (${params.entityId})` : ''}`,
      details: {
        entity: params.entity,
        entityId: params.entityId,
        ...params.details
      },
      success: params.success,
      errorMessage: params.errorMessage
    });
  }

  /**
   * 记录导航操作
   */
  public logNavigation(from: string, to: string, type: 'programmatic' | 'user' = 'user'): void {
    this.logAction({
      type: UserActionType.NAVIGATION,
      context: this.getPageContext(),
      description: `Navigation from ${from} to ${to}`,
      details: {
        from,
        to,
        type,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * 记录搜索操作
   */
  public logSearch(query: string, context: ActionContext, results?: {
    count: number;
    duration: number;
  }): void {
    this.logAction({
      type: UserActionType.SEARCH,
      context,
      description: `Search performed: "${query}"`,
      details: {
        query: query.substring(0, 100), // 限制查询长度
        resultCount: results?.count,
        searchDuration: results?.duration
      }
    });
  }

  /**
   * 判断是否为敏感操作
   */
  private isSensitiveAction(event: UserActionEvent): boolean {
    const sensitiveTypes: UserActionType[] = [
      UserActionType.LOGIN,
      UserActionType.LOGOUT,
      UserActionType.PERMISSION_CHANGE,
      UserActionType.SETTINGS_CHANGE
    ];

    const sensitiveContexts: ActionContext[] = [
      ActionContext.AUTH,
      ActionContext.SETTINGS
    ];

    const _typeMatch = sensitiveTypes.includes(event.type);
    const _contextMatch = sensitiveContexts.includes(event.context);
    const _descriptionMatch = event.description && typeof event.description === 'string' && 
                            event.description.toLowerCase().includes('password');
    
    return _typeMatch || _contextMatch || Boolean(_descriptionMatch);
  }

  /**
   * 记录操作到日志系统
   */
  private recordAction(event: UserActionEvent): void {
    const _logLevel = this.getLogLevel(event);
    const _message = `User Action: ${event.type} - ${event.description}`;

    switch (_logLevel) {
      case 'info':
        logger.info(_message, event, 'UserAction');
        break;
      case 'warn':
        logger.warn(_message, event, 'UserAction');
        break;
      case 'error':
        logger.error(_message, event, 'UserAction');
        break;
      default:
        logger.info(_message, event, 'UserAction');
    }
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(event: UserActionEvent): 'info' | 'warn' | 'error' {
    if (!event.success || event.errorMessage) {
      return 'error';
    }

    if (event.type === UserActionType.ERROR_OCCURRED) {
      return 'error';
    }

    if (this.isSensitiveAction(event)) {
      return 'warn';
    }

    return 'info';
  }

  /**
   * 更新操作统计
   */
  private updateActionStats(event: UserActionEvent): void {
    const key = `${event.type}:${event.context}`;
    const currentCount = this.actionCounts.get(key) || 0;
    this.actionCounts.set(key, currentCount + 1);
  }

  /**
   * 检查会话超时
   */
  private checkSessionTimeout(): void {
    const now = Date.now();
    const timeoutMs = this.config.sessionTimeout * 60 * 1000;
    
    if (now - this.lastActionTime > timeoutMs) {
      // 会话超时，创建新会话
      this.sessionId = this.generateSessionId();
      this.actionCounts.clear();
      
      logger.info('User session timeout, new session created', {
        oldSessionAge: now - this.lastActionTime,
        newSessionId: this.sessionId,
        userId: this.currentUserId
      }, 'UserAction');
    }
  }

  /**
   * 获取总操作数
   */
  private getTotalActionCount(): number {
    return Array.from(this.actionCounts.values()).reduce((sum, count) => sum + count, 0);
  }

  /**
   * 设置当前用户ID
   */
  public setUserId(userId: string | null): void {
    const oldUserId = this.currentUserId;
    this.currentUserId = userId;
    
    logger.info('User action logger user ID updated', {
      oldUserId,
      newUserId: userId,
      sessionId: this.sessionId
    }, 'UserAction');
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<UserActionConfig>): void {
    this.config = { ...this.config, ...config };
    
    logger.info('User action logger config updated', {
      config: this.config,
      userId: this.currentUserId,
      sessionId: this.sessionId
    }, 'UserAction');
  }

  /**
   * 获取用户操作统计
   */
  public getActionStats(): {
    sessionId: string;
    userId: string | null;
    totalActions: number;
    actionsByType: Record<string, number>;
    sessionStartTime: number;
    lastActionTime: number;
  } {
    const totalActions = this.getTotalActionCount();
    const actionsByType: Record<string, number> = {};
    
    for (const [key, count] of this.actionCounts.entries()) {
      actionsByType[key] = count;
    }

    return {
      sessionId: this.sessionId,
      userId: this.currentUserId,
      totalActions,
      actionsByType,
      sessionStartTime: this.lastActionTime,
      lastActionTime: this.lastActionTime
    };
  }

  /**
   * 清理操作统计
   */
  public clearStats(): void {
    this.actionCounts.clear();
    this.pendingActions.clear();
    
    logger.info('User action stats cleared', {
      userId: this.currentUserId,
      sessionId: this.sessionId
    }, 'UserAction');
  }

  /**
   * 销毁追踪器
   */
  public destroy(): void {
    this.clearStats();
    
    // 移除事件监听器（如果有的话）
    // 注意：由于使用了委托，实际上很难完全移除，但在SPA中通常不需要
    
    logger.info('User action logger destroyed', {
      userId: this.currentUserId,
      sessionId: this.sessionId
    }, 'UserAction');
  }
}

// 创建默认实例
export const _userActionLogger = new UserActionLogger();
export const userActionLogger = _userActionLogger;

// 自动设置用户ID（如果有认证上下文）
if (typeof window !== 'undefined') {
  // 这里可以集成到用户认证系统
  _userActionLogger.setUserId(null); // 暂时设为null
}

export default UserActionLogger;