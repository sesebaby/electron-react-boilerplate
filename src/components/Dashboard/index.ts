// Dashboard 模块导出

export { default as Dashboard } from './Dashboard';
export { default as DashboardOverview } from './DashboardOverview';
export { default as DashboardCharts } from './DashboardCharts';
export { default as DashboardQuickActions } from './DashboardQuickActions';

// 导出服务
export { default as dashboardService } from '../../services/dashboard/dashboardService';

// 导出类型
export type {
  DashboardOverview as DashboardOverviewType,
  QuickStats,
  RecentActivity,
  DashboardChartData,
  SystemHealth
} from '../../services/dashboard/dashboardService';

// 默认导出主Dashboard组件
export { default } from './Dashboard';