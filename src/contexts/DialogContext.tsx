import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import AlertDialog from '../components/ui/AlertDialog';
import Toast from '../components/ui/Toast';

interface DialogContextType {
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    variant?: 'danger' | 'warning' | 'info',
    confirmText?: string,
    cancelText?: string
  ) => void;
  showAlert: (
    title: string,
    message: string,
    variant?: 'success' | 'error' | 'warning' | 'info',
    confirmText?: string
  ) => void;
  showToast: (
    message: string,
    variant?: 'success' | 'error' | 'warning' | 'info',
    duration?: number
  ) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showDeleteConfirm: (itemName: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: any;
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

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const showConfirm = useCallback((
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

  const showAlert = useCallback((
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

  const showToast = useCallback((
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

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const showDeleteConfirm = useCallback((
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

  const value: DialogContextType = {
    showConfirm,
    showAlert,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showDeleteConfirm
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      
      {/* 渲染对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        onCancel={confirmDialog.onCancel || (() => {})}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        confirmText={alertDialog.confirmText}
        variant={alertDialog.variant}
        onConfirm={alertDialog.onConfirm || (() => {})}
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        variant={toast.variant}
        duration={toast.duration}
        onClose={closeToast}
      />
    </DialogContext.Provider>
  );
};

export const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialogContext must be used within a DialogProvider');
  }
  return context;
};

export default DialogProvider;
