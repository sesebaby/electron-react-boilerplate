export interface DatabaseConfig {
  path: string;
  timeout: number;
}

export interface QueryResult<T = any> {
  data: T[];
  rowsAffected: number;
}

export interface DatabaseTransaction {
  run: (query: string, params?: any[]) => Promise<QueryResult>;
  get: (query: string, params?: any[]) => Promise<any>;
  all: (query: string, params?: any[]) => Promise<any[]>;
  rollback: () => Promise<void>;
  commit: () => Promise<void>;
}