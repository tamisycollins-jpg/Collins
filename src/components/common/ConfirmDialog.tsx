import React from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'warning',
  isLoading = false,
}: ConfirmDialogProps) {
  const iconMap = {
    danger: <AlertTriangle className="w-8 h-8 text-rose-600" />,
    warning: <AlertTriangle className="w-8 h-8 text-amber-600" />,
    info: <HelpCircle className="w-8 h-8 text-blue-600" />,
  };

  const btnBg = {
    danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center py-2">
        <div className="p-3 bg-slate-100 rounded-full mb-3">{iconMap[variant]}</div>
        <div className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</div>

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium shadow-sm transition-colors ${btnBg[variant]}`}
          >
            {isLoading ? 'En cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
