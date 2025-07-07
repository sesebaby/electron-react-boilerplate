import React from 'react';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';
import Toast from './Toast';
import { useDialog } from '../../hooks/useDialog';

interface DialogContainerProps {
  children: React.ReactNode;
}

export const DialogContainer: React.FC<DialogContainerProps> = ({ children }) => {
  const { confirmDialog, alertDialog, toast, closeToast } = useDialog();

  return (
    <>
      {children}
      
      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant as 'danger' | 'warning' | 'info'}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        onCancel={confirmDialog.onCancel || (() => {})}
      />

      {/* 警告对话框 */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        confirmText={alertDialog.confirmText}
        variant={alertDialog.variant as 'success' | 'error' | 'warning' | 'info'}
        onConfirm={alertDialog.onConfirm || (() => {})}
      />

      {/* Toast 通知 */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        variant={toast.variant}
        duration={toast.duration}
        onClose={closeToast}
      />
    </>
  );
};

export default DialogContainer;
