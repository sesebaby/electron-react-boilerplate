import React, { useState } from 'react';
import { GlassButton, GlassInput, GlassSelect, GlassCard } from '../ui/FormControls';

/**
 * 模态框滚动测试组件
 * 用于验证修复后的模态框滚动行为
 */
export const ModalScrollTest: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  const generateLongForm = () => {
    const fields = [];
    for (let i = 1; i <= 20; i++) {
      fields.push(
        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <GlassInput
            label={`字段 ${i}A`}
            type="text"
            placeholder={`输入字段 ${i}A`}
            register={() => ({})}
          />
          <GlassInput
            label={`字段 ${i}B`}
            type="text"
            placeholder={`输入字段 ${i}B`}
            register={() => ({})}
          />
          <GlassSelect
            label={`选择 ${i}`}
            register={() => ({})}
          >
            <option value="">请选择</option>
            <option value="option1">选项1</option>
            <option value="option2">选项2</option>
          </GlassSelect>
        </div>
      );
    }
    return fields;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">模态框滚动测试</h1>
      <p className="text-white/70 mb-6">
        点击按钮打开包含大量表单字段的模态框，测试滚动行为是否正常。
      </p>
      
      <GlassButton
        variant="primary"
        onClick={() => setShowModal(true)}
      >
        打开测试模态框
      </GlassButton>

      {/* 测试模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-2 sm:p-4">
          <div className="glass-card w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* 弹出窗口头部 - 固定不滚动 */}
            <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                模态框滚动测试
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white touch-manipulation"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {/* 弹出窗口内容 - 可滚动区域 */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <form className="space-y-4 sm:space-y-6">
                <GlassCard title="测试表单">
                  <div className="space-y-4">
                    {generateLongForm()}
                  </div>
                </GlassCard>

                <GlassCard title="更多字段">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">长文本描述</label>
                      <textarea
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all resize-none"
                        placeholder="输入长文本描述..."
                        rows={5}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <GlassInput
                        label="最后一个字段A"
                        type="text"
                        placeholder="这是最后一个字段A"
                        register={() => ({})}
                      />
                      <GlassInput
                        label="最后一个字段B"
                        type="text"
                        placeholder="这是最后一个字段B"
                        register={() => ({})}
                      />
                    </div>
                  </div>
                </GlassCard>
              </form>
            </div>

            {/* 弹出窗口底部 - 固定不滚动 */}
            <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
              <div className="flex gap-3 sm:gap-4">
                <GlassButton
                  type="button"
                  variant="primary"
                  className="flex-1 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                  onClick={() => alert('提交按钮可见且可点击！')}
                >
                  提交测试
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                >
                  取消
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalScrollTest;
