import React, { useState } from 'react';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from './ui/FormControls';
import { ThemeSelector } from './ui/ThemeSelector';

export const TestPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    status: 'active',
    price: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    alert('表单提交成功！\n\n数据：\n' + JSON.stringify(formData, null, 2));
    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen p-8 space-y-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Tailwind CSS 主题系统测试
          </h1>
          <p className="text-xl text-white/80">
            验证玻璃态效果和主题切换功能
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主题选择器 */}
          <div className="lg:col-span-1">
            <ThemeSelector />
          </div>

          {/* 表单测试 */}
          <div className="lg:col-span-2">
            <GlassCard title="表单控件测试">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassInput
                    label="商品名称"
                    type="text"
                    placeholder="请输入商品名称..."
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />

                  <GlassSelect
                    label="商品分类"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    required
                  >
                    <option value="">请选择分类</option>
                    <option value="electronics">电子产品</option>
                    <option value="clothing">服装</option>
                    <option value="books">图书</option>
                    <option value="food">食品</option>
                  </GlassSelect>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassInput
                    label="价格 (¥)"
                    type="number"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />

                  <GlassSelect
                    label="商品状态"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="active">正常</option>
                    <option value="inactive">停用</option>
                    <option value="discontinued">停产</option>
                  </GlassSelect>
                </div>

                <GlassInput
                  label="商品描述"
                  placeholder="请输入商品描述..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />

                <div className="flex gap-4 pt-4">
                  <GlassButton
                    type="submit"
                    variant="primary"
                    loading={loading}
                    disabled={!formData.name || !formData.category || !formData.price}
                  >
                    {loading ? '提交中...' : '提交表单'}
                  </GlassButton>

                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={() => setFormData({
                      name: '',
                      category: '',
                      status: 'active',
                      price: '',
                      description: ''
                    })}
                  >
                    重置表单
                  </GlassButton>

                  <GlassButton
                    type="button"
                    variant="success"
                    onClick={() => alert('成功操作！')}
                  >
                    成功按钮
                  </GlassButton>

                  <GlassButton
                    type="button"
                    variant="danger"
                    onClick={() => alert('危险操作！')}
                  >
                    危险按钮
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>

        {/* 展示卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GlassCard title="统计卡片 1">
            <div className="space-y-2">
              <p className="text-3xl font-bold text-white">1,234</p>
              <p className="text-white/70">总商品数量</p>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full w-3/4"></div>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="统计卡片 2">
            <div className="space-y-2">
              <p className="text-3xl font-bold text-white">¥56,789</p>
              <p className="text-white/70">总销售额</p>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full w-1/2"></div>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="统计卡片 3">
            <div className="space-y-2">
              <p className="text-3xl font-bold text-white">89</p>
              <p className="text-white/70">待处理订单</p>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-red-400 to-pink-500 h-2 rounded-full w-1/4"></div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* 使用说明 */}
        <GlassCard title="使用说明">
          <div className="prose prose-invert max-w-none">
            <h4 className="text-white/90 font-semibold mb-2">主题特点：</h4>
            <ul className="text-white/80 space-y-1 mb-4">
              <li><strong>玻璃未来风：</strong>基于Indigo色块系列，深色背景配白色文字，高对比度科技感</li>
              <li><strong>深色科技风：</strong>基于Slate色块系列，专业的深色主题</li>
              <li><strong>温暖商务风：</strong>基于Amber色块系列，暖色调商务感</li>
            </ul>
            
            <h4 className="text-white/90 font-semibold mb-2">技术特点：</h4>
            <ul className="text-white/80 space-y-1">
              <li>✅ 使用 Tailwind CSS 原生主题系统</li>
              <li>✅ 玻璃态效果 (Glassmorphism) 与主题完美结合</li>
              <li>✅ 支持实时主题切换</li>
              <li>✅ 表单控件自动适配主题颜色</li>
              <li>✅ 响应式设计，移动端友好</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};