import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '../ui/GlassCard';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberPassword, setRememberPassword] = useState(true);
  const { login } = useAuth();

  const _STORAGE_KEY = 'login_credentials';

  useEffect(() => {
    const _savedCredentials = localStorage.getItem(STORAGE_KEY);
    if (savedCredentials) {
      try {
        const { username: savedUsername, password: savedPassword } = JSON.parse(savedCredentials);
        setUsername(savedUsername || '');
        setPassword(savedPassword || '');
      } catch (error) {
        console.error('Error parsing saved credentials:', error);
      }
    }
  }, []);

  const _handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const _success = await login(username, password);
      if (success) {
        if (rememberPassword) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            username,
            password
          }));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{background: 'var(--app-background)'}}>
      {/* 现代化背景效果 */}
      <div className="absolute inset-0">
        <div className="absolute w-72 h-72 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 left-1/4 top-1/3" style={{background: 'var(--glass-bg-10)'}}></div>
        <div className="absolute w-64 h-64 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 right-1/3 top-2/3" style={{background: 'var(--glass-bg-15)'}}></div>
        <div className="absolute w-80 h-80 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 left-2/3 top-1/4" style={{background: 'var(--glass-bg-20)'}}></div>
      </div>

      {/* 网格背景 */}
      <div className="absolute inset-0" 
           style={{
             background: 'var(--glass-bg-10)',
             backgroundImage: `
               linear-gradient(var(--glass-bg-dark-10) 1px, transparent 1px),
               linear-gradient(90deg, var(--glass-bg-dark-10) 1px, transparent 1px)
             `,
             backgroundSize: '50px 50px'
           }}>
      </div>

      {/* 左右分栏布局 */}
      <div className="relative z-10 min-h-screen flex lg:flex-row flex-col">
        {/* 左侧：公司信息 */}
        <div className="lg:w-1/2 w-full flex flex-col justify-center px-8 lg:px-16 py-12">
          <div className="max-w-lg w-full mx-auto lg:mx-0">
            {/* 公司品牌 */}
            <div className="mb-12">
              <div className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight" style={{color: 'var(--text-primary)'}}>
                  唐山市无踪信息科技
                </h1>
                <p className="text-lg font-medium mb-2" style={{color: 'var(--text-secondary)'}}>
                  专业软件开发 · 技术创新领航
                </p>
                <p className="text-sm" style={{color: 'var(--text-tertiary)'}}>
                  为企业提供高质量的数字化解决方案
                </p>
              </div>

              {/* 特色标签 */}
              <div className="flex flex-wrap gap-2 mb-8">
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{
                  background: 'var(--info-color)',
                  border: `1px solid var(--info-color)`,
                  color: 'var(--text-primary)'
                }}>
                  企业级系统
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{
                  background: 'var(--success-color)',
                  border: `1px solid var(--success-color)`,
                  color: 'var(--text-primary)'
                }}>
                  永久免费
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{
                  background: 'var(--financial-purple)',
                  border: `1px solid var(--financial-purple)`,
                  color: 'var(--text-primary)'
                }}>
                  定制开发
                </span>
              </div>
            </div>

            {/* 开发者信息卡片 */}
            <div className="backdrop-blur-xl rounded-2xl p-6 shadow-2xl mb-6" style={{
              background: 'var(--glass-bg-10)', 
              border: '1px solid var(--glass-border)'
            }}>
              <h3 className="text-base font-semibold mb-4 flex items-center" style={{color: 'var(--text-primary)'}}>
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                开发团队
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{color: 'var(--text-primary)'}}>远古牛哥</p>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>首席开发工程师</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-11 h-11 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{color: 'var(--text-primary)'}}>18833305508</p>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>技术支持热线</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 服务说明 */}
            <div className="rounded-2xl p-5" style={{
              background: 'var(--glass-bg-15)',
              border: `1px solid var(--success-color)`
            }}>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1" style={{
                  background: 'var(--success-color)'
                }}>
                  <svg className="w-4 h-4" style={{color: 'var(--text-primary)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-base mb-2" style={{color: 'var(--success-color)'}}>免费使用承诺</h4>
                  <p className="text-sm leading-relaxed mb-3" style={{color: 'var(--text-secondary)'}}>
                    本软件完全免费使用，无隐藏费用。如需定制开发、功能扩展或界面美化，欢迎联系我们的专业团队。
                  </p>
                  <p className="text-xs" style={{color: 'var(--text-tertiary)'}}>
                    技术咨询 · 定制开发 · 系统集成 · 主题设计
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：登录表单 */}
        <div className="lg:w-1/2 w-full flex flex-col justify-center px-8 lg:px-16 py-12">
          <div className="max-w-md w-full mx-auto">
            {/* 登录卡片 */}
            <GlassCard className="backdrop-blur-xl bg-white/[0.08] border-white/20 shadow-2xl">
              <GlassCardHeader className="text-center pb-8">
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg" style={{
                  background: 'var(--login-button-bg)'
                }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <GlassCardTitle className="text-2xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
                  进销存管理系统
                </GlassCardTitle>
                <GlassCardDescription style={{color: 'var(--text-secondary)'}}>
                  请输入您的登录凭据以继续
                </GlassCardDescription>
              </GlassCardHeader>
              
              <GlassCardContent className="pt-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>用户名</label>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="输入用户名"
                      className="h-12 transition-all duration-200 glass-input"
                      style={{
                        color: 'var(--text-primary)',
                        background: 'var(--glass-bg-10)',
                        border: '1px solid var(--glass-border)'
                      }}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>密码</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="输入密码"
                      className="h-12 transition-all duration-200 glass-input"
                      style={{
                        color: 'var(--text-primary)',
                        background: 'var(--glass-bg-10)',
                        border: '1px solid var(--glass-border)'
                      }}
                      required
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3 pt-2">
                    <div className="flex items-center">
                      <input
                        id="rememberPassword"
                        type="checkbox"
                        checked={rememberPassword}
                        onChange={(e) => setRememberPassword(e.target.checked)}
                        className="w-4 h-4 rounded border-2 cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                        style={{
                          background: rememberPassword ? 'var(--login-button-bg)' : 'var(--glass-bg-10)',
                          borderColor: rememberPassword ? 'var(--login-button-bg)' : 'var(--glass-border)'
                        }}
                      />
                      <label 
                        htmlFor="rememberPassword" 
                        className="ml-2 text-sm font-medium cursor-pointer select-none transition-colors duration-200"
                        style={{color: 'var(--text-secondary)'}}
                      >
                        保存密码
                      </label>
                    </div>
                    <div className="text-xs opacity-75" style={{color: 'var(--text-tertiary)'}}>
                      下次自动填充
                    </div>
                  </div>
                  
                  {error && (
                    <div className="rounded-xl p-4 text-sm flex items-center space-x-2" style={{
                      background: 'var(--error-message-bg)',
                      border: `1px solid var(--error-message-border)`,
                      color: 'var(--error-color)'
                    }}>
                      <svg className="w-4 h-4 flex-shrink-0" style={{color: 'var(--error-color)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'var(--login-button-bg)',
                      color: 'var(--login-button-text)',
                      boxShadow: 'var(--login-button-shadow)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--login-button-hover-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--login-button-bg)';
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        登录中...
                      </div>
                    ) : (
                      '登录系统'
                    )}
                  </Button>
                </form>
                
                <div className="mt-8 pt-6 text-center text-sm" style={{
                  borderTop: `1px solid var(--glass-border)`,
                  color: 'var(--text-tertiary)'
                }}>
                  <p className="mb-1">默认管理员账号: <span className="font-medium" style={{color: 'var(--text-secondary)'}}>admin / 123456</span></p>
                  <p>忘记密码？请联系系统管理员</p>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;