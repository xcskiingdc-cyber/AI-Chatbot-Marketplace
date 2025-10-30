import React from 'react';

interface NSFWConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const NSFWConfirmationModal: React.FC<NSFWConfirmationModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Content Warning</h2>
          <p className="text-gray-300 mb-6">
            By proceeding, you confirm that you are 18 years of age or older and consent to viewing potentially explicit content.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-500 rounded-md transition-colors"
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NSFWConfirmationModal;
