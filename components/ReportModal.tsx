
import React, { useState, useContext } from 'react';
import { Report, ReportReason, ReportableEntityType } from '../types';
import { CloseIcon } from './Icons';
import { AuthContext } from '../context/AuthContext';

interface ReportModalProps {
  reportInfo: Omit<Report, 'id' | 'reporterId' | 'reason' | 'description' | 'timestamp' | 'isResolved' | 'notes'>;
  onClose: () => void;
  onSubmit: (report: Omit<Report, 'id' | 'reporterId' | 'timestamp' | 'isResolved' | 'notes'>) => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ reportInfo, onClose, onSubmit }) => {
  const [reason, setReason] = useState<ReportReason>('Other');
  const [description, setDescription] = useState('');
  const auth = useContext(AuthContext);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser) return;
    
    onSubmit({
      ...reportInfo,
      reason,
      description
    });
    onClose();
  };

  const reasons: ReportReason[] = ['Underage Content', 'Hate Speech', 'Bullying/Harassment', 'Non-consensual Sexual Acts', 'Spam', 'Impersonation', 'Other'];

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-lg relative border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">Report Content</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-text-secondary">You are reporting a <span className="font-semibold text-text-primary">{reportInfo.entityType}</span>. Please provide details below. Your report is anonymous to the user being reported.</p>
            <div>
                <label htmlFor="reason" className="block text-sm font-medium text-text-secondary mb-1">Reason</label>
                <select 
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">Description (optional)</label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide any additional details or context here."
                    className="w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    rows={4}
                />
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-danger hover:opacity-90 text-white rounded-md transition-colors">Submit Report</button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;