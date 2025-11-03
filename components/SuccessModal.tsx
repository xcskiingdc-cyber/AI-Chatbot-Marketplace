
import React from 'react';

interface SuccessModalProps {
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ title, message, onClose, buttonText = "Return" }) => {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-md border border-border">
        <div className="p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success mb-4">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-4">{title}</h2>
          <p className="text-text-secondary mb-6">{message}</p>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-8 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
