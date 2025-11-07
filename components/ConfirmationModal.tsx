
import React from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel" }) => {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-secondary rounded-lg shadow-soft-lg w-full max-w-md border border-border">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">{title}</h2>
          <p className="text-text-secondary mb-6">{message}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-tertiary hover:bg-hover text-text-primary rounded-md transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-danger hover:opacity-80 text-white rounded-md transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;