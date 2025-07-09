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
    showToast(message, 'success', duration);
  }, [showToast]);

  const _showError = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const _showWarning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const _showInfo = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const _showDeleteConfirm = useCallback((
    itemName: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showConfirm(
      '删除确认',
      `确定要删除"${itemName}"吗？删除后无法恢复！`,
      onConfirm,
      onCancel,
      'danger',
      '删除',
      '取消'
    );
  }, [showConfirm]);

  return {
    // 对话框状态
    confirmDialog,
    alertDialog,
    toast,
    
    // 显示方法
    showConfirm,
    showAlert,
    showToast,
    closeToast,
    
    // 便捷方法
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showDeleteConfirm
  };
};

export default useDialog;
