// 全局弹出框服务
class DialogService {
  private confirmCallback: ((message: string, onConfirm: () => void, onCancel?: () => void) => void) | null = null;
  private alertCallback: ((title: string, message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void) | null = null;

  // 注册确认对话框回调
  registerConfirm(callback: (message: string, onConfirm: () => void, onCancel?: () => void) => void) {
    this.confirmCallback = callback;
  }

  // 注册警告对话框回调
  registerAlert(callback: (title: string, message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void) {
    this.alertCallback = callback;
  }

  // 显示确认对话框
  confirm(message: string, onConfirm: () => void, onCancel?: () => void): boolean {
    if (this.confirmCallback) {
      this.confirmCallback(message, onConfirm, onCancel);
      return true;
    } else {
      // 降级到原生对话框
      return window.confirm(message);
    }
  }

  // 显示警告对话框
  alert(title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') {
    if (this.alertCallback) {
      this.alertCallback(title, message, variant);
    } else {
      // 降级到原生对话框
      window.alert(`${title}: ${message}`);
    }
  }

  // 便捷方法
  showSuccess(message: string) {
    this.alert('成功', message, 'success');
  }

  showError(message: string) {
    this.alert('错误', message, 'error');
  }

  showWarning(message: string) {
    this.alert('警告', message, 'warning');
  }

  showInfo(message: string) {
    this.alert('信息', message, 'info');
  }
}

export const dialogService = new DialogService();
export default dialogService;
