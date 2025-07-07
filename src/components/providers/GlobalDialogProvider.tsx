import React, { useEffect, useState } from 'react';
import { dialogService } from '../../services/dialogService';
import ConfirmDialog from '../ui/ConfirmDialog';
import AlertDialog from '../ui/AlertDialog';

interface GlobalDialogProviderProps {
  children: React.ReactNode;
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error' | 'warning' | 'info';
}

export const GlobalDialogProvider: React.FC<GlobalDialogProviderProps> = ({ children }) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  });

  useEffect(() => {
    // 注册确认对话框回调
    dialogService.registerConfirm((message, onConfirm, onCancel) => {
      setConfirmState({
        isOpen: true,
        message,
        onConfirm: () => {
          onConfirm();
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          onCancel?.();
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });

    // 注册警告对话框回调
    dialogService.registerAlert((title, message, variant = 'info') => {
      setAlertState({
        isOpen: true,
        title,
        message,
        variant
      });
    });
  }, []);

  return (
    <>
      {children}
      
      {/* 全局确认对话框 */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title="确认操作"
        message={confirmState.message}
        confirmText="确定"
        cancelText="取消"
        variant="warning"
        onConfirm={confirmState.onConfirm}
        onCancel={confirmState.onCancel}
      />

      {/* 全局警告对话框 */}
      <AlertDialog
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
        onConfirm={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default GlobalDialogProvider;
