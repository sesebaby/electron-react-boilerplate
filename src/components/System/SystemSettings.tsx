import React from 'react';
import { GlassCard } from '../ui/FormControls';

interface SystemSettingsProps {
  className?: string;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ className }) => {
  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              系统设置
            </h1>
            <p className="mt-1 text-white/80">
              配置系统参数和业务规则
            </p>
          </div>
        </div>
      </GlassCard>

      {/* 即将推出内容 */}
      <GlassCard className="text-center p-12">
        <div className="text-6xl mb-6">⚙️</div>
        <h3 className="text-2xl font-bold text-white mb-4">系统设置</h3>
        <p className="text-white/80 mb-6">配置系统参数和业务规则</p>
        <div className="inline-flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white/90 backdrop-blur-sm">
          <span className="mr-2">⏳</span>
          功能正在开发中，敬请期待...
        </div>
      </GlassCard>
    </div>
  );
};

export default SystemSettings;
