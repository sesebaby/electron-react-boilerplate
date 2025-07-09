import { useState, useCallback } from 'react';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error' | 'warning' | 'info' | 'danger';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ToastState {
  isOpen: boolean;
  message: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const _useDialog = () => {
  const [confirmDialog, setConfirmDialog] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  });

  const [alertDialog, setAlertDialog] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  });

  const [toast, setToast] = useState<ToastState>({
    isOpen: false,
    message: '',
    variant: 'info'
  });

  // 确认对话框
  const _showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    variant: 'danger' | 'warning' | 'info' = 'warning',
    confirmText = '确定',
    cancelText = '取消'
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      variant,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        onCancel?.();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  // 警告对话框
  const _showAlert = useCallback((
    title: string,
    message: string,
    variant: 'success' | 'error' | 'warning' | 'info' = 'info',
    confirmText = '确定'
  ) => {
    setAlertDialog({
      isOpen: true,
      title,
      message,
      variant,
      confirmText,
      onConfirm: () => {
        setAlertDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  // Toast 通知
  const _showToast = useCallback((
    message: string,
    variant: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration = 3000
  ) => {
    setToast({
      isOpen: true,
      message,
      variant,
      duration
    });
  }, []);

  const _closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 便捷方法
  const _showSuccess = useCallback((message: string, duration?: number) => {
    _showToast(message, 'success', duration);
  }, [_showToast]);

  const _showError = useCallback((message: string, duration?: number) => {
    _showToast(message, 'error', duration);
  }, [_showToast]);

  const _showWarning = useCallback((message: string, duration?: number) => {
    _showToast(message, 'warning', duration);
  }, [_showToast]);

  const _showInfo = useCallback((message: string, duration?: number) => {
    _showToast(message, 'info', duration);
  }, [_showToast]);

  const _showDeleteConfirm = useCallback((
    itemName: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    _showConfirm(
      '删除确认',
      `确定要删除"${itemName}"吗？删除后无法恢复！`,
      onConfirm,
      onCancel,
      'danger',
      '删除',
      '取消'
    );
  }, [_showConfirm]);

  return {
    // 对话框状态
    confirmDialog,
    alertDialog,
    toast,
    
    // 显示方法
    showConfirm: _showConfirm,
    showAlert: _showAlert,
    showToast: _showToast,
    closeToast: _closeToast,
    
    // 便捷方法
    showSuccess: _showSuccess,
    showError: _showError,
    showWarning: _showWarning,
    showInfo: _showInfo,
    showDeleteConfirm: _showDeleteConfirm
  };
};

// Named export without underscore for compatibility
export const useDialog = _useDialog;
export default _useDialog;
