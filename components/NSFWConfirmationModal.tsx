
import React from 'react';

interface BeyondTheHavenConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const BeyondTheHavenConfirmationModal: React.FC<BeyondTheHavenConfirmationModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
      <div className="bg-secondary rounded-lg shadow-soft-lg w-full max-w-md border border-border">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Content Warning</h2>
          <p className="text-text-secondary mb-6">
            By proceeding, you confirm that you are 18 years of age or older and consent to viewing potentially explicit content.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-tertiary hover:bg-hover text-text-primary rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-md transition-colors"
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeyondTheHavenConfirmationModal;