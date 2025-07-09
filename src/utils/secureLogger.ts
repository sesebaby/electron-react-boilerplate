/**
 * Secure Logger Utility
 * Filters sensitive information from logs to prevent security leaks
 */

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string | null;
  sessionId?: string | null;
}

interface SecurityConfig {
  enableProduction: boolean;
  sensitiveFields: string[];
  maxLogLength: number;
  enableAuditTrail: boolean;
}

class SecureLogger {
  private config: SecurityConfig = {
    enableProduction: false,
    sensitiveFields: [
      'password', 'token', 'auth', 'secret', 'key', 'pin', 'ssn', 'credit',
      'cvv', 'card', 'account', 'private', 'secure', 'confidential'
    ],
    maxLogLength: 1000,
    enableAuditTrail: true
  };

  private auditTrail: LogEntry[] = [];
  private currentUser: string | null = null;
  private sessionId: string | null = null;

  constructor(config?: Partial<SecurityConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  setCurrentUser(userId: string | null) {
    this.currentUser = userId;
  }

  setSessionId(sessionId: string | null) {
    this.sessionId = sessionId;
  }

  /**
   * Remove or mask sensitive information from objects
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeData(item));
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();

        // Check if field contains sensitive information
        const isSensitive = this.config.sensitiveFields.some(field =>
          lowerKey.includes(field.toLowerCase())
        );

        if (isSensitive) {
          sanitized[key] = this.maskSensitiveValue(value);
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize string content
   */
  private sanitizeString(str: string): string {
    if (str.length > this.config.maxLogLength) {
      return str.substring(0, this.config.maxLogLength) + '... [truncated]';
    }

    // Look for patterns that might be sensitive
    return str
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '****-****-****-****') // Credit card
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****') // SSN
      .replace(/password=\w+/gi, 'password=***')
      .replace(/token=[\w.-]+/gi, 'token=***')
      .replace(/auth=[\w.-]+/gi, 'auth=***');
  }

  /**
   * Mask sensitive values
   */
  private maskSensitiveValue(value: any): string {
    if (value === null || value === undefined) {
      return '[null]';
    }

    if (typeof value === 'boolean') {
      return '[boolean]';
    }

    if (typeof value === 'number') {
      return '[number]';
    }

    const strValue = String(value);
    if (strValue.length <= 4) {
      return '***';
    }

    // Show first and last character with asterisks in between
    return strValue[0] + '*'.repeat(strValue.length - 2) + strValue[strValue.length - 1];
  }

  /**
   * Create log entry
   */
  private createLogEntry(level: LogEntry['level'], message: string, data?: any): LogEntry {
    return {
      level,
      message: this.sanitizeString(message),
      data: this.sanitizeData(data),
      timestamp: new Date(),
      userId: this.currentUser,
      sessionId: this.sessionId
    };
  }

  /**
   * Write to audit trail
   */
  private writeToAudit(entry: LogEntry) {
    if (this.config.enableAuditTrail) {
      this.auditTrail.push(entry);
      
      // Keep only last 1000 entries to prevent memory issues
      if (this.auditTrail.length > 1000) {
        this.auditTrail = this.auditTrail.slice(-1000);
      }
    }
  }

  /**
   * Should log in current environment
   */
  private shouldLog(): boolean {
    return process.env.NODE_ENV === 'development' || this.config.enableProduction;
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: any) {
    const entry = this.createLogEntry('debug', message, data);
    this.writeToAudit(entry);

    if (this.shouldLog() && process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${entry.message}`, entry.data || '');
    }
  }

  /**
   * Info level logging
   */
  info(message: string, data?: any) {
    const entry = this.createLogEntry('info', message, data);
    this.writeToAudit(entry);

    if (this.shouldLog()) {
      console.info(`[INFO] ${entry.message}`, entry.data || '');
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: any) {
    const entry = this.createLogEntry('warn', message, data);
    this.writeToAudit(entry);

    if (this.shouldLog()) {
      console.warn(`[WARN] ${entry.message}`, entry.data || '');
    }
  }

  /**
   * Error level logging
   */
  error(message: string, data?: any) {
    const entry = this.createLogEntry('error', message, data);
    this.writeToAudit(entry);

    if (this.shouldLog()) {
      console.error(`[ERROR] ${entry.message}`, entry.data || '');
    }
  }

  /**
   * Security-specific logging for audit purposes
   */
  security(action: string, details?: any) {
    const message = `SECURITY: ${action}`;
    const entry = this.createLogEntry('warn', message, details);
    this.writeToAudit(entry);

    // Security events are always logged
    console.warn(`[SECURITY] ${entry.message}`, entry.data || '');
  }

  /**
   * User action logging for audit trail
   */
  audit(action: string, resource: string, details?: any) {
    const message = `AUDIT: User ${this.currentUser || 'anonymous'} performed ${action} on ${resource}`;
    const entry = this.createLogEntry('info', message, details);
    this.writeToAudit(entry);

    if (this.shouldLog()) {
      console.info(`[AUDIT] ${entry.message}`, entry.data || '');
    }
  }

  /**
   * Get audit trail (for security monitoring)
   */
  getAuditTrail(startDate?: Date, endDate?: Date): LogEntry[] {
    let filtered = this.auditTrail;

    if (startDate) {
      filtered = filtered.filter(entry => entry.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(entry => entry.timestamp <= endDate);
    }

    return filtered;
  }

  /**
   * Get security events only
   */
  getSecurityEvents(hours: number = 24): LogEntry[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.auditTrail.filter(entry =>
      entry.timestamp >= since &&
      (entry.message.includes('SECURITY:') || entry.level === 'error')
    );
  }

  /**
   * Clear audit trail (admin only)
   */
  clearAuditTrail() {
    this.security('Audit trail cleared', { clearedBy: this.currentUser });
    this.auditTrail = [];
  }
}

// Create default instance
const secureLogger = new SecureLogger();

// Enhanced console replacement
export const logger = {
  debug: (message: string, data?: any) => secureLogger.debug(message, data),
  info: (message: string, data?: any) => secureLogger.info(message, data),
  warn: (message: string, data?: any) => secureLogger.warn(message, data),
  error: (message: string, data?: any) => secureLogger.error(message, data),
  security: (action: string, details?: any) => secureLogger.security(action, details),
  audit: (action: string, resource: string, details?: any) => secureLogger.audit(action, resource, details),
  setUser: (userId: string | null) => secureLogger.setCurrentUser(userId),
  setSession: (sessionId: string | null) => secureLogger.setSessionId(sessionId),
  getAuditTrail: (startDate?: Date, endDate?: Date) => secureLogger.getAuditTrail(startDate, endDate),
  getSecurityEvents: (hours?: number) => secureLogger.getSecurityEvents(hours),
  clearAuditTrail: () => secureLogger.clearAuditTrail()
};

export default secureLogger;